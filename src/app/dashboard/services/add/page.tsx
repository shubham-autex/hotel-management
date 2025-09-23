import ServiceForm from "../ServiceForm";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";

export default async function ServicesAddPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
        Managers cannot add services. Please contact an admin.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Add Service</h2>
        <p className="text-gray-500">Create a new service with variants and pricing</p>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-8 shadow-sm">
        <ServiceForm />
      </div>
    </div>
  );
}
