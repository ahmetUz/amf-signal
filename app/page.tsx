import { Suspense } from "react";
import { FiltersForm } from "@/components/publications/filters-form";
import { PublicationsTable } from "@/components/publications/publications-table";
import { parseFilters } from "@/lib/publications/filters";
import { listFilterOptions, listPublications } from "@/lib/publications/queries";

type SearchParams = PageProps<"/">["searchParams"];

// cacheComponents (Next 16) : l'en-tête est prérendu, la partie qui lit l'URL et la base est streamée dans le Suspense.
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Publications AMF</h1>
        <p className="text-sm text-muted-foreground">
          Informations réglementées déposées sur info-financiere.gouv.fr (version française).
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
        <PublicationsSection searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function PublicationsSection({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const [rows, options] = await Promise.all([listPublications(filters), listFilterOptions()]);
  return (
    <div className="space-y-4">
      <FiltersForm filters={filters} subtypes={options.subtypes} days={options.days} />
      <p className="text-sm text-muted-foreground">
        {rows.length} résultat{rows.length > 1 ? "s" : ""}
      </p>
      <PublicationsTable rows={rows} />
    </div>
  );
}
