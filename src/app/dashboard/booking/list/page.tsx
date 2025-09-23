"use client";

import { useEffect, useState } from "react";

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

export default function BookingListPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("startAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");

  const loadBookings = async (pageNum: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
        ...(search && { q: search }),
        ...(statusFilter && { status: statusFilter }),
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/bookings?${params}`);
      if (!res.ok) throw new Error("Failed to load bookings");
      const data = await res.json();
      setBookings(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadBookings(1);
  }, [search, statusFilter, sortBy, sortOrder]);

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

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSortBy("startAt");
    setSortOrder("desc");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bookings</h2>
          <p className="text-gray-500">Manage your bookings</p>
        </div>
        <a
          href="/dashboard/booking/add"
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
        >
          Add Booking
        </a>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <form onSubmit={handleSearch} className="md:col-span-2">
            <input
              type="text"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Search bookings..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </form>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="startAt">Sort by Date</option>
              <option value="customerName">Sort by Name</option>
              <option value="total">Sort by Amount</option>
              <option value="status">Sort by Status</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2 text-sm text-gray-600">
            {(search || statusFilter || sortBy !== "startAt" || sortOrder !== "desc") && (
              <button
                onClick={clearFilters}
                className="text-purple-600 hover:text-purple-800 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {total} booking{total !== 1 ? 's' : ''} found
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Left</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{b.eventName}</div>
                    </td>
                    <td className="px-4 py-3">{b.customerName}</td>
                    <td className="px-4 py-3">{b.customerPhone || "—"}</td>
                    <td className="px-4 py-3">{new Date(b.startAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{new Date(b.endAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <select
                        value={b.status || 'pending'}
                        onChange={(e) => updateBookingStatus(b._id, e.target.value)}
                        className={`px-2 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-purple-500 ${
                          (b.status || 'pending') === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          (b.status || 'pending') === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          (b.status || 'pending') === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">₹{b.status !== 'cancelled' ? (b.total ?? 0).toFixed(2) : '—'}</td>
                    <td className="px-4 py-3">₹{b.status !== 'cancelled' ? (b.totalPaid ?? 0).toFixed(2) : '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <a href={`/dashboard/booking/${b._id}`} className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 10 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} bookings
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setPage(p => Math.max(1, p - 1)); loadBookings(Math.max(1, page - 1)); }}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => { setPage(p => p + 1); loadBookings(page + 1); }}
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


