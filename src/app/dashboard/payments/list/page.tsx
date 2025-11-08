"use client";

import { useEffect, useState } from "react";
import { DollarSign, Plus, Search, Edit, Trash2, Eye, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatDateDDMMYYYY } from "@/lib/dateFormat";
import { useTranslations } from "next-intl";

interface Payment {
  _id: string;
  name: string;
  description?: string;
  amount: number;
  type: "one_time" | "recurring";
  frequency?: "monthly" | "quarterly" | "half_yearly" | "yearly";
  direction: "received" | "sent";
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
}

export default function PaymentsListPage() {
  const t = useTranslations("common");
  const tPayment = useTranslations("payment");
  const tPage = useTranslations("pages.payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  const loadPayments = async (pageNum: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
        ...(search && { q: search }),
        ...(typeFilter && { type: typeFilter }),
        ...(directionFilter && { direction: directionFilter }),
      });
      const res = await fetch(`/api/payments?${params}`);
      if (!res.ok) throw new Error("Failed to load payments");
      const data = await res.json();
      setPayments(data.items || []);
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
          if (data.user?.role !== "admin") {
            window.location.href = "/dashboard";
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (userRole === "admin") {
      setPage(1);
      loadPayments(1);
    }
  }, [search, typeFilter, directionFilter, userRole]);

  const handleDelete = async (paymentId: string, paymentName: string) => {
    if (!confirm(`Are you sure you want to delete "${paymentName}"? This will also delete all associated logs.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadPayments(page);
        alert("Payment deleted successfully");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to delete payment");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting payment");
    }
  };

  const formatFrequency = (freq?: string) => {
    if (!freq) return "";
    const map: Record<string, string> = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      half_yearly: "6-Monthly",
      yearly: "Yearly",
    };
    return map[freq] || freq;
  };

  if (userRole !== "admin") {
    return (
      <div className="p-4 text-center text-gray-500">
        {t("error")}: Only admins can access payments.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{tPayment("title")}</h2>
          <p className="text-gray-500 mt-1">{tPage("description")}</p>
        </div>
        <a
          href="/dashboard/payments/add"
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center gap-2 shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {tPayment("addPayment")}
        </a>
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
              placeholder={t("search")}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setPage(1);
              setTypeFilter(e.target.value);
            }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:w-48 w-full bg-white"
          >
            <option value="">All Types</option>
            <option value="one_time">One Time</option>
            <option value="recurring">Recurring</option>
          </select>
          <select
            value={directionFilter}
            onChange={(e) => {
              setPage(1);
              setDirectionFilter(e.target.value);
            }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:w-48 w-full bg-white"
          >
            <option value="">All Directions</option>
            <option value="received">Received</option>
            <option value="sent">Sent</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-500">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">Get started by adding your first payment</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-3 py-3 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Type
                    </th>
                    <th className="px-3 py-3 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 py-3 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-3 py-3 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Start Date
                    </th>
                    <th className="px-3 py-3 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 md:px-4 md:py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 md:px-4 md:py-4 align-top">
                        <div className="font-medium text-gray-900 break-words">{payment.name}</div>
                        {payment.description && (
                          <div className="text-xs text-gray-500 mt-1">{payment.description}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 md:px-4 md:py-4 align-top hidden sm:table-cell">
                        <div className="text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {payment.type === "one_time" ? "One Time" : formatFrequency(payment.frequency)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 md:px-4 md:py-4 align-top">
                        <div className="font-semibold text-gray-900">₹{payment.amount.toFixed(2)}</div>
                      </td>
                      <td className="px-3 py-3 md:px-4 md:py-4 align-top">
                        {payment.direction === "received" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-100 text-green-800 border border-green-200">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            Received
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-800 border border-red-200">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Sent
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 md:px-4 md:py-4 align-top hidden sm:table-cell">
                        <div className="text-sm text-gray-600">
                          {formatDateDDMMYYYY(payment.startDate)}
                        </div>
                      </td>
                      <td className="px-3 py-3 md:px-4 md:py-4 align-top">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                          payment.isActive
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-gray-100 text-gray-800 border border-gray-200"
                        }`}>
                          {payment.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3 md:px-4 md:py-4 align-top">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <a
                            href={`/dashboard/payments/${payment._id}`}
                            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </a>
                          <a
                            href={`/dashboard/payments/${payment._id}/edit`}
                            className="px-2.5 py-1.5 text-xs border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </a>
                          <button
                            onClick={() => handleDelete(payment._id, payment.name)}
                            className="px-2.5 py-1.5 text-xs border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > 10 && (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} payments
                </div>
                <div className="flex gap-2 self-end md:self-auto">
                  <button
                    onClick={() => {
                      setPage((p) => Math.max(1, p - 1));
                      loadPayments(Math.max(1, page - 1));
                    }}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      setPage((p) => p + 1);
                      loadPayments(page + 1);
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

