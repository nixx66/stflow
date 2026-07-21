"use client";

import {
  BarChart3,
  Download,
  FileText,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShoppingCart,
  Sparkles,
  Users
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { WalletConnectControl } from "@/components/wallet/WalletConnectControl";

const consoleNav = [
  { label: "Overview", href: "/console", icon: LayoutDashboard },
  { label: "Invoices", href: "/console/invoices", icon: ReceiptText },
  { label: "Customers", href: "/console/customers", icon: Users },
  { label: "Orders", href: "/console/orders", icon: ShoppingCart },
  { label: "Analytics", href: "/console/analytics", icon: BarChart3 },
  { label: "Export", href: "/console/export", icon: Download },
  { label: "Settings", href: "/console/settings", icon: Settings }
];

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f6faf8] text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white/92 px-4 py-5 backdrop-blur-xl lg:block">
        <Link className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-slate-50" href="/">
          <Image src="/logo.svg" alt="STFlow logo" width={40} height={40} />
          <div>
            <p className="text-xl font-black leading-tight">STFlow</p>
            <p className="text-xs font-bold text-muted">Settlement console</p>
          </div>
        </Link>

        <div className="mt-7 rounded-3xl border border-arc-100 bg-arc-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-arc-900">
            <Sparkles className="h-4 w-4" />
            Payment Link first
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            Create with links now. Track invoices, receipts, receivables, and future payables from one workspace.
          </p>
        </div>

        <nav className="mt-7 space-y-1">
          {consoleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/console" && pathname.startsWith(item.href));

            return (
              <Link
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                  active
                    ? "bg-ink text-white shadow-card"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/88 backdrop-blur-xl">
          <div className="flex min-h-20 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6 xl:px-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-arc-600">STFlow Console</p>
              <h1 className="text-2xl font-black tracking-tight text-ink">Invoice reconciliation workspace</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <WalletConnectControl label="Merchant wallet" size="sm" tone="light" />
              <Link
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-arc-100 hover:bg-arc-50"
                href="/dashboard"
              >
                V1 dashboard
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-xl bg-arc-600 px-4 text-sm font-bold text-white shadow-soft transition hover:bg-arc-500"
                href="/invoice/new"
              >
                Create invoice
              </Link>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
            {consoleNav.map((item) => {
              const active = pathname === item.href || (item.href !== "/console" && pathname.startsWith(item.href));

              return (
                <Link
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold ${
                    active ? "bg-ink text-white" : "bg-white text-slate-600"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="px-4 py-6 sm:px-5 lg:px-6 xl:px-8">{children}</main>
      </div>
    </div>
  );
}
