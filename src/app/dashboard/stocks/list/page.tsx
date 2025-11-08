"use client";

import { useEffect, useState } from "react";
import { Package, Plus, Search, Edit, Trash2, AlertTriangle, Eye } from "lucide-react";

interface Stock {
  _id: string;
  name: string;
  quantity: number;
  unit?: string;
  description?: string;
  minThreshold?: number;
  isLowStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function StocksListPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const loadStocks = async (pageNum: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
        ...(search && { q: search }),
        ...(lowStockFilter && { lowStock: "true" }),
      });
      const res = await fetch(`/api/stocks?${params}`);
      if (!res.ok) throw new Error("Failed to load stocks");
      const data = await res.json();
      setStocks(data.items || []);
      setTotal(data.total || 0);
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
    setPage(1);
    loadStocks(1);
  }, [search, lowStockFilter]);

  const handleDelete = async (stockId: string, stockName: string) => {
    if (!confirm(`Are you sure you want to delete "${stockName}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/stocks/${stockId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadStocks(page);
        alert("Stock deleted successfully");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to delete stock");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting stock");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Stock Inventory</h2>
          <p className="text-gray-500 mt-1">Manage your inventory items</p>
        </div>
        {userRole === "admin" && (
          <a
            href="/dashboard/stocks/add"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center gap-2 shadow-md self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Stock
          </a>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search by name or description..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              setPage(1);
              setLowStockFilter(!lowStockFilter);
            }}
            className={`px-4 py-2.5 border rounded-lg transition-colors flex items-center gap-2 ${
              lowStockFilter
                ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Low Stock
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-500">Loading stocks...</p>
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No stocks found</h3>
            <p className="text-gray-500">
              {userRole === "admin" ? "Get started by adding your first stock item" : "No stock items available"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-3 py-3 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Description
                    </th>
                    <th className="px-3 py-3 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-3 py-3 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Min Threshold
                    </th>
                    <th className="px-3 py-3 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 md:px-4 md:py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {stocks.map((stock) => {
                    const isLow = stock.isLowStock || stock.quantity <= 0 || (stock.minThreshold && stock.quantity <= stock.minThreshold);
                    return (
                      <tr key={stock._id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 md:px-4 md:py-4 align-top">
                          <div className="font-medium text-gray-900 break-words">{stock.name}</div>
                        </td>
                        <td className="px-3 py-3 md:px-4 md:py-4 text-gray-600 align-top hidden sm:table-cell">
                          <div className="text-sm break-words">{stock.description || "—"}</div>
                        </td>
                        <td className="px-3 py-3 md:px-4 md:py-4 align-top">
                          <div className="font-semibold text-gray-900">
                            {stock.quantity} {stock.unit || "pieces"}
                          </div>
                        </td>
                        <td className="px-3 py-3 md:px-4 md:py-4 align-top hidden sm:table-cell">
                          <div className="text-sm text-gray-600">
                            {stock.minThreshold !== undefined ? `${stock.minThreshold} ${stock.unit || "pieces"}` : "—"}
                          </div>
                        </td>
                        <td className="px-3 py-3 md:px-4 md:py-4 align-top">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-200">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-100 text-green-800 border border-green-200">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 md:px-4 md:py-4 align-top">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <a
                              href={`/dashboard/stocks/${stock._id}`}
                              className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                              title="View"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">View</span>
                            </a>
                            {userRole === "admin" && (
                              <>
                                <a
                                  href={`/dashboard/stocks/${stock._id}/edit`}
                                  className="px-2.5 py-1.5 text-xs border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1"
                                  title="Edit"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Edit</span>
                                </a>
                                <button
                                  onClick={() => handleDelete(stock._id, stock.name)}
                                  className="px-2.5 py-1.5 text-xs border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > 10 && (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} items
                </div>
                <div className="flex gap-2 self-end md:self-auto">
                  <button
                    onClick={() => {
                      setPage((p) => Math.max(1, p - 1));
                      loadStocks(Math.max(1, page - 1));
                    }}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      setPage((p) => p + 1);
                      loadStocks(page + 1);
                    }}
                    disabled={page * 10 >= total}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
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

