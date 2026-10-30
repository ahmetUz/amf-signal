// Libellés courts pour les badges. Les sous-types AMF sont longs (jusqu'à 90 caractères).
// La liste vient des valeurs réellement observées dans le flux (voir docs/NOTES.md).
const SHORT_LABELS: Record<string, string> = {
  "Informations privilégiées": "Info privilégiée",
  "Information financière trimestrielle": "Trimestriel",
  "Rapports financiers et d'audit semestriels/examens réduits": "Semestriel",
  "Rapports financiers et d'audit annuels": "Annuel",
  "Acquisition ou cession des actions de l'émetteur": "Rachat d'actions",
  "Communiqués publiés en période d'offre publique d'acquisition": "Offre publique",
  "Total du nombre de droits de vote et du capital": "Droits de vote",
  "Document de référence": "Doc. de référence",
};

/** Libellé court d'un sous-type. Repli : le sous-type brut, ou « Non renseigné » s'il est null. */
export function subtypeLabel(subtype: string | null): string {
  if (!subtype) return "Non renseigné";
  if (subtype.startsWith("Modalités de mise à disposition")) return "Mise à disposition";
  return SHORT_LABELS[subtype] ?? subtype;
}
