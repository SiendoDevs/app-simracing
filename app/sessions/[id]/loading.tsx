import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="p-4 md:p-6 space-y-3 md:space-y-4">
      <Skeleton className="h-4 w-20" />
      <div className="flex items-center gap-2">
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
          <div key={i} className="p-3 md:p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-2">
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

