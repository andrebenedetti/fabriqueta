export function SkeletonCard() {
  return <div className="skeleton-card" />;
}

export function SkeletonRow() {
  return <div className="skeleton-row" />;
}

export function SkeletonKanban() {
  return (
    <div className="board-grid">
      <div className="board-column"><SkeletonCard /><SkeletonCard /></div>
      <div className="board-column"><SkeletonCard /></div>
      <div className="board-column"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
    </div>
  );
}
