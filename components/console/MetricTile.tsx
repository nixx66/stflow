import { ReactNode } from "react";

type MetricTileProps = {
  label: string;
  value: string;
  helper: string;
  icon?: ReactNode;
};

export function MetricTile({ label, value, helper, icon }: MetricTileProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition duration-150 hover:-translate-y-0.5 hover:border-arc-100">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted">{label}</p>
        {icon ? <div className="rounded-xl bg-arc-50 p-2 text-arc-600">{icon}</div> : null}
      </div>
      <p className="mt-5 text-3xl font-black tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm font-semibold text-slate-500">{helper}</p>
    </div>
  );
}
