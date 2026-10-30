import { z } from "zod";

// Uniquement les champs vérifiés sur un vrai appel (voir docs/NOTES.md, section Données).
// type et sous-type sont parfois null dans le flux : ils sont donc nullable.
export const amfRecordSchema = z.object({
  uin_idt_uin: z.string().min(1),
  uin_dat_amf: z.iso.datetime({ offset: true }),
  timezone_uin_dat_amf: z.string().nullish(), // décalage utilisé par la source pour calculer uin_dat_amf (voir date.ts)
  identificationsociete_iso_cd_isi: z.string().nullable(),
  identificationsociete_iso_nom_soc: z.string().min(1),
  identificationsociete_iso_pay_ss: z.string().nullable(),
  type_d_information: z.string().nullable(),
  sous_type_d_information: z.string().nullable(),
  informationdeposee_inf_tit_inf: z.string().min(1),
  informationdeposee_inf_lng_inf: z.string(),
  url_de_recuperation: z.url(),
});

export type AmfRecord = z.infer<typeof amfRecordSchema>;

// On valide la page sans valider ses enregistrements : un enregistrement invalide ne doit pas faire échouer toute la page.
export const amfPageSchema = z.object({
  total_count: z.number().int().nonnegative(),
  results: z.array(z.record(z.string(), z.unknown())),
});
