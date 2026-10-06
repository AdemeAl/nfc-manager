import QRCode from "qrcode";
import { adminRoute, getOrigin } from "@/lib/api";

export const GET = adminRoute(async (request, { params }) => {
  const { slug } = await params;
  const pngBuffer = await QRCode.toBuffer(`${getOrigin(request)}/r/${slug}`, {
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
});
