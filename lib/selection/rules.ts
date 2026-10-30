/**
 * Score de sélection par règles : première passe, sans LLM et sans ouvrir le document.
 * Fonction pure : même entrée, même sortie. Testée dans rules.test.ts.
 */

export type RuleInput = {
  title: string;
  subtype: string | null;
};

export type RuleScore = {
  score: number;
  reasons: string[]; // affichées telles quelles dans l'interface
};

type Level = {
  label: string;
  points: number;
  keywords: string[]; // écrits naturellement (accents, apostrophes) : normalisés avant comparaison
};

// L'ordre compte : le premier niveau qui trouve un mot-clé l'emporte.
// Un signal fort passe donc avant la routine (« Résultats… et mise à disposition du rapport » vaut 3, pas 0).
const LEVELS: Level[] = [
  {
    label: "Fort",
    points: 3,
    keywords: [
      "résultat",
      "chiffre d'affaires",
      "trimestr",
      "acquisition de", // pas « acquisition » seul : « Acquisition ou cession des actions » est un rachat courant
      "acquisition d'",
      "fusion",
      "offre publique",
      "retrait obligatoire",
      "augmentation de capital",
      "nomination",
      "directeur général",
      "direction générale",
      "objectifs",
      "redressement judiciaire",
      "accord de cession", // pas « cession de » : il correspond aussi à « cession des actions » (rachat courant)
      "dépréciation",
    ],
  },
  {
    label: "Moyen",
    points: 2,
    keywords: [
      "seuil", // pas « franchit » : « Dassault Systèmes franchit un nouveau cap » n'est pas un franchissement de seuil
      "programme de rachat",
    ],
  },
  {
    label: "Routine",
    points: 0,
    keywords: [
      "droits de vote",
      "actions propres",
      "mise à disposition",
      "rapport financier",
      "contrat de liquidité",
      "honoraires",
    ],
  },
];

/** Minuscules, sans accents, apostrophes typographiques remplacées par ', espaces multiples réduits. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ");
}

export function scoreByRules({ title, subtype }: RuleInput): RuleScore {
  const text = normalize(`${title} ${subtype ?? ""}`);
  for (const level of LEVELS) {
    const keyword = level.keywords.find((k) => text.includes(normalize(k)));
    if (keyword) return { score: level.points, reasons: [`${level.label} : « ${keyword} »`] };
  }
  return { score: 1, reasons: ["Indéterminé : à vérifier dans le document"] };
}
