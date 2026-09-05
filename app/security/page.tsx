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
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

type Finding = {
  id?: string;
  findingId?: string;
  severity?: string;
  service?: string;
  title?: string;
  description?: string;
  recommendation?: string;
  resource?: string;
  status?: string;
  [key: string]: unknown;
};

type SecurityResponse = {
  success?: boolean;
  region?: string;
  findings?: Finding[];
  summary?: {
    securityScore?: number;
    securityStatus?: string;
    totalResources?: number;
    totalFindings?: number;
    critical?: number;
    warnings?: number;
    healthy?: number;
    info?: number;
  };
  error?: string;
};

type WorkflowRecord = {
  id: string;
  findingId: string;
  title: string;
  service: string;
  severity: string;
  resource?: string;
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
};

function severityStyle(value: string) {
  switch (value.toLowerCase()) {
    case "critical":
    case "high":
      return "border-red-400/20 bg-red-400/[0.045] text-red-300";

    case "warning":
    case "medium":
      return "border-amber-400/20 bg-amber-400/[0.045] text-amber-300";

    case "healthy":
      return "border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-300";

    default:
      return "border-white/[0.08] bg-white/[0.02] text-[#817A75]";
  }
}

function workflowStyle(value: string) {
  switch (value) {
    case "acknowledged":
      return "border-sky-400/15 bg-sky-400/[0.035] text-sky-300";

    case "resolved":
      return "border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-300";

    default:
      return "border-amber-400/15 bg-amber-400/[0.035] text-amber-300";
  }
}

