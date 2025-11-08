import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Provider } from "@/models/Provider";
import { Service } from "@/models/Service";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const memberSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().optional(),
  isHead: z.boolean().optional(),
});

const bodySchema = z.object({
  name: z.string().min(1),
  serviceId: z.string().min(1),
  members: z.array(memberSchema).min(1),
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

    const svc = await Service.findOne({ _id: data.serviceId, deletedAt: null }).lean();
    if (!svc) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    const created = await Provider.create({
      name: data.name,
      service: data.serviceId,
      members: data.members,
      isActive: data.isActive ?? true,
    });

    return NextResponse.json({ id: created.id });
  } catch (err: any) {
    if (err?.name === "ZodError") return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const q = url.searchParams.get("q") || "";
    const serviceId = url.searchParams.get("serviceId") || "";
    const isActive = url.searchParams.get("isActive");

    const showDeleted = url.searchParams.get("deleted") === "true" && payload.role === "admin";
    
    const filter: any = {};
    // Filter out deleted items unless admin explicitly requests them
    if (!showDeleted) {
      filter.deletedAt = null;
    } else {
      filter.deletedAt = { $ne: null };
    }
    
    if (q) filter.name = { $regex: q, $options: "i" };
    if (serviceId) filter.service = serviceId;
    if (isActive !== null) filter.isActive = isActive === "true";

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Provider.find(filter).populate("service", "name").skip(skip).limit(limit).lean(),
      Provider.countDocuments(filter),
    ]);

    return NextResponse.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


