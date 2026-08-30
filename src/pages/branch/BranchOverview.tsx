import { useParams, useNavigate } from "react-router-dom";
import { getUser, type UserRole } from "@/lib/auth";
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
} from "lucide-react";

type QuickAction = {
  label: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  excludeRoles?: UserRole[];
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function BranchOverview() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  if (!user) return null;

  const base = `/dashboard/branch/${branchId}`;

  const actions: QuickAction[] = [
    { label: "Customers", description: "View and manage customers", to: `${base}/customers`, icon: <Users className="w-5 h-5" />, excludeRoles: ["GENERAL_VIEWER"] },
    { label: "Inventory", description: "Track stock and products", to: `${base}/inventory`, icon: <Package className="w-5 h-5" /> },
    { label: "Sales", description: "Record and view sales", to: `${base}/sales`, icon: <ShoppingCart className="w-5 h-5" /> },
    { label: "Payments", description: "Manage payment records", to: `${base}/payments`, icon: <CreditCard className="w-5 h-5" /> },
    { label: "Expenses", description: "Log and review expenses", to: `${base}/expenses`, icon: <Receipt className="w-5 h-5" /> },
    { label: "Analytics", description: "View performance insights", to: `${base}/analytics`, icon: <BarChart3 className="w-5 h-5" />, excludeRoles: ["BRANCH_MEMBER"] },
    { label: "Activity Logs", description: "Browse recent activity", to: `${base}/activity`, icon: <ScrollText className="w-5 h-5" /> },
    { label: "User Management", description: "Manage branch users", to: `${base}/users`, icon: <UserCog className="w-5 h-5" />, roles: ["GENERAL_ADMIN", "BRANCH_ADMIN"] },
    { label: "My Profile", description: "Update your password", to: `${base}/profile`, icon: <User className="w-5 h-5" /> },
  ];

  const visibleActions = actions.filter((a) => {
    if (a.roles && !a.roles.includes(user.role)) return false;
    if (a.excludeRoles && a.excludeRoles.includes(user.role)) return false;
    return true;
  });

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-1">
        {getGreeting()}, {user.firstName} 👋
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Use this dashboard to manage sales, inventory, payments, expenses, and more for this branch. Pick a quick action below to get started.
      </p>

      <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visibleActions.map((action) => (
          <button
            key={action.to}
            onClick={() => navigate(action.to)}
            className="bg-card rounded-xl border border-border p-4 text-left hover:border-primary/40 hover:shadow-sm transition flex flex-col gap-2"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {action.icon}
            </div>
            <p className="text-sm font-semibold text-foreground">{action.label}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{action.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
