import type { publications } from "@/lib/db/schema";
import type { RawRecord } from "./client";
import { amfDateToUtc } from "./date";
import { amfRecordSchema } from "./schema";

export type NewPublication = typeof publications.$inferInsert;

export type MapResult =
  | { ok: true; publication: NewPublication }
  | { ok: false; uin: string; error: string };

// Format ISO 6166 : 2 lettres de pays, 9 caractères, 1 chiffre de contrôle. Le flux contient aussi
// « 999999999999 », une valeur de remplissage (collectivités, sociétés non cotées) : on la remplace par null.
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}\d$/;
const cleanIsin = (isin: string | null) => (isin && ISIN.test(isin) ? isin : null);

/** Valide un enregistrement brut et le convertit en ligne de la table publications. Fonction pure. */
export function toPublication(raw: RawRecord): MapResult {
  const parsed = amfRecordSchema.safeParse(raw);
  if (!parsed.success) {
    const uin = typeof raw.uin_idt_uin === "string" ? raw.uin_idt_uin : "inconnu";
    return { ok: false, uin, error: parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  }
  const r = parsed.data;
  return {
    ok: true,
    publication: {
      uin: r.uin_idt_uin,
      isin: cleanIsin(r.identificationsociete_iso_cd_isi),
      company: r.identificationsociete_iso_nom_soc,
      country: r.identificationsociete_iso_pay_ss,
      infoType: r.type_d_information,
      infoSubtype: r.sous_type_d_information,
      title: r.informationdeposee_inf_tit_inf,
      language: r.informationdeposee_inf_lng_inf,
      publishedAt: amfDateToUtc(r.uin_dat_amf, r.timezone_uin_dat_amf),
      documentUrl: r.url_de_recuperation,
      raw, // l'enregistrement complet, y compris les champs qu'on n'utilise pas encore
    },
  };
}
