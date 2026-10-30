/**
 * Date de dépôt AMF ramenée au vrai UTC. Fonction pure, testée dans date.test.ts.
 *
 * Le flux calcule uin_dat_amf en retirant à l'heure de Paris le décalage de timezone_uin_dat_amf.
 * Ce champ vaut "02:00" (heure d'été) même après le passage à l'heure d'hiver : les heures sont alors
 * fausses d'une heure (07:30 à Paris devient 06:30). On reconstitue l'heure de Paris avec le décalage
 * annoncé, puis on la convertit avec le vrai fuseau Europe/Paris.
 */
const OFFSET = /^([+-])?(\d{2}):(\d{2})$/;
const MINUTE = 60_000;

const parisOffsetFormat = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", timeZoneName: "longOffset" });

/** Décalage de Paris (en minutes) à un instant donné : 60 en hiver, 120 en été. */
function parisOffsetMinutes(instant: number): number {
  const name = parisOffsetFormat.formatToParts(instant).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

export function amfDateToUtc(raw: string, timezone: string | null | undefined): Date {
  const declared = OFFSET.exec(timezone ?? "");
  if (!declared) return new Date(raw);
  const declaredMinutes = (declared[1] === "-" ? -1 : 1) * (Number(declared[2]) * 60 + Number(declared[3]));

  const parisWallClock = new Date(raw).getTime() + declaredMinutes * MINUTE; // l'heure affichée à Paris
  // Deux passes : le décalage dépend de l'instant, qu'on ne connaît qu'après avoir appliqué le décalage.
  const guess = parisWallClock - parisOffsetMinutes(parisWallClock) * MINUTE;
  return new Date(parisWallClock - parisOffsetMinutes(guess) * MINUTE);
}
