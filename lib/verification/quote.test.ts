import { normalizeWhitespace, quoteFoundIn } from "./quote";

describe("normalizeWhitespace", () => {
  it("remplace espaces insécables, tabulations et retours à la ligne par une espace simple", () => {
    //   (insécable) et   (fine insécable) sont fréquents dans les PDF français : « 1 234 M€ », « 12 % »
    expect(normalizeWhitespace("1 234 M€\n\tde chiffre")).toBe("1 234 M€ de chiffre");
  });

  it("uniformise les apostrophes typographiques", () => {
    expect(normalizeWhitespace("l’acquisition d‘In-Store")).toBe("l'acquisition d'In-Store");
  });

  it("retire les espaces en début et fin", () => {
    expect(normalizeWhitespace("  texte  ")).toBe("texte");
  });
});

describe("quoteFoundIn", () => {
  const source =
    "SPIE signe un accord pour\nl’acquisition de SAR ANLAGENBAU GmbH. Le chiffre d’affaires atteint 120 M€.";

  it("trouve une citation exacte malgré les différences d'espaces et d'apostrophes", () => {
    expect(quoteFoundIn("un accord pour l'acquisition de SAR ANLAGENBAU GmbH", source)).toBe(true);
    expect(quoteFoundIn("Le chiffre d'affaires atteint 120 M€", source)).toBe(true);
  });

  it("refuse une citation reformulée", () => {
    expect(quoteFoundIn("SPIE a signé un accord d'acquisition", source)).toBe(false);
  });

  it("refuse une citation dont un chiffre a été modifié", () => {
    expect(quoteFoundIn("Le chiffre d'affaires atteint 125 M€", source)).toBe(false);
  });

  // Cas réel (Capgemini) : citation identique au document, mais terminée par « ; » au lieu d'un point.
  it("ignore la ponctuation en début et en fin de citation", () => {
    expect(quoteFoundIn("Le chiffre d'affaires atteint 120 M€ ;", source)).toBe(true);
    expect(quoteFoundIn("« un accord pour l'acquisition de SAR ANLAGENBAU GmbH. »", source)).toBe(true);
  });

  it("garde la ponctuation à l'intérieur de la citation", () => {
    expect(quoteFoundIn("SPIE signe un accord pour l'acquisition de SAR ANLAGENBAU GmbH ; Le chiffre", source)).toBe(false);
  });

  it("ne retire pas un signe moins en début de citation", () => {
    expect(quoteFoundIn("-13,6 %", "une baisse de 13,6 % sur la période")).toBe(false);
  });

  it("refuse une citation vide : elle serait trivialement « trouvée »", () => {
    expect(quoteFoundIn("   ", source)).toBe(false);
    expect(quoteFoundIn(" ; ", source)).toBe(false);
  });
});
