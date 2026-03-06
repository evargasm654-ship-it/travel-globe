'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore, Airport } from '@/store/useAppStore'

export default function OnboardingModal() {
  const setDeparture = useAppStore((s) => s.setDeparture)
  const departure = useAppStore((s) => s.departure)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Airport[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/airports?q=${encodeURIComponent(q)}`)
      const data: Airport[] = await res.json()
      setResults(data)
      setOpen(data.length > 0)
      setHighlighted(-1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  function selectAirport(airport: Airport) {
    setDeparture(airport)
    setQuery(`${airport.cityName} (${airport.iataCode})`)
    setOpen(false)
    setResults([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      setHighlighted((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      selectAirport(results[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  if (departure) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
        style={{ boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 25px 50px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 ring-1 ring-indigo-400/30">
            <svg className="h-6 w-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Where are you flying from?</h1>
          <p className="mt-2 text-sm text-white/50">Enter your departure city or airport</p>
        </div>

        {/* Input */}
        <div className="relative">
          <div className="relative">
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. London, JFK, Paris CDG..."
              className="w-full rounded-xl border border-white/10 bg-white/8 px-4 py-3 pr-10 text-white placeholder-white/30 outline-none ring-0 transition focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              {loading ? (
                <svg className="h-4 w-4 animate-spin text-white/40" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                </svg>
              )}
            </div>
          </div>

          {/* Dropdown */}
          {open && (
            <ul className="absolute left-0 right-0 top-full z-10 mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#0f1117] shadow-2xl">
              {results.map((airport, i) => (
                <li
                  key={`${airport.iataCode}-${i}`}
                  onMouseDown={() => selectAirport(airport)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
                    i === highlighted ? 'bg-indigo-500/20' : 'hover:bg-white/5'
                  } ${i !== 0 ? 'border-t border-white/5' : ''}`}
                >
                  <span className="flex-shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs font-medium text-indigo-300">
                    {airport.iataCode}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">{airport.cityName}</div>
                    <div className="truncate text-xs text-white/40">
                      {airport.name}
                      {airport.countryCode ? ` · ${airport.countryCode}` : ''}
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-xs text-white/25 capitalize">
                    {airport.subType?.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/25">
          Select your home airport to start exploring destinations
        </p>
      </div>
    </div>
  )
}
