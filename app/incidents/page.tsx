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

type Incident = {
  id?: string;
  incidentId?: string;
  title?: string;
  description?: string;
  recommendation?: string;
  severity?: string;
  service?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  timestamp?: string;
  resource?: string;
  [key: string]: unknown;
};

type IncidentResponse = {
  success?: boolean;
  region?: string;
  incidents?: Incident[];
  summary?: Record<string, number>;
  error?: string;
};

type WorkflowRecord = {
  id: string;
  incidentId: string;
  title: string;
  service: string;
  severity: string;
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

    case "low":
    case "info":
      return "border-sky-400/15 bg-sky-400/[0.035] text-sky-300";

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

function displayStatus(value?: string) {
  if (!value) return "Open";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function IncidentsPage() {
  const [data, setData] = useState<IncidentResponse | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selected, setSelected] =
    useState<Incident | null>(null);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadIncidents = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [incidentRes, workflowRes] = await Promise.all([
        fetch("/api/opsmind/incidents", {
          cache: "no-store",
        }),
        fetch("/api/opsmind/incidents/workflow", {
          cache: "no-store",
        }),
      ]);

      const [incidentData, workflowData] =
        await Promise.all([
          incidentRes.json(),
          workflowRes.json(),
        ]);

      if (!incidentRes.ok || !incidentData?.success) {
        throw new Error(
          incidentData?.error ||
            "Unable to load incidents"
        );
      }

      if (!workflowRes.ok || !workflowData?.success) {
        throw new Error(
          workflowData?.error ||
            "Unable to load incident workflow"
        );
      }

      setData(incidentData);
      setWorkflow(workflowData.incidents ?? []);
    } catch (err) {
      console.error("Incident page error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load incidents"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();

    const interval = setInterval(() => {
      loadIncidents();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadIncidents]);

  function getIncidentId(incident: Incident) {
    return String(
      incident.incidentId ||
        incident.id ||
        `${incident.service || "incident"}-${incident.title || "event"}`
    );
  }

  function getWorkflow(incident: Incident) {
    const id = getIncidentId(incident);

    return workflow.find(
      (item) => item.incidentId === id
    );
  }

  const incidents = data?.incidents ?? [];

  const filtered = useMemo(() => {
    return incidents.filter((incident) => {
      const workflowRecord = getWorkflow(incident);

      const status =
        workflowRecord?.status ||
        String(incident.status || "open").toLowerCase();

      const haystack = [
        incident.title,
        incident.description,
        incident.service,
        incident.resource,
        incident.id,
        incident.incidentId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(
        search.toLowerCase()
      );

      const matchesFilter =
        filter === "all" || status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [incidents, workflow, filter, search]);

  const counts = {
    total: incidents.length,
    open: incidents.filter((incident) => {
      const workflowRecord = getWorkflow(incident);

      return (
        (workflowRecord?.status ||
          String(incident.status || "open").toLowerCase()) ===
        "open"
      );
    }).length,
    acknowledged: incidents.filter((incident) => {
      return (
        getWorkflow(incident)?.status === "acknowledged"
      );
    }).length,
    resolved: incidents.filter((incident) => {
      return (
        getWorkflow(incident)?.status === "resolved"
      );
    }).length,
  };

  async function workflowAction(
    operation: "acknowledge" | "resolve" | "reopen"
  ) {
    if (!selected) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const incidentId = getIncidentId(selected);
      const existing = getWorkflow(selected);

      if (
        operation === "acknowledge" &&
        existing?.status === "acknowledged"
      ) {
        throw new Error(
          "Incident is already acknowledged."
        );
      }

      if (
        operation === "resolve" &&
        existing?.status === "resolved"
      ) {
        throw new Error(
          "Incident is already resolved."
        );
      }

      const response = await fetch(
        "/api/opsmind/incidents/workflow",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operation,
            incidentId,
            title:
              selected.title ||
              "OpsMind incident",
            service:
              selected.service ||
              "OpsMind",
            severity:
              selected.severity ||
              "medium",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Incident workflow failed"
        );
      }

      setMessage(
        result.message || "Incident state updated."
      );

      await loadIncidents(true);
    } catch (err) {
      console.error("Incident workflow action error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Incident workflow failed"
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
                Incidents / OpsMind
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Resolve with confidence.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77716D] sm:text-base">
                Monitor infrastructure incidents, acknowledge active issues,
                resolve completed work, and keep the operational history
                auditable.
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
              onClick={() => loadIncidents(true)}
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
                  Incident workflow error
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
            label="Total incidents"
            value={loading ? "—" : counts.total}
            icon={<AlertTriangle size={16} />}
          />

          <Metric
            label="Open"
            value={loading ? "—" : counts.open}
            icon={<Clock3 size={16} />}
          />

          <Metric
            label="Acknowledged"
            value={loading ? "—" : counts.acknowledged}
            icon={<ShieldCheck size={16} />}
          />

          <Metric
            label="Resolved"
            value={loading ? "—" : counts.resolved}
            icon={<CheckCircle2 size={16} />}
          />
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.07] bg-[#080808]">
          <div className="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Incident queue
              </h2>

              <p className="mt-1 text-xs leading-5 text-[#625D59]">
                Live incidents generated from the OpsMind environment scan.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search incidents..."
                className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-[#D8CEC8] outline-none placeholder:text-[#514C48] focus:border-white/15"
              />

              <div className="flex gap-1.5">
                {[
                  ["all", "All"],
                  ["open", "Open"],
                  ["acknowledged", "Ack"],
                  ["resolved", "Resolved"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-lg px-3 py-2 text-[10px] ${
                      filter === value
                        ? "bg-[#F6E8DF] font-semibold text-[#080808]"
                        : "border border-white/[0.06] bg-white/[0.02] text-[#6D6661]"
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
              <div className="flex min-h-[260px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#B7D1C5]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.012] text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />

                <p className="mt-4 text-sm font-medium">
                  No incidents found
                </p>

                <p className="mt-1 text-xs text-[#625D59]">
                  Nothing matches the current search or workflow filter.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((incident, index) => {
                  const workflowRecord = getWorkflow(incident);

                  const status =
                    workflowRecord?.status ||
                    String(
                      incident.status || "open"
                    ).toLowerCase();

                  const severity = String(
                    incident.severity || "medium"
                  );

                  return (
                    <article
                      key={
                        getIncidentId(incident) ||
                        index
                      }
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.025] sm:p-5"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
                            <AlertTriangle
                              className={`h-5 w-5 ${
                                severityStyle(
                                  severity
                                ).includes("red")
                                  ? "text-red-300"
                                  : severityStyle(
                                        severity
                                      ).includes("amber")
                                    ? "text-amber-300"
                                    : "text-[#B7D1C5]"
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-[#E0D5CF]">
                                {incident.title ||
                                  "Infrastructure incident"}
                              </h3>

                              <span
                                className={`rounded-md border px-2 py-1 text-[9px] uppercase tracking-[0.1em] ${severityStyle(
                                  severity
                                )}`}
                              >
                                {severity}
                              </span>

                              <span
                                className={`rounded-md border px-2 py-1 text-[9px] uppercase tracking-[0.1em] ${workflowStyle(
                                  status
                                )}`}
                              >
                                {displayStatus(status)}
                              </span>
                            </div>

                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#746D68]">
                              {incident.description ||
                                incident.recommendation ||
                                "Review the incident details and take the appropriate operational action."}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Meta
                                label="Service"
                                value={String(
                                  incident.service ||
                                    "OpsMind"
                                )}
                              />

                              <Meta
                                label="Resource"
                                value={String(
                                  incident.resource ||
                                    "AWS environment"
                                )}
                              />

                              <Meta
                                label="Incident ID"
                                value={getIncidentId(
                                  incident
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelected(incident);
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

        <section className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#B7D1C5]" />

            <div>
              <p className="text-sm font-medium text-[#DCD1CB]">
                Incident control plane
              </p>

              <p className="mt-1 text-xs leading-5 text-[#716A65]">
                Incident state changes are persisted and written to the
                audit trail. This workflow does not modify AWS resources.
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
          Incident Control
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
                  Incident review
                </p>

                <h2 className="mt-2 text-xl font-semibold text-[#F0E5DF] sm:text-2xl">
                  {selected.title ||
                    "Infrastructure incident"}
                </h2>

                <p className="mt-1 text-xs text-[#625D59]">
                  {selected.service || "OpsMind"}
                  <span className="px-1">•</span>
                  {getIncidentId(selected)}
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
                  Incident description
                </p>

                <p className="mt-2 text-sm leading-6 text-[#8A827D]">
                  {selected.description ||
                    selected.recommendation ||
                    "No additional incident description available."}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Detail
                  label="Severity"
                  value={String(
                    selected.severity ||
                      "medium"
                  )}
                />

                <Detail
                  label="Service"
                  value={String(
                    selected.service ||
                      "OpsMind"
                  )}
                />

                <Detail
                  label="State"
                  value={displayStatus(
                    selectedWorkflow?.status ||
                      String(
                        selected.status ||
                          "open"
                      ).toLowerCase()
                  )}
                />

                <Detail
                  label="Incident ID"
                  value={getIncidentId(selected)}
                />
              </div>

              {selected.resource && (
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#514C48]">
                    Resource
                  </p>

                  <p className="mt-2 break-all text-xs text-[#8A827D]">
                    {String(selected.resource)}
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-[#B7D1C5]" />

                  <div>
                    <p className="text-xs font-medium text-[#D7CCC6]">
                      Workflow is audit controlled
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-[#625D59]">
                      Acknowledge and resolve operations are persisted
                      independently from the AWS incident detector.
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
                    Incident resolved.
                  </div>

                  <button
                    type="button"
                    onClick={() => workflowAction("reopen")}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-medium text-[#AAA09A] disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw size={15} />
                    )}
                    Reopen incident
                  </button>
                </div>
              ) : selectedWorkflow?.status === "acknowledged" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => workflowAction("resolve")}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-xs font-bold text-black disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    Resolve incident
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
                    onClick={() => workflowAction("acknowledge")}
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
                    onClick={() => workflowAction("resolve")}
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

      <p className="mt-2 truncate text-xs font-medium text-[#D6CBC5]">
        {value}
      </p>
    </div>
  );
}