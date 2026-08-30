import { BarChart3, TrendingUp, DollarSign, Package, Users, Activity } from "lucide-react";

const comingFeatures = [
  { icon: DollarSign, title: "Revenue Overview", desc: "Aggregate sales and revenue across all branches" },
  { icon: TrendingUp, title: "Growth Trends", desc: "Track month-over-month performance organization-wide" },
  { icon: Package, title: "Inventory Insights", desc: "Stock levels, turnover rates, and alerts across branches" },
  { icon: Users, title: "Customer Analytics", desc: "Customer acquisition and retention metrics per branch" },
  { icon: BarChart3, title: "Branch Comparison", desc: "Compare performance metrics between branches" },
  { icon: Activity, title: "Activity Summary", desc: "Organization-wide activity and audit trail overview" },
];

export default function Analytics() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-1">Organization Analytics</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Aggregate insights and statistics across all branches in your organization.
      </p>

      <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 mb-8 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-primary mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Coming Soon</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Organization-level analytics are being built. You'll soon be able to view real-time aggregate data from every branch in one place.
        </p>
      </div>

      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">What to expect</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {comingFeatures.map((f) => (
          <div key={f.title} className="bg-card border border-border rounded-xl p-4 flex gap-3 items-start">
            <div className="bg-primary/10 rounded-lg p-2 shrink-0">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
