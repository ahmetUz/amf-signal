import { amfDateToUtc } from "./date";

// Cas réel : Sanofi publie ses résultats à 7 h 30, heure de Paris. Le flux donne 05:30 « UTC » avec
// timezone_uin_dat_amf = "02:00" : il a retiré 2 h (heure d'été) alors que Paris est en UTC+1 depuis le 25/10.
describe("amfDateToUtc", () => {
  it("corrige le décalage d'heure d'été appliqué par la source en hiver", () => {
    expect(amfDateToUtc("2026-10-30T05:30:00+00:00", "02:00").toISOString()).toBe("2026-10-30T06:30:00.000Z");
  });

  it("ne change rien en été, quand le décalage annoncé est le bon", () => {
    expect(amfDateToUtc("2026-07-15T05:30:00+00:00", "02:00").toISOString()).toBe("2026-07-15T05:30:00.000Z");
  });

  it("ne change rien quand la source annonce le bon décalage d'hiver", () => {
    expect(amfDateToUtc("2026-10-30T06:30:00+00:00", "01:00").toISOString()).toBe("2026-10-30T06:30:00.000Z");
  });

  it("garde la date telle quelle si le décalage est absent ou illisible", () => {
    expect(amfDateToUtc("2026-10-30T05:30:00+00:00", null).toISOString()).toBe("2026-10-30T05:30:00.000Z");
    expect(amfDateToUtc("2026-10-30T05:30:00+00:00", "n/a").toISOString()).toBe("2026-10-30T05:30:00.000Z");
  });
});
