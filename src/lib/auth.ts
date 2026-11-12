import { SignJWT, jwtVerify } from "jose";
import { requiredEnv } from "@/lib/env";

function getSecretKey() {
  return new TextEncoder().encode(requiredEnv("JWT_SECRET"));
}

export type JwtPayload = {
  sub: string;
  email: string;
  role: "admin" | "manager";
};

export async function createAuthToken(payload: JwtPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
  return token;
}

export async function verifyAuthToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// Cookie helpers
export const AUTH_COOKIE = "hotel_admin_auth";

export function getCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}


