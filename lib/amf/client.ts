import { amfPageSchema } from "./schema";

const ENDPOINT =
  "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records";
const PAGE_SIZE = 100; // maximum autorisé par l'API Opendatasoft

export type RawRecord = Record<string, unknown>;

function buildUrl(days: number, offset: number): string {
  const params = new URLSearchParams({
    // Version française seulement : on évite les doublons bilingues (voir docs/NOTES.md).
    where: `informationdeposee_inf_lng_inf = "Français" and uin_dat_amf >= now(days=-${days})`,
    order_by: "uin_dat_amf desc",
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  return `${ENDPOINT}?${params}`;
}

async function fetchPage(days: number, offset: number) {
  const res = await fetch(buildUrl(days, offset), { cache: "no-store" });
  if (!res.ok) throw new Error(`API AMF ${res.status} sur offset=${offset}`);
  return amfPageSchema.parse(await res.json());
}

/** Récupère toutes les publications en français des `days` derniers jours, en paginant avec offset. */
export async function fetchRecentRecords(days: number): Promise<RawRecord[]> {
  const records: RawRecord[] = [];
  let total = Infinity;
  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    const page = await fetchPage(days, offset);
    total = page.total_count;
    records.push(...page.results);
    if (page.results.length === 0) break; // garde-fou si total_count change pendant la pagination
  }
  return records;
}
