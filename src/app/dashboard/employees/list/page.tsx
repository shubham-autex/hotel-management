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

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
        <p className="text-gray-500">List of all employees</p>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code, phone"
              className="border rounded-lg px-3 py-2 w-64"
            />
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="border rounded-lg px-3 py-2">
              <option value="">All Departments</option>
              <option>Cleaning</option>
              <option>Management</option>
              <option>Electicity</option>
            </select>
            <button onClick={() => load(1)} className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg">
              Apply
            </button>
          </div>
          <div className="text-sm text-gray-500">{total} results</div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 px-3">Photo</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Code</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Phone</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-6 text-center" colSpan={7}>Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="py-6 text-center" colSpan={7}>No employees found</td></tr>
              ) : (
                items.map((e) => (
                  <tr key={e._id} className="bg-white/80 backdrop-blur border border-purple-200/50 shadow-sm">
                    <td className="py-2 px-3"><div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">{e.photo ? <img src={e.photo} className="h-10 w-10 object-cover" /> : null}</div></td>
                    <td className="py-2 px-3 font-medium text-gray-900">{e.name}</td>
                    <td className="py-2 px-3 text-gray-700">{e.employeeCode}</td>
                    <td className="py-2 px-3">{e.department}</td>
                    <td className="py-2 px-3">{e.phoneNumber || "—"}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${e.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${e.isActive ? "bg-green-600" : "bg-gray-500"}`}></span>
                        {e.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <a href={`/dashboard/employees/${e._id}`} className="px-2 py-1 border rounded hover:bg-purple-50">View</a>
                        <button data-action="toggle" onClick={async () => { const me = await fetch('/api/auth/me').then(r=>r.json()); if (!me.user || me.user.role!== 'admin') return alert('Only admin can change status'); await fetch(`/api/employees/${e._id}/toggle-active`, { method: "POST" }); load(page); }} className="px-2 py-1 border rounded hover:bg-purple-50">
                          {e.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => { const np = page - 1; setPage(np); load(np); }} className="px-3 py-1.5 border rounded disabled:opacity-50">Prev</button>
            <span className="text-sm">Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => { const np = page + 1; setPage(np); load(np); }} className="px-3 py-1.5 border rounded disabled:opacity-50">Next</button>
          </div>
          <select value={limit} onChange={(e) => { const l = Number(e.target.value); setLimit(l); load(1, l); }} className="border rounded px-2 py-1 text-sm">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  );
}


