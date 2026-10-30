import { isAuthorized, unauthorized } from "@/lib/api/auth";
import { ingest } from "@/lib/ingest";

export const maxDuration = 60;

const DEFAULT_DAYS = 3;
const MAX_DAYS = 7; // borne le nombre d'appels à l'API AMF

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  const param = Number(new URL(request.url).searchParams.get("days") ?? DEFAULT_DAYS);
  const days = Number.isInteger(param) && param >= 1 && param <= MAX_DAYS ? param : DEFAULT_DAYS;
  try {
    return Response.json(await ingest(days));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 502 });
  }
}

// Vercel Cron appelle la route en GET (voir vercel.json) : même traitement, la collecte est idempotente.
export const GET = POST;
