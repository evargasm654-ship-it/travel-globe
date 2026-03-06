import { create } from 'zustand'

export interface Airport {
  iataCode: string
  name: string
  cityName: string
  countryCode: string
  subType: 'AIRPORT' | 'CITY'
}

interface AppStore {
  departure: Airport | null
  setDeparture: (airport: Airport) => void
  selectedContinent: string | null
  setSelectedContinent: (continent: string | null) => void
  viewMode: 'continents' | 'countries'
  setViewMode: (mode: 'continents' | 'countries') => void
}

export const useAppStore = create<AppStore>((set) => ({
  departure: null,
  setDeparture: (airport) => set({ departure: airport }),
  selectedContinent: null,
  setSelectedContinent: (continent) => set({ selectedContinent: continent }),
  viewMode: 'continents',
  setViewMode: (mode) => set({ viewMode: mode }),
}))
