"use client";

import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Database,
  Globe2,
  Loader2,
  RefreshCw,
  Server,
  Shield,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Resource = {
  [key: string]: any;
};

type OverviewResponse = {
  success: boolean;
  region?: string;
  resources?: {
    ec2?: {
      count: number;
      instances: Resource[];
    };
    s3?: {
      count: number;
      buckets: Resource[];
    };
    rds?: {
      count: number;
      instances: Resource[];
    };
    eks?: {
      count: number;
      clusters: Resource[];
    };
    vpc?: {
      count: number;
      vpcs: Resource[];
    };
  };
  error?: string;
};

type ResourceCard = {
  id: string;
  service: string;
  type: string;
  status: string;
  name: string;
  detail: string;
  raw: Resource;
  region?: string;
  address?: string;
  risk?: string;
  recommendations?: string[];
};

function getResourceName(resource: Resource, fallback: string) {
  const tags = Array.isArray(resource.Tags) ? resource.Tags : [];

  const nameTag = tags.find(
    (tag: { Key?: string; Value?: string }) => tag.Key === "Name"
  )?.Value;

  return (
    nameTag ||
    resource.Name ||
    resource.name ||
    resource.BucketName ||
    resource.DBInstanceIdentifier ||
    resource.ClusterName ||
    resource.InstanceId ||
    resource.VpcId ||
    resource.Id ||
    fallback
  );
}

function formatStatus(status: string) {
  if (
    status === "running" ||
    status === "available" ||
    status === "active" ||
    status === "ACTIVE"
  ) {
    return "Healthy";
  }

  if (status === "stopped" || status === "inactive") {
    return "Stopped";
  }

  if (
    status === "pending" ||
    status === "creating" ||
    status === "provisioning"
  ) {
    return "Pending";
  }

  return status || "Detected";
}

function statusClass(status: string) {
  switch (status) {
    case "Healthy":
      return "text-emerald-400";
    case "Stopped":
      return "text-amber-400";
    case "Pending":
      return "text-sky-300";
    default:
      return "text-[#8D8884]";
  }
}

function statusDot(status: string) {
  switch (status) {
    case "Healthy":
      return "bg-emerald-400";
    case "Stopped":
      return "bg-amber-400";
    case "Pending":
      return "bg-sky-300";
    default:
      return "bg-[#77706B]";
  }
}

function serviceIcon(service: string) {
  switch (service) {
    case "EC2":
      return Server;
    case "S3":
      return Box;
    case "RDS":
      return Database;
    case "EKS":
      return Globe2;
    case "VPC":
      return Shield;
    default:
      return Cloud;
  }
}

function serviceAccent(service: string) {
  switch (service) {
    case "EC2":
      return "bg-orange-500/10 text-orange-300 border-orange-400/15";
    case "S3":
      return "bg-amber-400/10 text-amber-300 border-amber-400/15";
    case "RDS":
      return "bg-emerald-400/10 text-emerald-300 border-emerald-400/15";
    case "EKS":
      return "bg-sky-400/10 text-sky-300 border-sky-400/15";
    case "VPC":
      return "bg-violet-400/10 text-violet-300 border-violet-400/15";
    default:
      return "bg-white/5 text-[#B7D1C5] border-white/10";
  }
}

function getResourceRegion(resource: Resource) {
  return (
    resource.Placement?.AvailabilityZone ||
    resource.AvailabilityZone ||
    resource.Region ||
    "Unknown"
  );
}

function getResourceAddress(resource: Resource) {
  return (
    resource.PublicIpAddress ||
    resource.PrivateIpAddress ||
    resource.Endpoint?.Address ||
    resource.Endpoint ||
    "Not available"
  );
}

function getResourceRisk(resource: Resource) {
  const state =
    resource.State?.Name ||
    resource.DBInstanceStatus ||
    resource.status ||
    "";

  if (
    resource.PubliclyAccessible === true ||
    resource.PublicIpAddress
  ) {
    return "Review";
  }

  if (
    state === "stopped" ||
    state === "inactive"
  ) {
    return "Optimization";
  }

  return "Normal";
}

