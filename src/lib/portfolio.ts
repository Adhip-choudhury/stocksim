import type { PortfolioState, Holding, Transaction } from "@/types"

const STORAGE_KEY = "stock-sim-portfolio"
const INITIAL_CASH = 100000

export function getPortfolio(): PortfolioState {
  if (typeof window === "undefined") {
    return { cash: INITIAL_CASH, holdings: [], transactions: [] }
  }
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // ignore
    }
  }
  return { cash: INITIAL_CASH, holdings: [], transactions: [] }
}

export function savePortfolio(state: PortfolioState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetPortfolio(): PortfolioState {
  const state = { cash: INITIAL_CASH, holdings: [], transactions: [] }
  savePortfolio(state)
  return state
}

export function buyStock(
  symbol: string,
  name: string,
  shares: number,
  price: number
): { success: boolean; error?: string; state: PortfolioState } {
  const state = getPortfolio()
  const total = shares * price

  if (total > state.cash) {
    return { success: false, error: "Insufficient funds", state }
  }

  const existing = state.holdings.find((h) => h.symbol === symbol)
  if (existing) {
    const totalCost = existing.avgPrice * existing.shares + total
    existing.shares += shares
    existing.avgPrice = totalCost / existing.shares
  } else {
    state.holdings.push({ symbol, name, shares, avgPrice: price })
  }

  state.cash -= total
  state.transactions.push({
    id: crypto.randomUUID(),
    type: "buy",
    symbol,
    name,
    shares,
    price,
    total,
    timestamp: Date.now(),
  })

  savePortfolio(state)
  return { success: true, state }
}

export function sellStock(
  symbol: string,
  shares: number,
  price: number
): { success: boolean; error?: string; state: PortfolioState } {
  const state = getPortfolio()
  const holding = state.holdings.find((h) => h.symbol === symbol)

  if (!holding) {
    return { success: false, error: "You don't own this stock", state }
  }
  if (shares > holding.shares) {
    return { success: false, error: "Not enough shares", state }
  }

  const total = shares * price
  holding.shares -= shares

  if (holding.shares === 0) {
    state.holdings = state.holdings.filter((h) => h.symbol !== symbol)
  }

  state.cash += total
  state.transactions.push({
    id: crypto.randomUUID(),
    type: "sell",
    symbol,
    name: holding.name,
    shares,
    price,
    total,
    timestamp: Date.now(),
  })

  savePortfolio(state)
  return { success: true, state }
}
