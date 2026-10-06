// Les jours sont comptés à l'heure de Paris : un scan à 00h30 appartient bien
// au jour qui commence, pas à la veille (comme ce serait le cas en UTC).
const TIMEZONE = "Europe/Paris";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Renvoie "2026-10-06" pour la date donnée (aujourd'hui par défaut).
export function dayKey(date = new Date()) {
  return dayFormatter.format(date);
}

function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// Décale une clé de jour de `delta` jours, en arithmétique de calendrier pure
// (pas de piège avec les changements d'heure).
export function shiftDay(key, delta) {
  return new Date(parseKey(key) + delta * 86400000).toISOString().slice(0, 10);
}

export function weekdayShort(key) {
  return new Date(parseKey(key)).toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" });
}

export function weekdayInitial(key) {
  return weekdayShort(key).charAt(0).toUpperCase();
}

export function longDate(key) {
  return new Date(parseKey(key)).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function shortDate(key) {
  return new Date(parseKey(key)).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
