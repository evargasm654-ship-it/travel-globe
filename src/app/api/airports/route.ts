import { NextRequest, NextResponse } from 'next/server'

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAmadeusToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_CLIENT_ID!,
      client_secret: process.env.AMADEUS_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) {
    throw new Error(`Amadeus auth failed: ${res.status}`)
  }

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  }
  return cachedToken.token
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) return NextResponse.json([])

  try {
    const token = await getAmadeusToken()
    const res = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(q)}&subType=AIRPORT,CITY&page[limit]=8&view=LIGHT`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) return NextResponse.json([], { status: res.status })

    const data = await res.json()
    const results = (data.data ?? []).map((loc: Record<string, unknown>) => ({
      iataCode: loc.iataCode,
      name: loc.name,
      cityName: (loc.address as Record<string, string>)?.cityName ?? loc.name,
      countryCode: (loc.address as Record<string, string>)?.countryCode ?? '',
      subType: loc.subType,
    }))

    return NextResponse.json(results)
  } catch (err) {
    console.error('Airport search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
