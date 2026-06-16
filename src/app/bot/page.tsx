"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { BotConfig, BotRule, BotAction } from "@/types"
import { getBotConfig, saveBotConfig, getBotActions, addBotAction, clearBotActions, createRule } from "@/lib/bot"

const CONDITION_LABELS: Record<string, string> = {
  price_drop_pct: "Price Drop %",
  price_rise_pct: "Price Rise %",
  volume_spike: "Volume Spike",
  rsi_oversold: "RSI Oversold",
  rsi_overbought: "RSI Overbought",
}

const CONDITION_DESCS: Record<string, string> = {
  price_drop_pct: "Trigger when price drops below last check by X%",
  price_rise_pct: "Trigger when price rises above last check by X%",
  volume_spike: "Trigger when volume is X times the 20-day average",
  rsi_oversold: "Trigger when RSI drops below X (oversold)",
  rsi_overbought: "Trigger when RSI goes above X (overbought)",
}

function liveBuyStock(symbol: string, name: string, shares: number, price: number): boolean {
  const raw = localStorage.getItem("stock-sim-portfolio")
  if (!raw) return false
  const state = JSON.parse(raw)
  const total = shares * price
  if (total > state.cash) return false
  const existing = state.holdings.find((h: { symbol: string }) => h.symbol === symbol)
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
  localStorage.setItem("stock-sim-portfolio", JSON.stringify(state))
  return true
}

function liveSellStock(symbol: string, price: number): boolean {
  const raw = localStorage.getItem("stock-sim-portfolio")
  if (!raw) return false
  const state = JSON.parse(raw)
  const holding = state.holdings.find((h: { symbol: string }) => h.symbol === symbol)
  if (!holding) return false
  const total = holding.shares * price
  state.cash += total
  state.transactions.push({
    id: crypto.randomUUID(),
    type: "sell",
    symbol,
    name: holding.name,
    shares: holding.shares,
    price,
    total,
    timestamp: Date.now(),
  })
  state.holdings = state.holdings.filter((h: { symbol: string }) => h.symbol !== symbol)
  localStorage.setItem("stock-sim-portfolio", JSON.stringify(state))
  return true
}

function botConfigFromStorage(): BotConfig {
  if (typeof window === "undefined") return createEmpty()
  return getBotConfig()
}

function createEmpty(): BotConfig {
  return { enabled: false, capital: 3000, usedCapital: 0, checkInterval: 60, rules: [], watchedSymbols: [], lastPrices: {}, lastRun: null }
}

