"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

type AutomationAction = {
  id: string;
  service: string;
  action: string;
  targetCount: number;
  risk: "low" | "medium" | "high";
  status: "pending_approval" | "ready";
  description: string;
  mode?: "dry-run";
  approvalRequired?: boolean;
};

type AutomationResponse = {
  success?: boolean;
  region?: string;
  actions?: AutomationAction[];
  summary?: {
    totalActions?: number;
    pendingApproval?: number;
    ready?: number;
  };
  error?: string;
};

type ApprovalStatus =
  | "pending_approval"
  | "validated"
  | "approved"
  | "rejected";

type ApprovalRecord = {
  id: string;
  automationId: string;
  action: string;
  service: string;
  targetCount: number;
  risk: "low" | "medium" | "high";
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
};

type ApprovalResponse = {
  success?: boolean;
  approvals?: ApprovalRecord[];
  error?: string;
};

function riskStyle(risk: string) {
  if (risk === "high") {
    return {
      badge: "border-red-400/20 bg-red-400/[0.05] text-red-300",
      icon: "text-red-300",
    };
  }

  if (risk === "medium") {
    return {
      badge: "border-amber-400/20 bg-amber-400/[0.05] text-amber-300",
      icon: "text-amber-300",
    };
  }

  return {
    badge: "border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-300",
    icon: "text-emerald-300",
  };
}

function statusStyle(status: string) {
  switch (status) {
    case "validated":
      return "border-sky-400/20 bg-sky-400/[0.04] text-sky-300";

    case "approved":
      return "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-300";

    case "rejected":
      return "border-red-400/20 bg-red-400/[0.04] text-red-300";

    case "pending_approval":
      return "border-amber-400/20 bg-amber-400/[0.04] text-amber-300";

    default:
      return "border-white/10 bg-white/[0.03] text-[#9B9B9B]";
  }
}

