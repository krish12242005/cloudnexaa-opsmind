"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  History,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

type Severity = "critical" | "warning" | "healthy" | "info";

type Finding = {
  id: string;
  severity: Severity;
  service: string;
  title: string;
  description: string;
  recommendation: string;
  resource?: string;
};

type ScanResult = {
  success: boolean;
  scanId?: string;
  region?: string;
  durationMs?: number;
  partial?: boolean;
  permissionIssues?: string[];
  summary?: {
    totalResources: number;
    totalFindings: number;
    critical: number;
    warnings: number;
    healthy: number;
    info: number;
    score: number;
  };
  findings?: Finding[];
};

const severityClass: Record<Severity, string> = {
  critical: "border-red-500/20 bg-red-500/[0.06] text-red-300",
  warning: "border-orange-500/20 bg-orange-500/[0.06] text-orange-300",
  healthy: "border-[#b7d1c5]/20 bg-[#b7d1c5]/[0.06] text-[#b7d1c5]",
  info: "border-white/10 bg-white/[0.03] text-[#9b9b9b]",
};

export default function ScanPage() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  async function loadHistory() {
    try {
      setLoadingHistory(true);
      const response = await fetch("/api/opsmind/scan/history", {
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Unable to load scan history");
      setHistory(json.history ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load scan history");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function runScan() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/opsmind/scan", {
        method: "POST",
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Scan failed");
      setScan(json);
      setHistory(json.history ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const findings = useMemo(() => scan?.findings ?? [], [scan]);

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-[#f6e8df] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-[#9b9b9b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#fa4a0d]" />
              OpsMind / Scan Center
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Full Environment Scan
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#777c85]">
              One read-only scan for infrastructure, IAM, security groups,
              S3 posture, exposure signals and operational findings.
            </p>
          </div>

          <button
            type="button"
            onClick={runScan}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa4a0d] px-5 py-3.5 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Radar size={16} className={loading ? "animate-pulse" : ""} />
            {loading ? "Running full scan..." : "Run Full Scan"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {scan?.summary && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ["Score", `${scan.summary.score}/100`, Sparkles],
              ["Resources", scan.summary.totalResources, Database],
              ["Critical", scan.summary.critical, TriangleAlert],
              ["Warnings", scan.summary.warnings, AlertTriangle],
              ["Healthy", scan.summary.healthy, CheckCircle2],
              ["Duration", `${scan.durationMs ?? 0}ms`, Clock3],
            ].map(([label, value, Icon]: any) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035]">
                  <Icon size={17} className="text-[#b7d1c5]" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#585858]">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{String(value)}</p>
              </div>
            ))}
          </section>
        )}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#585858]">
                  Findings
                </p>
                <h2 className="mt-1 text-base font-medium">
                  {findings.length ? `${findings.length} scan findings` : "Run a scan to populate findings"}
                </h2>
              </div>
              {scan?.scanId && (
                <span className="text-[10px] tracking-widest text-[#585858]">
                  {scan.scanId}
                </span>
              )}
            </div>

            <div className="divide-y divide-white/[0.06]">
              {findings.map((finding) => (
                <div key={`${finding.id}-${finding.resource ?? ""}`} className="p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-wider ${severityClass[finding.severity]}`}
                        >
                          {finding.severity}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-[#585858]">
                          {finding.service}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium">{finding.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#777c85]">
                        {finding.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-[#585858]">{finding.id}</span>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#585858]">
                      Recommendation
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#9b9b9b]">
                      {finding.recommendation}
                    </p>
                  </div>
                </div>
              ))}

              {!findings.length && (
                <div className="p-10 text-center">
                  <Radar className="mx-auto text-[#585858]" size={22} />
                  <p className="mt-3 text-sm text-[#777c85]">
                    No scan data yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#585858]">
                  Scan History
                </p>
                <h2 className="mt-1 text-base font-medium">Recent runs</h2>
              </div>
              <button
                type="button"
                onClick={loadHistory}
                disabled={loadingHistory}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]"
                title="Refresh scan history"
              >
                <RefreshCw size={14} className={loadingHistory ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {history.map((item) => (
                <div key={item.scanId} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-[#9b9b9b]">{item.scanId}</span>
                    <span className="text-[10px] text-[#585858]">
                      {item.summary?.score ?? 0}/100
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#777c85]">{item.region}</p>
                  <p className="mt-1 text-[10px] text-[#585858]">
                    {item.summary?.totalFindings ?? 0} findings Â· {item.durationMs ?? 0}ms
                  </p>
                </div>
              ))}

              {!history.length && (
                <div className="p-8 text-center text-xs text-[#585858]">
                  No scan history yet.
                </div>
              )}
            </div>

            {scan?.partial && (
              <div className="m-4 rounded-xl border border-orange-500/20 bg-orange-500/[0.05] p-4">
                <div className="flex items-center gap-2 text-xs text-orange-300">
                  <ShieldCheck size={14} />
                  Partial scan
                </div>
                <p className="mt-2 text-[11px] leading-5 text-orange-300/70">
                  Some AWS APIs were unavailable or permission-limited. The scan
                  keeps the available results instead of failing the whole run.
                </p>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}