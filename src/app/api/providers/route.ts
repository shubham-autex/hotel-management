import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createProvider, listProviders } from "@/db/providers";
import { findServiceActive } from "@/db/services";
import { isUuid } from "@/db/helpers";
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
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const json = await req.json();
    const data = bodySchema.parse(json);
    if (!isUuid(data.serviceId)) {
      return NextResponse.json({ error: "Invalid service id" }, { status: 400 });
    }

    const svc = await findServiceActive(data.serviceId);
    if (!svc) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    const created = await createProvider({
      name: data.name,
      serviceId: data.serviceId,
      members: data.members,
      isActive: data.isActive ?? true,
    });

    return NextResponse.json({ id: created._id });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    console.error("Failed to create provider", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
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

    if (serviceId && !isUuid(serviceId)) {
      return NextResponse.json({ error: "Invalid service id filter" }, { status: 400 });
    }

    const { items, total } = await listProviders({
      page,
      limit,
      q: q || undefined,
      serviceId: serviceId || undefined,
      isActive: isActive === null || isActive === "" ? undefined : isActive === "true",
      showDeleted,
    });

    return NextResponse.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Failed to fetch providers", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
