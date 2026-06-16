"use client"

import { useEffect, useState } from "react"
import type { PortfolioState, StockQuote } from "@/types"
import { getPortfolio, resetPortfolio } from "@/lib/portfolio"

const TRENDING_SYMBOLS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta" },
  { symbol: "RELIANCE.NS", name: "Reliance" },
  { symbol: "TCS.NS", name: "TCS" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  { symbol: "INFY.NS", name: "Infosys" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
]

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null)
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [trending, setTrending] = useState<Record<string, StockQuote>>({})
  const [loading, setLoading] = useState(true)

  const fetchQuote = async (symbol: string, target: "holdings" | "trending") => {
    try {
      const res = await fetch(`/api/stock/quote?symbol=${symbol}`)
      const data = await res.json()
      if (data.price) {
        if (target === "holdings") {
          setQuotes((prev) => ({ ...prev, [symbol]: data }))
        } else {
          setTrending((prev) => ({ ...prev, [symbol]: data }))
        }
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let ignore = false
    const interval: ReturnType<typeof setInterval>[] = []
    getPortfolio().then((p) => {
      if (ignore) return
      setPortfolio(p)
      if (p.holdings.length > 0) {
        p.holdings.forEach((h) => fetchQuote(h.symbol, "holdings"))
      }
      TRENDING_SYMBOLS.forEach((s) => fetchQuote(s.symbol, "trending"))
      setLoading(false)
      interval.push(setInterval(() => {
        p.holdings.forEach((h) => fetchQuote(h.symbol, "holdings"))
      }, 30000))
    })
    return () => {
      ignore = true
      interval.forEach(clearInterval)
    }
  }, [])

  if (loading || !portfolio) {
    return <div className="text-center py-20 text-[var(--muted)]">Loading...</div>
  }

  const totalStockValue = portfolio.holdings.reduce((sum, h) => {
    const quote = quotes[h.symbol]
    return sum + (quote ? quote.price * h.shares : h.avgPrice * h.shares)
  }, 0)

  const totalValue = portfolio.cash + totalStockValue
  const gainLoss = totalValue - 100000
  const gainLossPercent = ((totalValue - 100000) / 100000) * 100

  const totalInvested = portfolio.holdings.reduce((sum, h) => sum + h.avgPrice * h.shares, 0)

  const concentrationTips = portfolio.holdings.length > 0 ? (() => {
    const tips: string[] = []
    const total = totalInvested || 1
    portfolio.holdings.forEach((h) => {
      const weight = ((h.avgPrice * h.shares) / total) * 100
      if (weight > 50) {
        tips.push(`⚠️ **${h.symbol}** is ${weight.toFixed(0)}% of your portfolio. Consider diversifying to reduce risk.`)
      }
    })
    if (portfolio.holdings.length === 1) {
      tips.push("📌 You're invested in only 1 stock. Spreading across sectors lowers risk.")
    } else if (portfolio.holdings.length < 3) {
      tips.push("📌 A 5-8 stock portfolio across different sectors is generally recommended.")
    }
    if (portfolio.cash > 50000) {
      tips.push(`💰 You have $${portfolio.cash.toLocaleString()} cash uninvested (${((portfolio.cash / totalValue) * 100).toFixed(0)}% of portfolio). Consider putting it to work.`)
    }
    return tips
  })() : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <button
          onClick={async () => {
            await resetPortfolio()
            setPortfolio(await getPortfolio())
          }}
          className="text-sm px-3 py-1.5 rounded bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors"
        >
          Reset Portfolio
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <div className="text-sm text-[var(--muted)]">Portfolio Value</div>
          <div className="text-2xl font-bold mt-1">
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-sm mt-1 ${gainLoss >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {gainLoss >= 0 ? "+" : ""}
            {gainLoss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
            ({gainLossPercent >= 0 ? "+" : ""}
            {gainLossPercent.toFixed(2)}%)
          </div>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5">
          <div className="text-sm text-[var(--muted)]">Cash Balance</div>
          <div className="text-2xl font-bold mt-1">
            ${portfolio.cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5">
          <div className="text-sm text-[var(--muted)]">Invested</div>
          <div className="text-2xl font-bold mt-1">
            ${totalStockValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-[var(--muted)] mt-1">{portfolio.holdings.length} holdings</div>
        </div>
      </div>

      {portfolio.holdings.length > 0 && (
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Holdings</h2>
          <div className="overflow-x-auto -mx-4 sm:-mx-0">
            <div className="min-w-[600px] px-4 sm:px-0">
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
                      <td className={`py-2 sm:py-3 px-2 sm:px-3 text-right ${pl >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                        {pl >= 0 ? "+" : ""}${pl.toFixed(2)} ({plPercent >= 0 ? "+" : ""}{plPercent.toFixed(2)}%)
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {portfolio.holdings.length === 0 && (
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-8 sm:p-12 text-center">
          <div className="text-3xl sm:text-4xl mb-3">📈</div>
          <p className="text-[var(--muted)] mb-1">No holdings yet</p>
          <p className="text-sm text-[var(--muted)]">
            Start by{" "}
            <a href="/trade" className="text-[var(--primary)] hover:underline">
              buying stocks
            </a>
          </p>
        </div>
      )}

      {concentrationTips.length > 0 && (
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold mb-3">💡 Suggestions</h2>
          <div className="space-y-2">
            {concentrationTips.map((tip, i) => (
              <p key={i} className="text-sm leading-relaxed">{tip}</p>
            ))}
          </div>
          <a href="/trade" className="inline-block mt-3 text-sm text-[var(--primary)] hover:underline">
            Browse stocks →
          </a>
        </div>
      )}

      {!portfolio.holdings.length && (
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold mb-3">💡 Suggestions</h2>
          <p className="text-sm leading-relaxed">
            Start building your portfolio! Try buying a mix of stocks from different sectors like tech (AAPL, MSFT),
            finance (HDFCBANK.NS), and auto (TSLA) for good diversification.
          </p>
          <a href="/trade" className="inline-block mt-3 text-sm text-[var(--primary)] hover:underline">
            Start trading →
          </a>
        </div>
      )}

      <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">🔥 Trending Stocks</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {TRENDING_SYMBOLS.map((s) => {
            const q = trending[s.symbol]
            return (
              <a
                key={s.symbol}
                href={`/trade?symbol=${s.symbol}`}
                className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-3 hover:border-[var(--primary)] transition-colors"
              >
                <div className="font-medium text-sm">{s.symbol}</div>
                <div className="text-xs text-[var(--muted)] truncate">{s.name}</div>
                {q ? (
                  <>
                    <div className="text-sm font-semibold mt-1">
                      ${q.price.toFixed(2)}
                    </div>
                    <div className={`text-xs ${q.change >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                      {q.change >= 0 ? "+" : ""}{q.changePercent.toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-[var(--muted)] mt-1">Loading...</div>
                )}
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
