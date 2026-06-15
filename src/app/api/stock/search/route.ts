import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] })
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    )
    const data = await res.json()

    const matches = data.quotes || []
    const results = matches
      .filter((m: Record<string, string>) => m.quoteType === "EQUITY")
      .map((m: Record<string, string>) => ({
        symbol: m.symbol,
        name: m.longname || m.shortname || m.symbol,
        type: m.quoteType || "Equity",
        region: m.exchange || "",
        currency: "",
      }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
