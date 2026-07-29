import { redirect } from "next/navigation";

export default async function InvoiceDetailPage({
  params
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  redirect(`/pay/${encodeURIComponent(invoiceId)}`);
}
