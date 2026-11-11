export default function Loading() {
  return (
    <main aria-busy="true">
      <p className="empty">Opening the collection…</p>
      <div className="grid">
        {[1, 2, 3, 4].map((i) => (
          <div className="product-image animate-pulse" key={i} />
        ))}
      </div>
    </main>
  );
}
