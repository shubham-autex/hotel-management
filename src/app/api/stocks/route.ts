import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { FilterQuery } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Stock, type IStock } from "@/models/Stock";
import { StockAudit } from "@/models/StockAudit";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

const bodySchema = z.object({
  name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().optional(),
  description: z.string().optional(),
  minThreshold: z.number().min(0).optional(),
});
type StockPayload = z.infer<typeof bodySchema>;

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const json = await req.json();
    const data: StockPayload = bodySchema.parse(json);

    const created = await Stock.create({
      ...data,
      unit: data.unit || "pieces",
    });

    // Write audit log for creation
    try {
      const changes = Object.entries(data).map(([key, value]) => ({
        key,
        oldValue: null,
        newValue: value ?? null,
      }));

      await StockAudit.create({
        stockId: created._id,
        action: "created",
        changes,
        user: { id: payload.sub, email: payload.email, role: payload.role },
        note: `Stock item "${created.name}" was created`,
      });
    } catch (auditErr) {
      console.error("Failed to write audit log:", auditErr);
    }

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("Failed to create stock", err);
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
    const lowStock = url.searchParams.get("lowStock") === "true";

    const filter: FilterQuery<IStock> = {};
    
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    if (lowStock) {
      // Get all items matching the search filter, then filter for low stock
      const allItems = await Stock.find(filter).lean<IStock[]>();
      const filteredItems = allItems.filter((item) => {
        if (item.quantity <= 0) return true;
        if (typeof item.minThreshold === "number" && item.quantity <= item.minThreshold) return true;
        return false;
      });
      const skip = (page - 1) * limit;
      const paginatedItems = filteredItems.slice(skip, skip + limit);
      const itemsWithLowStock = paginatedItems.map((item) => ({
        ...item,
        isLowStock: true,
      }));
      return NextResponse.json({
        items: itemsWithLowStock,
        total: filteredItems.length,
        page,
        limit,
        pages: Math.ceil(filteredItems.length / limit),
      });
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Stock.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean<IStock[]>(),
      Stock.countDocuments(filter),
    ]);
    
    // Mark low stock items
    const itemsWithLowStock = items.map((item) => ({
      ...item,
      isLowStock: item.quantity <= 0 || (typeof item.minThreshold === "number" && item.quantity <= item.minThreshold),
    }));

    return NextResponse.json({
      items: itemsWithLowStock,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Failed to fetch stocks", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

