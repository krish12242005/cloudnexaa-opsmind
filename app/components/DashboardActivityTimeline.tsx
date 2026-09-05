"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  service: string;
  severity: "healthy" | "warning" | "critical" | "info";
  time: string;
};

export default function DashboardActivityTimeline() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadActivity() {
    try {
      const [doctorRes, incidentRes, remediationRes] =
        await Promise.all([
          fetch("/api/opsmind/doctor", { cache: "no-store" }),
          fetch("/api/opsmind/incidents", { cache: "no-store" }),
          fetch("/api/opsmind/remediation", { cache: "no-store" }),
        ]);

      const doctor = await doctorRes.json();
      const incidents = await incidentRes.json();
      const remediation = await remediationRes.json();

      const now = new Date();

      const next: ActivityItem[] = [];

      next.push({
        id: "activity-scan",
        title: "AWS environment scanned",
        description: `${doctor?.infrastructure?.ec2 ?? 0} EC2, ${doctor?.infrastructure?.s3 ?? 0} S3, ${doctor?.infrastructure?.rds ?? 0} RDS and ${doctor?.infrastructure?.eks ?? 0} EKS resources detected.`,
        service: "AWS",
        severity: "healthy",
        time: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });

      const warnings = doctor?.summary?.warnings ?? 0;

      if (warnings > 0) {
        next.push({
          id: "activity-warning",
          title: "Infrastructure warning detected",
          description: `${warnings} warning finding${warnings > 1 ? "s" : ""} require review.`,
          service: "OpsMind",
          severity: "warning",
          time: now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }

      for (const incident of (incidents?.incidents ?? []).slice(0, 3)) {
        next.push({
          id: incident.id,
          title: incident.title,
          description: incident.description,
          service: incident.service,
          severity:
            incident.severity === "critical"
              ? "critical"
              : incident.severity === "high"
                ? "critical"
                : incident.severity === "medium"
                  ? "warning"
                  : "info",
          time: "Live",
        });
      }

      if ((remediation?.summary?.total ?? 0) > 0) {
        next.push({
          id: "activity-remediation",
          title: "Remediation plan generated",
          description: `${remediation.summary.total} remediation workflow awaiting approval.`,
          service: "Remediation",
          severity: "info",
          time: "Live",
        });
      }

      setItems(next.slice(0, 7));
    } catch (error) {
      console.error("Activity timeline error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();

    const timer = setInterval(loadActivity, 30000);

    return () => clearInterval(timer);
  }, []);

  function Icon({
    severity,
  }: {
    severity: ActivityItem["severity"];
  }) {
    if (severity === "critical") {
      return <ShieldAlert size={17} />;
    }

    if (severity === "warning") {
      return <AlertTriangle size={17} />;
    }

    if (severity === "info") {
      return <Info size={17} />;
    }

    return <CheckCircle2 size={17} />;
  }

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#080808]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#B7D1C5]/15 bg-[#B7D1C5]/5 text-[#B7D1C5]">
            <Activity size={17} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[#F6E8DF]">
              Live Activity
            </h2>
            <p className="text-[11px] text-white/35">
              OpsMind cloud operations timeline
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadActivity}
          className="rounded-lg border border-white/[0.08] p-2 text-white/40 transition hover:bg-white/[0.05] hover:text-white"
          title="Refresh activity"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {loading ? (
          <div className="px-5 py-8 text-center text-xs text-white/35">
            Loading live activity...
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-white/35">
            No activity available.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 px-5 py-4 transition hover:bg-white/[0.02]"
            >
              <div
                className={[
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                  item.severity === "critical"
                    ? "border-red-400/20 bg-red-400/10 text-red-300"
                    : item.severity === "warning"
                      ? "border-[#FA4A0D]/20 bg-[#FA4A0D]/10 text-[#FA4A0D]"
                      : item.severity === "info"
                        ? "border-blue-400/20 bg-blue-400/10 text-blue-300"
                        : "border-[#B7D1C5]/20 bg-[#B7D1C5]/10 text-[#B7D1C5]",
                ].join(" ")}
              >
                <Icon severity={item.severity} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-[#F6E8DF]">
                    {item.title}
                  </h3>

                  <span className="text-[10px] font-mono text-white/25">
                    {item.time}
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-white/40">
                  {item.description}
                </p>

                <div className="mt-2 text-[10px] uppercase tracking-wider text-white/25">
                  {item.service} · {item.severity}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
