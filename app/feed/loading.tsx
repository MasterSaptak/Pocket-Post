export default function FeedLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mb-2" />
      <div className="h-4 w-64 bg-slate-100 rounded-lg animate-pulse mb-8" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}
