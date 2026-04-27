import Link from "next/link"
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WhoIsFree - Free Group Scheduling Tool',
  description: 'Find the perfect meeting time for your group. Anonymously .',
  icons: {
      icon: '/favicon.ico',
},

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
