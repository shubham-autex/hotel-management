"use client";

import { useEffect, useState } from "react";
import { Calendar, Search, Filter, X, ChevronLeft, ChevronRight, Eye, Edit, Trash2, DollarSign, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

type Booking = {
  _id: string;
  customerName: string;
  customerPhone?: string;
  eventName: string;
  startAt: string;
  endAt: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  total: number;
  totalPaid?: number;
};

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper function to get default dates (today and today + 30 days)
function getDefaultDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);
  return {
    start: formatDate(today),
    end: formatDate(endDate),
  };
}

// Helper function to format date for display
function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDisplayDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Quick date range presets
function getDatePresets() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const next30Days = new Date(today);
  next30Days.setDate(today.getDate() + 30);
  
  return {
    today: { start: formatDate(today), end: formatDate(today), label: "Today" },
    thisWeek: { start: formatDate(thisWeekStart), end: formatDate(thisWeekEnd), label: "This Week" },
    thisMonth: { start: formatDate(thisMonthStart), end: formatDate(thisMonthEnd), label: "This Month" },
    next30Days: { start: formatDate(today), end: formatDate(next30Days), label: "Next 30 Days" },
  };
}

export default function BookingListPage() {
  const t = useTranslations("pages.bookings");
  const tCommon = useTranslations("common");
  const defaultDates = getDefaultDates();
  const datePresets = getDatePresets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("startAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);
  const [dateError, setDateError] = useState<string>("");
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);
  const [stats, setStats] = useState({ totalRevenue: 0, totalBookings: 0, pendingCount: 0 });

  const validateDates = (start: string, end: string): boolean => {
    if (!start || !end) {
      setDateError("Both start and end dates are required");
      return false;
    }
    const startDt = new Date(start);
    const endDt = new Date(end);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      setDateError("Invalid date format");
      return false;
    }
    if (startDt > endDt) {
      setDateError("Start date must be before or equal to end date");
      return false;
    }
    const diffDays = Math.ceil((endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      setDateError("Date range cannot exceed 90 days");
      return false;
    }
    setDateError("");
    return true;
  };

  const loadBookings = async (pageNum: number = page) => {
    if (!validateDates(startDate, endDate)) {
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
        ...(search && { q: search }),
        ...(statusFilter && { status: statusFilter }),
        sortBy,
        sortOrder,
        startDate,
        endDate,
      });
      const res = await fetch(`/api/bookings?${params}`);
      if (!res.ok) throw new Error("Failed to load bookings");
      const data = await res.json();
      setBookings(data.items || []);
      setTotal(data.total || 0);
      
      // Calculate stats
      const items = data.items || [];
      const revenue = items.reduce((sum: number, b: Booking) => sum + (b.status !== 'cancelled' ? (b.total || 0) : 0), 0);
      const pending = items.filter((b: Booking) => b.status === 'pending').length;
      setStats({ totalRevenue: revenue, totalBookings: items.length, pendingCount: pending });
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
    loadBookings(1);
  }, [search, statusFilter, sortBy, sortOrder, startDate, endDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadBookings(1);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadBookings(page);
      } else {
        alert('Failed to update booking status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating booking status');
    }
  };

  const handleDelete = async (bookingId: string, eventName: string) => {
    if (!confirm(`Are you sure you want to delete booking "${eventName}"? This action can be undone from the deleted items page.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadBookings(page);
        alert('Booking deleted successfully');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'Failed to delete booking');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting booking');
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSortBy("startAt");
    setSortOrder("desc");
    const defaults = getDefaultDates();
    setStartDate(defaults.start);
    setEndDate(defaults.end);
    setDateError("");
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    if (newStart && endDate) {
      validateDates(newStart, endDate);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    setEndDate(newEnd);
    if (startDate && newEnd) {
      validateDates(startDate, newEnd);
    }
  };

  const applyDatePreset = (preset: { start: string; end: string }) => {
    setStartDate(preset.start);
    setEndDate(preset.end);
    setDateError("");
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{t("listTitle")}</h2>
          <p className="text-gray-500 mt-1">{t("description")}</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          {userRole === "admin" && (
            <a
              href="/dashboard/booking/deleted"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Deleted
            </a>
          )}
          <a
            href="/dashboard/booking/add"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center gap-2 shadow-md"
          >
            <Calendar className="w-4 h-4" />
            Add Booking
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && bookings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">₹{stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Bookings</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalBookings}</p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.pendingCount}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-700" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
        {/* Date Filters with Presets */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              Date Range
              {showDateFilter ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="text-sm text-gray-500">
              {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
            </div>
          </div>
          
          {showDateFilter && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Quick Select</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(datePresets).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => applyDatePreset(preset)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        startDate === preset.start && endDate === preset.end
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom Date Range */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Custom Range (Max 90 days)</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={handleStartDateChange}
                      max={endDate}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      min={startDate}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                {dateError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {dateError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Search by customer, event, or phone..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </form>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:w-48 w-full bg-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <div className="flex gap-2 sm:w-auto w-full">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              <option value="startAt">Sort by Date</option>
              <option value="customerName">Sort by Name</option>
              <option value="total">Sort by Amount</option>
              <option value="status">Sort by Status</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white"
              title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2 text-sm text-gray-600">
            {(search || statusFilter || sortBy !== "startAt" || sortOrder !== "desc" || startDate !== defaultDates.start || endDate !== defaultDates.end) && (
              <button
                onClick={clearFilters}
                className="text-purple-600 hover:text-purple-800 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-500">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500">Get started by adding your first booking</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 md:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Start</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">End</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Total</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Total Left</th>
                  <th className="px-3 py-2 md:px-4 md:py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                      <div className="font-medium text-gray-900 break-words">{b.eventName}</div>
                    </td>
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top break-words">{b.customerName}</td>
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell">{b.customerPhone || "—"}</td>
                    <td className="px-3 py-3 md:px-4 md:py-4 align-top hidden sm:table-cell">
                      <div className="text-sm text-gray-600">{formatDisplayDateTime(b.startAt)}</div>
                    </td>
                    <td className="px-3 py-3 md:px-4 md:py-4 align-top hidden sm:table-cell">
                      <div className="text-sm text-gray-600">{formatDisplayDateTime(b.endAt)}</div>
                    </td>
                    <td className="px-3 py-3 md:px-4 md:py-4 align-top hidden sm:table-cell">
                      <select
                        value={b.status || 'pending'}
                        onChange={(e) => updateBookingStatus(b._id, e.target.value)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer transition-all ${getStatusBadgeClass(b.status || 'pending')}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 md:px-4 md:py-4 align-top hidden sm:table-cell">
                      <div className="font-semibold text-gray-900">
                        {b.status !== 'cancelled' ? `₹${(b.total ?? 0).toFixed(2)}` : <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 md:px-4 md:py-4 align-top hidden sm:table-cell">
                      <div className="text-sm text-gray-600">
                        {b.status !== 'cancelled' ? `₹${(b.totalPaid ?? 0).toFixed(2)}` : <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 md:px-4 md:py-4 align-top">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <a 
                          href={`/dashboard/booking/${b._id}`} 
                          className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </a>
                        <a 
                          href={`/dashboard/booking/${b._id}/edit`} 
                          className="px-2.5 py-1.5 text-xs border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </a>
                        {userRole === "admin" && (
                          <button
                            onClick={() => handleDelete(b._id, b.eventName)}
                            className="px-2.5 py-1.5 text-xs border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
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

        {total > 0 && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} bookings
            </div>
            <div className="flex gap-2 self-end md:self-auto">
              <button
                onClick={() => { setPage(p => Math.max(1, p - 1)); loadBookings(Math.max(1, page - 1)); }}
                disabled={page === 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => { setPage(p => p + 1); loadBookings(page + 1); }}
                disabled={page * 10 >= total}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


