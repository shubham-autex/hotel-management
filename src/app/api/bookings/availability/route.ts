import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { Service } from "@/models/Service";
import { Booking } from "@/models/Booking";

const querySchema = z.object({
  startAt: z.string().transform((s) => new Date(s)),
  endAt: z.string().transform((s) => new Date(s)),
  q: z.string().optional(),
});

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      startAt: url.searchParams.get("startAt"),
      endAt: url.searchParams.get("endAt"),
      q: url.searchParams.get("q") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const { startAt, endAt, q } = parsed.data;
    if (!(startAt instanceof Date) || !(endAt instanceof Date) || isNaN(+startAt) || isNaN(+endAt) || startAt >= endAt) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const serviceFilter: any = { isActive: true };
    if (q) serviceFilter.name = { $regex: q, $options: "i" };

    const [services, overlappingBookings] = await Promise.all([
      Service.find(serviceFilter).lean(),
      Booking.find({
        $or: [
          { startAt: { $lt: endAt }, endAt: { $gt: startAt } },
        ],
        status: { $ne: "cancelled" },
      })
        .select({ items: 1, startAt: 1, endAt: 1 })
        .lean(),
    ]);

    const nonOverlapServices: any[] = [];
    const overlapAllowedServices: any[] = [];

    for (const svc of services) {
      if (svc.allowOverlap) {
        overlapAllowedServices.push(svc);
        continue;
      }
      // For services where overlap is not allowed, check if any booking within range includes this service
      const hasConflict = overlappingBookings.some((b) => {
        if (!rangesOverlap(startAt, endAt, b.startAt, b.endAt)) return false;
        return b.items?.some((it: any) => String(it.serviceId) === String(svc._id));
      });
      if (!hasConflict) nonOverlapServices.push(svc);
    }

    return NextResponse.json({
      nonOverlapServices,
      overlapAllowedServices,
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


