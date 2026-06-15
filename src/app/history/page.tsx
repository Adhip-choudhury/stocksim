"use client"

import { useEffect, useState } from "react"
import type { PortfolioState, Transaction } from "@/types"
import { getPortfolio } from "@/lib/portfolio"

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const p = getPortfolio()
    setTransactions([...p.transactions].reverse())
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transaction History</h1>

      {transactions.length === 0 && (
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-[var(--muted)]">No transactions yet.</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            <a href="/trade" className="text-[var(--primary)] hover:underline">
              Buy stocks
            </a>{" "}
            to see your history here.
          </p>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] border-b border-[var(--border)]">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Symbol</th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-right py-3 px-4">Shares</th>
                <th className="text-right py-3 px-4">Price</th>
                <th className="text-right py-3 px-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)]/50">
                  <td className="py-3 px-4 text-[var(--muted)]">
                    {new Date(t.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        t.type === "buy"
                          ? "bg-[var(--success)]/10 text-[var(--success)]"
                          : "bg-[var(--danger)]/10 text-[var(--danger)]"
                      }`}
                    >
                      {t.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">{t.symbol}</td>
                  <td className="py-3 px-4 text-[var(--muted)]">{t.name}</td>
                  <td className="py-3 px-4 text-right">{t.shares}</td>
                  <td className="py-3 px-4 text-right">${t.price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">${t.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
