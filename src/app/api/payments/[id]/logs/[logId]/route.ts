import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { PaymentLog } from "@/models/PaymentLog";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const patchSchema = z.object({
  amount: z.number().min(0).optional(),
  date: z.string().transform((s) => new Date(s)).optional(),
  type: z.enum(["received", "sent"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string; logId: string }> }) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { logId } = await context.params;
    const json = await req.json();
    const data = patchSchema.parse(json);

    const updated = await PaymentLog.findByIdAndUpdate(logId, data, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string; logId: string }> }) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { logId } = await context.params;
    const log = await PaymentLog.findByIdAndDelete(logId);
    if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "Payment log deleted successfully" });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

