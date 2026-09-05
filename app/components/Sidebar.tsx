"use client";

import {
  Activity,
  AlertTriangle,
  Cloud,
  DollarSign,
  Gauge,
  GitBranch,
  Layers,
  Network,
  Server,
  ShieldCheck,
  Stethoscope,
  Terminal,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    title: "COMMAND CENTER",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: Gauge },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { name: "Cloud Doctor", path: "/cloud-doctor", icon: Stethoscope },
      { name: "Cost Intelligence", path: "/costs", icon: DollarSign },
      { name: "Security Center", path: "/security", icon: ShieldCheck },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { name: "Infrastructure", path: "/infrastructure", icon: Network },
      { name: "Observability", path: "/observability", icon: Activity },
      { name: "Incidents", path: "/incidents", icon: AlertTriangle },
      { name: "Automation", path: "/automation", icon: Zap },
    ],
  },
  {
    title: "ENGINEERING",
    items: [
      { name: "DevOps", path: "/devops", icon: GitBranch },
      { name: "Kubernetes", path: "/kubernetes", icon: Layers },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 border-r border-white/10 bg-[#070b17]/95 backdrop-blur-xl lg:flex lg:flex-col">

      <div className="border-b border-white/10 px-6 py-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
            <Cloud className="h-5 w-5 text-[#B7D1C5]" />
          </div>

          <div>
            <p className="text-sm font-bold tracking-widest text-[#F6E8DF]">
              CLOUDNEXAA
            </p>
            <p className="text-[10px] font-medium tracking-[0.3em] text-[#B7D1C5]">
              OPSMIND
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {sections.map((section) => (
          <div key={section.title} className="mb-7">
            <p className="mb-3 px-3 text-[9px] font-semibold tracking-[0.2em] text-slate-600">
              {section.title}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-cyan-400/10 text-[#B7D1C5]"
                        : "text-[#777C85] hover:bg-[#0B0B0B]/5 hover:text-[#F6E8DF]"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        active
                          ? "text-[#B7D1C5]"
                          : "text-slate-600 group-hover:text-slate-300"
                      }`}
                    />

                    <span>{item.name}</span>

                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl border border-white/5 bg-[#0B0B0B]/[0.03] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-500/20">
              <Server className="h-4 w-4 text-[#B7D1C5]" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#F6E8DF]">
                Jaikrish
              </p>
              <p className="truncate text-[10px] text-slate-600">
                Founder • Cloudnexaaa
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            OpsMind Online
          </div>
        </div>
      </div>

    </aside>
  );
}
