"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

type Remediation = {
  id: string;
  service: string;
  action: string;
  targetCount: number;
  risk: "low" | "medium" | "high";
  mode: "dry-run";
  approvalRequired: boolean;
  status: string;
  description: string;
};

type RemediationResponse = {
  success?: boolean;
  region?: string;
  generatedAt?: string;
  remediations?: Remediation[];
  summary?: {
    total?: number;
    pendingApproval?: number;
    dryRun?: number;
  };
  error?: string;
};

type ApprovalRecord = {
  id: string;
  remediationId: string;
  service: string;
  action: string;
  targetCount: number;
  risk: "low" | "medium" | "high";
  status:
    | "pending_approval"
    | "dry_run"
    | "approved"
    | "rejected";
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
};

function riskStyle(risk: string) {
  if (risk === "high") {
    return {
      icon: "text-red-300",
      badge: "border-red-400/20 bg-red-400/[0.04] text-red-300",
    };
  }

  if (risk === "medium") {
    return {
      icon: "text-amber-300",
      badge:
        "border-amber-400/20 bg-amber-400/[0.04] text-amber-300",
    };
  }

  return {
    icon: "text-emerald-300",
    badge:
      "border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-300",
  };
}

function statusStyle(status: string) {
  switch (status) {
    case "dry_run":
      return "border-sky-400/15 bg-sky-400/[0.035] text-sky-300";

    case "approved":
      return "border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-300";

    case "rejected":
      return "border-red-400/15 bg-red-400/[0.035] text-red-300";

    case "pending_approval":
      return "border-amber-400/15 bg-amber-400/[0.035] text-amber-300";

    default:
      return "border-white/[0.08] bg-white/[0.02] text-[#817A75]";
  }
}

