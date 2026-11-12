import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { SCHEMA_SQL } from "@/db/schema.sql";
import { requiredEnv } from "@/lib/env";

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as typeof globalThis & {
  _pg?: ReturnType<typeof postgres>;
  _pgReady?: Promise<void>;
  _drizzle?: Database;
};

function getSql() {
  const url = requiredEnv("DATABASE_URL");
  if (!globalForDb._pg) {
    globalForDb._pg = postgres(url, { max: 10, prepare: false });
  }
  return globalForDb._pg;
}

export async function connectToDatabase(): Promise<void> {
  const sql = getSql();
  if (!globalForDb._pgReady) {
    const statements = SCHEMA_SQL.split(/;\s*\n/)
      .map((statement) => statement.trim())
      .filter(Boolean);
    globalForDb._pgReady = (async () => {
      for (const statement of statements) {
        await sql.unsafe(statement);
      }
    })().catch((err) => {
      globalForDb._pgReady = undefined;
      throw err;
    });
  }
  await globalForDb._pgReady;
}

export function getDb(): Database {
  if (!globalForDb._drizzle) {
    globalForDb._drizzle = drizzle(getSql(), { schema });
  }
  return globalForDb._drizzle;
}

export async function db(): Promise<Database> {
  await connectToDatabase();
  return getDb();
}