export default function BotPage() {
  const [config, setConfig] = useState<BotConfig>(botConfigFromStorage)
  const [actions, setActions] = useState<BotAction[]>(() => {
    if (typeof window === "undefined") return []
    return getBotActions()
  })
  const [log, setLog] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [editSymbol, setEditSymbol] = useState("")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  const runCycle = useCallback(async () => {
    const cfg = getBotConfig()
    if (!cfg.enabled) return
    setRunning(true)
    try {
      const res = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: cfg.rules,
          lastPrices: cfg.lastPrices,
          capital: cfg.capital,
          usedCapital: cfg.usedCapital,
        }),
      })
      const data = await res.json()
      if (data.prices) {
        const updated = { ...cfg, lastPrices: data.prices, lastRun: Date.now() }
        setConfig(updated)
        saveBotConfig(updated)
      }
      if (data.actions && data.actions.length > 0) {
        let totalSpent = 0
        for (const a of data.actions) {
          if (a.shares > 0 && a.action === "buy") {
            const success = liveBuyStock(a.symbol, a.name, a.shares, a.price)
            if (success) {
              totalSpent += a.total
              const action: BotAction = { ...a, timestamp: Date.now() }
              addBotAction(action)
              addLog(`Bought ${a.shares} ${a.symbol} @ $${a.price.toFixed(2)} — ${a.reason}`)
            }
          } else if (a.action === "sell" && a.shares === 0) {
            const sold = liveSellStock(a.symbol, a.price)
            if (sold) {
              const action: BotAction = { ...a, shares: 0, action: "sell", timestamp: Date.now() }
              addBotAction(action)
              addLog(`Sold ${a.symbol} @ $${a.price.toFixed(2)} — ${a.reason}`)
            }
          } else {
            addLog(`Info: ${a.reason}`)
          }
        }
        if (totalSpent > 0) {
          const updated = { ...cfg, usedCapital: cfg.usedCapital + totalSpent, lastPrices: data.prices, lastRun: Date.now() }
          setConfig(updated)
          saveBotConfig(updated)
        }
        setActions(getBotActions())
      } else {
        addLog("No rules triggered")
      }
    } catch {
      addLog("Error checking rules")
    }
    setRunning(false)
  }, [addLog])

  useEffect(() => {
    if (!config.enabled) return
    setTimeout(() => runCycle(), 0)
    const id = setInterval(() => runCycle(), config.checkInterval * 1000)
    intervalRef.current = id
    return () => { clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enabled, config.checkInterval])

  const toggleBot = () => {
    const next = !config.enabled
    const updated = { ...config, enabled: next }
    setConfig(updated)
    saveBotConfig(updated)
    if (next) {
      addLog("Bot started")
    } else {
      addLog("Bot stopped")
    }
  }

  const addRuleForSymbol = () => {
    const sym = editSymbol.trim().toUpperCase()
    if (!sym) return
    if (config.rules.find((r) => r.symbol === sym)) {
      addLog(`Rule for ${sym} already exists`)
      return
    }
    const rule = createRule(sym, sym)
    const updated = { ...config, rules: [...config.rules, rule], watchedSymbols: [...new Set([...config.watchedSymbols, sym])] }
    setConfig(updated)
    saveBotConfig(updated)
    setEditSymbol("")
    addLog(`Added rule for ${sym}`)
  }

  const removeRule = (id: string) => {
    const rule = config.rules.find((r) => r.id === id)
    const updated = { ...config, rules: config.rules.filter((r) => r.id !== id) }
    if (rule) {
      const stillWatched = updated.rules.some((r) => r.symbol === rule.symbol)
      if (!stillWatched) {
        updated.watchedSymbols = updated.watchedSymbols.filter((s) => s !== rule.symbol)
      }
    }
    setConfig(updated)
    saveBotConfig(updated)
  }

  const updateRule = (id: string, field: keyof BotRule, value: unknown) => {
    const updated = {
      ...config,
      rules: config.rules.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }
    setConfig(updated)
    saveBotConfig(updated)
  }

  const updateCapital = (val: number) => {
    const updated = { ...config, capital: val }
    setConfig(updated)
    saveBotConfig(updated)
  }

  const updateInterval = (val: number) => {
    const updated = { ...config, checkInterval: val }
    setConfig(updated)
    saveBotConfig(updated)
  }

  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    clearBotActions()
    const fresh = createEmpty()
    setConfig(fresh)
    saveBotConfig(fresh)
    setActions([])
    setLog([])
  }

  const usedPct = config.capital > 0 ? (config.usedCapital / config.capital) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">🤖 Trading Bot</h1>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleReset}
            className="text-sm px-3 py-1.5 rounded bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors"
          >
            Reset Bot
          </button>
          <button
            onClick={toggleBot}
            className={`text-sm px-4 py-1.5 rounded font-medium transition-colors ${
              config.enabled
                ? "bg-[var(--success)] text-white"
                : "bg-[var(--primary)] text-white"
            }`}
          >
            {config.enabled ? "⏹ Stop Bot" : "▶ Start Bot"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-3 sm:p-4">
          <div className="text-sm text-[var(--muted)]">Bot Capital</div>
          <input
            type="number"
            value={config.capital}
            onChange={(e) => updateCapital(parseInt(e.target.value) || 0)}
            className="text-2xl font-bold bg-transparent w-full focus:outline-none mt-1"
          />
          <div className="h-2 rounded-full bg-[var(--background)] overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(usedPct, 100)}%`,
                background: usedPct > 80 ? "var(--danger)" : usedPct > 50 ? "#f59e0b" : "var(--success)",
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
            <span>${config.usedCapital.toLocaleString()} used</span>
            <span>${(config.capital - config.usedCapital).toLocaleString()} free</span>
          </div>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <div className="text-sm text-[var(--muted)]">Check Interval</div>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={config.checkInterval}
              onChange={(e) => updateInterval(parseInt(e.target.value))}
              className="flex-1 accent-[var(--primary)]"
            />
            <span className="text-lg font-bold w-16 text-right">{config.checkInterval}s</span>
          </div>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-3 sm:p-4">
          <div className="text-sm text-[var(--muted)]">Status</div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${config.enabled ? "bg-[var(--success)] animate-pulse" : "bg-[var(--muted)]"}`} />
            <span className="font-semibold">{config.enabled ? "Running" : "Stopped"}</span>
            <span className="text-xs text-[var(--muted)] ml-auto">
              {config.rules.length} rule{config.rules.length !== 1 ? "s" : ""}
            </span>
          </div>
          {config.lastRun && (
            <div className="text-xs text-[var(--muted)] mt-1">
              Last check: {new Date(config.lastRun).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Rules</h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={editSymbol}
            onChange={(e) => setEditSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && addRuleForSymbol()}
            placeholder="Add stock symbol e.g. AAPL"
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] uppercase"
          />
          <button
            onClick={addRuleForSymbol}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Add Stock
          </button>
        </div>

        {config.rules.length === 0 && (
          <div className="text-center py-8 text-[var(--muted)]">
            <p className="text-sm">No rules yet. Add a stock above to create a rule.</p>
          </div>
        )}

        {config.rules.length > 0 && (
          <div className="space-y-3">
            {config.rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{rule.symbol}</span>
                    <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => updateRule(rule.id, "enabled", e.target.checked)}
                        className="accent-[var(--primary)]"
                      />
                      Active
                    </label>
                  </div>
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="text-xs text-[var(--danger)] hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Condition</label>
                    <select
                      value={rule.condition}
                      onChange={(e) => updateRule(rule.id, "condition", e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 rounded bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)]"
                    >
                      {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <div className="text-[10px] text-[var(--muted)] mt-1">{CONDITION_DESCS[rule.condition]}</div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Threshold</label>
                    <input
                      type="number"
                      value={rule.threshold}
                      onChange={(e) => updateRule(rule.id, "threshold", parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-2 py-1.5 rounded bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)]"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Action</label>
                    <select
                      value={rule.action}
                      onChange={(e) => updateRule(rule.id, "action", e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 rounded bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)]"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
                      {rule.action === "buy" ? "Amount per Trade" : "Trigger"}
                    </label>
                    {rule.action === "buy" ? (
                      <input
                        type="number"
                        value={rule.amount}
                        onChange={(e) => updateRule(rule.id, "amount", parseInt(e.target.value) || 0)}
                        className="w-full mt-1 px-2 py-1.5 rounded bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)]"
                      />
                    ) : (
                      <div className="mt-1 px-2 py-1.5 text-sm text-[var(--muted)]">
                        Sells entire position
                      </div>
                    )}
                  </div>
                </div>

                {config.lastPrices[rule.symbol] !== undefined && (
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    Last price: ${config.lastPrices[rule.symbol].toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Live Log</h2>
          <div className="h-64 overflow-y-auto font-mono text-xs space-y-1">
            {log.length === 0 && (
              <div className="text-[var(--muted)]">No activity yet. Start the bot.</div>
            )}
            {log.map((entry, i) => (
              <div key={i} className={`${entry.includes("Error") || entry.includes("error") ? "text-[var(--danger)]" : entry.includes("Bought") || entry.includes("Sold") ? "text-[var(--success)]" : "text-[var(--muted)]"}`}>
                {entry}
              </div>
            ))}
            {running && <div className="text-[var(--primary)] animate-pulse">Checking rules...</div>}
          </div>
        </div>

        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Trade History</h2>
          {actions.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)] text-sm">No trades yet.</div>
          ) : (
            <div className="h-64 overflow-y-auto space-y-2">
              {[...actions].reverse().map((a) => (
                <div
                  key={a.id}
                  className={`rounded-lg p-2.5 border text-xs ${
                    a.action === "buy"
                      ? "bg-[var(--success)]/5 border-[var(--success)]/20"
                      : "bg-[var(--danger)]/5 border-[var(--danger)]/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      a.action === "buy"
                        ? "bg-[var(--success)]/10 text-[var(--success)]"
                        : "bg-[var(--danger)]/10 text-[var(--danger)]"
                    }`}>
                      {a.action.toUpperCase()}
                    </span>
                    <span className="font-semibold">{a.symbol}</span>
                    {a.shares > 0 && <span className="text-[var(--muted)]">{a.shares} shares @ ${a.price.toFixed(2)}</span>}
                    <span className="ml-auto text-[var(--muted)]">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-[var(--muted)]">{a.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
