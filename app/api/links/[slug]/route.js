import { NextResponse } from "next/server";
import { upsertLink, deleteLink, getLink } from "@/lib/redis";
import { adminRoute } from "@/lib/api";

export const PUT = adminRoute(async (request, { params }) => {
  const { slug } = await params;
  const { destination, businessName } = await request.json();

  if (!destination) {
    return NextResponse.json(
      { error: "Colle le lien de destination, ou utilise « Libérer la carte » pour la vider." },
      { status: 400 }
    );
  }
  try {
    const url = new URL(destination);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocole");
  } catch {
    return NextResponse.json({ error: "Le lien de destination doit commencer par https://" }, { status: 400 });
  }

  const link = await upsertLink(slug, { destination, businessName });
  return NextResponse.json({ slug, link });
});

export const DELETE = adminRoute(async (request, { params }) => {
  const { slug } = await params;
  await deleteLink(slug);
  return NextResponse.json({ success: true });
});

export const GET = adminRoute(async (request, { params }) => {
  const { slug } = await params;
  const link = await getLink(slug);
  if (!link) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ slug, link });
});
