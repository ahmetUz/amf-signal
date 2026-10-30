import { isAuthorized } from "./auth";

const request = (authorization?: string) =>
  new Request("http://localhost/api/ingest", { headers: authorization ? { authorization } : {} });

describe("isAuthorized", () => {
  it("accepte le bon secret au format Bearer (celui qu'envoie Vercel Cron)", () => {
    expect(isAuthorized(request("Bearer s3cret"), "s3cret")).toBe(true);
  });

  it("refuse un mauvais secret ou un en-tête absent", () => {
    expect(isAuthorized(request("Bearer autre"), "s3cret")).toBe(false);
    expect(isAuthorized(request(), "s3cret")).toBe(false);
  });

  it("refuse tout si le secret n'est pas configuré : on échoue fermé", () => {
    expect(isAuthorized(request("Bearer "), undefined)).toBe(false);
    expect(isAuthorized(request("Bearer "), "")).toBe(false);
  });
});
