import type { AgentConfig, AgentAction } from "@/types"
import {
  getAgentConfigFromFirestore,
  saveAgentConfigToFirestore,
  getAgentActionsFromFirestore,
  addAgentActionToFirestore,
  clearAgentActionsFromFirestore,
} from "./firestore-service"

export async function getAgentConfig(): Promise<AgentConfig> {
  return getAgentConfigFromFirestore()
}

export async function saveAgentConfig(config: AgentConfig): Promise<void> {
  return saveAgentConfigToFirestore(config)
}

export async function getAgentActions(): Promise<AgentAction[]> {
  return getAgentActionsFromFirestore()
}

export async function addAgentAction(action: AgentAction): Promise<void> {
  return addAgentActionToFirestore(action)
}

export async function clearAgentActions(): Promise<void> {
  return clearAgentActionsFromFirestore()
}
