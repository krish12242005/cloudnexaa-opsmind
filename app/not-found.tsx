export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#040404] text-white">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.025] text-xl font-semibold text-cyan-300">
            404
          </div>

          <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-white/30">
            OpsMind Navigation
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Page not found
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/45">
            The requested OpsMind workspace does not exist or is no longer
            available.
          </p>

          <a
            href="/"
            className="mt-7 inline-flex rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] px-5 py-2.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-300/[0.14]"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}