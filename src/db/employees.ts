import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { asCount, containsPattern, isUuid, toDoc } from "@/db/helpers";
import { db } from "@/lib/db";
import { employees } from "@/db/schema";
import type { EmployeeInput } from "@/db/types";

export async function generateNextEmployeeCode(): Promise<string> {
  const database = await db();
  const [last] = await database
    .select({ employeeCode: employees.employeeCode })
    .from(employees)
    .where(sql`${employees.employeeCode} ~ '^E[0-9]{3}$'`)
    .orderBy(desc(employees.employeeCode))
    .limit(1);
  const lastNum = last ? parseInt(last.employeeCode.slice(1), 10) : 0;
  const nextNum = Math.min(lastNum + 1, 999);
  return `E${String(nextNum).padStart(3, "0")}`;
}

export async function createEmployee(input: EmployeeInput) {
  const database = await db();
  const [row] = await database
    .insert(employees)
    .values({
      name: input.name,
      employeeCode: input.employeeCode,
      department: input.department,
      age: input.age ?? null,
      gender: input.gender ?? null,
      isActive: input.isActive ?? true,
      phoneNumber: input.phoneNumber ?? null,
      address: input.address ?? null,
      pincode: input.pincode ?? null,
      idProofType: input.idProofType ?? null,
      idProofNumber: input.idProofNumber ?? null,
      idProofPhotos: input.idProofPhotos ?? [],
      dateOfJoining: input.dateOfJoining ?? null,
      bankDetail: input.bankDetail ?? null,
      photo: input.photo ?? null,
    })
    .returning();
  return toDoc(row);
}

export async function findEmployeeById(id: string) {
  if (!isUuid(id)) return null;
  const database = await db();
  const [row] = await database.select().from(employees).where(eq(employees.id, id)).limit(1);
  return row ? toDoc(row) : null;
}

export async function listEmployees(params: {
  page: number;
  limit: number;
  department?: string;
  q?: string;
}) {
  const database = await db();
  const filters = [];
  if (params.department) filters.push(eq(employees.department, params.department));
  if (params.q) {
    const pattern = containsPattern(params.q);
    const search = or(
      ilike(employees.name, pattern),
      ilike(employees.employeeCode, pattern),
      ilike(employees.phoneNumber, pattern)
    );
    if (search) filters.push(search);
  }
  const where = filters.length ? and(...filters) : undefined;
  const skip = (params.page - 1) * params.limit;
  const [rows, totalRows] = await Promise.all([
    database
      .select({
        id: employees.id,
        name: employees.name,
        employeeCode: employees.employeeCode,
        department: employees.department,
        phoneNumber: employees.phoneNumber,
        photo: employees.photo,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .where(where)
      .orderBy(desc(employees.createdAt))
      .limit(params.limit)
      .offset(skip),
    database.select({ value: count() }).from(employees).where(where),
  ]);
  return {
    items: rows.map((row) => toDoc(row)),
    total: asCount(totalRows[0]?.value),
  };
}

export async function toggleEmployeeActive(id: string) {
  const current = await findEmployeeById(id);
  if (!current) return null;
  const database = await db();
  const next = current.isActive !== true;
  const [row] = await database
    .update(employees)
    .set({ isActive: next, updatedAt: new Date() })
    .where(eq(employees.id, id))
    .returning({ isActive: employees.isActive });
  return row ?? null;
}
