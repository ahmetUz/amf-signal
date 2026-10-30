import type { PublicationRow } from "@/lib/publications/queries";
import { categoryOf } from "@/lib/publications/category";
import { subtypeLabel } from "@/lib/publications/labels";
import { formatDay, formatTime, parisDayOf } from "@/lib/format";

/** Regroupe les lignes (déjà triées par jour) par jour de Paris, en gardant l'ordre de la requête. */
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
    <div className="flex flex-wrap items-center gap-2 font-mono text-[11.5px] font-bold uppercase tracking-[.07em]" style={{ color: category.color }}>
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
      <div className="flex flex-wrap items-center gap-2">
        {row.selected && <span className="rounded bg-mark px-1.5 py-0.5 text-xs font-bold text-ink-2">Sélectionnée</span>}
        <span>
          Score <strong className="font-semibold text-foreground tabular-nums">{score}</strong>
          {row.finalScore !== null && <span className="text-slate-2"> (règles : {row.score})</span>}
        </span>
      </div>
      <ul className="space-y-0.5">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  );
}

// Toute la ligne est cliquable : le lien du titre est étendu à l'article (after:inset-0).
// Le survol l'annonce : fond gris, titre souligné, « Ouvrir le PDF » qui apparaît.
function Item({ row, index }: { row: PublicationRow; index: number }) {
  return (
    <article
      className="group relative -mx-3 grid gap-x-8 gap-y-3 rounded-[10px] px-3 py-4 transition-colors duration-200 hover:bg-muted motion-safe:animate-rise md:grid-cols-[minmax(0,1fr)_240px]"
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <div className="space-y-2.5">
        <Kicker row={row} />
        <h3 className="max-w-[52ch] text-[21px] font-bold leading-[1.28] tracking-[-.015em]">
          <a
            href={row.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="decoration-[1.5px] underline-offset-4 after:absolute after:inset-0 after:rounded-[10px] group-hover:underline"
          >
            {row.title}
          </a>
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          <span className="rounded bg-muted px-2 py-[5px] font-semibold text-foreground transition-colors duration-200 group-hover:bg-white">{row.company}</span>
          <span>AMF</span>
          <span className="font-mono text-xs">{row.isin}</span>
          {row.country && row.country !== "FR" && <span>{row.country}</span>}
        </div>
      </div>
      <div className="space-y-2 md:text-right">
        <div className="flex items-center gap-3 text-[13px] md:justify-end">
          <span className="text-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 md:-translate-x-1">
            Ouvrir le PDF ↗
          </span>
          <time className="text-muted-foreground tabular-nums">{formatTime(row.publishedAt)}</time>
        </div>
        <Score row={row} />
      </div>
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
          <h2 className="sticky top-0 z-10 border-b border-foreground bg-background/90 pt-[22px] pb-2.5 text-sm font-bold backdrop-blur first-letter:uppercase">
            {formatDay(day)}{" "}
            <span className="font-normal text-muted-foreground">
              · {items.length} publication{items.length > 1 ? "s" : ""}, les plus importantes d&apos;abord
            </span>
          </h2>
          <div className="divide-y">{items.map((row, i) => <Item key={row.uin} row={row} index={i} />)}</div>
        </section>
      ))}
    </div>
  );
}
