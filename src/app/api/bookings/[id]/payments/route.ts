import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBookingAudit, createBookingPayment, findBookingById, listBookingPayments } from "@/db/bookings";
import { isUuid } from "@/db/helpers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const bodySchema = z.object({
  type: z.enum(["received", "refund"]),
  amount: z.number().positive(),
  mode: z.enum(["cash", "online"]),
  images: z.array(z.string().regex(/^data:image\/(png|jpeg|jpg|webp);base64,/i, "Images must be base64 data URLs")).min(1),
  notes: z.string().optional(),
});

export const dynamic = "force-dynamic";

function extractBookingIdFromUrl(url: string): string | undefined {
  try {
    const { pathname } = new URL(url);
    const match = pathname.match(/\/api\/bookings\/([^/]+)\/payments/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest, context: { params?: Promise<{ id?: string }> }) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bookingId = (await context.params)?.id || extractBookingIdFromUrl(req.url);
    if (!bookingId) return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
    if (!isUuid(bookingId)) return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const booking = await findBookingById(bookingId);
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { type, amount, mode, images, notes } = parsed.data;
    const payment = await createBookingPayment({
      bookingId,
      userId: payload.sub,
      type,
      amount,
      mode,
      images,
      notes,
    });

    await createBookingAudit({
      bookingId,
      action: type === "received" ? "payment_received" : "refunded",
      changes: [],
      user: { id: payload.sub, email: payload.email, role: payload.role },
      note:
        type === "received"
          ? `Payment received: ₹${amount} via ${mode}${notes ? ` - ${notes}` : ""}`
          : `Payment refund: ₹${amount} via ${mode}${notes ? ` - ${notes}` : ""}`,
    });

    return NextResponse.json({ id: payment._id }, { status: 201 });
  } catch (err) {
    console.error("Failed to create booking payment", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, context: { params?: Promise<{ id?: string }> }) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bookingId = (await context.params)?.id || extractBookingIdFromUrl(req.url);
    if (!bookingId) return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
    const items = await listBookingPayments(bookingId);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Failed to fetch booking payments", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
