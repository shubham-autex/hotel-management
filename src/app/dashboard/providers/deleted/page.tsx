"use client";

import { useEffect, useState } from "react";
import { Trash2, RotateCcw } from "lucide-react";

interface Service {
  _id: string;
  name: string;
}

interface Provider {
  _id: string;
  name: string;
  service: Service;
  isActive: boolean;
  deletedAt: string;
}

export default function DeletedProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Check user role
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.user?.role || null);
          if (data.user?.role !== "admin") {
            window.location.href = "/dashboard/providers";
          }
        }
      } catch {}
    })();
  }, []);

  const loadProviders = async (pageNum: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
        deleted: "true",
      });
      const res = await fetch(`/api/providers?${params}`);
      if (!res.ok) throw new Error("Failed to load deleted providers");
      const data = await res.json();
      setProviders(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "admin") {
      loadProviders(1);
    }
  }, [userRole]);

  const handleRestore = async (providerId: string, providerName: string) => {
    if (!confirm(`Restore provider "${providerName}"?`)) return;
    try {
      const res = await fetch(`/api/providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deletedAt: null }),
      });
      if (res.ok) {
        loadProviders(page);
        alert("Provider restored successfully");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to restore provider");
      }
    } catch (err) {
      console.error(err);
      alert("Error restoring provider");
    }
  };

  if (userRole !== "admin") {
    return (
      <div className="p-4 text-center text-gray-500">
        Only admins can view deleted items.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Deleted Providers</h2>
          <p className="text-gray-500">View and restore deleted providers</p>
        </div>
        <a
          href="/dashboard/providers"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 self-start sm:self-auto"
        >
          Back to Providers
        </a>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-500">Loading deleted providers...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No deleted providers</h3>
            <p className="text-gray-500">All providers are active</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Deleted At</th>
                    <th className="px-3 py-2 md:px-4 md:py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {providers.map((provider) => (
                    <tr key={provider._id} className="hover:bg-gray-50 opacity-75">
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                        <div className="font-medium text-gray-900 break-words">{provider.name}</div>
                      </td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs md:text-sm rounded-full">
                          {typeof provider.service === "object" ? provider.service.name : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          provider.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {provider.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell text-sm text-gray-500">
                        {new Date(provider.deletedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                        <button
                          onClick={() => handleRestore(provider._id, provider.name)}
                          className="px-3 py-1 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > 10 && (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} deleted providers
                </div>
                <div className="flex gap-2 self-end md:self-auto">
                  <button
                    onClick={() => { setPage(p => Math.max(1, p - 1)); loadProviders(Math.max(1, page - 1)); }}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => { setPage(p => p + 1); loadProviders(page + 1); }}
                    disabled={page * 10 >= total}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

