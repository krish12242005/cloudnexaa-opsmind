"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

type Finding = {
  id: string;
  service: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  affectedResources?: number;
};

type DoctorData = {
  summary?: {
    score?: number;
    totalFindings?: number;
    critical?: number;
    warnings?: number;
    healthy?: number;
    info?: number;
  };
  findings?: Finding[];
};

type RemediationData = {
  remediations?: {
    id: string;
    service: string;
    action: string;
    targetCount: number;
    risk: string;
    mode: string;
    status: string;
    description: string;
  }[];
};

export default function DashboardV3Intelligence() {
  const router = useRouter();

  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  const [remediation, setRemediation] = useState<RemediationData | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [doctorRes, remediationRes] = await Promise.all([
          fetch("/api/opsmind/doctor", { cache: "no-store" }),
          fetch("/api/opsmind/remediation", { cache: "no-store" }),
        ]);

        const doctorData = await doctorRes.json();
        const remediationData = await remediationRes.json();

        if (active) {
          setDoctor(doctorData);
          setRemediation(remediationData);
        }
      } catch (error) {
        console.error("Dashboard V3 intelligence error:", error);
      }
    };

    load();

    const timer = setInterval(load, 30000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const summary = doctor?.summary;

  const score = summary?.score ?? 0;
  const findings = doctor?.findings ?? [];
  const recommendations = remediation?.remediations ?? [];

  const severityIcon = (severity: string) => {
    if (severity === "warning" || severity === "critical") {
      return <AlertTriangle size={16} />;
    }

    if (severity === "healthy") {
      return <CheckCircle2 size={16} />;
    }

    return <Info size={16} />;
  };

  return (
    <section className="mt-6 space-y-6">

      {/* Cloud Health */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#080808] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#B7D1C5]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Cloud Health
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#F6E8DF]">
              Infrastructure health overview
            </h2>

            <p className="mt-1 text-sm text-white/40">
              Live analysis from OpsMind.
            </p>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-4xl font-semibold text-[#F6E8DF]">
                {score}
                <span className="text-lg text-white/30">/100</span>
              </div>

              <div className="mt-1 text-xs text-[#B7D1C5]">
                {score >= 90 ? "Healthy" : score >= 70 ? "Review Recommended" : "Attention Required"}
              </div>
            </div>

            <div className="h-16 w-16 rounded-full border border-[#B7D1C5]/30 bg-[#B7D1C5]/10 flex items-center justify-center">
              <ShieldCheck size={25} className="text-[#B7D1C5]" />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">

          <HealthStat
            label="Critical"
            value={summary?.critical ?? 0}
            tone="danger"
          />

          <HealthStat
            label="Warnings"
            value={summary?.warnings ?? 0}
            tone="warning"
          />

          <HealthStat
            label="Healthy"
            value={summary?.healthy ?? 0}
            tone="healthy"
          />

          <HealthStat
            label="Info"
            value={summary?.info ?? 0}
            tone="neutral"
          />

        </div>
      </div>

      {/* Findings + Recommendations */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">

        {/* Findings */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#080808] p-6">

          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Recent Findings
              </div>

              <h3 className="mt-2 text-lg font-semibold text-[#F6E8DF]">
                OpsMind intelligence
              </h3>
            </div>

            <button
              type="button"
              onClick={() => router.push("/incidents")}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              View incidents
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="mt-5 space-y-2">

            {findings.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] p-5 text-sm text-white/40">
                No findings detected.
              </div>
            ) : (
              findings.map((finding) => (
                <div
                  key={finding.id}
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.03]"
                >
                  <div className="flex items-start gap-3">

                    <div
                      className={[
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                        finding.severity === "warning" ||
                        finding.severity === "critical"
                          ? "bg-[#FA4A0D]/10 text-[#FA4A0D]"
                          : finding.severity === "healthy"
                            ? "bg-[#B7D1C5]/10 text-[#B7D1C5]"
                            : "bg-white/[0.05] text-white/45",
                      ].join(" ")}
                    >
                      {severityIcon(finding.severity)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-medium text-white/85">
                          {finding.title}
                        </h4>

                        <span className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/35">
                          {finding.service}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-white/40">
                        {finding.description}
                      </p>

                      {finding.affectedResources !== undefined && (
                        <div className="mt-2 text-[11px] text-white/30">
                          {finding.affectedResources} affected resource
                          {finding.affectedResources === 1 ? "" : "s"}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ))
            )}

          </div>
        </div>

        {/* Recommendations */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#080808] p-6">

          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
            OpsMind Recommendations
          </div>

          <h3 className="mt-2 text-lg font-semibold text-[#F6E8DF]">
            Safe actions
          </h3>

          <p className="mt-1 text-xs leading-5 text-white/35">
            Recommendations are generated in dry-run mode. No AWS changes are executed automatically.
          </p>

          <div className="mt-5 space-y-3">

            {recommendations.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] p-5 text-sm text-white/40">
                No remediation required.
              </div>
            ) : (
              recommendations.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#FA4A0D]/15 bg-[#FA4A0D]/[0.035] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[#FA4A0D]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#FA4A0D]">
                      {item.risk} risk
                    </span>

                    <span className="text-[10px] uppercase tracking-wider text-white/30">
                      {item.mode}
                    </span>
                  </div>

                  <h4 className="mt-4 text-sm font-medium text-[#F6E8DF]">
                    {item.action}
                  </h4>

                  <p className="mt-2 text-xs leading-5 text-white/40">
                    {item.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-white/35">
                      {item.targetCount} target resource
                      {item.targetCount === 1 ? "" : "s"}
                    </span>

                    <button
                      type="button"
                      onClick={() => router.push("/remediation")}
                      className="flex items-center gap-2 rounded-xl bg-[#F6E8DF] px-3 py-2 text-xs font-semibold text-[#040404] transition hover:opacity-90"
                    >
                      Review
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}

          </div>
        </div>

      </div>
    </section>
  );
}

function HealthStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "danger" | "warning" | "healthy" | "neutral";
}) {
  const toneClass = {
    danger: "text-[#FA4A0D]",
    warning: "text-[#FA4A0D]",
    healthy: "text-[#B7D1C5]",
    neutral: "text-white/65",
  }[tone];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
      <div className="text-[10px] uppercase tracking-[0.15em] text-white/30">
        {label}
      </div>

      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
