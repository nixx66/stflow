import { DataPanel } from "@/components/console/DataPanel";
import { WalletStatusCard } from "@/components/wallet/WalletStatusCard";

const settings = [
  ["Wallet authority", "The connected merchant signs invoice creation and metadata authorization."],
  ["Network", "Contract reads and writes are fixed to Arc Testnet."],
  ["USDC settlement", "The registry transfers Arc Testnet USDC only from the assigned payer."],
  ["Invoice status", "Pending, paid, cancelled, and deadline-derived expired are the supported states."],
  ["Metadata", "Customer-facing text is shown only when it matches the hash committed onchain."],
  ["Receipt proof", "Paid receipts require a verified registry payment event."]
];

export default function ConsoleSettingsPage() {
  return (
    <div className="space-y-6">
      <WalletStatusCard audience="merchant" />
      <DataPanel eyebrow="Merchant settings" title="Arc Testnet configuration">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {settings.map(([title, detail]) => (
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={title}>
              <div className="h-2 w-16 rounded-full bg-arc-500" />
              <h2 className="mt-5 text-xl font-black text-ink">{title}</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-muted">{detail}</p>
            </article>
          ))}
        </div>
      </DataPanel>
    </div>
  );
}
