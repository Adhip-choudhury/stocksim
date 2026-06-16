import type { PortfolioState, Holding, Transaction } from "@/types"
import {
  getPortfolioFromFirestore,
  buyStockFirestore,
  sellStockFirestore,
  resetPortfolioFirestore,
  getCashFirestore,
  getTransactionsFirestore,
  getHoldingsFirestore,
} from "./firestore-service"

export async function getPortfolio(): Promise<PortfolioState> {
  return getPortfolioFromFirestore()
}

export async function buyStock(
  symbol: string,
  name: string,
  shares: number,
  price: number
): Promise<{ success: boolean; error?: string; state: PortfolioState }> {
  return buyStockFirestore(symbol, name, shares, price)
}

export async function sellStock(
  symbol: string,
  shares: number,
  price: number
): Promise<{ success: boolean; error?: string; state: PortfolioState }> {
  return sellStockFirestore(symbol, shares, price)
}

export async function resetPortfolio(): Promise<PortfolioState> {
  return resetPortfolioFirestore()
}

export async function getCash(): Promise<number> {
  return getCashFirestore()
}

export async function getTransactions(): Promise<Transaction[]> {
  return getTransactionsFirestore()
}

export async function getHoldings(): Promise<Holding[]> {
  return getHoldingsFirestore()
}
