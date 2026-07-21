"use client";

import {
  GitBranch
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnectControl } from "./wallet/WalletConnectControl";

const navGroups = [
  {
    label: "Product",
    href: "/#product"
  },
  {
    label: "Workflow",
    href: "/#workflow"
  },
  {
    label: "Dashboard",
    href: "/dashboard"
  },
  {
    label: "Invoices",
    href: "/console/invoices"
  },
  {
    label: "Resources",
    href: "/resources"
  }
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <>
      <header className="no-print fixed inset-x-0 top-0 z-50 border-b border-[#e6e2d8]/80 bg-[#f8fbf4]/86 px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1760px] items-center justify-between rounded-full border border-[#dbe9d7] bg-white/76 px-4 text-[#07111f] shadow-[0_18px_60px_rgba(4,41,31,0.08)] sm:px-5 lg:px-6">
          <Link className="flex min-w-[220px] items-center gap-3" href="/">
            <Image src="/logo.svg" alt="STFlow logo" width={42} height={42} />
            <div>
              <span className="block text-2xl font-black leading-tight text-[#063f2c]">STFlow</span>
              <span className="hidden text-sm font-bold leading-snug text-[#667085] sm:block">
                Stablecoin Transaction Flow
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {navGroups.map((item) => {
              const active =
                pathname === item.href ||
                (item.href === "/console/invoices" && pathname.startsWith("/console/invoices"));

              return (
                <Link
                  className={`inline-flex min-h-11 items-center rounded-full px-4 py-2.5 text-base font-black leading-tight transition ${
                    active ? "bg-[#e7f8ec] text-[#063f2c]" : "text-[#667085] hover:bg-[#f1f8ef] hover:text-[#063f2c]"
                  }`}
                  href={item.href}
                  key={item.label}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="hidden xl:block">
              <WalletConnectControl label="Merchant wallet" size="md" tone="light" />
            </div>
            <Link
              className="inline-flex h-12 min-w-40 items-center justify-center gap-2.5 rounded-full bg-[#063f2c] px-6 text-base font-black leading-tight text-white shadow-[0_18px_40px_rgba(6,63,44,0.18)] transition hover:-translate-y-0.5 hover:bg-[#04291f]"
              href="/invoice/new"
            >
              <GitBranch className="h-5 w-5" />
              Create Invoice
            </Link>
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="no-print h-[104px]" />
    </>
  );
}
