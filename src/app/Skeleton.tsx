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
          <div className={tab === "overview" ? "grid gap-3 xl:grid-cols-[1.7fr_1fr]" : "grid gap-4"}>
            <Skeleton className="h-80" />
            {tab === "overview" ? <Skeleton className="h-80" /> : <Skeleton className="h-72" />}
          </div>
          <Skeleton className={tab === "overview" ? "h-56" : "h-[420px]"} />
        </>
      )}
    </div>
  );
}
