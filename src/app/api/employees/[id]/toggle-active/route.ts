import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connectToDatabase();
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const emp = await Employee.findById(id);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  emp.isActive = emp.isActive === true ? false : true;
  await emp.save();
  return NextResponse.json({ success: true, isActive: emp.isActive });
}


