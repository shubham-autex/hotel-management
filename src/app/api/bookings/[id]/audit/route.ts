import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { BookingAudit, type IBookingAudit } from "@/models/BookingAudit";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = (await params).id;
    const logs = await BookingAudit.find({ bookingId: id }).sort({ createdAt: -1 }).lean<IBookingAudit[]>();
    return NextResponse.json({ items: logs });
  } catch (err) {
    console.error("Failed to fetch booking audits", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


