import { hrefWith, parseFilters } from "./filters";

describe("parseFilters", () => {
  it("ignore une valeur vide ou une date mal formée", () => {
    expect(parseFilters({ q: "  ", day: "30/10/2026" })).toEqual({ q: undefined, subtype: undefined, day: undefined });
  });
});

describe("hrefWith", () => {
  it("change un filtre et conserve les autres", () => {
    expect(hrefWith({ q: "Sanofi", day: "2026-10-29" }, { subtype: "Informations privilégiées" }))
      .toBe("/?q=Sanofi&day=2026-10-29&subtype=Informations+privil%C3%A9gi%C3%A9es");
  });

  it("retire un filtre passé à undefined", () => {
    expect(hrefWith({ q: "Sanofi", day: "2026-10-29" }, { day: undefined })).toBe("/?q=Sanofi");
  });

  it("renvoie / sans aucun filtre", () => {
    expect(hrefWith({}, {})).toBe("/");
  });
});
