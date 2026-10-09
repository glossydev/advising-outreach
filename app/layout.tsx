import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

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

/** Shared by the app (app/(app)/layout.tsx) and the help pages (app/help/). */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} bg-background`}>
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster theme="light" position="bottom-right" />
      </body>
    </html>
  )
}
