"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Activity,
  ArrowLeft,
  Cloud,
  Copy,
  Database,
  Globe,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

type ResourceDetail = {
  id: string;
  name: string;
  service: string;
  type: string;
  state: string;
  region: string;
  endpoint: string;
  risk: string;
  signals: string[];
  recommendation: string;

  identifiers: {
    arn: string | null;
    id: string;
  };

  networking: {
    publicIp: string | null;
    privateIp: string | null;
    securityGroups: unknown[];
  };

  security: {
    encrypted: boolean | null;
    publiclyAccessible: boolean | null;
  };
};

type Data = {
  success?: boolean;
  region?: string;
  generatedAt?: string;
  resource?: ResourceDetail;
  error?: string;
};

function riskClass(
  risk: string
) {
  switch (
    risk.toLowerCase()
  ) {
    case "high":
      return "border-red-400/20 bg-red-400/[0.05] text-red-300";

    case "medium":
      return "border-amber-400/20 bg-amber-400/[0.05] text-amber-300";

    default:
      return "border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-300";
  }
}

function iconFor(
  service: string
) {
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

export default function ResourceDetailPage() {
  const [
    data,
    setData,
  ] = useState<Data | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(false);

  async function load() {
    try {
      setRefreshing(true);
      setError("");

      const params =
        new URLSearchParams(
          window.location.search
        );

      const id =
        params.get("id");

      if (!id) {
        throw new Error(
          "No resource id was provided."
        );
      }

      const response =
        await fetch(
          `/api/opsmind/resource-detail?id=${encodeURIComponent(
            id
          )}`,
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
            "Unable to load resource."
        );
      }

      setData(result);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load resource."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function copyId() {
    const id =
      data?.resource?.id;

    if (!id) return;

    try {
      await navigator.clipboard.writeText(
        id
      );

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        1200
      );
    } catch {}
  }

  const resource =
    data?.resource;

  const Icon =
    iconFor(
      resource?.service || ""
    );

  return (
    <main className="min-h-screen bg-[#040404] text-[#F6E8DF]">

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10">

        <header className="flex flex-col gap-5 border-b border-white/[0.07] pb-7 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <button
              type="button"
              onClick={() =>
                window.history.back()
              }
              className="mb-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#666] transition hover:text-[#B7D1C5]"
            >
              <ArrowLeft size={13} />
              Back
            </button>

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#B7D1C5]/15 bg-[#B7D1C5]/[0.05]">
                <Icon
                  size={18}
                  className="text-[#B7D1C5]"
                />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#555]">
                  OpsMind / Resource
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {loading
                    ? "Loading..."
                    : resource?.name}
                </h1>
              </div>

            </div>

            {!loading &&
              resource && (
                <div className="mt-4 flex flex-wrap items-center gap-2">

                  <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[9px] uppercase tracking-wider text-[#777]">
                    {resource.service}
                  </span>

                  <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[9px] text-[#777]">
                    {resource.type}
                  </span>

                  <span
                    className={`rounded-md border px-2 py-1 text-[9px] uppercase tracking-wider ${riskClass(
                      resource.risk
                    )}`}
                  >
                    {resource.risk} risk
                  </span>

                </div>
              )}

          </div>

          <button
            type="button"
            onClick={load}
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
          <div className="mt-5 flex gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-4 text-xs text-red-300">
            <TriangleAlert size={16} />
            {error}
          </div>
        )}

        {loading ? (

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {[1,2,3,4].map(
              (item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse rounded-[22px] border border-white/[0.06] bg-white/[0.02]"
                />
              )
            )}
          </div>

        ) : resource ? (

          <>
            <section className="mt-6 grid gap-4 lg:grid-cols-3">

              <Panel title="Resource State">
                <div className="flex items-center gap-3">
                  <Activity
                    size={18}
                    className="text-[#B7D1C5]"
                  />
                  <div>
                    <p className="text-xl font-semibold">
                      {resource.state}
                    </p>
                    <p className="mt-1 text-[10px] text-[#555]">
                      Current reported state
                    </p>
                  </div>
                </div>
              </Panel>

              <Panel title="Region / Zone">
                <p className="text-lg font-medium">
                  {resource.region}
                </p>
                <p className="mt-2 text-[10px] text-[#555]">
                  AWS placement information
                </p>
              </Panel>

              <Panel title="Risk Posture">
                <div className="flex items-center gap-3">
                  {resource.risk === "high" ? (
                    <ShieldAlert
                      size={18}
                      className="text-red-300"
                    />
                  ) : (
                    <ShieldCheck
                      size={18}
                      className="text-[#B7D1C5]"
                    />
                  )}

                  <span
                    className={`rounded-lg border px-3 py-1.5 text-xs uppercase tracking-wider ${riskClass(
                      resource.risk
                    )}`}
                  >
                    {resource.risk}
                  </span>
                </div>
              </Panel>

            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-2">

              <Panel title="Identity">

                <Detail
                  label="Resource ID"
                  value={resource.id}
                  action={
                    <button
                      type="button"
                      onClick={copyId}
                      className="text-[#666] hover:text-[#B7D1C5]"
                      title="Copy resource ID"
                    >
                      <Copy size={14} />
                    </button>
                  }
                />

                <Detail
                  label="ARN"
                  value={
                    resource.identifiers.arn ||
                    "Not available"
                  }
                />

                {copied && (
                  <p className="mt-3 text-[10px] text-[#B7D1C5]">
                    Resource ID copied.
                  </p>
                )}

              </Panel>

              <Panel title="Networking">

                <Detail
                  label="Public IP"
                  value={
                    resource.networking.publicIp ||
                    "Not available"
                  }
                />

                <Detail
                  label="Private IP"
                  value={
                    resource.networking.privateIp ||
                    "Not available"
                  }
                />

                <Detail
                  label="Endpoint"
                  value={
                    resource.endpoint ||
                    "Not available"
                  }
                />

                <Detail
                  label="Security Groups"
                  value={
                    resource.networking.securityGroups
                      .length
                      ? resource.networking.securityGroups
                          .map((item) =>
                            typeof item ===
                            "string"
                              ? item
                              : JSON.stringify(item)
                          )
                          .join(", ")
                      : "None reported"
                  }
                />

              </Panel>

            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-2">

              <Panel title="Security">

                <Detail
                  label="Encryption"
                  value={
                    resource.security.encrypted ===
                    null
                      ? "Not reported"
                      : resource.security.encrypted
                        ? "Enabled"
                        : "Disabled"
                  }
                />

                <Detail
                  label="Publicly Accessible"
                  value={
                    resource.security
                      .publiclyAccessible ===
                    null
                      ? "Not reported"
                      : resource.security
                          .publiclyAccessible
                        ? "Yes"
                        : "No"
                  }
                />

                <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">

                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#555]">
                    Signals
                  </p>

                  <div className="mt-3 space-y-2">

                    {resource.signals.map(
                      (signal) => (
                        <div
                          key={signal}
                          className="flex items-center gap-2 text-xs text-[#999]"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#B7D1C5]" />
                          {signal}
                        </div>
                      )
                    )}

                  </div>

                </div>

              </Panel>

              <Panel title="OpsMind Recommendation">

                <div className="rounded-xl border border-[#B7D1C5]/10 bg-[#B7D1C5]/[0.025] p-4">

                  <div className="flex items-start gap-3">

                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-[#B7D1C5]"
                    />

                    <p className="text-sm leading-6 text-[#CFC5BF]">
                      {resource.recommendation}
                    </p>

                  </div>

                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      window.location.href =
                        `/cloud-doctor?resource=${encodeURIComponent(
                          resource.id
                        )}`
                    }
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs text-[#999] hover:bg-white/[0.05]"
                  >
                    Cloud Doctor
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.location.href =
                        `/security?resource=${encodeURIComponent(
                          resource.id
                        )}`
                    }
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs text-[#999] hover:bg-white/[0.05]"
                  >
                    Security
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.location.href =
                        `/incidents?resource=${encodeURIComponent(
                          resource.id
                        )}`
                    }
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs text-[#999] hover:bg-white/[0.05]"
                  >
                    Incidents
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.location.href =
                        `/remediation?resource=${encodeURIComponent(
                          resource.id
                        )}`
                    }
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs text-[#999] hover:bg-white/[0.05]"
                  >
                    Remediation
                  </button>

                </div>

              </Panel>

            </section>

            <div className="mt-5 rounded-2xl border border-amber-400/15 bg-amber-400/[0.025] p-4">

              <div className="flex gap-3">

                <TriangleAlert
                  size={17}
                  className="mt-0.5 shrink-0 text-amber-300"
                />

                <p className="text-xs leading-5 text-amber-200/70">
                  OpsMind resource intelligence is read-only.
                  No AWS resource is modified from this screen.
                </p>

              </div>

            </div>
          </>

        ) : null}

        <footer className="mt-8 border-t border-white/[0.06] pt-5 text-[10px] text-[#444]">
          Cloudnexaa Technologies · OpsMind Resource Detail
        </footer>

      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-white/[0.08] bg-[#090909] p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">
        {title}
      </p>

      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 last:mb-0">

      <div className="flex items-center justify-between gap-3">

        <p className="text-[9px] uppercase tracking-wider text-[#555]">
          {label}
        </p>

        {action}

      </div>

      <p className="mt-2 break-all text-xs leading-5 text-[#999]">
        {value}
      </p>

    </div>
  );
}