import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import { dayKey, shiftDay } from "@/lib/dates";

const LINKS_KEY = "nfc_links"; // { slug: { destination, businessName, clientToken, createdAt, updatedAt } }
const scanKey = (slug) => `scans:${slug}`;
const RETENTION_DAYS = 90;

// --- Connexion ---------------------------------------------------------------

// Base de test en mémoire, uniquement si on la demande explicitement (USE_MEMORY_DB=1).
// À ne JAMAIS utiliser en production : tout est perdu au redémarrage.
function createMemoryClient() {
  const store = (globalThis.__nfcMemoryDb ??= new Map());
  const read = (key) => {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expires && entry.expires < Date.now()) {
      store.delete(key);
      return null;
    }
    return entry;
  };
  return {
    async get(key) {
      const entry = read(key);
      return entry ? structuredClone(entry.value) : null;
    },
    async mget(...keys) {
      return keys.map((key) => {
        const entry = read(key);
        return entry ? structuredClone(entry.value) : null;
      });
    },
    async set(key, value, options = {}) {
      if (options.nx && read(key)) return null;
      store.set(key, {
        value: structuredClone(value),
        expires: options.ex ? Date.now() + options.ex * 1000 : 0,
      });
      return "OK";
    },
    async del(...keys) {
      keys.forEach((key) => store.delete(key));
      return keys.length;
    },
  };
}

let client;
function db() {
  if (client) return client;
  const url = process.env.STORAGE_KV_REST_API_URL;
  const token = process.env.STORAGE_KV_REST_API_TOKEN;
  if (url && token) {
    client = new Redis({ url, token });
  } else if (process.env.USE_MEMORY_DB === "1") {
    client = createMemoryClient();
  } else {
    throw new Error(
      "Base de données non connectée : STORAGE_KV_REST_API_URL et STORAGE_KV_REST_API_TOKEN sont absentes. " +
        "Vérifie les variables d'environnement sur Vercel (Settings > Environment Variables)."
    );
  }
  return client;
}

// --- Liens -------------------------------------------------------------------

export async function getAllLinks() {
  return (await db().get(LINKS_KEY)) || {};
}

async function saveAllLinks(links) {
  await db().set(LINKS_KEY, links);
}

export async function getLink(slug) {
  const links = await getAllLinks();
  return links[slug] || null;
}

// `undefined` = on garde la valeur actuelle. Pour vider un champ, passer "".
export async function upsertLink(slug, { destination, businessName } = {}) {
  const links = await getAllLinks();
  const existing = links[slug];
  const now = new Date().toISOString();
  links[slug] = {
    destination: destination ?? existing?.destination ?? "",
    businessName: businessName ?? existing?.businessName ?? "",
    // Jeton secret, remis au commerçant pour consulter SES stats sans accès à l'admin.
    clientToken: existing?.clientToken || nanoid(16),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await saveAllLinks(links);
  return links[slug];
}

export async function deleteLink(slug) {
  const links = await getAllLinks();
  delete links[slug];
  await saveAllLinks(links);
  await db().del(scanKey(slug));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
}

// Crée `count` cartes vierges à la suite des existantes (carte-21, carte-22...).
// Ne modifie JAMAIS une carte qui existe déjà.
export async function createBatch({ count, prefix }) {
  const links = await getAllLinks();
  const pattern = new RegExp("^" + escapeRegExp(prefix) + "-(\\d+)$");
  let highest = 0;
  for (const slug of Object.keys(links)) {
    const match = slug.match(pattern);
    if (match) highest = Math.max(highest, Number(match[1]));
  }

  const now = new Date().toISOString();
  const created = [];
  for (let i = 1; i <= count; i++) {
    const slug = `${prefix}-${highest + i}`;
    if (links[slug]) continue; // sécurité supplémentaire
    links[slug] = {
      destination: "",
      businessName: "",
      clientToken: nanoid(16),
      createdAt: now,
      updatedAt: now,
    };
    created.push(slug);
  }
  await saveAllLinks(links);
  return created;
}

// Remet la carte à l'état vierge : nouveau jeton (l'ancien commerce perd l'accès à la page
// stats) et compteur de scans à zéro (le prochain commerce ne voit pas les chiffres du précédent).
export async function releaseLink(slug) {
  const links = await getAllLinks();
  if (!links[slug]) return null;
  links[slug] = {
    ...links[slug],
    destination: "",
    businessName: "",
    clientToken: nanoid(16),
    updatedAt: new Date().toISOString(),
  };
  await saveAllLinks(links);
  await db().del(scanKey(slug));
  return links[slug];
}

// --- Scans -------------------------------------------------------------------

// Vrai la première fois qu'un visiteur (empreinte anonyme) passe sur cette carte dans la
// fenêtre donnée : sert à ignorer les doubles passages en quelques secondes.
export async function firstVisitInWindow(slug, fingerprint, seconds = 20) {
  const result = await db().set(`seen:${slug}:${fingerprint}`, 1, { nx: true, ex: seconds });
  return result !== null;
}

export async function recordScan(slug) {
  const key = scanKey(slug);
  const data = (await db().get(key)) || { total: 0, byDay: {} };
  const today = dayKey();

  data.total = (data.total || 0) + 1;
  data.byDay = data.byDay || {};
  data.byDay[today] = (data.byDay[today] || 0) + 1;

  const oldest = shiftDay(today, -RETENTION_DAYS);
  for (const day of Object.keys(data.byDay)) {
    if (day < oldest) delete data.byDay[day];
  }

  await db().set(key, data);
}

export async function getScanStats(slug) {
  return (await db().get(scanKey(slug))) || { total: 0, byDay: {} };
}

export async function resetScans(slug) {
  await db().del(scanKey(slug));
}

// Totaux de scans de plusieurs cartes en une seule requête : { slug: total }
export async function getScanTotals(slugs) {
  if (slugs.length === 0) return {};
  const values = await db().mget(...slugs.map(scanKey));
  const totals = {};
  slugs.forEach((slug, index) => {
    totals[slug] = values[index]?.total || 0;
  });
  return totals;
}
