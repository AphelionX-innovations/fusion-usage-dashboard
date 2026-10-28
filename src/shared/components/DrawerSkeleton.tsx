import { Skeleton } from "@/components/ui/skeleton";

export function DrawerSkeleton() {
  return (
    <div className="grid gap-4 px-4" role="status" aria-label="Chargement de la fiche">
      <Skeleton className="h-24" />
      <Skeleton className="h-56" />
      <Skeleton className="h-40" />
    </div>
  );
}
