import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { deletePayment, findPaymentById, updatePayment } from "@/db/payments";
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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const payment = await findPaymentById(id);
    if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(payment);
  } catch (err) {
    console.error("Failed to fetch payment", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const json = await req.json();
    const data = patchSchema.parse(json);

    if (data.type === "recurring" && !data.frequency) {
      const existing = await findPaymentById(id);
      if (!existing || existing.type !== "recurring") {
        return NextResponse.json({ error: "Frequency is required for recurring payments" }, { status: 400 });
      }
    }

    const updated = await updatePayment(id, data);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    console.error("Failed to update payment", err);
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
    const existing = await findPaymentById(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deletePayment(id);
    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (err) {
    console.error("Failed to delete payment", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
