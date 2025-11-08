"use client";

import { useEffect, useState } from "react";
import { Trash2, RotateCcw } from "lucide-react";

interface Service {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  deletedAt: string;
}

export default function DeletedServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
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
            window.location.href = "/dashboard/services/list";
          }
        }
      } catch {}
    })();
  }, []);

  const loadServices = async (pageNum: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
        deleted: "true",
      });
      const res = await fetch(`/api/services?${params}`);
      if (!res.ok) throw new Error("Failed to load deleted services");
      const data = await res.json();
      setServices(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "admin") {
      loadServices(1);
    }
  }, [userRole]);

  const handleRestore = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Restore service "${serviceName}"?`)) return;
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deletedAt: null }),
      });
      if (res.ok) {
        loadServices(page);
        alert("Service restored successfully");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to restore service");
      }
    } catch (err) {
      console.error(err);
      alert("Error restoring service");
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
          <h2 className="text-2xl font-bold text-gray-900">Deleted Services</h2>
          <p className="text-gray-500">View and restore deleted services</p>
        </div>
        <a
          href="/dashboard/services/list"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 self-start sm:self-auto"
        >
          Back to Services
        </a>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-500">Loading deleted services...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No deleted services</h3>
            <p className="text-gray-500">All services are active</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Description</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Deleted At</th>
                    <th className="px-3 py-2 md:px-4 md:py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {services.map((service) => (
                    <tr key={service._id} className="hover:bg-gray-50 opacity-75">
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                        <div className="font-medium text-gray-900 break-words">{service.name}</div>
                      </td>
                      <td className="px-3 py-2 md:px-4 md:py-3 text-gray-600 align-top hidden sm:table-cell">
                        <div className="text-sm break-words">{service.description || "—"}</div>
                      </td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell text-sm text-gray-500">
                        {new Date(service.deletedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                        <button
                          onClick={() => handleRestore(service._id, service.name)}
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
                  Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} deleted services
                </div>
                <div className="flex gap-2 self-end md:self-auto">
                  <button
                    onClick={() => { setPage(p => Math.max(1, p - 1)); loadServices(Math.max(1, page - 1)); }}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => { setPage(p => p + 1); loadServices(page + 1); }}
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

