import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/app-shell/sidebar'
import { TopBar } from '@/components/app-shell/top-bar'
import { WelcomeDialog } from '@/components/app-shell/welcome-dialog'
import { getAdvisors, getStudentIndex } from '@/lib/data'
import { getSelectedAdvisor } from '@/lib/advisor'
import './globals.css'

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

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: {
    default: 'Advising Outreach',
    template: '%s · Advising Outreach',
  },
  description: 'Internal tool for advisors to prioritize student outreach, review advising notes, and log contacts.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#0C234B',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [advisors, studentIndex, selectedAdvisor] = await Promise.all([
    getAdvisors(),
    getStudentIndex(),
    getSelectedAdvisor(),
  ])

  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} bg-background`}>
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only z-[60] rounded-md bg-card px-3 py-2 font-medium text-navy focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <TooltipProvider>
          <Sidebar />
          <div className="flex min-h-dvh flex-col md:pl-60">
            <TopBar advisors={advisors} selectedAdvisor={selectedAdvisor} students={studentIndex} />
            <main id="main-content" tabIndex={-1} className="flex-1 p-6 focus:outline-none">
              {children}
            </main>
          </div>
        </TooltipProvider>
        <WelcomeDialog logoSrc={logoSrc()} />
        <Toaster theme="light" position="bottom-right" />
      </body>
    </html>
  )
}
