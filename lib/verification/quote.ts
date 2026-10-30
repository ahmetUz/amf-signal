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

export function quoteFoundIn(quote: string, source: string): boolean {
  const normalizedQuote = normalizeWhitespace(quote);
  if (normalizedQuote === "") return false;
  return normalizeWhitespace(source).includes(normalizedQuote);
}
