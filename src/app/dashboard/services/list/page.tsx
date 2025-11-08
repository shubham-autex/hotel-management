"use client";

import { useState, useEffect } from "react";

interface PricingElement {
  type: string;
  price: number;
}

interface ServiceVariant {
  name: string;
  pricingElements: PricingElement[];
}

interface Service {
  _id: string;
  name: string;
  description?: string;
  variants: ServiceVariant[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ServicesListPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [userRole, setUserRole] = useState<string | null>(null);

  const loadServices = async (pageNum: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
        ...(search && { q: search }),
        ...(filterActive !== "all" && { isActive: filterActive }),
      });
      const res = await fetch(`/api/services?${params}`);
      if (!res.ok) throw new Error("Failed to load services");
      const data = await res.json();
      setServices(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get user role
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.user?.role || null);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    loadServices(1);
  }, [search, filterActive]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadServices(1);
  };

  const handleDelete = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Are you sure you want to delete service "${serviceName}"? This action can be undone from the deleted items page.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadServices(page);
        alert('Service deleted successfully');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'Failed to delete service');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting service');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Services</h2>
          <p className="text-gray-500">Manage your hotel services</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          {userRole === "admin" && (
            <a
              href="/dashboard/services/deleted"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              Deleted Items
            </a>
          )}
          <a
            href="/dashboard/services/add"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
          >
            Add Service
          </a>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </form>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:w-auto w-full"
          >
            <option value="all">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-500">Loading services...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-500">Get started by adding your first service</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 md:mx-0 w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Description</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Variants & Pricing</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 md:px-4 md:py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {services.map((service) => (
                  <tr key={service._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                      <div className="font-medium text-gray-900 break-words">{service.name}</div>
                    </td>
                    <td className="px-3 py-2 md:px-4 md:py-3 text-gray-600 align-top hidden sm:table-cell">
                      <div className="text-sm break-words">{service.description || "—"}</div>
                    </td>
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell">
                      <div className="space-y-2 break-words">
                        {service.variants.map((variant, index) => (
                          <div key={index} className="">
                            <div className="text-sm font-medium text-gray-900">{variant.name}</div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {variant.pricingElements.map((element, elemIndex) => (
                                <span key={elemIndex} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                  {element.type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                                  {element.type !== 'custom' ? `: ₹${element.price}` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{service.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        <a href={`/dashboard/services/${service._id}`} className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">View</a>
                        <a href={`/dashboard/services/${service._id}/edit`} className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Edit</a>
                        {userRole === "admin" && (
                          <button
                            onClick={() => handleDelete(service._id, service.name)}
                            className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 10 && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} services
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
      </div>
    </div>
  );
}