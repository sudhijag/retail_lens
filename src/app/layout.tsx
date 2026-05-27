import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RetailLens - Price Intelligence Platform',
  description: 'Real-time competitive price tracking, visual product matching, and SKU intelligence across retail platforms.',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
