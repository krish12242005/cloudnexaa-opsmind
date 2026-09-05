export default function Loading() {
  return (
    <main className="min-h-screen bg-[#040404] text-white">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  OpsMind
                </p>

                <p className="mt-1 text-xs text-white/45">
                  Preparing cloud intelligence...
                </p>
              </div>
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-300/40" />
            </div>

            <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/25">
              Cloudnexaa Technologies
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}