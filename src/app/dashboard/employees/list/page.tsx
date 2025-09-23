"use client";
import { useEffect, useState } from "react";

type Employee = {
  _id: string;
  name: string;
  employeeCode: string;
  department: string;
  phoneNumber?: string;
  photo?: string;
  isActive?: boolean;
};

export default function EmployeesListPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(p = page, l = limit, dq = q, dd = department) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(l) });
    if (dq) params.set("q", dq);
    if (dd) params.set("department", dd);
    const res = await fetch(`/api/employees?${params.toString()}`);
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total || 0);
    setPage(data.page || p);
    setLimit(data.limit || l);
    setLoading(false);
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep list in sync with filters like providers page
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, department]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
          <p className="text-gray-500">List of all employees</p>
        </div>
        <a
          href="/dashboard/employees/add"
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 self-start sm:self-auto"
        >
          Add Employee
        </a>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <form onSubmit={(e) => { e.preventDefault(); load(1); }} className="flex-1">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code, phone"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </form>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:w-auto w-full"
          >
            <option value="">All Departments</option>
            <option>Cleaning</option>
            <option>Management</option>
            <option>Electicity</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-500">Loading employees...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A4 4 0 018 16h8a4 4 0 012.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 md:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Photo</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Code</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Department</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                  <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="px-3 py-2 md:px-4 md:py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {items.map((e) => (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell">
                      <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                        {e.photo ? <img src={e.photo} className="h-10 w-10 object-cover" /> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top font-medium text-gray-900 break-words">{e.name}</td>
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell text-gray-700">{e.employeeCode}</td>
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell">{e.department}</td>
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell">{e.phoneNumber || "—"}</td>
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top hidden sm:table-cell">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${e.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {e.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2 md:px-4 md:py-3 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        <a
                          href={`/dashboard/employees/${e._id}`}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          View
                        </a>
                        <button
                          data-action="toggle"
                          onClick={async () => {
                            const me = await fetch('/api/auth/me').then(r=>r.json());
                            if (!me.user || me.user.role!== 'admin') return alert('Only admin can change status');
                            await fetch(`/api/employees/${e._id}/toggle-active`, { method: "POST" });
                            load(page);
                          }}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {e.isActive ? "Deactivate" : "Activate"}
                        </button>
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
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} employees
            </div>
            <div className="flex gap-2 self-end md:self-auto">
              <button
                onClick={() => { const np = Math.max(1, page - 1); setPage(np); load(np); }}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => { const np = page + 1; setPage(np); load(np); }}
                disabled={page * limit >= total}
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


