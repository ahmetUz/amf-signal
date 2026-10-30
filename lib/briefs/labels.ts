import type { FigureStatus } from "@/lib/verification/verify";

// Libellé et couleur de chaque statut (vert, orange, gris), comme le demande le CLAUDE.md.
export const STATUS_DISPLAY: Record<FigureStatus, { label: string; className: string }> = {
  verifie: { label: "Vérifié", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  a_confirmer: { label: "À confirmer", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  non_verifiable: { label: "Non vérifiable", className: "bg-muted text-muted-foreground" },
};
