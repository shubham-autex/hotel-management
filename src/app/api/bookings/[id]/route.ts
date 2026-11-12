import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { countBookingConflicts, createBookingAudit, findBookingById, updateBooking } from "@/db/bookings";
import { findActiveServicesByIds } from "@/db/services";
import { isUuid } from "@/db/helpers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import type { AuditChange, BookingItem } from "@/db/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const booking = await findBookingById(id);
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
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = (await params).id;
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const data: PatchPayload = parsed.data;

    const booking = await findBookingById(id);
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const initialStartAt = booking.startAt;
    const initialEndAt = booking.endAt;
    const initialSubtotal = booking.subtotal;
    const initialTotal = booking.total;
    const initialDiscountAmount = booking.discountAmount ?? 0;
    const initialDeletedAt = booking.deletedAt ?? null;
    let previousItemsSnapshot: BookingItem[] | null = null;

    const next = {
      ...booking,
      items: booking.items.map((item) => ({ ...item })),
      discountAmount: booking.discountAmount ?? 0,
    };

    if (data.items) {
      if (data.items.some((item) => !isUuid(item.serviceId))) {
        return NextResponse.json({ error: "Invalid service id" }, { status: 400 });
      }
      const services = await findActiveServicesByIds(data.items.map((item) => item.serviceId));
      const uniqueIds = [...new Set(data.items.map((item) => item.serviceId))];
      if (services.length !== uniqueIds.length) {
        return NextResponse.json({ error: "One or more services not found or deleted" }, { status: 404 });
      }
      const serviceById = new Map(services.map((service) => [service._id, service]));
      const nonOverlapServiceIds = services.filter((service) => !service.allowOverlap).map((service) => service._id);
      if (nonOverlapServiceIds.length > 0) {
        const startAt = data.startAt ?? booking.startAt;
        const endAt = data.endAt ?? booking.endAt;
        const conflicts = await countBookingConflicts({
          startAt,
          endAt,
          serviceIds: nonOverlapServiceIds,
          excludeId: booking._id,
        });
        if (conflicts > 0) {
          return NextResponse.json({ error: "Selected services are not available in this time range" }, { status: 409 });
        }
      }

      previousItemsSnapshot = booking.items.map((item) => ({ ...item }));
      next.items = data.items.map((item) => {
        const svc = serviceById.get(item.serviceId);
        return {
          serviceId: item.serviceId,
          serviceName: svc?.name ?? "Unknown",
          allowOverlap: !!svc?.allowOverlap,
          variantName: item.variantName,
          priceType: item.priceType,
          unitPrice: item.unitPrice,
          units: item.units,
          customPrice: item.customPrice,
          discountAmount: item.discountAmount ?? 0,
          total: calculateItemTotal(item),
        };
      });
      next.subtotal = next.items.reduce((sum, item) => sum + item.total, 0);
      const discountValue = data.discountAmount !== undefined ? data.discountAmount : (booking.discountAmount ?? 0);
      next.total = Math.max(0, next.subtotal - discountValue);
      if (data.discountAmount !== undefined) next.discountAmount = data.discountAmount;
    }

    if (data.startAt || data.endAt) {
      const newStartAt = data.startAt || next.startAt;
      const newEndAt = data.endAt || next.endAt;
      if (!(newStartAt instanceof Date) || !(newEndAt instanceof Date) || isNaN(+newStartAt) || isNaN(+newEndAt) || newStartAt >= newEndAt) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
      }

      const nonOverlapServiceIds = next.items.filter((item) => !item.allowOverlap).map((item) => item.serviceId);
      if (nonOverlapServiceIds.length > 0) {
        const conflicts = await countBookingConflicts({
          startAt: newStartAt,
          endAt: newEndAt,
          serviceIds: nonOverlapServiceIds,
          excludeId: booking._id,
        });
        if (conflicts > 0) {
          return NextResponse.json({ error: "Selected services are not available in this time range" }, { status: 409 });
        }
      }

      next.startAt = newStartAt;
      next.endAt = newEndAt;
    }

    if (data.discountAmount !== undefined && !data.items) {
      next.discountAmount = data.discountAmount;
      next.total = Math.max(0, next.subtotal - (data.discountAmount ?? 0));
    }

    const changes: AuditChange[] = [];
    if (data.deletedAt === null && initialDeletedAt !== null) {
      next.deletedAt = null;
      changes.push({ key: "deletedAt", oldValue: initialDeletedAt, newValue: null });
    }

    const simpleFields = ["status", "eventName", "customerName", "customerPhone", "notes"] as const;
    simpleFields.forEach((key) => {
      const newVal = data[key];
      if (typeof newVal === "undefined") return;
      const oldVal = next[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ key, oldValue: oldVal, newValue: newVal });
      }
      next[key] = newVal;
    });

    if (previousItemsSnapshot) {
      changes.push({ key: "items", oldValue: previousItemsSnapshot, newValue: next.items });
    }
    if (data.startAt && next.startAt.getTime() !== initialStartAt.getTime()) {
      changes.push({ key: "startAt", oldValue: initialStartAt, newValue: next.startAt });
    }
    if (data.endAt && next.endAt.getTime() !== initialEndAt.getTime()) {
      changes.push({ key: "endAt", oldValue: initialEndAt, newValue: next.endAt });
    }
    if (data.discountAmount !== undefined && next.discountAmount !== initialDiscountAmount) {
      changes.push({ key: "discountAmount", oldValue: initialDiscountAmount, newValue: next.discountAmount });
    }
    if (next.subtotal !== initialSubtotal) {
      changes.push({ key: "subtotal", oldValue: initialSubtotal, newValue: next.subtotal });
    }
    if (next.total !== initialTotal) {
      changes.push({ key: "total", oldValue: initialTotal, newValue: next.total });
    }

    await updateBooking(id, {
      customerName: next.customerName,
      customerPhone: next.customerPhone,
      eventName: next.eventName,
      startAt: next.startAt,
      endAt: next.endAt,
      status: next.status,
      items: next.items,
      subtotal: next.subtotal,
      discountAmount: next.discountAmount,
      total: next.total,
      notes: next.notes,
      deletedAt: next.deletedAt,
    });

    if (changes.length > 0) {
      try {
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
        const note = changes.map((change) => `${change.key}: ${formatVal(change.oldValue)} -> ${formatVal(change.newValue)}`).join("; ");
        await createBookingAudit({
          bookingId: booking._id,
          action: "updated",
          changes,
          user: { id: payload.sub, email: payload.email, role: payload.role },
          note,
        });
      } catch (auditErr) {
        console.error("Failed to write booking audit", auditErr);
      }
    }

    return NextResponse.json({ message: "Booking updated successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const id = (await params).id;
    const booking = await findBookingById(id);
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const deletedAt = new Date();
    await updateBooking(id, { deletedAt });

    try {
      await createBookingAudit({
        bookingId: booking._id,
        action: "deleted",
        changes: [{ key: "deletedAt", oldValue: null, newValue: deletedAt }],
        user: { id: payload.sub, email: payload.email, role: payload.role },
        note: "Booking was soft deleted",
      });
    } catch (auditErr) {
      console.error("Failed to write booking audit", auditErr);
    }

    return NextResponse.json({ message: "Booking deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
