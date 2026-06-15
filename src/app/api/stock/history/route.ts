import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    )
    const data = await res.json()

    const result = data.chart?.result?.[0]
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      return NextResponse.json({ error: "No data found" }, { status: 404 })
    }

    const timestamps = result.timestamp
    const quote = result.indicators.quote[0]

    const points = timestamps.map((t: number, i: number) => ({
      date: new Date(t * 1000).toISOString().split("T")[0],
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume[i] || 0,
    }))

    return NextResponse.json({ points })
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
