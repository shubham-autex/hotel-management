import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { connectToDatabase } from "@/lib/db";
import { PaymentLog, type IPaymentLog } from "@/models/PaymentLog";
import { Payment } from "@/models/Payment";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const logSchema = z.object({
  amount: z.number().min(0),
  date: z.string().transform((s) => new Date(s)),
  type: z.enum(["received", "sent"]),
  mode: z.enum(["cash", "card", "bank_transfer", "upi", "cheque", "other"]),
  notes: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const payment = await Payment.findById(id);
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const json = await req.json();
    const data = logSchema.parse(json);

    const log = await PaymentLog.create({
      paymentId: id,
      ...data,
      user: { id: payload.sub, email: payload.email, role: payload.role },
    });

    return NextResponse.json({ id: log.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    console.error("Failed to create payment log", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const logs = await PaymentLog.find({ paymentId: id })
      .sort({ date: -1 })
      .lean<IPaymentLog[]>();

    return NextResponse.json({ items: logs });
  } catch (err) {
    console.error("Failed to fetch payment logs", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

