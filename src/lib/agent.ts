import type { AgentConfig, AgentAction } from "@/types"

const CONFIG_KEY = "stock-sim-agent-config"
const ACTIONS_KEY = "stock-sim-agent-actions"

export function getAgentConfig(): AgentConfig {
  if (typeof window === "undefined") {
    return { enabled: false, fixedLimit: 5000, usedLimit: 0, instructions: "", lastRun: null }
  }
  const stored = localStorage.getItem(CONFIG_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // ignore
    }
  }
  return { enabled: false, fixedLimit: 5000, usedLimit: 0, instructions: "", lastRun: null }
}

export function saveAgentConfig(config: AgentConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function getAgentActions(): AgentAction[] {
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

export function addAgentAction(action: AgentAction) {
  const actions = getAgentActions()
  actions.push(action)
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions))
}

export function clearAgentActions() {
  localStorage.setItem(ACTIONS_KEY, JSON.stringify([]))
}
