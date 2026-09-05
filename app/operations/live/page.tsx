"use client";

import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle2,
  Cloud,
  Database,
  Globe2,
  RefreshCw,
  Server,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Resource = Record<string, any>;

type OverviewResponse = {
  success?: boolean;
  region?: string;
  resources?: {
    ec2?: {
      count?: number;
      instances?: Resource[];
    };
    s3?: {
      count?: number;
      buckets?: Resource[];
    };
    rds?: {
      count?: number;
      instances?: Resource[];
    };
    eks?: {
      count?: number;
      clusters?: Resource[];
    };
    vpc?: {
      count?: number;
      vpcs?: Resource[];
    };
  };
  error?: string;
};

type ServiceStatus = {
  name: string;
  count: number;
  healthy: number;
  stopped: number;
  icon: any;
};

function getState(resource: Resource) {
  return String(
    resource?.State?.Name ??
      resource?.state ??
      resource?.Status ??
      resource?.status ??
      resource?.DBInstanceStatus ??
      resource?.clusterStatus ??
      ""
  ).toLowerCase();
}

function isHealthy(resource: Resource) {
  const state = getState(resource);

  return (
    state === "running" ||
    state === "available" ||
    state === "active" ||
    state === "active"
  );
}

function isStopped(resource: Resource) {
  const state = getState(resource);

  return state === "stopped" || state === "inactive";
}

function resourceCount(
  value:
    | {
        count?: number;
        instances?: Resource[];
        buckets?: Resource[];
        clusters?: Resource[];
        vpcs?: Resource[];
      }
    | undefined
) {
  if (!value) {
    return 0;
  }

  if (typeof value.count === "number") {
    return value.count;
  }

  if (Array.isArray(value.instances)) {
    return value.instances.length;
  }

  if (Array.isArray(value.buckets)) {
    return value.buckets.length;
  }

  if (Array.isArray(value.clusters)) {
    return value.clusters.length;
  }

  if (Array.isArray(value.vpcs)) {
    return value.vpcs.length;
  }

  return 0;
}

function resourcesFor(
  value:
    | {
        instances?: Resource[];
        buckets?: Resource[];
        clusters?: Resource[];
        vpcs?: Resource[];
      }
    | undefined
) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value.instances)) {
    return value.instances;
  }

  if (Array.isArray(value.buckets)) {
    return value.buckets;
  }

  if (Array.isArray(value.clusters)) {
    return value.clusters;
  }

  if (Array.isArray(value.vpcs)) {
    return value.vpcs;
  }

  return [];
}

function healthText(score: number) {
  if (score >= 90) {
    return {
      label: "Healthy",
      tone: "text-emerald-300",
      icon: CheckCircle2,
    };
  }

  if (score >= 70) {
    return {
      label: "Review Recommended",
      tone: "text-amber-300",
      icon: AlertTriangle,
    };
  }

  return {
    label: "Attention Required",
    tone: "text-red-300",
    icon: AlertTriangle,
  };
}

