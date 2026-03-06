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
}

export const useAppStore = create<AppStore>((set) => ({
  departure: null,
  setDeparture: (airport) => set({ departure: airport }),
}))
