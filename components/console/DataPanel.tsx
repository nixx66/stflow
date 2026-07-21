import { ReactNode } from "react";

type DataPanelProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function DataPanel({ title, eyebrow, action, children }: DataPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.16em] text-arc-600">{eyebrow}</p> : null}
          <h2 className="mt-1 text-xl font-black tracking-tight text-ink">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
