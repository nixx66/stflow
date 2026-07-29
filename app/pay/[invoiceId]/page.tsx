"use client";

import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { PaymentPanel } from "@/components/PaymentPanel";

export default function PayInvoicePage() {
  const params = useParams<{ invoiceId: string }>();

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-[1680px] px-3 py-10 sm:px-4 lg:px-6 2xl:px-8">
        <PaymentPanel
          invoiceId={params.invoiceId}
          key={params.invoiceId.toLowerCase()}
        />
      </section>
    </main>
  );
}
