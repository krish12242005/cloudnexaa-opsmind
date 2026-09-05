"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowRight,
  Globe,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

type Finding = {
  id: string;
  service: string;
  resourceId: string;
  resourceName: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
};

type Data = {
  success?: boolean;
  region?: string;

  summary?: {
    total?: number;
    high?: number;
    medium?: number;
    low?: number;
    posture?: string;
  };

  findings?: Finding[];
};

function severityClass(
  severity: string
) {
  switch (
    severity.toLowerCase()
  ) {
    case "high":
      return "border-red-400/20 bg-red-400/[0.05] text-red-300";

    case "medium":
      return "border-amber-400/20 bg-amber-400/[0.05] text-amber-300";

    default:
      return "border-[#B7D1C5]/15 bg-[#B7D1C5]/[0.035] text-[#B7D1C5]";
  }
}

export default function SecurityExposurePage() {
  const router = useRouter();

  const [data, setData] =
    useState<Data | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [severity, setSeverity] =
    useState("all");

  async function load(
    manual = false
  ) {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response =
        await fetch(
          "/api/opsmind/security-exposure",
          {
            cache: "no-store",
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.error ||
            "Unable to load security exposure."
        );
      }

      setData(result);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load security exposure."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();

    const timer =
      window.setInterval(
        () => load(),
        30000
      );

    return () =>
      window.clearInterval(timer);
  }, []);

  const findings =
    data?.findings || [];

  const filtered =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      return findings.filter(
        (item) => {

          const matchesText =
            !q ||
            item.title
              .toLowerCase()
              .includes(q) ||
            item.resourceName
              .toLowerCase()
              .includes(q) ||
            item.resourceId
              .toLowerCase()
              .includes(q) ||
            item.service
              .toLowerCase()
              .includes(q);

          const matchesSeverity =
            severity === "all" ||
            item.severity === severity;

          return (
            matchesText &&
            matchesSeverity
          );
        }
      );
    }, [
      findings,
      search,
      severity,
    ]);

  const posture =
    data?.summary?.posture ||
    "Analyzing";

  const safe =
    (data?.summary?.high || 0) === 0 &&
    (data?.summary?.medium || 0) === 0;

  return (
    <main className="min-h-screen bg-[#040404] text-[#F6E8DF]">

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">

        <header className="flex flex-col gap-5 border-b border-white/[0.07] pb-7 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#666]">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              OpsMind
              <span className="text-[#444]">/</span>
              Security Exposure
            </div>

            <h1 className="text-[38px] font-semibold tracking-[-0.055em] sm:text-[46px]">
              Security Exposure Center
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-[#777]">
              Detect publicly exposed and potentially unsafe cloud
              configurations using the data available from the
              connected AWS environment.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              load(true)
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.025] px-4 py-2.5 text-xs text-[#CFC5BF] hover:bg-white/[0.05] disabled:opacity-50"
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
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-4 text-xs text-red-300">
            {error}
          </div>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <Metric
            label="Total Signals"
            value={
              loading
                ? "—"
                : String(
                    data?.summary?.total ||
                    0
                  )
            }
          />

          <Metric
            label="High Risk"
            value={
              loading
                ? "—"
                : String(
                    data?.summary?.high ||
                    0
                  )
            }
            danger
          />

          <Metric
            label="Medium Risk"
            value={
              loading
                ? "—"
                : String(
                    data?.summary?.medium ||
                    0
                  )
            }
          />

          <div className="rounded-[20px] border border-white/[0.08] bg-[#090909] p-5">

            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#555]">
                Posture
              </p>

              {safe ? (
                <ShieldCheck
                  size={17}
                  className="text-[#B7D1C5]"
                />
              ) : (
                <ShieldAlert
                  size={17}
                  className="text-amber-300"
                />
              )}
            </div>

            <p className="mt-4 text-sm font-medium text-[#D8CEC8]">
              {loading
                ? "Analyzing..."
                : posture}
            </p>

          </div>

        </section>

        <section className="mt-5 rounded-[24px] border border-white/[0.08] bg-[#090909] p-5 sm:p-6">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
                Detection Feed
              </p>

              <h2 className="mt-2 text-lg font-medium">
                Exposure Signals
              </h2>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">

              <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.015] px-3">

                <Search
                  size={14}
                  className="text-[#555]"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search findings..."
                  className="h-10 w-full bg-transparent text-xs text-[#D8CEC8] outline-none placeholder:text-[#444] sm:w-56"
                />

              </div>

              <div className="flex gap-2">

                {[
                  ["all", "All"],
                  ["high", "High"],
                  ["medium", "Medium"],
                ].map(
                  ([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() =>
                        setSeverity(
                          value
                        )
                      }
                      className={`rounded-lg border px-3 py-2 text-[9px] uppercase tracking-wider ${
                        severity === value
                          ? "border-[#B7D1C5]/20 bg-[#B7D1C5]/[0.06] text-[#B7D1C5]"
                          : "border-white/[0.07] bg-white/[0.015] text-[#666]"
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}

              </div>

            </div>

          </div>

          <div className="mt-5 space-y-3">

            {loading ? (

              [1,2,3,4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-xl bg-white/[0.02]"
                  />
                )
              )

            ) : filtered.length === 0 ? (

              <div className="rounded-2xl border border-[#B7D1C5]/10 bg-[#B7D1C5]/[0.025] p-10 text-center">

                <ShieldCheck
                  size={25}
                  className="mx-auto text-[#B7D1C5]"
                />

                <h3 className="mt-4 text-sm font-medium">
                  No matching exposure signals
                </h3>

                <p className="mt-2 text-[10px] text-[#555]">
                  No finding was returned by the available AWS resource data.
                </p>

                <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">

                  <button
                    type="button"
                    onClick={() =>
                      router.push("/resource-intelligence")
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#B7D1C5]/15 bg-[#B7D1C5]/[0.04] px-4 py-2.5 text-[9px] uppercase tracking-wider text-[#B7D1C5] transition hover:bg-[#B7D1C5]/[0.08]"
                  >
                    Resource Intelligence
                    <ArrowRight size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      router.push("/infrastructure")
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[9px] uppercase tracking-wider text-[#888] transition hover:bg-white/[0.05]"
                  >
                    Infrastructure
                    <ArrowRight size={13} />
                  </button>

                </div>

              </div>

            ) : (

              filtered.map(
                (finding) => (
                  <div
                    key={finding.id}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4 transition hover:border-white/[0.13]"
                  >

                    <div className="flex flex-col gap-4 md:flex-row md:items-start">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">

                        <Globe
                          size={17}
                          className={
                            finding.severity === "high"
                              ? "text-red-300"
                              : "text-amber-300"
                          }
                        />

                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="text-sm font-medium text-[#D8CEC8]">
                            {finding.title}
                          </h3>

                          <span
                            className={`rounded-md border px-2 py-1 text-[8px] uppercase tracking-wider ${severityClass(
                              finding.severity
                            )}`}
                          >
                            {finding.severity}
                          </span>

                          <span className="rounded-md border border-white/[0.07] px-2 py-1 text-[8px] uppercase tracking-wider text-[#555]">
                            {finding.service}
                          </span>

                        </div>

                        <p className="mt-2 text-xs leading-5 text-[#777]">
                          {finding.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">

                          <span className="rounded-md border border-white/[0.06] bg-black/20 px-2 py-1 text-[9px] text-[#666]">
                            Resource:{" "}
                            <span className="text-[#888]">
                              {finding.resourceName}
                            </span>
                          </span>

                          <span className="rounded-md border border-white/[0.06] bg-black/20 px-2 py-1 font-mono text-[9px] text-[#555]">
                            {finding.resourceId}
                          </span>

                        </div>

                        <div className="mt-3 rounded-lg border border-[#B7D1C5]/10 bg-[#B7D1C5]/[0.02] p-3">
                          <p className="text-[9px] uppercase tracking-wider text-[#555]">
                            Recommendation
                          </p>
                          <p className="mt-1 text-[10px] leading-5 text-[#777]">
                            {finding.recommendation}
                          </p>
                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/resource-detail?id=${encodeURIComponent(
                              finding.resourceId
                            )}`
                          )
                        }
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-[9px] uppercase tracking-wider text-[#888] hover:bg-white/[0.04]"
                      >
                        Resource
                        <ArrowRight size={13} />
                      </button>

                    </div>

                  </div>
                )
              )

            )}

          </div>

        </section>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.025] p-4">

          <AlertTriangle
            size={17}
            className="mt-0.5 shrink-0 text-amber-300"
          />

          <p className="text-[10px] leading-5 text-amber-200/60">
            Security Exposure Center is analysis-only. It does not
            change IAM, security groups, buckets, databases, clusters
            or other AWS resources.
          </p>

        </div>

        <footer className="mt-8 border-t border-white/[0.06] pt-5 text-[10px] text-[#444]">
          Cloudnexaa Technologies · OpsMind Security Exposure Center
        </footer>

      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-[#090909] p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#555]">
        {label}
      </p>

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