import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, BarChart3, LogOut, Menu, X } from "lucide-react";
import { getUser, clearUser, type UserRole } from "@/lib/auth";
import PoweredByFooter from "@/components/PoweredByFooter";

const isGeneralRole = (role: UserRole) =>
  role === "GENERAL_ADMIN" || role === "GENERAL_VIEWER";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    clearUser();
    sessionStorage.removeItem("Siliyoung Enterprise_tmp_pwd");
    navigate("/", { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-foreground hover:bg-accent"
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <h1 className="text-lg font-bold text-foreground">
          Siliyoung Enterprise <span className="text-primary">ERP</span>
        </h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {user.firstName} {user.lastName} · {user.role.replace(/_/g, " ")}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLink
          to="/dashboard"
          end
          className={navLinkClass}
          onClick={() => setSidebarOpen(false)}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </NavLink>

        {isGeneralRole(user.role) && (
          <>
            <NavLink
              to="/dashboard/users"
              className={navLinkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <Users className="w-4 h-4" />
              User Management
            </NavLink>
            <NavLink
              to="/dashboard/analytics"
              className={navLinkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </NavLink>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/5 transition"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      <div className="px-3 pb-2">
        <PoweredByFooter />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background safe-top">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-card border-r border-border z-30">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-foreground"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-foreground">
            Siliyoung Enterprise <span className="text-primary">ERP</span>
          </h1>
          <div className="w-6" />
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
