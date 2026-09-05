"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Cloud,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Cluster = {
  [key: string]: any;
};

type EKSResponse = {
  success: boolean;
  count?: number;
  clusters?: Cluster[];
  error?: string;
};

function clusterName(cluster: Cluster, index: number) {
  return (
    cluster.name ||
    cluster.ClusterName ||
    cluster.clusterName ||
    `EKS Cluster ${index + 1}`
  );
}

function clusterStatus(cluster: Cluster) {
  return (
    cluster.status ||
    cluster.Status ||
    cluster.state ||
    cluster.State ||
    "UNKNOWN"
  ).toString();
}

function normalizedStatus(status: string) {
  const value = status.toUpperCase();

  if (value === "ACTIVE" || value === "RUNNING" || value === "HEALTHY") {
    return "Healthy";
  }

  if (
    value === "CREATING" ||
    value === "UPDATING" ||
    value === "DELETING"
  ) {
    return "Processing";
  }

  if (value === "FAILED" || value === "DEGRADED") {
    return "Attention";
  }

  return status || "Unknown";
}

function statusStyle(status: string) {
  if (status === "Healthy") {
    return {
      text: "text-emerald-300",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
      dot: "bg-emerald-400",
    };
  }

  if (status === "Processing") {
    return {
      text: "text-[#B7D1C5]",
      bg: "bg-[#B7D1C5]/10",
      border: "border-[#B7D1C5]/20",
      dot: "bg-[#B7D1C5]",
    };
  }

  if (status === "Attention") {
    return {
      text: "text-[#FA4A0D]",
      bg: "bg-[#FA4A0D]/10",
      border: "border-[#FA4A0D]/20",
      dot: "bg-[#FA4A0D]",
    };
  }

  return {
    text: "text-[#9B9B9B]",
    bg: "bg-white/[0.03]",
    border: "border-white/10",
    dot: "bg-[#777C85]",
  };
}

