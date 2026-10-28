import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardTab } from "./useDashboardParams";

function KpiSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} className="h-32" />
      ))}
    </div>
  );
}

export function TabSkeleton({ tab }: { tab: DashboardTab }) {
  return (
    <div className="grid gap-4" role="status" aria-label="Chargement des données">
      {tab === "users" ? (
        <Skeleton className="h-[520px]" />
      ) : (
        <>
          <KpiSkeleton />
          {tab === "overview" ? (
            <>
              <Skeleton className="h-80" />
              <Skeleton className="h-8 w-96" />
              <div className="grid gap-3 lg:grid-cols-2">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
              </div>
              <Skeleton className="h-56" />
            </>
          ) : (
            <>
              <div className="grid gap-4">
                <Skeleton className="h-80" />
                <Skeleton className="h-72" />
              </div>
              <Skeleton className="h-[420px]" />
            </>
          )}
        </>
      )}
    </div>
  );
}
