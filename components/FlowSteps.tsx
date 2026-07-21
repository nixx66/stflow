import { CheckCircle2 } from "lucide-react";

const steps = [
  "Create Invoice",
  "Payment Link",
  "Pay USDC",
  "Confirm Settlement",
  "Receipt",
  "Dashboard"
];

export function FlowSteps() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {steps.map((step, index) => (
        <div
          className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          key={step}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-arc-600 text-sm font-bold text-white">
              {index + 1}
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-ink">{step}</p>
        </div>
      ))}
    </div>
  );
}
