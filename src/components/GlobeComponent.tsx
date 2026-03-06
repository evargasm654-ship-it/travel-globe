'use client'

import { useEffect, useState, useRef } from 'react'
import Globe, { GlobeMethods } from 'react-globe.gl'
import { useAppStore } from '../store/useAppStore'

interface PricingState {
  loading: boolean
  countryName: string
  cityName: string
  flightPrice: number | null
  hotelPrice: number | null
  error: string | null
}

export default function GlobeComponent() {
    const globeRef = useRef<GlobeMethods | undefined>(undefined)
    const [countries, setCountries] = useState<any>({ features: [] })
    const [pricing, setPricing] = useState<PricingState | null>(null)

    const { viewMode, setViewMode, selectedContinent, setSelectedContinent, departure } = useAppStore()
    useEffect(() => {
        fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(data => setCountries(data))
    }, [])

    useEffect(() => {
        if (globeRef.current) {
            globeRef.current.controls().autoRotate = viewMode === 'continents';
            globeRef.current.controls().autoRotateSpeed = 0.5;
            if (viewMode === 'continents') {
                globeRef.current.pointOfView({ altitude: 2.5 }, 1000)
            }
        }
    }, [viewMode])
    const handlePolygonClick = async (polygon: any, event: MouseEvent, coords: { lat: number, lng: number }) => {
        const continent = polygon.properties.CONTINENT

        if (viewMode === 'continents') {
            setSelectedContinent(continent)
            setViewMode('countries')
            setPricing(null)
            if (globeRef.current) {
                globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.2 }, 1500)
            }
        } else if (viewMode === 'countries' && continent === selectedContinent) {
            const countryName: string = polygon.properties.ADMIN
            const isoCode: string = polygon.properties.ISO_A2
            if (!departure) return
            setPricing({ loading: true, countryName, cityName: '', flightPrice: null, hotelPrice: null, error: null })
            try {
                const res = await fetch('/api/pricing?origin=' + departure.iataCode + '&countryCode=' + isoCode)
                const data = await res.json()
                if (!res.ok || data.error) {
                    setPricing({ loading: false, countryName, cityName: '', flightPrice: null, hotelPrice: null, error: data.error ?? 'No pricing available' })
                } else {
                    setPricing({ loading: false, countryName, cityName: data.cityName, flightPrice: data.flightPrice, hotelPrice: data.hotelPrice, error: null })
                }
            } catch {
                setPricing({ loading: false, countryName, cityName: '', flightPrice: null, hotelPrice: null, error: 'Request failed' })
            }
        }
    }
    return (
        <>
            <Globe
                ref={globeRef}
                globeImageUrl='//unpkg.com/three-globe/example/img/earth-night.jpg'
                backgroundImageUrl='//unpkg.com/three-globe/example/img/night-sky.png'
                polygonsData={countries.features}
                polygonAltitude={(d: any) => {
                    if (viewMode === 'continents') return 0.01
                    return d.properties.CONTINENT === selectedContinent ? 0.04 : 0.01
                }}
                polygonCapColor={(d: any) => {
                    if (viewMode === 'continents') return 'rgba(99, 102, 241, 0.4)'
                    return d.properties.CONTINENT === selectedContinent
                        ? 'rgba(99, 102, 241, 0.6)'
                        : 'rgba(20, 20, 30, 0.4)'
                }}
                polygonSideColor={() => 'rgba(99, 102, 241, 0.1)'}
                polygonStrokeColor={(d: any) => {
                    if (viewMode === 'continents') return 'rgba(255, 255, 255, 0.1)'
                    return d.properties.CONTINENT === selectedContinent
                        ? 'rgba(255, 255, 255, 0.8)'
                        : 'rgba(255, 255, 255, 0.05)'
                }}
                onPolygonClick={handlePolygonClick as any}
                polygonsTransitionDuration={300}
                polygonLabel={(d: any) => {
                    if (viewMode === 'countries' && d.properties.CONTINENT === selectedContinent) {
                        const n = d.properties.ADMIN;
                        return '<div style="background:rgba(0,0,0,0.6);padding:8px 12px;border-radius:8px;color:white;"><b>' + n + '</b><br/><span style="font-size:11px;color:#a5b4fc;">Click for pricing</span></div>';
                    }
                    return ''
                }}
            />
            {viewMode === 'countries' && (
                <button
                    onClick={() => {
                        setViewMode('continents')
                        setSelectedContinent(null)
                        setPricing(null)
                        if (globeRef.current) globeRef.current.pointOfView({ altitude: 2.5 }, 1000)
                    }}
                    className='absolute top-8 left-8 z-10 px-4 py-2 bg-black/50 hover:bg-black/70 border border-white/20 rounded-full text-white backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer'
                >
                    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='m15 18-6-6 6-6' /></svg>
                    Back to Continents
                </button>
            )}
            {pricing && (
                <div
                    className='absolute bottom-8 right-8 z-10 w-72 rounded-2xl border border-white/10 p-6 backdrop-blur-xl'
                    style={{ background: 'rgba(6,8,16,0.75)', boxShadow: '0 0 40px rgba(99,102,241,0.15), 0 20px 40px rgba(0,0,0,0.6)' }}
                >
                    <div className='flex items-start justify-between mb-4'>
                        <div>
                            <h2 className='text-white font-semibold text-lg leading-tight'>{pricing.countryName}</h2>
                            {pricing.cityName && <p className='text-white/40 text-xs mt-0.5'>via {pricing.cityName}</p>}
                        </div>
                        <button onClick={() => setPricing(null)} className='text-white/30 hover:text-white/70 transition-colors ml-2'>
                            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M18 6L6 18M6 6l12 12'/></svg>
                        </button>
                    </div>
                    {pricing.loading ? (
                        <div className='flex items-center gap-3 text-white/50 text-sm'>
                            <svg className='h-4 w-4 animate-spin text-indigo-400' fill='none' viewBox='0 0 24 24'><circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' /><path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8H4z' /></svg>
                            Fetching live prices...
                        </div>
                    ) : pricing.error ? (
                        <p className='text-white/40 text-sm'>{pricing.error}</p>
                    ) : (
                        <div className='space-y-3'>
                            <div className='flex items-center justify-between rounded-xl bg-white/5 px-4 py-3'>
                                <span className='text-white/60 text-sm'>Flight</span>
                                <span className='text-white font-semibold'>{pricing.flightPrice != null ? '$' + pricing.flightPrice.toLocaleString() : 'N/A'}</span>
                            </div>
                            <div className='flex items-center justify-between rounded-xl bg-white/5 px-4 py-3'>
                                <span className='text-white/60 text-sm'>Hotel / night</span>
                                <span className='text-white font-semibold'>{pricing.hotelPrice != null ? '$' + pricing.hotelPrice.toLocaleString() : 'N/A'}</span>
                            </div>
                            <p className='text-white/25 text-xs text-center pt-1'>from {departure?.cityName} · live Amadeus data</p>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
