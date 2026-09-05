"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";import { useRouter } from "next/navigation";

import {
  Activity,
  ArrowRight,
  Cloud,
  Database,
  Globe,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

type Resource = {
  id: string;
  service: string;
  name: string;
  state: string;
  risk: "low" | "medium" | "high";
  region: string;
  endpoint: string;
  signals: string[];
};

type Data = {
  success?: boolean;
  region?: string;

  summary?: {
    totalResources?: number;
    highRisk?: number;
    mediumRisk?: number;
    lowRisk?: number;
    totalFindings?: number;
    currentCost?: number;
    currency?: string;
  };

  resources?: Resource[];
};

function riskClass(risk: string) {
  if (risk === "high") {
    return "border-red-400/20 bg-red-400/[0.05] text-red-300";
  }

  if (risk === "medium") {
    return "border-amber-400/20 bg-amber-400/[0.05] text-amber-300";
  }

  return "border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-300";
}

function iconFor(service: string) {
  switch (service) {
    case "EC2":
      return Server;
    case "RDS":
      return Database;
    case "EKS":
      return Globe;
    default:
      return Cloud;
  }
}

export default function ResourceIntelligencePage() {
  const router = useRouter();

  const [data, setData] =
    useState<Data | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [riskFilter, setRiskFilter] =
    useState("all");

  async function load(manual = false) {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        "/api/opsmind/resource-intelligence",
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.error ||
            "Unable to load resource intelligence."
        );
      }

      setData(result);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load resource intelligence."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();

    const interval =
      window.setInterval(
        () => load(),
        30000
      );

    return () =>
      window.clearInterval(interval);
  }, []);

  const resources =
    data?.resources || [];

  const filtered =
    useMemo(() => {
      const text =
        query.trim().toLowerCase();

      return resources.filter(
        (resource) => {
          const matchesText =
            !text ||
            resource.name
              .toLowerCase()
              .includes(text) ||
            resource.service
              .toLowerCase()
              .includes(text) ||
            resource.id
              .toLowerCase()
              .includes(text);

          const matchesRisk =
            riskFilter === "all" ||
            resource.risk === riskFilter;

          return (
            matchesText &&
            matchesRisk
          );
        }
      );
    }, [
      resources,
      query,
      riskFilter,
    ]);

  return (
    <main className="min-h-screen bg-[#040404] text-[#F6E8DF]">

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">

        <header className="flex flex-col gap-5 border-b border-white/[0.07] pb-7 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#666]">

              <span className="h-1.5 w-1.5 rounded-full bg-[#FA4A0D]" />

              OpsMind
              <span className="text-[#444]">/</span>
              Resource Intelligence

            </div>

            <h1 className="text-[38px] font-semibold tracking-[-0.055em] sm:text-[46px]">
              Resource Intelligence
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-[#777]">
              Understand what exists in your AWS environment,
              what requires attention, and where the operational
              risk is concentrated.
            </p>

          </div>

          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.025] px-4 py-2.5 text-xs text-[#CFC5BF] transition hover:bg-white/[0.05] disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>

        </header>

        {error && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.04] p-4 text-xs text-red-300">
            <TriangleAlert size={16} />
            {error}
          </div>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            title="Resources"
            value={
              loading
                ? "â€”"
                : data?.summary?.totalResources ??
                  0
            }
            icon={<Cloud size={17} />}
          />

          <SummaryCard
            title="High Risk"
            value={
              loading
                ? "â€”"
                : data?.summary?.highRisk ??
                  0
            }
            icon={
              <ShieldAlert size={17} />
            }
            danger
          />

          <SummaryCard
            title="Medium Risk"
            value={
              loading
                ? "â€”"
                : data?.summary?.mediumRisk ??
                  0
            }
            icon={
              <TriangleAlert size={17} />
            }
          />

          <SummaryCard
            title="Findings"
            value={
              loading
                ? "â€”"
                : data?.summary?.totalFindings ??
                  0
            }
            icon={
              <Activity size={17} />
            }
          />

        </section>

        <section className="mt-5 rounded-[24px] border border-white/[0.08] bg-[#090909] p-5 sm:p-6">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
                Inventory
              </p>

              <h2 className="mt-2 text-lg font-medium">
                Live AWS Resources
              </h2>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">

              <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.015] px-3">
                <Search
                  size={14}
                  className="text-[#555]"
                />

                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  placeholder="Search resources..."
                  className="h-10 w-full bg-transparent text-xs text-[#D8CEC8] outline-none placeholder:text-[#444] sm:w-56"
                />
              </div>

              <div className="flex gap-2">

                {[
                  ["all", "All"],
                  ["high", "High"],
                  ["medium", "Medium"],
                  ["low", "Low"],
                ].map(
                  ([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() =>
                        setRiskFilter(
                          value
                        )
                      }
                      className={`rounded-lg border px-3 py-2 text-[9px] uppercase tracking-wider transition ${
                        riskFilter === value
                          ? "border-[#B7D1C5]/20 bg-[#B7D1C5]/[0.06] text-[#B7D1C5]"
                          : "border-white/[0.07] bg-white/[0.015] text-[#666] hover:text-[#999]"
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}

              </div>

            </div>

          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.06]">

            <div className="hidden grid-cols-[1.6fr_0.6fr_0.8fr_1fr_0.9fr] border-b border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[9px] uppercase tracking-wider text-[#555] md:grid">

              <span>Resource</span>
              <span>Service</span>
              <span>State</span>
              <span>Region</span>
              <span>Risk</span>

            </div>

            {loading ? (

              <div className="space-y-2 p-3">
                {[1,2,3,4,5].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-xl bg-white/[0.025]"
                    />
                  )
                )}
              </div>

            ) : filtered.length === 0 ? (

              <div className="p-12 text-center">

                <ShieldCheck
                  size={24}
                  className="mx-auto text-[#555]"
                />

                <p className="mt-3 text-xs text-[#666]">
                  No matching resources found.
                </p>

              </div>

            ) : (

              <div className="divide-y divide-white/[0.05]">

                {filtered.map(
                  (resource) => {

                    const Icon =
                      iconFor(
                        resource.service
                      );

                    return (
                      <button
                        type="button"
                        key={resource.id}
                        onClick={() => router.push(`/resource-detail?id=${encodeURIComponent(resource.id)}`)}
                        className="w-full text-left transition hover:bg-white/[0.025]"
                      >

                        <div className="grid gap-3 px-4 py-4 md:grid-cols-[1.6fr_0.6fr_0.8fr_1fr_0.9fr] md:items-center">

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02]">

                              <Icon
                                size={15}
                                className="text-[#B7D1C5]"
                              />

                            </div>

                            <div className="min-w-0">

                              <div className="flex items-center gap-2">
                                <p className="truncate text-xs font-medium text-[#D8CEC8]">
                                  {resource.name}
                                </p>
                                <span className="shrink-0 text-[8px] uppercase tracking-wider text-[#444] transition group-hover:text-[#777]">Deep Dive</span>
                              </div>

                              <p className="mt-1 truncate font-mono text-[9px] text-[#555]">
                                {resource.id}
                              </p>

                            </div>

                          </div>

                          <span className="text-[10px] text-[#888]">
                            {resource.service}
                          </span>

                          <span className="text-[10px] text-[#777]">
                            {resource.state}
                          </span>

                          <span className="truncate text-[10px] text-[#666]">
                            {resource.region}
                          </span>

                          <span
                            className={`w-fit rounded-md border px-2 py-1 text-[9px] uppercase tracking-wider ${riskClass(
                              resource.risk
                            )}`}
                          >
                            {resource.risk}
                          </span>

                        </div>

                        {resource.signals.length > 0 && (
                          <div className="px-4 pb-4 md:pl-16">

                            <div className="flex flex-wrap gap-2">

                              {resource.signals.map(
                                (signal) => (
                                  <span
                                    key={`${resource.id}-${signal}`}
                                    className="rounded-md border border-white/[0.06] bg-white/[0.015] px-2 py-1 text-[9px] text-[#666]"
                                  >
                                    {signal}
                                  </span>
                                )
                              )}

                            </div>

                          </div>
                        )}

                      </button>
                    );
                  }
                )}

              </div>
            )}

          </div>

        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {[
            [
              "Cloud Doctor",
              "Diagnose detected operational problems.",
              "/cloud-doctor",
            ],
            [
              "Security Center",
              "Investigate infrastructure exposure.",
              "/security",
            ],
            [
              "Cost Intelligence",
              "Review cloud spend and optimization.",
              "/costs",
            ],
            [
              "Incidents",
              "Follow issues through the response lifecycle.",
              "/incidents",
            ],
          ].map(
            ([title, description, path]) => (
              <button
                type="button"
                key={path}
                onClick={() =>
                  router.push(path)
                }
                className="group rounded-[20px] border border-white/[0.08] bg-[#090909] p-5 text-left transition hover:-translate-y-0.5 hover:border-white/[0.15]"
              >

                <div className="flex items-center justify-between">

                  <p className="text-sm font-medium text-[#D8CEC8]">
                    {title}
                  </p>

                  <ArrowRight
                    size={14}
                    className="text-[#444] transition group-hover:translate-x-1 group-hover:text-[#888]"
                  />

                </div>

                <p className="mt-2 text-[10px] leading-5 text-[#555]">
                  {description}
                </p>

              </button>
            )
          )}

        </section>

        <footer className="mt-8 border-t border-white/[0.06] pt-5 text-[10px] text-[#444]">
          Cloudnexaa Technologies Â· OpsMind Resource Intelligence
        </footer>

      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  danger = false,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-[#090909] p-5">

      <div className="flex items-center justify-between">

        <p className="text-[10px] uppercase tracking-[0.18em] text-[#555]">
          {title}
        </p>

        <span
          className={
            danger
              ? "text-red-300"
              : "text-[#B7D1C5]"
          }
        >
          {icon}
        </span>

      </div>

      <p
        className={`mt-4 text-3xl font-semibold ${
          danger
            ? "text-red-300"
            : "text-[#E8DDD7]"
        }`}
      >
        {value}
      </p>

    </div>
  );
}
