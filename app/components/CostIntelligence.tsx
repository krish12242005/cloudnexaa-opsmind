"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from "lucide-react";

type DailyCost = {
  date?: string;
  cost?: number;
};

type CostResponse = {
  success?: boolean;
  currency?: string;
  period?: {
    start?: string;
    end?: string;
  };
  totalCost?: number;
  dailyCosts?: DailyCost[];
};

export default function CostIntelligence() {
  const [data, setData] = useState<CostResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCosts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/aws/costs", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("AWS cost request failed");
      }

      const result: CostResponse = await response.json();

      if (!result.success) {
        throw new Error("AWS cost API returned an error");
      }

      setData(result);
    } catch (err) {
      console.error("Cost Intelligence error:", err);
      setError("Unable to load AWS cost data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCosts();

    const timer = setInterval(() => {
      loadCosts();
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const dailyCosts = data?.dailyCosts ?? [];

  const averageDailyCost = useMemo(() => {
    if (dailyCosts.length === 0) {
      return 0;
    }

    const total = dailyCosts.reduce((sum, item) => {
      return sum + Number(item.cost ?? 0);
    }, 0);

    return total / dailyCosts.length;
  }, [dailyCosts]);

  const projectedMonthlyCost = averageDailyCost * 30;

  const latestCost =
    dailyCosts.length > 0
      ? Number(dailyCosts[dailyCosts.length - 1]?.cost ?? 0)
      : 0;

  const previousCost =
    dailyCosts.length > 1
      ? Number(dailyCosts[dailyCosts.length - 2]?.cost ?? 0)
      : latestCost;

  const trend =
    previousCost > 0
      ? ((latestCost - previousCost) / previousCost) * 100
      : 0;

  const maxCost = Math.max(
    ...dailyCosts.map((item) => Number(item.cost ?? 0)),
    1
  );

  return (
    <section className="relative mt-8 overflow-hidden rounded-[24px] border border-white/10 bg-[#070b16]/90 p-6 shadow-2xl backdrop-blur-xl">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#F6E8DF]/10 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#B7D1C5]" />

              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B7D1C5]">
                Cost Intelligence
              </span>
            </div>

            <h2 className="text-2xl font-bold text-[#F6E8DF]">
              AWS FinOps Command Center
            </h2>

            <p className="mt-1 text-sm text-[#9B9B9B]">
              Live AWS Cost Explorer spending intelligence.
            </p>
          </div>

          <button
            type="button"
            onClick={loadCosts}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0B0B0B]/5 px-4 py-2 text-sm font-medium text-[#E8DDD7] transition hover:bg-[#0B0B0B]/10 disabled:opacity-50"
          >
            <RefreshCw
              className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />

            Refresh
          </button>
        </div>

        {error ? (
          <div className="rounded-[20px] border border-[#FA4A0D]/20 bg-[#4A322A]/5 p-5 text-sm text-red-300">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[20px] border border-white/10 bg-[#0B0B0B]/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-[#9B9B9B]">
                    Current Spend
                  </span>

                  <DollarSign className="h-5 w-5 text-[#B7D1C5]" />
                </div>

                <div className="text-3xl font-bold text-[#F6E8DF]">
                  {loading
                    ? "..."
                    : "$" + Number(data?.totalCost ?? 0).toFixed(2)}
                </div>

                <p className="mt-2 text-xs text-[#777C85]">
                  Current billing period
                </p>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-[#0B0B0B]/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-[#9B9B9B]">
                    Daily Average
                  </span>

                  <TrendingUp className="h-5 w-5 text-[#F6E8DF]" />
                </div>

                <div className="text-3xl font-bold text-[#F6E8DF]">
                  {loading
                    ? "..."
                    : "$" + averageDailyCost.toFixed(2)}
                </div>

                <p className="mt-2 text-xs text-[#777C85]">
                  Average daily AWS spend
                </p>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-[#0B0B0B]/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-[#9B9B9B]">
                    Monthly Projection
                  </span>

                  <Zap className="h-5 w-5 text-[#F6E8DF]" />
                </div>

                <div className="text-3xl font-bold text-[#F6E8DF]">
                  {loading
                    ? "..."
                    : "$" + projectedMonthlyCost.toFixed(2)}
                </div>

                <p className="mt-2 text-xs text-[#777C85]">
                  30 day run-rate estimate
                </p>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-[#0B0B0B]/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-[#9B9B9B]">
                    Daily Trend
                  </span>

                  {trend >= 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-amber-400" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-emerald-400" />
                  )}
                </div>

                <div className="text-3xl font-bold text-[#F6E8DF]">
                  {loading
                    ? "..."
                    : (trend >= 0 ? "+" : "") + trend.toFixed(1) + "%"}
                </div>

                <p className="mt-2 text-xs text-[#777C85]">
                  Compared with previous day
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-[20px] border border-white/10 bg-black/20 p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[#F6E8DF]">
                      Daily AWS Spend
                    </h3>

                    <p className="text-xs text-[#777C85]">
                      Cost Explorer daily breakdown
                    </p>
                  </div>

                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs text-cyan-300">
                    LIVE
                  </span>
                </div>

                <div className="space-y-4">
                  {dailyCosts.map((item, index) => {
                    const cost = Number(item.cost ?? 0);

                    const width = Math.max(
                      (cost / maxCost) * 100,
                      4
                    );

                    return (
                      <div key={(item.date ?? "day") + index}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-[#9B9B9B]">
                            {item.date ?? "Unknown"}
                          </span>

                          <span className="font-medium text-[#E8DDD7]">
                            ${cost.toFixed(2)}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-[#0B0B0B]/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-purple-500 transition-all duration-700"
                            style={{ width: width + "%" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#B7D1C5]" />

                  <h3 className="font-semibold text-[#F6E8DF]">
                    FinOps Intelligence
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-wider text-[#777C85]">
                      Billing Status
                    </p>

                    <p className="mt-1 font-semibold text-emerald-400">
                      AWS Cost Explorer Connected
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-wider text-[#777C85]">
                      Current Spend
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      AWS has reported $
                      {Number(data?.totalCost ?? 0).toFixed(2)}
                      {" "}for the current period.
                    </p>
                  </div>

                  <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-4">
                    <p className="text-xs uppercase tracking-wider text-[#B7D1C5]">
                      OpsMind Projection
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      Current run rate projects approximately $
                      {projectedMonthlyCost.toFixed(2)}
                      {" "}over 30 days.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 text-xs text-[#777C85]">
              Data period: {data?.period?.start ?? "-"} to{" "}
              {data?.period?.end ?? "-"} | Currency:{" "}
              {data?.currency ?? "USD"}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
