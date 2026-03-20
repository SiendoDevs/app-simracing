import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-7 w-28" />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
          <Skeleton className="h-8 w-full sm:w-44" />
          <Skeleton className="h-8 w-full sm:w-48" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-32" />
        </div>
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g} className="space-y-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-44" />
            </div>
            <ul className="space-y-2 sm:space-y-0 sm:rounded-lg sm:border sm:divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="relative rounded-lg border bg-background/40 p-3 shadow-xs sm:rounded-none sm:border-0 sm:bg-transparent sm:p-4 sm:shadow-none"
                >
                  <Skeleton className="absolute right-3 top-3 h-9 w-9 sm:hidden" />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 pr-12 sm:pr-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-28 rounded-full" />
                        <Skeleton className="h-5 w-12 rounded-md" />
                      </div>
                      <div className="mt-2 flex flex-col sm:mt-1 sm:flex-row sm:items-center sm:gap-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-4 w-56 max-w-[85%] sm:w-64" />
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 w-full justify-end sm:w-auto sm:justify-start shrink-0">
                      <Skeleton className="hidden h-9 w-9 sm:block" />
                      <Skeleton className="h-9 w-9" />
                      <Skeleton className="h-9 w-9" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
