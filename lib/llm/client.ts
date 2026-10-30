import Anthropic from "@anthropic-ai/sdk";

// Lit ANTHROPIC_API_KEY dans l'environnement (.env.local en local, variables Vercel en production).
export const anthropic = new Anthropic();
