import { verifyFigure, type BriefFigure } from "./verify";

// Extrait réel du communiqué Air Liquide du 29/10/2026 (texte tel que sorti de unpdf).
const source =
  "Établi à près de 7,3 milliards d’euros au 30 septembre 2026, notre chiffre d’affaires\nest en hausse de + 4,3 % hors change et énergie";

const body = "Air Liquide publie un chiffre d'affaires de 7,3 milliards d'euros au troisième trimestre, en hausse de 4,3 %.";

const figure = (overrides: Partial<BriefFigure> = {}): BriefFigure => ({
  valeur: "7,3",
  unite: "Md€",
  citation_exacte: "Établi à près de 7,3 milliards d’euros au 30 septembre 2026",
  ...overrides,
});

describe("verifyFigure", () => {
  it("vérifié : citation exacte, chiffre dans la citation et dans la brève", () => {
    expect(verifyFigure(figure(), { source, body })).toEqual({
      status: "verifie",
      citationInSource: true,
      figureInCitation: true,
      figureInBody: true,
    });
  });

  it("vérifié malgré un retour à la ligne du PDF au milieu de la citation", () => {
    const check = verifyFigure(
      figure({ valeur: "4,3", unite: "%", citation_exacte: "notre chiffre d’affaires est en hausse de + 4,3 %" }),
      { source, body },
    );

    expect(check.status).toBe("verifie");
  });

  it("à confirmer : le chiffre est dans le document mais la citation a été reformulée", () => {
    const check = verifyFigure(figure({ citation_exacte: "un chiffre d'affaires de 7,3 milliards d'euros" }), { source, body });

    expect(check).toMatchObject({ status: "a_confirmer", citationInSource: false });
  });

  it("à confirmer : le chiffre est dans le document mais absent du corps de la brève", () => {
    const check = verifyFigure(figure(), { source, body: "Air Liquide publie son chiffre d'affaires trimestriel." });

    expect(check).toMatchObject({ status: "a_confirmer", figureInBody: false });
  });

  it("non vérifiable : le chiffre n'existe pas dans le document", () => {
    const check = verifyFigure(figure({ valeur: "7,5", citation_exacte: "un chiffre d'affaires de 7,5 milliards" }), {
      source,
      body: "Air Liquide publie 7,5 milliards d'euros de chiffre d'affaires.",
    });

    expect(check.status).toBe("non_verifiable");
  });

  it("non vérifiable : la valeur n'est pas un nombre lisible", () => {
    expect(verifyFigure(figure({ valeur: "environ sept" }), { source, body }).status).toBe("non_verifiable");
  });
});

describe("verifyFigure : une date n'est pas un chiffre vérifiable", () => {
  // Cas réel (brève STMicroelectronics) : Haiku a rendu « 1er janvier 2027 » comme chiffre.
  // Le code n'en lisait que « 1 », retrouvé partout : le contrôle passait sans rien prouver.
  const stSource = "La nouvelle organisation entrera en vigueur le 1er janvier 2027, pour une mise en œuvre de";

  it.each([
    [{ valeur: "1er janvier 2027", unite: "date" }],
    [{ valeur: "1er janvier 2027", unite: "" }],
    [{ valeur: "mars 2027", unite: "date" }],
  ])("%j est non vérifiable", (date) => {
    const check = verifyFigure(
      { ...date, citation_exacte: "La nouvelle organisation entrera en vigueur le 1er janvier 2027" },
      { source: stSource, body: "La réorganisation entre en vigueur le 1er janvier 2027." },
    );

    expect(check.status).toBe("non_verifiable");
  });
});
