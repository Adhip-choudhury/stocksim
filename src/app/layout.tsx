import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import AuthGuard from "./auth-guard"
import NavBar from "./nav"

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
        <AuthProvider>
          <AuthGuard>
            <NavBar />
            <main className="flex-1 px-3 sm:px-6 py-4 sm:py-6 max-w-6xl w-full mx-auto">{children}</main>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
