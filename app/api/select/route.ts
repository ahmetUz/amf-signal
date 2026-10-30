import { runSelection } from "@/lib/selection/select";

export const maxDuration = 60;

export async function POST() {
  try {
    return Response.json(await runSelection());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
