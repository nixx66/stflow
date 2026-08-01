import { NextResponse } from "next/server";
import { readWalletChainInvoices } from "@/lib/server/readWalletInvoices";
import { walletInvoiceResponse } from "@/lib/server/walletInvoiceResponse";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await context.params;
  const result = await walletInvoiceResponse(wallet, readWalletChainInvoices);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "cache-control": "no-store" }
  });
}
