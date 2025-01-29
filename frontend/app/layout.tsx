import type {Metadata} from 'next'
import {Geist} from 'next/font/google'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PodcastAI Creator',
  description: 'Generate AI-enhanced podcasts from text or audio',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900">{children}</main>
      </body>
    </html>
  )
}
