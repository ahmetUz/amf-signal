/** Vérifie qu'une citation produite par le LLM figure bien dans le texte source. Fonctions pures. */

/**
 * Normalisation typographique minimale : espaces (y compris insécables) et apostrophes.
 * On ne touche ni à la casse, ni aux chiffres, ni aux mots : la citation doit rester mot pour mot.
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ") // \s couvre   et   en JavaScript
    .trim();
}

// Ponctuation que le LLM ajoute ou change en bordure de citation (« ; » au lieu de « . », guillemets).
// Le tiret n'en fait pas partie : en tête de citation, ce peut être un signe moins.
const EDGE_PUNCTUATION = /^[\s.,;:!?…«»"'()]+|[\s.,;:!?…«»"'()]+$/g;

/** La citation figure-t-elle mot pour mot dans la source ? Seule la ponctuation des bords est tolérée. */
export function quoteFoundIn(quote: string, source: string): boolean {
  const normalizedQuote = normalizeWhitespace(quote).replace(EDGE_PUNCTUATION, "");
  if (normalizedQuote === "") return false;
  return normalizeWhitespace(source).includes(normalizedQuote);
}
