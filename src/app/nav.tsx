"use client"

import { useState } from "react"
import Link from "next/link"

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/trade", label: "Trade" },
  { href: "/bot", label: "Bot" },
  { href: "/agent", label: "Agent" },
  { href: "/stocks", label: "Charts" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/analyze", label: "Analyze" },
  { href: "/history", label: "History" },
]

export default function NavBar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="border-b border-[var(--border)] px-4 sm:px-6 py-3 flex items-center justify-between bg-[var(--card)] relative z-50">
      <Link href="/" className="text-lg sm:text-xl font-bold text-[var(--primary)] shrink-0">
        StockSim
      </Link>

      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
        aria-label="Toggle menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      <div className="hidden sm:flex gap-4 lg:gap-6 text-sm">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-[var(--primary)] transition-colors whitespace-nowrap">
            {l.label}
          </Link>
        ))}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 top-14 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 bg-[var(--card)] border-b border-[var(--border)] shadow-xl sm:hidden z-50 animate-in">
            <div className="flex flex-col py-2">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-6 py-3 text-sm hover:bg-[var(--background)] hover:text-[var(--primary)] transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}
