import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  countBookingConflicts,
  createBooking,
  createBookingAudit,
  listBookings,
} from "@/db/bookings";
import { findActiveServicesByIds } from "@/db/services";
import { isUuid } from "@/db/helpers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import type { BookingItem } from "@/db/types";

const bookingItemSchema = z.object({
  serviceId: z.string(),
  variantName: z.string().optional(),
  priceType: z.enum(["per_unit", "fixed", "custom", "per_hour"]),
  unitPrice: z.number().min(0).optional(),
  units: z.number().min(0).optional(),
  customPrice: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
});

const bodySchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  eventName: z.string().min(1),
  startAt: z.string().transform((s) => new Date(s)),
  endAt: z.string().transform((s) => new Date(s)),
  items: z.array(bookingItemSchema).min(1),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
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

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { customerName, customerPhone, eventName, startAt, endAt, items, discountAmount = 0, notes, status } = parsed.data;
    if (!(startAt instanceof Date) || !(endAt instanceof Date) || isNaN(+startAt) || isNaN(+endAt) || startAt >= endAt) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    if (items.some((item) => !isUuid(item.serviceId))) {
      return NextResponse.json({ error: "Invalid service id" }, { status: 400 });
    }

    const services = await findActiveServicesByIds(items.map((item) => item.serviceId));
    const serviceById = new Map(services.map((service) => [service._id, service]));
    const nonOverlapServiceIds = services.filter((service) => !service.allowOverlap).map((service) => service._id);
    if (nonOverlapServiceIds.length > 0) {
      const conflicts = await countBookingConflicts({ startAt, endAt, serviceIds: nonOverlapServiceIds });
      if (conflicts > 0) {
        return NextResponse.json({ error: "Selected services are not available in this time range" }, { status: 409 });
      }
    }

    const computedItems: BookingItem[] = items.map((item) => {
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

    const subtotal = computedItems.reduce((sum, item) => sum + item.total, 0);
    const total = Math.max(0, subtotal - (discountAmount ?? 0));
    const bookingStatus = status ?? "pending";

    const created = await createBooking({
      customerName,
      customerPhone,
      eventName,
      startAt,
      endAt,
      items: computedItems,
      subtotal,
      discountAmount,
      total,
      notes,
      status: bookingStatus,
    });

    try {
      await createBookingAudit({
        bookingId: created._id,
        action: "created",
        changes: [
          { key: "customerName", oldValue: null, newValue: customerName },
          { key: "customerPhone", oldValue: null, newValue: customerPhone ?? null },
          { key: "eventName", oldValue: null, newValue: eventName },
          { key: "startAt", oldValue: null, newValue: startAt },
          { key: "endAt", oldValue: null, newValue: endAt },
          { key: "subtotal", oldValue: null, newValue: subtotal },
          { key: "discountAmount", oldValue: null, newValue: discountAmount ?? 0 },
          { key: "total", oldValue: null, newValue: total },
          { key: "status", oldValue: null, newValue: bookingStatus },
        ],
        user: { id: payload.sub, email: payload.email, role: payload.role },
        note: "Booking is created",
      });
    } catch (auditErr) {
      console.error("Failed to write booking audit", auditErr);
    }

    return NextResponse.json({ id: created._id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const q = url.searchParams.get("q")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const sortBy = url.searchParams.get("sortBy") || "startAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const showDeleted = url.searchParams.get("deleted") === "true" && payload.role === "admin";
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    const { items, total } = await listBookings({
      page,
      limit,
      q: q || undefined,
      status: status || undefined,
      sortBy,
      sortOrder,
      showDeleted,
      startDate,
      endDate,
    });

    return NextResponse.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Failed to fetch bookings", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
