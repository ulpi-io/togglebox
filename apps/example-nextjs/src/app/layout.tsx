import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { Nav } from '@/components/nav'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'ToggleBox Example - Next.js',
  description: 'Example application demonstrating ToggleBox SDK features',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <div className="flex min-h-screen">
            <Nav />
            <main className="flex-1 bg-gray-50 p-8">
              {children}
            </main>
          </div>
          <Toaster position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  )
}
