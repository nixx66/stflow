import { LucideIcon } from "lucide-react";

export function FeatureCard({
  icon: Icon,
  title,
  description
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-lg border border-slate-200 bg-white/86 p-5 shadow-sm backdrop-blur">
      <div className="absolute right-0 top-5 h-12 w-2 rounded-l-full bg-arc-100" />
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-arc-50 text-arc-600">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </article>
  );
}
