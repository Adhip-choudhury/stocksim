import type { BotConfig, BotRule, BotAction } from "@/types"

const CONFIG_KEY = "stock-sim-bot-config"
const ACTIONS_KEY = "stock-sim-bot-actions"

export function defaultBotConfig(): BotConfig {
  return {
    enabled: false,
    capital: 3000,
    usedCapital: 0,
    checkInterval: 60,
    rules: [],
    watchedSymbols: [],
    lastPrices: {},
    lastRun: null,
  }
}

export function getBotConfig(): BotConfig {
  if (typeof window === "undefined") return defaultBotConfig()
  const stored = localStorage.getItem(CONFIG_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // ignore
    }
  }
  return defaultBotConfig()
}

export function saveBotConfig(config: BotConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function getBotActions(): BotAction[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(ACTIONS_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // ignore
    }
  }
  return []
}

export function addBotAction(action: BotAction) {
  const actions = getBotActions()
  actions.push(action)
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions))
}

export function clearBotActions() {
  localStorage.setItem(ACTIONS_KEY, JSON.stringify([]))
}

export function createRule(symbol: string, name: string): BotRule {
  return {
    id: crypto.randomUUID(),
    symbol,
    name,
    condition: "price_drop_pct",
    threshold: 5,
    action: "buy",
    amount: 500,
    enabled: true,
  }
}
