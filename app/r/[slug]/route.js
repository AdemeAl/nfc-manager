import { NextResponse, after } from "next/server";
import { getLink, recordScan, firstVisitInWindow } from "@/lib/redis";
import { looksLikeBot, visitorFingerprint } from "@/lib/bots";
import { getOrigin } from "@/lib/api";

export const dynamic = "force-dynamic";

// Route PUBLIQUE : c'est elle que le client final ouvre en scannant le QR code
// ou en posant son téléphone sur la carte NFC.
export async function GET(request, { params }) {
  const { slug } = await params;
  const inactive = (reason) =>
    NextResponse.redirect(new URL(`/inactive?reason=${reason}`, getOrigin(request)), { status: 307 });

  const link = await getLink(slug);
  if (!link) return inactive("unknown");
  if (!link.destination) return inactive("blank");

  let destination;
  try {
    destination = new URL(link.destination);
    if (destination.protocol !== "https:" && destination.protocol !== "http:") throw new Error("protocole");
  } catch {
    return inactive("invalid");
  }

  // Le comptage se fait APRÈS l'envoi de la redirection (le client n'attend pas), mais
  // `after` garantit que Vercel laisse la fonction finir le travail avant de la couper.
  const countable = !looksLikeBot(request);
  const fingerprint = visitorFingerprint(request);
  after(async () => {
    try {
      if (countable && (await firstVisitInWindow(slug, fingerprint))) {
        await recordScan(slug);
      }
    } catch (error) {
      console.error("[scan]", error);
    }
  });

  return NextResponse.redirect(destination, { status: 307 });
}
