"use client"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export default function PointsProgressChart({ data }: { data: Array<{ label: string; acc: number; pts: number }> }) {
  const config = {
    acc: { label: "Acumulado", color: "#d8552b" },
    pts: { label: "Por sesión", color: "#f29f85" },
  }
  return (
    <ChartContainer config={config} className="h-[240px] md:h-full w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis allowDecimals={false} />
          <Legend />
          <Bar dataKey="acc" name="Acumulado" fill="var(--color-acc)" radius={4} />
          <Bar dataKey="pts" name="Por sesión" fill="var(--color-pts)" radius={4} />
          <ChartTooltip cursor={{ fill: 'rgba(156, 163, 175, 0.12)' }} content={<ChartTooltipContent />} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
