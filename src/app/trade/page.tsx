"use client"

import { useEffect, useState, useCallback } from "react"
import type { StockSearchResult, StockQuote, PortfolioState } from "@/types"
import { getPortfolio, buyStock } from "@/lib/portfolio"

export default function Trade({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [selected, setSelected] = useState<StockSearchResult | null>(null)
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [shares, setShares] = useState("")
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [searching, setSearching] = useState(false)
  const [directSymbol, setDirectSymbol] = useState("")
  const [loadingQuote, setLoadingQuote] = useState(false)

  useEffect(() => {
    setPortfolio(getPortfolio())
    searchParams.then((params) => {
      const sym = params.symbol
      if (sym) {
        setDirectSymbol(sym.toUpperCase())
        setTimeout(() => loadBySymbol(sym.toUpperCase()), 100)
      }
    })
  }, [searchParams])

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results || [])
      } catch {
        setResults([])
      }
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const selectStock = useCallback(async (stock: StockSearchResult) => {
    setSelected(stock)
    setShares("")
    setMessage(null)
    setQuote(null)
    setLoadingQuote(true)
    try {
      const res = await fetch(`/api/stock/quote?symbol=${stock.symbol}`)
      const data = await res.json()
      if (data.price) setQuote(data)
      else setMessage({ type: "error", text: data.error || "Could not fetch price" })
    } catch {
      setMessage({ type: "error", text: "Failed to fetch price" })
    }
    setLoadingQuote(false)
  }, [])

  const loadBySymbol = useCallback(async (symbol: string) => {
    if (!symbol) return
    setMessage(null)
    setSelected({ symbol, name: symbol, type: "Equity", region: "US", currency: "USD" })
    setShares("")
    setQuote(null)
    setLoadingQuote(true)
    try {
      const res = await fetch(`/api/stock/quote?symbol=${symbol}`)
      const data = await res.json()
      if (data.price) setQuote(data)
      else setMessage({ type: "error", text: data.error || "Symbol not found" })
    } catch {
      setMessage({ type: "error", text: "Failed to fetch price" })
    }
    setLoadingQuote(false)
  }, [])

  const lookupDirectSymbol = useCallback(async () => {
    const symbol = directSymbol.trim().toUpperCase()
    if (!symbol) return
    await loadBySymbol(symbol)
  }, [directSymbol, loadBySymbol])

  const handleBuy = () => {
    if (!selected || !quote || !shares) return
    const numShares = parseInt(shares, 10)
    if (isNaN(numShares) || numShares <= 0) {
      setMessage({ type: "error", text: "Enter a valid number of shares" })
      return
    }

    const result = buyStock(selected.symbol, selected.name, numShares, quote.price)
    setMessage({
      type: result.success ? "success" : "error",
      text: result.success
        ? `Bought ${numShares} shares of ${selected.symbol} at $${quote.price.toFixed(2)}`
        : result.error || "Transaction failed",
    })
    setPortfolio(result.state)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Trade</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Search Stocks</h2>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company name..."
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
            />
            {searching && (
              <div className="absolute right-3 top-3 text-sm text-[var(--muted)]">Searching...</div>
            )}
          </div>

          {results.length > 0 && (
            <div className="mt-3 max-h-64 overflow-y-auto space-y-1">
              {results.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => selectStock(stock)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selected?.symbol === stock.symbol
                      ? "bg-[var(--primary)]/20 border border-[var(--primary)]"
                      : "hover:bg-[var(--background)] border border-transparent"
                  }`}
                >
                  <div className="font-medium">{stock.symbol}</div>
                  <div className="text-sm text-[var(--muted)]">{stock.name}</div>
                </button>
              ))}
            </div>
          )}

          {query && results.length === 0 && !searching && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              No results. Try using the ticker lookup below.
            </p>
          )}

          <div className="mt-5 pt-4 border-t border-[var(--border)]">
            <h3 className="text-sm font-medium mb-2">Quick Ticker Lookup</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={directSymbol}
                onChange={(e) => setDirectSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && lookupDirectSymbol()}
                placeholder="e.g. AAPL, TSLA, MSFT"
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] uppercase"
              />
              <button
                onClick={lookupDirectSymbol}
                className="px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Lookup
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Place Order</h2>

          {!selected && (
            <p className="text-[var(--muted)]">Search or enter a ticker symbol to start trading.</p>
          )}

          {selected && (
            <div className="space-y-4">
              <div>
                <div className="font-medium text-lg">{selected.symbol}</div>
                <div className="text-sm text-[var(--muted)]">{selected.name}</div>
              </div>

              {loadingQuote && <p className="text-sm text-[var(--muted)]">Loading price...</p>}

              {quote && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-[var(--muted)]">Price: </span>
                    <span className={quote.change >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                      ${quote.price.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Change: </span>
                    <span className={quote.change >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                      {quote.change >= 0 ? "+" : ""}
                      {quote.change.toFixed(2)} ({quote.changePercent >= 0 ? "+" : ""}
                      {quote.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Day: </span>
                    <span>
                      ${quote.low.toFixed(2)} – ${quote.high.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Vol: </span>
                    <span>{(quote.volume / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-[var(--muted)] block mb-1">Number of Shares</label>
                <input
                  type="number"
                  min="1"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              {quote && shares && parseInt(shares) > 0 && (
                <div className="text-sm text-[var(--muted)]">
                  Estimated cost:{" "}
                  <span className="text-[var(--foreground)] font-medium">
                    ${(parseInt(shares) * quote.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <button
                onClick={handleBuy}
                disabled={!quote}
                className="w-full py-2.5 rounded-lg bg-[var(--success)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Buy
              </button>

              {portfolio && (
                <div className="text-sm text-[var(--muted)]">
                  Cash available: ${portfolio.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          )}

          {message && (
            <div
              className={`mt-4 px-4 py-2 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-[var(--success)]/10 text-[var(--success)]"
                  : "bg-[var(--danger)]/10 text-[var(--danger)]"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
