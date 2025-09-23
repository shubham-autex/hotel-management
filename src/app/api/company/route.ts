import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { CompanyProfile } from "@/models/CompanyProfile";

const bodySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  contactPersonName: z.string().min(1),
  contactPhone: z.string().min(1),
  logo: z.string().optional(),
  gstin: z.string().optional(),
});

function assertAdmin(role?: string) {
  return role === "admin";
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const doc = await CompanyProfile.findOne().lean();
    return NextResponse.json(doc || {});
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload || !assertAdmin(payload.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const update = parsed.data;
    const doc = await CompanyProfile.findOneAndUpdate({}, update, { upsert: true, new: true, setDefaultsOnInsert: true });
    return NextResponse.json({ ok: true, id: String(doc._id) });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


