"use client"

import { useEffect, useState } from "react"
import type { StockQuote, StockHistoryPoint } from "@/types"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"

const TRENDING = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta" },
  { symbol: "RELIANCE.NS", name: "Reliance" },
  { symbol: "TCS.NS", name: "TCS" },
]

const RANGES = [
  { label: "1M", value: "1mo", days: 30 },
  { label: "3M", value: "3mo", days: 90 },
  { label: "6M", value: "6mo", days: 180 },
  { label: "1Y", value: "1y", days: 365 },
  { label: "5Y", value: "5y", days: 1825 },
] as const

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function StocksPage() {
  const [symbol, setSymbol] = useState("AAPL")
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [history, setHistory] = useState<StockHistoryPoint[]>([])
  const [range, setRange] = useState<"1mo" | "3mo" | "6mo" | "1y" | "5y">("1y")
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState("")

  useEffect(() => {
    let ignore = false
    async function load(sym: string) {
      setLoading(true)
      try {
        const [quoteRes, histRes] = await Promise.all([
          fetch(`/api/stock/quote?symbol=${sym}`),
          fetch(`/api/stock/history?symbol=${sym}`),
        ])
        const quoteData = await quoteRes.json()
        const histData = await histRes.json()
        if (ignore) return
        if (quoteData.price) setQuote(quoteData)
        if (histData.points) setHistory(histData.points)
      } catch {
        if (!ignore) setQuote(null)
      }
      if (!ignore) setLoading(false)
    }
    load(symbol)
    return () => { ignore = true }
  }, [symbol])

  const handleSearch = () => {
    const s = searchInput.trim().toUpperCase()
    if (s) {
      setSymbol(s)
      setSearchInput("")
    }
  }

  const chartData = history.map((p) => ({
    date: formatDate(p.date),
    price: p.close,
    fullDate: p.date,
  }))

  const minPrice = chartData.length ? Math.min(...chartData.map((d) => d.price)) : 0
  const maxPrice = chartData.length ? Math.max(...chartData.map((d) => d.price)) : 0
  const padding = (maxPrice - minPrice) * 0.05 || minPrice * 0.02

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Stock Charts</h1>

      <div className="flex gap-2 sm:gap-3 flex-wrap items-center">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Symbol e.g. AAPL"
          className="px-3 sm:px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] uppercase w-32 sm:w-40"
        />
        <button
          onClick={handleSearch}
          className="px-3 sm:px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
        >
          Search
        </button>
        <div className="flex gap-1.5 flex-wrap">
          {TRENDING.map((s) => (
            <button
              key={s.symbol}
              onClick={() => setSymbol(s.symbol)}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                symbol === s.symbol
                  ? "bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {s.symbol}
            </button>
          ))}
        </div>
      </div>

      {quote && (
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-1 gap-1 sm:gap-0">
            <div>
              <span className="text-lg sm:text-xl font-bold">{quote.symbol}</span>
              <span className="ml-2 text-xs sm:text-sm text-[var(--muted)]">
                {quote.exchange} &middot; {quote.currency}
              </span>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xl sm:text-2xl font-bold">${formatCurrency(quote.price)}</div>
              <div className={`text-sm ${quote.change >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                {quote.change >= 0 ? "+" : ""}
                {formatCurrency(quote.change)} ({quote.changePercent >= 0 ? "+" : ""}
                {quote.changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-[var(--muted)] mt-2">
            <span>Open: ${formatCurrency(quote.open)}</span>
            <span>High: ${formatCurrency(quote.high)}</span>
            <span>Low: ${formatCurrency(quote.low)}</span>
            <span>Volume: {(quote.volume / 1000).toFixed(0)}K</span>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4">
          <h2 className="text-base sm:text-lg font-semibold">Price History</h2>
          <div className="flex gap-1 bg-[var(--background)] rounded-lg p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2 sm:px-3 py-1 text-xs rounded-md transition-colors ${
                  range === r.value
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="h-[250px] sm:h-[400px] flex items-center justify-center text-[var(--muted)]">Loading...</div>}

        {!loading && chartData.length > 0 && (
          <div className="h-[250px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  interval="preserveStartEnd"
                  stroke="var(--border)"
                />
                <YAxis
                  domain={[minPrice - padding, maxPrice + padding]}
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  stroke="var(--border)"
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  labelStyle={{ color: "var(--muted)" }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, "Price"]}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: "var(--primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {!loading && chartData.length === 0 && (
          <div className="h-[250px] sm:h-[400px] flex items-center justify-center text-[var(--muted)]">
            No historical data available for {symbol}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Quick Stock Picks</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {TRENDING.map((s) => (
            <button
              key={s.symbol}
              onClick={() => setSymbol(s.symbol)}
              className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-3 text-left hover:border-[var(--primary)] transition-colors"
            >
              <div className="font-medium text-sm">{s.symbol}</div>
              <div className="text-xs text-[var(--muted)] truncate">{s.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
