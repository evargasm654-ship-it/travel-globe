'use client'

import dynamic from 'next/dynamic'

const GlobeComponent = dynamic(() => import('./GlobeComponent'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="text-indigo-400 text-xl font-medium animate-pulse">Initializing Globe...</div>
        </div>
    )
})

export default function Globe() {
    return (
        <div className="absolute inset-0 z-0 cursor-move">
            <GlobeComponent />
        </div>
    )
}
