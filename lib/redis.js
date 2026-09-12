import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";

// Ces deux variables sont fournies automatiquement par Vercel
// quand tu connectes une base Upstash Redis à ton projet.
export const redis = new Redis({
  url: process.env.STORAGE_KV_REST_API_URL,
  token: process.env.STORAGE_KV_REST_API_TOKEN,
});

const LINKS_KEY = "nfc_links"; // on stocke un objet { slug: { destination, businessName, createdAt } }

export async function getAllLinks() {
  const data = await redis.get(LINKS_KEY);
  return data || {};
}

export async function saveAllLinks(links) {
  await redis.set(LINKS_KEY, links);
}

export async function getLink(slug) {
  const links = await getAllLinks();
  return links[slug] || null;
}

export async function upsertLink(slug, { destination, businessName }) {
  const links = await getAllLinks();
  const existing = links[slug];
  links[slug] = {
    destination,
    businessName: businessName ?? existing?.businessName ?? "",
    // Token unique et non-devinable, donné au commerçant pour qu'il consulte SES stats
    // sans avoir accès à ton dashboard admin complet.
    clientToken: existing?.clientToken || nanoid(16),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveAllLinks(links);
  return links[slug];
}

export async function deleteLink(slug) {
  const links = await getAllLinks();
  delete links[slug];
  await saveAllLinks(links);
  await redis.del(`scans:${slug}`);
}

// --- Suivi des scans (stats) ---

function scanKey(slug) {
  return `scans:${slug}`;
}

export async function recordScan(slug) {
  const key = scanKey(slug);
  const data = (await redis.get(key)) || { total: 0, byDay: {} };
  const today = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD

  data.total = (data.total || 0) + 1;
  data.byDay[today] = (data.byDay[today] || 0) + 1;

  // Garde seulement les 90 derniers jours pour ne pas grossir indéfiniment
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  for (const day of Object.keys(data.byDay)) {
    if (new Date(day) < cutoff) delete data.byDay[day];
  }

  await redis.set(key, data);
}

export async function getScanStats(slug) {
  const data = (await redis.get(scanKey(slug))) || { total: 0, byDay: {} };
  return data;
}
