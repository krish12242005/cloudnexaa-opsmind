"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Gauge,
  Play,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

type Intelligence = {
  totalResources: number;
  totalFindings: number;
  critical: number;
  warnings: number;
  healthy: number;
  info: number;
  score: number;
};

type ControlResponse = {
  success?: boolean;
  region?: string;
  controls?: {
    readOnlyScan?: boolean;
    approvalRequired?: boolean;
    destructiveActions?: boolean;
    dryRunRemediation?: boolean;
    auditTrail?: boolean;
  };
};

export default function OpsMindControlCenter() {
  const router = useRouter();

  const [intelligence, setIntelligence] =
    useState<Intelligence | null>(null);

  const [control, setControl] =
    useState<ControlResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");

  async function loadIntelligence() {
    try {
      setLoading(true);
      setMessage("");

      const [analysisResponse, controlResponse] =
        await Promise.all([
          fetch("/api/opsmind/analyze", {
            cache: "no-store",
          }),
          fetch("/api/opsmind/control", {
            cache: "no-store",
          }),
        ]);

      const analysis = await analysisResponse.json();
      const controlData = await controlResponse.json();

      const critical =
        Number(analysis?.summary?.critical) || 0;

      const warnings =
        Number(analysis?.summary?.warnings) || 0;

      const healthy =
        Number(analysis?.summary?.healthy) || 0;

      const info =
        Number(analysis?.summary?.info) || 0;

      const findings =
        Number(analysis?.summary?.totalFindings) ||
        critical +
          warnings +
          healthy +
          info;

      const totalResources =
        Number(
          analysis?.summary?.totalResources
        ) || 0;

      const score = Math.max(
        0,
        Math.min(
          100,
          100 -
            critical * 30 -
            warnings * 10
        )
      );

      setIntelligence({
        totalResources,
        totalFindings: findings,
        critical,
        warnings,
        healthy,
        info,
        score,
      });

      setControl(controlData);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load OpsMind intelligence."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIntelligence();

    const handleRefresh = () => {
      loadIntelligence();
    };

    window.addEventListener(
      "opsmind:refresh",
      handleRefresh
    );

    return () => {
      window.removeEventListener(
        "opsmind:refresh",
        handleRefresh
      );
    };
  }, []);

  const status = useMemo(() => {
    if (!intelligence) return "Collecting intelligence";

    if (intelligence.critical > 0) {
      return "Critical attention required";
    }

    if (intelligence.warnings > 0) {
      return "Review recommended";
    }

    return "Environment operating normally";
  }, [intelligence]);

  async function runScan() {
    try {
      setScanning(true);
      setMessage("");

      const response = await fetch(
        "/api/opsmind/scan",
        {
          method: "POST",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Full scan failed"
        );
      }

      setMessage(
        `Scan completed${result?.scanId ? ` · ${result.scanId}` : ""}.`
      );

      window.dispatchEvent(
        new CustomEvent("opsmind:refresh")
      );

      router.push("/scan");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Full scan failed."
      );
    } finally {
      setScanning(false);
    }
  }

  const actions = [
    {
      title: "Full Environment Scan",
      description:
        "Analyze infrastructure, security, operations and cost signals.",
      icon: Radar,
      primary: true,
      action: runScan,
    },
    {
      title: "Infrastructure",
      description:
        "Inspect live EC2, S3, RDS, EKS and network resources.",
      icon: Cloud,
      action: () =>
        router.push("/infrastructure"),
    },
    {
      title: "Cloud Doctor",
      description:
        "Investigate findings and understand probable causes.",
      icon: Activity,
      action: () =>
        router.push("/cloud-doctor"),
    },
    {
      title: "Security Center",
      description:
        "Review cloud security posture and risk exposure.",
      icon: ShieldCheck,
      action: () =>
        router.push("/security"),
    },
    {
      title: "Remediation",
      description:
        "Review safe repair plans before approval.",
      icon: Wrench,
      action: () =>
        router.push("/remediation"),
    },
    {
      title: "Automation",
      description:
        "Review approval-first operational actions.",
      icon: Play,
      action: () =>
        router.push("/automation"),
    },
    {
      title: "Incidents",
      description:
        "Track operational problems and response timelines.",
      icon: AlertTriangle,
      action: () =>
        router.push("/incidents"),
    },
    {
      title: "Cost Intelligence",
      description:
        "Analyze spend, trends and optimization opportunities.",
      icon: Gauge,
      action: () =>
        router.push("/costs"),
    },
    {
      title: "Project Assessment",
      description:
        "Evaluate a public GitHub project for engineering maturity.",
      icon: Sparkles,
      action: () =>
        router.push("/assessment"),
    },
  ];

  return (
    <section className="rounded-[26px] border border-white/[0.08] bg-[#080808] p-5 sm:p-6">

      <div className="flex flex-col gap-5 border-b border-white/[0.06] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FA4A0D]/20 bg-[#FA4A0D]/[0.07]">
              <Gauge
                size={18}
                className="text-[#FA4A0D]"
              />
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.24em] text-[#555]">
                Cloud Operations Control Plane
              </p>

              <h2 className="mt-1 text-xl font-medium text-[#E8DDD7]">
                OpsMind Command Center
              </h2>
            </div>

          </div>

          <p className="mt-3 max-w-3xl text-xs leading-6 text-[#666]">
            One operational layer connecting cloud discovery,
            intelligence, security, incidents, remediation,
            automation and audit.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#777]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#B7D1C5]" />
          {control?.region || "ap-south-1"}
          <span className="text-[#444]">·</span>
          LIVE
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

        <Metric
          label="Cloud Health"
          value={
            loading
              ? "—"
              : `${intelligence?.score ?? 0}/100`
          }
        />

        <Metric
          label="Resources"
          value={
            loading
              ? "—"
              : String(
                  intelligence?.totalResources ?? 0
                )
          }
        />

        <Metric
          label="Findings"
          value={
            loading
              ? "—"
              : String(
                  intelligence?.totalFindings ?? 0
                )
          }
        />

        <Metric
          label="Warnings"
          value={
            loading
              ? "—"
              : String(
                  intelligence?.warnings ?? 0
                )
          }
        />

      </div>

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B7D1C5]/[0.06]">
              <CheckCircle2
                size={15}
                className="text-[#B7D1C5]"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-[#D8CEC8]">
                {status}
              </p>

              <p className="mt-1 text-[10px] text-[#555]">
                Read-only analysis · approval-first operations · audit enabled
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={loadIntelligence}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-[#9B9B9B] transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh Intelligence
          </button>

        </div>

      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs text-[#888]">
          {message}
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">

        {actions.map((item) => {
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.title}
              onClick={item.action}
              disabled={
                item.primary && scanning
              }
              className={[
                "group rounded-xl border p-4 text-left transition",
                item.primary
                  ? "border-[#FA4A0D]/20 bg-[#FA4A0D]/[0.055] hover:border-[#FA4A0D]/40 hover:bg-[#FA4A0D]/[0.08]"
                  : "border-white/[0.07] bg-white/[0.012] hover:border-white/[0.14] hover:bg-white/[0.025]",
              ].join(" ")}
            >

              <div className="flex items-start justify-between">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.025]">

                  <Icon
                    size={16}
                    className={
                      item.primary
                        ? "text-[#FA4A0D]"
                        : "text-[#B7D1C5]"
                    }
                  />

                </div>

                {item.primary ? (
                  <span className="text-[9px] uppercase tracking-[0.18em] text-[#FA4A0D]">
                    {scanning
                      ? "Scanning"
                      : "Run"}
                  </span>
                ) : (
                  <ArrowRight
                    size={14}
                    className="text-[#444] transition group-hover:translate-x-0.5 group-hover:text-[#888]"
                  />
                )}

              </div>

              <p className="mt-4 text-sm font-medium text-[#D8CEC8]">
                {item.title}
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#555]">
                {item.description}
              </p>

            </button>
          );
        })}

      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">

        <SafetyItem
          label="AWS Connection"
          value="Connected"
        />

        <SafetyItem
          label="Scanning"
          value={
            control?.controls?.readOnlyScan !== false
              ? "Read-only"
              : "Review"
          }
        />

        <SafetyItem
          label="Automation"
          value="Approval required"
        />

        <SafetyItem
          label="Remediation"
          value="Dry-run"
        />

      </div>

    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
      <p className="text-[9px] uppercase tracking-[0.18em] text-[#555]">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold text-[#E8DDD7]">
        {value}
      </p>
    </div>
  );
}

function SafetyItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
      <span className="text-[10px] text-[#555]">
        {label}
      </span>

      <span className="flex items-center gap-2 text-[10px] text-[#B7D1C5]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#B7D1C5]" />
        {value}
      </span>
    </div>
  );
}
