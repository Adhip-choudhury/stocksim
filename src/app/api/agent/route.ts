import { NextResponse } from "next/server"

const YAHOO_QUOTE = (s: string) =>
  `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}`

const YAHOO_SEARCH = (q: string) =>
  `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=5`

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
    name: meta.shortName || meta.longName || symbol,
  }
}

async function searchSymbol(query: string): Promise<{ symbol: string; name: string } | null> {
  const data = await fetchJson(YAHOO_SEARCH(query))
  const quotes = data?.quotes || []
  const equity = quotes.find((q: Record<string, string>) => q.quoteType === "EQUITY" && q.symbol)
  if (equity) return { symbol: equity.symbol, name: equity.longname || equity.shortname || equity.symbol }
  return null
}

function extractKeywords(text: string): { buy: string[]; sell: string[]; amounts: number[] } {
  const lower = text.toLowerCase()
  const buy: string[] = []
  const sell: string[] = []
  const amounts: number[] = []

  const amountMatches = lower.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:dollars?|usd)?/g)
  if (amountMatches) {
    amountMatches.forEach((m) => {
      const num = parseFloat(m.replace(/[$,]/g, ""))
      if (!isNaN(num)) amounts.push(num)
    })
  }

  const buyMatch = lower.match(/buy\s+(?:(\d+)\s+)?(?:shares?\s+of\s+)?([a-z]{1,5})/gi)
  if (buyMatch) {
    buyMatch.forEach((m) => {
      const parts = m.split(/\s+/)
      const sym = parts[parts.length - 1].toUpperCase()
      if (sym.length <= 5 && !buy.includes(sym)) buy.push(sym)
    })
  }

  const sellMatch = lower.match(/sell\s+(?:(\d+)\s+)?(?:shares?\s+of\s+)?([a-z]{1,5})/gi)
  if (sellMatch) {
    sellMatch.forEach((m) => {
      const parts = m.split(/\s+/)
      const sym = parts[parts.length - 1].toUpperCase()
      if (sym.length <= 5 && !sell.includes(sym)) sell.push(sym)
    })
  }

  return { buy, sell, amounts }
}

const STOCK_DB: { symbol: string; name: string; sector: string }[] = [
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
  { symbol: "WMT", name: "Walmart", sector: "Consumer Defensive" },
  { symbol: "PG", name: "Procter & Gamble", sector: "Consumer Defensive" },
  { symbol: "DIS", name: "Disney", sector: "Communication" },
  { symbol: "NFLX", name: "Netflix", sector: "Communication" },
  { symbol: "AMD", name: "AMD", sector: "Technology" },
  { symbol: "BA", name: "Boeing", sector: "Industrials" },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy" },
  { symbol: "KO", name: "Coca-Cola", sector: "Consumer Defensive" },
  { symbol: "PEP", name: "PepsiCo", sector: "Consumer Defensive" },
  { symbol: "INTC", name: "Intel", sector: "Technology" },
]

function detectSectorIntent(text: string): string | null {
  const lower = text.toLowerCase()
  const sectors = [
    { keywords: ["tech", "technology", "software", "semiconductor"], sector: "Technology" },
    { keywords: ["bank", "financial", "finance", "financ"], sector: "Financial" },
    { keywords: ["health", "healthcare", "medical", "pharma"], sector: "Healthcare" },
    { keywords: ["energy", "oil", "gas", "renewable"], sector: "Energy" },
    { keywords: ["consumer", "retail", "defensive"], sector: "Consumer Defensive" },
    { keywords: ["communication", "media", "telecom"], sector: "Communication" },
    { keywords: ["industrial", "manufacturing", "defense"], sector: "Industrials" },
  ]
  for (const s of sectors) {
    if (s.keywords.some((kw) => lower.includes(kw))) return s.sector
  }
  return null
}

