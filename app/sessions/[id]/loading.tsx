import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="p-4 md:p-6 space-y-3 md:space-y-4">
      <Skeleton className="h-4 w-20" />
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="rounded-lg border divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-3 md:p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Skeleton className="h-4 w-8 shrink-0" />
              <Skeleton className="h-4 w-48 max-w-[70%] sm:max-w-none sm:w-40" />
            </div>
            <div className="flex items-center gap-2 w-full justify-end sm:w-auto sm:justify-start shrink-0">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <div className="rounded-lg border divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3 md:p-4">
              <Skeleton className="h-4 w-64" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
