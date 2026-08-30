import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { toLagosDate } from "@/lib/date";
import { toast } from "@/hooks/use-toast";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Package, Users,
  ShieldAlert, Activity, Loader2, AlertTriangle, Clock, Trophy,
} from "lucide-react";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";

/* ─── Types ─── */
interface ProfitLoss { totalRevenue: number; totalCOGS: number; grossProfit: number; totalExpenses: number; netProfit: number; }
interface CashFlow { totalInvoiced: number; totalCollected: number; outstandingReceivables: number; collectionRate: string; }
interface CategorySpend { _sum: { amount: string }; _count: { _all: number }; category: string; }
interface TopItem { name: string; quantitySold: number; totalRevenue: number; transactionCount: number; }
interface DebtVelocity { averageDaysToPay: string; sampleSize: number; }
interface StaffPerf { staffName: string; totalSalesValue: number; totalSalesCount: number; }
interface LossAnalysis { returns: { count: number; totalQuantity: number }; writeOffs: { count: number; totalQuantity: number }; }
interface InvValuation { totalCostValue: number; totalRetailValue: number; }
interface DeadStock { id: string; name: string; quantity: string; updatedAt: string; }
interface CustomerLTV { customerName: string; lifetimeValue: number; totalOrders: number; }

/* ─── Helpers ─── */
function naira(v: number | string) { return `₦${Number(v).toLocaleString("en-NG")}`; }

function getRange(preset: string, cs: string, ce: string) {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (preset) {
    case "today": return { start: fmt(today), end: fmt(today) };
    case "7days": return { start: fmt(subDays(today, 7)), end: fmt(today) };
    case "month": return { start: fmt(startOfMonth(today)), end: fmt(today) };
    case "year": return { start: fmt(startOfYear(today)), end: fmt(today) };
    case "custom": return { start: cs, end: ce };
    default: return { start: fmt(today), end: fmt(today) };
  }
}

