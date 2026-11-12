import { NextRequest, NextResponse } from "next/server";
import { toggleEmployeeActive } from "@/db/employees";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const emp = await toggleEmployeeActive(id);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, isActive: emp.isActive });
}
