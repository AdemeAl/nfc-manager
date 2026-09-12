import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";

// Utilise l'API Google Places (Text Search) pour trouver un commerce par son nom
// et construire directement son lien "rédiger un avis Google".
export async function GET(request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY non configurée sur le serveur." },
      { status: 500 }
    );
  }

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json(
      { error: `Erreur Google Places: ${data.status} ${data.error_message || ""}` },
      { status: 500 }
    );
  }

  const results = (data.results || []).slice(0, 5).map((place) => ({
    name: place.name,
    address: place.formatted_address,
    placeId: place.place_id,
    reviewUrl: `https://search.google.com/local/writereview?placeid=${place.place_id}`,
  }));

  return NextResponse.json({ results });
}
