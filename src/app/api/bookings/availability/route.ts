import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listOverlappingBookings } from "@/db/bookings";
import { listServicesForAvailability } from "@/db/services";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import type { BookingItem } from "@/db/types";

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

    const [services, overlappingBookings] = await Promise.all([
      listServicesForAvailability(q),
      listOverlappingBookings(startAt, endAt),
    ]);

    const nonOverlapServices = [];
    const overlapAllowedServices = [];

    for (const svc of services) {
      if (svc.allowOverlap) {
        overlapAllowedServices.push(svc);
        continue;
      }
      const hasConflict = overlappingBookings.some((booking) => {
        if (!rangesOverlap(startAt, endAt, booking.startAt, booking.endAt)) return false;
        return booking.items?.some((item: BookingItem) => String(item.serviceId) === svc._id);
      });
      if (!hasConflict) nonOverlapServices.push(svc);
    }

    return NextResponse.json({
      nonOverlapServices,
      overlapAllowedServices,
    });
  } catch (err) {
    console.error("Failed to fetch availability", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
