import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { Booking } from "@/models/Booking";
import { BookingAudit } from "@/models/BookingAudit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const id = (await params).id;

    const booking = await Booking.findById(id).lean();
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(booking);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  eventName: z.string().min(1).optional(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = (await params).id;
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const booking = await Booking.findById(id);
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update only the provided fields and collect changes
  const changes: { key: string; oldValue: any; newValue: any }[] = [];
  Object.keys(parsed.data).forEach(key => {
    const newVal = parsed.data[key as keyof typeof parsed.data];
    if (newVal !== undefined) {
      const oldVal = (booking as any)[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ key, oldValue: oldVal, newValue: newVal });
      }
      (booking as any)[key] = newVal;
    }
  });

    await booking.save();

  // Write audit log if there were changes
  if (changes.length > 0) {
    try {
      // Build a concise note summarizing the updates
      const formatVal = (v: any) => {
        if (v === null || typeof v === "undefined") return "—";
        if (v instanceof Date) return v.toISOString();
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
        // Fallback for objects/arrays
        try { return JSON.stringify(v); } catch { return String(v); }
      };
      const note = changes
        .map(c => `${c.key}: ${formatVal(c.oldValue)} -> ${formatVal(c.newValue)}`)
        .join("; ");

      await BookingAudit.create({
        bookingId: booking._id,
        action: "updated",
        changes,
        user: payload ? { id: payload.sub, email: payload.email, role: payload.role } : undefined,
        note,
      });
    } catch {}
  }

    return NextResponse.json({ message: "Booking updated successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


