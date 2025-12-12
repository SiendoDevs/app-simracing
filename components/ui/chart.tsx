"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { Tooltip as RechartsTooltip } from "recharts"

export type ChartConfig = Record<string, { label?: string; color?: string }>

export function ChartContainer({
  config,
  className,
  children,
}: {
  config?: ChartConfig
  className?: string
  children: React.ReactNode
}) {
  const styleVars: Record<string, string> = {}
  if (config) {
    for (const [key, val] of Object.entries(config)) {
      const token = `--color-${key}`
      styleVars[token] = val.color ?? "var(--chart-1)"
    }
  }
  return (
    <div className={cn("w-full", className)} style={styleVars as React.CSSProperties}>
      {children}
    </div>
  )
}

export function ChartTooltip(props: React.ComponentProps<typeof RechartsTooltip>) {
  return <RechartsTooltip {...props} />
}

export function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]
  const value = p && typeof p.value === "number" ? p.value : undefined
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
      <div className="font-semibold">{label}</div>
      <div className="text-muted-foreground">{value != null ? `${value} pts` : "-"}</div>
    </div>
  )
}
