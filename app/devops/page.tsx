"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  CloudCog,
  Code2,
  Container,
  GitBranch,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  TestTube2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Check = {
  id: string;
  name: string;
  category: string;
  detected: boolean;
  recommendation: string;
};

type DevOpsData = {
  success: boolean;
  score: number;
  status: string;
  summary: {
    totalChecks: number;
    passed: number;
    missing: number;
  };
  checks: Check[];
  project: {
    framework: string;
    packageManager: string;
  };
  scannedAt: string;
  error?: string;
};

function iconFor(id: string) {
  switch (id) {
    case "git":
      return GitBranch;
    case "github-actions":
      return CloudCog;
    case "docker":
      return Container;
    case "terraform":
      return Server;
    case "test":
      return TestTube2;
    case "build":
      return Code2;
    default:
      return ShieldCheck;
  }
}

function categoryStyle(category: string = "") {
  const value = (category ?? "").toLowerCase();

  if (value.includes("source") || value.includes("git")) {
    return "border-violet-400/15 bg-violet-400/[0.04] text-violet-300";
  }

  if (value.includes("container") || value.includes("docker")) {
    return "border-cyan-400/15 bg-cyan-400/[0.04] text-cyan-300";
  }

  if (value.includes("infrastructure") || value.includes("terraform")) {
    return "border-amber-400/15 bg-amber-400/[0.04] text-amber-300";
  }

  if (value.includes("test")) {
    return "border-pink-400/15 bg-pink-400/[0.04] text-pink-300";
  }

  return "border-white/10 bg-white/[0.025] text-[#9B9B9B]";
}

