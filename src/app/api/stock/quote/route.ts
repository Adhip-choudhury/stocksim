import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    )
    const data = await res.json()

    const result = data.chart?.result?.[0]
    const meta = result?.meta

    if (!meta || !meta.regularMarketPrice) {
      return NextResponse.json({ error: "No data found" }, { status: 404 })
    }

    const quote = result.indicators?.quote?.[0]
    const closes = quote?.close
    const currentClose = closes?.[closes.length - 1] ?? meta.regularMarketPrice
    const prevClose = meta.previousClose ?? currentClose
    const change = currentClose - prevClose
    const changePercent = prevClose ? (change / prevClose) * 100 : 0

    const dayHigh = quote?.high?.reduce((a: number, b: number) => b > a ? b : a, -Infinity)
    const dayLow = quote?.low?.reduce((a: number, b: number) => b < a ? b : a, Infinity)
    const volume = quote?.volume?.reduce((a: number, b: number) => a + (b || 0), 0) || 0

    return NextResponse.json({
      symbol: meta.symbol || symbol,
      price: currentClose,
      change,
      changePercent,
      high: dayHigh || currentClose,
      low: dayLow || currentClose,
      open: quote?.open?.[0] ?? currentClose,
      previousClose: prevClose,
      volume,
      currency: meta.currency || "USD",
      exchange: meta.exchangeName || "",
      latestTradingDay: meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
