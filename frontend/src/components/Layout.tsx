import { type ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Upload, History, LogOut, ShieldCheck, FileSpreadsheet, Settings, X, Check, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, THEMES, type ThemeId } from "@/hooks/useTheme";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "อัปโหลด" },
  { to: "/history", icon: History, label: "ประวัติ" },
  { to: "/report", icon: FileSpreadsheet, label: "สรุปรายงาน" },
];

function ThemePicker({ onClose }: { onClose: () => void }) {
  const { setTheme, getCurrentTheme } = useTheme();
  const [active, setActive] = useState<ThemeId>(getCurrentTheme());

  const handlePick = (id: ThemeId) => {
    setTheme(id);
    setActive(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-[340px] rounded-2xl shadow-2xl p-5 space-y-4"
        style={{ backgroundColor: "var(--card)", color: "var(--text)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">🎨 เลือกธีม</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>บันทึกอัตโนมัติในเบราว์เซอร์นี้</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Theme list */}
        <div className="space-y-2">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handlePick(theme.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
              style={{
                borderColor: active === theme.id ? "var(--primary)" : "var(--border)",
                backgroundColor: active === theme.id ? "var(--primary-light)" : "transparent",
              }}
            >
              {/* Color swatches */}
              <div className="flex gap-1 shrink-0">
                <div className="w-7 h-7 rounded-lg border" style={{ backgroundColor: theme.preview.bg, borderColor: "var(--border)" }} />
                <div className="flex flex-col gap-1">
                  <div className="w-3.5 h-3 rounded-sm" style={{ backgroundColor: theme.preview.primary }} />
                  <div className="w-3.5 h-3 rounded-sm" style={{ backgroundColor: theme.preview.income }} />
                </div>
                <div className="flex flex-col justify-end gap-1">
                  <div className="w-3.5 h-3 rounded-sm" style={{ backgroundColor: theme.preview.expense }} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{theme.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{theme.description}</p>
              </div>

              {active === theme.id && (
                <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--primary)" }}>
                  <Check size={12} color="white" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { logout, getUser } = useAuth();
  const { pathname } = useLocation();
  const user = getUser();
  const isAdmin = user?.role === "admin";
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  // Close drawer on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    window.addEventListener("themechange", handler);
    return () => window.removeEventListener("themechange", handler);
  }, []);

  // Sidebar nav items shared between desktop and mobile drawer
  const navItems = (
    <>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            style={
              pathname === to
                ? { backgroundColor: "var(--nav-active)", color: "var(--nav-active-text)" }
                : { color: "var(--text-muted)" }
            }
            onMouseEnter={(e) => {
              if (pathname !== to) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--nav-hover)";
            }}
            onMouseLeave={(e) => {
              if (pathname !== to) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            style={
              pathname === "/admin"
                ? { backgroundColor: "var(--nav-active)", color: "var(--nav-active-text)" }
                : { color: "var(--text-muted)" }
            }
            onMouseEnter={(e) => {
              if (pathname !== "/admin") (e.currentTarget as HTMLElement).style.backgroundColor = "var(--nav-hover)";
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/admin") (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <ShieldCheck size={18} />
            Admin Panel
          </Link>
        )}
      </nav>
      <div className="p-3 space-y-1" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <button
          onClick={() => setShowThemePicker(true)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--nav-hover)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
        >
          <Settings size={18} />
          ตั้งค่าธีม
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--nav-hover)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
        >
          <LogOut size={18} />
          ออกจากระบบ
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>

      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile drawer (slides in from left) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col transform transition-transform duration-200 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <div>
            <h1 className="text-base font-bold" style={{ color: "var(--primary)" }}>💰 Expense Tracker</h1>
            {user && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>@{user.username}</p>
                {isAdmin && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}>
                    Admin
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>
        {navItems}
      </aside>

      {/* ── Desktop sidebar (always visible) ── */}
      <aside
        className="hidden md:flex w-56 flex-col shrink-0"
        style={{ backgroundColor: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        <div className="p-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <h1 className="text-lg font-bold" style={{ color: "var(--primary)" }}>💰 Expense Tracker</h1>
          {user && (
            <div className="mt-0.5 flex items-center gap-1.5">
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>@{user.username}</p>
              {isAdmin && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}>
                  Admin
                </span>
              )}
            </div>
          )}
        </div>
        {navItems}
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ backgroundColor: "var(--sidebar)", borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <button onClick={() => setSidebarOpen(true)} style={{ color: "var(--text-muted)" }}>
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold" style={{ color: "var(--primary)" }}>💰 Expense Tracker</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto" style={{ color: "var(--text)" }}>{children}</main>
      </div>

      {/* Theme Picker Modal */}
      {showThemePicker && <ThemePicker onClose={() => setShowThemePicker(false)} />}
    </div>
  );
}

