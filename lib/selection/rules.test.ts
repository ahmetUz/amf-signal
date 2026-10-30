import { scoreByRules } from "./rules";

// Tous les titres viennent du flux AMF réel (collecte du 27 au 30/10/2026).

describe("scoreByRules : routine", () => {
  it.each([
    ["Nombre total de droits de vote et actions composant le capital social au 22 octobre 2026", "Total du nombre de droits de vote et du capital", "droits de vote"],
    ["Capgemini SE : Déclaration des transactions sur actions propres réalisées du 19 au 23 octobre 2026", "Acquisition ou cession des actions de l'émetteur", "actions propres"],
    ["ECOSLOPS : MISE A DISPOSITION DU RAPPORT FINANCIER SEMESTRIEL 2026", "Rapports financiers et d'audit semestriels/examens réduits", "mise à disposition"],
  ])("« %s » vaut 0", (title, subtype, keyword) => {
    expect(scoreByRules({ title, subtype })).toEqual({
      score: 0,
      reasons: [`Routine : « ${keyword} »`],
    });
  });
});

describe("scoreByRules : signal fort", () => {
  it.each([
    ["SPIE signe un accord pour l'acquisition de SAR ANLAGENBAU GmbH en Autriche et en Allemagne", "Informations privilégiées", "acquisition de"],
    ["Amoéba annonce le succès de son augmentation de capital ouverte à tous d'un montant de 9,7 M EUR", "Informations privilégiées", "augmentation de capital"],
    ["ÉVOLUTION PROGRAMMÉE DE LA GOUVERNANCE : MAGDELEINE ALLAUME VA SUCCÉDER A DOMINIQUE TOURNEIX A LA DIRECTION GÉNÉRALE", "Informations privilégiées", "direction générale"],
    ["SCOR - Résultats du troisième trimestre 2026 : Résultat net de EUR 206 millions au troisième trimestre 2026", "Informations privilégiées", "résultat"],
  ])("« %s » vaut 3", (title, subtype, keyword) => {
    expect(scoreByRules({ title, subtype })).toEqual({
      score: 3,
      reasons: [`Fort : « ${keyword} »`],
    });
  });

  it("détecte le signal dans le sous-type quand le titre est vide de sens", () => {
    const result = scoreByRules({
      title: "NORTH ATLANTIC ENERGIES :",
      subtype: "Communiqués publiés en période d'offre publique d'acquisition",
    });

    expect(result).toEqual({ score: 3, reasons: ["Fort : « offre publique »"] });
  });
});

describe("scoreByRules : signal moyen", () => {
  it("un programme de rachat d'actions vaut 2", () => {
    const result = scoreByRules({
      title: "BNP PARIBAS LANCE SON PROGRAMME  DE RACHAT D’ACTIONS AU TITRE DE L’EXERCICE 2026  D’UN MONTANT DE 1,3 MILLIARD",
      subtype: "Acquisition ou cession des actions de l'émetteur",
    });

    expect(result).toEqual({ score: 2, reasons: ["Moyen : « programme de rachat »"] });
  });

  // Seul titre inventé du fichier : aucun franchissement de seuil dans les 3 jours collectés.
  it("un franchissement de seuil vaut 2", () => {
    const result = scoreByRules({
      title: "Déclaration de franchissement de seuil",
      subtype: "Informations privilégiées",
    });

    expect(result).toEqual({ score: 2, reasons: ["Moyen : « seuil »"] });
  });
});

describe("scoreByRules : pièges observés dans le flux", () => {
  it("« Acquisition ou cession des actions » est un rachat courant, pas une acquisition", () => {
    const result = scoreByRules({
      title: "Acquisition ou cession des actions de l'émetteur / Transactions sur actions propres (version agrégée)",
      subtype: "Acquisition ou cession des actions de l'émetteur",
    });

    expect(result).toEqual({ score: 0, reasons: ["Routine : « actions propres »"] });
  });

  it("un signal fort l'emporte sur un mot de routine dans le même titre", () => {
    const result = scoreByRules({
      title: "Malteries Franco Belges S.A.: Résultats de l'exercice 2025-2026 et mise à disposition du Rapport financier annuel",
      subtype: "Informations privilégiées",
    });

    expect(result).toEqual({ score: 3, reasons: ["Fort : « résultat »"] });
  });

  it("« franchit un nouveau cap » n'est pas un franchissement de seuil", () => {
    const result = scoreByRules({
      title: "Dassault Systèmes franchit un nouveau cap dans les Sciences de la vie avec une plateforme d'IA unifiée",
      subtype: "Informations privilégiées",
    });

    expect(result.score).toBe(1);
  });

  // Corrigé après comparaison avec Clardot : un article y annonçait « Sapmer accuse une perte nette de
  // 13,1 millions d'euros », tiré d'une publication que nos règles classaient en routine. Un rapport
  // financier contient des résultats : seule sa « mise à disposition » est de la routine.
  it.each([
    ["Sapmer-Rapport financier semestriel 2026"],
    ["Rapport Financier semestriel 2026"],
  ])("« %s » n'est pas de la routine : le document contient des résultats", (title) => {
    const result = scoreByRules({ title, subtype: "Rapports financiers et d'audit semestriels/examens réduits" });

    expect(result.score).toBeGreaterThan(0);
  });

  it("la mise à disposition d'un rapport financier reste de la routine", () => {
    const result = scoreByRules({
      title: "ECOSLOPS : MISE A DISPOSITION DU RAPPORT FINANCIER SEMESTRIEL 2026",
      subtype: "Rapports financiers et d'audit semestriels/examens réduits",
    });

    expect(result).toEqual({ score: 0, reasons: ["Routine : « mise à disposition »"] });
  });

  it("un titre générique n'est pas écarté : le document devra être lu", () => {
    const result = scoreByRules({
      title: "Informations privilégiées / Autres communiqués",
      subtype: "Informations privilégiées",
    });

    expect(result).toEqual({ score: 1, reasons: ["Indéterminé : à vérifier dans le document"] });
  });

  it("gère un sous-type absent", () => {
    expect(scoreByRules({ title: "Rapport semestriel 2026", subtype: null }).score).toBe(1);
  });
});

