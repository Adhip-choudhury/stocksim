"use client"

import { useEffect, useState } from "react"
import type { PortfolioState, StockQuote } from "@/types"
import { getPortfolio, sellStock } from "@/lib/portfolio"

const COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#d946ef",
]

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  const radius = 80
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-col items-center">
      <svg width="220" height="220" viewBox="0 0 220 220">
        <g transform="translate(110, 110)">
          <circle r={radius} fill="none" stroke="var(--border)" strokeWidth="28" />
          {data.map((d) => {
            const segment = circumference * (d.value / total)
            const seg = (
              <circle
                key={d.label}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth="28"
                strokeDasharray={`${segment} ${circumference - segment}`}
                strokeDashoffset={-offset}
                transform="rotate(-90)"
                style={{ transition: "stroke-dashoffset 0.5s" }}
              />
            )
            offset += segment
            return seg
          })}
          <text textAnchor="middle" dy="-8" className="text-sm" fill="var(--muted)" fontSize="14">
            Total
          </text>
          <text textAnchor="middle" dy="16" fill="var(--foreground)" fontSize="20" fontWeight="bold">
            ${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </text>
        </g>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-[var(--muted)]">{d.label}</span>
            <span>{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AllocationChart({ holdings, quotes }: { holdings: PortfolioState["holdings"]; quotes: Record<string, StockQuote> }) {
  const data = holdings.map((h, i) => {
    const price = quotes[h.symbol]?.price ?? h.avgPrice
    return {
      label: h.symbol,
      value: price * h.shares,
      color: COLORS[i % COLORS.length],
    }
  })

  const maxVal = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = (d.value / maxVal) * 100
        return (
          <div key={d.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{d.label}</span>
              <span className="text-[var(--muted)]">${d.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="h-3 rounded-full bg-[var(--background)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: d.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null)
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [sellShares, setSellShares] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [chartView, setChartView] = useState<"donut" | "bars">("donut")

  const load = () => {
    const p = getPortfolio()
    setPortfolio(p)
    p.holdings.forEach((h) => fetchQuote(h.symbol))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchQuote = async (symbol: string) => {
    try {
      const res = await fetch(`/api/stock/quote?symbol=${symbol}`)
      const data = await res.json()
      if (data.price) {
        setQuotes((prev) => ({ ...prev, [symbol]: data }))
      }
    } catch {
      // ignore
    }
  }

  const handleSell = (symbol: string, name: string) => {
    const shares = parseInt(sellShares[symbol] || "0", 10)
    if (isNaN(shares) || shares <= 0) return

    const quote = quotes[symbol]
    if (!quote) return

    const result = sellStock(symbol, shares, quote.price)
    setMessage({
      type: result.success ? "success" : "error",
      text: result.success
        ? `Sold ${shares} shares of ${symbol} at $${quote.price.toFixed(2)}`
        : result.error || "Transaction failed",
    })
    setPortfolio(result.state)
    setSellShares((prev) => ({ ...prev, [symbol]: "" }))
  }

  if (!portfolio) {
    return <div className="text-center py-20 text-[var(--muted)]">Loading...</div>
  }

  if (portfolio.holdings.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Portfolio</h1>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-8 sm:p-12 text-center">
          <div className="text-3xl sm:text-4xl mb-3">📭</div>
          <p className="text-[var(--muted)]">Your portfolio is empty.</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            <a href="/trade" className="text-[var(--primary)] hover:underline">
              Buy stocks
            </a>{" "}
            to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Portfolio</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold">Allocation</h2>
            <div className="flex gap-1 bg-[var(--background)] rounded-lg p-0.5">
              <button
                onClick={() => setChartView("donut")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  chartView === "donut" ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Donut
              </button>
              <button
                onClick={() => setChartView("bars")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  chartView === "bars" ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Bars
              </button>
            </div>
          </div>
          {chartView === "donut" ? (
            <DonutChart
              data={portfolio.holdings.map((h, i) => ({
                label: h.symbol,
                value: (quotes[h.symbol]?.price ?? h.avgPrice) * h.shares,
                color: COLORS[i % COLORS.length],
              }))}
            />
          ) : (
            <AllocationChart holdings={portfolio.holdings} quotes={quotes} />
          )}
        </div>

        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Summary</h2>
          <div className="space-y-3">
            {(() => {
              const totalVal = portfolio.holdings.reduce(
                (s, h) => s + (quotes[h.symbol]?.price ?? h.avgPrice) * h.shares, 0
              )
              const totalCost = portfolio.holdings.reduce((s, h) => s + h.avgPrice * h.shares, 0)
              const totalPl = totalVal - totalCost
              const plPct = totalCost ? (totalPl / totalCost) * 100 : 0
              return (
                <>
                  <div className="flex justify-between py-2 border-b border-[var(--border)]/50">
                    <span className="text-[var(--muted)]">Total Invested</span>
                    <span className="font-medium">${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[var(--border)]/50">
                    <span className="text-[var(--muted)]">Current Value</span>
                    <span className="font-medium">${totalVal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[var(--border)]/50">
                    <span className="text-[var(--muted)]">Total P&amp;L</span>
                    <span className={`font-medium ${totalPl >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                      {totalPl >= 0 ? "+" : ""}${totalPl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      {" "}({plPct >= 0 ? "+" : ""}{plPct.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-[var(--muted)]">Cash Balance</span>
                    <span className="font-medium">${portfolio.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
        <div className="overflow-x-auto -mx-4 sm:-mx-0">
          <div className="min-w-[650px] px-4 sm:px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] border-b border-[var(--border)]">
                <th className="text-left py-2 px-2 sm:px-3">Symbol</th>
                <th className="text-left py-2 px-2 sm:px-3 hidden sm:table-cell">Name</th>
                <th className="text-right py-2 px-2 sm:px-3">Shares</th>
                <th className="text-right py-2 px-2 sm:px-3">Price</th>
                <th className="text-right py-2 px-2 sm:px-3 hidden sm:table-cell">Buy</th>
                <th className="text-right py-2 px-2 sm:px-3 hidden md:table-cell">Value</th>
                <th className="text-right py-2 px-2 sm:px-3">P&amp;L</th>
                <th className="text-right py-2 px-2 sm:px-3">Sell</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((h) => {
                const quote = quotes[h.symbol]
                const price = quote?.price ?? h.avgPrice
                const value = price * h.shares
                const cost = h.avgPrice * h.shares
                const pl = value - cost
                const plPercent = ((price - h.avgPrice) / h.avgPrice) * 100
                return (
                  <tr key={h.symbol} className="border-b border-[var(--border)]/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-3 font-medium">{h.symbol}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-[var(--muted)] hidden sm:table-cell">{h.name}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-right">{h.shares}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-right">
                      {quote ? (
                        <span className={quote.change >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                          ${price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-right text-[var(--muted)] hidden sm:table-cell">${h.avgPrice.toFixed(2)}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-right hidden md:table-cell">${value.toFixed(2)}</td>
                    <td
                      className={`py-2 sm:py-3 px-2 sm:px-3 text-right ${pl >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                    >
                      {pl >= 0 ? "+" : ""}${pl.toFixed(2)} ({plPercent >= 0 ? "+" : ""}
                      {plPercent.toFixed(2)}%)
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-right">
                      <div className="flex gap-1 sm:gap-2 items-center justify-end">
                        <input
                          type="number"
                          min="1"
                          max={h.shares}
                          value={sellShares[h.symbol] || ""}
                          onChange={(e) =>
                            setSellShares((prev) => ({ ...prev, [h.symbol]: e.target.value }))
                          }
                          placeholder="Qty"
                          className="w-14 sm:w-16 px-1 sm:px-2 py-1 rounded bg-[var(--background)] border border-[var(--border)] text-xs text-center focus:outline-none focus:border-[var(--primary)]"
                        />
                        <button
                          onClick={() => handleSell(h.symbol, h.name)}
                          className="px-2 sm:px-2.5 py-1 rounded bg-[var(--danger)]/10 text-[var(--danger)] text-xs hover:bg-[var(--danger)]/20 transition-colors"
                        >
                          Sell
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`px-4 py-2 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-[var(--success)]/10 text-[var(--success)]"
              : "bg-[var(--danger)]/10 text-[var(--danger)]"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
