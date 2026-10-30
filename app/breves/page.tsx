import { Suspense } from "react";
import { BriefCard } from "@/components/briefs/brief-card";
import { listBriefs } from "@/lib/briefs/queries";
import { STATUS_DISPLAY } from "@/lib/briefs/labels";

export const metadata = { title: "Brèves · AMF Signal" };

export default function BrevesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Brèves</h1>
        <p className="text-sm text-muted-foreground">
          Rédigées par IA à partir des publications sélectionnées. Chaque chiffre est contrôlé automatiquement
          dans le document source :{" "}
          {Object.values(STATUS_DISPLAY).map((s, i) => (
            <span key={s.label}>
              {i > 0 && ", "}
              <span className={`rounded px-1.5 py-0.5 text-xs ${s.className}`}>{s.label}</span>
            </span>
          ))}
          .
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
        <BriefList />
      </Suspense>
    </main>
  );
}

async function BriefList() {
  const briefs = await listBriefs();
  if (briefs.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Aucune brève générée pour l&apos;instant.</p>;
  }
  return (
    <div className="space-y-6">
      {briefs.map((brief) => <BriefCard key={brief.uin} brief={brief} />)}
    </div>
  );
}
