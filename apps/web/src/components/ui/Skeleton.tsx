import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} data-slot="skeleton" {...props} />;
}

function SkeletonCard() {
  return <Skeleton className="skeleton-card" />;
}

function SkeletonRow() {
  return <Skeleton className="skeleton-row" />;
}

function SkeletonKanban() {
  return (
    <div className="board-grid">
      <div className="board-column"><SkeletonCard /><SkeletonCard /></div>
      <div className="board-column"><SkeletonCard /></div>
      <div className="board-column"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonKanban, SkeletonRow };
