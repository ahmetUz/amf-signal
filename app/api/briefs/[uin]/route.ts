import { isAuthorized, unauthorized } from "@/lib/api/auth";
import { BriefError, generateBrief } from "@/lib/briefs/generate";

// Une publication par appel : téléchargement, 1 ou 2 appels à Haiku et vérification tiennent dans la limite Vercel.
export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/briefs/[uin]">) {
  if (!isAuthorized(request)) return unauthorized();
  const { uin } = await ctx.params;
  const force = new URL(request.url).searchParams.get("force") === "1";
  try {
    return Response.json(await generateBrief(uin, { force }));
  } catch (error) {
    const status = error instanceof BriefError ? error.status : 500;
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status });
  }
}
