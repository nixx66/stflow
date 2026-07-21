import { NextResponse } from "next/server";
import { getInvoiceFromStore, isInvoiceRecord, upsertInvoiceInStore } from "@/lib/serverInvoiceStore";

type RouteContext = {
  params: Promise<{
    invoiceId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { invoiceId } = await context.params;
  const invoice = await getInvoiceFromStore(invoiceId);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { invoiceId } = await context.params;
  const payload = await request.json().catch(() => null);

  if (!isInvoiceRecord(payload) || payload.id !== invoiceId) {
    return NextResponse.json({ error: "Invalid invoice payload" }, { status: 400 });
  }

  const invoice = await upsertInvoiceInStore(payload);
  return NextResponse.json({ invoice });
}
