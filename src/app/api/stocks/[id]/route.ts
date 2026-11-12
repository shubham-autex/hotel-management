import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createStockAudit, deleteStock, findStockById, updateStock } from "@/db/stocks";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import type { AuditChange } from "@/db/types";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
  minThreshold: z.number().min(0).optional(),
});
type PatchPayload = z.infer<typeof patchSchema>;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const stock = await findStockById(id);
    if (!stock) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(stock);
  } catch (err) {
    console.error("Failed to fetch stock", err);
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
    const data: PatchPayload = patchSchema.parse(json);

    const stock = await findStockById(id);
    if (!stock) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const changes: AuditChange[] = [];
    const patch: PatchPayload = {};
    (Object.entries(data) as [keyof PatchPayload, PatchPayload[keyof PatchPayload]][]).forEach(([key, newVal]) => {
      if (typeof newVal === "undefined") return;
      const oldVal = stock[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ key, oldValue: oldVal ?? null, newValue: newVal });
        patch[key] = newVal as never;
      }
    });

    if (Object.keys(patch).length > 0) {
      await updateStock(id, patch);
    }

    if (changes.length > 0) {
      try {
        const formatVal = (value: unknown) => {
          if (value === null || typeof value === "undefined") return "—";
          if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        };
        const note = changes.map((change) => `${change.key}: ${formatVal(change.oldValue)} → ${formatVal(change.newValue)}`).join("; ");
        await createStockAudit({
          stockId: stock._id,
          action: "updated",
          changes,
          user: { id: payload.sub, email: payload.email, role: payload.role },
          note,
        });
      } catch (auditErr) {
        console.error("Failed to write audit log:", auditErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    console.error("Failed to update stock", err);
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
    const stock = await findStockById(id);
    if (!stock) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try {
      await createStockAudit({
        stockId: stock._id,
        action: "deleted",
        changes: [{ key: "deleted", oldValue: stock, newValue: null }],
        user: { id: payload.sub, email: payload.email, role: payload.role },
        note: `Stock item "${stock.name}" was deleted`,
      });
    } catch (auditErr) {
      console.error("Failed to write audit log:", auditErr);
    }

    await deleteStock(id);
    return NextResponse.json({ message: "Stock deleted successfully" });
  } catch (err) {
    console.error("Failed to delete stock", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
