import QRCode from "qrcode";
import { checkAdminAuth } from "@/lib/auth";

export async function GET(request, { params }) {
  if (!checkAdminAuth(request)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const { slug } = params;

  // On récupère l'URL de base depuis l'en-tête (fonctionne en local et sur Vercel)
  const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
  const targetUrl = `${origin}/r/${slug}`;

  const pngBuffer = await QRCode.toBuffer(targetUrl, {
    type: "png",
    width: 600,
    margin: 2,
  });

  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${slug}.png"`,
    },
  });
}
