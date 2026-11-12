import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { deletePaymentLog, updatePaymentLog } from "@/db/payments";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const patchSchema = z.object({
  amount: z.number().min(0).optional(),
  date: z.string().transform((s) => new Date(s)).optional(),
  type: z.enum(["received", "sent"]).optional(),
  mode: z.enum(["cash", "card", "bank_transfer", "upi", "cheque", "other"]).optional(),
  notes: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string; logId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { logId } = await context.params;
    const json = await req.json();
    const data = patchSchema.parse(json);

    const updated = await updatePaymentLog(logId, data);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    console.error("Failed to update payment log", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { logId } = await context.params;
    const deleted = await deletePaymentLog(logId);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "Payment log deleted successfully" });
  } catch (err) {
    console.error("Failed to delete payment log", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
