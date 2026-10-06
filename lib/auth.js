import { createHash, timingSafeEqual } from "node:crypto";

function digest(value) {
  return createHash("sha256").update(String(value)).digest();
}

// Comparaison à temps constant (évite de deviner un secret caractère par caractère).
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  return timingSafeEqual(digest(a), digest(b));
}

export function adminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

// Protection simple par mot de passe (suffisant pour un usage perso / petite échelle).
export function checkAdminAuth(request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false; // rien n'est configuré : on bloque tout par sécurité
  return safeEqual(request.headers.get("x-admin-password") || "", expected);
}
