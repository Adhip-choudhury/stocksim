import type { BotConfig, BotRule, BotAction } from "@/types"
import {
  getBotConfigFromFirestore,
  saveBotConfigToFirestore,
  getBotActionsFromFirestore,
  addBotActionToFirestore,
  clearBotActionsFromFirestore,
} from "./firestore-service"

export async function getBotConfig(): Promise<BotConfig> {
  return getBotConfigFromFirestore()
}

export async function saveBotConfig(config: BotConfig): Promise<void> {
  return saveBotConfigToFirestore(config)
}

export async function getBotActions(): Promise<BotAction[]> {
  return getBotActionsFromFirestore()
}

export async function addBotAction(action: BotAction): Promise<void> {
  return addBotActionToFirestore(action)
}

export async function clearBotActions(): Promise<void> {
  return clearBotActionsFromFirestore()
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
