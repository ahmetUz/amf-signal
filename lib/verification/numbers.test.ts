import { containsFigure, extractNumbers, parseFigure, parseNumber, type Figure } from "./numbers";

// Formats relevés dans les PDF AMF collectés (Air Liquide, Sanofi, TotalEnergies, AXA…).

describe("parseNumber", () => {
  it.each([
    ["14,3", 14.3], // virgule décimale
    ["2.5", 2.5], // point décimal (communiqués en anglais ou mal traduits)
    ["14 444", 14444], // espace de milliers
    ["1 560", 1560], // espace insécable
    ["3 299", 3299], // espace fine insécable
    ["0,90", 0.9],
    ["2026", 2026],
  ])("« %s » vaut %d", (raw, expected) => {
    expect(parseNumber(raw)).toBe(expected);
  });

  it.each([
    ["-0,9", -0.9],
    ["- 13,6", -13.6], // signe séparé par une espace
    ["−42,2", -42.2], // signe moins typographique (U+2212)
    ["+19,6", 19.6],
    ["+ 10,0", 10],
  ])("gère le signe : « %s » vaut %d", (raw, expected) => {
    expect(parseNumber(raw)).toBe(expected);
  });
});

describe("extractNumbers : unités et échelles", () => {
  const valueOf = (text: string) => extractNumbers(text)[0]?.value;

  it.each([
    ["1,4 milliard d’euros", 1.4e9],
    ["5,7 milliards d’euros", 5.7e9],
    ["491 Md€", 491e9],
    ["9,1 G$", 9.1e9],
    ["14 444 millions d’euros", 14444e6],
    ["+304 m€", 304e6], // « m€ » en minuscules : millions, pas milli-euros
    ["762 M EUR", 762e6],
    ["1,8 million", 1.8e6],
    ["500 K EUR", 500e3],
    ["9,67€", 9.67],
    ["0,90 €/action", 0.9],
  ])("« %s » vaut %d", (text, expected) => {
    expect(valueOf(text)).toBeCloseTo(expected);
  });

  it("distingue un pourcentage d'un montant", () => {
    expect(extractNumbers("+16,2%")[0]).toMatchObject({ value: 16.2, percent: true, hasUnit: true });
    expect(extractNumbers("16,2 millions")[0]).toMatchObject({ value: 16.2e6, percent: false });
  });

  it("repère une cellule de tableau sans unité", () => {
    expect(extractNumbers("Chiffre d'affaires 1 560")[0]).toMatchObject({ mantissa: 1560, value: 1560, hasUnit: false });
  });

  it("extrait tous les nombres d'une phrase réelle", () => {
    const text =
      "Établi à près de 7,3 milliards d’euros au 30 septembre 2026, notre chiffre d’affaires est en hausse de + 4,3 %";

    expect(extractNumbers(text).map((n) => n.value)).toEqual([7.3e9, 30, 2026, 4.3]);
  });

  it("ne prend pas une lettre isolée pour une unité (« 9M 2026 » n'est pas 9 millions)", () => {
    expect(extractNumbers("Indicateurs d'activité du 9M 2026").map((n) => n.value)).toEqual([2026]);
  });

  // Relecture extérieure : un « 3 % » de la brève pouvait être validé par le « 3 » de « T3 ».
  it("ignore un nombre collé à des lettres (T3, 3ème, 1er, 9M)", () => {
    expect(extractNumbers("Au T3 2026, 3ème trimestre, le 1er semestre et le 9M").map((n) => n.raw)).toEqual(["2026"]);
  });

  it("donne au premier nombre d'une fourchette l'unité du second (« 3 à 4 % »)", () => {
    const [low, high] = extractNumbers("une croissance de 3 à 4 % au quatrième trimestre");
    expect(low).toMatchObject({ value: 3, percent: true, hasUnit: true });
    expect(high).toMatchObject({ value: 4, percent: true });
    expect(extractNumbers("entre 1,2 et 1,5 Md€")[0]).toMatchObject({ value: 1.2e9, hasUnit: true });
  });
});

describe("containsFigure", () => {
  const found = (text: string, figure: Figure) => {
    const parsed = parseFigure(figure);
    if (!parsed) throw new Error(`Chiffre illisible : ${figure.valeur} ${figure.unite}`);
    return containsFigure(text, parsed);
  };
  const airLiquide = "Établi à près de 7,3 milliards d’euros au 30 septembre 2026, notre chiffre d’affaires est en hausse de + 4,3 %";

  it("retrouve un montant écrit autrement (Md€ ↔ milliards d'euros ↔ M€)", () => {
    expect(found(airLiquide, { valeur: "7,3", unite: "Md€" })).toBe(true);
    expect(found("un chiffre d'affaires de 7 300 M€", { valeur: "7,3", unite: "milliards d'euros" })).toBe(true);
  });

  it("refuse un montant différent", () => {
    expect(found(airLiquide, { valeur: "7,4", unite: "Md€" })).toBe(false);
  });

  it("refuse le bon nombre avec la mauvaise échelle", () => {
    expect(found(airLiquide, { valeur: "7,3", unite: "M€" })).toBe(false);
  });

  it("ne confond pas un pourcentage et un montant", () => {
    expect(found("16,2 millions d'euros", { valeur: "16,2", unite: "%" })).toBe(false);
  });

  it("ignore le signe : la brève écrit « en baisse de 13,6 % », le document « - 13,6 % »", () => {
    expect(found("Résultat net : - 13,6 %", { valeur: "13,6", unite: "%" })).toBe(true);
  });

  it("retrouve un chiffre dans un tableau sans unité (« en millions d'euros »)", () => {
    expect(found("(en millions d'euros) Chiffre d'affaires 1 560 1 426", { valeur: "1 560", unite: "M€" })).toBe(true);
  });

  it("valide le bas d'une fourchette (« 3 à 4 % » contient bien 3 %)", () => {
    expect(found("une croissance de 3 à 4 % au quatrième trimestre", { valeur: "3", unite: "%" })).toBe(true);
  });

  it("ne valide pas un pourcentage avec un nombre sans unité (« 3ème trimestre », « 3 sites »)", () => {
    expect(found("au 3ème trimestre, une hausse de 5 %", { valeur: "3", unite: "%" })).toBe(false);
    expect(found("le groupe ouvre 3 sites", { valeur: "3", unite: "%" })).toBe(false);
  });

  it("renvoie null pour une valeur illisible", () => {
    expect(parseFigure({ valeur: "environ sept", unite: "Md€" })).toBeNull();
  });
});
