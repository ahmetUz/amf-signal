import { normalize } from "@/lib/selection/rules";

/**
 * Une même publication peut arriver par deux diffuseurs, sous deux identifiants (cas D.L.S.I., Acheter-Louer).
 * Deux dépôts sont des doublons s'ils ont la même société, le même titre normalisé (casse, accents,
 * apostrophes, espaces) et moins de 3 jours d'écart. On garde le premier dépôt. Fonction pure.
 * Limite : un titre reformulé (DBV, « présente » puis « publie ») n'est pas reconnu.
 */
export type DuplicateCandidate = { uin: string; company: string; title: string; publishedAt: Date };

const WINDOW_MS = 3 * 24 * 3_600_000;

/** Renvoie, pour chaque doublon, l'identifiant de la publication d'origine. */
export function findDuplicates(rows: DuplicateCandidate[]): Map<string, string> {
  const sorted = [...rows].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime() || a.uin.localeCompare(b.uin));
  const firstByKey = new Map<string, DuplicateCandidate>();
  const duplicates = new Map<string, string>();
  for (const row of sorted) {
    const key = `${normalize(row.company)}|${normalize(row.title).trim()}`;
    const first = firstByKey.get(key);
    if (first && row.publishedAt.getTime() - first.publishedAt.getTime() <= WINDOW_MS) {
      duplicates.set(row.uin, first.uin);
    } else {
      firstByKey.set(key, row); // hors fenêtre : une nouvelle publication au même titre devient la référence
    }
  }
  return duplicates;
}
