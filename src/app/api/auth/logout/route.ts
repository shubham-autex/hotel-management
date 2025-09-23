import { NextResponse } from "next/server";
import { AUTH_COOKIE, getCookieOptions } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  const opts = getCookieOptions();
  res.cookies.set(AUTH_COOKIE, "", { ...opts, maxAge: 0 });
  return res;
}


