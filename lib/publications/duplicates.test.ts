import { findDuplicates } from "./duplicates";

const at = (iso: string) => new Date(iso);

// Cas réels : la même publication arrive par deux diffuseurs, sous deux identifiants.
describe("findDuplicates", () => {
  it("rattache le second dépôt au premier quand seul l'apostrophe diffère (Acheter-Louer)", () => {
    const rows = [
      { uin: "082035_20261028", company: "ACHETER-LOUER.FR", title: "Nombre d'actions soumises au regroupement", publishedAt: at("2026-10-28T16:00:00Z") },
      { uin: "652284_20261028", company: "ACHETER-LOUER.FR", title: "Nombre d’actions soumises au regroupement", publishedAt: at("2026-10-28T10:54:01Z") },
    ];
    expect(findDuplicates(rows)).toEqual(new Map([["082035_20261028", "652284_20261028"]]));
  });

  it("rattache un dépôt du lendemain (D.L.S.I.)", () => {
    const rows = [
      { uin: "652602_20261029", company: "D.L.S.I.", title: "Groupe DLSI - Chiffre d'affaires 3ème trimestre 2026", publishedAt: at("2026-10-29T16:11:14Z") },
      { uin: "083609_20261030", company: "D.L.S.I.", title: "Groupe DLSI - Chiffre d'affaires 3ème trimestre 2026", publishedAt: at("2026-10-30T05:59:23Z") },
    ];
    expect(findDuplicates(rows)).toEqual(new Map([["083609_20261030", "652602_20261029"]]));
  });

  it("ne rattache pas un titre identique d'une autre société", () => {
    const rows = [
      { uin: "a", company: "ARKEMA", title: "Informations privilégiées / Autres communiqués", publishedAt: at("2026-10-29T16:00:00Z") },
      { uin: "b", company: "GECINA", title: "Informations privilégiées / Autres communiqués", publishedAt: at("2026-10-29T16:00:00Z") },
    ];
    expect(findDuplicates(rows).size).toBe(0);
  });

  it("ne rattache pas deux dépôts trop éloignés (déclaration hebdomadaire au même titre)", () => {
    const rows = [
      { uin: "a", company: "CAPGEMINI", title: "Déclaration des transactions sur actions propres", publishedAt: at("2026-10-20T16:00:00Z") },
      { uin: "b", company: "CAPGEMINI", title: "Déclaration des transactions sur actions propres", publishedAt: at("2026-10-27T16:00:00Z") },
    ];
    expect(findDuplicates(rows).size).toBe(0);
  });

  it("ne rattache pas des titres différents (DBV : « présente » puis « publie »)", () => {
    const rows = [
      { uin: "a", company: "DBV TECHNOLOGIES", title: "DBV Technologies présente ses résultats", publishedAt: at("2026-10-27T19:30:00Z") },
      { uin: "b", company: "DBV TECHNOLOGIES", title: "DBV Technologies publie ses résultats", publishedAt: at("2026-10-28T19:47:42Z") },
    ];
    expect(findDuplicates(rows).size).toBe(0);
  });
});
