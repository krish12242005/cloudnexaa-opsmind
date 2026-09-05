"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cloud,
  DollarSign,
  Gauge,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  Wrench,
} from "lucide-react";

type InsightData = {
  success?: boolean;
  region?: string;
  generatedAt?: string;

  environment?: {
    totalResources?: number;
    ec2?: number;
    s3?: number;
    rds?: number;
    eks?: number;
    vpc?: number;
  };

  health?: {
    score?: number;
    critical?: number;
    warnings?: number;
    healthy?: number;
    info?: number;
  };

  findings?: {
    total?: number;
    preview?: {
      id: string;
      title: string;
      service: string;
      severity: string;
      description: string;
    }[];
  };

  finance?: {
    currentCost?: number;
    currency?: string;
  };

  riskSignals?: {
    title: string;
    category: string;
    severity: string;
    detail: string;
    route: string;
  }[];

  recommendations?: {
    title: string;
    reason: string;
    priority: string;
    route: string;
  }[];
};

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function severityClass(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return "border-red-400/20 bg-red-400/[0.05] text-red-300";

    case "warning":
      return "border-amber-400/20 bg-amber-400/[0.05] text-amber-300";

    case "optimization":
      return "border-[#FA4A0D]/20 bg-[#FA4A0D]/[0.05] text-[#FA4A0D]";

    default:
      return "border-[#B7D1C5]/15 bg-[#B7D1C5]/[0.035] text-[#B7D1C5]";
  }
}

