import Link from "next/link";
import { cn } from "@/lib/utils";
import { hrefWith, type PublicationFilters } from "@/lib/publications/filters";
import type { PublicationRow } from "@/lib/publications/queries";
import { subtypeLabel } from "@/lib/publications/labels";
import { formatDay } from "@/lib/format";

type Props = {
  filters: PublicationFilters;
  subtypes: { value: string; count: number }[];
  days: string[];
  selected: PublicationRow[];
};

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[.07em] text-slate-2">{children}</h2>;
}

function FilterLink({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150",
        active ? "bg-foreground font-medium text-white" : "text-ink-2 hover:bg-muted",
      )}
    >
      <span className="truncate first-letter:uppercase">{label}</span>
      {count !== undefined && <span className={cn("text-xs tabular-nums", active ? "text-white/70" : "text-slate-2")}>{count}</span>}
    </Link>
  );
}

/** Les publications retenues pour une brève : chacune mène à sa brève. */
function Headlines({ rows }: { rows: PublicationRow[] }) {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));
  return (
    <section>
      <Heading>À la une · sélection automatique</Heading>
      <ol className="space-y-1">
        {sorted.map((row) => (
          <li key={row.uin}>
            <Link
              href={`/breves#${row.uin}`}
              className="group flex items-baseline gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 hover:bg-mark-soft"
            >
              <span className="font-bold tabular-nums">{row.finalScore}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{row.company}</span>
              <span className="text-xs text-slate-2 transition-transform duration-150 group-hover:translate-x-0.5">Brève →</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Les filtres restent dans l'URL (liens et formulaire GET) : aucun JavaScript client, une vue filtrée se partage.
export function FiltersSidebar({ filters, subtypes, days, selected }: Props) {
  return (
    <aside className="space-y-7 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
      <form method="get">
        {filters.subtype && <input type="hidden" name="subtype" value={filters.subtype} />}
        {filters.day && <input type="hidden" name="day" value={filters.day} />}
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Société ou ISIN…"
          aria-label="Rechercher une société ou un ISIN"
          className="h-9 w-full rounded-full border border-input px-4 text-sm outline-none transition-colors focus:border-foreground"
        />
      </form>

      <Headlines rows={selected} />

      <section>
        <Heading>Date</Heading>
        <FilterLink href={hrefWith(filters, { day: undefined })} active={!filters.day} label="Tous les jours" />
        {days.map((d) => (
          <FilterLink key={d} href={hrefWith(filters, { day: d })} active={filters.day === d} label={formatDay(d)} />
        ))}
      </section>

      <section>
        <Heading>Type d&apos;information</Heading>
        <FilterLink href={hrefWith(filters, { subtype: undefined })} active={!filters.subtype} label="Tous les types" />
        {subtypes.map((s) => (
          <FilterLink
            key={s.value}
            href={hrefWith(filters, { subtype: s.value })}
            active={filters.subtype === s.value}
            label={subtypeLabel(s.value)}
            count={s.count}
          />
        ))}
      </section>

      {(filters.q || filters.day || filters.subtype) && (
        <Link href="/" className="block px-2.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Réinitialiser les filtres
        </Link>
      )}
    </aside>
  );
}
