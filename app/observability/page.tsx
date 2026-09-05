"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Gauge,
  Loader2,
  RefreshCw,
  Server,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Observation = {
  service: string;
  status: string;
  total: number;
  running?: number;
  stopped?: number;
  message: string;
};

type ObservabilityResponse = {
  success: boolean;
  region?: string;
  summary?: {
    score: number;
    status: string;
    services: number;
    healthy: number;
    warnings: number;
  };
  observations?: Observation[];
  collectedAt?: string;
  error?: string;
};

function statusConfig(status: string) {
  switch (status.toLowerCase()) {
    case "healthy":
      return {
        label: "Healthy",
        color: "text-emerald-300",
        border: "border-emerald-400/20",
        bg: "bg-emerald-400/[0.045]",
        dot: "bg-emerald-400",
        icon: CheckCircle2,
      };

    case "warning":
      return {
        label: "Warning",
        color: "text-amber-300",
        border: "border-amber-400/20",
        bg: "bg-amber-400/[0.045]",
        dot: "bg-amber-400",
        icon: AlertTriangle,
      };

    default:
      return {
        label: status || "Unknown",
        color: "text-[#B7D1C5]",
        border: "border-white/10",
        bg: "bg-white/[0.025]",
        dot: "bg-[#B7D1C5]",
        icon: Activity,
      };
  }
}

