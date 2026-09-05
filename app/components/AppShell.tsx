"use client";

import {
  Activity,
  Bell,
  Boxes,
  Cloud,
  Cpu,
  DollarSign,
  FileClock,
  Gauge,
  HeartPulse,
  Menu,
  Network,
  RefreshCw,
  Radar,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  Stethoscope,
  X,
  Zap,
} from "lucide-react";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
};

const groups: {
  label: string;
  items: NavItem[];
}[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/", icon: Gauge },
      { label: "Infrastructure", href: "/infrastructure", icon: Boxes },
      { label: "Observability", href: "/observability", icon: Activity },
      { label: "Incidents", href: "/incidents", icon: Siren },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Cloud Doctor", href: "/cloud-doctor", icon: Stethoscope },
      { label: "Scan Center", href: "/scan", icon: Radar },
      { label: "Security", href: "/security", icon: ShieldCheck },
      { label: "Cost Intelligence", href: "/costs", icon: DollarSign },
      { label: "Automation", href: "/automation", icon: Zap },
      { label: "Remediation", href: "/remediation", icon: HeartPulse },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Kubernetes", href: "/kubernetes", icon: Network },
      { label: "DevOps", href: "/devops", icon: Cpu },
      { label: "Project Assessment", href: "/assessment", icon: Search },
      { label: "Audit History", href: "/automation/history", icon: FileClock },
      { label: "Settings", href: "/settings/aws", icon: Settings },
    ],
  },
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [scanning, setScanning] = useState(false);

  const navigate = (href: string) => {
    setMobileOpen(false);
    router.push(href);
  };

  async function runOpsMindScan() {
    try {
      setScanning(true);

      const response = await fetch("/api/opsmind/scan", {
        method: "POST",
        cache: "no-store",
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent("opsmind:scan-complete"));
      }
    } catch {
      // Individual dashboard pages handle API errors.
    } finally {
      setScanning(false);
    }
  }

  function refreshApplication() {
    window.location.reload();
  }

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(commandSearch.toLowerCase())
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[#040404] text-[#F6E8DF]">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-[100] flex h-14 items-center justify-between border-b border-white/[0.08] bg-[#040404]/95 px-4 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/70"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FA4A0D]/10">
            <Cloud size={17} className="text-[#FA4A0D]" />
          </div>

          <div>
            <div className="text-sm font-semibold tracking-tight">
              Cloudnexaa
            </div>
            <div className="text-[8px] uppercase tracking-[0.22em] text-white/30">
              OpsMind
            </div>
          </div>
        </div>

        <div className="w-9" />
      </header>

      {/* Mobile navigation overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[105] bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-[110] flex w-[258px] flex-col",
          "border-r border-white/[0.08] bg-[#050505]",
          "transition-transform duration-300",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex h-[82px] shrink-0 items-center border-b border-white/[0.08] px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#FA4A0D]/30 bg-[#FA4A0D]/10">
              <Cloud size={20} className="text-[#FA4A0D]" />

              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#FA4A0D]" />
            </div>

            <div>
              <div className="text-[15px] font-semibold tracking-tight text-[#F6E8DF]">
                Cloudnexaa
              </div>

              <div className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.28em] text-white/35">
                OpsMind
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/[0.05] hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {filteredGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <div className="mb-2 px-3 text-[9px] font-medium uppercase tracking-[0.22em] text-white/25">
                {group.label}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href ||
                        pathname.startsWith(item.href + "/");

                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className={[
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                        active
                          ? "border border-[#FA4A0D]/20 bg-[#FA4A0D]/10 text-[#F6E8DF]"
                          : "border border-transparent text-white/45 hover:bg-white/[0.04] hover:text-white/80",
                      ].join(" ")}
                    >
                      <Icon
                        size={16}
                        strokeWidth={active ? 2 : 1.7}
                      />

                      <span className="text-[12px] font-medium">
                        {item.label}
                      </span>

                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#FA4A0D]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom status */}
        <div className="shrink-0 border-t border-white/[0.08] p-4">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#B7D1C5]" />

              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#B7D1C5]">
                AWS Connected
              </span>
            </div>

            <div className="text-[10px] text-white/30">
              Cloudnexaa Technologies
            </div>

            <div className="mt-1 text-[9px] text-white/20">
              AP-SOUTH-1
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop command bar */}
      <div className="fixed left-0 right-0 top-0 z-[90] hidden h-16 border-b border-white/10 bg-[#050505]/95 backdrop-blur-xl lg:flex lg:items-center lg:pl-[258px]">
        <div className="flex w-full items-center gap-3 px-6">
          <div className="relative min-w-0 max-w-xl flex-1">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777C85]"
            />

            <input
              value={commandSearch}
              onChange={(event) => setCommandSearch(event.target.value)}
              placeholder="Search OpsMind..."
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-11 pr-4 text-sm text-[#F6E8DF] outline-none placeholder:text-[#585858] focus:border-white/20"
            />
          </div>

          <button
            type="button"
            onClick={runOpsMindScan}
            disabled={scanning}
            title="Run comprehensive read-only OpsMind Scan"
            className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-xs text-[#B7D1C5] transition hover:bg-white/[0.07] disabled:opacity-50"
          >
            <ScanLine
              size={15}
              className={scanning ? "animate-pulse" : ""}
            />

            {scanning ? "Scanning..." : "Scan AWS"}
          </button>

          <button
            type="button"
            onClick={refreshApplication}
            title="Refresh application"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-[#9B9B9B] transition hover:bg-white/[0.07] hover:text-white"
          >
            <RefreshCw size={16} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/incidents")}
            title="Open incidents"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-[#9B9B9B] transition hover:bg-white/[0.07] hover:text-white"
          >
            <Bell size={16} />

            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#FA4A0D]" />
          </button>

          <div className="ml-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#B7D1C5]" />

            <span className="text-[10px] uppercase tracking-[0.18em] text-[#9B9B9B]">
              AWS Connected
            </span>
          </div>
        </div>
      </div>

      {/* Mobile command bar */}
      <div className="fixed left-0 right-0 top-14 z-[80] flex h-12 items-center justify-end border-b border-white/10 bg-[#050505]/95 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runOpsMindScan}
            disabled={scanning}
            className="flex h-8 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-[#B7D1C5] disabled:opacity-50"
          >
            <ScanLine
              size={13}
              className={scanning ? "animate-pulse" : ""}
            />

            {scanning ? "Scanning" : "Scan"}
          </button>

          <button
            type="button"
            onClick={refreshApplication}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#9B9B9B]"
            aria-label="Refresh application"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main application */}
      <main className="min-h-screen pt-[106px] lg:ml-[258px] lg:pt-16">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
