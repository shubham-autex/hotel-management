import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Service, type IService, type IServiceVariant } from "@/models/Service";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/services/[id] – fetch a single service
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const svc = await Service.findById(id).lean<IService | null>();
    if (!svc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item: svc });
  } catch (err) {
    console.error("Failed to fetch service", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/services/[id] – update a service (admin only)
const priceTypeSchema = z.enum(["per_unit", "fixed", "custom", "per_hour"]);
const pricingElementSchema = z.object({
  type: priceTypeSchema,
  price: z.number().min(0).optional(),
});
const variantSchema = z.object({
  name: z.string().min(1),
  pricingElements: z.array(pricingElementSchema).min(1),
});
const bodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  variants: z.array(variantSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  allowOverlap: z.boolean().optional(),
  deletedAt: z.null().optional(),
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const json = await req.json();
    const data = bodySchema.parse(json);

    // Handle restore (deletedAt: null)
    const updateData: Partial<any> = {
      ...data,
    };
    if (data.variants) {
      updateData.variants = data.variants as IServiceVariant[];
    }
    if (data.deletedAt === null) {
      updateData.deletedAt = undefined;
    }

    const updated = await Service.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    console.error("Failed to update service", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const service = await Service.findById(id);
    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Soft delete
    service.deletedAt = new Date();
    await service.save();

    return NextResponse.json({ message: "Service deleted successfully" });
  } catch (err) {
    console.error("Failed to delete service", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


