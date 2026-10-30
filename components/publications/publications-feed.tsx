import type { PublicationRow } from "@/lib/publications/queries";
import { categoryOf } from "@/lib/publications/category";
import { subtypeLabel } from "@/lib/publications/labels";
import { formatDay, formatTime, parisDayOf } from "@/lib/format";

/** Regroupe les lignes (déjà triées par date décroissante) par jour de Paris. */
function groupByDay(rows: PublicationRow[]): [string, PublicationRow[]][] {
  const days = new Map<string, PublicationRow[]>();
  for (const row of rows) {
    const day = parisDayOf(row.publishedAt);
    days.set(day, [...(days.get(day) ?? []), row]);
  }
  return [...days.entries()];
}

function Kicker({ row }: { row: PublicationRow }) {
  const category = categoryOf({ title: row.title, subtype: row.infoSubtype });
  return (
    <div className="flex items-center gap-2 font-mono text-[11.5px] font-bold uppercase tracking-[.07em]" style={{ color: category.color }}>
      <span className="size-2 rounded-full" style={{ backgroundColor: category.color }} />
      {category.label}
      <span className="opacity-45">·</span>
      <span className="text-[#3e5566]">{subtypeLabel(row.infoSubtype)}</span>
    </div>
  );
}

// Score final (grille Haiku + code) s'il existe, sinon score par règles. Les raisons restent visibles.
function Score({ row }: { row: PublicationRow }) {
  const score = row.finalScore ?? row.score;
  if (score === null) return null;
  const reasons = (row.finalScore !== null ? row.finalReasons : row.scoreReasons) ?? [];
  return (
    <div className="space-y-1 text-[13px] text-muted-foreground">
      <div className="flex items-center gap-2">
        {row.selected && <span className="rounded bg-mark px-1.5 py-0.5 text-xs font-bold text-ink-2">Sélectionnée</span>}
        <span>
          Score <strong className="font-semibold text-foreground tabular-nums">{score}</strong>
          {row.finalScore !== null && <span className="text-slate-2"> (règles : {row.score})</span>}
        </span>
      </div>
      <ul>{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  );
}

function Item({ row }: { row: PublicationRow }) {
  return (
    <article className="-mx-3 space-y-2.5 rounded-[10px] px-3 py-4 transition-colors hover:bg-muted">
      <div className="flex items-start justify-between gap-4">
        <Kicker row={row} />
        <time className="shrink-0 text-[13px] text-muted-foreground tabular-nums">{formatTime(row.publishedAt)}</time>
      </div>
      <h3 className="max-w-[42ch] text-[21px] font-bold leading-[1.28] tracking-[-.015em]">
        <a href={row.documentUrl} target="_blank" rel="noreferrer" className="hover:underline">{row.title}</a>
      </h3>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <span className="rounded bg-muted px-2 py-[5px] font-semibold text-foreground">{row.company}</span>
        <span>AMF</span>
        <span className="font-mono text-xs">{row.isin}</span>
        {row.country && row.country !== "FR" && <span>{row.country}</span>}
      </div>
      <Score row={row} />
    </article>
  );
}

export function PublicationsFeed({ rows }: { rows: PublicationRow[] }) {
  if (rows.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Aucune publication pour ces filtres.</p>;
  }
  return (
    <div>
      {groupByDay(rows).map(([day, items]) => (
        <section key={day}>
          <h2 className="border-b border-foreground pt-[22px] pb-2.5 text-sm font-bold first-letter:uppercase">
            {formatDay(day)} <span className="font-normal text-muted-foreground">· {items.length} publication{items.length > 1 ? "s" : ""}</span>
          </h2>
          <div className="divide-y">{items.map((row) => <Item key={row.uin} row={row} />)}</div>
        </section>
      ))}
    </div>
  );
}

/** Les publications retenues pour une brève, en tête de page. */
export function SelectedStrip({ rows }: { rows: PublicationRow[] }) {
  const selected = rows.filter((r) => r.selected);
  if (selected.length === 0) return null;
  return (
    <section>
      <h2 className="border-b border-foreground pt-[22px] pb-2.5 text-sm font-bold">
        <span className="bg-[linear-gradient(transparent_55%,var(--mark)_55%)]">À la une</span>{" "}
        <span className="font-normal text-muted-foreground">· sélection automatique, score décroissant</span>
      </h2>
      <div className="divide-y">
        {[...selected].sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0)).map((row) => <Item key={row.uin} row={row} />)}
      </div>
    </section>
  );
}
