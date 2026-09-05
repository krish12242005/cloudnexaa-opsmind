"use client";

import {
  Activity,
  AlertTriangle,
  Cloud,
  DollarSign,
  Gauge,
  GitBranch,
  Layers,
  Menu,
  Network,
  ShieldCheck,
  Stethoscope,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const items = [
  { name: "Dashboard", path: "/dashboard", icon: Gauge },
  { name: "Cloud Doctor", path: "/cloud-doctor", icon: Stethoscope },
  { name: "Cost Intelligence", path: "/costs", icon: DollarSign },
  { name: "Security Center", path: "/security", icon: ShieldCheck },
  { name: "Infrastructure", path: "/infrastructure", icon: Network },
  { name: "Observability", path: "/observability", icon: Activity },
  { name: "Incidents", path: "/incidents", icon: AlertTriangle },
  { name: "Automation", path: "/automation", icon: Zap },
  { name: "DevOps", path: "/devops", icon: GitBranch },
  { name: "Kubernetes", path: "/kubernetes", icon: Layers },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0a1020]/90 text-slate-300 backdrop-blur-xl lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        >
          <aside
            className="h-full w-72 border-r border-white/10 bg-[#070b17] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10">
                  <Cloud className="h-5 w-5 text-[#B7D1C5]" />
                </div>

                <div>
                  <p className="text-xs font-bold tracking-widest">
                    CLOUDNEXAA
                  </p>
                  <p className="text-[9px] tracking-[0.3em] text-[#B7D1C5]">
                    OPSMIND
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-[#777C85] hover:bg-[#0B0B0B]/5 hover:text-[#F6E8DF]"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-1 overflow-y-auto p-4">
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#9B9B9B] transition hover:bg-cyan-400/10 hover:text-[#B7D1C5]"
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="absolute bottom-0 w-72 border-t border-white/10 p-4">
              <p className="text-xs font-semibold">Jaikrish</p>
              <p className="mt-1 text-[10px] text-slate-600">
                Founder • Cloudnexaaa
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
