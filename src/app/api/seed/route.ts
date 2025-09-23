import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

// Simple guard using an env token to prevent public abuse
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-seed-token");
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    return NextResponse.json({ message: "Admin already exists" });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await User.create({ email: adminEmail, passwordHash, role: "admin" });
  return NextResponse.json({ message: "Admin created", email: adminEmail });
}


