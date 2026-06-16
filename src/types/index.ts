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
  open: number
  high: number
  low: number
  previousClose: number
  volume: number
  currency: string
  exchange: string
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

export interface AgentConfig {
  enabled: boolean
  fixedLimit: number
  usedLimit: number
  instructions: string
  lastRun: number | null
}

export interface AgentAction {
  id: string
  type: "buy" | "sell" | "info"
  symbol?: string
  name?: string
  shares?: number
  price?: number
  total?: number
  reason: string
  timestamp: number
}

export type BotCondition = "price_drop_pct" | "price_rise_pct" | "volume_spike" | "rsi_oversold" | "rsi_overbought"

export type BotActionType = "buy" | "sell"

export interface BotRule {
  id: string
  symbol: string
  name: string
  condition: BotCondition
  threshold: number
  action: BotActionType
  amount: number
  enabled: boolean
}

export interface BotConfig {
  enabled: boolean
  capital: number
  usedCapital: number
  checkInterval: number
  rules: BotRule[]
  watchedSymbols: string[]
  lastPrices: Record<string, number>
  lastRun: number | null
}

export interface BotAction {
  id: string
  symbol: string
  name: string
  condition: string
  action: BotActionType
  shares: number
  price: number
  total: number
  reason: string
  timestamp: number
}
