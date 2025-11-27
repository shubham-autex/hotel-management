import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FilterQuery, Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { Booking, type IBooking, type IBookingItem } from "@/models/Booking";
import { BookingAudit, type IAuditChange } from "@/models/BookingAudit";
import { Service, type IService } from "@/models/Service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const id = (await params).id;

    const booking = await Booking.findById(id).lean();
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(booking);
  } catch (err) {
    console.error("Failed to fetch booking", err);
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

type PatchPayload = z.infer<typeof patchSchema>;

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
    const data: PatchPayload = parsed.data;

    const booking = await Booking.findById(id);
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const initialStartAt = booking.startAt;
    const initialEndAt = booking.endAt;
    const initialSubtotal = booking.subtotal;
    const initialTotal = booking.total;
    const initialDiscountAmount = booking.discountAmount ?? 0;
    const initialDeletedAt = booking.deletedAt ?? null;
    let previousItemsSnapshot: IBookingItem[] | null = null;

    // Handle items update - need to recalculate totals
    if (data.items) {
      const serviceObjectIds = data.items.map((item) => new Types.ObjectId(item.serviceId));
      const services = await Service.find({ _id: { $in: serviceObjectIds }, deletedAt: null }).lean<IService[]>();
      if (services.length !== serviceObjectIds.length) {
        return NextResponse.json({ error: "One or more services not found or deleted" }, { status: 404 });
      }
      const serviceById = new Map(services.map((s: any) => [s._id.toString(), s]));

      // Overlap check for any service where allowOverlap = false
      const nonOverlapServiceIds = services.filter((s) => !s.allowOverlap && !s.deletedAt).map((s) => s._id);
      if (nonOverlapServiceIds.length > 0) {
        const startAt = data.startAt ?? booking.startAt;
        const endAt = data.endAt ?? booking.endAt;
        const conflictFilter: FilterQuery<IBooking> = {
          _id: { $ne: booking._id }, // Exclude current booking
          $or: [
            { startAt: { $lt: endAt }, endAt: { $gt: startAt } },
          ],
          "items.serviceId": { $in: nonOverlapServiceIds },
          deletedAt: null,
        };
        const conflicts = await Booking.find(conflictFilter).countDocuments();
        if (conflicts > 0) {
          return NextResponse.json({ error: "Selected services are not available in this time range" }, { status: 409 });
        }
      }

      previousItemsSnapshot = booking.items.map<IBookingItem>((item) => {
        const docLike = item as unknown as { toObject?: () => IBookingItem };
        if (typeof docLike.toObject === "function") {
          return docLike.toObject();
        }
        return { ...item } as IBookingItem;
      });

      const computedItems: IBookingItem[] = data.items.map((item) => {
        const svc = serviceById.get(item.serviceId);
        const total = calculateItemTotal(item);
        return {
          serviceId: new Types.ObjectId(item.serviceId),
          serviceName: svc?.name ?? "Unknown",
          allowOverlap: !!svc?.allowOverlap,
          variantName: item.variantName,
          priceType: item.priceType,
          unitPrice: item.unitPrice,
          units: item.units,
          customPrice: item.customPrice,
          discountAmount: item.discountAmount ?? 0,
          total,
        };
      });

      const subtotal = computedItems.reduce((sum, it) => sum + it.total, 0);
      const discountValue = data.discountAmount !== undefined ? data.discountAmount : (booking.discountAmount ?? 0);
      const total = Math.max(0, subtotal - discountValue);

      booking.items = computedItems;
      booking.subtotal = subtotal;
      booking.total = total;
      if (data.discountAmount !== undefined) {
        booking.discountAmount = data.discountAmount;
      }
    }

    // Handle date updates - need to check overlaps if dates change
    if (data.startAt || data.endAt) {
      const newStartAt = data.startAt || booking.startAt;
      const newEndAt = data.endAt || booking.endAt;
      
      if (!(newStartAt instanceof Date) || !(newEndAt instanceof Date) || isNaN(+newStartAt) || isNaN(+newEndAt) || newStartAt >= newEndAt) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
      }

      // Check overlaps for non-overlap services
      const nonOverlapServiceIds = booking.items
        .filter((item) => !item.allowOverlap)
        .map((item) => item.serviceId);
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
    if (data.discountAmount !== undefined && !data.items) {
      const subtotal = booking.subtotal;
      const total = Math.max(0, subtotal - (data.discountAmount ?? 0));
      booking.discountAmount = data.discountAmount;
      booking.total = total;
    }

    // Update only the provided fields and collect changes
    const changes: IAuditChange[] = [];
    
    // Handle restore (deletedAt: null)
    if (data.deletedAt === null && initialDeletedAt !== null) {
      booking.deletedAt = undefined;
      changes.push({ key: "deletedAt", oldValue: initialDeletedAt, newValue: null });
    }

    const simpleFields: Array<"status" | "eventName" | "customerName" | "customerPhone" | "notes"> = [
      "status",
      "eventName",
      "customerName",
      "customerPhone",
      "notes",
    ];
    simpleFields.forEach((key) => {
      const newVal = data[key];
      if (typeof newVal === "undefined") return;
      const oldVal = booking[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ key, oldValue: oldVal, newValue: newVal });
      }
      booking[key] = newVal as any;
    });

    // Track changes for complex fields
    if (previousItemsSnapshot) {
      changes.push({ key: "items", oldValue: previousItemsSnapshot, newValue: booking.items });
    }
    if (data.startAt && booking.startAt.getTime() !== initialStartAt.getTime()) {
      changes.push({ key: "startAt", oldValue: initialStartAt, newValue: booking.startAt });
    }
    if (data.endAt && booking.endAt.getTime() !== initialEndAt.getTime()) {
      changes.push({ key: "endAt", oldValue: initialEndAt, newValue: booking.endAt });
    }
    if (data.discountAmount !== undefined && booking.discountAmount !== initialDiscountAmount) {
      changes.push({ key: "discountAmount", oldValue: initialDiscountAmount, newValue: booking.discountAmount });
    }
    if (booking.subtotal !== initialSubtotal) {
      changes.push({ key: "subtotal", oldValue: initialSubtotal, newValue: booking.subtotal });
    }
    if (booking.total !== initialTotal) {
      changes.push({ key: "total", oldValue: initialTotal, newValue: booking.total });
    }

    await booking.save();

  // Write audit log if there were changes
  if (changes.length > 0) {
    try {
      // Build a concise note summarizing the updates
      const formatVal = (value: unknown): string => {
        if (value === null || typeof value === "undefined") return "—";
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
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


