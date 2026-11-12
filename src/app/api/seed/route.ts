import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, findUserByEmail } from "@/db/users";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-seed-token");
  const seedToken = env("SEED_TOKEN");
  if (!seedToken || token !== seedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmail = env("ADMIN_EMAIL") || "admin@example.com";
  const adminPassword = env("ADMIN_PASSWORD") || "Admin@123";

  const existing = await findUserByEmail(adminEmail);
  if (existing) {
    return NextResponse.json({ message: "Admin already exists" });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await createUser({ email: adminEmail, passwordHash, role: "admin" });
  return NextResponse.json({ message: "Admin created", email: adminEmail });
}
