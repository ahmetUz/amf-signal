import { toPublication } from "./mapper";

// Enregistrement réel (Île-de-France Mobilités, 30/10/2026), réduit aux champs utilisés.
const record = {
  uin_idt_uin: "083612_20261030",
  uin_dat_amf: "2026-10-30T09:59:00+00:00",
  timezone_uin_dat_amf: "02:00",
  identificationsociete_iso_cd_isi: "999999999999",
  identificationsociete_iso_nom_soc: "ILE-DE-FRANCE MOBILITES",
  identificationsociete_iso_pay_ss: "FR",
  type_d_information: "Information réglementée",
  sous_type_d_information: "Informations privilégiées",
  informationdeposee_inf_tit_inf: "Délibération BP 2026",
  informationdeposee_inf_lng_inf: "Français",
  url_de_recuperation: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2026/10/FCACT083612_20261030.pdf",
};

function map(overrides: Record<string, unknown> = {}) {
  const result = toPublication({ ...record, ...overrides });
  if (!result.ok) throw new Error(result.error);
  return result.publication;
}

describe("toPublication", () => {
  it("remplace l'ISIN de remplissage 999999999999 par null", () => {
    expect(map().isin).toBeNull();
  });

  it("garde un vrai ISIN", () => {
    expect(map({ identificationsociete_iso_cd_isi: "FR0000120578" }).isin).toBe("FR0000120578");
  });

  it("corrige l'heure de dépôt avec le vrai fuseau de Paris", () => {
    expect(map().publishedAt?.toISOString()).toBe("2026-10-30T10:59:00.000Z");
  });

  it("accepte un enregistrement sans champ de fuseau", () => {
    const { timezone_uin_dat_amf, ...withoutTz } = record;
    void timezone_uin_dat_amf;
    const result = toPublication(withoutTz);
    expect(result.ok && result.publication.publishedAt?.toISOString()).toBe("2026-10-30T09:59:00.000Z");
  });
});