function formatStatus(value?: string) {
  if (!value) return "Open";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SecurityPage() {
  const [data, setData] = useState<SecurityResponse | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selected, setSelected] = useState<Finding | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadSecurity = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [securityRes, workflowRes] = await Promise.all([
        fetch("/api/opsmind/security", {
          cache: "no-store",
        }),
        fetch("/api/opsmind/security/workflow", {
          cache: "no-store",
        }),
      ]);

      const [securityData, workflowData] = await Promise.all([
        securityRes.json(),
        workflowRes.json(),
      ]);

      if (!securityRes.ok || !securityData?.success) {
        throw new Error(
          securityData?.error ||
            "Unable to load security intelligence"
        );
      }

      if (!workflowRes.ok || !workflowData?.success) {
        throw new Error(
          workflowData?.error ||
            "Unable to load security workflow"
        );
      }

      setData(securityData);
      setWorkflow(workflowData.findings ?? []);
    } catch (err) {
      console.error("Security page error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load security intelligence"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSecurity();

    const interval = setInterval(() => {
      loadSecurity();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadSecurity]);

  const findings = data?.findings ?? [];

  function getFindingId(finding: Finding) {
    return String(
      finding.findingId ||
        finding.id ||
        `${finding.service || "security"}-${finding.title || "finding"}`
    );
  }

  function getWorkflow(finding: Finding) {
    const findingId = getFindingId(finding);

    return workflow.find(
      (item) => item.findingId === findingId
    );
  }

  const filteredFindings = useMemo(() => {
    return findings.filter((finding) => {
      const record = getWorkflow(finding);

      const currentStatus =
        record?.status ||
        String(finding.status || "open").toLowerCase();

      const severity = String(
        finding.severity || "info"
      ).toLowerCase();

      const searchable = [
        finding.title,
        finding.description,
        finding.recommendation,
        finding.service,
        finding.resource,
        finding.id,
        finding.findingId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(
        search.toLowerCase()
      );

      const matchesFilter =
        filter === "all" ||
        filter === severity ||
        filter === currentStatus;

      return matchesSearch && matchesFilter;
    });
  }, [findings, workflow, filter, search]);

  const summary = data?.summary ?? {};

  const securityScore =
    typeof summary.securityScore === "number"
      ? summary.securityScore
      : 0;

  const critical = Number(summary.critical || 0);
  const warnings = Number(summary.warnings || 0);
  const healthy = Number(summary.healthy || 0);
  const info = Number(summary.info || 0);

  async function workflowAction(
    operation: "acknowledge" | "resolve" | "reopen"
  ) {
    if (!selected) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const existing = getWorkflow(selected);

      if (
        operation === "acknowledge" &&
        existing?.status === "acknowledged"
      ) {
        throw new Error(
          "Security finding is already acknowledged."
        );
      }

      if (
        operation === "resolve" &&
        existing?.status === "resolved"
      ) {
        throw new Error(
          "Security finding is already resolved."
        );
      }

      const response = await fetch(
        "/api/opsmind/security/workflow",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operation,
            findingId: getFindingId(selected),
            title:
              selected.title ||
              "Security finding",
            service:
              selected.service ||
              "Security",
            severity:
              selected.severity ||
              "warning",
            resource: selected.resource
              ? String(selected.resource)
              : undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Security workflow failed"
        );
      }

      setMessage(
        result.message ||
          "Security finding state updated."
      );

      await loadSecurity(true);
    } catch (err) {
      console.error(
        "Security workflow action error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Security workflow failed"
      );
    } finally {
      setActionLoading(false);
    }
  }

  const selectedWorkflow = selected
    ? getWorkflow(selected)
    : undefined;

  return (
    <main className="min-h-screen bg-[#040404] px-4 py-6 text-[#F6E8DF] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-white/[0.07] pb-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#77716D]">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                Security / OpsMind
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Security posture, under control.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77716D] sm:text-base">
                Review security findings from the connected AWS environment,
                acknowledge active issues, resolve completed work, and keep
                every workflow decision auditable.
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
              onClick={() => loadSecurity(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-xs font-medium text-[#D7CCC6] transition hover:border-white/15 hover:bg-white/[0.05] disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}

              {refreshing ? "Refreshing" : "Refresh scan"}
            </button>
          </div>
        </header>

        {error && (
          <section className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/[0.035] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

              <div>
                <p className="text-sm font-medium text-red-200">
                  Security workflow error
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

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5 lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#625D59]">
                  Security score
                </p>

                <p className="mt-4 text-5xl font-semibold tracking-[-0.05em]">
                  {loading ? "—" : securityScore}
                  <span className="ml-1 text-xl text-[#514C48]">
                    /100
                  </span>
                </p>

                <p className="mt-2 text-xs text-[#706963]">
                  {loading
                    ? "Scanning environment..."
                    : summary.securityStatus ||
                      "Current security posture"}
                </p>
              </div>

              <ShieldCheck className="h-5 w-5 text-[#B7D1C5]" />
            </div>
          </div>

          <SecurityMetric
            label="Critical"
            value={loading ? "—" : critical}
            icon={<AlertTriangle size={16} />}
            tone="critical"
          />

          <SecurityMetric
            label="Warnings"
            value={loading ? "—" : warnings}
            icon={<Clock3 size={16} />}
            tone="warning"
          />

          <SecurityMetric
            label="Healthy / Info"
            value={loading ? "—" : healthy + info}
            icon={<CheckCircle2 size={16} />}
            tone="healthy"
          />
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.07] bg-[#080808]">
          <div className="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Security findings
              </h2>

              <p className="mt-1 text-xs leading-5 text-[#625D59] sm:text-sm">
                Live security observations with persistent workflow state.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search findings..."
                className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-[#D8CEC8] outline-none placeholder:text-[#514C48] focus:border-white/15"
              />

              <div className="flex flex-wrap gap-1.5">
                {[
                  ["all", "All"],
                  ["critical", "Critical"],
                  ["warning", "Warning"],
                  ["open", "Open"],
                  ["acknowledged", "Ack"],
                  ["resolved", "Resolved"],
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
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#B7D1C5]" />

                <p className="mt-4 text-sm text-[#AAA09A]">
                  Scanning security posture...
                </p>
              </div>
            ) : filteredFindings.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.012] text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />

                <p className="mt-4 text-sm font-medium">
                  No security findings
                </p>

                <p className="mt-1 max-w-md text-xs leading-5 text-[#625D59]">
                  Nothing matches the current search or security filter.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFindings.map((finding, index) => {
                  const record = getWorkflow(finding);

                  const status =
                    record?.status ||
                    String(
                      finding.status || "open"
                    ).toLowerCase();

                  const severity = String(
                    finding.severity || "info"
                  ).toLowerCase();

                  const severityTone =
                    severityStyle(severity);

                  const iconClass =
                    severityTone.includes("red")
                      ? "text-red-300"
                      : severityTone.includes("amber")
                        ? "text-amber-300"
                        : severityTone.includes("emerald")
                          ? "text-emerald-300"
                          : "text-[#B7D1C5]";

                  return (
                    <article
                      key={
                        getFindingId(finding) ||
                        index
                      }
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.025] sm:p-5"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
                            <ShieldCheck
                              className={`h-5 w-5 ${iconClass}`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-[#E0D5CF]">
                                {finding.title ||
                                  "Security finding"}
                              </h3>

                              <span
                                className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${severityTone}`}
                              >
                                {severity}
                              </span>

                              <span
                                className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${workflowStyle(
                                  status
                                )}`}
                              >
                                {formatStatus(status)}
                              </span>
                            </div>

                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#746D68]">
                              {finding.description ||
                                finding.recommendation ||
                                "Review the security finding and determine the appropriate operational response."}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Meta
                                label="Service"
                                value={String(
                                  finding.service ||
                                    "Security"
                                )}
                              />

                              <Meta
                                label="Resource"
                                value={String(
                                  finding.resource ||
                                    "AWS environment"
                                )}
                              />

                              <Meta
                                label="ID"
                                value={getFindingId(
                                  finding
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelected(finding);
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

        <section className="mt-5 rounded-2xl border border-orange-400/10 bg-orange-400/[0.018] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-300" />

            <div>
              <p className="text-sm font-medium text-[#DDD2CC]">
                Security control plane
              </p>

              <p className="mt-1 text-xs leading-5 text-[#716A65]">
                Findings are detected from the connected AWS environment.
                Workflow actions update OpsMind state and the audit trail;
                they do not directly modify AWS infrastructure.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Detect",
                  "Review",
                  "Acknowledge",
                  "Resolve",
                  "Audit",
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
          Security Control
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
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B7D1C5]">
                  Security finding review
                </p>

                <h2 className="mt-2 text-xl font-semibold text-[#F0E5DF] sm:text-2xl">
                  {selected.title ||
                    "Security finding"}
                </h2>

                <p className="mt-1 break-all text-xs text-[#625D59]">
                  {getFindingId(selected)}
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
                className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2 text-[#77706B] transition hover:bg-white/[0.06] hover:text-[#F6E8DF] disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-auto p-5 sm:p-6">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#514C48]">
                  Finding
                </p>

                <p className="mt-2 text-sm leading-6 text-[#8A827D]">
                  {selected.description ||
                    selected.recommendation ||
                    "No additional finding description available."}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Detail
                  label="Severity"
                  value={String(
                    selected.severity ||
                      "info"
                  )}
                />

                <Detail
                  label="Service"
                  value={String(
                    selected.service ||
                      "Security"
                  )}
                />

                <Detail
                  label="State"
                  value={formatStatus(
                    selectedWorkflow?.status ||
                      String(
                        selected.status ||
                          "open"
                      ).toLowerCase()
                  )}
                />

                <Detail
                  label="Resource"
                  value={String(
                    selected.resource ||
                      "AWS environment"
                  )}
                />
              </div>

              {selected.recommendation && (
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#514C48]">
                    Recommendation
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#837B76]">
                    {selected.recommendation}
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#B7D1C5]" />

                  <div>
                    <p className="text-xs font-medium text-[#D7CCC6]">
                      Workflow is audit controlled
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-[#625D59]">
                      Acknowledge, resolve, and reopen operations update
                      OpsMind workflow state and append an audit event.
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
              {selectedWorkflow?.status === "resolved" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025] px-4 py-3 text-xs text-emerald-300">
                    <CheckCircle2 size={15} />
                    Security finding resolved.
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      workflowAction("reopen")
                    }
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-medium text-[#AAA09A] disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw size={15} />
                    )}

                    Reopen finding
                  </button>
                </div>
              ) : selectedWorkflow?.status === "acknowledged" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      workflowAction("resolve")
                    }
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-xs font-bold text-black disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}

                    Resolve finding
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    disabled={actionLoading}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-medium text-[#AAA09A] disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      workflowAction("acknowledge")
                    }
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400/15 bg-sky-400/[0.035] px-4 py-3 text-xs font-semibold text-sky-300 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck size={15} />
                    )}

                    Acknowledge
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      workflowAction("resolve")
                    }
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F6E8DF] px-4 py-3 text-xs font-bold text-black disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}

                    Resolve
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

function SecurityMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: "critical" | "warning" | "healthy";
}) {
  const classes = {
    critical:
      "border-red-400/10 bg-red-400/[0.025] text-red-300",
    warning:
      "border-amber-400/10 bg-amber-400/[0.025] text-amber-300",
    healthy:
      "border-emerald-400/10 bg-emerald-400/[0.02] text-emerald-300",
  };

  return (
    <div
      className={`rounded-2xl border p-5 ${classes[tone]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#625D59]">
          {label}
        </span>

        {icon}
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight text-[#F6E8DF]">
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
    <span className="max-w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[10px] text-[#625D59]">
      {label}:{" "}
      <span className="text-[#88817C]">
        {value}
      </span>
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

      <p className="mt-2 break-words text-xs font-medium text-[#D6CBC5]">
        {value}
      </p>
    </div>
  );
}