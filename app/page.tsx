"use client";

import DashboardActivityTimeline from "@/app/components/DashboardActivityTimeline";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Cloud,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
  TriangleAlert,
  Zap,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

type ResourceSummary = {
  ec2?: { count?: number };
  s3?: { count?: number };
  rds?: { count?: number };
  eks?: { count?: number };
  totalResources?: number;
};

type Finding = {
  id?: string;
  severity?: string;
  service?: string;
  title?: string;
  description?: string;
  recommendation?: string;
};

type Analysis = {
  summary?: {
    totalResources?: number;
    totalFindings?: number;
    critical?: number;
    warnings?: number;
    healthy?: number;
    info?: number;
  };
  findings?: Finding[];
};

type CostResponse = {
  success?: boolean;
  totalCost?: number;
  total?: number;
  amount?: number;
  cost?: number;
  currency?: string;
};

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl",
        "border border-white/[0.07]",
        "bg-[#090909]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  description: string;
  active?: boolean;
}) {
  return (
    <Card
      className={[
        "group relative overflow-hidden p-5",
        "transition duration-300",
        "hover:-translate-y-0.5 hover:border-white/[0.14]",
        active ? "border-orange-400/20" : "",
      ].join(" ")}
    >
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-orange-400/[0.035] blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#B7D1C5]">
          {icon}
        </div>

        <div className="flex items-center gap-1">
          {[3, 5, 7, 4, 8, 6].map((height, index) => (
            <span
              key={index}
              className="w-[3px] rounded-full bg-orange-400/45"
              style={{ height: `${height * 2.5}px` }}
            />
          ))}
        </div>
      </div>

      <p className="relative mt-7 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#625D59]">
        {label}
      </p>

      <div className="relative mt-1 text-[31px] font-semibold tracking-[-0.04em] text-[#F6E8DF]">
        {value}
      </div>

      <p className="relative mt-1 text-xs text-[#65605C]">
        {description}
      </p>
    </Card>
  );
}

