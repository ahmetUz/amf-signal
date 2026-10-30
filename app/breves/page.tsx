import { Suspense } from "react";
import { BriefCard } from "@/components/briefs/brief-card";
import { BriefsSidebar } from "@/components/briefs/briefs-sidebar";
import { listBriefs } from "@/lib/briefs/queries";

export const metadata = { title: "Brèves · AMF Signal" };

export default function BrevesPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-[28px] font-bold tracking-[-.025em]">Brèves</h1>
        <p className="text-sm text-muted-foreground">
          Rédigées par IA à partir des publications sélectionnées, chiffres contrôlés dans le document source.
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
    <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
      <BriefsSidebar briefs={briefs} />
      <div className="divide-y border-t border-foreground">
        {briefs.map((brief, i) => <BriefCard key={brief.uin} brief={brief} index={i} />)}
      </div>
    </div>
  );
}
