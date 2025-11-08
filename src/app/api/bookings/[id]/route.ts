import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { Booking } from "@/models/Booking";
import { BookingAudit } from "@/models/BookingAudit";
import { Service } from "@/models/Service";

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

const bookingItemSchema = z.object({
  serviceId: z.string(),
  variantName: z.string().optional(),
  priceType: z.enum(["per_unit", "fixed", "custom", "per_hour"]),
  unitPrice: z.number().min(0).optional(),
  units: z.number().min(0).optional(),
  customPrice: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
});

function calculateItemTotal(item: z.infer<typeof bookingItemSchema>): number {
  const discount = item.discountAmount ?? 0;
  if (item.priceType === "fixed") {
    const price = item.unitPrice ?? 0;
    return Math.max(0, price - discount);
  }
  if (item.priceType === "per_unit" || item.priceType === "per_hour") {
    const price = (item.unitPrice ?? 0) * (item.units ?? 0);
    return Math.max(0, price - discount);
  }
  // custom
  return Math.max(0, (item.customPrice ?? 0) - discount);
}

const patchSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  eventName: z.string().min(1).optional(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  startAt: z.string().transform((s) => new Date(s)).optional(),
  endAt: z.string().transform((s) => new Date(s)).optional(),
  items: z.array(bookingItemSchema).min(1).optional(),
  discountAmount: z.number().min(0).optional(),
  deletedAt: z.null().optional(),
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

    // Handle items update - need to recalculate totals
    if (parsed.data.items) {
      const serviceIds = parsed.data.items.map((i) => i.serviceId);
      const services = await Service.find({ _id: { $in: serviceIds }, deletedAt: null }).lean();
      if (services.length !== serviceIds.length) {
        return NextResponse.json({ error: "One or more services not found or deleted" }, { status: 404 });
      }
      const serviceById = new Map(services.map((s) => [String(s._id), s]));

      // Overlap check for any service where allowOverlap = false
      const nonOverlapServiceIds = services.filter((s: any) => !s.allowOverlap && !s.deletedAt).map((s: any) => String(s._id));
      if (nonOverlapServiceIds.length > 0) {
        const startAt = parsed.data.startAt || booking.startAt;
        const endAt = parsed.data.endAt || booking.endAt;
        const conflicts = await Booking.find({
          _id: { $ne: booking._id }, // Exclude current booking
          $or: [
            { startAt: { $lt: endAt }, endAt: { $gt: startAt } },
          ],
          "items.serviceId": { $in: nonOverlapServiceIds },
          deletedAt: null,
        }).countDocuments();
        if (conflicts > 0) {
          return NextResponse.json({ error: "Selected services are not available in this time range" }, { status: 409 });
        }
      }

      const computedItems = parsed.data.items.map((it) => {
        const svc = serviceById.get(it.serviceId);
        const total = calculateItemTotal(it);
        return {
          serviceId: it.serviceId,
          serviceName: svc?.name ?? "Unknown",
          allowOverlap: !!svc?.allowOverlap,
          variantName: it.variantName,
          priceType: it.priceType,
          unitPrice: it.unitPrice,
          units: it.units,
          customPrice: it.customPrice,
          discountAmount: it.discountAmount ?? 0,
          total,
        };
      });

      const subtotal = computedItems.reduce((sum, it) => sum + it.total, 0);
      const discountAmount = parsed.data.discountAmount !== undefined ? parsed.data.discountAmount : booking.discountAmount;
      const total = Math.max(0, subtotal - (discountAmount ?? 0));

      booking.items = computedItems as any;
      booking.subtotal = subtotal;
      booking.total = total;
    }

    // Handle date updates - need to check overlaps if dates change
    if (parsed.data.startAt || parsed.data.endAt) {
      const newStartAt = parsed.data.startAt || booking.startAt;
      const newEndAt = parsed.data.endAt || booking.endAt;
      
      if (!(newStartAt instanceof Date) || !(newEndAt instanceof Date) || isNaN(+newStartAt) || isNaN(+newEndAt) || newStartAt >= newEndAt) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
      }

      // Check overlaps for non-overlap services
      const nonOverlapServiceIds = booking.items.filter((it: any) => !it.allowOverlap).map((it: any) => String(it.serviceId));
      if (nonOverlapServiceIds.length > 0) {
        const conflicts = await Booking.find({
          _id: { $ne: booking._id },
          $or: [
            { startAt: { $lt: newEndAt }, endAt: { $gt: newStartAt } },
          ],
          "items.serviceId": { $in: nonOverlapServiceIds },
          deletedAt: null,
        }).countDocuments();
        if (conflicts > 0) {
          return NextResponse.json({ error: "Selected services are not available in this time range" }, { status: 409 });
        }
      }

      booking.startAt = newStartAt;
      booking.endAt = newEndAt;
    }

    // Handle discount update - need to recalculate total
    if (parsed.data.discountAmount !== undefined && !parsed.data.items) {
      const subtotal = booking.subtotal;
      const total = Math.max(0, subtotal - (parsed.data.discountAmount ?? 0));
      booking.discountAmount = parsed.data.discountAmount;
      booking.total = total;
    }

    // Update only the provided fields and collect changes
    const changes: { key: string; oldValue: any; newValue: any }[] = [];
    
    // Handle restore (deletedAt: null)
    if (parsed.data.deletedAt === null) {
      const oldDeletedAt = booking.deletedAt;
      booking.deletedAt = undefined;
      changes.push({ key: 'deletedAt', oldValue: oldDeletedAt, newValue: null });
    }
    const simpleFields: (keyof typeof parsed.data)[] = ['status', 'eventName', 'customerName', 'customerPhone', 'notes'];
    simpleFields.forEach(key => {
      const newVal = parsed.data[key];
      if (newVal !== undefined) {
        const oldVal = (booking as any)[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push({ key: key as string, oldValue: oldVal, newValue: newVal });
        }
        (booking as any)[key] = newVal;
      }
    });

    // Track changes for complex fields
    const oldSubtotal = booking.subtotal;
    const oldTotal = booking.total;
    const oldDiscountAmount = booking.discountAmount;
    
    if (parsed.data.items) {
      changes.push({ key: 'items', oldValue: booking.items, newValue: parsed.data.items });
    }
    if (parsed.data.startAt) {
      changes.push({ key: 'startAt', oldValue: booking.startAt, newValue: parsed.data.startAt });
    }
    if (parsed.data.endAt) {
      changes.push({ key: 'endAt', oldValue: booking.endAt, newValue: parsed.data.endAt });
    }
    if (parsed.data.discountAmount !== undefined && parsed.data.discountAmount !== oldDiscountAmount) {
      changes.push({ key: 'discountAmount', oldValue: oldDiscountAmount, newValue: parsed.data.discountAmount });
    }
    if (parsed.data.items || parsed.data.discountAmount !== undefined) {
      if (booking.subtotal !== oldSubtotal) {
        changes.push({ key: 'subtotal', oldValue: oldSubtotal, newValue: booking.subtotal });
      }
      if (booking.total !== oldTotal) {
        changes.push({ key: 'total', oldValue: oldTotal, newValue: booking.total });
      }
    }

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const id = (await params).id;
    const booking = await Booking.findById(id);
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Soft delete
    booking.deletedAt = new Date();
    await booking.save();

    // Write audit log
    try {
      await BookingAudit.create({
        bookingId: booking._id,
        action: "deleted",
        changes: [{ key: "deletedAt", oldValue: null, newValue: booking.deletedAt }],
        user: { id: payload.sub, email: payload.email, role: payload.role },
        note: "Booking was soft deleted",
      });
    } catch {}

    return NextResponse.json({ message: "Booking deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


