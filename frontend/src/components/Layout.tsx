import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Upload, History, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "อัปโหลด" },
  { to: "/history", icon: History, label: "ประวัติ" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { logout, getUser } = useAuth();
  const { pathname } = useLocation();
  const user = getUser();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-brand-600">💰 Expense Tracker</h1>
          {user && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">@{user.username}</p>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === to
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <LogOut size={18} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
