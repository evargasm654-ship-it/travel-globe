import { NextRequest, NextResponse } from 'next/server'

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAmadeusToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token

  const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_CLIENT_ID!,
      client_secret: process.env.AMADEUS_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) throw new Error(`Amadeus auth failed: ${res.status}`)

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  }
  return cachedToken.token
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.searchParams.get('origin')
  const countryCode = req.nextUrl.searchParams.get('countryCode')

  if (!origin || !countryCode || countryCode === '-99') {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  try {
    const token = await getAmadeusToken()

    // Find the main city in the destination country
    const cityRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&countryCode=${countryCode}&page[limit]=1&view=LIGHT`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!cityRes.ok) return NextResponse.json({ error: 'City lookup failed' }, { status: 500 })

    const cityData = await cityRes.json()
    if (!cityData.data?.length) return NextResponse.json({ error: 'No city found for this country' }, { status: 404 })

    const city = cityData.data[0]
    const destinationCode: string = city.iataCode
    const cityName: string = city.address?.cityName ?? city.name

    // Departure ~30 days out
    const departureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const checkIn = departureDate
    const checkOut = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Fetch flight offers and hotel list in parallel
    const [flightRes, hotelListRes] = await Promise.all([
      fetch(
        `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destinationCode}&departureDate=${departureDate}&adults=1&max=1&currencyCode=USD`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      fetch(
        `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${destinationCode}&ratings=3,4,5`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
    ])

    let flightPrice: number | null = null
    if (flightRes.ok) {
      const flightData = await flightRes.json()
      const total = flightData.data?.[0]?.price?.grandTotal
      if (total) flightPrice = parseFloat(total)
    }

    let hotelPrice: number | null = null
    if (hotelListRes.ok) {
      const hotelListData = await hotelListRes.json()
      const hotelIds: string = hotelListData.data
        ?.slice(0, 5)
        .map((h: Record<string, string>) => h.hotelId)
        .join(',')

      if (hotelIds) {
        const hotelOffersRes = await fetch(
          `https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${hotelIds}&adults=1&roomQuantity=1&checkInDate=${checkIn}&checkOutDate=${checkOut}&currencyCode=USD`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (hotelOffersRes.ok) {
          const hotelOffersData = await hotelOffersRes.json()
          const prices: number[] = (hotelOffersData.data ?? [])
            .map((h: Record<string, unknown>) => {
              const offers = h.offers as Array<Record<string, unknown>>
              const price = offers?.[0]?.price as Record<string, string> | undefined
              return parseFloat(price?.total ?? '0')
            })
            .filter((p: number) => p > 0)

          if (prices.length) {
            hotelPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
          }
        }
      }
    }

    return NextResponse.json({ flightPrice, hotelPrice, cityName, destinationCode, currency: 'USD' })
  } catch (err) {
    console.error('Pricing error:', err)
    return NextResponse.json({ error: 'Pricing fetch failed' }, { status: 500 })
  }
}
