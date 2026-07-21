import type { ComponentType, ReactNode } from "react";

type SettlementNodeProps = {
  className?: string;
  eyebrow: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
};

export function SettlementNode({ children, className = "", eyebrow, icon: Icon, title }: SettlementNodeProps) {
  return (
    <article className={`sf-system-node relative overflow-hidden rounded-[1.65rem] border border-[#e6e2d8] bg-white/70 p-5 shadow-[0_22px_70px_rgba(4,41,31,0.08)] backdrop-blur-xl ${className}`}>
      <div className="absolute inset-x-8 -top-24 h-40 rounded-full bg-[#a8ef72]/20 blur-3xl" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f8ec] text-[#063f2c] ring-1 ring-[#16a34a]/16">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#16a34a]">{eyebrow}</p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-[#07111f]">{title}</h3>
            </div>
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </article>
  );
}
