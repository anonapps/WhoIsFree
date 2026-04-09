import Link from "next/link"
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WhoIsFree - Free Group Scheduling Tool',
  description: 'Find the perfect meeting time for your group. No sign-up required. Just create, share, and coordinate.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-border bg-card">
            <div className="max-w-5xl mx-auto px-4 py-3 text-sm text-muted-foreground text-center">
              <Link href="/anonymity-faq" className="hover:text-foreground underline underline-offset-4">
                ANONYMITY FAQ
              </Link>
              <span className="mx-2">|</span>
              <Link href="/stats" className="hover:text-foreground underline underline-offset-4">
                Stats
              </Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
