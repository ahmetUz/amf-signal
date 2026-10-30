import { normalize } from "@/lib/selection/rules";

/**
 * Catégorie éditoriale d'une publication, pour le kicker coloré du fil (à la manière de Clarsource).
 * Purement cosmétique : la sélection ne l'utilise pas. Fonction pure, testée dans category.test.ts.
 */
export type Category = { label: string; color: string };

type Group = Category & { keywords: string[] };

// L'ordre compte : le premier groupe qui trouve un mot-clé l'emporte.
// Les résultats passent en premier : un communiqué de résultats annonce souvent aussi une nomination.
const GROUPS: Group[] = [
  {
    label: "Résultats & Vie financière",
    color: "#0B7358",
    keywords: ["résultat", "chiffre d'affaires", "trimestr", "semestriel", "rapports financiers", "rapport financier", "objectifs", "dépréciation"],
  },
  {
    label: "Fusions & Acquisitions",
    color: "#1F5FA8",
    keywords: ["offre publique", "acquisition de", "acquisition d'", "fusion", "accord de cession", "retrait obligatoire"],
  },
  { label: "Levées de fonds", color: "#1F5FA8", keywords: ["augmentation de capital", "émission obligataire"] },
  { label: "Nominations", color: "#5B3FA0", keywords: ["nomination", "directeur général", "direction générale", "gouvernance"] },
  { label: "Vie de l'action", color: "#3e5566", keywords: ["actions propres", "droits de vote", "rachat", "contrat de liquidité"] },
];

const DEFAULT: Category = { label: "Communiqué", color: "#3e5566" };

export function categoryOf({ title, subtype }: { title: string; subtype: string | null }): Category {
  const text = normalize(`${title} ${subtype ?? ""}`);
  const group = GROUPS.find((g) => g.keywords.some((k) => text.includes(normalize(k))));
  return group ? { label: group.label, color: group.color } : DEFAULT;
}
