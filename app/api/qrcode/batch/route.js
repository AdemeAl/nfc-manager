import QRCode from "qrcode";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { adminRoute, getOrigin } from "@/lib/api";

export const POST = adminRoute(async (request) => {
  const { slugs } = await request.json();
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return NextResponse.json({ error: "Liste de cartes vide" }, { status: 400 });
  }

  const origin = getOrigin(request);
  const zip = new JSZip();

  for (const slug of slugs) {
    const png = await QRCode.toBuffer(`${origin}/r/${slug}`, { type: "png", width: 600, margin: 2 });
    zip.file(`qr-${slug}.png`, png);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="qr-codes.zip"`,
    },
  });
});
