import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Service } from "@/models/Service";
import EditClient from "./EditClient";

export default async function ServiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
        Managers cannot edit services. Please contact an admin.
      </div>
    );
  }

  await connectToDatabase();
  const { id } = await params;
  const svc = await Service.findById(id).lean();
  if (!svc) {
    return <div className="p-4">Service not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Edit Service</h2>
        <p className="text-gray-500">Update service details, variants and pricing</p>
      </div>
      <EditClient service={JSON.parse(JSON.stringify(svc))} />
    </div>
  );
}

