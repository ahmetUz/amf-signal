const dateTime = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const longDay = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC", // la chaîne AAAA-MM-JJ est déjà un jour de Paris : on ne la décale pas
  weekday: "long",
  day: "numeric",
  month: "long",
});

export const formatDateTime = (date: Date) => dateTime.format(date);
export const formatDay = (day: string) => longDay.format(new Date(`${day}T00:00:00Z`));
