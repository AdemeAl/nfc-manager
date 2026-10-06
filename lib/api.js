import { NextResponse } from "next/server";
import { checkAdminAuth, adminPasswordConfigured } from "@/lib/auth";

// Enveloppe commune des routes admin : authentification + erreurs lisibles.
// Sans ça, une base mal connectée donne juste "Erreur de connexion" côté écran.
export function adminRoute(handler) {
  return async (request, context) => {
    if (!adminPasswordConfigured()) {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD n'est pas défini dans les variables d'environnement du serveur." },
        { status: 500 }
      );
    }
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    try {
      return await handler(request, context);
    } catch (error) {
      console.error("[admin api]", error);
      return NextResponse.json({ error: error?.message || "Erreur serveur" }, { status: 500 });
    }
  };
}

// URL publique du site, derrière le proxy de Vercel comme en local.
export function getOrigin(request) {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}`;
}
