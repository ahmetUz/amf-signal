import Link from "next/link";
import { cn } from "@/lib/utils";
import { hrefWith, type PublicationFilters } from "@/lib/publications/filters";
import { subtypeLabel } from "@/lib/publications/labels";
import { formatDay } from "@/lib/format";

type Props = {
  filters: PublicationFilters;
  subtypes: { value: string; count: number }[];
  days: string[];
};

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors",
        active ? "border-foreground bg-foreground text-white" : "hover:border-rule-strong hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

// Les filtres restent dans l'URL (liens et formulaire GET) : aucun JavaScript client, une vue filtrée se partage.
export function FilterChips({ filters, subtypes, days }: Props) {
  return (
    <div className="space-y-3">
      <form method="get" className="flex gap-2">
        {filters.subtype && <input type="hidden" name="subtype" value={filters.subtype} />}
        {filters.day && <input type="hidden" name="day" value={filters.day} />}
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Société ou ISIN, ex. Air Liquide"
          className="h-[34px] w-full max-w-sm rounded-full border border-input px-4 text-sm outline-none focus:border-foreground"
        />
      </form>
      <div className="flex flex-wrap gap-2">
        <Chip href={hrefWith(filters, { day: undefined })} active={!filters.day}>Tous les jours</Chip>
        {days.map((d) => (
          <Chip key={d} href={hrefWith(filters, { day: d })} active={filters.day === d}>{formatDay(d)}</Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip href={hrefWith(filters, { subtype: undefined })} active={!filters.subtype}>Tous les types</Chip>
        {subtypes.map((s) => (
          <Chip key={s.value} href={hrefWith(filters, { subtype: s.value })} active={filters.subtype === s.value}>
            {subtypeLabel(s.value)} <span className={cn("text-xs", filters.subtype === s.value ? "text-white/70" : "text-slate-2")}>{s.count}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}
