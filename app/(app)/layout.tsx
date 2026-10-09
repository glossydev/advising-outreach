import { existsSync } from 'node:fs'
import path from 'node:path'
import { Sidebar } from '@/components/app-shell/sidebar'
import { TopBar } from '@/components/app-shell/top-bar'
import { WelcomeDialog } from '@/components/app-shell/welcome-dialog'
import { getAdvisors, getStudentIndex } from '@/lib/data'
import { getSelectedAdvisor } from '@/lib/advisor'

/**
 * The official UA Block A, if it has been added to public/brand/. UA's brand rules forbid altering
 * the mark, so nothing is drawn in its place: without the file, the welcome dialog shows a neutral icon.
 */
function logoSrc(): string | null {
  for (const file of ['ua-block-a.svg', 'ua-block-a.png']) {
    if (existsSync(path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'brand', file))) return `/brand/${file}`
  }
  return null
}

/** The app shell: sidebar, top bar and the first-visit welcome dialog. */
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [advisors, studentIndex, selectedAdvisor] = await Promise.all([getAdvisors(), getStudentIndex(), getSelectedAdvisor()])

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-md bg-card px-3 py-2 font-medium text-navy focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-h-dvh flex-col md:pl-60">
        <TopBar advisors={advisors} selectedAdvisor={selectedAdvisor} students={studentIndex} />
        <main id="main-content" tabIndex={-1} className="flex-1 p-6 focus:outline-none">
          {children}
        </main>
      </div>
      <WelcomeDialog logoSrc={logoSrc()} />
    </>
  )
}
