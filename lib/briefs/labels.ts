import type { FigureStatus } from "@/lib/verification/verify";

// Libellé et couleur de chaque statut (vert, orange, gris), comme le demande le CLAUDE.md.
// Vert et orange sont les tokens ok et embargo de la palette Clarsource.
export const STATUS_DISPLAY: Record<FigureStatus, { label: string; className: string }> = {
  verifie: { label: "Vérifié", className: "bg-ok-soft text-ok" },
  a_confirmer: { label: "À confirmer", className: "bg-embargo-soft text-embargo" },
  non_verifiable: { label: "Non vérifiable", className: "bg-muted text-muted-foreground" },
};