function detectDiversifyIntent(text: string): boolean {
  const lower = text.toLowerCase()
  return lower.includes("diversif") || lower.includes("spread") || lower.includes("balance")
}

function detectTargetPercent(text: string): number | null {
  const match = text.match(/(\d+)%\s*(?:of|to|allocat|invest)/i)
  if (match) {
    const pct = parseInt(match[1])
    if (pct > 0 && pct <= 100) return pct
  }
  return null
}

interface Action {
  type: "buy" | "sell" | "info"
  symbol?: string
  name?: string
  shares?: number
  price?: number
  total?: number
  reason: string
}

interface Holding {
  symbol: string
  name: string
  shares: number
  avgPrice: number
}

export async function POST(request: Request) {
  try {
    const { instructions, fixedLimit, usedLimit, holdings, cash } = await request.json() as {
      instructions: string
      fixedLimit: number
      usedLimit: number
      holdings: Holding[]
      cash: number
    }

    if (!instructions || !instructions.trim()) {
      return NextResponse.json({ actions: [], message: "No instructions provided." })
    }

    const actions: Action[] = []
    const availableLimit = fixedLimit - usedLimit
    const kw = extractKeywords(instructions)
    const sectorIntent = detectSectorIntent(instructions)
    const diversify = detectDiversifyIntent(instructions)
    const targetPct = detectTargetPercent(instructions)
    const existingSymbols = new Set(holdings.map((h) => h.symbol))

    if (kw.sell.length > 0) {
      for (const sym of kw.sell) {
        const holding = holdings.find((h) => h.symbol === sym)
        if (holding) {
          const quote = await getQuote(sym)
          const price = quote?.price ?? holding.avgPrice
          actions.push({
            type: "sell",
            symbol: holding.symbol,
            name: holding.name,
            shares: holding.shares,
            price,
            total: holding.shares * price,
            reason: `AI agent sold all ${holding.shares} shares of ${holding.symbol} as instructed.`,
          })
        } else {
          actions.push({
            type: "info",
            symbol: sym,
            reason: `You don't own any shares of ${sym} to sell.`,
          })
        }
      }
    }

    const buySymbols = [...kw.buy]

    if (sectorIntent && !diversify) {
      const candidates = STOCK_DB
        .filter((s) => s.sector === sectorIntent && !existingSymbols.has(s.symbol))
        .slice(0, 3)
      for (const c of candidates) {
        if (!buySymbols.includes(c.symbol)) buySymbols.push(c.symbol)
      }
    }

    if (diversify) {
      const heldSectors = new Set(holdings.map((h) => {
        const found = STOCK_DB.find((s) => s.symbol === h.symbol)
        return found?.sector || "Other"
      }))
      const missing = STOCK_DB.filter((s) => !heldSectors.has(s.sector) && !existingSymbols.has(s.symbol))
      const shuffled = missing.sort(() => Math.random() - 0.5)
      for (const s of shuffled.slice(0, 4)) {
        if (!buySymbols.includes(s.symbol)) buySymbols.push(s.symbol)
      }
    }

    const hasAmount = kw.amounts.length > 0
    const buyBudget = hasAmount ? Math.min(kw.amounts[0], availableLimit) : availableLimit
    let spent = 0

    if (buySymbols.length > 0 && buyBudget > 0) {
      for (const sym of buySymbols) {
        if (spent >= buyBudget * 0.8) break
        let quote = await getQuote(sym)
        if (!quote) {
          const lookup = await searchSymbol(sym)
          if (lookup) quote = await getQuote(lookup.symbol)
        }
        if (!quote) {
          actions.push({
            type: "info",
            symbol: sym,
            reason: `Could not fetch a price for ${sym}. Skipping.`,
          })
          continue
        }

        const price = quote.price
        if (!price || price <= 0) {
          actions.push({
            type: "info",
            symbol: sym,
            reason: `Invalid price for ${sym} ($${price}). Skipping.`,
          })
          continue
        }

        const remaining = buyBudget - spent
        let maxShares = Math.floor(remaining / price)
        if (maxShares <= 0) {
          actions.push({
            type: "info",
            symbol: sym,
            reason: `Not enough budget remaining to buy ${sym} at $${price.toFixed(2)}. Need $${price.toFixed(2)} but only $${remaining.toFixed(2)} left.`,
          })
          continue
        }

        if (targetPct && cash > 0) {
          const targetAmount = (targetPct / 100) * cash
          maxShares = Math.min(maxShares, Math.floor(targetAmount / price))
        }

        if (maxShares < 1) maxShares = 1
        const totalCost = maxShares * price

        if (totalCost > cash) {
          maxShares = Math.floor(cash / price)
          if (maxShares <= 0) {
            actions.push({
              type: "info",
              symbol: sym,
              reason: `Not enough cash to buy ${sym}. Need $${price.toFixed(2)} per share, have $${cash.toFixed(2)} cash.`,
            })
            continue
          }
        }

        const finalCost = maxShares * price
        actions.push({
          type: "buy",
          symbol: sym,
          name: quote.name || sym,
          shares: maxShares,
          price,
          total: finalCost,
          reason: `AI agent bought ${maxShares} shares of ${sym} at $${price.toFixed(2)} ($${finalCost.toFixed(2)}).`,
        })
        spent += finalCost
      }
    }

    if (targetPct && cash > 0 && buySymbols.length === 0 && !sectorIntent) {
      const targetAmount = (targetPct / 100) * cash
      const candidates = STOCK_DB
        .filter((s) => !existingSymbols.has(s.symbol))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
      for (const c of candidates) {
        if (spent >= targetAmount * 0.8) break
        const quote = await getQuote(c.symbol)
        if (!quote?.price) continue
        const shares = Math.floor((targetAmount - spent) / quote.price)
        if (shares <= 0) continue
        const cost = shares * quote.price
        actions.push({
          type: "buy",
          symbol: c.symbol,
          name: c.name,
          shares,
          price: quote.price,
          total: cost,
          reason: `AI agent invested ${targetPct}% of cash ($${cost.toFixed(2)}) into ${c.symbol} at $${quote.price.toFixed(2)}.`,
        })
        spent += cost
      }
    }

    if (actions.length === 0) {
      const hasGeneral = instructions.toLowerCase().includes("invest") || instructions.toLowerCase().includes("trade") || instructions.toLowerCase().includes("buy")
      if (hasGeneral && availableLimit > 0) {
        const candidates = STOCK_DB
          .filter((s) => !existingSymbols.has(s.symbol))
          .sort(() => Math.random() - 0.5)
          .slice(0, 2)
        for (const c of candidates) {
          if (spent >= availableLimit * 0.8) break
          const quote = await getQuote(c.symbol)
          if (!quote?.price) continue
          const shares = Math.floor((availableLimit - spent) / quote.price)
          if (shares <= 0) continue
          const cost = shares * quote.price
          actions.push({
            type: "buy",
            symbol: c.symbol,
            name: c.name,
            shares,
            price: quote.price,
            total: cost,
            reason: `AI agent bought ${shares} shares of ${c.symbol} at $${quote.price.toFixed(2)} as a general investment.`,
          })
          spent += cost
        }
      }
    }

    if (actions.length === 0) {
      return NextResponse.json({
        actions: [],
        message: "AI agent reviewed your instructions but couldn't find any trades to execute with the current market data and portfolio. Try being more specific (e.g. 'buy 5 shares of AAPL', 'invest $1000 in tech stocks').",
      })
    }

    return NextResponse.json({ actions, message: `${actions.length} action${actions.length > 1 ? "s" : ""} proposed by AI agent.` })
  } catch {
    return NextResponse.json({ actions: [], message: "AI agent encountered an error. Please try again." }, { status: 500 })
  }
}
