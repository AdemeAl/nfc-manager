import { NextResponse } from "next/server";
import { upsertLink } from "@/lib/redis";
import { checkAdminAuth } from "@/lib/auth";

export async function POST(request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await request.json();
  const { count, prefix } = body;

  const n = Math.min(Math.max(parseInt(count, 10) || 0, 1), 200); // sécurité: max 200 d'un coup
  const cleanPrefix = (prefix || "carte").trim().replace(/[^a-zA-Z0-9-_]/g, "") || "carte";

  const created = [];
  for (let i = 1; i <= n; i++) {
    const slug = `${cleanPrefix}-${i}`;
    const link = await upsertLink(slug, { destination: "", businessName: "" });
    created.push({ slug, link });
  }

  return NextResponse.json({ created });
}
