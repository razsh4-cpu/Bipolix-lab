import Link from "next/link";

export function PageHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const BUTTON_BASE = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60";
export const BUTTON_PRIMARY = `${BUTTON_BASE} bg-blue-700 text-white hover:bg-blue-800`;
export const BUTTON_SECONDARY = `${BUTTON_BASE} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;
export const BUTTON_DANGER = `${BUTTON_BASE} bg-red-700 text-white hover:bg-red-800`;

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link href={href} className={variant === "primary" ? BUTTON_PRIMARY : BUTTON_SECONDARY}>
      {children}
    </Link>
  );
}

export function Card({ title, children, actions }: { title?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-600">{children}</p>;
}

export type BadgeTone = "green" | "amber" | "orange" | "red" | "slate" | "blue";

const BADGE_TONES: Record<BadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  orange: "bg-orange-50 text-orange-800 ring-orange-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-800 ring-blue-200",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function DetailList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-sm text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="טוען">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-white" />
      ))}
    </div>
  );
}
