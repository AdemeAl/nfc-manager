import { NextResponse } from "next/server";
import { getAllLinks, upsertLink } from "@/lib/redis";
import { checkAdminAuth } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function GET(request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const links = await getAllLinks();
  return NextResponse.json({ links });
}

export async function POST(request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await request.json();
  const { destination, businessName, customSlug } = body;

  const slug = customSlug?.trim() || nanoid(6);
  const link = await upsertLink(slug, { destination: destination || "", businessName });

  return NextResponse.json({ slug, link });
}
