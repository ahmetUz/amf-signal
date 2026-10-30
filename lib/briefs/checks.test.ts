import { countWords, overallStatus } from "./checks";

describe("countWords", () => {
  it("compte les mots séparés par des espaces", () => {
    expect(countWords("Air Liquide accélère au troisième trimestre")).toBe(6);
  });

  it("compte un nombre ou un mot élidé comme un seul mot", () => {
    // « 7,3 », « d'euros » et « +4,3 % » : 1 + 1 + 2 mots
    expect(countWords("7,3 milliards d'euros, +4,3 %")).toBe(5);
  });

  it("ignore les espaces multiples, insécables et les retours à la ligne", () => {
    expect(countWords("  un deux \n\n trois  ")).toBe(3);
  });

  it("renvoie 0 pour un texte vide", () => {
    expect(countWords("   ")).toBe(0);
  });
});

describe("overallStatus : le chiffre le moins sûr donne le statut de la brève", () => {
  it.each([
    [["verifie", "verifie"], "verifie"],
    [["verifie", "a_confirmer"], "a_confirmer"],
    [["a_confirmer", "non_verifiable", "verifie"], "non_verifiable"],
  ] as const)("%j → %s", (statuses, expected) => {
    expect(overallStatus([...statuses])).toBe(expected);
  });

  it("une brève sans aucun chiffre est à confirmer : rien n'a pu être vérifié", () => {
    expect(overallStatus([])).toBe("a_confirmer");
  });
});
