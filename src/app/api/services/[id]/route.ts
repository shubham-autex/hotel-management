import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { findServiceById, softDeleteService, updateService } from "@/db/services";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const svc = await findServiceById(id);
    if (!svc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item: svc });
  } catch (err) {
    console.error("Failed to fetch service", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const json = await req.json();
    const data = bodySchema.parse(json);

    const updated = await updateService(id, {
      name: data.name,
      description: data.description,
      variants: data.variants,
      isActive: data.isActive,
      allowOverlap: data.allowOverlap,
      deletedAt: data.deletedAt === null ? null : undefined,
    });
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
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const service = await softDeleteService(id);
    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "Service deleted successfully" });
  } catch (err) {
    console.error("Failed to delete service", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