export default function ObservabilityPage() {
  const [data, setData] = useState<ObservabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadObservability = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/opsmind/observability", {
        cache: "no-store",
      });

      const result: ObservabilityResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to load observability data"
        );
      }

      setData(result);
    } catch (err) {
      console.error("Observability error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to observability engine"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadObservability();

    const interval = setInterval(() => {
      loadObservability();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadObservability]);

  const summary = data?.summary ?? {
    score: 0,
    status: "Loading",
    services: 0,
    healthy: 0,
    warnings: 0,
  };

  const observations = data?.observations ?? [];

  const ec2 = observations.find(
    (item) => item.service.toUpperCase() === "EC2"
  );

  const rds = observations.find(
    (item) => item.service.toUpperCase() === "RDS"
  );

  const eks = observations.find(
    (item) => item.service.toUpperCase() === "EKS"
  );

  const healthWidth = `${Math.max(
    0,
    Math.min(100, summary.score)
  )}%`;

  const totalResources = useMemo(() => {
    return observations.reduce(
      (total, service) => total + service.total,
      0
    );
  }, [observations]);

  const scoreTone =
    summary.score >= 80
      ? "text-emerald-300"
      : summary.score >= 50
        ? "text-amber-300"
        : "text-red-300";

  return (
    <main className="min-h-screen bg-[#040404] px-4 py-6 text-[#F6E8DF] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[#B7D1C5]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#B7D1C5]/20 bg-[#B7D1C5]/10">
                <Activity size={16} />
              </div>

              <span className="text-xs font-semibold uppercase tracking-[0.25em]">
                Observability / Runtime
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Observe Everything.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9B9B9B]">
              A live operational view of connected AWS resource state,
              service health and infrastructure signals collected by
              OpsMind.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.035] px-3 py-2 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                LIVE MONITORING
              </span>

              {data?.region && (
                <span className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-[#777C85]">
                  Region:{" "}
                  <span className="text-[#9B9B9B]">
                    {data.region}
                  </span>
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => loadObservability(true)}
            disabled={loading || refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#B7D1C5]/20 bg-[#B7D1C5]/10 px-4 py-3 text-sm font-semibold text-[#B7D1C5] transition hover:bg-[#B7D1C5]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}

            {refreshing ? "Refreshing..." : "Refresh Observability"}
          </button>
        </header>

        {/* Error */}
        {error && (
          <section className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

              <div>
                <h2 className="font-semibold text-red-300">
                  Observability Engine Error
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#9B9B9B]">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Top Metrics */}
        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <MetricCard
            label="Health Score"
            value={loading ? "—" : `${summary.score}%`}
            description={
              loading
                ? "Collecting runtime state"
                : summary.status
            }
            icon={<Gauge size={18} />}
            valueClass={scoreTone}
            accent="primary"
          />

          <MetricCard
            label="Healthy Services"
            value={loading ? "—" : `${summary.healthy}`}
            description={`of ${summary.services} monitored services`}
            icon={<CheckCircle2 size={18} />}
            valueClass="text-emerald-300"
            accent="green"
          />

          <MetricCard
            label="Warnings"
            value={loading ? "—" : `${summary.warnings}`}
            description="Requires operational review"
            icon={<AlertTriangle size={18} />}
            valueClass="text-amber-300"
            accent="amber"
          />

          <MetricCard
            label="Resources Observed"
            value={loading ? "—" : `${totalResources}`}
            description="Across connected services"
            icon={<Server size={18} />}
            valueClass="text-[#F6E8DF]"
            accent="neutral"
          />

        </section>

        {/* Health Overview */}
        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6 lg:col-span-2">

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#B7D1C5]" />

                  <h2 className="text-lg font-semibold">
                    Infrastructure Health
                  </h2>
                </div>

                <p className="mt-1 text-xs text-[#777C85] sm:text-sm">
                  Current OpsMind runtime health evaluation
                </p>
              </div>

              <div className={`text-3xl font-bold ${scoreTone}`}>
                {loading ? "—" : `${summary.score}%`}
              </div>
            </div>

            <div className="mt-8">
              <div className="h-3 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#B7D1C5] via-[#D9C8B9] to-[#FA4A0D] transition-all duration-700"
                  style={{
                    width: loading ? "0%" : healthWidth,
                  }}
                />
              </div>

              <div className="mt-3 flex justify-between text-[10px] text-[#585858]">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">

              <MiniStat
                label="Services"
                value={loading ? "—" : summary.services}
              />

              <MiniStat
                label="Healthy"
                value={loading ? "—" : summary.healthy}
              />

              <MiniStat
                label="Warnings"
                value={loading ? "—" : summary.warnings}
              />

              <MiniStat
                label="Resources"
                value={loading ? "—" : totalResources}
              />

            </div>
          </div>

          {/* Runtime Snapshot */}
          <div className="rounded-2xl border border-[#B7D1C5]/15 bg-[#B7D1C5]/[0.025] p-5 sm:p-6">

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#B7D1C5]/20 bg-[#B7D1C5]/10">
                <Activity className="h-5 w-5 text-[#B7D1C5]" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Runtime Snapshot
                </h2>

                <p className="text-xs text-[#585858]">
                  Connected AWS state
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-1">

              <RuntimeRow
                label="EC2"
                value={
                  loading
                    ? "—"
                    : `${ec2?.running ?? 0} running`
                }
              />

              <RuntimeRow
                label="RDS"
                value={
                  loading
                    ? "—"
                    : `${rds?.total ?? 0} detected`
                }
              />

              <RuntimeRow
                label="EKS"
                value={
                  loading
                    ? "—"
                    : `${eks?.total ?? 0} detected`
                }
              />

            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#585858]">
                Monitoring mode
              </p>

              <p className="mt-1 text-xs text-[#9B9B9B]">
                Resource-state observation
              </p>
            </div>

          </div>
        </section>

        {/* Service Health */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">

          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-[#B7D1C5]" />

                <h2 className="text-lg font-semibold sm:text-xl">
                  Service Health
                </h2>
              </div>

              <p className="mt-1 text-xs text-[#777C85] sm:text-sm">
                Live AWS resource observations collected by OpsMind.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs text-[#777C85]">
                {observations.length} services
              </span>

              <span className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                LIVE
              </span>
            </div>

          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center text-[#777C85]">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Collecting infrastructure observations...
            </div>
          ) : observations.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center p-8">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-9 w-9 text-amber-400" />

                <h3 className="mt-4 font-semibold">
                  No observations available
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-[#777C85]">
                  OpsMind did not receive service-state observations from
                  the connected AWS environment.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-px bg-white/5 md:grid-cols-2 lg:grid-cols-3">
              {observations.map((service) => {
                const config = statusConfig(service.status);
                const StatusIcon = config.icon;

                const serviceName =
                  service.service.toUpperCase();

                return (
                  <div
                    key={service.service}
                    className="bg-[#070707] p-5 transition hover:bg-[#0A0A0A] sm:p-6"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025]">
                          {serviceName === "RDS" ? (
                            <Database className="h-5 w-5 text-[#B7D1C5]" />
                          ) : (
                            <Server className="h-5 w-5 text-[#B7D1C5]" />
                          )}
                        </div>

                        <div>
                          <h3 className="font-semibold">
                            {serviceName}
                          </h3>

                          <p className="mt-0.5 text-[11px] text-[#585858]">
                            AWS resource monitoring
                          </p>
                        </div>
                      </div>

                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border ${config.border} ${config.bg}`}
                      >
                        <StatusIcon
                          className={`h-4 w-4 ${config.color}`}
                        />
                      </div>

                    </div>

                    <div className="mt-6 flex items-center justify-between">

                      <span className="text-xs text-[#585858]">
                        STATUS
                      </span>

                      <span
                        className={`inline-flex items-center gap-2 text-xs font-semibold ${config.color}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
                        />

                        {config.label}
                      </span>

                    </div>

                    <div className="mt-5 border-t border-white/5 pt-5">

                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[#585858]">
                            Resources
                          </p>

                          <p className="mt-1 text-3xl font-bold">
                            {service.total}
                          </p>
                        </div>

                        {serviceName === "EC2" && (
                          <div className="text-right text-[11px]">
                            <p className="text-[#585858]">
                              Running
                            </p>

                            <p className="mt-1 text-emerald-300">
                              {service.running ?? 0}
                            </p>
                          </div>
                        )}
                      </div>

                    </div>

                    <p className="mt-5 text-xs leading-5 text-[#777C85]">
                      {service.message}
                    </p>

                    {serviceName === "EC2" &&
                      service.stopped !== undefined && (
                        <div className="mt-5 flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-[11px]">
                          <span className="text-[#585858]">
                            Instance distribution
                          </span>

                          <span>
                            <span className="text-emerald-300">
                              {service.running ?? 0} running
                            </span>

                            <span className="mx-2 text-[#333]">
                              /
                            </span>

                            <span className="text-amber-300">
                              {service.stopped} stopped
                            </span>
                          </span>
                        </div>
                      )}

                  </div>
                );
              })}
            </div>
          )}

        </section>

        {/* Monitoring Information */}
        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">

          <div className="rounded-2xl border border-[#B7D1C5]/15 bg-[#B7D1C5]/[0.025] p-5 sm:p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#B7D1C5]/20 bg-[#B7D1C5]/10">
                <Activity className="h-5 w-5 text-[#B7D1C5]" />
              </div>

              <div>
                <h2 className="font-semibold">
                  OpsMind Observation Engine
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#9B9B9B]">
                  OpsMind evaluates live AWS resource state across the
                  connected environment. The page automatically refreshes
                  every 30 seconds and also supports manual refresh.
                </p>

                {data?.collectedAt && (
                  <p className="mt-3 text-xs text-[#585858]">
                    Last collected:{" "}
                    {new Date(data.collectedAt).toLocaleString()}
                  </p>
                )}
              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025]">
                <Server className="h-5 w-5 text-[#B7D1C5]" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Monitoring Scope
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#9B9B9B]">
                  Current observability focuses on AWS resource state.
                  It does not represent CloudWatch CPU, memory, network or
                  application-level metrics unless those signals are
                  explicitly connected to the engine.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {["EC2", "RDS", "EKS"].map((service) => (
                    <span
                      key={service}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-semibold tracking-wider text-[#777C85]"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </section>

        <footer className="mt-10 border-t border-white/10 pt-5 text-center text-xs text-[#585858]">
          Cloudnexaa Technologies · OpsMind Observability
        </footer>

      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
  valueClass,
  accent,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  valueClass: string;
  accent: "primary" | "green" | "amber" | "neutral";
}) {
  const wrapper =
    accent === "primary"
      ? "border-[#B7D1C5]/20 bg-[#B7D1C5]/[0.035]"
      : accent === "green"
        ? "border-emerald-400/15 bg-emerald-400/[0.025]"
        : accent === "amber"
          ? "border-amber-400/20 bg-amber-400/[0.025]"
          : "border-white/10 bg-white/[0.025]";

  const iconClass =
    accent === "primary"
      ? "text-[#B7D1C5]"
      : accent === "green"
        ? "text-emerald-400"
        : accent === "amber"
          ? "text-amber-400"
          : "text-[#B7D1C5]";

  return (
    <div className={`rounded-2xl border p-5 ${wrapper}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#777C85]">
          {label}
        </p>

        <span className={iconClass}>
          {icon}
        </span>
      </div>

      <p
        className={`mt-5 truncate text-3xl font-bold tracking-tight sm:text-4xl ${valueClass}`}
      >
        {value}
      </p>

      <p className="mt-2 text-[11px] text-[#585858]">
        {description}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[#585858]">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-[#E8DDD7]">
        {value}
      </p>
    </div>
  );
}

function RuntimeRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-0">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#B7D1C5]" />
        <span className="text-sm text-[#9B9B9B]">
          {label}
        </span>
      </div>

      <span className="text-xs font-medium text-[#F6E8DF]">
        {value}
      </span>
    </div>
  );
}
