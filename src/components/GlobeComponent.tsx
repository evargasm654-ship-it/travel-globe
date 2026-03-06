'use client'

import { useEffect, useState, useRef } from 'react'
import Globe, { GlobeMethods } from 'react-globe.gl'
import { useAppStore } from '../store/useAppStore'

export default function GlobeComponent() {
    const globeRef = useRef<GlobeMethods | undefined>(undefined)
    const [countries, setCountries] = useState<any>({ features: [] })

    const { viewMode, setViewMode, selectedContinent, setSelectedContinent } = useAppStore()

    useEffect(() => {
        // Fetch comprehensive GeoJSON for countries
        fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(data => setCountries(data))
    }, [])

    useEffect(() => {
        if (globeRef.current) {
            // Basic configuration
            globeRef.current.controls().autoRotate = viewMode === 'continents';
            globeRef.current.controls().autoRotateSpeed = 0.5;
            // Set initial point of view
            if (viewMode === 'continents') {
                globeRef.current.pointOfView({ altitude: 2.5 }, 1000)
            }
        }
    }, [viewMode])

    const handlePolygonClick = (polygon: any, event: MouseEvent, coords: { lat: number, lng: number }) => {
        const continent = polygon.properties.CONTINENT

        if (viewMode === 'continents') {
            setSelectedContinent(continent)
            setViewMode('countries')
            // Rotate and zoom to the clicked continent
            if (globeRef.current) {
                globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.2 }, 1500)
            }
        } else if (viewMode === 'countries' && continent === selectedContinent) {
            // In a real implementation this would trigger the country specific modal or API call
            console.log('Clicked country:', polygon.properties.ADMIN)
        }
    }

    const handlePolygonHover = (polygon: any) => {
        if (viewMode === 'countries' && polygon && polygon.properties.CONTINENT !== selectedContinent) {
            // Optional: ignore handling for non-selected regions
        }
    }

    return (
        <>
            <Globe
                ref={globeRef}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                polygonsData={countries.features}
                polygonAltitude={(d: any) => {
                    if (viewMode === 'continents') return 0.01
                    return d.properties.CONTINENT === selectedContinent ? 0.04 : 0.01
                }}
                polygonCapColor={(d: any) => {
                    if (viewMode === 'continents') return 'rgba(99, 102, 241, 0.4)' // Indigo accent uniformly
                    return d.properties.CONTINENT === selectedContinent
                        ? 'rgba(99, 102, 241, 0.6)' // Brighter for selected continent
                        : 'rgba(20, 20, 30, 0.4)' // Dimmer for unselected
                }}
                polygonSideColor={() => 'rgba(99, 102, 241, 0.1)'}
                polygonStrokeColor={(d: any) => {
                    if (viewMode === 'continents') return 'rgba(255, 255, 255, 0.1)' // faint borders
                    return d.properties.CONTINENT === selectedContinent
                        ? 'rgba(255, 255, 255, 0.8)' // bright borders
                        : 'rgba(255, 255, 255, 0.05)'
                }}
                onPolygonClick={handlePolygonClick as any}
                onPolygonHover={handlePolygonHover}
                polygonsTransitionDuration={300}
                polygonLabel={(d: any) => {
                    if (viewMode === 'countries' && d.properties.CONTINENT === selectedContinent) {
                        return `
            <div class="glassmorphism p-2 rounded-lg bg-black/60 border border-white/20 text-white backdrop-blur-md">
              <div class="font-bold border-b border-white/20 pb-1 mb-1">${d.properties.ADMIN}</div>
              <div class="text-xs text-indigo-300">Click for average flight pricing</div>
            </div>
          `
                    }
                    return ''
                }}
            />
            {viewMode === 'countries' && (
                <button
                    onClick={() => {
                        setViewMode('continents')
                        setSelectedContinent(null)
                        if (globeRef.current) globeRef.current.pointOfView({ altitude: 2.5 }, 1000)
                    }}
                    className="absolute top-8 left-8 z-10 px-4 py-2 bg-black/50 hover:bg-black/70 border border-white/20 rounded-full text-white backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Back to Continents
                </button>
            )}
        </>
    )
}
