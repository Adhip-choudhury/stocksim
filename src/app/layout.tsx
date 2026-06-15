import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "StockSim — Virtual Stock Trading",
  description: "Practice stock trading with virtual money and real market data",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-[var(--border)] px-6 py-3 flex items-center justify-between bg-[var(--card)]">
          <a href="/" className="text-xl font-bold text-[var(--primary)]">
            StockSim
          </a>
          <div className="flex gap-6 text-sm">
            <a href="/" className="hover:text-[var(--primary)] transition-colors">
              Dashboard
            </a>
            <a href="/trade" className="hover:text-[var(--primary)] transition-colors">
              Trade
            </a>
            <a href="/portfolio" className="hover:text-[var(--primary)] transition-colors">
              Portfolio
            </a>
            <a href="/history" className="hover:text-[var(--primary)] transition-colors">
              History
            </a>
          </div>
        </nav>
        <main className="flex-1 p-6 max-w-6xl w-full mx-auto">{children}</main>
      </body>
    </html>
  )
}
