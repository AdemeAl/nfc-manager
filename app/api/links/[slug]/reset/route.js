import { NextResponse } from "next/server";
import { getLink, releaseLink, resetScans } from "@/lib/redis";
import { adminRoute } from "@/lib/api";

// mode "scans"   : remet uniquement le compteur de scans à zéro (ex. après les tests de démo)
// mode "release" : remet la carte à l'état vierge (nouveau jeton + scans à zéro) pour la revendre
export const POST = adminRoute(async (request, { params }) => {
  const { slug } = await params;
  const { mode } = await request.json();

  const link = await getLink(slug);
  if (!link) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (mode === "scans") {
    await resetScans(slug);
  } else if (mode === "release") {
    await releaseLink(slug);
  } else {
    return NextResponse.json({ error: "mode invalide" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
});
