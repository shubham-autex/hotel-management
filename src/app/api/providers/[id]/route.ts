import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Provider } from "@/models/Provider";
import { Service } from "@/models/Service";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

// GET /api/providers/[id] – fetch a single provider
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const provider = await Provider.findById(id).populate("service", "name").lean();
    if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item: provider });
  } catch (err) {
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

    // If serviceId is being updated, verify the service exists
    if (data.serviceId) {
      const svc = await Service.findById(data.serviceId).lean();
      if (!svc) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Prepare update object
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.serviceId !== undefined) updateData.service = data.serviceId;
    if (data.members !== undefined) updateData.members = data.members;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await Provider.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

