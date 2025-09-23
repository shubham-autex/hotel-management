import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { BookingAudit } from "@/models/BookingAudit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = (await params).id;
    const logs = await BookingAudit.find({ bookingId: id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ items: logs });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


