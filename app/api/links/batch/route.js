import { NextResponse } from "next/server";
import { createBatch } from "@/lib/redis";
import { adminRoute } from "@/lib/api";

export const POST = adminRoute(async (request) => {
  const { count, prefix } = await request.json();

  const n = Math.min(Math.max(parseInt(count, 10) || 0, 1), 200); // 200 cartes maximum d'un coup
  const cleanPrefix = (prefix || "carte").trim().replace(/[^a-zA-Z0-9-_]/g, "") || "carte";

  const created = await createBatch({ count: n, prefix: cleanPrefix });
  return NextResponse.json({ created });
});
