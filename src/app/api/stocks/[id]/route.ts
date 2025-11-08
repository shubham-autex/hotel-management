import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Stock } from "@/models/Stock";
import { StockAudit } from "@/models/StockAudit";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
  minThreshold: z.number().min(0).optional(),
});

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const stock = await Stock.findById(id).lean();
    if (!stock) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(stock);
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

    const stock = await Stock.findById(id);
    if (!stock) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const oldStock = stock.toObject();
    const changes: { key: string; oldValue: any; newValue: any }[] = [];

    // Track changes
    Object.keys(data).forEach((key) => {
      const typedKey = key as keyof typeof data;
      const newVal = data[typedKey];
      if (newVal !== undefined) {
        const oldVal = (oldStock as any)[typedKey];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push({ key: typedKey, oldValue: oldVal, newValue: newVal });
          (stock as any)[typedKey] = newVal;
        }
      }
    });

    await stock.save();

    // Write audit log if there were changes
    if (changes.length > 0) {
      try {
        const formatVal = (v: any) => {
          if (v === null || typeof v === "undefined") return "—";
          if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
          try {
            return JSON.stringify(v);
          } catch {
            return String(v);
          }
        };
        const note = changes.map((c) => `${c.key}: ${formatVal(c.oldValue)} → ${formatVal(c.newValue)}`).join("; ");

        await StockAudit.create({
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
    const stock = await Stock.findById(id);
    if (!stock) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Write audit log before deletion
    try {
      await StockAudit.create({
        stockId: stock._id,
        action: "deleted",
        changes: [{ key: "deleted", oldValue: stock.toObject(), newValue: null }],
        user: { id: payload.sub, email: payload.email, role: payload.role },
        note: `Stock item "${stock.name}" was deleted`,
      });
    } catch (auditErr) {
      console.error("Failed to write audit log:", auditErr);
    }

    await Stock.findByIdAndDelete(id);

    return NextResponse.json({ message: "Stock deleted successfully" });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

