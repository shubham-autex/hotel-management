import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createStock, createStockAudit, listStocks } from "@/db/stocks";
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
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const json = await req.json();
    const data: StockPayload = bodySchema.parse(json);

    const created = await createStock({
      ...data,
      unit: data.unit || "pieces",
    });

    try {
      const changes = Object.entries(data).map(([key, value]) => ({
        key,
        oldValue: null,
        newValue: value ?? null,
      }));
      await createStockAudit({
        stockId: created._id,
        action: "created",
        changes,
        user: { id: payload.sub, email: payload.email, role: payload.role },
        note: `Stock item "${created.name}" was created`,
      });
    } catch (auditErr) {
      console.error("Failed to write audit log:", auditErr);
    }

    return NextResponse.json({ id: created._id }, { status: 201 });
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
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const q = url.searchParams.get("q") || "";
    const lowStock = url.searchParams.get("lowStock") === "true";

    const { items, total } = await listStocks({
      page,
      limit,
      q: q || undefined,
      lowStock,
    });

    return NextResponse.json({
      items,
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
