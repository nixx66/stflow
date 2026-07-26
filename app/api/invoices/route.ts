import { NextResponse } from "next/server";
import { isInvoiceRecord, readInvoiceStore, upsertInvoiceInStore } from "@/lib/serverInvoiceStore";

export async function GET() {
  const invoices = await readInvoiceStore();
  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const invoice = await request.json().catch(() => null);

  if (!isInvoiceRecord(invoice)) {
    return NextResponse.json({ error: "Invalid invoice payload" }, { status: 400 });
  }

  return NextResponse.json({ invoice: await upsertInvoiceInStore(invoice) });
}