function formatStatus(status?: string) {
  if (!status) return "Pending approval";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AutomationPage() {
  const [data, setData] = useState<AutomationResponse | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selected, setSelected] =
    useState<AutomationAction | null>(null);

  const loadAutomation = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [automationRes, approvalRes] = await Promise.all([
        fetch("/api/opsmind/automation", {
          cache: "no-store",
        }),
        fetch("/api/opsmind/automation/approval", {
          cache: "no-store",
        }),
      ]);

      const [automationData, approvalData] = await Promise.all([
        automationRes.json(),
        approvalRes.json(),
      ]);

      if (!automationRes.ok || !automationData?.success) {
        throw new Error(
          automationData?.error ||
            "Unable to load automation intelligence"
        );
      }

      if (!approvalRes.ok || !approvalData?.success) {
        throw new Error(
          approvalData?.error ||
            "Unable to load approval state"
        );
      }

      setData(automationData);
      setApprovals(approvalData.approvals ?? []);
    } catch (err) {
      console.error("Automation load error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load automation intelligence"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAutomation();

    const interval = setInterval(() => {
      loadAutomation();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadAutomation]);

  const actions = data?.actions ?? [];

  const summary = useMemo(
    () =>
      data?.summary ?? {
        totalActions: 0,
        pendingApproval: 0,
        ready: 0,
      },
    [data]
  );

  function getApproval(actionId: string) {
    return approvals.find(
      (item) => item.automationId === actionId
    );
  }

  async function approvalRequest(
    operation: "validate" | "approve" | "reject"
  ) {
    if (!selected) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const existing = getApproval(selected.id);

      if (
        operation === "approve" &&
        existing?.status !== "validated"
      ) {
        throw new Error(
          "Validate the action before approval."
        );
      }

      const response = await fetch(
        "/api/opsmind/automation/approval",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operation,
            automationId: selected.id,
            action: selected.action,
            service: selected.service,
            targetCount: selected.targetCount,
            risk: selected.risk,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Automation approval request failed"
        );
      }

      setMessage(result.message || "Operation completed.");

      await loadAutomation(true);
    } catch (err) {
      console.error("Automation approval error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Automation approval request failed"
      );
    } finally {
      setActionLoading(false);
    }
  }

  const selectedApproval = selected
    ? getApproval(selected.id)
    : undefined;

  return (
    <main className="min-h-screen bg-[#040404] px-4 py-6 text-[#F6E8DF] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-white/[0.07] pb-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[#B7D1C5]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#B7D1C5]/15 bg-[#B7D1C5]/[0.06]">
                  <Zap size={15} />
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-[0.26em]">
                  Automation / OpsMind
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Automate without losing control.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77716D] sm:text-base">
                OpsMind prepares infrastructure actions, records
                validation, manages approval state, and keeps execution
                behind a safety gate.
              </p>

              {data?.region && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11px] text-[#77716D]">
                  AWS Region
                  <span className="font-mono text-[#B7D1C5]">
                    {data.region}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => loadAutomation(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-xs font-medium text-[#D7CCC6] transition hover:border-white/15 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}

              {refreshing ? "Refreshing" : "Refresh queue"}
            </button>
          </div>
        </header>

        {error && (
          <section className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/[0.035] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

              <div>
                <p className="text-sm font-medium text-red-200">
                  Automation error
                </p>

                <p className="mt-1 text-xs leading-5 text-red-200/60">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {message && (
          <section className="mt-5 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.025] p-5">
            <div className="flex items-center gap-3 text-sm text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              {message}
            </div>
          </section>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Recommended Actions"
            value={loading ? "—" : summary.totalActions ?? 0}
            icon={<Zap size={17} />}
            tone="neutral"
          />

          <StatCard
            label="Pending Approval"
            value={loading ? "—" : summary.pendingApproval ?? 0}
            icon={<Clock3 size={17} />}
            tone="amber"
          />

          <StatCard
            label="Low Risk / Ready"
            value={loading ? "—" : summary.ready ?? 0}
            icon={<CheckCircle2 size={17} />}
            tone="green"
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#080808]">
          <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-semibold">
                Automation queue
              </h2>

              <p className="mt-1 text-xs leading-5 text-[#625D59] sm:text-sm">
                Live recommendations generated from the connected AWS
                environment.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#B7D1C5]" />

              <p className="mt-4 text-sm text-[#AAA09A]">
                Generating automation plan...
              </p>
            </div>
          ) : actions.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025]">
                <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              </div>

              <h3 className="mt-4 text-sm font-medium">
                No automation actions required
              </h3>

              <p className="mt-2 max-w-md text-xs leading-5 text-[#625D59]">
                OpsMind did not identify an action that requires approval
                right now.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {actions.map((action) => {
                const risk = riskStyle(action.risk);
                const approval = getApproval(action.id);

                return (
                  <article
                    key={action.id}
                    className="p-5 transition hover:bg-white/[0.018] sm:p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
                          <PlayCircle
                            className={`h-5 w-5 ${risk.icon}`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-[#E3D8D2]">
                              {action.action}
                            </h3>

                            <span
                              className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${risk.badge}`}
                            >
                              {action.risk} risk
                            </span>
                          </div>

                          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#77716D]">
                            {action.description}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Meta
                              label="Service"
                              value={action.service}
                            />

                            <Meta
                              label="Targets"
                              value={String(action.targetCount)}
                            />

                            <Meta
                              label="Mode"
                              value={action.mode || "dry-run"}
                            />

                            <span
                              className={`rounded-lg border px-2.5 py-1 text-[10px] ${statusStyle(
                                approval?.status ||
                                  action.status
                              )}`}
                            >
                              {formatStatus(
                                approval?.status ||
                                  action.status
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelected(action);
                          setError("");
                          setMessage("");
                        }}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#B7D1C5]/12 bg-[#B7D1C5]/[0.05] px-4 py-3 text-xs font-semibold text-[#B7D1C5] transition hover:bg-[#B7D1C5]/[0.09]"
                      >
                        <ShieldCheck size={15} />
                        Review action
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-amber-400/10 bg-amber-400/[0.022] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />

            <div>
              <p className="text-sm font-medium text-[#DDD2CC]">
                Safety control plane
              </p>

              <p className="mt-1 text-xs leading-5 text-[#716A66]">
                Validation and approval are persisted. Approval never
                executes an AWS change automatically; the execution step
                remains explicitly gated.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Detect",
                  "Validate",
                  "Approve / Reject",
                  "Execution Gate",
                ].map((step) => (
                  <span
                    key={step}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.018] px-3 py-1.5 text-[10px] text-[#77716D]"
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-white/[0.06] py-6 text-center text-[10px] text-[#48433F]">
          Cloudnexaa Technologies <span className="px-1.5">•</span> OpsMind
          Safe Automation Engine
        </footer>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => {
            if (!actionLoading) {
              setSelected(null);
              setError("");
              setMessage("");
            }
          }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#090909] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B7D1C5]">
                  Automation review
                </p>

                <h2 className="mt-2 text-xl font-semibold text-[#F0E5DF] sm:text-2xl">
                  {selected.action}
                </h2>

                <p className="mt-1 text-xs text-[#625D59]">
                  {selected.service} <span className="px-1">•</span>{" "}
                  {selected.targetCount} target
                  {selected.targetCount === 1 ? "" : "s"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setError("");
                  setMessage("");
                }}
                disabled={actionLoading}
                className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2 text-[#77716D] transition hover:bg-white/[0.06] hover:text-[#F6E8DF] disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-auto p-5 sm:p-6">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#514C48]">
                  Description
                </p>

                <p className="mt-2 text-sm leading-6 text-[#8A827D]">
                  {selected.description}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Detail
                  label="Service"
                  value={selected.service}
                />

                <Detail
                  label="Targets"
                  value={String(selected.targetCount)}
                />

                <Detail
                  label="Risk"
                  value={selected.risk}
                />

                <Detail
                  label="Mode"
                  value={selected.mode || "dry-run"}
                />
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#514C48]">
                      Approval state
                    </p>

                    <p className="mt-2 text-sm font-medium text-[#D9CEC8]">
                      {formatStatus(
                        selectedApproval?.status ||
                          selected.status
                      )}
                    </p>
                  </div>

                  <span
                    className={`rounded-lg border px-3 py-1.5 text-[10px] ${statusStyle(
                      selectedApproval?.status ||
                        selected.status
                    )}`}
                  >
                    {selectedApproval?.status ||
                      selected.status}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-400/10 bg-amber-400/[0.025] p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />

                  <div>
                    <p className="text-xs font-medium text-amber-200/85">
                      Execution protection
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-amber-100/35">
                      Approving this action does not modify, stop,
                      terminate, delete, restart, or otherwise change AWS
                      resources. Execution remains behind a separate gate.
                    </p>
                  </div>
                </div>
              </div>

              {message && (
                <div className="mt-4 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025] p-4">
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 size={15} />
                    {message}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-400/10 bg-red-400/[0.025] p-4">
                  <div className="flex items-center gap-2 text-xs text-red-300">
                    <XCircle size={15} />
                    {error}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06] p-5 sm:p-6">
              {!selectedApproval ||
              selectedApproval.status === "pending_approval" ||
              selected.status === "pending_approval" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => approvalRequest("reject")}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/15 bg-red-400/[0.035] px-4 py-3 text-xs font-semibold text-red-300 transition hover:bg-red-400/[0.06] disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle size={15} />
                    )}
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => approvalRequest("validate")}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F6E8DF] px-4 py-3 text-xs font-bold text-black transition hover:opacity-90 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    Validate & Audit
                  </button>
                </div>
              ) : selectedApproval.status === "validated" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => approvalRequest("reject")}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/15 bg-red-400/[0.035] px-4 py-3 text-xs font-semibold text-red-300 transition hover:bg-red-400/[0.06] disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => approvalRequest("approve")}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-xs font-bold text-black transition hover:bg-emerald-300 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck size={15} />
                    )}
                    Approve action
                  </button>
                </div>
              ) : selectedApproval.status === "approved" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025] px-4 py-3 text-xs text-emerald-300">
                    <CheckCircle2 size={15} />
                    Approved. Execution remains gated.
                  </div>

                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs font-semibold text-[#57514D]"
                  >
                    <ShieldCheck size={15} />
                    Execution Gate — Not Enabled
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-red-400/10 bg-red-400/[0.025] px-4 py-3 text-xs text-red-300">
                    <XCircle size={15} />
                    This automation action has been rejected.
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="w-full rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-medium text-[#AAA09A]"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: "neutral" | "amber" | "green";
}) {
  const toneClasses = {
    neutral: {
      wrapper: "border-white/[0.07] bg-white/[0.018]",
      icon: "text-[#B7D1C5]",
    },
    amber: {
      wrapper: "border-amber-400/10 bg-amber-400/[0.022]",
      icon: "text-amber-300",
    },
    green: {
      wrapper: "border-emerald-400/10 bg-emerald-400/[0.02]",
      icon: "text-emerald-300",
    },
  };

  const current = toneClasses[tone];

  return (
    <div className={`rounded-2xl border p-5 ${current.wrapper}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#625D59]">
          {label}
        </span>

        <span className={current.icon}>{icon}</span>
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[10px] text-[#625D59]">
      {label}: <span className="text-[#88817C]">{value}</span>
    </span>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#514C48]">
        {label}
      </p>

      <p className="mt-2 truncate text-xs font-medium text-[#D6CBC5]">
        {value}
      </p>
    </div>
  );
}