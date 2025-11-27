import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Provider, type IProvider, type IProviderMember } from "@/models/Provider";
import { Service } from "@/models/Service";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

// GET /api/providers/[id] – fetch a single provider
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const provider = await Provider.findById(id).populate("service", "name").lean<IProvider | null>();
    if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item: provider });
  } catch (err) {
    console.error("Failed to fetch provider", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/providers/[id] – update a provider (admin only)
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
    await connectToDatabase();
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const json = await req.json();
    const data = bodySchema.parse(json);

    // If serviceId is being updated, verify the service exists and is not deleted
    let serviceObjectId: Types.ObjectId | undefined;
    if (data.serviceId) {
      try {
        serviceObjectId = new Types.ObjectId(data.serviceId);
      } catch {
        return NextResponse.json({ error: "Invalid service id" }, { status: 400 });
      }
      const svc = await Service.findOne({ _id: serviceObjectId, deletedAt: null }).lean();
      if (!svc) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Prepare update object
    const updateData: Partial<Pick<IProvider, "name" | "service" | "members" | "isActive" | "deletedAt">> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (serviceObjectId) updateData.service = serviceObjectId;
    if (data.members !== undefined) updateData.members = data.members as IProviderMember[];
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    // Handle restore (deletedAt: null)
    if (data.deletedAt === null) {
      updateData.deletedAt = undefined;
    }

    const updated = await Provider.findByIdAndUpdate(id, updateData, { new: true });
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
    await connectToDatabase();
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const provider = await Provider.findById(id);
    if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Soft delete
    provider.deletedAt = new Date();
    await provider.save();

    return NextResponse.json({ message: "Provider deleted successfully" });
  } catch (err) {
    console.error("Failed to delete provider", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

