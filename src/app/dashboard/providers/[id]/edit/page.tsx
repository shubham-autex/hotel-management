import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Provider } from "@/models/Provider";
import EditClient from "./EditClient";

export default async function ProviderEditPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
        Managers cannot edit providers. Please contact an admin.
      </div>
    );
  }

  await connectToDatabase();
  const { id } = await params;
  const provider = await Provider.findById(id).populate("service", "name").lean();
  if (!provider) {
    return <div className="p-4">Provider not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Edit Provider</h2>
        <p className="text-gray-500">Update provider details and members</p>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-4 md:p-8 shadow-sm">
        <EditClient provider={JSON.parse(JSON.stringify(provider))} />
      </div>
    </div>
  );
}

