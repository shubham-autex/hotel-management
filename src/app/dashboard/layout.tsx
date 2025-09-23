"use client";
import Link from "next/link";
import LogoutButton from "./logout-button";
import { useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh grid md:grid-cols-[280px_1fr] bg-gradient-to-br from-purple-50 to-purple-100">
      <aside className={`bg-white/80 backdrop-blur-md border-r border-purple-200/50 p-6 space-y-6 fixed md:static inset-y-0 left-0 w-72 md:w-auto z-40 transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-s.jpg" alt="Logo" className="w-10 h-10 rounded" />
            <div>
              <h2 className="font-bold text-lg text-gray-900">Hotel Admin</h2>
              <p className="text-xs text-gray-500">Management Panel</p>
            </div>
          </div>
          <button 
            className="md:hidden p-1 rounded hover:bg-gray-100" 
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-3">Services</p>
                <div className="space-y-1">
                  <Link className="block text-sm rounded-lg px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition-colors" href="/dashboard/services/list">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      List
                    </span>
                  </Link>
                  <Link className="block text-sm rounded-lg px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition-colors" href="/dashboard/services/add">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add
                    </span>
                  </Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-3">Providers</p>
                <div className="space-y-1">
                  <Link className="block text-sm rounded-lg px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition-colors" href="/dashboard/providers">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      List
                    </span>
                  </Link>
                  <Link className="block text-sm rounded-lg px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition-colors" href="/dashboard/services/provider">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add
                    </span>
                  </Link>
                </div>
              </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-3">Employees</p>
            <div className="space-y-1 ml-0">
              <Link className="block text-sm rounded-lg px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition-colors" href="/dashboard/employees/list">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1" />
                  </svg>
                  List
                </span>
              </Link>
              <Link className="block text-sm rounded-lg px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition-colors" href="/dashboard/employees/add">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add
                </span>
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-3">Booking</p>
            <div className="space-y-1 ml-0">
              <Link className="block text-sm rounded-lg px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition-colors" href="/dashboard/booking/list">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10" />
                  </svg>
                  List
                </span>
              </Link>
              <Link className="block text-sm rounded-lg px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition-colors" href="/dashboard/booking/add">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add
                </span>
              </Link>
            </div>
          </div>
        </nav>
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-3">Company</p>
          <div className="space-y-1 ml-0">
            <Link className="block text-sm rounded-lg px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition-colors" href="/dashboard/company">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4" />
                </svg>
                Profile
              </span>
            </Link>
          </div>
        </div>
      </aside>
      <div className="flex flex-col min-h-dvh">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-purple-200/50 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded border border-gray-200" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <img src="/logo-s.jpg" alt="Logo" className="w-8 h-8 rounded" />
            <div className="font-semibold text-gray-900">Dashboard</div>
          </div>
          <LogoutButton />
        </header>
        <main className="p-4 md:p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}


