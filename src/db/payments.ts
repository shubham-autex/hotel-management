import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { asCount, containsPattern, isUuid, toActorDoc, toDoc } from "@/db/helpers";
import { db } from "@/lib/db";
import { paymentLogs, payments } from "@/db/schema";
import type { AuditActor, PaymentDirection, PaymentFrequency, PaymentLogType, PaymentMode, PaymentType } from "@/db/types";

export type PaymentInput = {
  name: string;
  description?: string | null;
  amount: number;
  type: PaymentType;
  frequency?: PaymentFrequency | null;
  direction: PaymentDirection;
  startDate: Date;
  endDate?: Date | null;
  isActive?: boolean;
};

export async function createPayment(input: PaymentInput) {
  const database = await db();
  const [row] = await database
    .insert(payments)
    .values({
      name: input.name,
      description: input.description ?? null,
      amount: input.amount,
      type: input.type,
      frequency: input.frequency ?? null,
      direction: input.direction,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();
  return toDoc(row);
}

export async function findPaymentById(id: string) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database.select().from(payments).where(eq(payments.id, id)).limit(1);
  return row ? toDoc(row) : null;
}

export async function listPayments(params: {
  page: number;
  limit: number;
  q?: string;
  type?: string;
  direction?: string;
  isActive?: boolean;
}) {
  const database = await db();
  const filters = [];
  if (params.q) {
    const pattern = containsPattern(params.q);
    const search = or(ilike(payments.name, pattern), ilike(payments.description, pattern));
    if (search) filters.push(search);
  }
  if (params.type) filters.push(eq(payments.type, params.type));
  if (params.direction) filters.push(eq(payments.direction, params.direction));
  if (typeof params.isActive === "boolean") filters.push(eq(payments.isActive, params.isActive));
  const where = filters.length ? and(...filters) : undefined;
  const skip = (params.page - 1) * params.limit;
  const [rows, totalRows] = await Promise.all([
    database.select().from(payments).where(where).orderBy(desc(payments.startDate)).limit(params.limit).offset(skip),
    database.select({ value: count() }).from(payments).where(where),
  ]);
  return { items: rows.map((row) => toDoc(row)), total: asCount(totalRows[0]?.value) };
}

export async function updatePayment(id: string, patch: Partial<PaymentInput>) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database
    .update(payments)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(payments.id, id))
    .returning();
  return row ? toDoc(row) : null;
}

export async function deletePayment(id: string) {
  if (!isUuid(id)) return false;
  const database = await db();
  const rows = await database.delete(payments).where(eq(payments.id, id)).returning({ id: payments.id });
  return rows.length > 0;
}

export async function createPaymentLog(input: {
  paymentId: string;
  amount: number;
  date: Date;
  type: PaymentLogType;
  mode: PaymentMode;
  notes?: string | null;
  user?: AuditActor;
}) {
  const database = await db();
  const [row] = await database
    .insert(paymentLogs)
    .values({
      paymentId: input.paymentId,
      amount: input.amount,
      date: input.date,
      type: input.type,
      mode: input.mode,
      notes: input.notes ?? null,
      actor: input.user ?? null,
    })
    .returning();
  return toActorDoc(row);
}

export async function listPaymentLogs(paymentId: string) {
  if (!isUuid(paymentId)) return [];
  const database = await db();
  const rows = await database
    .select()
    .from(paymentLogs)
    .where(eq(paymentLogs.paymentId, paymentId))
    .orderBy(desc(paymentLogs.date));
  return rows.map((row) => toActorDoc(row));
}

export async function updatePaymentLog(
  id: string,
  patch: Partial<{
    amount: number;
    date: Date;
    type: PaymentLogType;
    mode: PaymentMode;
    notes: string | null;
  }>
) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database
    .update(paymentLogs)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(paymentLogs.id, id))
    .returning();
  return row ? toActorDoc(row) : null;
}

export async function deletePaymentLog(id: string) {
  if (!isUuid(id)) return false;
  const database = await db();
  const rows = await database.delete(paymentLogs).where(eq(paymentLogs.id, id)).returning({ id: paymentLogs.id });
  return rows.length > 0;
}
