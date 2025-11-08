import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
  type: z.enum(["one_time", "recurring"]).optional(),
  frequency: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]).optional(),
  direction: z.enum(["received", "sent"]).optional(),
  startDate: z.string().transform((s) => new Date(s)).optional(),
  endDate: z.string().transform((s) => new Date(s)).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const token = _req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const payment = await Payment.findById(id).lean();
    if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(payment);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const json = await req.json();
    const data = patchSchema.parse(json);

    // Validate recurring payments have frequency
    if (data.type === "recurring" && !data.frequency) {
      const existing = await Payment.findById(id);
      if (!existing || existing.type !== "recurring") {
        return NextResponse.json({ error: "Frequency is required for recurring payments" }, { status: 400 });
      }
    }

    const updated = await Payment.findByIdAndUpdate(id, data, { new: true });
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
    const payment = await Payment.findById(id);
    if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete all associated payment logs first
    const { PaymentLog } = await import("@/models/PaymentLog");
    await PaymentLog.deleteMany({ paymentId: id });

    await Payment.findByIdAndDelete(id);

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

