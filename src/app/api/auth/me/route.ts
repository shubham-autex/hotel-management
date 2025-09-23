import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: payload.sub, email: payload.email, role: payload.role } });
}


