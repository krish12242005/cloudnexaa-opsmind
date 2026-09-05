"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileClock,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

type AuditEntry = {
  id?: string;
  automationId?: string;
  remediationId?: string;
  incidentId?: string;
  findingId?: string;
  action?: string;
  resource?: string;
  status?: string;
  awsChanges?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
  service?: string;
  risk?: string;
  [key: string]: unknown;
};

type AuditResponse = {
  success?: boolean;
  entries?: AuditEntry[];
  audit?: AuditEntry[];
  history?: AuditEntry[];
  records?: AuditEntry[];
  items?: AuditEntry[];
  error?: string;
};

function normalizeEntries(data: AuditResponse | null) {
  if (!data) return [];

  if (Array.isArray(data.entries)) return data.entries;
  if (Array.isArray(data.audit)) return data.audit;
  if (Array.isArray(data.history)) return data.history;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.items)) return data.items;

  return [];
}

function entryId(entry: AuditEntry, index: number) {
  return String(
    entry.id ||
      entry.automationId ||
      entry.remediationId ||
      entry.incidentId ||
      entry.findingId ||
      `audit-${index}`
  );
}

function entryType(entry: AuditEntry) {
  if (entry.automationId) return "Automation";
  if (entry.remediationId) return "Remediation";
  if (entry.incidentId) return "Incident";
  if (entry.findingId) return "Security";

  const service = String(entry.service || "").toLowerCase();

  if (service.includes("security")) return "Security";
  if (service.includes("incident")) return "Incident";
  if (service.includes("remediation")) return "Remediation";
  if (service.includes("automation")) return "Automation";

  return "OpsMind";
}

