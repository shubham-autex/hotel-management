import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Payment } from "@/models/Payment";
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
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const json = await req.json();
    const data = bodySchema.parse(json);

    // Validate recurring payments have frequency
    if (data.type === "recurring" && !data.frequency) {
      return NextResponse.json({ error: "Frequency is required for recurring payments" }, { status: 400 });
    }

    // Validate one-time payments don't have frequency
    if (data.type === "one_time" && data.frequency) {
      return NextResponse.json({ error: "Frequency should not be set for one-time payments" }, { status: 400 });
    }

    const created = await Payment.create({
      ...data,
      isActive: data.isActive ?? true,
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

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

    const filter: any = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    if (type) {
      filter.type = type;
    }

    if (direction) {
      filter.direction = direction;
    }

    if (isActive !== null && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Payment.find(filter).skip(skip).limit(limit).sort({ startDate: -1 }).lean(),
      Payment.countDocuments(filter),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

