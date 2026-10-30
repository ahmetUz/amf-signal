import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { anthropic } from "./client";

type StructuredRequest = {
  model: string;
  effort: "low" | "medium" | "high";
  system: string;
  user: string;
};

/**
 * Appel en structured output : le format JSON est imposé par l'API, puis revalidé par Zod.
 * stop_reason est contrôlé AVANT de parser : une réponse tronquée donne un message clair,
 * au lieu d'un « Unterminated string in JSON » trompeur.
 */
export async function structuredCall<T extends z.ZodType>(schema: T, request: StructuredRequest): Promise<z.infer<T>> {
  const response: Anthropic.Message = await anthropic.messages.create({
    model: request.model,
    max_tokens: 16000, // le raisonnement interne du modèle consomme aussi ce budget
    output_config: { effort: request.effort, format: zodOutputFormat(schema) },
    system: request.system,
    messages: [{ role: "user", content: request.user }],
  });

  if (response.stop_reason === "refusal") throw new Error("Le modèle a refusé de répondre");
  if (response.stop_reason === "max_tokens") throw new Error("Réponse tronquée : max_tokens atteint");

  const text = response.content.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Réponse sans texte");
  return schema.parse(JSON.parse(text));
}
