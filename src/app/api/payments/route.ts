import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createPayment, listPayments } from "@/db/payments";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const bodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  type: z.enum(["one_time", "recurring"]),
  frequency: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]).optional(),
  direction: z.enum(["received", "sent"]),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)).optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const json = await req.json();
    const data = bodySchema.parse(json);

    if (data.type === "recurring" && !data.frequency) {
      return NextResponse.json({ error: "Frequency is required for recurring payments" }, { status: 400 });
    }
    if (data.type === "one_time" && data.frequency) {
      return NextResponse.json({ error: "Frequency should not be set for one-time payments" }, { status: 400 });
    }

    const created = await createPayment({
      ...data,
      isActive: data.isActive ?? true,
    });

    return NextResponse.json({ id: created._id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("Failed to create payment", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const q = url.searchParams.get("q") || "";
    const type = url.searchParams.get("type") || "";
    const direction = url.searchParams.get("direction") || "";
    const isActive = url.searchParams.get("isActive");

    const { items, total } = await listPayments({
      page,
      limit,
      q: q || undefined,
      type: type || undefined,
      direction: direction || undefined,
      isActive: isActive === null || isActive === "" ? undefined : isActive === "true",
    });

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Failed to fetch payments", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
