"use client";

import {
  Bell,
  ChevronDown,
  Cloud,
  Command,
  Search,
} from "lucide-react";

export default function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#040404]/80 px-4 backdrop-blur-xl md:px-6">

      <div className="flex items-center gap-3 pl-14 lg:pl-0">
        <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-[#0B0B0B]/[0.03] px-3 py-2 md:flex">
          <Cloud className="h-4 w-4 text-[#B7D1C5]" />
          <span className="text-xs text-[#9B9B9B]">Production</span>
          <ChevronDown className="h-3 w-3 text-slate-600" />
        </div>

        <div className="hidden h-5 w-px bg-[#0B0B0B]/10 md:block" />

        <span className="hidden text-xs text-slate-600 md:block">
          ap-south-1
        </span>
      </div>

      <div className="flex items-center gap-2">

        <button
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "k",
                ctrlKey: true,
              })
            );
          }}
          className="hidden items-center gap-2 rounded-lg border border-white/10 bg-[#0B0B0B]/[0.03] px-3 py-2 text-xs text-[#777C85] transition hover:border-cyan-400/30 hover:text-[#F6E8DF] md:flex"
        >
          <Search className="h-3.5 w-3.5" />
          Search
          <span className="ml-2 flex items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 text-[9px]">
            <Command className="h-2.5 w-2.5" />
            K
          </span>
        </button>

        <div className="hidden h-5 w-px bg-[#0B0B0B]/10 md:block" />

        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/10 bg-emerald-400/5 px-3 py-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-[10px] text-emerald-400">
            OpsMind Online
          </span>
        </div>

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#0B0B0B]/[0.03] text-[#777C85] transition hover:text-[#F6E8DF]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange-400" />
        </button>

      </div>
    </header>
  );
}