function statusText(status?: string) {
  if (!status) return "Recorded";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusStyle(status?: string) {
  const value = String(status || "").toLowerCase();

  if (
    value.includes("approved") ||
    value.includes("resolved") ||
    value.includes("healthy")
  ) {
    return "border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-300";
  }

  if (
    value.includes("rejected") ||
    value.includes("failed") ||
    value.includes("error")
  ) {
    return "border-red-400/15 bg-red-400/[0.035] text-red-300";
  }

  if (
    value.includes("warning") ||
    value.includes("pending") ||
    value.includes("acknowledged")
  ) {
    return "border-amber-400/15 bg-amber-400/[0.035] text-amber-300";
  }

  if (
    value.includes("validated") ||
    value.includes("dry")
  ) {
    return "border-sky-400/15 bg-sky-400/[0.035] text-sky-300";
  }

  return "border-white/[0.08] bg-white/[0.02] text-[#847C76]";
}

function typeStyle(type: string) {
  switch (type) {
    case "Automation":
      return "border-violet-400/15 bg-violet-400/[0.03] text-violet-300";

    case "Remediation":
      return "border-orange-400/15 bg-orange-400/[0.03] text-orange-300";

    case "Incident":
      return "border-red-400/15 bg-red-400/[0.03] text-red-300";

    case "Security":
      return "border-sky-400/15 bg-sky-400/[0.03] text-sky-300";

    default:
      return "border-white/[0.08] bg-white/[0.02] text-[#847C76]";
  }
}

function typeIcon(type: string) {
  switch (type) {
    case "Automation":
      return Activity;

    case "Remediation":
      return RefreshCw;

    case "Incident":
      return AlertTriangle;

    case "Security":
      return ShieldCheck;

    default:
      return FileClock;
  }
}

function formatDate(value?: string) {
  if (!value) return "Unknown time";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function timeValue(entry: AuditEntry) {
  const raw =
    entry.timestamp ||
    entry.createdAt ||
    entry.updatedAt;

  if (!raw) return 0;

  const value = new Date(raw).getTime();

  return Number.isNaN(value) ? 0 : value;
}

export default function AutomationHistoryPage() {
  const [data, setData] =
    useState<AuditResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [selected, setSelected] =
    useState<AuditEntry | null>(null);

  const loadHistory = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        "/api/opsmind/audit",
        {
          cache: "no-store",
        }
      );

      const result: AuditResponse =
        await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
            "Unable to load audit history"
        );
      }

      setData(result);
    } catch (err) {
      console.error("Audit history error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load audit history"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();

    const interval = setInterval(() => {
      loadHistory();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadHistory]);

  const entries = useMemo(() => {
    return normalizeEntries(data).sort(
      (a, b) => timeValue(b) - timeValue(a)
    );
  }, [data]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const type = entryType(entry);
      const status = String(
        entry.status || ""
      ).toLowerCase();

      const matchesFilter =
        filter === "all" ||
        type.toLowerCase() === filter ||
        status === filter;

      if (!matchesFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        entry.id,
        entry.action,
        entry.resource,
        entry.status,
        entry.awsChanges,
        entry.automationId,
        entry.remediationId,
        entry.incidentId,
        entry.findingId,
        entry.service,
        type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [entries, filter, search]);

  const statistics = useMemo(() => {
    return {
      total: entries.length,
      automation: entries.filter(
        (entry) => entryType(entry) === "Automation"
      ).length,
      remediation: entries.filter(
        (entry) => entryType(entry) === "Remediation"
      ).length,
      incidents: entries.filter(
        (entry) => entryType(entry) === "Incident"
      ).length,
      security: entries.filter(
        (entry) => entryType(entry) === "Security"
      ).length,
    };
  }, [entries]);

  return (
    <main className="min-h-screen bg-[#040404] px-4 py-6 text-[#F6E8DF] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-white/[0.07] pb-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#77716D]">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                Audit / OpsMind
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                One operational history.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77716D] sm:text-base">
                A unified audit trail for automation, remediation,
                incidents, and security workflows across Cloudnexaa
                OpsMind.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadHistory(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-xs font-medium text-[#D7CCC6] transition hover:border-white/15 hover:bg-white/[0.05] disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}

              {refreshing ? "Refreshing" : "Refresh history"}
            </button>
          </div>
        </header>

        {error && (
          <section className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/[0.035] p-5">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

              <div>
                <p className="text-sm font-medium text-red-200">
                  Audit history unavailable
                </p>

                <p className="mt-1 text-xs leading-5 text-red-200/60">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <AuditMetric
            label="Total events"
            value={loading ? "—" : statistics.total}
            icon={<FileClock size={16} />}
          />

          <AuditMetric
            label="Automation"
            value={loading ? "—" : statistics.automation}
            icon={<Activity size={16} />}
          />

          <AuditMetric
            label="Remediation"
            value={loading ? "—" : statistics.remediation}
            icon={<RefreshCw size={16} />}
          />

          <AuditMetric
            label="Incidents"
            value={loading ? "—" : statistics.incidents}
            icon={<AlertTriangle size={16} />}
          />

          <AuditMetric
            label="Security"
            value={loading ? "—" : statistics.security}
            icon={<ShieldCheck size={16} />}
          />
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.07] bg-[#080808]">
          <div className="border-b border-white/[0.06] p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    Operations timeline
                  </h2>

                  <span className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.025] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                    Live
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-[#625D59] sm:text-sm">
                  Every workflow decision recorded by OpsMind.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#514C48]" />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search audit events..."
                    className="w-full rounded-lg border border-white/[0.07] bg-white/[0.02] py-2.5 pl-9 pr-3 text-xs text-[#D8CEC8] outline-none placeholder:text-[#514C48] focus:border-white/15 sm:w-64"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="hidden h-3.5 w-3.5 text-[#514C48] sm:block" />

                  {[
                    ["all", "All"],
                    ["automation", "Automation"],
                    ["remediation", "Remediation"],
                    ["incident", "Incidents"],
                    ["security", "Security"],
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
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#B7D1C5]" />

                <p className="mt-4 text-sm text-[#AAA09A]">
                  Loading operational history...
                </p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.012] text-center">
                <FileClock className="h-8 w-8 text-[#514C48]" />

                <p className="mt-4 text-sm font-medium text-[#D6CBC5]">
                  No audit events found
                </p>

                <p className="mt-1 max-w-md text-xs leading-5 text-[#625D59]">
                  Try another search term or switch the workflow filter.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute bottom-3 left-[17px] top-3 w-px bg-white/[0.06]" />

                <div className="space-y-3">
                  {filteredEntries.map((entry, index) => {
                    const type = entryType(entry);
                    const Icon = typeIcon(type);

                    return (
                      <button
                        key={entryId(entry, index)}
                        type="button"
                        onClick={() => setSelected(entry)}
                        className="group relative flex w-full items-start gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.012] p-4 text-left transition hover:border-white/[0.12] hover:bg-white/[0.025]"
                      >
                        <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#090909] text-[#B7D1C5]">
                          <Icon size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${typeStyle(type)}`}
                            >
                              {type}
                            </span>

                            <span
                              className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${statusStyle(entry.status)}`}
                            >
                              {statusText(entry.status)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-medium text-[#DCD1CB]">
                            {entry.action ||
                              "OpsMind operational event"}
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#625D59]">
                            {entry.resource ||
                              entry.service ||
                              "Operational workflow recorded by OpsMind."}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-[#514C48]">
                            <span>
                              {formatDate(
                                entry.timestamp ||
                                  entry.createdAt ||
                                  entry.updatedAt
                              )}
                            </span>

                            {entry.id && (
                              <>
                                <span>•</span>
                                <span className="font-mono">
                                  {entry.id}
                                </span>
                              </>
                            )}

                            {entry.awsChanges && (
                              <>
                                <span>•</span>
                                <span>
                                  AWS: {entry.awsChanges}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="mt-1 text-[#3F3B38] transition group-hover:text-[#77706B]">
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-[#B7D1C5]/10 bg-[#B7D1C5]/[0.018] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#B7D1C5]" />

            <div>
              <p className="text-sm font-medium text-[#DCD1CB]">
                Audit integrity
              </p>

              <p className="mt-1 text-xs leading-5 text-[#716A65]">
                Workflow events are recorded independently from live AWS
                resource discovery. Audit entries describe OpsMind decisions
                and state changes; they do not imply an AWS resource was
                modified unless the event explicitly says so.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-white/[0.06] py-6 text-center text-[10px] text-[#47423F]">
          Cloudnexaa Technologies <span className="px-1.5">•</span> OpsMind
          Unified Audit Center
        </footer>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#090909] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-5 sm:p-6">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B7D1C5]">
                  Audit event
                </p>

                <h2 className="mt-2 text-xl font-semibold text-[#F0E5DF] sm:text-2xl">
                  {selected.action ||
                    "OpsMind operational event"}
                </h2>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${typeStyle(
                      entryType(selected)
                    )}`}
                  >
                    {entryType(selected)}
                  </span>

                  <span
                    className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${statusStyle(
                      selected.status
                    )}`}
                  >
                    {statusText(selected.status)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2 text-[#77706B] transition hover:bg-white/[0.06] hover:text-[#F6E8DF]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail
                  label="Event ID"
                  value={String(
                    selected.id || "Not assigned"
                  )}
                />

                <Detail
                  label="Status"
                  value={statusText(
                    selected.status
                  )}
                />

                <Detail
                  label="Workflow"
                  value={entryType(selected)}
                />

                <Detail
                  label="Timestamp"
                  value={formatDate(
                    selected.timestamp ||
                      selected.createdAt ||
                      selected.updatedAt
                  )}
                />
              </div>

              {selected.resource && (
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#514C48]">
                    Resource
                  </p>

                  <p className="mt-2 break-all text-xs leading-5 text-[#827A75]">
                    {String(selected.resource)}
                  </p>
                </div>
              )}

              {selected.awsChanges && (
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#514C48]">
                    AWS change state
                  </p>

                  <p className="mt-2 text-xs text-[#D6CBC5]">
                    {String(selected.awsChanges)}
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#050505] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#514C48]">
                  Event payload
                </p>

                <pre className="mt-3 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-[#6E6762]">
                  {JSON.stringify(
                    selected,
                    null,
                    2
                  )}
                </pre>
              </div>

              <div className="mt-4 rounded-xl border border-[#B7D1C5]/10 bg-[#B7D1C5]/[0.018] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B7D1C5]" />

                  <p className="text-[11px] leading-5 text-[#77706B]">
                    Audit inspection is read-only. Opening this event does not
                    execute or modify AWS resources.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.06] p-5 sm:p-6">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-full rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-medium text-[#AAA09A] transition hover:bg-white/[0.05]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function AuditMetric({
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

        <span className="text-[#B7D1C5]">
          {icon}
        </span>
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
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