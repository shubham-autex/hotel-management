import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import type { UserRole } from "@/db/types";

export async function findUserByEmail(email: string) {
  const database = await db();
  const [row] = await database
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return row ?? null;
}

export async function createUser(input: { email: string; passwordHash: string; role: UserRole }) {
  const database = await db();
  const [row] = await database
    .insert(users)
    .values({
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
    })
    .returning();
  return row;
}
