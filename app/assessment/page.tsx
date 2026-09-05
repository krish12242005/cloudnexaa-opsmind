"use client";

import { FormEvent, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Gauge,
  GitBranch,
  Loader2,
  ShieldAlert,
} from "lucide-react";

type Assessment = {
  success: boolean;
  score?: number;
  rating?: string;
  repository?: {
    name: string;
    description?: string | null;
    stars: number;
    forks: number;
    openIssues: number;
    defaultBranch: string;
    license?: string | null;
    languages: string[];
  };
  checks?: {
    id: string;
    area: string;
    status: "pass" | "warning" | "fail";
    score: number;
    title: string;
    detail: string;
    recommendation: string;
  }[];
  error?: string;
  disclaimer?: string;
};

export default function AssessmentPage() {
  const [repository, setRepository] = useState("");
  const [result, setResult] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);

  async function assess(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/opsmind/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository }),
      });

      const json = await response.json();
      setResult(json);
    } catch {
      setResult({ success: false, error: "Unable to reach assessment service." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-[#f6e8df] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 border-b border-white/10 pb-8">
          <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-[#9b9b9b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#fa4a0d]" />
            OpsMind / Assessment
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Project Assessment
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#777c85]">
            Review a public GitHub repository across engineering quality, DevOps,
            governance and project-health signals.
          </p>
        </div>

        <form
          onSubmit={assess}
          className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"
        >
          <label className="text-[10px] uppercase tracking-[0.2em] text-[#585858]">
            Public GitHub repository
          </label>

          <div className="mt-3 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <GitBranch
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#585858]"
              />
              <input
                value={repository}
                onChange={(event) => setRepository(event.target.value)}
                placeholder="https://github.com/owner/repository"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-[#f6e8df] outline-none placeholder:text-[#585858] focus:border-white/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !repository.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#fa4a0d] px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Gauge size={16} />}
              {loading ? "Assessing..." : "Assess Project"}
            </button>
          </div>
        </form>

        {result?.error && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5 text-sm text-red-300">
            {result.error}
          </div>
        )}

        {result?.success && result.repository && (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#585858]">Assessment score</p>
                <p className="mt-2 text-4xl font-semibold">{result.score}/100</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#585858]">Rating</p>
                <p className="mt-2 text-xl font-medium">{result.rating}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#585858]">Stars</p>
                <p className="mt-2 text-xl font-medium">{result.repository.stars}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#585858]">Open issues</p>
                <p className="mt-2 text-xl font-medium">{result.repository.openIssues}</p>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02]">
              <div className="border-b border-white/10 p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#585858]">Repository</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-medium">{result.repository.name}</h2>
                  <a
                    href={`https://github.com/${result.repository.name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#b7d1c5] hover:underline"
                  >
                    Open <ArrowUpRight size={12} />
                  </a>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#777c85]">
                  {result.repository.description || "No repository description."}
                </p>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {(result.checks ?? []).map((check) => (
                  <div key={check.id} className="p-5">
                    <div className="flex items-start gap-3">
                      {check.status === "pass" ? (
                        <CheckCircle2 className="mt-0.5 text-[#b7d1c5]" size={18} />
                      ) : check.status === "warning" ? (
                        <CircleAlert className="mt-0.5 text-orange-300" size={18} />
                      ) : (
                        <ShieldAlert className="mt-0.5 text-red-300" size={18} />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#585858]">
                              {check.area}
                            </p>
                            <h3 className="mt-1 text-sm font-medium">{check.title}</h3>
                          </div>
                          <span className="text-[10px] text-[#585858]">+{check.score}</span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-[#777c85]">{check.detail}</p>

                        <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                          <p className="text-[11px] leading-5 text-[#9b9b9b]">
                            {check.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 p-5 text-xs leading-5 text-[#585858]">
                {result.disclaimer}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}