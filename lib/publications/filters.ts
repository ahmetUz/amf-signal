export type PublicationFilters = {
  q?: string; // société ou ISIN, recherche partielle
  subtype?: string; // sous-type exact
  day?: string; // AAAA-MM-JJ, jour de dépôt à l'heure de Paris
};

type SearchParams = Record<string, string | string[] | undefined>;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function first(value: string | string[] | undefined): string | undefined {
  const v = (Array.isArray(value) ? value[0] : value)?.trim();
  return v ? v : undefined;
}

/** Lit les filtres depuis l'URL. Une valeur vide ou mal formée revient à ne pas filtrer. Fonction pure. */
export function parseFilters(params: SearchParams): PublicationFilters {
  const day = first(params.day);
  return {
    q: first(params.q),
    subtype: first(params.subtype),
    day: day && DAY_PATTERN.test(day) ? day : undefined,
  };
}

/** URL de la liste avec un filtre modifié, les autres conservés. Une valeur undefined retire le filtre. */
export function hrefWith(filters: PublicationFilters, patch: Partial<PublicationFilters>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...patch })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
