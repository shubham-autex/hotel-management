"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./logout-button";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  Package,
  Users,
  Building2,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navSections: NavSection[] = [
    {
      title: "Main",
      items: [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          href: "/dashboard/booking/list",
          label: "Bookings",
          icon: <Calendar className="w-5 h-5" />,
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          href: "/dashboard/services/list",
          label: "Services",
          icon: <Package className="w-5 h-5" />,
        },
        {
          href: "/dashboard/providers",
          label: "Providers",
          icon: <Users className="w-5 h-5" />,
        },
        {
          href: "/dashboard/employees/list",
          label: "Employees",
          icon: <Users className="w-5 h-5" />,
        },
      ],
    },
    {
      title: "Settings",
      items: [
        {
          href: "/dashboard/company",
          label: "Company Profile",
          icon: <Building2 className="w-5 h-5" />,
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    // For list pages, also highlight when on add/edit pages
    if (href === "/dashboard/services/list") {
      return pathname.startsWith("/dashboard/services");
    }
    if (href === "/dashboard/providers") {
      return pathname.startsWith("/dashboard/providers") || pathname.startsWith("/dashboard/services/provider");
    }
    if (href === "/dashboard/employees/list") {
      return pathname.startsWith("/dashboard/employees");
    }
    if (href === "/dashboard/booking/list") {
      return pathname.startsWith("/dashboard/booking");
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-dvh flex bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-72 md:w-64
          bg-white/95 backdrop-blur-xl
          border-r border-purple-200/60
          shadow-xl md:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          flex flex-col
        `}
      >
        {/* Logo & Header */}
        <div className="p-6 border-b border-purple-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <img src="/logo-s.jpg" alt="Logo" className="w-10 h-10 rounded-lg" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-900">Hotel Admin</h2>
                <p className="text-xs text-gray-500 font-medium">Management Panel</p>
              </div>
            </div>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all duration-200
                        ${
                          active
                            ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30"
                            : "text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                        }
                      `}
                    >
                      <span className={`${active ? "text-white" : "text-purple-600 group-hover:text-purple-700"}`}>
                        {item.icon}
                      </span>
                      <span className="font-medium text-sm">{item.label}</span>
                      {active && (
                        <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-purple-100">
          <div className="px-3 py-2 text-xs text-gray-500">
            <p className="font-medium">© 2024 Hotel Admin</p>
            <p className="text-gray-400">All rights reserved</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-dvh md:ml-0">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-purple-200/60 flex items-center justify-between px-4 md:px-6 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="hidden md:flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                <img src="/logo-s.jpg" alt="Logo" className="w-7 h-7 rounded" />
              </div>
              <div className="font-semibold text-gray-900">Dashboard</div>
            </div>
          </div>
          <LogoutButton />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}


