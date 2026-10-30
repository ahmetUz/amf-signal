import { computeFinalScore } from "./final-score";
import type { Grid } from "./grid-schema";

// Grille neutre : on ne change qu'un champ par test pour isoler son effet.
const baseGrid: Grid = {
  type_evenement: "autre",
  revision_objectifs: "aucune",
  montant_annonce: false,
  impact_capital: false,
  impact_direction: false,
  citation: "phrase du document",
};

const score = (grid: Partial<Grid>, options: { cac40?: boolean; citationVerified?: boolean } = {}) =>
  computeFinalScore({
    grid: { ...baseGrid, ...grid },
    cac40: options.cac40 ?? false,
    citationVerified: options.citationVerified ?? true,
  });

describe("computeFinalScore : base selon l'événement", () => {
  it.each([
    ["offre_publique", 5],
    ["acquisition_cession", 5],
    ["procedure_collective", 5],
    ["changement_dirigeant", 5],
    ["augmentation_capital", 5],
    ["depreciation", 4],
    ["resultats", 3],
    ["rachat_actions", 2],
    ["contrat_partenariat", 2],
    ["autre", 1],
  ] as const)("%s vaut %i", (type_evenement, expected) => {
    expect(score({ type_evenement }).score).toBe(expected);
  });

  it("des résultats avec objectifs revus valent autant qu'une opération (5)", () => {
    expect(score({ type_evenement: "resultats", revision_objectifs: "baisse" })).toEqual({
      score: 5,
      reasons: ["Résultats avec objectifs revus à la baisse (+5)"],
    });
  });
});

describe("computeFinalScore : bonus factuels", () => {
  it("ajoute 1 point par fait objectif, avec une raison chacun", () => {
    const result = score(
      { type_evenement: "acquisition_cession", montant_annonce: true, impact_capital: true, impact_direction: true },
      { cac40: true },
    );

    expect(result).toEqual({
      score: 9,
      reasons: [
        "Acquisition ou cession (+5)",
        "Montant annoncé (+1)",
        "Impact sur le capital (+1)",
        "Impact sur la direction (+1)",
        "Société du CAC 40 (+1)",
      ],
    });
  });
});

describe("computeFinalScore : citation non vérifiée", () => {
  it("ne change pas le score mais le signale : la grille doit être relue", () => {
    const result = score({ type_evenement: "resultats" }, { citationVerified: false });

    expect(result.score).toBe(3);
    expect(result.reasons).toContain("⚠ Citation introuvable dans le document : grille à vérifier");
  });
});
