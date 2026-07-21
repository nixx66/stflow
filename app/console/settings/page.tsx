import { DataPanel } from "@/components/console/DataPanel";
import { WalletStatusCard } from "@/components/wallet/WalletStatusCard";

const settings = [
  ["Wallet connection", "Merchant wallet and payer wallet connection remain enabled through the V1 wallet layer."],
  ["Network", "Keep the testnet as the default build path before live settlement is wired."],
  ["USDC payment mode", "Mock payment is active. Real transfer mode can be added after wallet and chain checks are stable."],
  ["Invoice status", "Draft, pending, paid, and closed are available as V2 operating states."],
  ["Memo and note", "Internal memo fields are ready for reconciliation and future memo proof data."],
  ["PDF receipt", "Receipt data is structured. Server-side PDF generation is reserved for the next implementation step."]
];

export default function ConsoleSettingsPage() {
  return (
    <div className="space-y-6">
      <WalletStatusCard audience="merchant" />

      <DataPanel eyebrow="Merchant settings" title="V2 configuration placeholders">
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
