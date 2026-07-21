import { NextResponse } from "next/server";
import { isInvoiceRecord, readInvoiceStore, upsertInvoiceInStore } from "@/lib/serverInvoiceStore";

export async function GET() {
  const invoices = await readInvoiceStore();
  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!isInvoiceRecord(payload)) {
    return NextResponse.json({ error: "Invalid invoice payload" }, { status: 400 });
  }

  const invoice = await upsertInvoiceInStore(payload);
  return NextResponse.json({ invoice });
}