/* ─── Date Range Selector ─── */
function DateRangeSelector({ preset, onPreset, customStart, customEnd, onCustomStart, onCustomEnd }: {
  preset: string; onPreset: (v: string) => void;
  customStart: string; customEnd: string;
  onCustomStart: (v: string) => void; onCustomEnd: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        { v: "today", l: "Today" }, { v: "7days", l: "7 Days" },
        { v: "month", l: "This Month" }, { v: "year", l: "This Year" }, { v: "custom", l: "Custom" },
      ].map(b => (
        <button key={b.v} onClick={() => onPreset(b.v)}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${preset === b.v ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-accent"}`}>
          {b.l}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={e => onCustomStart(e.target.value)}
            className="px-2 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground outline-none" />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="date" value={customEnd} onChange={e => onCustomEnd(e.target.value)}
            className="px-2 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground outline-none" />
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: any; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg bg-primary/10 ${color}`}><Icon size={16} /></div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Loading Spinner ─── */
function SectionLoader() {
  return <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-primary" /></div>;
}

/* ═══════════════════════════════════════════ */
export default function BranchAnalytics() {
  const { branchId } = useParams();

  /* ─ Date filter ─ */
  const [preset, setPreset] = useState("today");
  const [customStart, setCustomStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  /* ─ Time-filtered data ─ */
  const [pnl, setPnl] = useState<ProfitLoss | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null);
  const [categorySpend, setCategorySpend] = useState<CategorySpend[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [debtVelocity, setDebtVelocity] = useState<DebtVelocity | null>(null);
  const [staffPerf, setStaffPerf] = useState<StaffPerf[]>([]);
  const [lossAnalysis, setLossAnalysis] = useState<LossAnalysis | null>(null);
  const [loadingTimed, setLoadingTimed] = useState(false);

  /* ─ Non-time-filtered data ─ */
  const [invValuation, setInvValuation] = useState<InvValuation | null>(null);
  const [deadStock, setDeadStock] = useState<DeadStock[]>([]);
  const [deadStockDays, setDeadStockDays] = useState("");
  const [deadStockLoading, setDeadStockLoading] = useState(false);
  const [customerLTV, setCustomerLTV] = useState<CustomerLTV[]>([]);
  const [loadingStatic, setLoadingStatic] = useState(false);

  /* ─ Fetch time-filtered analytics ─ */
  async function fetchTimedAnalytics() {
    if (!branchId) return;
    setLoadingTimed(true);
    const { start, end } = getRange(preset, customStart, customEnd);
    const qs = `start_date=${start}&end_date=${end}`;

    try {
      const [pnlRes, cfRes, csRes, tiRes, dvRes, spRes, laRes] = await Promise.allSettled([
        apiRequest(`/analytics/profit-loss/${branchId}?${qs}`),
        apiRequest(`/analytics/cash-flow-summary/${branchId}?${qs}`),
        apiRequest(`/analytics/category-spend-analysis/${branchId}?${qs}`),
        apiRequest(`/analytics/top-selling-items/${branchId}?${qs}`),
        apiRequest(`/analytics/debts-velocity/${branchId}?${qs}`),
        apiRequest(`/analytics/staff-performance/${branchId}?${qs}`),
        apiRequest(`/analytics/loss-analysis/${branchId}?${qs}`),
      ]) as PromiseSettledResult<any>[];

      if (pnlRes.status === "fulfilled") setPnl(pnlRes.value.data);
      if (cfRes.status === "fulfilled") setCashFlow(cfRes.value.data);
      if (csRes.status === "fulfilled") setCategorySpend(csRes.value.data || []);
      if (tiRes.status === "fulfilled") setTopItems(tiRes.value.data || []);
      if (dvRes.status === "fulfilled") setDebtVelocity(dvRes.value.data);
      if (spRes.status === "fulfilled") setStaffPerf(spRes.value.data || []);
      if (laRes.status === "fulfilled") setLossAnalysis(laRes.value.data);
    } catch {
      // individual failures handled by Promise.allSettled
    }
    setLoadingTimed(false);
  }

  /* ─ Fetch static analytics (no time filter) ─ */
  async function fetchStaticAnalytics() {
    if (!branchId) return;
    setLoadingStatic(true);
    try {
      const [ivRes, ltvRes] = await Promise.allSettled([
        apiRequest(`/analytics/inventory-valuation/${branchId}`),
        apiRequest(`/analytics/customer-ltv/${branchId}`),
      ]) as PromiseSettledResult<any>[];
      if (ivRes.status === "fulfilled") setInvValuation(ivRes.value.data);
      if (ltvRes.status === "fulfilled") setCustomerLTV(ltvRes.value.data || []);
    } catch { /* */ }
    setLoadingStatic(false);
  }

  async function fetchDeadStock() {
    if (!branchId || !deadStockDays || Number(deadStockDays) <= 0) return;
    setDeadStockLoading(true);
    try {
      const res: any = await apiRequest(`/analytics/dead-stock-report/${branchId}?days=${deadStockDays}`);
      setDeadStock(res.data || []);
    } catch { /* */ }
    setDeadStockLoading(false);
  }

  useEffect(() => { fetchTimedAnalytics(); }, [branchId, preset, customStart, customEnd]);
  useEffect(() => { fetchStaticAnalytics(); }, [branchId]);

  /* ─ Derived ─ */
  const totalCategorySpend = categorySpend.reduce((s, c) => s + Number(c._sum.amount), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Analytics</h2>
        <p className="text-sm text-muted-foreground">Branch performance insights and reports</p>
      </div>

      {/* Date Filter */}
      <DateRangeSelector preset={preset} onPreset={setPreset}
        customStart={customStart} customEnd={customEnd}
        onCustomStart={setCustomStart} onCustomEnd={setCustomEnd} />

      {loadingTimed ? <SectionLoader /> : (
        <div className="space-y-6">

          {/* ════ PROFIT & LOSS ════ */}
          {pnl && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <DollarSign size={16} className="text-primary" /> Profit & Loss
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard icon={TrendingUp} label="Revenue" value={naira(pnl.totalRevenue)} />
                <StatCard icon={Package} label="Cost of Goods" value={naira(pnl.totalCOGS)} color="text-orange-500" />
                <StatCard icon={TrendingUp} label="Gross Profit" value={naira(pnl.grossProfit)} color="text-emerald-600" />
                <StatCard icon={TrendingDown} label="Expenses" value={naira(pnl.totalExpenses)} color="text-red-500" />
                <StatCard icon={DollarSign} label="Net Profit" value={naira(pnl.netProfit)}
                  color={pnl.netProfit >= 0 ? "text-emerald-600" : "text-red-500"}
                  sub={pnl.netProfit >= 0 ? "Profitable" : "Loss"} />
              </div>
            </section>
          )}

          {/* ════ CASH FLOW ════ */}
          {cashFlow && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity size={16} className="text-primary" /> Cash Flow Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={DollarSign} label="Total Invoiced" value={naira(cashFlow.totalInvoiced)} />
                <StatCard icon={TrendingUp} label="Collected" value={naira(cashFlow.totalCollected)} color="text-emerald-600" />
                <StatCard icon={AlertTriangle} label="Outstanding" value={naira(cashFlow.outstandingReceivables)} color="text-orange-500" />
                <StatCard icon={BarChart3} label="Collection Rate" value={`${cashFlow.collectionRate}%`}
                  color={Number(cashFlow.collectionRate) >= 70 ? "text-emerald-600" : "text-orange-500"}
                  sub={Number(cashFlow.collectionRate) >= 70 ? "Healthy" : "Needs attention"} />
              </div>
            </section>
          )}

          {/* ════ TOP SELLING ITEMS ════ */}
          {topItems.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Trophy size={16} className="text-primary" /> Top Selling Items
              </h3>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">#</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Item</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Qty Sold</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Revenue</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItems.map((item, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                          <td className="px-4 py-3 text-right text-foreground">{item.quantitySold}</td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">{naira(item.totalRevenue)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{item.transactionCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ════ CATEGORY SPEND ════ */}
          {categorySpend.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 size={16} className="text-primary" /> Expense by Category
              </h3>
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                {categorySpend.map((c, i) => {
                  const amt = Number(c._sum.amount);
                  const pct = totalCategorySpend > 0 ? (amt / totalCategorySpend * 100).toFixed(1) : "0";
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">{c.category}</span>
                        <span className="text-foreground font-semibold">{naira(amt)} <span className="text-xs text-muted-foreground ml-1">({pct}%)</span></span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{c._count._all} transaction{c._count._all !== 1 ? "s" : ""}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ════ STAFF PERFORMANCE ════ */}
          {staffPerf.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users size={16} className="text-primary" /> Staff Sales Performance
              </h3>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Sales Value</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Sales Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffPerf.map((s, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium text-foreground">{s.staffName}</td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">{naira(s.totalSalesValue)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{s.totalSalesCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ════ DEBT VELOCITY & LOSS ANALYSIS ════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {debtVelocity && (
              <div className="bg-card rounded-xl border border-border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock size={16} className="text-primary" /> Debt Velocity
                </h3>
                <p className="text-2xl font-bold text-foreground">{Number(debtVelocity.averageDaysToPay).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">days</span></p>
                <p className="text-xs text-muted-foreground">Average time customers take to pay, based on {debtVelocity.sampleSize} payment{debtVelocity.sampleSize !== 1 ? "s" : ""}</p>
              </div>
            )}

            {lossAnalysis && (
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-500" /> Loss Analysis
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Returns</p>
                    <p className="text-lg font-bold text-foreground">{lossAnalysis.returns.totalQuantity} <span className="text-xs font-normal text-muted-foreground">units</span></p>
                    <p className="text-xs text-muted-foreground">{lossAnalysis.returns.count} incident{lossAnalysis.returns.count !== 1 ? "s" : ""}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Write-offs</p>
                    <p className="text-lg font-bold text-foreground">{lossAnalysis.writeOffs.totalQuantity} <span className="text-xs font-normal text-muted-foreground">units</span></p>
                    <p className="text-xs text-muted-foreground">{lossAnalysis.writeOffs.count} incident{lossAnalysis.writeOffs.count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* STATIC (non-time-filtered) SECTIONS */}
      {/* ════════════════════════════════════════════ */}
      <div className="border-t border-border pt-6 space-y-6">
        <h3 className="text-base font-semibold text-foreground">Current Snapshots</h3>

        {loadingStatic ? <SectionLoader /> : (
          <div className="space-y-6">

            {/* ════ INVENTORY VALUATION ════ */}
            {invValuation && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package size={16} className="text-primary" /> Inventory Valuation
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StatCard icon={DollarSign} label="Total Cost Value" value={naira(invValuation.totalCostValue)}
                    sub="What you paid for current stock" color="text-orange-500" />
                  <StatCard icon={TrendingUp} label="Total Retail Value" value={naira(invValuation.totalRetailValue)}
                    sub="What current stock is worth at selling price" color="text-emerald-600" />
                </div>
                {invValuation.totalRetailValue > invValuation.totalCostValue && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Potential margin: {naira(invValuation.totalRetailValue - invValuation.totalCostValue)} ({((invValuation.totalRetailValue - invValuation.totalCostValue) / invValuation.totalCostValue * 100).toFixed(1)}%)
                  </p>
                )}
              </section>
            )}

            {/* ════ CUSTOMER LTV ════ */}
            {customerLTV.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users size={16} className="text-primary" /> Customer Lifetime Value
                </h3>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Customer</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Lifetime Value</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerLTV.map((c, i) => (
                          <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium text-foreground">{c.customerName}</td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground">{naira(c.lifetimeValue)}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{c.totalOrders}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* ════ DEAD STOCK ════ */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" /> Dead Stock Report
              </h3>
              <p className="text-xs text-muted-foreground">Inventory items with zero sales within a period you specify. Enter the number of days to check.</p>
              <div className="flex items-center gap-2">
                <input type="number" value={deadStockDays} onChange={e => setDeadStockDays(e.target.value)}
                  placeholder="e.g. 30" min="1"
                  className="w-28 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                <span className="text-xs text-muted-foreground">days</span>
                <button onClick={fetchDeadStock} disabled={deadStockLoading || !deadStockDays || Number(deadStockDays) <= 0}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {deadStockLoading ? "Checking…" : "Check"}
                </button>
              </div>

              {deadStock.length > 0 && (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Item</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Stock Qty</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Last Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deadStock.map(item => (
                          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                            <td className="px-4 py-3 text-right text-foreground">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{toLagosDate(item.updatedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {deadStock.length === 0 && deadStockDays && !deadStockLoading && (
                <p className="text-xs text-muted-foreground bg-card rounded-lg border border-border p-3">No dead stock found for the last {deadStockDays} days. All items had sales activity.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
