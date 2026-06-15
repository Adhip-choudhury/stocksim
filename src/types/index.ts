export interface StockSearchResult {
  symbol: string
  name: string
  type: string
  region: string
  currency: string
}

export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  latestTradingDay: string
}

export interface StockHistoryPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Holding {
  symbol: string
  name: string
  shares: number
  avgPrice: number
}

export interface Transaction {
  id: string
  type: "buy" | "sell"
  symbol: string
  name: string
  shares: number
  price: number
  total: number
  timestamp: number
}

export interface PortfolioState {
  cash: number
  holdings: Holding[]
  transactions: Transaction[]
}
