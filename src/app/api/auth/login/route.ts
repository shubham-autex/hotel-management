import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import bcrypt from "bcryptjs";
import { createUser, findUserByEmail } from "@/db/users";
import { AUTH_COOKIE, createAuthToken, getCookieOptions } from "@/lib/auth";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { email, password } = bodySchema.parse(json);

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createAuthToken({ sub: user.id, email: user.email, role: user.role as "admin" | "manager" });
    const res = NextResponse.json({ success: true });
    res.cookies.set(AUTH_COOKIE, token, getCookieOptions());
    return res;
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
