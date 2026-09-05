"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Cloud,
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type CostPoint = {
  date: string;
  amount: number;
};

type CostData = {
  success: boolean;
  currency?: string;
  totalCost?: number;
  dailyAverage?: number;
  projectedMonthlyCost?: number;
  daily?: CostPoint[];
  period?: {
    start: string;
    end: string;
  };
  error?: string;
};

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fullDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadCosts = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/aws/costs", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load AWS cost data");
      }

      setData(result);
    } catch (err) {
      console.error("Cost Intelligence error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to AWS Cost Explorer"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCosts();

    const interval = setInterval(() => {
      loadCosts();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadCosts]);

  const daily = data?.daily ?? [];

  const currency = data?.currency || "USD";

  const maxDaily = useMemo(() => {
    return Math.max(...daily.map((item) => item.amount), 0);
  }, [daily]);

  const highestDay = useMemo(() => {
    if (!daily.length) return null;

    return daily.reduce((highest, current) =>
      current.amount > highest.amount ? current : highest
    );
  }, [daily]);

  const lowestDay = useMemo(() => {
    if (!daily.length) return null;

    return daily.reduce((lowest, current) =>
      current.amount < lowest.amount ? current : lowest
    );
  }, [daily]);

  const totalDailyPoints = daily.length;

  return (
    <main className="min-h-screen bg-[#040404] px-4 py-6 text-[#F6E8DF] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[#B7D1C5]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#B7D1C5]/20 bg-[#B7D1C5]/10">
                <DollarSign size={16} />
              </div>

              <span className="text-xs font-semibold uppercase tracking-[0.25em]">
                FinOps / Cost Intelligence
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Cloud Spend Intelligence.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9B9B9B]">
              Monitor live AWS Cost Explorer data, daily spending behaviour
              and the current-month run-rate projection from one operational
              view.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.035] px-3 py-2 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                AWS Cost Explorer
              </span>

              <span className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-[#777C85]">
                {currency}
              </span>
            </div>
          </div>

          <button
            onClick={() => loadCosts(true)}
            disabled={loading || refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#B7D1C5]/20 bg-[#B7D1C5]/10 px-4 py-3 text-sm font-semibold text-[#B7D1C5] transition hover:bg-[#B7D1C5]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}

            {refreshing ? "Refreshing..." : "Refresh Costs"}
          </button>
        </header>

        {/* Error */}
        {error && (
          <section className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

              <div>
                <h2 className="font-semibold text-red-300">
                  Cost Explorer Error
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#9B9B9B]">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* KPI Cards */}
        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <CostCard
            label="Current Spend"
            value={
              loading
                ? "—"
                : money(data?.totalCost ?? 0, currency)
            }
            description="Current month"
            icon={<DollarSign size={18} />}
            tone="primary"
          />

          <CostCard
            label="Daily Average"
            value={
              loading
                ? "—"
                : money(data?.dailyAverage ?? 0, currency)
            }
            description="Available daily data"
            icon={<Activity size={18} />}
            tone="neutral"
          />

          <CostCard
            label="Monthly Run Rate"
            value={
              loading
                ? "—"
                : money(data?.projectedMonthlyCost ?? 0, currency)
            }
            description="Projection, not AWS forecast"
            icon={<TrendingUp size={18} />}
            tone="warning"
          />

          <CostCard
            label="Peak Day"
            value={
              loading
                ? "—"
                : highestDay
                  ? money(highestDay.amount, currency)
                  : money(0, currency)
            }
            description={
              highestDay ? fullDate(highestDay.date) : "No data"
            }
            icon={<BarChart3 size={18} />}
            tone="neutral"
          />

        </section>

        {/* Spend Chart */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">

          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#B7D1C5]" />

                <h2 className="text-lg font-semibold sm:text-xl">
                  Daily AWS Spend
                </h2>
              </div>

              <p className="mt-1 text-xs leading-5 text-[#777C85] sm:text-sm">
                Unblended cost reported by AWS Cost Explorer.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs text-[#777C85]">
                {totalDailyPoints} data points
              </span>

              <span className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                LIVE
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center text-[#777C85]">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Loading AWS cost data...
            </div>
          ) : daily.length === 0 ? (
            <div className="flex min-h-[360px] items-center justify-center p-8 text-center">
              <div>
                <BarChart3 className="mx-auto h-10 w-10 text-[#585858]" />

                <h3 className="mt-4 font-semibold">
                  No daily cost data available
                </h3>

                <p className="mt-2 text-sm text-[#777C85]">
                  AWS Cost Explorer did not return daily spend data for
                  the current billing period.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6">

              <div className="mb-5 flex items-center justify-between text-xs text-[#777C85]">
                <span>
                  Highest:{" "}
                  <span className="text-[#9B9B9B]">
                    {highestDay
                      ? money(highestDay.amount, currency)
                      : "—"}
                  </span>
                </span>

                <span>
                  Average:{" "}
                  <span className="text-[#9B9B9B]">
                    {money(data?.dailyAverage ?? 0, currency)}
                  </span>
                </span>
              </div>

              <div className="overflow-x-auto pb-2">
                <div
                  className="flex min-w-[760px] items-end gap-2"
                  style={{ height: 330 }}
                >
                  {daily.map((item) => {
                    const height =
                      maxDaily > 0
                        ? Math.max(
                            (item.amount / maxDaily) * 245,
                            8
                          )
                        : 8;

                    const isPeak =
                      highestDay?.date === item.date;

                    return (
                      <div
                        key={item.date}
                        className="group flex h-full min-w-7 flex-1 flex-col justify-end"
                      >
                        <div className="relative flex h-7 items-center justify-center">
                          <div className="pointer-events-none absolute bottom-1 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0A0A0A] px-2.5 py-1.5 text-[10px] text-[#F6E8DF] shadow-xl group-hover:block">
                            {money(item.amount, currency)}
                          </div>
                        </div>

                        <div className="flex items-end justify-center">
                          <div
                            title={`${item.date}: ${money(
                              item.amount,
                              currency
                            )}`}
                            className={`w-full max-w-8 rounded-t-md transition-all duration-300 group-hover:-translate-y-1 ${
                              isPeak
                                ? "bg-amber-400/80 group-hover:bg-amber-300"
                                : "bg-[#B7D1C5]/55 group-hover:bg-[#B7D1C5]/80"
                            }`}
                            style={{ height }}
                          />
                        </div>

                        <div className="mt-3 text-center text-[9px] text-[#585858]">
                          {shortDate(item.date)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </section>

        {/* Secondary Analytics */}
        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">

          <AnalyticsCard
            title="Peak Spend"
            icon={<TrendingUp size={18} />}
            value={
              highestDay
                ? money(highestDay.amount, currency)
                : money(0, currency)
            }
            description={
              highestDay
                ? `${fullDate(highestDay.date)} recorded the highest daily spend.`
                : "No peak day available."
            }
            tone="amber"
          />

          <AnalyticsCard
            title="Lowest Spend"
            icon={<Activity size={18} />}
            value={
              lowestDay
                ? money(lowestDay.amount, currency)
                : money(0, currency)
            }
            description={
              lowestDay
                ? `${fullDate(lowestDay.date)} recorded the lowest daily spend.`
                : "No minimum available."
            }
            tone="green"
          />

          <AnalyticsCard
            title="Billing Period"
            icon={<CalendarDays size={18} />}
            value={
              data?.period
                ? `${data.period.start} → ${data.period.end}`
                : "Current month"
            }
            description={`Currency: ${currency}`}
            tone="neutral"
          />

        </section>

        {/* FinOps Intelligence */}
        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">

          <div className="rounded-2xl border border-[#B7D1C5]/15 bg-[#B7D1C5]/[0.025] p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#B7D1C5]/20 bg-[#B7D1C5]/10">
                <Cloud className="h-5 w-5 text-[#B7D1C5]" />
              </div>

              <div>
                <h2 className="font-semibold">
                  FinOps Intelligence
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#9B9B9B]">
                  OpsMind reads current-month AWS spend directly from
                  Cost Explorer. The displayed run rate is calculated from
                  observed daily spending and should be treated as an
                  internal projection rather than an official AWS forecast.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.025] p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Cost Awareness
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#9B9B9B]">
                  Use the daily pattern to identify unusual spending days,
                  understand the current run rate and decide where deeper
                  AWS cost investigation is required.
                </p>
              </div>
            </div>
          </div>

        </section>

        <footer className="mt-10 border-t border-white/10 pt-5 text-center text-xs text-[#585858]">
          Cloudnexaa Technologies · OpsMind FinOps Intelligence
        </footer>
      </div>
    </main>
  );
}

function CostCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone: "primary" | "neutral" | "warning";
}) {
  const styles = {
    primary: {
      wrapper:
        "border-[#B7D1C5]/20 bg-[#B7D1C5]/[0.035]",
      icon: "text-[#B7D1C5]",
      value: "text-[#F6E8DF]",
    },
    neutral: {
      wrapper: "border-white/10 bg-white/[0.025]",
      icon: "text-[#B7D1C5]",
      value: "text-[#F6E8DF]",
    },
    warning: {
      wrapper:
        "border-amber-400/20 bg-amber-400/[0.035]",
      icon: "text-amber-400",
      value: "text-amber-300",
    },
  };

  const current = styles[tone];

  return (
    <div className={`rounded-2xl border p-5 ${current.wrapper}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#777C85]">
          {label}
        </p>

        <span className={current.icon}>
          {icon}
        </span>
      </div>

      <p
        className={`mt-5 truncate text-3xl font-bold tracking-tight sm:text-4xl ${current.value}`}
      >
        {value}
      </p>

      <p className="mt-2 text-[11px] text-[#585858]">
        {description}
      </p>
    </div>
  );
}

function AnalyticsCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone: "amber" | "green" | "neutral";
}) {
  const iconClass =
    tone === "amber"
      ? "text-amber-400"
      : tone === "green"
        ? "text-emerald-400"
        : "text-[#B7D1C5]";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#777C85]">
          {title}
        </p>

        <span className={iconClass}>
          {icon}
        </span>
      </div>

      <p className="mt-5 truncate text-2xl font-bold">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[#585858]">
        {description}
      </p>
    </div>
  );
}