function formatStatus(status?: string) {
  if (!status) return "Pending approval";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function RemediationPage() {
  const [data, setData] =
    useState<RemediationResponse | null>(null);

  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selected, setSelected] =
    useState<Remediation | null>(null);

  const [filter, setFilter] = useState("all");

  const loadRemediation = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [remediationRes, approvalRes] = await Promise.all([
        fetch("/api/opsmind/remediation", {
          cache: "no-store",
        }),
        fetch("/api/opsmind/remediation/approval", {
          cache: "no-store",
        }),
      ]);

      const [remediationData, approvalData] =
        await Promise.all([
          remediationRes.json(),
          approvalRes.json(),
        ]);

      if (!remediationRes.ok || !remediationData?.success) {
        throw new Error(
          remediationData?.error ||
            "Unable to load remediation intelligence"
        );
      }

      if (!approvalRes.ok || !approvalData?.success) {
        throw new Error(
          approvalData?.error ||
            "Unable to load remediation approval state"
        );
      }

      setData(remediationData);
      setApprovals(approvalData.approvals ?? []);
    } catch (err) {
      console.error("Remediation load error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load remediation intelligence"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRemediation();

    const interval = setInterval(() => {
      loadRemediation();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadRemediation]);

  const remediations = data?.remediations ?? [];

  function getApproval(remediationId: string) {
    return approvals.find(
      (item) => item.remediationId === remediationId
    );
  }

  const filtered = useMemo(() => {
    if (filter === "all") {
      return remediations;
    }

    return remediations.filter((item) => {
      const approval = getApproval(item.id);

      const status =
        approval?.status || item.status || "pending_approval";

      return status === filter;
    });
  }, [remediations, approvals, filter]);

  const summary = {
    total: remediations.length,
    pending: remediations.filter((item) => {
      const approval = getApproval(item.id);
      return (
        (approval?.status || item.status) === "pending_approval"
      );
    }).length,
    dryRun: remediations.filter((item) => {
      const approval = getApproval(item.id);
      return (approval?.status || item.status) === "dry_run";
    }).length,
    approved: remediations.filter((item) => {
      const approval = getApproval(item.id);
      return approval?.status === "approved";
    }).length,
  };

  async function remediationAction(
    operation: "dry_run" | "approve" | "reject"
  ) {
    if (!selected) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const existing = getApproval(selected.id);

      if (
        operation === "approve" &&
        existing?.status !== "dry_run"
      ) {
        throw new Error(
          "Complete the dry-run before approval."
        );
      }

      const response = await fetch(
        "/api/opsmind/remediation/approval",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operation,
            remediationId: selected.id,
            service: selected.service,
            action: selected.action,
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
            "Remediation operation failed"
        );
      }

      setMessage(
        result.message || "Remediation state updated."
      );

      await loadRemediation(true);
    } catch (err) {
      console.error("Remediation action error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Remediation operation failed"
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
                  Remediation / OpsMind
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Fix with control.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77716D] sm:text-base">
                OpsMind identifies remediation opportunities, validates them
                with a dry-run, records audit events, and keeps execution
                behind an explicit approval gate.
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
              onClick={() => loadRemediation(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-xs font-medium text-[#D7CCC6] transition hover:border-white/15 hover:bg-white/[0.05] disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}

              {refreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </header>

        {error && (
          <section className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/[0.035] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

              <div>
                <p className="text-sm font-medium text-red-200">
                  Remediation error
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

        <section className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric
            label="Remediation Plans"
            value={loading ? "—" : summary.total}
            icon={<Zap size={16} />}
          />

          <Metric
            label="Pending Approval"
            value={loading ? "—" : summary.pending}
            icon={<Clock3 size={16} />}
          />

          <Metric
            label="Dry Runs"
            value={loading ? "—" : summary.dryRun}
            icon={<RefreshCw size={16} />}
          />

          <Metric
            label="Approved"
            value={loading ? "—" : summary.approved}
            icon={<CheckCircle2 size={16} />}
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#080808]">
          <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Remediation queue
              </h2>

              <p className="mt-1 text-xs leading-5 text-[#625D59] sm:text-sm">
                Safe remediation plans discovered by the current OpsMind
                analysis.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                ["all", "All"],
                ["pending_approval", "Pending"],
                ["dry_run", "Dry Run"],
                ["approved", "Approved"],
                ["rejected", "Rejected"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-lg px-3 py-2 text-[10px] font-medium transition ${
                    filter === value
                      ? "bg-[#F6E8DF] text-[#080808]"
                      : "border border-white/[0.06] bg-white/[0.02] text-[#6D6661] hover:bg-white/[0.05] hover:text-[#C8BDB7]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#B7D1C5]" />

                <p className="mt-4 text-sm text-[#AAA09A]">
                  Generating remediation plans...
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.012] text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />

                <p className="mt-4 text-sm font-medium text-[#D6CBC5]">
                  No remediation items
                </p>

                <p className="mt-1 max-w-md text-xs leading-5 text-[#625D59]">
                  No remediation plans match the current filter.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((item) => {
                  const approval = getApproval(item.id);

                  const effectiveStatus =
                    approval?.status ||
                    item.status ||
                    "pending_approval";

                  const risk = riskStyle(item.risk);

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.025] sm:p-5"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
                            <Zap
                              className={`h-5 w-5 ${risk.icon}`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-[#E0D5CF]">
                                {item.action}
                              </h3>

                              <span
                                className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${risk.badge}`}
                              >
                                {item.risk} risk
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-6 text-[#746D68]">
                              {item.description}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Meta
                                label="Service"
                                value={item.service}
                              />

                              <Meta
                                label="Targets"
                                value={String(item.targetCount)}
                              />

                              <Meta
                                label="Mode"
                                value={item.mode}
                              />

                              <span
                                className={`rounded-lg border px-2.5 py-1 text-[10px] ${statusStyle(
                                  effectiveStatus
                                )}`}
                              >
                                {formatStatus(effectiveStatus)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelected(item);
                            setError("");
                            setMessage("");
                          }}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#B7D1C5]/12 bg-[#B7D1C5]/[0.045] px-4 py-3 text-xs font-semibold text-[#B7D1C5] transition hover:bg-[#B7D1C5]/[0.08]"
                        >
                          <ShieldCheck size={15} />
                          Review
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-orange-400/10 bg-orange-400/[0.02] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-300" />

            <div>
              <p className="text-sm font-medium text-[#DCD1CB]">
                Safe remediation control
              </p>

              <p className="mt-1 text-xs leading-5 text-[#716A65]">
                Every remediation is treated as a dry-run first. Approval
                creates an auditable decision, while actual AWS execution
                remains disabled behind a separate execution gate.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Detect",
                  "Dry Run",
                  "Audit",
                  "Approve / Reject",
                  "Execution Gate",
                ].map((step) => (
                  <span
                    key={step}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.018] px-3 py-1.5 text-[10px] text-[#706963]"
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-white/[0.06] py-6 text-center text-[10px] text-[#47423F]">
          Cloudnexaa Technologies <span className="px-1.5">•</span> OpsMind
          Safe Remediation Engine
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-300">
                  Remediation review
                </p>

                <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
                  {selected.action}
                </h2>

                <p className="mt-1 text-xs text-[#625D59]">
                  {selected.service} <span className="px-1">•</span>
                  {" "}
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
                className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2 text-[#77706B] hover:bg-white/[0.06] disabled:opacity-50"
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
                  value={selected.mode}
                />
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#514C48]">
                      Workflow state
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
                      Dry-run and approval are recorded, but no AWS
                      resource is changed from this workflow.
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
              {!selectedApproval ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => remediationAction("reject")}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/15 bg-red-400/[0.035] px-4 py-3 text-xs font-semibold text-red-300 disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => remediationAction("dry_run")}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F6E8DF] px-4 py-3 text-xs font-bold text-black disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw size={15} />
                    )}
                    Run Dry-Run
                  </button>
                </div>
              ) : selectedApproval.status === "dry_run" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => remediationAction("reject")}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/15 bg-red-400/[0.035] px-4 py-3 text-xs font-semibold text-red-300 disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => remediationAction("approve")}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-xs font-bold text-black disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck size={15} />
                    )}
                    Approve
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
                    Execution Gate — Locked
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-red-400/10 bg-red-400/[0.025] px-4 py-3 text-xs text-red-300">
                    <XCircle size={15} />
                    Remediation rejected.
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

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#625D59]">
          {label}
        </span>

        <span className="text-[#B7D1C5]">{icon}</span>
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