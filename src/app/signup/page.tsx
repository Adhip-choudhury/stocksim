"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

export default function SignupPage() {
  const { signup } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    setBusy(true)
    try {
      await signup(email, password)
      router.push("/")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed"
      if (msg.includes("email-already-in-use")) setError("An account with this email already exists")
      else if (msg.includes("weak-password")) setError("Password must be at least 6 characters")
      else setError(msg)
    }
    setBusy(false)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm rounded-xl bg-[var(--card)] border border-[var(--border)] p-6 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold mb-6 text-center">Create Account</h1>

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
          <div>
            <label className="text-sm text-[var(--muted)] block mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            {busy ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-center text-[var(--muted)] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--primary)] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
