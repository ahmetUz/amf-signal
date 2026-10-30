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
// 1. Les annonces d'événements (visioconférence…) passent avant tout : elles parlent d'une opération sans en être une.
// 2. Les signaux forts explicites passent avant la routine (« Résultats… et mise à disposition du rapport » vaut 3).
// 3. « trimestr » passe après la routine : « Mise à disposition du rapport trimestriel » vaut 0 (cas LECTRA).
// Dans un niveau, les opérations sont listées avant les indicateurs, pour que la raison affichée soit la plus parlante
// (« acquisition de » plutôt que le « chiffre d'affaires » de la cible).
const LEVELS: Level[] = [
  {
    label: "Routine",
    points: 0,
    keywords: ["visioconférence", "webinaire", "réunion d'information"],
  },
  {
    label: "Fort",
    points: 3,
    keywords: [
      "offre publique",
      "retrait obligatoire",
      "fusion",
      "acquisition de", // pas « acquisition » seul : « Acquisition ou cession des actions » est un rachat courant
      "acquisition d'",
      "accord de cession", // pas « cession de » : il correspond aussi à « cession des actions » (rachat courant)
      "augmentation de capital",
      "redressement judiciaire",
      "nomination",
      "directeur général",
      "direction générale",
      "dépréciation",
      "objectifs",
      "étude de phase", // résultats d'essai clinique : un vrai événement pour une biotech, mais pas des résultats financiers
      "essai clinique",
      "résultat",
      "bénéfice",
      "perte",
      "chiffre d'affaires",
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
      "mise à disposition", // la mise à disposition d'un rapport, pas le rapport lui-même (cas Sapmer)
      "contrat de liquidité",
      "honoraires",
    ],
  },
  { label: "Fort", points: 3, keywords: ["trimestr"] },
];

/** Minuscules, sans accents, apostrophes typographiques remplacées par ', espaces multiples réduits. */
export function normalize(text: string): string {
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
