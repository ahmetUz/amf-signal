import { getDocumentProxy } from "unpdf";
import type { DocumentStatus } from "@/lib/db/schema";

const MAX_BYTES = 20 * 1024 * 1024; // garde-fou du CLAUDE.md : 20 Mo
const MAX_PAGES = 3; // un communiqué tient ses faits clés dans les premières pages ; évite de lire un rapport de 300 pages

export type ExtractedDocument = {
  status: DocumentStatus;
  text: string | null;
  pageCount: number | null;
  sizeBytes: number | null;
  error: string | null;
};

const failure = (status: DocumentStatus, error: string, sizeBytes: number | null = null): ExtractedDocument => ({
  status, text: null, pageCount: null, sizeBytes, error,
});

/** Lit le Content-Length sans télécharger le fichier. null si le serveur ne le donne pas. */
async function contentLength(url: string): Promise<number | null> {
  const res = await fetch(url, { method: "HEAD", cache: "no-store" });
  const length = Number(res.headers.get("content-length"));
  return Number.isFinite(length) && length > 0 ? length : null;
}

async function firstPagesText(data: Uint8Array): Promise<{ text: string; pageCount: number }> {
  const pdf = await getDocumentProxy(data);
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, MAX_PAGES); i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : "")).join(""));
  }
  return { text: pages.join("\n\n"), pageCount: pdf.numPages };
}

/** Télécharge un document AMF et en extrait le texte des premières pages. Ne lève jamais : renvoie un statut. */
export async function extractDocument(url: string): Promise<ExtractedDocument> {
  // Les paquets ESEF/XBRL sont des .zip : on ne les ouvre pas (voir docs/NOTES.md).
  if (!url.toLowerCase().endsWith(".pdf")) return failure("pas_un_pdf", "Extension autre que .pdf");
  try {
    const announced = await contentLength(url);
    if (announced !== null && announced > MAX_BYTES) {
      return failure("trop_volumineux", `${announced} octets annoncés`, announced);
    }

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return failure("erreur", `HTTP ${res.status}`);
    const data = new Uint8Array(await res.arrayBuffer());
    // Taille lue tout de suite : pdf.js transfère le buffer à son worker, data.byteLength vaut 0 après l'extraction.
    const sizeBytes = data.byteLength;
    if (sizeBytes > MAX_BYTES) return failure("trop_volumineux", "Content-Length absent ou faux", sizeBytes);

    // Signature binaire d'un PDF : « %PDF ». L'extension seule ne prouve rien.
    if (new TextDecoder().decode(data.subarray(0, 4)) !== "%PDF") {
      return failure("pas_un_pdf", "Signature %PDF absente", sizeBytes);
    }

    const { text, pageCount } = await firstPagesText(data);
    if (text.trim() === "") return failure("erreur", "Aucun texte extrait (PDF scanné ?)", sizeBytes);
    return { status: "ok", text, pageCount, sizeBytes, error: null };
  } catch (error) {
    return failure("erreur", error instanceof Error ? error.message : String(error));
  }
}
