import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Service } from "@/models/Service";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

// GET /api/services/[id] – fetch a single service
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connectToDatabase();
  const { id } = await context.params;
  const svc = await Service.findById(id).lean();
  if (!svc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: svc });
}

// PATCH /api/services/[id] – update a service (admin only)
const pricingElementSchema = z.object({ type: z.string(), price: z.number().optional() });
const variantSchema = z.object({ name: z.string().min(1), pricingElements: z.array(pricingElementSchema).min(1) });
const bodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  variants: z.array(variantSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  allowOverlap: z.boolean().optional(),
  deletedAt: z.null().optional(),
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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
    const updateData: any = { ...data };
    if (data.deletedAt === null) {
      updateData.deletedAt = undefined;
    }

    const updated = await Service.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