export default function LiveAWSHealthPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");

  const load = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch("/api/aws/overview", {
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok || payload?.success === false) {
        throw new Error(
          payload?.error || "AWS overview request failed."
        );
      }

      setData(payload);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load AWS health."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();

    const timer = setInterval(() => {
      load(false);
    }, 30000);

    return () => clearInterval(timer);
  }, [load]);

  const serviceData = useMemo<ServiceStatus[]>(() => {
    const resources = data?.resources;

    const build = (
      name: string,
      value: any,
      icon: any
    ): ServiceStatus => {
      const rows = resourcesFor(value);
      const count = resourceCount(value);

      return {
        name,
        count,
        healthy: rows.filter(isHealthy).length,
        stopped: rows.filter(isStopped).length,
        icon,
      };
    };

    return [
      build("EC2", resources?.ec2, Server),
      build("S3", resources?.s3, Box),
      build("RDS", resources?.rds, Database),
      build("EKS", resources?.eks, Globe2),
      build("VPC", resources?.vpc, Cloud),
    ];
  }, [data]);

  const totals = useMemo(() => {
    const total = serviceData.reduce(
      (sum, service) => sum + service.count,
      0
    );

    const healthy = serviceData.reduce(
      (sum, service) => sum + service.healthy,
      0
    );

    const stopped = serviceData.reduce(
      (sum, service) => sum + service.stopped,
      0
    );

    const score =
      total > 0
        ? Math.round(
            Math.max(
              0,
              Math.min(
                100,
                ((healthy + (total - healthy - stopped)) / total) *
                  100
              )
            )
          )
        : 100;

    return {
      total,
      healthy,
      stopped,
      score,
    };
  }, [serviceData]);

  const health = healthText(totals.score);
  const HealthIcon = health.icon;

  return (
    <main className="min-h-screen bg-[#040404] text-[#F6E8DF]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[20%] top-[-15%] h-[460px] w-[460px] rounded-full bg-orange-500/[0.025] blur-[150px]" />
        <div className="absolute bottom-[-15%] right-[-5%] h-[420px] w-[420px] rounded-full bg-[#B7D1C5]/[0.02] blur-[140px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">

        <header className="flex flex-col gap-5 border-b border-white/[0.07] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#68625E]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live Operations
              <span className="text-[#403C39]">/</span>
              AWS Health
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Live AWS Health Monitor
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77716D] sm:text-base">
              Current AWS resource state from the connected OpsMind
              environment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs text-[#77716D] sm:flex">
              <Wifi className="h-4 w-4 text-emerald-400" />
              Auto refresh 30s
            </div>

            <button
              onClick={() => load(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </header>

        {loading && (
          <div className="mt-6 flex min-h-[420px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3 text-sm text-[#77716D]">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Reading live AWS resource state...
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-3xl border border-red-400/20 bg-red-400/[0.05] p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-300" />
            <h2 className="mt-4 text-lg font-semibold">
              AWS health unavailable
            </h2>
            <p className="mt-2 text-sm text-[#8D8884]">
              {error}
            </p>

            <button
              onClick={() => load(true)}
              className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm hover:bg-white/[0.08]"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">

              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#68625E]">
                      Environment Health
                    </p>

                    <div className="mt-5 flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035]">
                        <HealthIcon
                          className={`h-7 w-7 ${health.tone}`}
                        />
                      </div>

                      <div>
                        <p className={`text-2xl font-semibold ${health.tone}`}>
                          {health.label}
                        </p>

                        <p className="mt-1 text-xs text-[#68625E]">
                          Region: {data.region || "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-4xl font-semibold">
                      {totals.score}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-[#68625E]">
                      Health Score
                    </p>
                  </div>
                </div>

                <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{
                      width: `${totals.score}%`,
                    }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-[#68625E]">
                  <span>Live resource inspection</span>
                  <span>
                    Updated {lastRefresh || "just now"}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-[#B7D1C5]" />
                  <span className="text-sm text-[#9B9B9B]">
                    Total Resources
                  </span>
                </div>

                <p className="mt-5 text-4xl font-semibold">
                  {totals.total}
                </p>

                <p className="mt-2 text-xs text-[#68625E]">
                  Across detected AWS services
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm text-[#9B9B9B]">
                    Healthy
                  </span>
                </div>

                <p className="mt-5 text-4xl font-semibold">
                  {totals.healthy}
                </p>

                <p className="mt-2 text-xs text-[#68625E]">
                  Active / available resources
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <span className="text-sm text-[#9B9B9B]">
                    Stopped
                  </span>
                </div>

                <p className="mt-5 text-4xl font-semibold">
                  {totals.stopped}
                </p>

                <p className="mt-2 text-xs text-[#68625E]">
                  Resources requiring review
                </p>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.018]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
                <div>
                  <p className="text-sm font-semibold">
                    Service Health
                  </p>

                  <p className="mt-1 text-xs text-[#68625E]">
                    Live counts from the current AWS connection
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#68625E]">
                  <ShieldCheck className="h-4 w-4" />
                  Read Only
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-5">
                {serviceData.map((service) => {
                  const Icon = service.icon;

                  const status =
                    service.count === 0
                      ? "No resources"
                      : service.stopped > 0
                        ? "Review"
                        : "Healthy";

                  const statusTone =
                    status === "Healthy"
                      ? "text-emerald-300"
                      : status === "Review"
                        ? "text-amber-300"
                        : "text-[#77716D]";

                  return (
                    <div
                      key={service.name}
                      className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                          <Icon className="h-5 w-5 text-[#B7D1C5]" />
                        </div>

                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${statusTone}`}
                        >
                          {status}
                        </span>
                      </div>

                      <p className="mt-5 text-sm font-semibold">
                        {service.name}
                      </p>

                      <p className="mt-2 text-3xl font-semibold">
                        {service.count}
                      </p>

                      <div className="mt-4 space-y-2 text-xs text-[#68625E]">
                        <div className="flex justify-between">
                          <span>Healthy</span>
                          <span className="text-[#9B9B9B]">
                            {service.healthy}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>Stopped</span>
                          <span className="text-[#9B9B9B]">
                            {service.stopped}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.018] p-6">
              <div className="flex items-center gap-3">
                <Cloud className="h-5 w-5 text-[#B7D1C5]" />
                <div>
                  <p className="text-sm font-semibold">
                    Monitoring Status
                  </p>
                  <p className="mt-1 text-xs text-[#68625E]">
                    OpsMind is polling the connected AWS environment
                    every 30 seconds.
                  </p>
                </div>
              </div>
            </section>

            <footer className="mt-8 border-t border-white/[0.07] pt-5 text-center text-xs text-[#585858]">
              CloudNexaa OpsMind • Live AWS Health Monitor
            </footer>
          </>
        )}
      </div>
    </main>
  );
}