"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type RawEvent = Record<string, any>;

type TimelineEvent = {
  id: string;
  source: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  timestamp: string;
};

function normalizeEvents(payload: any, source: string): TimelineEvent[] {
  const candidates = [
    payload?.entries,
    payload?.events,
    payload?.incidents,
    payload?.items,
    payload?.data,
    payload?.audit,
  ];

  let rows: any[] = [];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      rows = candidate;
      break;
    }
  }

  return rows.map((item: RawEvent, index: number) => {
    const timestamp =
      item.timestamp ??
      item.createdAt ??
      item.created_at ??
      item.updatedAt ??
      item.time ??
      new Date().toISOString();

    return {
      id: String(
        item.id ??
          item.incidentId ??
          item.eventId ??
          `${source}-${index}-${timestamp}`
      ),
      source,
      title:
        item.title ??
        item.name ??
        item.type ??
        item.action ??
        "Operations event",
      description:
        item.description ??
        item.message ??
        item.reason ??
        item.summary ??
        "Operational event detected.",
      status: String(
        item.status ??
          item.state ??
          item.result ??
          item.outcome ??
          "recorded"
      ),
      severity: String(
        item.severity ??
          item.risk ??
          item.priority ??
          "info"
      ),
      timestamp: String(timestamp),
    };
  });
}

function toneClass(value: string) {
  const v = value.toLowerCase();

  if (
    v.includes("critical") ||
    v.includes("high") ||
    v.includes("open")
  ) {
    return {
      border: "border-red-400/20",
      bg: "bg-red-400/[0.05]",
      text: "text-red-300",
      dot: "bg-red-400",
    };
  }

  if (
    v.includes("warning") ||
    v.includes("medium") ||
    v.includes("pending")
  ) {
    return {
      border: "border-amber-400/20",
      bg: "bg-amber-400/[0.05]",
      text: "text-amber-300",
      dot: "bg-amber-400",
    };
  }

  if (
    v.includes("resolved") ||
    v.includes("healthy") ||
    v.includes("success") ||
    v.includes("approved")
  ) {
    return {
      border: "border-emerald-400/20",
      bg: "bg-emerald-400/[0.05]",
      text: "text-emerald-300",
      dot: "bg-emerald-400",
    };
  }

  return {
    border: "border-white/10",
    bg: "bg-white/[0.03]",
    text: "text-[#9B9B9B]",
    dot: "bg-[#777C85]",
  };
}

function formatTimestamp(value: string) {
  const time = new Date(value);

  if (Number.isNaN(time.getTime())) {
    return value;
  }

  return time.toLocaleString();
}

export default function OperationsTimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const requests = await Promise.allSettled([
        fetch("/api/opsmind/audit", {
          cache: "no-store",
        }).then((response) => response.json()),

        fetch("/api/opsmind/incidents", {
          cache: "no-store",
        }).then((response) => response.json()),

        fetch("/api/opsmind/automation", {
          cache: "no-store",
        }).then((response) => response.json()),

        fetch("/api/opsmind/remediation", {
          cache: "no-store",
        }).then((response) => response.json()),
      ]);

      const combined: TimelineEvent[] = [];

      const sources = [
        "Audit",
        "Incidents",
        "Automation",
        "Remediation",
      ];

      requests.forEach((result, index) => {
        if (result.status === "fulfilled") {
          combined.push(
            ...normalizeEvents(result.value, sources[index])
          );
        }
      });

      combined.sort((a, b) => {
        const aTime = new Date(a.timestamp).getTime();
        const bTime = new Date(b.timestamp).getTime();

        return bTime - aTime;
      });

      setEvents(combined);
    } catch {
      setError("Unable to load operations timeline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const summary = useMemo(() => {
    const critical = events.filter((event) =>
      /critical|high/i.test(`${event.severity} ${event.status}`)
    ).length;

    const active = events.filter((event) =>
      /open|pending|active/i.test(event.status)
    ).length;

    const resolved = events.filter((event) =>
      /resolved|success|approved/i.test(event.status)
    ).length;

    return {
      total: events.length,
      critical,
      active,
      resolved,
    };
  }, [events]);

  return (
    <main className="min-h-screen bg-[#040404] text-[#F6E8DF]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[22%] top-[-18%] h-[440px] w-[440px] rounded-full bg-orange-500/[0.025] blur-[140px]" />
        <div className="absolute bottom-[-18%] right-[-8%] h-[440px] w-[440px] rounded-full bg-[#B7D1C5]/[0.02] blur-[140px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-white/[0.07] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#68625E]">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              Operations
              <span className="text-[#403C39]">/</span>
              Timeline
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Operations Timeline
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77716D] sm:text-base">
              A unified operational history assembled from the
              current OpsMind backend.
            </p>
          </div>

          <button
            onClick={loadTimeline}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[#F6E8DF] transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-[#B7D1C5]" />
              <span className="text-sm text-[#9B9B9B]">Total Events</span>
            </div>
            <p className="mt-4 text-3xl font-semibold">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <span className="text-sm text-[#9B9B9B]">
                Critical / High
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold">
              {summary.critical}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-sky-300" />
              <span className="text-sm text-[#9B9B9B]">
                Active
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold">
              {summary.active}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-sm text-[#9B9B9B]">
                Resolved / Success
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold">
              {summary.resolved}
            </p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.018]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
            <div>
              <p className="text-sm font-semibold">
                Event Stream
              </p>
              <p className="mt-1 text-xs text-[#68625E]">
                Latest operational records
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#68625E]">
              <ShieldCheck className="h-4 w-4" />
              Read Only
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {loading && (
              <div className="flex min-h-[280px] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-[#77716D]">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading operational history...
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-center">
                <AlertTriangle className="mx-auto h-7 w-7 text-red-300" />
                <p className="mt-3 text-sm font-medium text-red-200">
                  Timeline unavailable
                </p>
                <p className="mt-2 text-xs text-red-200/60">
                  {error}
                </p>
              </div>
            )}

            {!loading && !error && events.length === 0 && (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <Clock3 className="h-8 w-8 text-[#68625E]" />
                <p className="mt-4 text-sm font-medium">
                  No operational events recorded
                </p>
                <p className="mt-2 max-w-md text-xs leading-5 text-[#68625E]">
                  OpsMind will show audit, incident, automation and
                  remediation activity here when the backend has
                  records available.
                </p>
              </div>
            )}

            {!loading && !error && events.length > 0 && (
              <div className="space-y-4">
                {events.map((event) => {
                  const tone = toneClass(
                    `${event.severity} ${event.status}`
                  );

                  return (
                    <article
                      key={event.id}
                      className={`rounded-2xl border ${tone.border} ${tone.bg} p-5`}
                    >
                      <div className="flex gap-4">
                        <div className="mt-1.5 flex shrink-0 flex-col items-center">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${tone.dot}`}
                          />
                          <span className="mt-2 h-full w-px bg-white/[0.08]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-[#9B9B9B]">
                                  {event.source}
                                </span>

                                <span
                                  className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider ${tone.border} ${tone.text}`}
                                >
                                  {event.status}
                                </span>
                              </div>

                              <h2 className="mt-3 text-sm font-semibold text-[#F6E8DF]">
                                {event.title}
                              </h2>
                            </div>

                            <p className="shrink-0 text-xs text-[#68625E]">
                              {formatTimestamp(event.timestamp)}
                            </p>
                          </div>

                          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#8D8884]">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-8 border-t border-white/[0.07] pt-5 text-center text-xs text-[#585858]">
          CloudNexaa OpsMind • Operational intelligence workspace
        </footer>
      </div>
    </main>
  );
}