import { createHash } from "node:crypto";

// Les stats sont un argument de vente : elles ne doivent pas être gonflées par
// des robots (aperçus de liens, moteurs de recherche, scripts de test...).
const BOT_PATTERN =
  /bot|crawler|spider|preview|facebookexternalhit|slurp|whatsapp|telegram|discord|skype|curl|wget|python|httpclient|headless|lighthouse|pingdom|uptime|monitor|vercel/i;

export function looksLikeBot(request) {
  const ua = request.headers.get("user-agent") || "";
  if (!ua || BOT_PATTERN.test(ua)) return true;

  // Préchargement par le navigateur : l'utilisateur n'a pas réellement ouvert la page.
  const purpose = `${request.headers.get("purpose") || ""} ${request.headers.get("sec-purpose") || ""}`;
  if (/prefetch|prerender/i.test(purpose)) return true;

  return false;
}

// Empreinte anonyme (on ne stocke jamais l'IP) pour ignorer les doubles passages
// en quelques secondes, par exemple une carte NFC effleurée deux fois.
export function visitorFingerprint(request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = request.headers.get("user-agent") || "";
  return createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 16);
}
