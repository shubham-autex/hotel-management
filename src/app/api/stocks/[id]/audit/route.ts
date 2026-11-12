import { NextRequest, NextResponse } from "next/server";
import { listStockAudits } from "@/db/stocks";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const items = await listStockAudits(id, Number.isFinite(limit) ? limit : 50);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Failed to fetch stock audits", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
