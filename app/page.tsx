import Link from "next/link";
import { CTASection } from "@/components/home/CTASection";
import { DashboardPreview } from "@/components/home/DashboardPreview";
import { HeroSection } from "@/components/home/HeroSection";
import { ProductSurfaceGrid } from "@/components/home/ProductSurfaceGrid";
import { ReceiptAuditSection } from "@/components/home/ReceiptAuditSection";
import { WorkflowInfographic } from "@/components/home/WorkflowInfographic";
import { Navbar } from "@/components/Navbar";

export default function HomePage() {
  return (
    <main className="overflow-x-hidden bg-[#f7fbf4]">
      <Navbar />
      <HeroSection />
      <ProductSurfaceGrid />
      <DashboardPreview />
      <WorkflowInfographic />
      <ReceiptAuditSection />
      <CTASection />
      <footer className="border-t border-[#d8e8d3] bg-[#f7fbf4] py-8">
        <div className="mx-auto flex max-w-[1760px] flex-col gap-4 px-4 text-sm font-bold text-muted sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 2xl:px-10">
          <p className="text-base font-black text-[#063f2c]">STFlow</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/#product">Product</Link>
            <Link href="/#workflow">Workflow</Link>
            <Link href="/#dashboard">Dashboard</Link>
            <Link href="/resources">Resources</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
