"use client"

import { useEffect, useState } from "react"
import { getPortfolio } from "@/lib/portfolio"

interface SectorAllocation {
  sector: string
  value: number
  percent: number
}

interface HoldingPerf {
  symbol: string
  name: string
  shares: number
  avgPrice: number
  currentPrice: number
  value: number
  pl: number
  plPercent: number
  volatility: string
}

interface Recommendation {
  symbol: string
  name: string
  sector: string
  reason: string
  confidence: string
}

interface Analysis {
  summary: string
  diversification: {
    score: number
    maxScore: number
    label: string
    details: SectorAllocation[]
    missingSectors: string[]
    concentrationRisk: string
  }
  performance: {
    totalReturn: number
    totalReturnPercent: number
    bestPerformer: { symbol: string; return: number } | null
    worstPerformer: { symbol: string; return: number } | null
    holdings: HoldingPerf[]
  }
  recommendations: Recommendation[]
}

export default function AnalyzePage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const runAnalysis = async () => {
    setLoading(true)
    setError("")
    const portfolio = getPortfolio()
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: portfolio.holdings }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setAnalysis(data.analysis)
      }
    } catch {
      setError("Failed to run analysis. Make sure the server is running.")
    }
    setLoading(false)
  }

  useEffect(() => {
    let ignore = false
    async function load() {
      const portfolio = getPortfolio()
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdings: portfolio.holdings }),
        })
        const data = await res.json()
        if (ignore) return
        if (data.error) {
          setError(data.error)
        } else {
          setAnalysis(data.analysis)
        }
      } catch {
        if (!ignore) setError("Failed to run analysis. Make sure the server is running.")
      }
      if (!ignore) setLoading(false)
    }
    load()
    return () => { ignore = true }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">AI Portfolio Analyzer</h1>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Refresh Analysis"}
        </button>
      </div>

      {loading && (
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-8 sm:p-12 text-center">
          <div className="text-3xl sm:text-4xl mb-3 animate-pulse">🤖</div>
          <p className="text-[var(--muted)]">AI agent is analyzing your portfolio...</p>
          <p className="text-sm text-[var(--muted)] mt-1">Fetching market data and computing insights</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 p-4 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {analysis && !loading && (
        <>
          <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="text-xl sm:text-2xl">🤖</div>
              <div>
                <h2 className="font-semibold mb-1">AI Analysis Summary</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{analysis.summary}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                Diversification Score
                <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                  {analysis.diversification.score}/{analysis.diversification.maxScore}
                </span>
              </h2>

              <div className="mb-4">
                <div className="h-4 rounded-full bg-[var(--background)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(analysis.diversification.score / analysis.diversification.maxScore) * 100}%`,
                      background:
                        analysis.diversification.score >= 70
                          ? "var(--success)"
                          : analysis.diversification.score >= 40
                            ? "#f59e0b"
                            : "var(--danger)",
                    }}
                  />
                </div>
                <div className="text-sm mt-2 font-medium">{analysis.diversification.label}</div>
              </div>

              <p className="text-sm text-[var(--muted)] mb-4">{analysis.diversification.concentrationRisk}</p>

              {analysis.diversification.details.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-[var(--muted)]">Sector Allocation</h3>
                  {analysis.diversification.details.map((s) => (
                    <div key={s.sector}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{s.sector}</span>
                        <span className="text-[var(--muted)]">{s.percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--background)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${s.percent}%`, background: "var(--primary)" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {analysis.diversification.missingSectors.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-[var(--muted)] mb-1">Missing Sectors</h3>
                  <p className="text-xs text-[var(--muted)]">
                    {analysis.diversification.missingSectors.join(", ")}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Portfolio Performance</h2>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-[var(--border)]/50">
                  <span className="text-[var(--muted)]">Total Return</span>
                  <span
                    className={`font-medium ${
                      analysis.performance.totalReturn >= 0
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]"
                    }`}
                  >
                    {analysis.performance.totalReturn >= 0 ? "+" : ""}$
                    {analysis.performance.totalReturn.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    {" ("}
                    {analysis.performance.totalReturnPercent >= 0 ? "+" : ""}
                    {analysis.performance.totalReturnPercent.toFixed(2)}%)
                  </span>
                </div>

                {analysis.performance.bestPerformer && (
                  <div className="flex justify-between py-2 border-b border-[var(--border)]/50">
                    <span className="text-[var(--muted)]">Best Performer</span>
                    <span className="text-[var(--success)] font-medium">
                      {analysis.performance.bestPerformer.symbol} (
                      {analysis.performance.bestPerformer.return >= 0 ? "+" : ""}
                      {analysis.performance.bestPerformer.return.toFixed(2)}%)
                    </span>
                  </div>
                )}

                {analysis.performance.worstPerformer && (
                  <div className="flex justify-between py-2 border-b border-[var(--border)]/50">
                    <span className="text-[var(--muted)]">Worst Performer</span>
                    <span className="text-[var(--danger)] font-medium">
                      {analysis.performance.worstPerformer.symbol} (
                      {analysis.performance.worstPerformer.return >= 0 ? "+" : ""}
                      {analysis.performance.worstPerformer.return.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>

              {analysis.performance.holdings.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Holdings Detail</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {analysis.performance.holdings.map((h) => (
                      <div
                        key={h.symbol}
                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-[var(--background)]"
                      >
                        <div>
                          <span className="font-medium">{h.symbol}</span>
                          <span className="text-[var(--muted)] ml-1">{h.shares} shares</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={h.plPercent >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                            {h.plPercent >= 0 ? "+" : ""}{h.plPercent.toFixed(2)}%
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            h.volatility === "High"
                              ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                              : h.volatility === "Low"
                                ? "bg-[var(--success)]/10 text-[var(--success)]"
                                : "bg-[#f59e0b]/10 text-[#f59e0b]"
                          }`}>
                            {h.volatility}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">🤖 AI Recommended Stocks</h2>
            {analysis.recommendations.length === 0 ? (
              <p className="text-[var(--muted)] text-sm">
                No recommendations available. Try adding more stocks to your portfolio.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.recommendations.map((rec) => (
                  <div
                    key={rec.symbol}
                    className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-4 hover:border-[var(--primary)] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold">{rec.symbol}</div>
                        <div className="text-xs text-[var(--muted)]">{rec.name}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          rec.confidence === "High"
                            ? "bg-[var(--success)]/10 text-[var(--success)]"
                            : "bg-[#f59e0b]/10 text-[#f59e0b]"
                        }`}
                      >
                        {rec.confidence}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--muted)] mb-2">Sector: {rec.sector}</div>
                    <p className="text-xs leading-relaxed">{rec.reason}</p>
                    <a
                      href={`/trade?symbol=${rec.symbol}`}
                      className="inline-block mt-3 text-xs text-[var(--primary)] hover:underline font-medium"
                    >
                      Trade {rec.symbol} →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