// Oublis trouvés en lançant les règles à blanc sur les 187 publications réelles.
describe("scoreByRules : événements graves ou structurants", () => {
  it.each([
    ["Ouverture d'une procédure de redressement judiciaire pour sa filiale Procédés Hallier et report de la publication des comptes semestriels", "redressement judiciaire"],
    ["Prodways Group franchit une nouvelle étape dans sa stratégie avec un accord de cession de l'activité Matières", "accord de cession"],
    ["Bouygues enregistre une dépréciation comptable de sa participation dans TF1, sans incidence sur sa trésorerie. Le Groupe réaffirme sa confiance dans la stratégie de transformation de TF1.", "dépréciation"],
  ])("« %s » vaut 3", (title, keyword) => {
    expect(scoreByRules({ title, subtype: "Informations privilégiées" })).toEqual({
      score: 3,
      reasons: [`Fort : « ${keyword} »`],
    });
  });
});

// Cas signalés par une relecture extérieure (30/10/2026), titres réels.
describe("scoreByRules : corrections après relecture", () => {
  it("la mise à disposition d'un rapport trimestriel est de la routine (LECTRA)", () => {
    const result = scoreByRules({
      title: "LECTRA : Mise à disposition du rapport financier trimestriel au 30 septembre 2026",
      subtype: "Information financière trimestrielle",
    });
    expect(result).toEqual({ score: 0, reasons: ["Routine : « mise à disposition »"] });
  });

  it("une publication trimestrielle sans autre signal reste un signal fort", () => {
    const result = scoreByRules({
      title: "LECTRA : Neuf premiers mois 2026 : amélioration structurelle de la rentabilité",
      subtype: "Information financière trimestrielle",
    });
    expect(result).toEqual({ score: 3, reasons: ["Fort : « trimestr »"] });
  });

  it("l'annonce d'une visioconférence est de la routine, même si elle parle d'une opération (Gold by Gold)", () => {
    const result = scoreByRules({
      title: "Nouvelle visioconférence Gold by Gold à destination des actionnaires et investisseurs individuels dimanche 1er novembre 2026 à 18h00 dans le cadre de l'augmentation de capital destinée à l'acquisition de réserves d'Or",
      subtype: "Informations privilégiées",
    });
    expect(result).toEqual({ score: 0, reasons: ["Routine : « visioconférence »"] });
  });

  it.each([
    ["Toosla affiche le 1er bénéfice de son histoire au 1er semestre 2026 et prépare sa nouvelle feuille de route", "bénéfice"],
    ["Sapmer accuse une perte nette au premier semestre", "perte"],
  ])("« %s » est un signal fort", (title, keyword) => {
    expect(scoreByRules({ title, subtype: "Informations privilégiées" })).toEqual({ score: 3, reasons: [`Fort : « ${keyword} »`] });
  });

  it("la raison affichée est l'opération, pas le chiffre d'affaires de la cible (UNIFY)", () => {
    const result = scoreByRules({
      title: "UNIFY Group annonce l'acquisition de ' Option Finance ', groupe média de référence de l'information financière professionnelle - réalisant plus de 4M EUR de chiffre d'affaires -",
      subtype: "Informations privilégiées",
    });
    expect(result.reasons).toEqual(["Fort : « acquisition de »"]);
  });

  it("des résultats d'essai clinique sont nommés comme tels (OSE)", () => {
    const result = scoreByRules({
      title: "OSE Immunotherapeutics annonce des résultats positifs complémentaires de l'étude de Phase 2 randomisée Combi-TED de Tedopi® (OSE2101)",
      subtype: "Informations privilégiées",
    });
    expect(result).toEqual({ score: 3, reasons: ["Fort : « étude de phase »"] });
  });
});
