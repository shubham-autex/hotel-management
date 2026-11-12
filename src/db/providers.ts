import { and, count, desc, eq, ilike, isNotNull, isNull } from "drizzle-orm";
import { asCount, containsPattern, isUuid, toDoc } from "@/db/helpers";
import { db } from "@/lib/db";
import { providers, services } from "@/db/schema";
import type { ProviderMember } from "@/db/types";

export type ProviderPatch = {
  name?: string;
  serviceId?: string;
  members?: ProviderMember[];
  isActive?: boolean;
  deletedAt?: Date | null;
};

function toProviderDoc(
  row: typeof providers.$inferSelect,
  service: { id: string; name: string } | null
) {
  const doc = toDoc(row);
  const { serviceId, ...rest } = doc;
  return {
    ...rest,
    service: service ? { _id: service.id, name: service.name } : serviceId,
  };
}

export async function createProvider(input: {
  name: string;
  serviceId: string;
  members: ProviderMember[];
  isActive?: boolean;
}) {
  const database = await db();
  const [row] = await database
    .insert(providers)
    .values({
      name: input.name,
      serviceId: input.serviceId,
      members: input.members,
      isActive: input.isActive ?? true,
    })
    .returning();
  return toDoc(row);
}

export async function findProviderById(id: string) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database
    .select({ provider: providers, serviceId: services.id, serviceName: services.name })
    .from(providers)
    .leftJoin(services, eq(providers.serviceId, services.id))
    .where(eq(providers.id, id))
    .limit(1);
  if (!row) return null;
  return toProviderDoc(
    row.provider,
    row.serviceId && row.serviceName ? { id: row.serviceId, name: row.serviceName } : null
  );
}

export async function listProviders(params: {
  page: number;
  limit: number;
  q?: string;
  serviceId?: string;
  isActive?: boolean;
  showDeleted: boolean;
}) {
  const database = await db();
  const filters = [params.showDeleted ? isNotNull(providers.deletedAt) : isNull(providers.deletedAt)];
  if (params.q) filters.push(ilike(providers.name, containsPattern(params.q)));
  if (params.serviceId) filters.push(eq(providers.serviceId, params.serviceId));
  if (typeof params.isActive === "boolean") filters.push(eq(providers.isActive, params.isActive));
  const where = and(...filters);
  const skip = (params.page - 1) * params.limit;
  const [rows, totalRows] = await Promise.all([
    database
      .select({ provider: providers, serviceId: services.id, serviceName: services.name })
      .from(providers)
      .leftJoin(services, eq(providers.serviceId, services.id))
      .where(where)
      .orderBy(desc(providers.createdAt))
      .limit(params.limit)
      .offset(skip),
    database.select({ value: count() }).from(providers).where(where),
  ]);
  return {
    items: rows.map((row) =>
      toProviderDoc(
        row.provider,
        row.serviceId && row.serviceName ? { id: row.serviceId, name: row.serviceName } : null
      )
    ),
    total: asCount(totalRows[0]?.value),
  };
}

export async function updateProvider(id: string, patch: ProviderPatch) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database
    .update(providers)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(providers.id, id))
    .returning();
  return row ? toDoc(row) : null;
}

export async function softDeleteProvider(id: string) {
  return updateProvider(id, { deletedAt: new Date() });
}
