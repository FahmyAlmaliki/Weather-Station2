"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudSun, LayoutDashboard, ShieldCheck } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 text-ink-950 shadow-lg shadow-cyan-500/25">
            <CloudSun className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-wide text-white">
              Weather Station
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-300/80">
              V2
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-cyan-400/90 to-sky-500/90 text-ink-950"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
