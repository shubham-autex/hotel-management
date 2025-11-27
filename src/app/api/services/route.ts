import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { FilterQuery } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Service, type IService } from "@/models/Service";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const pricingElementSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("per_unit"), price: z.number().min(0) }),
  z.object({ type: z.literal("fixed"), price: z.number().min(0) }),
  z.object({ type: z.literal("custom"), price: z.number().optional() }),
  z.object({ type: z.literal("per_hour"), price: z.number().min(0) }),
]);

const variantSchema = z.object({
  name: z.string().min(1),
  pricingElements: z.array(pricingElementSchema).min(1),
});

const bodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  variants: z.array(variantSchema).min(1),
  isActive: z.boolean().optional(),
  allowOverlap: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await req.json();
    const data = bodySchema.parse(json);

    const created = await Service.create({
      ...data,
      isActive: data.isActive ?? true,
    });

    return NextResponse.json({ id: created.id });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("Failed to create service", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const q = url.searchParams.get("q") || "";
    const isActive = url.searchParams.get("isActive");

    const showDeleted = url.searchParams.get("deleted") === "true" && payload.role === "admin";
    
    const filter: FilterQuery<IService> = {};
    // Filter out deleted items unless admin explicitly requests them
    if (!showDeleted) {
      filter.deletedAt = null;
    } else {
      filter.deletedAt = { $ne: null };
    }
    
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }
    if (isActive !== null && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Service.find(filter).skip(skip).limit(limit).lean<IService[]>(),
      Service.countDocuments(filter),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Failed to fetch services", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
