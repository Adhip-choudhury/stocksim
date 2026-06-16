"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isAuthPage = pathname === "/login" || pathname === "/signup"

  useEffect(() => {
    if (loading) return
    if (!user && !isAuthPage) {
      router.push("/login")
    }
    if (user && isAuthPage) {
      router.push("/")
    }
  }, [user, loading, isAuthPage, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--muted)] text-sm">Loading...</div>
      </div>
    )
  }

  if (!user && !isAuthPage) return null

  return <>{children}</>
}
