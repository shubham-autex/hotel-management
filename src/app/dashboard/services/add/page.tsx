import ServiceForm from "../ServiceForm";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { useTranslations } from "next-intl";
import ServicesAddClient from "./ServicesAddClient";

export default async function ServicesAddPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return (
      <ServicesAddClient isAdmin={false} />
    );
  }
  return <ServicesAddClient isAdmin={true} />;
}
