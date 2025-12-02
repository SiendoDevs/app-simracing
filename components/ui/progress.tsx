import * as React from "react"
import { cn } from "@/lib/utils"

function Progress({ className, value = 0, ...props }: React.ComponentProps<"div"> & { value?: number }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div data-slot="progress" className={cn("bg-muted h-2 w-full rounded-full overflow-hidden", className)} {...props}>
      <div className="bg-[#d8552b] h-full transition-[width] duration-500 ease-out" style={{ width: `${v}%` }} />
    </div>
  )
}

export { Progress }