function getResourceRecommendations(resource: Resource) {
  const result: string[] = [];

  const state =
    resource.State?.Name ||
    resource.DBInstanceStatus ||
    resource.status ||
    "";

  if (state === "stopped") {
    result.push(
      "Review whether this stopped resource is still required."
    );
  }

  if (
    resource.PubliclyAccessible === true ||
    resource.PublicIpAddress
  ) {
    result.push(
      "Review public exposure and restrict access where appropriate."
    );
  }

  if (resource.Encrypted === false) {
    result.push(
      "Review encryption configuration."
    );
  }

  if (result.length === 0) {
    result.push(
      "No immediate OpsMind recommendation."
    );
  }

  return result;
}
export default function InfrastructurePage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ResourceCard | null>(null);
  const [filter, setFilter] = useState("All");

  const loadInfrastructure = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/aws/overview", {
        cache: "no-store",
      });

      const result: OverviewResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to load AWS infrastructure"
        );
      }

      setData(result);
    } catch (err) {
      console.error("Infrastructure dashboard error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to AWS infrastructure"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInfrastructure();

    const interval = setInterval(() => {
      loadInfrastructure();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadInfrastructure]);

  const resources = data?.resources;

  const counts = {
    ec2: resources?.ec2?.count ?? 0,
    s3: resources?.s3?.count ?? 0,
    rds: resources?.rds?.count ?? 0,
    eks: resources?.eks?.count ?? 0,
    vpc: resources?.vpc?.count ?? 0,
  };

  const totalResources =
    counts.ec2 +
    counts.s3 +
    counts.rds +
    counts.eks +
    counts.vpc;

  const runningEC2 =
    resources?.ec2?.instances?.filter(
      (instance) => instance.State?.Name === "running"
    ).length ?? 0;

  const stoppedEC2 =
    resources?.ec2?.instances?.filter(
      (instance) => instance.State?.Name === "stopped"
    ).length ?? 0;

  const healthPercentage =
    counts.ec2 > 0
      ? Math.round((runningEC2 / counts.ec2) * 100)
      : totalResources > 0
        ? 100
        : 0;

  const resourceCards = useMemo<ResourceCard[]>(() => {
    const cards: ResourceCard[] = [];

    (resources?.ec2?.instances ?? []).forEach((instance, index) => {
      const state = instance.State?.Name || "unknown";

      cards.push({
        id: instance.InstanceId || `ec2-${index}`,
        service: "EC2",
        type: instance.InstanceType || "EC2 Instance",
        status: formatStatus(state),
        name: getResourceName(instance, `EC2 Instance ${index + 1}`),
        detail: `${instance.InstanceType || "Instance"} � ${state}`,
        raw: instance,
      });
    });

    (resources?.s3?.buckets ?? []).forEach((bucket, index) => {
      cards.push({
        id: bucket.Name || bucket.BucketName || `s3-${index}`,
        service: "S3",
        type: "S3 Bucket",
        status: "Healthy",
        name: getResourceName(bucket, `S3 Bucket ${index + 1}`),
        detail: "Object Storage",
        raw: bucket,
      });
    });

    (resources?.rds?.instances ?? []).forEach((instance, index) => {
      const state = instance.DBInstanceStatus || "unknown";

      cards.push({
        id:
          instance.DBInstanceIdentifier ||
          instance.DBInstanceArn ||
          `rds-${index}`,
        service: "RDS",
        type: instance.DBInstanceClass || "RDS Database",
        status: formatStatus(state),
        name: getResourceName(instance, `RDS Database ${index + 1}`),
        detail: `${instance.Engine || "Database"} � ${state}`,
        raw: instance,
      });
    });

    (resources?.eks?.clusters ?? []).forEach((cluster, index) => {
      const state = cluster.status || "unknown";

      cards.push({
        id: cluster.name || cluster.ClusterName || `eks-${index}`,
        service: "EKS",
        type: "Kubernetes Cluster",
        status: formatStatus(state),
        name: getResourceName(cluster, `EKS Cluster ${index + 1}`),
        detail: `Kubernetes � ${state}`,
        raw: cluster,
      });
    });

    (resources?.vpc?.vpcs ?? []).forEach((vpc, index) => {
      cards.push({
        id: vpc.VpcId || `vpc-${index}`,
        service: "VPC",
        type: "Virtual Network",
        status: "Healthy",
        name: getResourceName(vpc, `VPC ${index + 1}`),
        detail: vpc.CidrBlock || "AWS Virtual Private Cloud",
        raw: vpc,
      });
    });

    return cards;
  }, [resources]);

  const filteredResources =
    filter === "All"
      ? resourceCards
      : resourceCards.filter((resource) => resource.service === filter);

  const categories = ["All", "EC2", "S3", "RDS", "EKS", "VPC"];

  const serviceSummary = [
    {
      key: "EC2",
      label: "EC2",
      count: counts.ec2,
      icon: Server,
      subtitle: `${runningEC2} running`,
    },
    {
      key: "S3",
      label: "S3",
      count: counts.s3,
      icon: Box,
      subtitle: "Buckets",
    },
    {
      key: "RDS",
      label: "RDS",
      count: counts.rds,
      icon: Database,
      subtitle: "Databases",
    },
    {
      key: "EKS",
      label: "EKS",
      count: counts.eks,
      icon: Globe2,
      subtitle: "Clusters",
    },
    {
      key: "VPC",
      label: "VPC",
      count: counts.vpc,
      icon: Shield,
      subtitle: "Networks",
    },
  ];

  return (
    <main className="min-h-screen bg-[#040404] text-[#F6E8DF]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b border-white/[0.06] pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B7D1C5]">
                <Cloud className="h-4 w-4" />
                Infrastructure
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                Cloud infrastructure, in one view.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#85807C] sm:text-base">
                Live AWS resource visibility for Cloudnexaa OpsMind. Review
                services, runtime state, and individual resource details from
                one control surface.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  AWS Connected
                </span>

                {data?.region && (
                  <span className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-[#8D8884]">
                    Region:{" "}
                    <span className="font-medium text-[#D9CEC8]">
                      {data.region}
                    </span>
                  </span>
                )}

                <span className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-[#8D8884]">
                  Auto-refresh 30s
                </span>
              </div>
            </div>

            <button
              onClick={() => loadInfrastructure(true)}
              disabled={loading || refreshing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium text-[#F6E8DF] transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh inventory
            </button>
          </div>
        </header>

        {error && (
          <section className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/[0.045] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

              <div>
                <p className="font-medium text-red-200">
                  Infrastructure connection error
                </p>

                <p className="mt-1 text-sm leading-6 text-red-200/60">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#696460]">
                Total resources
              </span>

              <Activity className="h-4 w-4 text-[#8E8883]" />
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="text-3xl font-semibold tracking-tight">
                {loading ? "�" : totalResources}
              </p>

              <span className="text-xs text-[#6F6964]">
                Across 5 AWS services
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.035] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#696460]">
                Running EC2
              </span>

              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="text-3xl font-semibold tracking-tight text-emerald-300">
                {loading ? "�" : runningEC2}
              </p>

              <span className="text-xs text-emerald-200/40">
                Active compute
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.035] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#696460]">
                Stopped EC2
              </span>

              <span className="h-2 w-2 rounded-full bg-amber-400" />
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="text-3xl font-semibold tracking-tight text-amber-300">
                {loading ? "�" : stoppedEC2}
              </p>

              <span className="text-xs text-amber-200/40">
                Review candidates
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#696460]">
                Compute health
              </span>

              <CheckCircle2 className="h-4 w-4 text-[#B7D1C5]" />
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="text-3xl font-semibold tracking-tight">
                {loading ? "�" : `${healthPercentage}%`}
              </p>

              <span className="text-xs text-[#6F6964]">
                Based on EC2 runtime
              </span>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/[0.07] bg-[#090909] p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#625D59]">
                Service layer
              </p>

              <p className="mt-1 text-sm text-[#8B8581]">
                Select a service to focus the live inventory below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:min-w-[700px]">
              {serviceSummary.map((item) => {
                const Icon = item.icon;
                const active = filter === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => setFilter(active ? "All" : item.key)}
                    className={`group rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-orange-400/20 bg-orange-400/[0.055]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Icon
                        className={`h-4 w-4 ${
                          active ? "text-orange-300" : "text-[#8C8681]"
                        }`}
                      />

                      <ChevronRight
                        className={`h-3.5 w-3.5 transition ${
                          active
                            ? "translate-x-0 text-orange-300"
                            : "-translate-x-1 text-[#4D4844] group-hover:translate-x-0 group-hover:text-[#8B8581]"
                        }`}
                      />
                    </div>

                    <p className="mt-4 text-xs font-semibold text-[#D8CDC7]">
                      {item.label}
                    </p>

                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="text-xl font-semibold">
                        {loading ? "�" : item.count}
                      </span>

                      <span className="text-[10px] text-[#625D59]">
                        {item.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.07] bg-[#080808]">
          <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold tracking-tight">
                    AWS resource inventory
                  </h2>

                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-[#746E69]">
                    {filter}
                  </span>
                </div>

                <p className="mt-1 text-sm text-[#66605C]">
                  Live resources discovered from the connected AWS account.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setFilter(category)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                      filter === category
                        ? "bg-[#F6E8DF] text-[#090909]"
                        : "border border-white/[0.06] bg-white/[0.02] text-[#77706B] hover:bg-white/[0.05] hover:text-[#D7CCC6]"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                <div className="rounded-full border border-white/10 bg-white/[0.025] p-3">
                  <Loader2 className="h-5 w-5 animate-spin text-[#B7D1C5]" />
                </div>

                <p className="mt-4 text-sm font-medium text-[#BFB4AE]">
                  Discovering AWS resources
                </p>

                <p className="mt-1 text-xs text-[#625D59]">
                  Reading the connected environment...
                </p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] text-center">
                <Cloud className="h-8 w-8 text-[#514C48]" />

                <p className="mt-4 text-sm font-medium text-[#AAA09A]">
                  No resources found
                </p>

                <p className="mt-1 max-w-sm text-xs leading-5 text-[#625D59]">
                  There are no discovered resources in the currently selected
                  category.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredResources.map((resource) => {
                  const Icon = serviceIcon(resource.service);
                  const accent = serviceAccent(resource.service);

                  return (
                    <button
                      key={resource.id}
                      onClick={() => setSelected(resource)}
                      className="group rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.035]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${accent}`}
                          >
                            <Icon className="h-4.5 w-4.5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5F5955]">
                                {resource.service}
                              </span>

                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusDot(
                                  resource.status
                                )}`}
                              />
                            </div>

                            <h3 className="mt-1 truncate text-sm font-medium text-[#E6DBD5]">
                              {resource.name}
                            </h3>
                          </div>
                        </div>

                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#4D4844] transition group-hover:translate-x-0.5 group-hover:text-[#938A84]" />
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-[#514C48]">
                            Type
                          </p>

                          <p className="mt-1 truncate text-xs text-[#A69C96]">
                            {resource.type}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-[#514C48]">
                            Status
                          </p>

                          <p
                            className={`mt-1 text-xs font-medium ${statusClass(
                              resource.status
                            )}`}
                          >
                            {resource.status}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-white/[0.04] bg-black/20 px-3 py-2.5">
                        <p className="truncate text-[11px] text-[#66605C]">
                          {resource.detail}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-[#B7D1C5]/10 bg-[#B7D1C5]/5 p-2.5">
                <Activity className="h-4 w-4 text-[#B7D1C5]" />
              </div>

              <div>
                <p className="text-sm font-medium text-[#DDD2CC]">
                  OpsMind infrastructure engine
                </p>

                <p className="mt-2 text-sm leading-6 text-[#716A66]">
                  Inventory is collected directly from the connected AWS
                  environment. The view automatically refreshes every 30
                  seconds and supports manual refresh, service filtering, and
                  resource-level inspection.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-400/10 bg-orange-400/[0.025] p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300/70">
              Monitoring scope
            </p>

            <p className="mt-3 text-sm leading-6 text-[#7E7671]">
              This screen represents infrastructure inventory and runtime
              state. Operational actions remain isolated behind OpsMind safety
              and approval controls.
            </p>
          </div>
        </section>

        <footer className="mt-8 border-t border-white/[0.06] py-6 text-center">
          <p className="text-[11px] text-[#4F4A46]">
            Cloudnexaa Technologies <span className="px-1.5">�</span> OpsMind
            Infrastructure Control
          </p>
        </footer>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md sm:p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B7D1C5]">
                    {selected.service}
                  </span>

                  <span className={`h-1.5 w-1.5 rounded-full ${statusDot(selected.status)}`} />
                </div>

                <h2 className="mt-2 truncate text-xl font-semibold tracking-tight text-[#F2E7E1] sm:text-2xl">
                  {selected.name}
                </h2>

                <p className="mt-1 text-sm text-[#6E6762]">
                  {selected.type}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2 text-[#77706B] transition hover:bg-white/[0.06] hover:text-[#F6E8DF]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(88vh-92px)] overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#514C48]">
                    Service
                  </p>

                  <p className="mt-2 text-sm text-[#D8CEC8]">
                    {selected.service}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#514C48]">
                    Status
                  </p>

                  <p
                    className={`mt-2 text-sm font-medium ${statusClass(
                      selected.status
                    )}`}
                  >
                    {selected.status}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#514C48]">
                    Resource type
                  </p>

                  <p className="mt-2 text-sm text-[#D8CEC8]">
                    {selected.type}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#514C48]">
                    Resource ID
                  </p>

                  <p className="mt-2 break-all font-mono text-xs leading-5 text-[#8E8680]">
                    {selected.id}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#060606]">
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5B5551]">
                    Raw AWS resource data
                  </p>
                </div>

                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-all p-4 text-[11px] leading-5 text-[#77706B]">
                  {JSON.stringify(selected.raw, null, 2)}
                </pre>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-orange-400/10 bg-orange-400/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-200/80">
                    Inspection mode
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-orange-100/35">
                    This modal is read-only. No AWS changes are performed from
                    the infrastructure inventory.
                  </p>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-[#E7DCD6] transition hover:bg-white/[0.08]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
