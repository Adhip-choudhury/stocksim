import { doc, getDoc, setDoc, updateDoc, arrayUnion, increment } from "firebase/firestore"
import { db, auth } from "./firebase"
import type { PortfolioState, Transaction, Holding } from "@/types"

function getUid(): string {
  const u = auth.currentUser
  if (!u) throw new Error("Not authenticated")
  return u.uid
}

function userDoc() {
  return doc(db, "users", getUid())
}

export async function getPortfolioFromFirestore(): Promise<PortfolioState> {
  const snap = await getDoc(userDoc())
  if (!snap.exists()) {
    const initial: PortfolioState = { cash: 100000, holdings: [], transactions: [] }
    await setDoc(userDoc(), initial)
    return initial
  }
  const d = snap.data()
  return {
    cash: d.cash ?? 100000,
    holdings: d.holdings ?? [],
    transactions: d.transactions ?? [],
  }
}

export async function buyStockFirestore(
  symbol: string,
  name: string,
  shares: number,
  price: number
): Promise<{ success: boolean; error?: string; state: PortfolioState }> {
  const ref = userDoc()
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error("Portfolio not found")
  const data = snap.data()
  const cash: number = data.cash ?? 100000
  const total = shares * price
  if (total > cash) return { success: false, error: "Insufficient funds", state: data as unknown as PortfolioState }

  const holdings: Holding[] = [...(data.holdings ?? [])]
  const existing = holdings.find((h) => h.symbol === symbol)
  if (existing) {
    const totalCost = existing.avgPrice * existing.shares + total
    existing.shares += shares
    existing.avgPrice = totalCost / existing.shares
  } else {
    holdings.push({ symbol, name, shares, avgPrice: price })
  }

  const transaction: Transaction = {
    id: crypto.randomUUID(),
    type: "buy",
    symbol,
    name,
    shares,
    price,
    total,
    timestamp: Date.now(),
  }

  await updateDoc(ref, {
    cash: increment(-total),
    holdings,
    transactions: arrayUnion(transaction),
  })

  const newSnap = await getDoc(ref)
  const state = newSnap.data() as unknown as PortfolioState
  return { success: true, state }
}

export async function sellStockFirestore(
  symbol: string,
  shares: number,
  price: number
): Promise<{ success: boolean; error?: string; state: PortfolioState }> {
  const ref = userDoc()
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error("Portfolio not found")
  const data = snap.data()
  const holdings: Holding[] = [...(data.holdings ?? [])]
  const holding = holdings.find((h) => h.symbol === symbol)
  if (!holding) return { success: false, error: "You don't own this stock", state: data as unknown as PortfolioState }
  if (shares > holding.shares) return { success: false, error: "Not enough shares", state: data as unknown as PortfolioState }

  const total = shares * price
  holding.shares -= shares
  const updatedHoldings = holding.shares === 0 ? holdings.filter((h) => h.symbol !== symbol) : holdings

  const transaction: Transaction = {
    id: crypto.randomUUID(),
    type: "sell",
    symbol,
    name: holding.name,
    shares,
    price,
    total,
    timestamp: Date.now(),
  }

  await updateDoc(ref, {
    cash: increment(total),
    holdings: updatedHoldings,
    transactions: arrayUnion(transaction),
  })

  const newSnap = await getDoc(ref)
  const state = newSnap.data() as unknown as PortfolioState
  return { success: true, state }
}

export async function resetPortfolioFirestore(): Promise<PortfolioState> {
  const initial: PortfolioState = { cash: 100000, holdings: [], transactions: [] }
  await setDoc(userDoc(), initial)
  return initial
}

export async function getCashFirestore(): Promise<number> {
  const snap = await getDoc(userDoc())
  if (!snap.exists()) return 100000
  return snap.data().cash ?? 100000
}

export async function getTransactionsFirestore(): Promise<Transaction[]> {
  const snap = await getDoc(userDoc())
  if (!snap.exists()) return []
  return snap.data().transactions ?? []
}

export async function getHoldingsFirestore(): Promise<Holding[]> {
  const snap = await getDoc(userDoc())
  if (!snap.exists()) return []
  return snap.data().holdings ?? []
}

export async function createUserDocumentIfNotExists(): Promise<void> {
  const ref = userDoc()
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, { cash: 100000, holdings: [], transactions: [], email: auth.currentUser?.email ?? "" })
  }
}

/* ───── Agent Config & Actions ───── */
import type { AgentConfig, AgentAction } from "@/types"

function agentConfigDoc() {
  return doc(db, "users", getUid(), "agent", "config")
}

function agentActionsDoc() {
  return doc(db, "users", getUid(), "agent", "actions")
}

export async function getAgentConfigFromFirestore(): Promise<AgentConfig> {
  const snap = await getDoc(agentConfigDoc())
  if (!snap.exists()) {
    const def: AgentConfig = { enabled: false, fixedLimit: 5000, usedLimit: 0, instructions: "", lastRun: null }
    await setDoc(agentConfigDoc(), def)
    return def
  }
  return snap.data() as unknown as AgentConfig
}

export async function saveAgentConfigToFirestore(config: AgentConfig): Promise<void> {
  await setDoc(agentConfigDoc(), config)
}

export async function getAgentActionsFromFirestore(): Promise<AgentAction[]> {
  const snap = await getDoc(agentActionsDoc())
  if (!snap.exists()) return []
  return snap.data().actions ?? []
}

export async function addAgentActionToFirestore(action: AgentAction): Promise<void> {
  const ref = agentActionsDoc()
  const snap = await getDoc(ref)
  const actions: AgentAction[] = snap.exists() ? (snap.data().actions ?? []) : []
  actions.push(action)
  await setDoc(ref, { actions })
}

export async function clearAgentActionsFromFirestore(): Promise<void> {
  await setDoc(agentActionsDoc(), { actions: [] })
}

/* ───── Bot Config & Actions ───── */
import type { BotConfig, BotAction } from "@/types"

function botConfigDoc() {
  return doc(db, "users", getUid(), "bot", "config")
}

function botActionsDoc() {
  return doc(db, "users", getUid(), "bot", "actions")
}

export async function getBotConfigFromFirestore(): Promise<BotConfig> {
  const snap = await getDoc(botConfigDoc())
  if (!snap.exists()) {
    const def: BotConfig = {
      enabled: false, capital: 3000, usedCapital: 0, checkInterval: 60,
      rules: [], watchedSymbols: [], lastPrices: {}, lastRun: null,
    }
    await setDoc(botConfigDoc(), def)
    return def
  }
  return snap.data() as unknown as BotConfig
}

export async function saveBotConfigToFirestore(config: BotConfig): Promise<void> {
  await setDoc(botConfigDoc(), config)
}

export async function getBotActionsFromFirestore(): Promise<BotAction[]> {
  const snap = await getDoc(botActionsDoc())
  if (!snap.exists()) return []
  return snap.data().actions ?? []
}

export async function addBotActionToFirestore(action: BotAction): Promise<void> {
  const ref = botActionsDoc()
  const snap = await getDoc(ref)
  const actions: BotAction[] = snap.exists() ? (snap.data().actions ?? []) : []
  actions.push(action)
  await setDoc(ref, { actions })
}

export async function clearBotActionsFromFirestore(): Promise<void> {
  await setDoc(botActionsDoc(), { actions: [] })
}
