import { InvoiceForm } from "@/components/InvoiceForm";
import { Navbar } from "@/components/Navbar";

export default function NewInvoicePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_16%_18%,rgba(168,239,114,0.22),transparent_28rem),radial-gradient(circle_at_86%_12%,rgba(255,216,90,0.16),transparent_30rem),linear-gradient(180deg,#f8fbf4_0%,#fffdf4_58%,#f3f9ee_100%)]">
      <Navbar />
      <section className="mx-auto max-w-[1760px] px-4 py-4 sm:px-6 lg:px-8 lg:py-5 2xl:px-10">
        <InvoiceForm />
      </section>
    </main>
  );
}
