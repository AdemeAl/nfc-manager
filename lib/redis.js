import { Redis } from "@upstash/redis";

// Ces deux variables sont fournies automatiquement par Vercel
// quand tu connectes une base Upstash Redis à ton projet.
export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
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
}
