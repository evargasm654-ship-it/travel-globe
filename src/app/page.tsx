import OnboardingModal from '@/components/OnboardingModal'
import Globe from '@/components/Globe'

export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#060810]">
      <Globe />
      <OnboardingModal />
    </main>
  )
}
