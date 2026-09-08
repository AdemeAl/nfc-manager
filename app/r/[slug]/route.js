import { NextResponse } from "next/server";
import { getLink } from "@/lib/redis";

// Cette route est PUBLIQUE (pas de mot de passe) : c'est elle qui est scannée
// par le client final via le QR code ou tapée via le NFC.
export async function GET(request, { params }) {
  const { slug } = params;
  const link = await getLink(slug);

  if (!link || !link.destination) {
    // Aucune destination configurée pour ce slug -> page d'attente
    return new NextResponse(
      `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2>Ce lien n'est pas encore configuré.</h2>
        <p>Revenez bientôt !</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  return NextResponse.redirect(link.destination, { status: 307 });
}
