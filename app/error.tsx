"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("OpsMind application error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#040404] text-white">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-2xl border border-red-400/15 bg-red-400/[0.025] p-7 shadow-2xl">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[0.06] text-red-300">
            !
          </div>

          <p className="text-[10px] uppercase tracking-[0.22em] text-red-300/70">
            OpsMind Runtime Error
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/50">
            OpsMind could not complete this operation. Your AWS resources
            were not changed from this screen.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-2.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-300/[0.14]"
            >
              Try again
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}