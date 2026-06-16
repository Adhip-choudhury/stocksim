"use client"

import { useEffect, useState } from "react"
import type { AgentConfig, AgentAction } from "@/types"
import { getPortfolio, buyStock, sellStock } from "@/lib/portfolio"
import { getAgentConfig, saveAgentConfig, getAgentActions, addAgentAction, clearAgentActions } from "@/lib/agent"

const defaultConfig: AgentConfig = { enabled: false, fixedLimit: 5000, usedLimit: 0, instructions: "", lastRun: null }

interface ProposedAction {
  type: "buy" | "sell" | "info"
  symbol?: string
  name?: string
  shares?: number
  price?: number
  total?: number
  reason: string
}

export default function AgentPage() {
  const [config, setConfig] = useState<AgentConfig>(defaultConfig)
  const [actions, setActions] = useState<AgentAction[]>([])
  const [proposed, setProposed] = useState<ProposedAction[]>([])
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState("")
  const [editingLimit, setEditingLimit] = useState(false)

  useEffect(() => {
    getAgentConfig().then(setConfig)
    getAgentActions().then(setActions)
  }, [])

  const runAgent = async () => {
    if (!config.instructions.trim()) {
      setMessage("Enter instructions for the AI agent first.")
      return
    }
    const portfolio = await getPortfolio()
    setRunning(true)
    setMessage("")
    setProposed([])
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: config.instructions,
          fixedLimit: config.fixedLimit,
          usedLimit: config.usedLimit,
          holdings: portfolio.holdings,
          cash: portfolio.cash,
        }),
      })
      const data = await res.json()
      if (data.actions) {
        setProposed(data.actions)
      }
      setMessage(data.message || "Done.")
    } catch {
      setMessage("Failed to reach AI agent. Make sure the server is running.")
    }
    setRunning(false)
  }

  const executeActions = async () => {
    const newActions: AgentAction[] = []
    let totalSpent = 0

    for (const a of proposed) {
      if (a.type === "buy" && a.symbol && a.shares && a.price) {
        const result = await buyStock(a.symbol, a.name || a.symbol, a.shares, a.price)
        if (result.success) {
          const action: AgentAction = {
            id: crypto.randomUUID(),
            type: "buy",
            symbol: a.symbol,
            name: a.name || a.symbol,
            shares: a.shares,
            price: a.price,
            total: a.total || a.shares * a.price,
            reason: a.reason,
            timestamp: Date.now(),
          }
          newActions.push(action)
          totalSpent += action.total || 0
        }
      } else if (a.type === "sell" && a.symbol && a.shares && a.price) {
        const result = await sellStock(a.symbol, a.shares, a.price)
        if (result.success) {
          const action: AgentAction = {
            id: crypto.randomUUID(),
            type: "sell",
            symbol: a.symbol,
            name: a.name || a.symbol,
            shares: a.shares,
            price: a.price,
            total: a.total || a.shares * a.price,
            reason: a.reason,
            timestamp: Date.now(),
          }
          newActions.push(action)
        }
      }
    }

    for (const a of newActions) await addAgentAction(a)
    setActions(await getAgentActions())

    const updatedConfig = { ...config, usedLimit: config.usedLimit + totalSpent, lastRun: Date.now() }
    await saveAgentConfig(updatedConfig)
    setConfig(updatedConfig)
    setProposed([])
    setMessage(`Executed ${newActions.length} action${newActions.length > 1 ? "s" : ""}. Total spent: $${totalSpent.toFixed(2)}`)
  }

  const clearAll = async () => {
    await clearAgentActions()
    const reset = { ...config, usedLimit: 0 }
    await saveAgentConfig(reset)
    setConfig(reset)
    setActions([])
    setProposed([])
    setMessage("Agent history cleared.")
  }

  const toggleAgent = async () => {
    const updated = { ...config, enabled: !config.enabled }
    await saveAgentConfig(updated)
    setConfig(updated)
  }

  const updateLimit = async (val: number) => {
    const updated = { ...config, fixedLimit: val }
    await saveAgentConfig(updated)
    setConfig(updated)
  }

  const updateInstructions = async (val: string) => {
    const updated = { ...config, instructions: val }
    await saveAgentConfig(updated)
    setConfig(updated)
  }

  const totalUsed = config.usedLimit
  const usedPercent = config.fixedLimit > 0 ? (totalUsed / config.fixedLimit) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">AI Trading Agent</h1>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={clearAll}
            className="text-sm px-3 py-1.5 rounded bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors"
          >
            Clear History
          </button>
          <button
            onClick={toggleAgent}
            className={`text-sm px-3 py-1.5 rounded transition-colors ${
              config.enabled
                ? "bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20"
                : "bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {config.enabled ? "● Active" : "○ Disabled"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Agent Settings</h2>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--muted)]">Fixed Capital Limit</span>
              {editingLimit ? (
                <input
                  type="number"
                  value={config.fixedLimit}
                  onChange={(e) => updateLimit(parseInt(e.target.value) || 0)}
                  onBlur={() => setEditingLimit(false)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingLimit(false)}
                  className="w-28 px-2 py-1 rounded bg-[var(--background)] border border-[var(--border)] text-sm text-right focus:outline-none focus:border-[var(--primary)]"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setEditingLimit(true)}
                  className="text-lg font-bold hover:text-[var(--primary)] transition-colors"
                >
                  ${config.fixedLimit.toLocaleString()}
                </button>
              )}
            </div>
            <div className="h-3 rounded-full bg-[var(--background)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(usedPercent, 100)}%`,
                  background: usedPercent > 80 ? "var(--danger)" : usedPercent > 50 ? "#f59e0b" : "var(--success)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
              <span>${totalUsed.toLocaleString()} used</span>
              <span>${(config.fixedLimit - totalUsed).toLocaleString()} remaining</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-[var(--muted)] block mb-1">Instructions for AI Agent</label>
            <textarea
              value={config.instructions}
              onChange={(e) => updateInstructions(e.target.value)}
              placeholder={`e.g. "Buy 5 shares of AAPL and invest $1000 in tech stocks"\n\nMore examples:\n- "Sell TSLA and buy MSFT with the proceeds"\n- "Diversify my portfolio across different sectors"\n- "Invest 30% of my cash in healthcare stocks"\n- "Buy 3 shares of NVDA and AMD each"`}
              rows={5}
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] resize-vertical text-sm"
            />
          </div>

          <button
            onClick={runAgent}
            disabled={running || !config.instructions.trim()}
            className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {running ? "🤖 AI Agent is thinking..." : "▶ Run AI Agent"}
          </button>

          {message && (
            <div className="mt-3 px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--muted)] leading-relaxed">
              {message}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Proposed Actions</h2>

          {proposed.length === 0 && (
            <div className="text-center py-8 text-[var(--muted)]">
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-sm">Run the agent to see proposed trades here.</p>
              <p className="text-xs mt-1">Review before executing.</p>
            </div>
          )}

          {proposed.length > 0 && (
            <div className="space-y-3 mb-4">
              {proposed.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 border text-sm ${
                    a.type === "buy"
                      ? "bg-[var(--success)]/5 border-[var(--success)]/20"
                      : a.type === "sell"
                        ? "bg-[var(--danger)]/5 border-[var(--danger)]/20"
                        : "bg-[var(--background)] border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        a.type === "buy"
                          ? "bg-[var(--success)]/10 text-[var(--success)]"
                          : a.type === "sell"
                            ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                            : "bg-[var(--border)] text-[var(--muted)]"
                      }`}
                    >
                      {a.type.toUpperCase()}
                    </span>
                    {a.symbol && <span className="font-semibold">{a.symbol}</span>}
                    {a.shares && a.price && (
                      <span className="text-[var(--muted)] text-xs">
                        {a.shares} shares @ ${a.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)]">{a.reason}</p>
                </div>
              ))}
            </div>
          )}

          {proposed.length > 0 && (
            <button
              onClick={executeActions}
              className="w-full py-2.5 rounded-lg bg-[var(--success)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              ✓ Execute {proposed.filter((a) => a.type !== "info").length} Trades
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Agent Activity Log</h2>

        {actions.length === 0 && (
          <div className="text-center py-8 text-[var(--muted)]">
            <p className="text-sm">No agent activity yet.</p>
          </div>
        )}

        {actions.length > 0 && (
          <div className="overflow-x-auto -mx-4 sm:-mx-0">
            <div className="min-w-[600px] px-4 sm:px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--muted)] border-b border-[var(--border)]">
                  <th className="text-left py-2 px-2 sm:px-3">Time</th>
                  <th className="text-left py-2 px-2 sm:px-3">Type</th>
                  <th className="text-left py-2 px-2 sm:px-3">Symbol</th>
                  <th className="text-right py-2 px-2 sm:px-3">Shares</th>
                  <th className="text-right py-2 px-2 sm:px-3 hidden sm:table-cell">Price</th>
                  <th className="text-right py-2 px-2 sm:px-3 hidden sm:table-cell">Total</th>
                  <th className="text-left py-2 px-2 sm:px-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {[...actions].reverse().map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)]/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-[var(--muted)] text-xs whitespace-nowrap">
                      {new Date(a.timestamp).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3">
                      <span
                        className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-medium ${
                          a.type === "buy"
                            ? "bg-[var(--success)]/10 text-[var(--success)]"
                            : a.type === "sell"
                              ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                              : "bg-[var(--border)] text-[var(--muted)]"
                        }`}
                      >
                        {a.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3 font-medium">{a.symbol || "—"}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-right">{a.shares || "—"}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-right hidden sm:table-cell">{a.price ? `$${a.price.toFixed(2)}` : "—"}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-right hidden sm:table-cell">{a.total ? `$${a.total.toFixed(2)}` : "—"}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-[var(--muted)] text-xs max-w-[100px] sm:max-w-[200px] truncate" title={a.reason}>
                      {a.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {config.lastRun && (
          <div className="mt-4 text-xs text-[var(--muted)]">
            Last run: {new Date(config.lastRun).toLocaleString()}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
        <h2 className="text-base sm:text-lg font-semibold mb-3">💡 Example Instructions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ["Buy 5 shares of AAPL", "Simple buy order with specific quantity"],
            ["Sell all TSLA shares", "Sell entire position in a stock"],
            ["Invest $2000 in tech stocks", "Invest a fixed amount into a sector"],
            ["Diversify my portfolio", "Buy stocks from missing sectors"],
            ["Buy 3 shares of NVDA and MSFT", "Multiple stocks in one instruction"],
            ["Invest 20% of my cash in healthcare", "Percentage-based allocation"],
          ].map(([cmd, desc]) => (
            <button
              key={cmd}
              onClick={() => updateInstructions(cmd)}
              className="text-left px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors text-xs"
            >
              <code className="text-[var(--primary)] font-medium">&ldquo;{cmd}&rdquo;</code>
              <div className="text-[var(--muted)] mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
