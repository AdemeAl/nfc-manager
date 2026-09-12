// Protection simple par mot de passe (suffisant pour un usage perso/petite échelle).
// Le mot de passe est comparé à la variable d'environnement ADMIN_PASSWORD.
export function checkAdminAuth(request) {
  const provided = request.headers.get("x-admin-password");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    // Si aucun mot de passe n'est configuré, on bloque tout par sécurité.
    return false;
  }
  return provided === expected;
}
