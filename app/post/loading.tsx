export default function PostLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse mb-3" />
        <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse" />
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="h-14 w-full bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
