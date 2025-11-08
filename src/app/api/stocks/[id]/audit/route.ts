import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { StockAudit } from "@/models/StockAudit";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const audits = await StockAudit.find({ stockId: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ items: audits });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

