import QRCode from "qrcode";
import JSZip from "jszip";
import { checkAdminAuth } from "@/lib/auth";

export async function POST(request) {
  if (!checkAdminAuth(request)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const { slugs } = await request.json();
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return new Response("Liste de slugs vide", { status: 400 });
  }

  const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
  const zip = new JSZip();

  for (const slug of slugs) {
    const targetUrl = `${origin}/r/${slug}`;
    const pngBuffer = await QRCode.toBuffer(targetUrl, { type: "png", width: 600, margin: 2 });
    zip.file(`qr-${slug}.png`, pngBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="qr-codes.zip"`,
    },
  });
}
