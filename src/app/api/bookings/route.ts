import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { Booking } from "@/models/Booking";
import { Service } from "@/models/Service";
import { BookingAudit } from "@/models/BookingAudit";

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
  // custom
  return Math.max(0, (item.customPrice ?? 0) - discount);
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const json = await req.json();
    console.log(JSON.stringify(json, null, 2));
    const parsed = bodySchema.safeParse(json);
    console.log(JSON.stringify(parsed, null, 2));
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { customerName, customerPhone, eventName, startAt, endAt, items, discountAmount = 0, notes, status } = parsed.data;
    if (!(startAt instanceof Date) || !(endAt instanceof Date) || isNaN(+startAt) || isNaN(+endAt) || startAt >= endAt) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    // Load services referenced, to verify allowOverlap and names
    const serviceIds = items.map((i) => i.serviceId);
    const services = await Service.find({ _id: { $in: serviceIds } }).lean();
    const serviceById = new Map(services.map((s) => [String(s._id), s]));

    // Overlap check for any service where allowOverlap = false
    const nonOverlapServiceIds = services.filter((s: any) => !s.allowOverlap).map((s: any) => String(s._id));
    if (nonOverlapServiceIds.length > 0) {
      const conflicts = await Booking.find({
        $or: [
          { startAt: { $lt: endAt }, endAt: { $gt: startAt } },
        ],
        "items.serviceId": { $in: nonOverlapServiceIds },
      }).countDocuments();
      if (conflicts > 0) {
        return NextResponse.json({ error: "Selected services are not available in this time range" }, { status: 409 });
      }
    }

    const computedItems = items.map((it) => {
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
    const total = Math.max(0, subtotal - (discountAmount ?? 0));

    console.log(JSON.stringify({
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
      status,
    }));

    // Build create document; only include status if provided so schema default applies
    const createDoc: any = {
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
    };
    if (typeof status !== "undefined") {
      createDoc.status = status;
    }

    const created = await Booking.create(createDoc);

    // Write audit log for creation with initial values as changes (oldValue null)
    try {
      const changes = [
        { key: "customerName", oldValue: null, newValue: customerName },
        { key: "customerPhone", oldValue: null, newValue: customerPhone ?? null },
        { key: "eventName", oldValue: null, newValue: eventName },
        { key: "startAt", oldValue: null, newValue: startAt },
        { key: "endAt", oldValue: null, newValue: endAt },
        { key: "subtotal", oldValue: null, newValue: subtotal },
        { key: "discountAmount", oldValue: null, newValue: discountAmount ?? 0 },
        { key: "total", oldValue: null, newValue: total },
        { key: "status", oldValue: null, newValue: typeof createDoc.status !== "undefined" ? createDoc.status : "pending" },
      ];
      await BookingAudit.create({ 
        bookingId: created._id, 
        action: "created", 
        changes, 
        user: payload ? { id: payload.sub, email: payload.email, role: payload.role } : undefined,
        note: "Booking is created"
      });
    } catch {}

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

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

    const filter: any = {};
    if (q) {
      filter.$or = [
        { customerName: { $regex: q, $options: "i" } },
        { customerPhone: { $regex: q, $options: "i" } },
        { eventName: { $regex: q, $options: "i" } },
      ];
    }
    if (status) {
      filter.status = status;
    }

    // Build sort object
    const sortObj: any = {};
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    sortObj[sortBy] = sortDirection;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Booking.aggregate([
        { $match: filter },
        { $sort: sortObj },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "payments",
            localField: "_id",
            foreignField: "bookingId",
            as: "_payments",
          },
        },
        {
          $addFields: {
            _receivedSum: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$_payments",
                      as: "p",
                      cond: { $eq: ["$$p.type", "received"] },
                    },
                  },
                  as: "p",
                  in: { $ifNull: ["$$p.amount", 0] },
                },
              },
            },
            _refundSum: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$_payments",
                      as: "p",
                      cond: { $eq: ["$$p.type", "refund"] },
                    },
                  },
                  as: "p",
                  in: { $ifNull: ["$$p.amount", 0] },
                },
              },
            },
          },
        },
        {
          $addFields: {
            totalPaid: {
              $subtract: [
                "$total",
                { $subtract: ["$_receivedSum", "$_refundSum"] },
              ],
            },
          },
        },
        { $project: { _payments: 0, _receivedSum: 0, _refundSum: 0 } },
      ]).exec(),
      Booking.countDocuments(filter),
    ]);

    return NextResponse.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