export default function DevOpsPage() {
  const [data, setData] = useState<DevOpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Check | null>(null);

  const scan = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/opsmind/devops", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "DevOps scan failed");
      }

      setData(result);
    } catch (err) {
      console.error("DevOps scan error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to scan DevOps configuration"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    scan();

    const interval = setInterval(() => {
      scan();
    }, 30000);

    return () => clearInterval(interval);
  }, [scan]);

  const checks = data?.checks ?? [];

  const passedChecks = useMemo(
    () => checks.filter((check) => check.detected),
    [checks]
  );

  const missingChecks = useMemo(
    () => checks.filter((check) => !check.detected),
    [checks]
  );

  const score = data?.score ?? 0;

  const scoreLabel =
    score >= 90
      ? "Excellent"
      : score >= 75
        ? "Healthy"
        : score >= 50
          ? "Needs Attention"
          : "Critical";

  return (
    <main className="min-h-screen bg-[#040404] px-4 py-6 text-[#F6E8DF] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[#B7D1C5]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#B7D1C5]/20 bg-[#B7D1C5]/10">
                <CloudCog size={16} />
              </div>

              <span className="text-xs font-semibold uppercase tracking-[0.25em]">
                DevOps / OpsMind
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              DevOps Readiness.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9B9B9B]">
              OpsMind scans the current project for core DevOps capabilities
              across source control, CI/CD, containers, infrastructure and
              testing.
            </p>

            {data?.project && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Meta
                  label="Framework"
                  value={data.project.framework || "Unknown"}
                />

                <Meta
                  label="Package Manager"
                  value={data.project.packageManager || "Unknown"}
                />
              </div>
            )}
          </div>

          <button
            onClick={() => scan(true)}
            disabled={loading || refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#B7D1C5]/20 bg-[#B7D1C5]/10 px-4 py-3 text-sm font-semibold text-[#B7D1C5] transition hover:bg-[#B7D1C5]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}

            {refreshing ? "Scanning..." : "Rescan Project"}
          </button>
        </header>

        {/* Error */}
        {error && (
          <section className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

              <div>
                <h2 className="font-semibold text-red-300">
                  DevOps Scan Error
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#9B9B9B]">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Readiness Overview */}
        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr_1fr_1fr]">

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#777C85]">
                  DevOps Readiness
                </p>

                <p className="mt-3 text-5xl font-bold tracking-tight">
                  {loading ? "—" : `${score}`}
                  {!loading && (
                    <span className="ml-1 text-lg text-[#777C85]">
                      /100
                    </span>
                  )}
                </p>

                {!loading && (
                  <p className="mt-2 text-sm text-[#B7D1C5]">
                    {scoreLabel}
                  </p>
                )}
              </div>

              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#B7D1C5]/15 bg-[#B7D1C5]/[0.06]">
                <ShieldCheck className="h-6 w-6 text-[#B7D1C5]" />
              </div>
            </div>
          </div>

          <SummaryCard
            label="Total Checks"
            value={loading ? "—" : data?.summary?.totalChecks ?? checks.length}
            icon={<CircleDot size={18} />}
          />

          <SummaryCard
            label="Passed"
            value={loading ? "—" : data?.summary?.passed ?? passedChecks.length}
            icon={<CheckCircle2 size={18} />}
            success
          />

          <SummaryCard
            label="Missing"
            value={loading ? "—" : data?.summary?.missing ?? missingChecks.length}
            icon={<XCircle size={18} />}
            warning
          />

        </section>

        {/* Scan Progress */}
        {!loading && data && (
          <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-[#777C85]">
                DevOps capability coverage
              </span>

              <span className="font-medium text-[#B7D1C5]">
                {data?.summary?.totalChecks > 0
                  ? Math.round(
                      (data?.summary?.passed /
                        data?.summary?.totalChecks) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[#B7D1C5] transition-all duration-700"
                style={{
                  width: `${
                    data?.summary?.totalChecks > 0
                      ? (data?.summary?.passed /
                          data?.summary?.totalChecks) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </section>
        )}

        {/* Checks */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">

          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">
                DevOps Capability Scan
              </h2>

              <p className="mt-1 text-xs leading-5 text-[#777C85] sm:text-sm">
                Project-level readiness checks detected by OpsMind.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
              LIVE SCAN
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-[#777C85]">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Scanning DevOps configuration...
            </div>
          ) : checks.length === 0 ? (
            <div className="p-12 text-center sm:p-16">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
                <AlertTriangle className="h-7 w-7 text-amber-400" />
              </div>

              <h3 className="mt-5 font-semibold">
                No DevOps checks detected
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#777C85]">
                OpsMind could not find any configured DevOps capabilities
                in the scanned project.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {checks.map((check) => {
                const Icon = iconFor(check.id);
                const categoryClass = categoryStyle(check.category);

                return (
                  <article
                    key={check.id}
                    className="p-5 transition hover:bg-white/[0.025] sm:p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      <div className="flex min-w-0 gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                            check.detected
                              ? "border-emerald-400/15 bg-emerald-400/[0.05]"
                              : "border-red-400/15 bg-red-400/[0.04]"
                          }`}
                        >
                          {check.detected ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <Icon
                              className={`h-5 w-5 ${
                                check.detected
                                  ? "text-emerald-400"
                                  : "text-[#777C85]"
                              }`}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">
                              {check.name}
                            </h3>

                            <span
                              className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${categoryClass}`}
                            >
                              {check.category}
                            </span>
                          </div>

                          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9B9B9B]">
                            {check.detected
                              ? "Capability detected in the current project."
                              : check.recommendation}
                          </p>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] ${
                                check.detected
                                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                  : "border-red-400/20 bg-red-400/10 text-red-300"
                              }`}
                            >
                              {check.detected ? (
                                <CheckCircle2 size={13} />
                              ) : (
                                <XCircle size={13} />
                              )}

                              {check.detected ? "Detected" : "Missing"}
                            </span>

                            <span className="rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-1 font-mono text-[11px] text-[#777C85]">
                              {check.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelected(check)}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-[#9B9B9B] transition hover:bg-white/[0.06] hover:text-[#F6E8DF]"
                      >
                        View Details
                      </button>

                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Status Panels */}
        {!loading && data && (
          <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">

            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.025] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Detected Capabilities
                  </h2>

                  <p className="mt-1 text-sm text-[#777C85]">
                    {passedChecks.length} DevOps capability
                    {passedChecks.length === 1 ? "" : "ies"} detected.
                  </p>

                  {passedChecks.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {passedChecks.map((check) => (
                        <span
                          key={check.id}
                          className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] px-2.5 py-1.5 text-xs text-emerald-300"
                        >
                          {check.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.025] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Recommended Improvements
                  </h2>

                  <p className="mt-1 text-sm text-[#777C85]">
                    {missingChecks.length} capability
                    {missingChecks.length === 1 ? "" : "ies"} currently
                    missing from the project.
                  </p>

                  {missingChecks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {missingChecks.slice(0, 3).map((check) => (
                        <button
                          key={check.id}
                          onClick={() => setSelected(check)}
                          className="block w-full rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-left text-xs text-[#9B9B9B] transition hover:bg-white/[0.05] hover:text-[#F6E8DF]"
                        >
                          <span className="font-medium text-[#F6E8DF]">
                            {check.name}
                          </span>
                          <span className="ml-2">
                            {check.recommendation}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </section>
        )}

        {/* Scan Info */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                <GitBranch className="h-4 w-4 text-[#B7D1C5]" />
              </div>

              <div>
                <p className="text-sm font-medium">
                  Local Project Analysis
                </p>

                <p className="mt-1 text-xs text-[#777C85]">
                  The scan evaluates the project configuration available
                  to OpsMind.
                </p>
              </div>
            </div>

            {data?.scannedAt && (
              <div className="text-xs text-[#585858]">
                Last scanned{" "}
                <span className="font-mono text-[#777C85]">
                  {new Date(data.scannedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </section>

        <footer className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-[#585858]">
          Cloudnexaa Technologies · OpsMind DevOps Intelligence
        </footer>
      </div>

      {/* Details Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#B7D1C5]">
                  Capability Details
                </p>

                <h2 className="mt-2 text-xl font-bold sm:text-2xl">
                  {selected.name}
                </h2>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-white/10 p-2 text-[#777C85] transition hover:bg-white/10 hover:text-[#F6E8DF]"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto p-5 sm:p-6">

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Detail
                  label="Check ID"
                  value={selected.id}
                />

                <Detail
                  label="Category"
                  value={selected.category}
                />

                <Detail
                  label="Status"
                  value={selected.detected ? "Detected" : "Missing"}
                />
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <p className="text-[10px] uppercase tracking-widest text-[#777C85]">
                  Recommendation
                </p>

                <p className="mt-2 text-sm leading-6 text-[#9B9B9B]">
                  {selected.detected
                    ? "This capability is already detected in the scanned project."
                    : selected.recommendation}
                </p>
              </div>

              <div
                className={`mt-4 rounded-xl border p-4 ${
                  selected.detected
                    ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                    : "border-amber-400/20 bg-amber-400/[0.04]"
                }`}
              >
                <div className="flex items-start gap-3">
                  {selected.detected ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  )}

                  <p className="text-xs leading-5 text-[#9B9B9B]">
                    {selected.detected
                      ? "OpsMind found evidence of this capability in the current project."
                      : "OpsMind found no matching project configuration for this capability."}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 p-5 sm:p-6">
              <button
                onClick={() => setSelected(null)}
                className="w-full rounded-xl bg-[#F6E8DF] px-4 py-3 text-sm font-bold text-black transition hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  success = false,
  warning = false,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  success?: boolean;
  warning?: boolean;
}) {
  const iconClass = success
    ? "text-emerald-400"
    : warning
      ? "text-amber-400"
      : "text-[#B7D1C5]";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#777C85]">
          {label}
        </span>

        <span className={iconClass}>
          {icon}
        </span>
      </div>

      <p className="mt-5 text-4xl font-bold">
        {value}
      </p>
    </div>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-[11px] text-[#777C85]">
      {label}:{" "}
      <span className="text-[#B7D1C5]">{value}</span>
    </span>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[10px] uppercase tracking-widest text-[#777C85]">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}




