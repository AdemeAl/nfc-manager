import { NextResponse } from "next/server";
import { getLink, getScanStats } from "@/lib/redis";

export async function GET(request, { params }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  const link = await getLink(slug);
  if (!link) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (!key || key !== link.clientToken) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 401 });
  }

  const stats = await getScanStats(slug);
  return NextResponse.json({
    businessName: link.businessName,
    total: stats.total || 0,
    byDay: stats.byDay || {},
  });
}