function formatDate(value: unknown) {
  if (!value) return "Not available";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

export default function KubernetesPage() {
  const [data, setData] = useState<EKSResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Cluster | null>(null);
  const [copied, setCopied] = useState(false);

  const loadClusters = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/aws/eks", {
        cache: "no-store",
      });

      const result: EKSResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to fetch EKS clusters");
      }

      setData(result);
    } catch (err) {
      console.error("Kubernetes dashboard error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to Amazon EKS"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadClusters();

    const interval = setInterval(() => {
      loadClusters();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadClusters]);

  const clusters = data?.clusters ?? [];

  const stats = useMemo(() => {
    const healthy = clusters.filter(
      (cluster) => normalizedStatus(clusterStatus(cluster)) === "Healthy"
    ).length;

    const processing = clusters.filter(
      (cluster) =>
        normalizedStatus(clusterStatus(cluster)) === "Processing"
    ).length;

    const attention = clusters.filter(
      (cluster) =>
        normalizedStatus(clusterStatus(cluster)) === "Attention"
    ).length;

    return {
      total: clusters.length,
      healthy,
      processing,
      attention,
    };
  }, [clusters]);

  async function copyEndpoint(endpoint: string) {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  }

  const selectedStatus = selected
    ? normalizedStatus(clusterStatus(selected))
    : "";

  const selectedStyle = statusStyle(selectedStatus);

  return (
    <main className="min-h-screen bg-[#040404] text-[#F6E8DF]">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">

        {/* TOP HEADER */}
        <header className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#090909] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#B7D1C5]/10 blur-3xl" />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#B7D1C5]">
                <span className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Kubernetes
                </span>

                <span className="text-[#585858]">/</span>

                <span className="text-[#777C85]">
                  Amazon EKS
                </span>

                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] tracking-[0.12em] text-emerald-300">
                  LIVE
                </span>
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Kubernetes Intelligence.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#9B9B9B] sm:text-base">
                Monitor Amazon EKS cluster discovery and lifecycle state
                directly from your connected AWS environment.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[#777C85]">
                <span className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5">
                  AWS EKS
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5">
                  Auto refresh · 30s
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5">
                  Cloudnexaa OpsMind
                </span>
              </div>
            </div>

            <button
              onClick={() => loadClusters(true)}
              disabled={loading || refreshing}
              className="group flex w-full items-center justify-center gap-2 rounded-xl border border-[#B7D1C5]/20 bg-[#B7D1C5]/10 px-5 py-3 text-sm font-semibold text-[#B7D1C5] transition hover:border-[#B7D1C5]/40 hover:bg-[#B7D1C5]/15 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 transition group-hover:rotate-180" />
              )}

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {/* ERROR */}
        {error && (
          <section className="mt-6 rounded-[22px] border border-[#FA4A0D]/20 bg-[#FA4A0D]/5 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#FA4A0D]" />

              <div>
                <p className="font-semibold text-[#FA4A0D]">
                  EKS connection error
                </p>

                <p className="mt-1 text-sm leading-6 text-[#FA4A0D]/70">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* STATS */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-[22px] border border-white/10 bg-[#090909] p-5 transition hover:border-white/15">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-[#B7D1C5]/10 p-2.5">
                <Cloud className="h-5 w-5 text-[#B7D1C5]" />
              </div>

              <span className="text-[10px] uppercase tracking-[0.15em] text-[#585858]">
                Inventory
              </span>
            </div>

            <p className="mt-6 text-xs uppercase tracking-wider text-[#777C85]">
              EKS Clusters
            </p>

            <p className="mt-2 text-4xl font-bold tracking-tight">
              {loading ? "—" : stats.total}
            </p>
          </div>

          <div className="rounded-[22px] border border-emerald-400/15 bg-[#090909] p-5 transition hover:border-emerald-400/25">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-emerald-400/10 p-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>

              <span className="text-[10px] uppercase tracking-[0.15em] text-[#585858]">
                Healthy
              </span>
            </div>

            <p className="mt-6 text-xs uppercase tracking-wider text-[#777C85]">
              Active
            </p>

            <p className="mt-2 text-4xl font-bold text-emerald-300">
              {loading ? "—" : stats.healthy}
            </p>
          </div>

          <div className="rounded-[22px] border border-[#B7D1C5]/15 bg-[#090909] p-5 transition hover:border-[#B7D1C5]/25">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-[#B7D1C5]/10 p-2.5">
                <Clock3 className="h-5 w-5 text-[#B7D1C5]" />
              </div>

              <span className="text-[10px] uppercase tracking-[0.15em] text-[#585858]">
                Lifecycle
              </span>
            </div>

            <p className="mt-6 text-xs uppercase tracking-wider text-[#777C85]">
              Processing
            </p>

            <p className="mt-2 text-4xl font-bold text-[#B7D1C5]">
              {loading ? "—" : stats.processing}
            </p>
          </div>

          <div className="rounded-[22px] border border-[#FA4A0D]/15 bg-[#090909] p-5 transition hover:border-[#FA4A0D]/25">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-[#FA4A0D]/10 p-2.5">
                <AlertTriangle className="h-5 w-5 text-[#FA4A0D]" />
              </div>

              <span className="text-[10px] uppercase tracking-[0.15em] text-[#585858]">
                Attention
              </span>
            </div>

            <p className="mt-6 text-xs uppercase tracking-wider text-[#777C85]">
              Requires Review
            </p>

            <p className="mt-2 text-4xl font-bold text-[#FA4A0D]">
              {loading ? "—" : stats.attention}
            </p>
          </div>
        </section>

        {/* INVENTORY */}
        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/10 bg-[#090909]">

          <div className="border-b border-white/10 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    EKS Cluster Inventory
                  </h2>

                  <span className="rounded-full border border-white/10 bg-white/[0.025] px-2 py-1 text-[10px] text-[#777C85]">
                    {stats.total} total
                  </span>
                </div>

                <p className="mt-1 text-sm text-[#777C85]">
                  Live cluster discovery from Amazon EKS.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>

                LIVE DATA
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <Loader2 className="h-7 w-7 animate-spin text-[#B7D1C5]" />
                </div>

                <p className="mt-5 text-sm font-medium">
                  Discovering EKS clusters
                </p>

                <p className="mt-1 text-xs text-[#777C85]">
                  Querying the connected AWS environment...
                </p>
              </div>
            ) : clusters.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 px-6 py-20 text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025]">
                  <Cloud className="h-7 w-7 text-[#585858]" />
                </div>

                <h3 className="mt-5 text-base font-semibold text-[#E8DDD7]">
                  No EKS clusters detected
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#777C85]">
                  OpsMind is connected successfully, but no Amazon EKS
                  clusters were found in the configured AWS region.
                </p>

                <button
                  onClick={() => loadClusters(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-[#F6E8DF] transition hover:bg-white/[0.07]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Scan Again
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {clusters.map((cluster, index) => {
                  const name = clusterName(cluster, index);
                  const rawStatus = clusterStatus(cluster);
                  const status = normalizedStatus(rawStatus);
                  const style = statusStyle(status);

                  return (
                    <button
                      key={`${name}-${index}`}
                      onClick={() => setSelected(cluster)}
                      className="group w-full rounded-[20px] border border-white/10 bg-black/20 p-4 text-left transition hover:border-[#B7D1C5]/25 hover:bg-white/[0.025] sm:p-5"
                    >
                      <div className="flex items-center justify-between gap-4">

                        <div className="flex min-w-0 items-center gap-4">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#B7D1C5]/10 bg-[#B7D1C5]/5">
                            <Server className="h-5 w-5 text-[#B7D1C5]" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-semibold sm:text-base">
                                {name}
                              </h3>

                              <span
                                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${style.text} ${style.bg} ${style.border}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                                />
                                {status}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#777C85]">
                              <span>Amazon EKS</span>

                              {cluster.version && (
                                <span>
                                  Kubernetes v{cluster.version}
                                </span>
                              )}

                              {cluster.endpoint && (
                                <span className="text-emerald-400/70">
                                  Endpoint configured
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="hidden shrink-0 items-center gap-3 sm:flex">
                          <span className="text-xs text-[#585858]">
                            View details
                          </span>

                          <ChevronRight className="h-5 w-5 text-[#585858] transition group-hover:translate-x-1 group-hover:text-[#B7D1C5]" />
                        </div>

                        <ChevronRight className="h-5 w-5 shrink-0 text-[#585858] sm:hidden" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* OPSMIND INTELLIGENCE */}
        <section className="mt-6 rounded-[26px] border border-[#B7D1C5]/15 bg-[#B7D1C5]/[0.025] p-6 sm:p-7">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#B7D1C5]/15 bg-[#B7D1C5]/10">
              <ShieldCheck className="h-6 w-6 text-[#B7D1C5]" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-base font-semibold">
                  OpsMind Kubernetes Engine
                </h2>

                <span className="rounded-full border border-[#B7D1C5]/15 bg-[#B7D1C5]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#B7D1C5]">
                  Safe Monitoring
                </span>
              </div>

              <p className="mt-3 max-w-4xl text-sm leading-7 text-[#9B9B9B]">
                OpsMind currently monitors Amazon EKS cluster discovery and
                lifecycle state directly through AWS. Node, workload, pod,
                and Kubernetes API metrics are intentionally not fabricated;
                they can be added when cluster-level access is configured.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-8 flex flex-col gap-2 border-t border-white/10 py-6 text-center text-xs text-[#585858] sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>
            Cloudnexaa Technologies · OpsMind
          </span>

          <span>
            Kubernetes Intelligence · Amazon EKS
          </span>
        </footer>
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md sm:px-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#090909] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >

            {/* MODAL HEADER */}
            <div className="border-b border-white/10 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B7D1C5]">
                    <Cloud className="h-3.5 w-3.5" />
                    Amazon EKS
                  </div>

                  <h2 className="mt-3 truncate text-xl font-bold sm:text-2xl">
                    {clusterName(selected, 0)}
                  </h2>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${selectedStyle.dot}`}
                    />

                    <span className={`text-xs ${selectedStyle.text}`}>
                      {selectedStatus}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-white/10 bg-white/[0.025] p-2 text-[#777C85] transition hover:bg-white/[0.06] hover:text-[#F6E8DF]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* MODAL CONTENT */}
            <div className="max-h-[65vh] overflow-y-auto p-5 sm:p-6">

              <div className="grid gap-3 sm:grid-cols-2">

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#585858]">
                    Cluster
                  </p>

                  <p className="mt-2 truncate text-sm font-medium text-[#E8DDD7]">
                    {clusterName(selected, 0)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#585858]">
                    Status
                  </p>

                  <p className={`mt-2 text-sm font-medium ${selectedStyle.text}`}>
                    {selectedStatus}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#585858]">
                    Kubernetes Version
                  </p>

                  <p className="mt-2 text-sm font-medium text-[#E8DDD7]">
                    {selected.version
                      ? `v${selected.version}`
                      : "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#585858]">
                    Created
                  </p>

                  <p className="mt-2 text-sm font-medium text-[#E8DDD7]">
                    {formatDate(
                      selected.createdAt ||
                        selected.created_at ||
                        selected.CreatedAt
                    )}
                  </p>
                </div>

              </div>

              {/* ENDPOINT */}
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#585858]">
                    Cluster Endpoint
                  </p>

                  {selected.endpoint && (
                    <button
                      onClick={() => copyEndpoint(String(selected.endpoint))}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-[#777C85] transition hover:bg-white/[0.06] hover:text-[#F6E8DF]"
                    >
                      <Copy className="h-3 w-3" />
                      {copied ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>

                <p className="mt-3 break-all font-mono text-xs leading-5 text-[#9B9B9B]">
                  {selected.endpoint || "Not available"}
                </p>

                {selected.endpoint && (
                  <a
                    href={String(selected.endpoint)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#B7D1C5] hover:underline"
                  >
                    Open endpoint
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* RAW AWS DATA */}
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-[#585858]">
                    AWS Cluster Data
                  </p>

                  <span className="text-[10px] text-[#585858]">
                    Read-only
                  </span>
                </div>

                <pre className="mt-4 overflow-auto rounded-xl border border-white/5 bg-black/30 p-4 whitespace-pre-wrap break-all text-[11px] leading-5 text-[#777C85]">
                  {JSON.stringify(selected, null, 2)}
                </pre>
              </div>

            </div>

            {/* MODAL FOOTER */}
            <div className="border-t border-white/10 p-5 sm:p-6">
              <button
                onClick={() => setSelected(null)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[#F6E8DF] transition hover:bg-white/[0.07]"
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
