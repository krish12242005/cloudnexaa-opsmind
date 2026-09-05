"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cloud,
  Database,
  DollarSign,
  Info,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type AwsOverviewResponse = {
  success: boolean;
  region?: string;
  resources?: {
    ec2?: {
      count?: number;
      instances?: any[];
    };
    s3?: {
      count?: number;
      buckets?: any[];
    };
    rds?: {
      count?: number;
      instances?: any[];
    };
    eks?: {
      count?: number;
      clusters?: any[];
    };
    vpc?: {
      count?: number;
      vpcs?: any[];
    };
  };
};

type CostResponse = {
  success: boolean;
  currency?: string;
  totalCost?: number;
  dailyCosts?: {
    date?: string;
    cost?: number;
  }[];
};

type Finding = {
  id: string;
  severity: "critical" | "warning" | "info" | "healthy";
  service: string;
  title: string;
  description: string;
  recommendation: string;
};

type AnalysisResponse = {
  success: boolean;
  region?: string;
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

export default function OpsMindDashboard() {
  const [overview, setOverview] =
    useState<AwsOverviewResponse | null>(null);

  const [costs, setCosts] =
    useState<CostResponse | null>(null);

  const [analysis, setAnalysis] =
    useState<AnalysisResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      const [overviewResponse, costResponse] =
        await Promise.all([
          fetch("/api/aws/overview", {
            cache: "no-store",
          }),
          fetch("/api/aws/costs", {
            cache: "no-store",
          }),
        ]);

      if (!overviewResponse.ok) {
        throw new Error("AWS overview request failed");
      }

      const overviewData =
        (await overviewResponse.json()) as AwsOverviewResponse;

      const costData =
        (await costResponse.json()) as CostResponse;

      setOverview(overviewData);
      setCosts(costData);
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError("Unable to load live AWS data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    try {
      setAnalysing(true);

      const response = await fetch(
        "/api/opsmind/analyze",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("OpsMind analysis failed");
      }

      const data =
        (await response.json()) as AnalysisResponse;

      setAnalysis(data);
    } catch (err) {
      console.error("OpsMind analysis error:", err);
      setError("Unable to analyse AWS environment.");
    } finally {
      setAnalysing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    runAnalysis();

    const interval = setInterval(() => {
      loadDashboard();
      runAnalysis();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDashboard, runAnalysis]);

  const ec2Count =
    overview?.resources?.ec2?.count ?? 0;

  const runningEC2 = useMemo(() => {
    return (
      overview?.resources?.ec2?.instances?.filter(
        (instance) =>
          instance.State?.Name === "running"
      ).length ?? 0
    );
  }, [overview]);

  const rdsCount =
    overview?.resources?.rds?.count ?? 0;

  const eksCount =
    overview?.resources?.eks?.count ?? 0;

  const s3Count =
    overview?.resources?.s3?.count ?? 0;

  const vpcCount =
    overview?.resources?.vpc?.count ?? 0;

  const totalResources =
    analysis?.summary?.totalResources ??
    ec2Count +
      rdsCount +
      eksCount +
      s3Count +
      vpcCount;

  const critical =
    analysis?.summary?.critical ?? 0;

  const warnings =
    analysis?.summary?.warnings ?? 0;

  const healthy =
    analysis?.summary?.healthy ?? 0;

  const info =
    analysis?.summary?.info ?? 0;

  const totalFindings =
    analysis?.summary?.totalFindings ?? 0;

  const cloudHealth =
    error
      ? 0
      : totalResources > 0
        ? Math.max(
            0,
            Math.round(
              100 -
                critical * 25 -
                warnings * 8
            )
          )
        : 0;

  const currentCost =
    costs?.totalCost ?? 0;

  const dailyAverage =
    costs?.dailyCosts &&
    costs.dailyCosts.length > 0
      ? currentCost / costs.dailyCosts.length
      : 0;

  const projectedCost =
    dailyAverage * 30;

  const currency =
    costs?.currency ?? "USD";

  const formatCurrency = (
    value: number
  ) => {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }
    ).format(value);
  };

  const services = [
    [
      "EC2",
      `${ec2Count} Instances`,
      runningEC2 > 0
        ? "Operational"
        : ec2Count > 0
          ? "Stopped"
          : "No resources",
      runningEC2 > 0,
    ],
    [
      "RDS",
      `${rdsCount} Databases`,
      rdsCount > 0
        ? "Healthy"
        : "No resources",
      rdsCount > 0,
    ],
    [
      "VPC",
      `${vpcCount} Networks`,
      vpcCount > 0
        ? "Stable"
        : "No resources",
      vpcCount > 0,
    ],
    [
      "EKS",
      `${eksCount} Clusters`,
      eksCount > 0
        ? "Healthy"
        : "No resources",
      eksCount > 0,
    ],
    [
      "S3",
      `${s3Count} Buckets`,
      s3Count > 0
        ? "Healthy"
        : "No resources",
      s3Count > 0,
    ],
  ] as const;

  const cards = [
    {
      title: "Cloud Health",
      value: loading
        ? "..."
        : `${cloudHealth}%`,
      status:
        cloudHealth >= 90
          ? "Healthy"
          : cloudHealth >= 70
            ? "Attention"
            : "Critical",
      icon: Cloud,
    },
    {
      title: "Active Servers",
      value: loading
        ? "..."
        : String(runningEC2),
      status:
        runningEC2 > 0
          ? "Operational"
          : "No running servers",
      icon: Server,
    },
    {
      title: "Database",
      value: loading
        ? "..."
        : String(rdsCount),
      status:
        rdsCount > 0
          ? "Connected"
          : "No RDS detected",
      icon: Database,
    },
    {
      title: "Current Spend",
      value: loading
        ? "..."
        : formatCurrency(currentCost),
      status:
        costs?.success
          ? "Live billing"
          : "Unavailable",
      icon: DollarSign,
    },
  ];

  const severityIcon = (
    severity: Finding["severity"]
  ) => {
    if (severity === "critical") {
      return (
        <AlertTriangle className="h-4 w-4 text-[#FA4A0D]" />
      );
    }

    if (severity === "warning") {
      return (
        <AlertTriangle className="h-4 w-4 text-amber-400" />
      );
    }

    if (severity === "healthy") {
      return (
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      );
    }

    return (
      <Info className="h-4 w-4 text-[#B7D1C5]" />
    );
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#080d1d] shadow-2xl shadow-blue-950/30">

        {/* HEADER */}

        <div className="border-b border-white/10 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-cyan-300">
                <Activity className="h-4 w-4" />
                OpsMind Command Center
              </div>

              <h2 className="mt-3 text-2xl font-semibold">
                Infrastructure Intelligence
              </h2>

              <p className="mt-2 text-sm text-[#777C85]">
                Real-time visibility across your AWS environment.
              </p>

              {overview?.region && (
                <p className="mt-2 text-xs text-slate-600">
                  AWS Region: {overview.region}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">

              <button
                onClick={() => {
                  loadDashboard();
                  runAnalysis();
                }}
                disabled={loading || analysing}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0B0B0B]/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    loading || analysing
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh
              </button>

              <div
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs ${
                  error
                    ? "border-red-400/20 bg-red-400/5 text-red-300"
                    : "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    error
                      ? "bg-red-400"
                      : "bg-emerald-400"
                  }`}
                />

                {error
                  ? "AWS Connection Issue"
                  : loading
                    ? "Syncing AWS"
                    : "AWS Systems Operational"}
              </div>

            </div>
          </div>
        </div>

        {/* METRIC CARDS */}

        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4 sm:p-8">

          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="group rounded-[20px] border border-white/10 bg-[#0B0B0B]/[0.025] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-cyan-400/[0.035]"
              >
                <div className="flex items-center justify-between">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0B0B0B]/[0.04]">
                    <Icon className="h-5 w-5 text-cyan-300" />
                  </div>

                  <span className="text-[11px] text-emerald-300">
                    {card.status}
                  </span>

                </div>

                <div className="mt-6 text-3xl font-semibold tracking-tight">
                  {card.value}
                </div>

                <div className="mt-2 text-xs text-[#777C85]">
                  {card.title}
                </div>
              </div>
            );
          })}

        </div>

        {/* CLOUD SERVICES */}

        <div className="grid gap-4 px-6 pb-6 lg:grid-cols-[1.4fr_0.6fr] sm:px-8 sm:pb-8">

          <div className="rounded-[20px] border border-white/10 bg-[#0B0B0B]/[0.025] p-6">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#777C85]">
                  Infrastructure
                </p>

                <h3 className="mt-2 font-semibold">
                  Live Cloud Services
                </h3>
              </div>

              <ShieldCheck className="h-5 w-5 text-emerald-300" />

            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

              {services.map(
                ([
                  name,
                  detail,
                  status,
                  healthyService,
                ]) => (
                  <div
                    key={name}
                    className="rounded-xl border border-white/5 bg-black/20 p-4"
                  >

                    <div className="flex items-center justify-between">

                      <span className="text-sm font-medium">
                        {name}
                      </span>

                      <span
                        className={`h-2 w-2 rounded-full ${
                          healthyService
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        }`}
                      />

                    </div>

                    <p className="mt-2 text-xs text-[#777C85]">
                      {detail}
                    </p>

                    <p
                      className={`mt-3 text-[11px] ${
                        healthyService
                          ? "text-emerald-300"
                          : "text-amber-300"
                      }`}
                    >
                      {status}
                    </p>

                  </div>
                )
              )}

            </div>
          </div>

          {/* COST SNAPSHOT */}

          <div className="rounded-[20px] border border-[#F6E8DF]/10 bg-[#F6E8DF]/[0.04] p-6">

            <div className="flex items-center gap-2 text-cyan-300">

              <DollarSign className="h-4 w-4" />

              <span className="text-xs font-semibold uppercase tracking-wider">
                Cost Intelligence
              </span>

            </div>

            <div className="mt-6 space-y-4">

              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs text-[#777C85]">
                  Current Spend
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {formatCurrency(currentCost)}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs text-[#777C85]">
                  Daily Average
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {formatCurrency(dailyAverage)}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs text-[#777C85]">
                  30-Day Run Rate
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {formatCurrency(projectedCost)}
                </p>
              </div>

            </div>

          </div>
        </div>

        {/* OPSMIND INTELLIGENCE */}

        <div className="border-t border-white/10 px-6 py-6 sm:px-8">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>

              <div className="flex items-center gap-2 text-cyan-300">

                <Zap className="h-4 w-4" />

                <span className="text-xs font-semibold uppercase tracking-wider">
                  OpsMind Intelligence
                </span>

              </div>

              <h3 className="mt-2 text-lg font-semibold">
                Infrastructure Analysis
              </h3>

              <p className="mt-1 text-xs text-[#777C85]">
                Automated analysis of your connected AWS environment.
              </p>

            </div>

            <button
              onClick={runAnalysis}
              disabled={analysing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/10 disabled:opacity-50"
            >
              {analysing && (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              )}

              {analysing
                ? "Analysing..."
                : "Analyse Environment"}

              {!analysing && (
                <Bell className="h-3.5 w-3.5" />
              )}
            </button>

          </div>

          {/* SUMMARY */}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <p className="text-[11px] text-[#777C85]">
                Resources
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {totalResources}
              </p>
            </div>

            <div className="rounded-xl border border-red-400/10 bg-red-400/[0.03] p-4">
              <p className="text-[11px] text-red-300">
                Critical
              </p>
              <p className="mt-2 text-2xl font-semibold text-red-300">
                {critical}
              </p>
            </div>

            <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.03] p-4">
              <p className="text-[11px] text-amber-300">
                Warnings
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-300">
                {warnings}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-4">
              <p className="text-[11px] text-emerald-300">
                Healthy
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">
                {healthy}
              </p>
            </div>

            <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
              <p className="text-[11px] text-cyan-300">
                Information
              </p>
              <p className="mt-2 text-2xl font-semibold text-cyan-300">
                {info}
              </p>
            </div>

          </div>

          {/* FINDINGS */}

          <div className="mt-6 space-y-3">

            {analysis?.findings &&
            analysis.findings.length > 0 ? (
              analysis.findings.map((finding) => (
                <div
                  key={finding.id}
                  className="rounded-[20px] border border-white/10 bg-black/20 p-5 transition hover:border-cyan-400/20"
                >

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                    <div className="flex gap-3">

                      <div className="mt-0.5">
                        {severityIcon(
                          finding.severity
                        )}
                      </div>

                      <div>

                        <div className="flex flex-wrap items-center gap-2">

                          <h4 className="text-sm font-semibold">
                            {finding.title}
                          </h4>

                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#777C85]">
                            {finding.service}
                          </span>

                        </div>

                        <p className="mt-2 text-xs leading-5 text-[#777C85]">
                          {finding.description}
                        </p>

                        <div className="mt-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-3">

                          <p className="text-[10px] uppercase tracking-wider text-cyan-300">
                            Recommended Action
                          </p>

                          <p className="mt-1 text-xs leading-5 text-[#9B9B9B]">
                            {finding.recommendation}
                          </p>

                        </div>

                      </div>
                    </div>

                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-slate-600">
                      {finding.id}
                    </span>

                  </div>

                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-white/10 bg-black/20 p-6 text-center">

                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-400" />

                <p className="mt-3 text-sm font-medium">
                  {analysing
                    ? "OpsMind is analysing your environment..."
                    : "No analysis findings available yet."}
                </p>

                <p className="mt-1 text-xs text-[#777C85]">
                  Run an environment analysis to generate infrastructure insights.
                </p>

              </div>
            )}

          </div>

          {totalFindings > 0 && (
            <p className="mt-4 text-right text-[11px] text-slate-600">
              {totalFindings} analysis finding
              {totalFindings === 1 ? "" : "s"} generated
            </p>
          )}

        </div>

      </div>
    </section>
  );
}
