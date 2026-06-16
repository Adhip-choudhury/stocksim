import { NextResponse } from "next/server"

const YAHOO_QUOTE = (s: string) =>
  `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}`

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  return res.json()
}

async function getQuote(symbol: string) {
  const data = await fetchJson(YAHOO_QUOTE(symbol))
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta?.regularMarketPrice) return null
  const result = data.chart.result[0]
  const closes = result.indicators?.quote?.[0]?.close
  const volumes = result.indicators?.quote?.[0]?.volume
  const currentClose = closes?.[closes.length - 1] ?? meta.regularMarketPrice
  const prevClose = meta.previousClose ?? currentClose

  const allCloses = closes?.filter((v: number | null) => v != null) || []
  const avgVolume = volumes ? volumes.slice(-20).reduce((a: number, b: number) => a + (b || 0), 0) / Math.min(volumes.length, 20) : 0

  let rsi = 50
  if (allCloses.length > 14) {
    const recent = allCloses.slice(-15)
    let gains = 0, losses = 0
    for (let i = 1; i < recent.length; i++) {
      const diff = recent[i] - recent[i - 1]
      if (diff > 0) gains += diff
      else losses -= diff
    }
    const avgGain = gains / 14
    const avgLoss = losses / 14
    if (avgLoss === 0) rsi = 100
    else rsi = 100 - 100 / (1 + avgGain / avgLoss)
  }

  return {
    symbol: meta.symbol || symbol,
    name: meta.shortName || meta.longName || symbol,
    price: currentClose,
    prevClose,
    changePercent: prevClose ? ((currentClose - prevClose) / prevClose) * 100 : 0,
    volume: volumes ? volumes.reduce((a: number, b: number) => a + (b || 0), 0) : 0,
    avgVolume,
    rsi: Math.round(rsi * 10) / 10,
  }
}

interface Rule {
  id: string
  symbol: string
  name: string
  condition: string
  threshold: number
  action: string
  amount: number
  enabled: boolean
}

interface TriggeredAction {
  id: string
  symbol: string
  name: string
  condition: string
  action: "buy" | "sell"
  shares: number
  price: number
  total: number
  reason: string
  timestamp: number
}

export async function POST(request: Request) {
  try {
    const { rules, lastPrices, capital, usedCapital } = await request.json() as {
      rules: Rule[]
      lastPrices: Record<string, number>
      capital: number
      usedCapital: number
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({ actions: [], prices: {}, message: "No rules configured." })
    }

    const enabledSymbols = [...new Set(rules.filter((r) => r.enabled).map((r) => r.symbol))]
    if (enabledSymbols.length === 0) {
      return NextResponse.json({ actions: [], prices: {}, message: "No enabled rules." })
    }

    const quotes = await Promise.all(enabledSymbols.map((s) => getQuote(s)))
    const prices: Record<string, number> = {}
    const quoteMap: Record<string, Awaited<ReturnType<typeof getQuote>>> = {}

    for (let i = 0; i < enabledSymbols.length; i++) {
      const q = quotes[i]
      if (q) {
        prices[enabledSymbols[i]] = q.price
        quoteMap[enabledSymbols[i]] = q
      }
    }

    const actions: TriggeredAction[] = []
    let spent = 0

    for (const rule of rules) {
      if (!rule.enabled) continue

      const quote = quoteMap[rule.symbol]
      if (!quote) continue

      const prevPrice = lastPrices[rule.symbol]
      const currentPrice = quote.price
      let triggered = false
      let reason = ""

      switch (rule.condition) {
        case "price_drop_pct": {
          if (prevPrice && prevPrice > 0) {
            const drop = ((prevPrice - currentPrice) / prevPrice) * 100
            if (drop >= rule.threshold) {
              triggered = true
              reason = `${rule.symbol} dropped ${drop.toFixed(2)}% (threshold: ${rule.threshold}%)`
            }
          }
          break
        }
        case "price_rise_pct": {
          if (prevPrice && prevPrice > 0) {
            const rise = ((currentPrice - prevPrice) / prevPrice) * 100
            if (rise >= rule.threshold) {
              triggered = true
              reason = `${rule.symbol} rose ${rise.toFixed(2)}% (threshold: ${rule.threshold}%)`
            }
          }
          break
        }
        case "volume_spike": {
          if (quote.avgVolume > 0) {
            const ratio = quote.volume / quote.avgVolume
            if (ratio >= rule.threshold) {
              triggered = true
              reason = `${rule.symbol} volume ${ratio.toFixed(1)}x above average (threshold: ${rule.threshold}x)`
            }
          }
          break
        }
        case "rsi_oversold": {
          if (quote.rsi <= rule.threshold) {
            triggered = true
            reason = `${rule.symbol} RSI at ${quote.rsi} (oversold, threshold: ${rule.threshold})`
          }
          break
        }
        case "rsi_overbought": {
          if (quote.rsi >= rule.threshold) {
            triggered = true
            reason = `${rule.symbol} RSI at ${quote.rsi} (overbought, threshold: ${rule.threshold})`
          }
          break
        }
      }

      if (triggered) {
        if (rule.action === "buy") {
          const budget = Math.min(rule.amount, capital - usedCapital - spent)
          if (budget <= 0) {
            actions.push({
              id: crypto.randomUUID(),
              symbol: rule.symbol,
              name: quote.name,
              condition: rule.condition,
              action: "buy",
              shares: 0,
              price: currentPrice,
              total: 0,
              reason: `${reason} — but capital limit reached.`,
              timestamp: Date.now(),
            })
            continue
          }
          const shares = Math.floor(budget / currentPrice)
          if (shares > 0) {
            const total = shares * currentPrice
            actions.push({
              id: crypto.randomUUID(),
              symbol: rule.symbol,
              name: quote.name,
              condition: rule.condition,
              action: "buy",
              shares,
              price: currentPrice,
              total,
              reason: `${reason} — bought ${shares} shares at $${currentPrice.toFixed(2)}`,
              timestamp: Date.now(),
            })
            spent += total
          }
        } else if (rule.action === "sell") {
          actions.push({
            id: crypto.randomUUID(),
            symbol: rule.symbol,
            name: quote.name,
            condition: rule.condition,
            action: "sell",
            shares: 0,
            price: currentPrice,
            total: 0,
            reason: `${reason} — signal to sell at $${currentPrice.toFixed(2)}`,
            timestamp: Date.now(),
          })
        }
      }
    }

    return NextResponse.json({
      actions,
      prices,
      message: actions.length > 0
        ? `${actions.length} rule${actions.length > 1 ? "s" : ""} triggered.`
        : "No rules triggered this cycle.",
    })
  } catch {
    return NextResponse.json({ actions: [], prices: {}, message: "Bot check failed." }, { status: 500 })
  }
}
