export default function ProfileLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Profile header skeleton */}
      <div className="rounded-3xl p-6 md:p-8 bg-white border border-slate-100 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-56 bg-slate-100 rounded-lg animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse" />
              <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
