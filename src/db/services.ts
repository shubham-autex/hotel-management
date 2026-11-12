import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { asCount, containsPattern, isUuid, toDoc } from "@/db/helpers";
import { db } from "@/lib/db";
import { services } from "@/db/schema";
import type { ServiceVariant } from "@/db/types";

export type ServicePatch = {
  name?: string;
  description?: string | null;
  variants?: ServiceVariant[];
  isActive?: boolean;
  allowOverlap?: boolean;
  deletedAt?: Date | null;
};

export async function createService(input: {
  name: string;
  description?: string | null;
  variants: ServiceVariant[];
  isActive?: boolean;
  allowOverlap?: boolean;
}) {
  const database = await db();
  const [row] = await database
    .insert(services)
    .values({
      name: input.name,
      description: input.description ?? null,
      variants: input.variants,
      isActive: input.isActive ?? true,
      allowOverlap: input.allowOverlap ?? false,
    })
    .returning();
  return toDoc(row);
}

export async function findServiceById(id: string) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database.select().from(services).where(eq(services.id, id)).limit(1);
  return row ? toDoc(row) : null;
}

export async function findActiveServicesByIds(ids: string[]) {
  const valid = [...new Set(ids.filter(isUuid))];
  if (valid.length === 0) return [];
  const database = await db();
  const rows = await database
    .select()
    .from(services)
    .where(and(inArray(services.id, valid), isNull(services.deletedAt)));
  return rows.map((row) => toDoc(row));
}

export async function findServiceActive(id: string) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database
    .select()
    .from(services)
    .where(and(eq(services.id, id), isNull(services.deletedAt)))
    .limit(1);
  return row ? toDoc(row) : null;
}

export async function listServices(params: {
  page: number;
  limit: number;
  q?: string;
  isActive?: boolean;
  showDeleted: boolean;
}) {
  const database = await db();
  const filters = [params.showDeleted ? isNotNull(services.deletedAt) : isNull(services.deletedAt)];
  if (params.q) {
    const pattern = containsPattern(params.q);
    const search = or(ilike(services.name, pattern), ilike(services.description, pattern));
    if (search) filters.push(search);
  }
  if (typeof params.isActive === "boolean") filters.push(eq(services.isActive, params.isActive));
  const where = and(...filters);
  const skip = (params.page - 1) * params.limit;
  const [rows, totalRows] = await Promise.all([
    database.select().from(services).where(where).orderBy(desc(services.createdAt)).limit(params.limit).offset(skip),
    database.select({ value: count() }).from(services).where(where),
  ]);
  return { items: rows.map((row) => toDoc(row)), total: asCount(totalRows[0]?.value) };
}

export async function listServicesForAvailability(q?: string) {
  const database = await db();
  const filters = [eq(services.isActive, true), isNull(services.deletedAt)];
  if (q) filters.push(ilike(services.name, containsPattern(q)));
  const rows = await database
    .select()
    .from(services)
    .where(and(...filters))
    .orderBy(desc(services.createdAt));
  return rows.map((row) => toDoc(row));
}

export async function updateService(id: string, patch: ServicePatch) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database
    .update(services)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(services.id, id))
    .returning();
  return row ? toDoc(row) : null;
}

export async function softDeleteService(id: string) {
  return updateService(id, { deletedAt: new Date() });
}
