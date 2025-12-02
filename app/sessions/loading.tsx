import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g} className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <ul className="rounded-lg border divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="p-3 md:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-5 w-5" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

