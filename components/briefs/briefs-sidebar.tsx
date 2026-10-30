import type { BriefRow } from "@/lib/briefs/queries";
import { STATUS_DISPLAY } from "@/lib/briefs/labels";
import { figureStatuses } from "@/lib/db/schema";

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[.07em] text-slate-2">{children}</h2>;
}

export function BriefsSidebar({ briefs }: { briefs: BriefRow[] }) {
  const figures = briefs.flatMap((b) => b.figures);
  return (
    <aside className="space-y-7 lg:sticky lg:top-6 lg:self-start">
      <section>
        <Heading>Sommaire</Heading>
        <ol className="space-y-1">
          {briefs.map((brief) => (
            <li key={brief.uin}>
              <a
                href={`#${brief.uin}`}
                className="group flex items-start gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-150 hover:bg-muted"
              >
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${STATUS_DISPLAY[brief.status].dot}`} title={STATUS_DISPLAY[brief.status].label} />
                <span className="min-w-0">
                  <span className="block font-semibold">{brief.company}</span>
                  <span className="line-clamp-2 text-muted-foreground group-hover:text-ink-2">{brief.title}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <Heading>Contrôle des chiffres</Heading>
        <ul className="space-y-1.5 px-2.5 text-sm">
          {figureStatuses.map((status) => (
            <li key={status} className="flex items-center justify-between gap-3">
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_DISPLAY[status].className}`}>{STATUS_DISPLAY[status].label}</span>
              <span className="text-xs text-slate-2 tabular-nums">{figures.filter((f) => f.status === status).length}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 px-2.5 text-[13px] leading-relaxed text-muted-foreground">
          Chaque chiffre est cherché dans le document source : la citation doit y figurer mot pour mot, et le chiffre
          doit apparaître dans la citation et dans la brève.
        </p>
      </section>
    </aside>
  );
}
