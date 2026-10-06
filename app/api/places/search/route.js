import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/api";

// Recherche d'un commerce par son nom (Google Places, Text Search) pour construire
// directement son lien « rédiger un avis ».
export const GET = adminRoute(async (request) => {
  const query = new URL(request.url).searchParams.get("q");
  if (!query || query.trim().length < 3) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "La clé GOOGLE_PLACES_API_KEY n'est pas configurée sur le serveur." },
      { status: 500 }
    );
  }

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&language=fr&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json(
      { error: `Google Places : ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}` },
      { status: 502 }
    );
  }

  const results = (data.results || []).slice(0, 5).map((place) => ({
    name: place.name,
    address: place.formatted_address,
    placeId: place.place_id,
    reviewUrl: `https://search.google.com/local/writereview?placeid=${place.place_id}`,
  }));

  return NextResponse.json({ results });
});
