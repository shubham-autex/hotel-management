import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { findProviderById, softDeleteProvider, updateProvider } from "@/db/providers";
import { findServiceActive } from "@/db/services";
import { isUuid } from "@/db/helpers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const provider = await findProviderById(id);
    if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item: provider });
  } catch (err) {
    console.error("Failed to fetch provider", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const memberSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().optional(),
  isHead: z.boolean().optional(),
});

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
  members: z.array(memberSchema).min(1).optional(),
  isActive: z.boolean().optional(),
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

    if (data.serviceId) {
      if (!isUuid(data.serviceId)) {
        return NextResponse.json({ error: "Invalid service id" }, { status: 400 });
      }
      const svc = await findServiceActive(data.serviceId);
      if (!svc) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const updated = await updateProvider(id, {
      name: data.name,
      serviceId: data.serviceId,
      members: data.members,
      isActive: data.isActive,
      deletedAt: data.deletedAt === null ? null : undefined,
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    console.error("Failed to update provider", err);
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
    const provider = await softDeleteProvider(id);
    if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "Provider deleted successfully" });
  } catch (err) {
    console.error("Failed to delete provider", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
