import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (token) {
    const payload = await verifyAuthToken(token);
    if (payload) {
      redirect("/dashboard");
    }
  }
  return <LoginForm />;
}


