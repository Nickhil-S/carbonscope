import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="tabular text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{title}</h1>
        {children && <div className="mt-2 max-w-2xl text-muted-foreground">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, badge, className }: { label: string; value: ReactNode; sub?: ReactNode; badge?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-5 shadow-card", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {badge}
      </div>
      <p className="tabular mt-2 break-words text-xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const SOURCE_STYLES = {
  user: "bg-secondary text-secondary-foreground",
  estimate: "bg-muted text-muted-foreground",
  demo: "bg-warning/25 text-warning-foreground",
  satellite: "bg-primary text-primary-foreground",
  published: "bg-accent text-accent-foreground",
} as const;
const SOURCE_LABELS = { user: "User-provided", estimate: "Estimate", demo: "Demo data", satellite: "Satellite-measured", published: "Published factor" };

export function SourceBadge({ kind }: { kind: keyof typeof SOURCE_STYLES }) {
  return <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", SOURCE_STYLES[kind])}>{SOURCE_LABELS[kind]}</span>;
}

export function Panel({ title, children, className, actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("min-w-0 border-t pt-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function DemoNotice() {
  return (
    <div className="mb-6 rounded-md border border-warning/50 bg-warning/15 px-4 py-3 text-sm text-warning-foreground">
      <strong>Demo mode.</strong> These figures use a sample dataset, not real measurements. Start a new assessment to use your own data.
    </div>
  );
}

export const Level = ({ n, label }: { n: number; label: string }) => (
  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={`${label}: ${["", "low", "medium", "high"][n]}`}>
    {label}
    <span className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn("h-2 w-2 rounded-full", i <= n ? "bg-primary" : "bg-border")} />
      ))}
    </span>
  </span>
);
