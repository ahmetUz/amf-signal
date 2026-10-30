import { categoryOf } from "./category";

// Titres et sous-types réels du flux AMF (collecte du 27 au 30/10/2026).
describe("categoryOf", () => {
  it.each([
    ["SCOR - Résultats du troisième trimestre 2026", "Informations privilégiées", "Résultats & Vie financière"],
    ["Sapmer-Rapport financier semestriel 2026", "Rapports financiers et d'audit semestriels/examens réduits", "Résultats & Vie financière"],
    ["ÉVOLUTION PROGRAMMÉE DE LA GOUVERNANCE : MAGDELEINE ALLAUME VA SUCCÉDER A DOMINIQUE TOURNEIX A LA DIRECTION GÉNÉRALE", "Informations privilégiées", "Nominations"],
    ["SPIE signe un accord pour l'acquisition de SAR ANLAGENBAU GmbH", "Informations privilégiées", "Fusions & Acquisitions"],
    ["NORTH ATLANTIC ENERGIES :", "Communiqués publiés en période d'offre publique d'acquisition", "Fusions & Acquisitions"],
    ["Amoéba annonce le succès de son augmentation de capital", "Informations privilégiées", "Levées de fonds"],
    ["Capgemini SE : Déclaration des transactions sur actions propres", "Acquisition ou cession des actions de l'émetteur", "Vie de l'action"],
    ["Nombre total de droits de vote et actions composant le capital social", "Total du nombre de droits de vote et du capital", "Vie de l'action"],
  ])("« %s » → %s", (title, subtype, label) => {
    expect(categoryOf({ title, subtype }).label).toBe(label);
  });

  // Le premier groupe qui correspond l'emporte, comme dans les règles de sélection.
  it("une nomination dans un communiqué de résultats reste un résultat", () => {
    const result = categoryOf({ title: "Résultats annuels et nomination d'un directeur général", subtype: null });
    expect(result.label).toBe("Résultats & Vie financière");
  });

  it("un titre générique tombe dans la catégorie par défaut", () => {
    expect(categoryOf({ title: "Informations privilégiées / Autres communiqués", subtype: null }).label).toBe("Communiqué");
  });
});