export default function InsightsPage() {
  const router = useRouter();

  const [data, setData] =
    useState<InsightData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  async function loadInsights(
    manual = false
  ) {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        "/api/opsmind/insights",
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.error ||
            "Unable to load OpsMind insights."
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load OpsMind insights."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadInsights();

    const timer =
      window.setInterval(
        () => loadInsights(),
        30000
      );

    return () =>
      window.clearInterval(timer);
  }, []);

  const health =
    numberValue(
      data?.health?.score
    );

  const healthLabel = useMemo(() => {
    if (health >= 90) return "Healthy";
    if (health >= 70)
      return "Review recommended";
    return "Attention required";
  }, [health]);

  const resources =
    data?.environment
      ?.totalResources ?? 0;

  const topFindings =
    data?.findings?.preview ?? [];

  const signals =
    data?.riskSignals ?? [];

  const recommendations =
    data?.recommendations ?? [];

  return (
    <main className="min-h-screen bg-[#040404] text-[#F6E8DF]">

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">

        <header className="mb-7 flex flex-col gap-5 border-b border-white/[0.07] pb-7 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#777]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FA4A0D]" />
              OpsMind Intelligence
              <span className="text-[#444]">/</span>
              {data?.region || "ap-south-1"}
            </div>

            <h1 className="text-[38px] font-semibold tracking-[-0.055em] sm:text-[46px]">
              Cloud Insights
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-[#777]">
              Correlate infrastructure health,
              findings, security signals and cost
              opportunities in one operational view.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              loadInsights(true)
            }
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.025] px-4 py-2.5 text-xs text-[#CFC5BF] transition hover:bg-white/[0.05] disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
            {refreshing
              ? "Refreshing"
              : "Refresh"}
          </button>

        </header>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-4">
            <TriangleAlert
              size={18}
              className="text-red-400"
            />
            <p className="text-xs text-red-300">
              {error}
            </p>
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-12">

          <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#090909] p-6 lg:col-span-4">

            <div className="absolute right-[-50px] top-[-50px] h-48 w-48 rounded-full bg-[#B7D1C5]/[0.04] blur-3xl" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
                  Overall Health
                </p>

                <h2 className="mt-2 text-lg font-medium">
                  {loading
                    ? "Analyzing..."
                    : healthLabel}
                </h2>
              </div>

              <Gauge
                size={19}
                className="text-[#B7D1C5]"
              />
            </div>

            <div className="relative mt-8 flex justify-center">

              <div
                className="flex h-48 w-48 items-center justify-center rounded-full"
                style={{
                  background:
                    `conic-gradient(#B7D1C5 ${
                      health * 3.6
                    }deg, #262626 ${
                      health * 3.6
                    }deg)`,
                }}
              >

                <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-[#090909]">

                  <span className="text-5xl font-semibold">
                    {loading
                      ? "—"
                      : health}
                  </span>

                  <span className="mt-1 text-[9px] uppercase tracking-[0.2em] text-[#555]">
                    / 100
                  </span>

                </div>

              </div>

            </div>

            <div className="relative mt-7 grid grid-cols-4 gap-2 border-t border-white/[0.07] pt-5">

              <Stat
                label="Critical"
                value={
                  data?.health?.critical ??
                  0
                }
                tone="critical"
              />

              <Stat
                label="Warnings"
                value={
                  data?.health?.warnings ??
                  0
                }
                tone="warning"
              />

              <Stat
                label="Healthy"
                value={
                  data?.health?.healthy ??
                  0
                }
                tone="healthy"
              />

              <Stat
                label="Info"
                value={
                  data?.health?.info ??
                  0
                }
                tone="info"
              />

            </div>

          </div>

          <div className="rounded-[24px] border border-white/[0.08] bg-[#090909] p-6 lg:col-span-4">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
                  Environment
                </p>

                <h2 className="mt-2 text-lg font-medium">
                  Cloud Footprint
                </h2>
              </div>

              <Cloud
                size={19}
                className="text-[#B7D1C5]"
              />

            </div>

            <div className="mt-6 space-y-3">

              <ResourceRow
                label="EC2"
                value={
                  data?.environment?.ec2 ??
                  0
                }
              />

              <ResourceRow
                label="S3"
                value={
                  data?.environment?.s3 ??
                  0
                }
              />

              <ResourceRow
                label="RDS"
                value={
                  data?.environment?.rds ??
                  0
                }
              />

              <ResourceRow
                label="EKS"
                value={
                  data?.environment?.eks ??
                  0
                }
              />

              <ResourceRow
                label="VPC"
                value={
                  data?.environment?.vpc ??
                  0
                }
              />

            </div>

            <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/20 p-4">

              <p className="text-[9px] uppercase tracking-[0.18em] text-[#555]">
                Total discovered
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {loading
                  ? "—"
                  : resources}
              </p>

            </div>

          </div>

          <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#090909] p-6 lg:col-span-4">

            <div className="absolute bottom-0 left-0 right-0 h-24 bg-[#FA4A0D]/[0.025] blur-3xl" />

            <div className="relative flex items-start justify-between">

              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
                  FinOps
                </p>

                <h2 className="mt-2 text-lg font-medium">
                  Spend Signal
                </h2>
              </div>

              <DollarSign
                size={19}
                className="text-[#FA4A0D]"
              />

            </div>

            <p className="relative mt-9 text-4xl font-semibold tracking-[-0.05em]">
              {loading
                ? "—"
                : `$${numberValue(
                    data?.finance?.currentCost
                  ).toFixed(2)}`}
            </p>

            <p className="mt-2 text-xs text-[#666]">
              Current billing data
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/costs")
              }
              className="mt-8 flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs text-[#999] transition hover:bg-white/[0.05]"
            >
              Open Cost Intelligence
              <ArrowRight size={14} />
            </button>

          </div>

        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">

          <div className="rounded-[24px] border border-white/[0.08] bg-[#090909] p-6">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
                  Risk Correlation
                </p>

                <h2 className="mt-2 text-lg font-medium">
                  Active Signals
                </h2>
              </div>

              <ShieldAlert
                size={19}
                className="text-amber-300"
              />

            </div>

            <div className="mt-5 space-y-3">

              {signals.length === 0 ? (

                <div className="rounded-xl border border-[#B7D1C5]/10 bg-[#B7D1C5]/[0.025] p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2
                      size={18}
                      className="text-[#B7D1C5]"
                    />
                    <div>
                      <p className="text-sm text-[#D8CEC8]">
                        No active risk signals
                      </p>
                      <p className="mt-1 text-[10px] text-[#555]">
                        OpsMind did not generate an immediate signal.
                      </p>
                    </div>
                  </div>
                </div>

              ) : (

                signals.map(
                  (signal, index) => (
                    <button
                      type="button"
                      key={`${signal.title}-${index}`}
                      onClick={() =>
                        router.push(
                          signal.route
                        )
                      }
                      className="w-full rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 text-left transition hover:border-white/[0.14] hover:bg-white/[0.025]"
                    >

                      <div className="flex items-start gap-3">

                        <div
                          className={`rounded-lg border px-2 py-1 text-[9px] uppercase tracking-wide ${severityClass(
                            signal.severity
                          )}`}
                        >
                          {signal.severity}
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="text-xs font-medium text-[#D8CEC8]">
                            {signal.title}
                          </p>

                          <p className="mt-1 text-[10px] leading-5 text-[#555]">
                            {signal.detail}
                          </p>

                          <p className="mt-2 text-[9px] uppercase tracking-wider text-[#777]">
                            {signal.category}
                          </p>

                        </div>

                        <ArrowRight
                          size={14}
                          className="mt-1 shrink-0 text-[#444]"
                        />

                      </div>

                    </button>
                  )
                )

              )}

            </div>

          </div>

          <div className="rounded-[24px] border border-white/[0.08] bg-[#090909] p-6">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
                  OpsMind
                </p>

                <h2 className="mt-2 text-lg font-medium">
                  Recommended Next Actions
                </h2>
              </div>

              <Wrench
                size={19}
                className="text-[#B7D1C5]"
              />

            </div>

            <div className="mt-5 space-y-3">

              {recommendations.map(
                (item, index) => (
                  <button
                    type="button"
                    key={`${item.title}-${index}`}
                    onClick={() =>
                      router.push(
                        item.route
                      )
                    }
                    className="w-full rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 text-left transition hover:border-[#B7D1C5]/20 hover:bg-[#B7D1C5]/[0.025]"
                  >

                    <div className="flex items-start gap-3">

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#B7D1C5]/[0.06]">
                        <Sparkles
                          size={14}
                          className="text-[#B7D1C5]"
                        />
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2">

                          <p className="text-xs font-medium text-[#D8CEC8]">
                            {item.title}
                          </p>

                          <span className="text-[8px] uppercase tracking-wider text-[#666]">
                            {item.priority}
                          </span>

                        </div>

                        <p className="mt-1 text-[10px] leading-5 text-[#555]">
                          {item.reason}
                        </p>

                      </div>

                      <ArrowRight
                        size={14}
                        className="mt-1 shrink-0 text-[#444]"
                      />

                    </div>

                  </button>
                )
              )}

            </div>

          </div>

        </section>

        <section className="mt-5 rounded-[24px] border border-white/[0.08] bg-[#090909] p-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
                Intelligence Feed
              </p>

              <h2 className="mt-2 text-lg font-medium">
                Recent Findings
              </h2>

            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/cloud-doctor")
              }
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-[10px] text-[#888] hover:bg-white/[0.04]"
            >
              View Cloud Doctor
              <ArrowRight size={13} />
            </button>

          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">

            {topFindings.length === 0 ? (

              <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-8 text-center">
                <Activity
                  size={22}
                  className="mx-auto text-[#555]"
                />
                <p className="mt-3 text-xs text-[#666]">
                  No finding preview available.
                </p>
              </div>

            ) : (

              topFindings.map(
                (finding) => (
                  <button
                    type="button"
                    key={finding.id}
                    onClick={() =>
                      router.push(
                        "/cloud-doctor"
                      )
                    }
                    className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 text-left transition hover:border-white/[0.14]"
                  >

                    <div className="flex items-center justify-between gap-2">

                      <span
                        className={`rounded-md border px-2 py-0.5 text-[8px] uppercase tracking-wide ${severityClass(
                          finding.severity
                        )}`}
                      >
                        {finding.severity}
                      </span>

                      <span className="text-[9px] text-[#555]">
                        {finding.service}
                      </span>

                    </div>

                    <p className="mt-3 text-xs font-medium text-[#D6CBC5]">
                      {finding.title}
                    </p>

                    <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-[#555]">
                      {finding.description}
                    </p>

                  </button>
                )
              )

            )}

          </div>

        </section>

        <footer className="mt-8 border-t border-white/[0.06] pt-5 text-[10px] text-[#444]">
          Cloudnexaa Technologies · OpsMind Intelligence Center
        </footer>

      </div>

    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "critical"
    | "warning"
    | "healthy"
    | "info";
}) {
  const classes = {
    critical: "text-red-300",
    warning: "text-amber-300",
    healthy: "text-[#B7D1C5]",
    info: "text-[#888]",
  };

  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-[#555]">
        {label}
      </p>
      <p
        className={`mt-1 text-sm ${classes[tone]}`}
      >
        {value}
      </p>
    </div>
  );
}

function ResourceRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 last:border-0">

      <span className="text-xs text-[#777]">
        {label}
      </span>

      <span className="text-sm font-medium text-[#D8CEC8]">
        {value}
      </span>

    </div>
  );
}