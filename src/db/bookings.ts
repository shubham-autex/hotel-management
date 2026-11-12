import { and, asc, count, desc, eq, getTableColumns, gt, gte, ilike, isNotNull, isNull, lt, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { asCount, containsPattern, isUuid, toActorDoc, toDoc } from "@/db/helpers";
import { db } from "@/lib/db";
import { bookingAudits, bookingPayments, bookings } from "@/db/schema";
import type { AuditActor, AuditChange, BookingItem, BookingPaymentMode, BookingPaymentType, BookingStatus } from "@/db/types";

const bookingSortColumns = {
  startAt: bookings.startAt,
  endAt: bookings.endAt,
  createdAt: bookings.createdAt,
  updatedAt: bookings.updatedAt,
  customerName: bookings.customerName,
  customerPhone: bookings.customerPhone,
  eventName: bookings.eventName,
  total: bookings.total,
  subtotal: bookings.subtotal,
  status: bookings.status,
} as const;

function serviceOverlap(serviceIds: string[]): SQL {
  return sql`exists (
    select 1 from jsonb_array_elements(${bookings.items}) as elem
    where elem->>'serviceId' in (${sql.join(serviceIds.map((id) => sql`${id}`), sql`, `)})
  )`;
}

export async function createBooking(input: {
  customerName: string;
  customerPhone?: string | null;
  eventName: string;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  items: BookingItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  notes?: string | null;
}) {
  const database = await db();
  const [row] = await database
    .insert(bookings)
    .values({
      customerName: input.customerName,
      customerPhone: input.customerPhone ?? null,
      eventName: input.eventName,
      startAt: input.startAt,
      endAt: input.endAt,
      status: input.status,
      items: input.items,
      subtotal: input.subtotal,
      discountAmount: input.discountAmount,
      total: input.total,
      notes: input.notes ?? null,
    })
    .returning();
  return toDoc(row);
}

export async function findBookingById(id: string) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return row ? toDoc(row) : null;
}

export async function updateBooking(
  id: string,
  patch: Partial<{
    customerName: string;
    customerPhone: string | null;
    eventName: string;
    startAt: Date;
    endAt: Date;
    status: string;
    items: BookingItem[];
    subtotal: number;
    discountAmount: number;
    total: number;
    notes: string | null;
    deletedAt: Date | null;
  }>
) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database
    .update(bookings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(bookings.id, id))
    .returning();
  return row ? toDoc(row) : null;
}

export async function countBookingConflicts(params: {
  startAt: Date;
  endAt: Date;
  serviceIds: string[];
  excludeId?: string;
}) {
  if (params.serviceIds.length === 0) return 0;
  const database = await db();
  const filters = [
    lt(bookings.startAt, params.endAt),
    gt(bookings.endAt, params.startAt),
    isNull(bookings.deletedAt),
    serviceOverlap(params.serviceIds),
  ];
  if (params.excludeId && isUuid(params.excludeId)) filters.push(ne(bookings.id, params.excludeId));
  const [row] = await database
    .select({ value: count() })
    .from(bookings)
    .where(and(...filters));
  return asCount(row?.value);
}

export async function listBookings(params: {
  page: number;
  limit: number;
  q?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  showDeleted: boolean;
  startDate?: Date;
  endDate?: Date;
}) {
  const database = await db();
  const filters = [params.showDeleted ? isNotNull(bookings.deletedAt) : isNull(bookings.deletedAt)];
  if (params.startDate && params.endDate) {
    filters.push(lte(bookings.startAt, params.endDate));
    filters.push(gte(bookings.endAt, params.startDate));
  }
  if (params.q) {
    const pattern = containsPattern(params.q);
    const search = or(
      ilike(bookings.customerName, pattern),
      ilike(bookings.customerPhone, pattern),
      ilike(bookings.eventName, pattern)
    );
    if (search) filters.push(search);
  }
  if (params.status) filters.push(eq(bookings.status, params.status));
  const where = and(...filters);
  const sortKey = (params.sortBy && params.sortBy in bookingSortColumns ? params.sortBy : "startAt") as keyof typeof bookingSortColumns;
  const sortColumn = bookingSortColumns[sortKey];
  const order = params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const skip = (params.page - 1) * params.limit;
  const totalPaid = sql<number>`(
    ${bookings.total} - coalesce((
      select coalesce(sum(case when type = 'received' then amount else 0 end), 0)
           - coalesce(sum(case when type = 'refund' then amount else 0 end), 0)
      from booking_payments
      where booking_id = ${bookings.id}
    ), 0)
  )`.as("total_paid");

  const [rows, totalRows] = await Promise.all([
    database
      .select({ ...getTableColumns(bookings), totalPaid })
      .from(bookings)
      .where(where)
      .orderBy(order)
      .limit(params.limit)
      .offset(skip),
    database.select({ value: count() }).from(bookings).where(where),
  ]);

  return {
    items: rows.map((row) => {
      const { totalPaid: paid, ...booking } = row;
      return { ...toDoc(booking), totalPaid: Number(paid ?? 0) };
    }),
    total: asCount(totalRows[0]?.value),
  };
}

export async function listOverlappingBookings(startAt: Date, endAt: Date) {
  const database = await db();
  const rows = await database
    .select({
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      items: bookings.items,
    })
    .from(bookings)
    .where(
      and(
        lt(bookings.startAt, endAt),
        gt(bookings.endAt, startAt),
        ne(bookings.status, "cancelled"),
        isNull(bookings.deletedAt)
      )
    );
  return rows;
}

export async function createBookingAudit(input: {
  bookingId: string;
  action: string;
  changes: AuditChange[];
  user?: AuditActor;
  note?: string;
}) {
  const database = await db();
  await database.insert(bookingAudits).values({
    bookingId: input.bookingId,
    action: input.action,
    changes: input.changes,
    actor: input.user ?? null,
    note: input.note ?? null,
  });
}

export async function listBookingAudits(bookingId: string) {
  if (!isUuid(bookingId)) return [];
  const database = await db();
  const rows = await database
    .select()
    .from(bookingAudits)
    .where(eq(bookingAudits.bookingId, bookingId))
    .orderBy(desc(bookingAudits.createdAt));
  return rows.map((row) => toActorDoc(row));
}

export async function createBookingPayment(input: {
  bookingId: string;
  userId: string;
  type: BookingPaymentType;
  amount: number;
  mode: BookingPaymentMode;
  images: string[];
  notes?: string | null;
}) {
  const database = await db();
  const [row] = await database
    .insert(bookingPayments)
    .values({
      bookingId: input.bookingId,
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      mode: input.mode,
      images: input.images,
      notes: input.notes ?? null,
    })
    .returning();
  return toDoc(row);
}

export async function listBookingPayments(bookingId: string) {
  if (!isUuid(bookingId)) return [];
  const database = await db();
  const rows = await database
    .select()
    .from(bookingPayments)
    .where(eq(bookingPayments.bookingId, bookingId))
    .orderBy(desc(bookingPayments.createdAt));
  return rows.map((row) => toDoc(row));
}
