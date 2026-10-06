import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAllLinks, getScanTotals, upsertLink } from "@/lib/redis";
import { adminRoute } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  const links = await getAllLinks();
  const scans = await getScanTotals(Object.keys(links));
  return NextResponse.json({ links, scans });
});

export const POST = adminRoute(async (request) => {
  const { destination, businessName, customSlug } = await request.json();

  const cleanSlug = (customSlug || "").trim().replace(/[^a-zA-Z0-9-_]/g, "-");
  const slug = cleanSlug || nanoid(6);

  const existing = (await getAllLinks())[slug];
  if (existing) {
    return NextResponse.json({ error: `L'identifiant « ${slug} » existe déjà.` }, { status: 409 });
  }

  const link = await upsertLink(slug, { destination: destination || "", businessName: businessName || "" });
  return NextResponse.json({ slug, link });
});
