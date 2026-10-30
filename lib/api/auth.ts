import { timingSafeEqual } from "node:crypto";

/**
 * Les routes de l'API déclenchent des appels payants (Claude) et des écritures en base : elles exigent
 * l'en-tête `Authorization: Bearer <CRON_SECRET>`. C'est celui qu'envoie Vercel Cron, et celui à passer à curl.
 * Sans secret configuré, tout est refusé (on échoue fermé).
 */
export function isAuthorized(request: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret) return false;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  // Comparaison à temps constant : la durée ne révèle pas combien de caractères sont justes.
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export const unauthorized = () => Response.json({ error: "Non autorisé" }, { status: 401 });
