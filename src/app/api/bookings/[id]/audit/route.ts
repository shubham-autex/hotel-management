import { NextRequest, NextResponse } from "next/server";
import { listBookingAudits } from "@/db/bookings";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = (await params).id;
    const items = await listBookingAudits(id);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Failed to fetch booking audits", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
