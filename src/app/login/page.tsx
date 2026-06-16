"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      await login(email, password)
      router.push("/")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed"
      if (msg.includes("invalid-credential")) setError("Invalid email or password")
      else if (msg.includes("user-not-found")) setError("No account found with this email")
      else setError(msg)
    }
    setBusy(false)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm rounded-xl bg-[var(--card)] border border-[var(--border)] p-6 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold mb-6 text-center">Sign In</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-[var(--muted)] block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="text-sm text-[var(--muted)] block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {error && (
            <div className="px-4 py-2 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-sm text-center text-[var(--muted)] mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[var(--primary)] hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
