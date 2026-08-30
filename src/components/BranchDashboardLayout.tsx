import { useState } from "react";
import { Outlet, NavLink, useNavigate, useParams } from "react-router-dom";
import {
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  Receipt,
  BarChart3,
  ScrollText,
  UserCog,
  User,
  ArrowLeft,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { getUser, clearUser, type UserRole } from "@/lib/auth";
import PoweredByFooter from "@/components/PoweredByFooter";

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  excludeRoles?: UserRole[];
};

export default function BranchDashboardLayout() {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    clearUser();
    sessionStorage.removeItem("Siliyoung Enterprise_tmp_pwd");
    navigate("/", { replace: true });
  };

  const base = `/dashboard/branch/${branchId}`;

  const navItems: NavItem[] = [
    { label: "Customers", to: `${base}/customers`, icon: <Users className="w-4 h-4" />, excludeRoles: ["GENERAL_VIEWER"] },
    { label: "Inventory", to: `${base}/inventory`, icon: <Package className="w-4 h-4" /> },
    { label: "Sales", to: `${base}/sales`, icon: <ShoppingCart className="w-4 h-4" /> },
    { label: "Payments", to: `${base}/payments`, icon: <CreditCard className="w-4 h-4" /> },
    { label: "Expenses", to: `${base}/expenses`, icon: <Receipt className="w-4 h-4" /> },
    { label: "Analytics", to: `${base}/analytics`, icon: <BarChart3 className="w-4 h-4" />, excludeRoles: ["BRANCH_MEMBER"] },
    { label: "Activity Logs", to: `${base}/activity`, icon: <ScrollText className="w-4 h-4" /> },
    { label: "User Management", to: `${base}/users`, icon: <UserCog className="w-4 h-4" />, roles: ["GENERAL_ADMIN", "BRANCH_ADMIN"] },
    { label: "My Profile", to: `${base}/profile`, icon: <User className="w-4 h-4" /> },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.roles && !item.roles.includes(user.role)) return false;
    if (item.excludeRoles && item.excludeRoles.includes(user.role)) return false;
    return true;
  });

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-foreground hover:bg-accent"
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-border">
        <h1 className="text-lg font-bold text-foreground">
          Siliyoung Enterprise <span className="text-primary">ERP</span>
        </h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Branch Dashboard
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <button
          onClick={() => { setSidebarOpen(false); navigate("/dashboard"); }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition w-full"
        >
          <ArrowLeft className="w-4 h-4" />
          Main Dashboard
        </button>

        <div className="h-px bg-border my-2" />

        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={navLinkClass}
            onClick={() => setSidebarOpen(false)}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

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
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-card border-r border-border z-30">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
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
