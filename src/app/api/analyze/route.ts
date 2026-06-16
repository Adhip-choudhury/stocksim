import { NextResponse } from "next/server"

const YAHOO_QUOTE = (s: string) =>
  `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}`

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  return res.json()
}

async function getQuote(symbol: string) {
  const data = await fetchJson(YAHOO_QUOTE(symbol))
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta?.regularMarketPrice) return null
  const closes = data.chart.result[0].indicators?.quote?.[0]?.close
  const currentClose = closes?.[closes.length - 1] ?? meta.regularMarketPrice
  const prevClose = meta.previousClose ?? currentClose
  return {
    symbol: meta.symbol || symbol,
    price: currentClose,
    change: currentClose - prevClose,
    changePercent: prevClose ? ((currentClose - prevClose) / prevClose) * 100 : 0,
    currency: meta.currency || "USD",
    exchange: meta.exchangeName || "",
  }
}

async function getHistory(symbol: string) {
  const data = await fetchJson(YAHOO_QUOTE(symbol) + "?range=1y&interval=1d")
  const result = data?.chart?.result?.[0]
  if (!result?.timestamp || !result?.indicators?.quote?.[0]) return []
  const timestamps = result.timestamp
  const quote = result.indicators.quote[0]
  return timestamps.map((t: number, i: number) => ({
    date: new Date(t * 1000).toISOString().split("T")[0],
    close: quote.close[i],
    volume: quote.volume[i] || 0,
  })).filter((p: { close: number | null }) => p.close != null)
}

interface HoldingInput {
  symbol: string
  name: string
  shares: number
  avgPrice: number
}

