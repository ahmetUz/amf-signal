/** Lecture et comparaison des nombres écrits à la française dans les documents AMF. Fonctions pures. */

const NEGATIVE_SIGNS = /^[-−–]/; // tiret, moins typographique (U+2212), tiret demi-cadratin

/** « - 13,6 » → -13.6 ; « 14 444 » → 14444. Les espaces (même insécables) sont des séparateurs de milliers. */
export function parseNumber(raw: string): number {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/^[+\-−–]/, "").replace(/\s/g, "").replace(",", ".");
  const value = Number(digits);
  return NEGATIVE_SIGNS.test(trimmed) ? -value : value;
}

export type ExtractedNumber = {
  raw: string; // tel qu'écrit dans le texte
  mantissa: number; // nombre lu, sans l'unité : « 7,3 Md€ » → 7.3
  value: number; // ramené à l'unité : « 7,3 Md€ » → 7 300 000 000
  percent: boolean;
  hasUnit: boolean; // false pour une cellule de tableau nue (« 1 560 »)
};

// Un nombre : signe facultatif, groupes de milliers séparés par une espace (même insécable), décimales.
const NUMBER = String.raw`[+\-−–]?\s?(?:\d{1,3}(?:[ \u00A0\u202F]\d{3})+(?!\d)|\d+)(?:[.,]\d+)?`;
// Unités relevées dans les documents. Les plus longues d'abord (« Mds » avant « M€ »).
// « M » seul n'en fait pas partie : « 9M 2026 » signifie « 9 mois », pas 9 millions.
const UNIT = String.raw`%|Mds?€?|milliards?|G\$|G€|M€|M\s?EUR|M\$|millions?|K\s?EUR|k€|k\$|milliers?|€|EUR|euros?|\$|USD`;
const NUMBER_WITH_UNIT = new RegExp(`(${NUMBER})(?:\\s?(${UNIT})(?![\\p{L}\\d]))?`, "giu");

const SCALES: [RegExp, number][] = [
  [/^(mds?€?|milliards?|g\$|g€)$/, 1e9],
  [/^(m€|meur|m\$|millions?)$/, 1e6], // « m€ » minuscule = millions dans les communiqués financiers
  [/^(keur|k€|k\$|milliers?)$/, 1e3],
];

function scaleOf(unit: string): number {
  const normalized = unit.toLowerCase().replace(/\s/g, "");
  return SCALES.find(([pattern]) => pattern.test(normalized))?.[1] ?? 1;
}

// Évite les résidus de calcul flottant (7,3 × 1e9 = 7 299 999 999,999999).
const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Extrait les nombres d'un texte avec leur unité, ramenés à une même échelle. */
export function extractNumbers(text: string): ExtractedNumber[] {
  return [...text.matchAll(NUMBER_WITH_UNIT)].map(([raw, number, unit]) => {
    const mantissa = parseNumber(number);
    return {
      raw: raw.trim(),
      mantissa,
      value: unit && unit !== "%" ? round(mantissa * scaleOf(unit)) : mantissa,
      percent: unit === "%",
      hasUnit: Boolean(unit),
    };
  });
}

/** Un chiffre tel que le LLM le rend dans une brève : « 7,3 » + « Md€ ». */
export type Figure = { valeur: string; unite: string };

/** Lit le chiffre avec le même analyseur que les textes : « 7,3 » + « Md€ » → 7 300 000 000. */
export function parseFigure({ valeur, unite }: Figure): ExtractedNumber | null {
  const [first] = extractNumbers(`${valeur} ${unite}`.trim());
  return first && first.raw.length > 0 ? first : null;
}

/**
 * Le chiffre apparaît-il dans le texte, quelle que soit son écriture ?
 * - comparaison en valeur absolue : le signe est souvent porté par les mots (« en baisse de 13,6 % ») ;
 * - un pourcentage ne correspond qu'à un pourcentage ;
 * - repli pour les tableaux : une cellule sans unité (« 1 560 » sous « en millions d'euros ») correspond
 *   si le nombre lu est le même. Moins sûr qu'une correspondance exacte, mais sans ce repli
 *   aucun chiffre tiré d'un tableau ne serait vérifiable.
 */
export function containsFigure(text: string, figure: ExtractedNumber): boolean {
  return extractNumbers(text).some((candidate) => {
    if (!candidate.hasUnit) return Math.abs(candidate.mantissa) === Math.abs(figure.mantissa);
    return candidate.percent === figure.percent && Math.abs(candidate.value) === Math.abs(figure.value);
  });
}
