import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { asCount, containsPattern, isUuid, toActorDoc, toDoc } from "@/db/helpers";
import { db } from "@/lib/db";
import { stockAudits, stocks } from "@/db/schema";
import type { AuditActor, AuditChange } from "@/db/types";

const lowStockCondition = sql`${stocks.quantity} <= 0 OR (${stocks.minThreshold} IS NOT NULL AND ${stocks.quantity} <= ${stocks.minThreshold})`;

function withLowStock<T extends { quantity: number; minThreshold: number | null }>(row: T) {
  return {
    ...row,
    isLowStock: row.quantity <= 0 || (typeof row.minThreshold === "number" && row.quantity <= row.minThreshold),
  };
}

export async function createStock(input: {
  name: string;
  quantity: number;
  unit?: string | null;
  description?: string | null;
  minThreshold?: number | null;
}) {
  const database = await db();
  const [row] = await database
    .insert(stocks)
    .values({
      name: input.name,
      quantity: input.quantity,
      unit: input.unit || "pieces",
      description: input.description ?? null,
      minThreshold: input.minThreshold ?? null,
    })
    .returning();
  return toDoc(row);
}

export async function findStockById(id: string) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database.select().from(stocks).where(eq(stocks.id, id)).limit(1);
  return row ? toDoc(row) : null;
}

export async function listStocks(params: { page: number; limit: number; q?: string; lowStock: boolean }) {
  const database = await db();
  const filters = [];
  if (params.q) {
    const pattern = containsPattern(params.q);
    const search = or(ilike(stocks.name, pattern), ilike(stocks.description, pattern));
    if (search) filters.push(search);
  }
  if (params.lowStock) filters.push(lowStockCondition);
  const where = filters.length ? and(...filters) : undefined;
  const skip = (params.page - 1) * params.limit;
  const [rows, totalRows] = await Promise.all([
    database.select().from(stocks).where(where).orderBy(desc(stocks.createdAt)).limit(params.limit).offset(skip),
    database.select({ value: count() }).from(stocks).where(where),
  ]);
  return {
    items: rows.map((row) => withLowStock(toDoc(row))),
    total: asCount(totalRows[0]?.value),
  };
}

export async function updateStock(
  id: string,
  patch: Partial<{
    name: string;
    quantity: number;
    unit: string;
    description: string | null;
    minThreshold: number | null;
  }>
) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database
    .update(stocks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(stocks.id, id))
    .returning();
  return row ? toDoc(row) : null;
}

export async function deleteStock(id: string) {
  if (!isUuid(id)) return false;
  const database = await db();
  const rows = await database.delete(stocks).where(eq(stocks.id, id)).returning({ id: stocks.id });
  return rows.length > 0;
}

export async function createStockAudit(input: {
  stockId: string;
  action: "created" | "updated" | "deleted";
  changes: AuditChange[];
  user?: AuditActor;
  note?: string;
}) {
  const database = await db();
  await database.insert(stockAudits).values({
    stockId: input.stockId,
    action: input.action,
    changes: input.changes,
    actor: input.user ?? null,
    note: input.note ?? null,
  });
}

export async function listStockAudits(stockId: string, limit: number) {
  if (!isUuid(stockId)) return [];
  const database = await db();
  const rows = await database
    .select()
    .from(stockAudits)
    .where(eq(stockAudits.stockId, stockId))
    .orderBy(desc(stockAudits.createdAt))
    .limit(limit);
  return rows.map((row) => toActorDoc(row));
}
