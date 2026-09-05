"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Cloud,
  Globe2,
  RefreshCw,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react";

type AwsData = {
  success?: boolean;
  connected?: boolean;
  status?: string;
  region?: string;
  accountId?: string;
  account?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
};

export default function AwsSettingsPage() {
  const [data, setData] = useState<AwsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  async function loadConnection() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/aws/connection", {
        cache: "no-store",
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Unable to load AWS connection");
      }

      setData(json);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load AWS connection"
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyConnection() {
    try {
      setVerifying(true);
      setError("");

      const connectionResponse = await fetch("/api/aws/connection", {
        cache: "no-store",
      });
      const connectionJson = await connectionResponse.json();

      const accountId =
        connectionJson?.connection?.accountId ??
        connectionJson?.accountId ??
        "";
      const roleArn =
        connectionJson?.connection?.roleArn ??
        connectionJson?.roleArn ??
        "";

      if (!accountId || !roleArn) {
        throw new Error("AWS account or IAM role is not configured.");
      }

      const response = await fetch("/api/aws/connection/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          accountId,
          roleArn,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "AWS verification failed");
      }

      setData(json);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "AWS verification failed"
      );
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    loadConnection();
  }, []);

  const region =
    data?.region ||
    (data?.data as { region?: string } | undefined)?.region ||
    "ap-south-1";

  const accountId =
    data?.accountId ||
    data?.account ||
    (data?.data as { accountId?: string } | undefined)?.accountId ||
    "Connected AWS Account";

  const connected =
    data?.connected === true ||
    data?.success === true ||
    data?.status === "connected" ||
    data?.status === "Connected";

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-[#f6e8df] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-[#9b9b9b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#fa4a0d]" />
              Cloud Operations / Settings
            </div>

            <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              AWS Settings
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9b9b9b]">
              Manage and verify the AWS environment connected to
              Cloudnexaa OpsMind.
            </p>
          </div>

          <button
            onClick={loadConnection}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#f6e8df] transition hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-5">
            <XCircle className="mt-0.5 text-red-400" size={20} />
            <div>
              <p className="text-sm font-medium text-red-300">
                Connection issue
              </p>
              <p className="mt-1 text-sm text-red-300/70">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Status */}
        <section className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Wifi size={19} className="text-[#b7d1c5]" />
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wider ${
                  connected
                    ? "bg-[#b7d1c5]/10 text-[#b7d1c5]"
                    : "bg-orange-500/10 text-orange-300"
                }`}
              >
                {connected ? "Connected" : "Review"}
              </span>
            </div>

            <p className="text-[10px] uppercase tracking-[0.25em] text-[#777c85]">
              Connection
            </p>

            <h2 className="mt-2 text-xl font-medium">
              {loading ? "Checking..." : connected ? "AWS Connected" : "Connection Review"}
            </h2>

            <p className="mt-2 text-sm text-[#777c85]">
              Live connection status from OpsMind.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Globe2 size={19} className="text-[#b7d1c5]" />
            </div>

            <p className="text-[10px] uppercase tracking-[0.25em] text-[#777c85]">
              Region
            </p>

            <h2 className="mt-2 text-xl font-medium">
              {loading ? "Loading..." : region}
            </h2>

            <p className="mt-2 text-sm text-[#777c85]">
              Active AWS operating region.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Cloud size={19} className="text-[#fa4a0d]" />
            </div>

            <p className="text-[10px] uppercase tracking-[0.25em] text-[#777c85]">
              Account
            </p>

            <h2 className="mt-2 truncate text-xl font-medium">
              {loading ? "Loading..." : accountId}
            </h2>

            <p className="mt-2 text-sm text-[#777c85]">
              AWS environment currently used by OpsMind.
            </p>
          </div>

        </section>

        {/* Main */}
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fa4a0d]/10">
                <Activity size={21} className="text-[#fa4a0d]" />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#777c85]">
                  Environment
                </p>
                <h2 className="mt-1 text-xl font-medium">
                  AWS Production Workspace
                </h2>
              </div>
            </div>

            <div className="space-y-3">

              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-4">
                <span className="text-sm text-[#9b9b9b]">
                  Provider
                </span>
                <span className="text-sm">
                  Amazon Web Services
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-4">
                <span className="text-sm text-[#9b9b9b]">
                  Region
                </span>
                <span className="text-sm">
                  {region}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-4">
                <span className="text-sm text-[#9b9b9b]">
                  Monitoring
                </span>
                <span className="flex items-center gap-2 text-sm text-[#b7d1c5]">
                  <span className="h-2 w-2 rounded-full bg-[#b7d1c5]" />
                  Enabled
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-4">
                <span className="text-sm text-[#9b9b9b]">
                  Resource discovery
                </span>
                <span className="flex items-center gap-2 text-sm text-[#b7d1c5]">
                  <CheckCircle2 size={15} />
                  Active
                </span>
              </div>

            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#b7d1c5]/10">
              <ShieldCheck size={22} className="text-[#b7d1c5]" />
            </div>

            <p className="text-[10px] uppercase tracking-[0.25em] text-[#777c85]">
              Connection verification
            </p>

            <h2 className="mt-2 text-xl font-medium">
              Verify AWS Access
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#777c85]">
              Verify that OpsMind can communicate with the configured AWS
              environment before running operational analysis.
            </p>

            <button
              onClick={verifyConnection}
              disabled={verifying}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#fa4a0d] px-5 py-3.5 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifying ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Verify Connection
                </>
              )}
            </button>

            <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-[#777c85]">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#b7d1c5]" />
              Verification does not modify AWS resources.
            </div>
          </div>

        </section>

        {/* Footer status */}
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? "bg-[#b7d1c5]" : "bg-orange-400"
              }`}
            />
            <span className="text-sm text-[#9b9b9b]">
              OpsMind AWS connection
            </span>
          </div>

          <span className="text-xs text-[#585858]">
            Cloudnexaa Technologies · OpsMind
          </span>
        </div>

      </div>
    </main>
  );
}