function findingTone(severity: string) {
  switch (severity) {
    case "critical":
      return {
        icon: "border-red-400/20 bg-red-400/[0.055] text-red-300",
        badge: "border-red-400/20 text-red-300",
      };

    case "warning":
      return {
        icon: "border-orange-400/20 bg-orange-400/[0.055] text-orange-300",
        badge: "border-orange-400/20 text-orange-300",
      };

    case "healthy":
      return {
        icon: "border-emerald-400/15 bg-emerald-400/[0.045] text-emerald-300",
        badge: "border-emerald-400/15 text-emerald-300",
      };

    default:
      return {
        icon: "border-white/[0.08] bg-white/[0.025] text-[#B7D1C5]",
        badge: "border-white/[0.09] text-[#817A75]",
      };
  }
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<ResourceSummary | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [cost, setCost] = useState<CostResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        overviewRes,
        analysisRes,
        costRes,
        ec2Res,
        s3Res,
        rdsRes,
        eksRes,
      ] = await Promise.all([
        fetch("/api/aws/overview", {
          cache: "no-store",
        }),
        fetch("/api/opsmind/analyze", {
          cache: "no-store",
        }),
        fetch("/api/aws/costs", {
          cache: "no-store",
        }),
        fetch("/api/aws/ec2", {
          cache: "no-store",
        }),
        fetch("/api/aws/s3", {
          cache: "no-store",
        }),
        fetch("/api/aws/rds", {
          cache: "no-store",
        }),
        fetch("/api/aws/eks", {
          cache: "no-store",
        }),
      ]);

      const [
        overviewData,
        analysisData,
        costData,
        ec2Data,
        s3Data,
        rdsData,
        eksData,
      ] = await Promise.all([
        overviewRes.json(),
        analysisRes.json(),
        costRes.json(),
        ec2Res.json(),
        s3Res.json(),
        rdsRes.json(),
        eksRes.json(),
      ]);

      if (!overviewRes.ok || !overviewData?.success) {
        throw new Error(
          overviewData?.error || "Unable to load infrastructure"
        );
      }

      const ec2Fallback = Array.isArray(ec2Data?.instances)
        ? ec2Data.instances.length
        : Array.isArray(ec2Data)
          ? ec2Data.length
          : 0;

      const s3Fallback = Array.isArray(s3Data?.buckets)
        ? s3Data.buckets.length
        : Array.isArray(s3Data)
          ? s3Data.length
          : 0;

      const rdsFallback = Array.isArray(rdsData?.databases)
        ? rdsData.databases.length
        : Array.isArray(rdsData?.instances)
          ? rdsData.instances.length
          : Array.isArray(rdsData)
            ? rdsData.length
            : 0;

      const eksFallback = Array.isArray(eksData?.clusters)
        ? eksData.clusters.length
        : Array.isArray(eksData)
          ? eksData.length
          : 0;

      setOverview({
        totalResources: numberValue(
          overviewData?.totalResources ||
            overviewData?.resourceCount ||
            overviewData?.total
        ),
        ec2: {
          count:
            numberValue(overviewData?.ec2?.count) ||
            numberValue(overviewData?.ec2Count) ||
            ec2Fallback,
        },
        s3: {
          count:
            numberValue(overviewData?.s3?.count) ||
            numberValue(overviewData?.s3Count) ||
            s3Fallback,
        },
        rds: {
          count:
            numberValue(overviewData?.rds?.count) ||
            numberValue(overviewData?.rdsCount) ||
            rdsFallback,
        },
        eks: {
          count:
            numberValue(overviewData?.eks?.count) ||
            numberValue(overviewData?.eksCount) ||
            eksFallback,
        },
      });

      setAnalysis(analysisData);
      setCost(costData);
    } catch (err) {
      console.error("OpsMind dashboard error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load OpsMind dashboard"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    const timer = window.setInterval(() => {
      loadDashboard();
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const ec2 = numberValue(overview?.ec2?.count);
  const s3 = numberValue(overview?.s3?.count);
  const rds = numberValue(overview?.rds?.count);
  const eks = numberValue(overview?.eks?.count);

  const totalResources =
    numberValue(overview?.totalResources) || ec2 + s3 + rds + eks;

  const findings = analysis?.findings ?? [];

  const critical = numberValue(analysis?.summary?.critical);
  const warnings = numberValue(analysis?.summary?.warnings);
  const healthy = numberValue(analysis?.summary?.healthy);
  const info = numberValue(analysis?.summary?.info);

  const openFindings = numberValue(
    analysis?.summary?.totalFindings
  );

  const healthScore = Math.max(
    0,
    Math.min(100, 100 - critical * 30 - warnings * 10)
  );

  const healthLabel =
    healthScore >= 90
      ? "Healthy"
      : healthScore >= 70
        ? "Review recommended"
        : "Attention required";

  const currentCost =
    numberValue(cost?.totalCost) ||
    numberValue(cost?.total) ||
    numberValue(cost?.amount) ||
    numberValue(cost?.cost);

  const topFindings = useMemo(() => findings.slice(0, 5), [findings]);

  const recommendations = useMemo(() => {
    const items: {
      title: string;
      description: string;
      tone: "warning" | "info" | "healthy";
    }[] = [];

    const warningFinding = findings.find(
      (finding) =>
        String(finding.severity || "").toLowerCase() === "warning"
    );

    if (warningFinding) {
      items.push({
        title:
          warningFinding.title || "Review active infrastructure finding",
        description:
          warningFinding.recommendation ||
          warningFinding.description ||
          "Inspect the finding before taking any operational action.",
        tone: "warning",
      });
    }

    const stoppedEC2 = findings.find(
      (finding) =>
        String(finding.title || "")
          .toLowerCase()
          .includes("stopped ec2")
    );

    if (stoppedEC2) {
      items.push({
        title: "Review stopped EC2 instances",
        description:
          stoppedEC2.recommendation ||
          "Review unused compute resources before making changes.",
        tone: "warning",
      });
    }

    if (!items.length && healthScore >= 90) {
      items.push({
        title: "Environment operating normally",
        description:
          "OpsMind is not reporting any high-priority action from the current scan.",
        tone: "healthy",
      });
    }

    if (!items.length) {
      items.push({
        title: "Review current cloud posture",
        description:
          "Open the relevant OpsMind modules to inspect the latest environment findings.",
        tone: "info",
      });
    }

    return items.slice(0, 2);
  }, [findings, healthScore]);

  return (
    <main className="min-h-screen bg-[#040404] text-[#F6E8DF]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[28%] top-[-18%] h-[420px] w-[420px] rounded-full bg-orange-400/[0.028] blur-[130px]" />
        <div className="absolute bottom-[-18%] right-[-5%] h-[420px] w-[420px] rounded-full bg-[#B7D1C5]/[0.018] blur-[130px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b border-white/[0.07] pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#68625E]">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                Cloud Operations
                <span className="text-[#403C39]">/</span>
                ap-south-1
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-5xl">
                Overview
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77716D] sm:text-base">
                Infrastructure health, operational intelligence and cloud
                activity in one workspace.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.025] px-4 py-2.5 text-xs text-[#817A75] sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                AWS Connected
              </div>

              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-xs font-medium text-[#D6CBC5] transition hover:border-white/15 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? "animate-spin" : ""}
                />

                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <section className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <TriangleAlert
                  size={18}
                  className="mt-0.5 shrink-0 text-red-300"
                />

                <div>
                  <p className="text-sm font-medium text-red-200">
                    Dashboard data unavailable
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-200/55">
                    {error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadDashboard(true)}
                className="rounded-lg border border-red-400/15 px-3 py-2 text-xs text-red-200 transition hover:bg-red-400/[0.06]"
              >
                Retry
              </button>
            </div>
          </section>
        )}

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B7D1C5]/[0.06] text-[#B7D1C5]">
                <Cloud size={16} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#57514D]">
                  Environment
                </p>

                <p className="mt-1 text-sm text-[#D7CDC7]">
                  AWS Production Workspace
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/[0.06] text-orange-300">
                <Activity size={16} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#57514D]">
                  Resources
                </p>

                <p className="mt-1 text-sm text-[#D7CDC7]">
                  {loading ? "Scanning..." : `${totalResources} detected`}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B7D1C5]/[0.06] text-[#B7D1C5]">
                <ShieldCheck size={16} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#57514D]">
                  OpsMind Status
                </p>

                <p className="mt-1 text-sm text-[#D7CDC7]">
                  {loading ? "Analyzing..." : healthLabel}
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={<Server size={18} />}
            label="EC2 Instances"
            value={loading ? "—" : ec2}
            description="Compute resources"
            active
          />

          <MetricCard
            icon={<HardDrive size={18} />}
            label="S3 Buckets"
            value={loading ? "—" : s3}
            description="Object storage"
          />

          <MetricCard
            icon={<Database size={18} />}
            label="RDS Databases"
            value={loading ? "—" : rds}
            description="Database resources"
          />

          <MetricCard
            icon={<Boxes size={18} />}
            label="EKS Clusters"
            value={loading ? "—" : eks}
            description="Kubernetes platform"
          />

          <MetricCard
            icon={<AlertTriangle size={18} />}
            label="Open Findings"
            value={loading ? "—" : openFindings}
            description={`${critical} critical · ${warnings} warnings`}
          />
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-12">
          <Card className="relative overflow-hidden p-5 sm:p-6 xl:col-span-4">
            <div className="absolute right-[-60px] top-[-70px] h-48 w-48 rounded-full bg-[#B7D1C5]/[0.025] blur-3xl" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#625D59]">
                  System Health
                </p>

                <h2 className="mt-2 text-lg font-medium text-[#E7DCD6]">
                  Cloud Health
                </h2>
              </div>

              <ShieldCheck size={18} className="text-[#B7D1C5]" />
            </div>

            <div className="relative mt-8 flex justify-center">
              <div
                className="relative flex h-44 w-44 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#B7D1C5 ${healthScore * 3.6}deg, #252525 ${healthScore * 3.6}deg)`,
                }}
              >
                <div className="flex h-[148px] w-[148px] flex-col items-center justify-center rounded-full bg-[#090909]">
                  <span className="text-5xl font-semibold tracking-[-0.06em] text-[#F6E8DF]">
                    {loading ? "—" : healthScore}
                  </span>

                  <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#58524E]">
                    / 100
                  </span>
                </div>
              </div>
            </div>

            <div className="relative mt-7 grid grid-cols-4 gap-2 border-t border-white/[0.06] pt-5">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#4F4A46]">
                  Critical
                </p>
                <p className="mt-1 text-sm text-red-300">
                  {critical}
                </p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#4F4A46]">
                  Warning
                </p>
                <p className="mt-1 text-sm text-orange-300">
                  {warnings}
                </p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#4F4A46]">
                  Healthy
                </p>
                <p className="mt-1 text-sm text-emerald-300">
                  {healthy}
                </p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#4F4A46]">
                  Info
                </p>
                <p className="mt-1 text-sm text-[#8A837E]">
                  {info}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6 xl:col-span-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#625D59]">
                  Intelligence
                </p>

                <h2 className="mt-2 text-lg font-medium text-[#E7DCD6]">
                  Recent Findings
                </h2>

                <p className="mt-1 text-xs text-[#5E5854]">
                  Latest observations from the current OpsMind scan.
                </p>
              </div>

              <span className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.025] px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] text-emerald-300">
                Live
              </span>
            </div>

            <div className="mt-6 space-y-2">
              {loading ? (
                [1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-[66px] animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.018]"
                  />
                ))
              ) : topFindings.length === 0 ? (
                <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025] p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2
                      size={18}
                      className="text-emerald-300"
                    />

                    <div>
                      <p className="text-sm text-[#D8CEC8]">
                        No active findings
                      </p>

                      <p className="mt-1 text-xs text-[#625D59]">
                        OpsMind did not detect any current issues.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                topFindings.map((finding, index) => {
                  const severity = String(
                    finding.severity || "info"
                  ).toLowerCase();

                  const tone = findingTone(severity);

                  const warning =
                    severity === "warning" || severity === "critical";

                  return (
                    <div
                      key={finding.id || index}
                      className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.025]"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tone.icon}`}
                        >
                          {warning ? (
                            <AlertTriangle size={14} />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${tone.badge}`}
                            >
                              {severity}
                            </span>

                            <span className="text-[10px] text-[#55504C]">
                              {finding.service || "OpsMind"}
                            </span>
                          </div>

                          <p className="mt-2 text-xs font-medium text-[#D7CCC6]">
                            {finding.title || "Infrastructure finding"}
                          </p>

                          <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-[#5C5652]">
                            {finding.description ||
                              finding.recommendation ||
                              "Review recommended"}
                          </p>
                        </div>

                        <ArrowUpRight
                          size={14}
                          className="mt-1 shrink-0 text-[#403C39] transition group-hover:text-[#766F69]"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="relative overflow-hidden p-5 sm:p-6 xl:col-span-3">
            <div className="absolute bottom-[-40px] left-[-40px] h-32 w-32 rounded-full bg-orange-400/[0.025] blur-3xl" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#625D59]">
                  Finance
                </p>

                <h2 className="mt-2 text-lg font-medium text-[#E7DCD6]">
                  Cost Intelligence
                </h2>
              </div>

              <CircleDollarSign size={18} className="text-orange-300" />
            </div>

            <div className="relative mt-8">
              <p className="text-4xl font-semibold tracking-[-0.05em]">
                {loading ? "—" : `$${currentCost.toFixed(2)}`}
              </p>

              <p className="mt-2 text-xs text-[#625D59]">
                Current billing period
              </p>
            </div>

            <div className="relative mt-8 rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#55504C]">
                Billing signal
              </p>

              <p className="mt-2 text-sm font-medium text-[#D7CCC6]">
                Current month spend
              </p>

              <p className="mt-1 text-xs leading-5 text-[#625D59]">
                Live amount returned by AWS Cost Explorer. Historical
                spend-series data is not loaded into this dashboard.
              </p>
            </div>

            <p className="relative mt-5 text-[10px] leading-5 text-[#514C48]">
              Projection based on current month spend. This is not an AWS
              official forecast.
            </p>
          </Card>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/[0.055] text-orange-300">
                <Zap size={16} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#625D59]">
                  OpsMind
                </p>

                <h3 className="mt-1 text-sm font-medium text-[#D8CEC8]">
                  Recommendations
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {recommendations.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className={`rounded-xl border p-4 ${
                    item.tone === "warning"
                      ? "border-orange-400/10 bg-orange-400/[0.025]"
                      : item.tone === "healthy"
                        ? "border-emerald-400/10 bg-emerald-400/[0.02]"
                        : "border-white/[0.06] bg-white/[0.015]"
                  }`}
                >
                  <p className="text-xs font-medium text-[#D8CEC8]">
                    {item.title}
                  </p>

                  <p className="mt-1.5 text-[10px] leading-5 text-[#625D59]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B7D1C5]/[0.055] text-[#B7D1C5]">
                <Activity size={16} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#625D59]">
                  Infrastructure
                </p>

                <h3 className="mt-1 text-sm font-medium text-[#D8CEC8]">
                  Resource Distribution
                </h3>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {[
                ["EC2", ec2],
                ["S3", s3],
                ["RDS", rds],
                ["EKS", eks],
              ].map(([name, value]) => {
                const count = Number(value);

                const percentage =
                  totalResources > 0
                    ? Math.round((count / totalResources) * 100)
                    : 0;

                return (
                  <div key={String(name)}>
                    <div className="mb-2 flex items-center justify-between text-[10px]">
                      <span className="text-[#817A75]">
                        {String(name)}
                      </span>

                      <span className="text-[#55504C]">
                        {count}
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-[#B7D1C5]/55 transition-all duration-700"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-[#B7D1C5]">
                <ShieldCheck size={16} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#625D59]">
                  Control Plane
                </p>

                <h3 className="mt-1 text-sm font-medium text-[#D8CEC8]">
                  Safe Operations
                </h3>
              </div>
            </div>

            <div className="mt-7 space-y-3">
              {[
                ["AWS connection", "Connected"],
                ["Live analysis", "Enabled"],
                ["Automation", "Approval required"],
                ["Remediation", "Dry-run"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-white/[0.05] pb-3 last:border-0"
                >
                  <span className="text-xs text-[#625D59]">
                    {label}
                  </span>

                  <span className="flex items-center gap-2 text-[10px] text-[#B7D1C5]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#B7D1C5]" />
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-5">
          <DashboardActivityTimeline />
        </section>

        <footer className="mt-8 flex flex-col gap-2 border-t border-white/[0.06] py-6 text-[10px] text-[#45413E] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Cloudnexaa Technologies <span className="px-1">•</span> OpsMind
          </span>

          <span>
            Live AWS operations workspace <span className="px-1">•</span>{" "}
            ap-south-1
          </span>
        </footer>
      </div>
    </main>
  );
}