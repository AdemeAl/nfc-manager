import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";

const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "g.page",
]);

function isAllowedGoogleUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const isGoogleDomain = /^(?:www\.|maps\.|search\.)?google\.(?:[a-z]{2,3}|co\.[a-z]{2})$/.test(
      host
    );
    return url.protocol === "https:" && (ALLOWED_HOSTS.has(host) || isGoogleDomain);
  } catch {
    return false;
  }
}

function buildReviewUrl(value) {
  const url = new URL(value);

  if (url.hostname === "g.page" && url.pathname.startsWith("/r/")) {
    return url.pathname.endsWith("/review")
      ? value
      : `https://g.page${url.pathname.replace(/\/$/, "")}/review`;
  }

  if (url.hostname === "search.google.com" && url.pathname.includes("writereview")) {
    return value;
  }

  const placeIdFromQuery =
    url.searchParams.get("placeid") || url.searchParams.get("query_place_id");
  const decoded = decodeURIComponent(value);
  const placeId = placeIdFromQuery || decoded.match(/ChIJ[A-Za-z0-9_-]+/)?.[0];

  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  const cidPair = decoded.match(/0x[0-9a-f]+:0x[0-9a-f]+/i)?.[0];
  if (cidPair) {
    return `https://www.google.com/search?hl=fr#lrd=${cidPair},3,,,`;
  }

  return null;
}

export async function POST(request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { url } = await request.json();
  const originalUrl = typeof url === "string" ? url.trim() : "";

  if (!isAllowedGoogleUrl(originalUrl)) {
    return NextResponse.json(
      { error: "Colle un lien Google Maps valide commençant par https://" },
      { status: 400 }
    );
  }

  let resolvedUrl = originalUrl;

  try {
    const host = new URL(originalUrl).hostname.toLowerCase();
    if (host === "maps.app.goo.gl" || host === "goo.gl") {
      const response = await fetch(originalUrl, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      });
      resolvedUrl = response.url;
      if (!isAllowedGoogleUrl(resolvedUrl)) {
        throw new Error("Redirection Google invalide");
      }
    }

    const reviewUrl = buildReviewUrl(resolvedUrl);
    if (!reviewUrl) {
      return NextResponse.json(
        {
          error:
            "Ce lien ne contient pas l’identifiant du commerce. Dans Google Maps, ouvre la fiche puis copie l’URL complète de la barre d’adresse.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ reviewUrl });
  } catch {
    return NextResponse.json(
      { error: "Impossible de convertir ce lien Google Maps." },
      { status: 422 }
    );
  }
}
