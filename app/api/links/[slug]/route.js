import { NextResponse } from "next/server";
import { upsertLink, deleteLink, getLink } from "@/lib/redis";
import { checkAdminAuth } from "@/lib/auth";

export async function PUT(request, { params }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { slug } = params;
  const body = await request.json();
  const { destination, businessName } = body;

  if (!destination) {
    return NextResponse.json({ error: "destination requise" }, { status: 400 });
  }

  const link = await upsertLink(slug, { destination, businessName });
  return NextResponse.json({ slug, link });
}

export async function DELETE(request, { params }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { slug } = params;
  await deleteLink(slug);
  return NextResponse.json({ success: true });
}

export async function GET(request, { params }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { slug } = params;
  const link = await getLink(slug);
  if (!link) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  return NextResponse.json({ slug, link });
}
