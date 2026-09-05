"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Cloud,
  Database,
  Gauge,
  Layers,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type ApiData = Record<string, any>;

function n(value: unknown) {
  const x = Number(value);
  return Number.isFinite(x) ? x : 0;
}

export default function OperationsPage() {
  const router = useRouter();

  const [overview, setOverview] = useState<ApiData | null>(null);
  const [analysis, setAnalysis] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setRefreshing(true);
      setError("");

      const [a, b] = await Promise.all([
        fetch("/api/aws/overview", { cache: "no-store" }),
        fetch("/api/opsmind/analyze", { cache: "no-store" }),
      ]);

      const overviewData = await a.json();
      const analysisData = await b.json();

      if (!a.ok || !overviewData?.success) {
        throw new Error(
          overviewData?.error || "Unable to load AWS overview"
        );
      }

      setOverview(overviewData);
      setAnalysis(analysisData);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load operations data"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const resources = overview?.resources ?? {};

  const ec2 = n(resources?.ec2?.count);
  const s3 = n(resources?.s3?.count);
  const rds = n(resources?.rds?.count);
  const eks = n(resources?.eks?.count);
  const vpc = n(resources?.vpc?.count);

  const total = ec2 + s3 + rds + eks + vpc;

  const critical = n(analysis?.summary?.critical);
  const warnings = n(analysis?.summary?.warnings);
  const healthy = n(analysis?.summary?.healthy);
  const info = n(analysis?.summary?.info);

  const score = Math.max(
    0,
    Math.min(
      100,
      100 - critical * 30 - warnings * 10
    )
  );

  const healthLabel = useMemo(() => {
    if (score >= 90) return "Healthy";
    if (score >= 70) return "Review recommended";
    return "Attention required";
  }, [score]);

  const resourceRows = [
    ["EC2", ec2],
    ["S3", s3],
    ["RDS", rds],
    ["EKS", eks],
    ["VPC", vpc],
  ] as const;

  return (
    <main className="min-h-screen bg-[#040404] text-[#F6E8DF]">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">

        <header className="flex flex-col gap-5 border-b border-white/[0.07] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#666]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FA4A0D]" />
              Cloud Operations
              <span className="text-[#444]">/</span>
              Operations Center
            </div>

            <h1 className="text-[38px] font-semibold tracking-[-0.055em] sm:text-[46px]">
              Operations Center
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-[#777]">
              Unified operational visibility across infrastructure,
              findings and cloud health.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.025] px-4 py-2.5 text-xs text-[#CFC5BF] transition hover:bg-white/[0.05] disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </header>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-4 text-xs text-red-300">
            {error}
          </div>
        )}

        <section className="mt-5 grid gap-4 lg:grid-cols-12">

          <div className="rounded-[24px] border border-white/[0.08] bg-[#090909] p-6 lg:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
                  System Health
                </p>
                <h2 className="mt-2 text-lg font-medium">
                  {loading ? "Analyzing..." : healthLabel}
                </h2>
              </div>

              <Gauge
                size={19}
                className="text-[#B7D1C5]"
              />
            </div>

            <div className="mt-8 flex justify-center">
              <div
                className="flex h-44 w-44 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#B7D1C5 ${
                    score * 3.6
                  }deg, #242424 ${score * 3.6}deg)`,
                }}
              >
                <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-[#090909]">
                  <span className="text-5xl font-semibold">
                    {loading ? "—" : score}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-[#555]">
                    / 100
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-2 border-t border-white/[0.06] pt-5">
              <MiniStat label="Critical" value={critical} />
              <MiniStat label="Warning" value={warnings} />
              <MiniStat label="Healthy" value={healthy} />
              <MiniStat label="Info" value={info} />
            </div>
          </div>

          <div className="rounded-[24px] border border-white/[0.08] bg-[#090909] p-6 lg:col-span-8">

            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
                  AWS Environment
                </p>

                <h2 className="mt-2 text-lg font-medium">
                  Resource Overview
                </h2>
              </div>

              <Cloud
                size={19}
                className="text-[#B7D1C5]"
              />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {resourceRows.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4"
                >
                  <div className="flex items-center gap-2 text-[#777]">
                    {label === "EC2" && <Server size={14} />}
                    {label === "S3" && <Layers size={14} />}
                    {label === "RDS" && <Database size={14} />}
                    {label === "EKS" && <Activity size={14} />}
                    {label === "VPC" && <Cloud size={14} />}
                    <span className="text-[9px] uppercase tracking-wider">
                      {label}
                    </span>
                  </div>

                  <p className="mt-3 text-2xl font-semibold">
                    {loading ? "—" : value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-[#555]">
                  Total discovered resources
                </span>

                <span className="text-xl font-semibold">
                  {loading ? "—" : total}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">

          <ActionCard
            icon={<ShieldCheck size={17} />}
            title="Security Posture"
            description="Review security findings, exposure signals and cloud risk."
            button="Open Security"
            onClick={() => router.push("/security")}
          />

          <ActionCard
            icon={<AlertTriangle size={17} />}
            title="Incident Response"
            description="Investigate operational findings and active incidents."
            button="Open Incidents"
            onClick={() => router.push("/incidents")}
          />

          <ActionCard
            icon={<WrenchIcon />}
            title="Remediation"
            description="Review safe remediation plans before approval."
            button="Open Remediation"
            onClick={() => router.push("/remediation")}
          />

        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">

          <div className="rounded-[24px] border border-white/[0.08] bg-[#090909] p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
                  Intelligence
                </p>
                <h2 className="mt-2 text-lg font-medium">
                  Recommended Workflow
                </h2>
              </div>

              <Sparkles
                size={19}
                className="text-[#FA4A0D]"
              />
            </div>

            <div className="mt-6 space-y-3">
              {[
                ["Run Full Scan", "/scan"],
                ["Review Cloud Doctor", "/cloud-doctor"],
                ["Check Security", "/security"],
                ["Review Costs", "/costs"],
              ].map(([title, route]) => (
                <button
                  type="button"
                  key={route}
                  onClick={() => router.push(route)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.015] px-4 py-3 text-left transition hover:border-white/[0.15] hover:bg-white/[0.03]"
                >
                  <span className="text-xs text-[#D8CEC8]">
                    {title}
                  </span>
                  <ArrowRight
                    size={14}
                    className="text-[#555]"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/[0.08] bg-[#090909] p-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
              Control Plane
            </p>

            <h2 className="mt-2 text-lg font-medium">
              Operational Safety
            </h2>

            <div className="mt-6 space-y-3">
              <SafeRow
                label="AWS discovery"
                value="Live"
              />
              <SafeRow
                label="Analysis"
                value="Enabled"
              />
              <SafeRow
                label="Automation"
                value="Approval required"
              />
              <SafeRow
                label="Remediation"
                value="Dry-run"
              />
              <SafeRow
                label="Audit"
                value="Enabled"
              />
            </div>
          </div>

        </section>

        <footer className="mt-8 border-t border-white/[0.06] pt-5 text-[10px] text-[#444]">
          Cloudnexaa Technologies · OpsMind Operations Center
        </footer>

      </div>
    </main>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-[#555]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[#B7D1C5]">
        {value}
      </p>
    </div>
  );
}

function SafeRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 last:border-0">
      <span className="text-xs text-[#666]">
        {label}
      </span>
      <span className="flex items-center gap-2 text-[10px] text-[#B7D1C5]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#B7D1C5]" />
        {value}
      </span>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  button,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  button: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-[22px] border border-white/[0.08] bg-[#090909] p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#B7D1C5]/[0.06] text-[#B7D1C5]">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-medium text-[#D8CEC8]">
        {title}
      </h3>

      <p className="mt-2 text-[10px] leading-5 text-[#555]">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="mt-5 flex w-full items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[10px] text-[#999] transition hover:bg-white/[0.05]"
      >
        {button}
        <ArrowRight size={13} />
      </button>
    </div>
  );
}

function WrenchIcon() {
  return <span className="text-[14px]">⚙</span>;
}