const RECOMMENDATION_CANDIDATES = [
  { symbol: "AAPL", name: "Apple", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet", sector: "Technology" },
  { symbol: "AMZN", name: "Amazon", sector: "Consumer Cyclical" },
  { symbol: "NVDA", name: "NVIDIA", sector: "Technology" },
  { symbol: "META", name: "Meta", sector: "Technology" },
  { symbol: "TSLA", name: "Tesla", sector: "Consumer Cyclical" },
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Financial" },
  { symbol: "V", name: "Visa", sector: "Financial" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { symbol: "PG", name: "Procter & Gamble", sector: "Consumer Defensive" },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy" },
  { symbol: "WMT", name: "Walmart", sector: "Consumer Defensive" },
  { symbol: "BA", name: "Boeing", sector: "Industrials" },
  { symbol: "DIS", name: "Disney", sector: "Communication" },
  { symbol: "NFLX", name: "Netflix", sector: "Communication" },
  { symbol: "ADBE", name: "Adobe", sector: "Technology" },
  { symbol: "CRM", name: "Salesforce", sector: "Technology" },
  { symbol: "INTC", name: "Intel", sector: "Technology" },
  { symbol: "AMD", name: "AMD", sector: "Technology" },
  { symbol: "PEP", name: "PepsiCo", sector: "Consumer Defensive" },
  { symbol: "KO", name: "Coca-Cola", sector: "Consumer Defensive" },
  { symbol: "RELIANCE.NS", name: "Reliance Industries", sector: "Energy" },
  { symbol: "TCS.NS", name: "Tata Consultancy", sector: "Technology" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", sector: "Financial" },
  { symbol: "INFY.NS", name: "Infosys", sector: "Technology" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank", sector: "Financial" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel", sector: "Communication" },
  { symbol: "ITC.NS", name: "ITC", sector: "Consumer Defensive" },
  { symbol: "SBIN.NS", name: "SBI", sector: "Financial" },
]

const SECTORS = [
  "Technology", "Financial", "Healthcare", "Consumer Cyclical",
  "Consumer Defensive", "Energy", "Industrials", "Communication",
]

export async function POST(request: Request) {
  try {
    const { holdings }: { holdings: HoldingInput[] } = await request.json()
    if (!holdings || holdings.length === 0) {
      return NextResponse.json({
        analysis: {
          summary: "Your portfolio is empty. Start by investing in some stocks to get personalized analysis.",
          diversification: { score: 0, details: [] },
          performance: { totalReturn: 0, bestPerformer: null, worstPerformer: null },
          recommendations: shuffle(RECOMMENDATION_CANDIDATES).slice(0, 8).map((s) => ({
            ...s,
            reason: "A well-known stock with strong market presence.",
            confidence: "Medium",
          })),
        },
      })
    }

    const quotes = await Promise.all(holdings.map((h) => getQuote(h.symbol)))
    const histories = await Promise.all(holdings.map((h) => getHistory(h.symbol)))

    const enriched = holdings.map((h, i) => {
      const q = quotes[i]
      const hist = histories[i]
      const currentPrice = q?.price ?? h.avgPrice
      const value = currentPrice * h.shares
      const cost = h.avgPrice * h.shares
      const pl = value - cost
      const plPercent = h.avgPrice ? ((currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0

      let volatility = "Moderate"
      if (hist.length > 5) {
        const closes = hist.map((p: { close: number }) => p.close)
        const mean = closes.reduce((a: number, b: number) => a + b, 0) / closes.length
        const variance = closes.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / closes.length
        const stdDev = Math.sqrt(variance)
        const relStdDev = stdDev / mean
        volatility = relStdDev > 0.25 ? "High" : relStdDev < 0.1 ? "Low" : "Moderate"
      }

      return { ...h, currentPrice, value, cost, pl, plPercent, volatility, exchange: q?.exchange ?? "" }
    })

    const totalValue = enriched.reduce((s, h) => s + h.value, 0)
    const totalCost = enriched.reduce((s, h) => s + h.cost, 0)
    const totalReturn = totalValue - totalCost
    const returnPercent = totalCost ? (totalReturn / totalCost) * 100 : 0

    enriched.sort((a, b) => b.plPercent - a.plPercent)
    const best = enriched[0]
    const worst = enriched[enriched.length - 1]

    const sectorMap: Record<string, number> = {}
    enriched.forEach((h) => {
      const sec = RECOMMENDATION_CANDIDATES.find((c) => c.symbol === h.symbol)?.sector ?? "Other"
      sectorMap[sec] = (sectorMap[sec] || 0) + h.value
    })

    const sectorAllocation = Object.entries(sectorMap).map(([sector, value]) => ({
      sector,
      value,
      percent: totalValue ? (value / totalValue) * 100 : 0,
    }))

    const missingSectors = SECTORS.filter((s) => !sectorMap[s])

    let diversificationScore = 0
    if (holdings.length >= 8) diversificationScore += 30
    else if (holdings.length >= 5) diversificationScore += 20
    else if (holdings.length >= 3) diversificationScore += 10

    const sectorRatio = sectorAllocation.length / SECTORS.length
    diversificationScore += Math.round(sectorRatio * 30)

    const maxHolding = Math.max(...enriched.map((h) => (totalValue ? (h.value / totalValue) * 100 : 0)))
    if (maxHolding < 30) diversificationScore += 20
    else if (maxHolding < 50) diversificationScore += 10

    if (totalReturn >= 0) diversificationScore += 20

    const existingSymbols = new Set(holdings.map((h) => h.symbol))

    const recommendations = shuffle(RECOMMENDATION_CANDIDATES)
      .filter((c) => !existingSymbols.has(c.symbol))
      .slice(0, 6)
      .map((stock) => {
        let reason = ""
        let confidence = "Medium"

        if (missingSectors.includes(stock.sector)) {
          reason = `Adds ${stock.sector} exposure — your portfolio is missing this sector.`
          confidence = "High"
        } else if (holdings.length < 3) {
          reason = "Helps diversify your portfolio with more positions."
          confidence = "High"
        } else if (stock.sector === "Technology") {
          reason = "Strong growth potential with consistent market performance."
          confidence = "Medium"
        } else if (stock.sector === "Financial") {
          reason = "Stable dividend-paying sector with good long-term prospects."
          confidence = "Medium"
        } else if (stock.sector === "Consumer Defensive") {
          reason = "Defensive stock that performs well in market downturns."
          confidence = "Medium"
        } else {
          reason = "Well-established company with solid market fundamentals."
          confidence = "Medium"
        }

        return { ...stock, reason, confidence }
      })
      .sort((a) => (a.confidence === "High" ? -1 : 1))

    return NextResponse.json({
      analysis: {
        summary: `Your portfolio of ${holdings.length} holding${holdings.length > 1 ? "s" : ""} is valued at $${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })} with a ${returnPercent >= 0 ? "+" : ""}${returnPercent.toFixed(2)}% return.`,
        diversification: {
          score: diversificationScore,
          maxScore: 100,
          label: diversificationScore >= 70 ? "Well Diversified" : diversificationScore >= 40 ? "Moderately Diversified" : "Needs Improvement",
          details: sectorAllocation,
          missingSectors,
          concentrationRisk: maxHolding > 40
            ? `High concentration in top holding (${maxHolding.toFixed(0)}% of portfolio). Consider diversifying.`
            : maxHolding > 25
              ? `Moderate concentration — top holding is ${maxHolding.toFixed(0)}% of portfolio.`
              : "Good diversification — no single stock dominates.",
        },
        performance: {
          totalReturn,
          totalReturnPercent: returnPercent,
          bestPerformer: best ? { symbol: best.symbol, return: best.plPercent } : null,
          worstPerformer: worst ? { symbol: worst.symbol, return: worst.plPercent } : null,
          holdings: enriched.map((h) => ({
            symbol: h.symbol,
            name: h.name,
            shares: h.shares,
            avgPrice: h.avgPrice,
            currentPrice: h.currentPrice,
            value: h.value,
            pl: h.pl,
            plPercent: h.plPercent,
            volatility: h.volatility,
          })),
        },
        recommendations,
      },
    })
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}
