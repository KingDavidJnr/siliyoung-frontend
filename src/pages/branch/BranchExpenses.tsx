import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { toLagosDateTime, toLagosDate } from "@/lib/date";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, X, Search, Eye, Edit2, BarChart3, ChevronDown,
} from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";

/* ─── Types ─── */
interface Expense {
  id: string;
  branchId: string;
  category: string;
  amount: string;
  note: string | null;
  expenseDate: string;
  createdBy: string;
  createdAt: string;
  user?: { username: string };
}

interface ExpenseReport {
  summary: {
    totalSpent: number;
    transactionCount: number;
    averageExpense: number;
    highestSingleExpense: number;
  };
  categoricalBreakdown: {
    category: string;
    total: number;
    count: number;
    percentage: string;
  }[];
}

type Tab = "expenses" | "reports";

/* ─── Category config ─── */
const CATEGORIES = [
  { value: "Equipment", hint: "Machinery, tools, devices" },
  { value: "Fuel", hint: "Petrol, diesel, gas" },
  { value: "Import", hint: "Goods shipped from abroad" },
  { value: "Inventory", hint: "Stock & product purchases" },
  { value: "Loading", hint: "Loading & offloading costs" },
  { value: "Maintenance", hint: "Repairs & upkeep" },
  { value: "Marketing", hint: "Ads, promos, branding" },
  { value: "Miscellaneous", hint: "Other uncategorized costs" },
  { value: "Packaging", hint: "Wrapping, bags, containers" },
  { value: "Permits", hint: "Licenses & legal permits" },
  { value: "Power", hint: "Generator, electricity bills" },
  { value: "Rent", hint: "Warehouse, shop, office rent" },
  { value: "Repairs", hint: "Fixing broken items/assets" },
  { value: "Salaries", hint: "Staff wages & bonuses" },
  { value: "Security", hint: "Guards, CCTV, safety" },
  { value: "Storage", hint: "Warehousing & storage fees" },
  { value: "Supplies", hint: "Office & cleaning supplies" },
  { value: "Taxes", hint: "Government levies & duties" },
  { value: "Transport", hint: "Delivery & logistics costs" },
  { value: "Utilities", hint: "Water, internet, phone" },
];

/* ─── Helpers ─── */
function naira(v: string | number) {
  return `₦${Number(v).toLocaleString("en-NG")}`;
}

function getRange(preset: string, cs: string, ce: string) {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (preset) {
    case "today": return { start: fmt(today), end: fmt(today) };
    case "7days": return { start: fmt(subDays(today, 7)), end: fmt(today) };
    case "month": return { start: fmt(startOfMonth(today)), end: fmt(today) };
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
        { v: "month", l: "This Month" }, { v: "custom", l: "Custom" },
      ].map(b => (
        <button key={b.v} onClick={() => onPreset(b.v)}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${preset === b.v ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-accent"}`}>
          {b.l}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={e => onCustomStart(e.target.value)}
            className="px-2 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground" />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="date" value={customEnd} onChange={e => onCustomEnd(e.target.value)}
            className="px-2 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground" />
        </div>
      )}
    </div>
  );
}

/* ─── Category Selector (mobile-friendly custom dropdown) ─── */
function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [open, setOpen] = useState(false);

  const isPreset = CATEGORIES.find(c => c.value === value);
  const isCustom = showCustom;

  if (isCustom) {
    return (
      <div className="flex gap-2">
        <input type="text" value={customValue} onChange={e => { setCustomValue(e.target.value); onChange(e.target.value); }}
          placeholder="Enter custom category"
          className="flex-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
        <button type="button" onClick={() => { setShowCustom(false); setCustomValue(""); onChange(""); }}
          className="px-3 py-2 text-xs border border-border rounded-lg hover:bg-accent text-muted-foreground">
          Back
        </button>
      </div>
    );
  }

  // Show dropdown — display current value even if not in presets
  const displayLabel = isPreset ? isPreset.value : (value || "");

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none">
        <span className={displayLabel ? "text-foreground" : "text-muted-foreground"}>
          {displayLabel || "Select category"}
        </span>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 sm:bg-transparent sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:right-0 sm:mt-1"
          onClick={() => setOpen(false)}>
          <div className="bg-background border border-border rounded-xl w-[90vw] sm:w-full max-h-[70vh] overflow-y-auto shadow-lg"
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b border-border p-3 flex items-center justify-between sm:hidden">
              <span className="text-sm font-semibold text-foreground">Select Category</span>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-accent text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-1">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button"
                  onClick={() => { onChange(c.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${value === c.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}>
                  <span className="font-medium">{c.value}</span>
                  <span className="text-muted-foreground ml-1.5 text-xs">— {c.hint}</span>
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <button type="button" onClick={() => { setShowCustom(true); setOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-primary hover:bg-accent font-medium">
                  + Use custom category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
export default function BranchExpenses() {
  const { branchId } = useParams();
  const [tab, setTab] = useState<Tab>("expenses");

  /* ─ List state ─ */
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [preset, setPreset] = useState("today");
  const [customStart, setCustomStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  /* ─ Create state ─ */
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ category: "", amount: "", expenseDate: format(new Date(), "yyyy-MM-dd"), note: "" });

  /* ─ Detail / Edit state ─ */
  const [detail, setDetail] = useState<Expense | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ category: "", amount: "", expenseDate: "", note: "" });
  const [saving, setSaving] = useState(false);

  /* ─ Report state ─ */
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [reportPreset, setReportPreset] = useState("today");
  const [reportCS, setReportCS] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportCE, setReportCE] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportLoading, setReportLoading] = useState(false);

  /* ─ Delete state ─ */
  const [deleting, setDeleting] = useState<string | null>(null);

  /* ═══ Fetch expenses ═══ */
  async function fetchExpenses() {
    if (!branchId) return;
    setLoading(true);
    try {
      const { start, end } = getRange(preset, customStart, customEnd);
      const res = await apiRequest<Expense[]>(`/expenses/${branchId}?start_date=${start}&end_date=${end}`);
      setExpenses(res.data);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchExpenses(); }, [branchId, preset, customStart, customEnd]);

  /* ═══ Create ═══ */
  async function handleCreate() {
    if (!branchId || !form.category || !form.amount) return;
    setCreating(true);
    try {
      const payload: any = {
        category: form.category,
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
      };
      if (form.note.trim()) payload.note = form.note;
      const res = await apiRequest(`/expenses/${branchId}`, { method: "POST", body: JSON.stringify(payload) });
      toast({ title: "Success", description: res.message });
      setShowCreate(false);
      setForm({ category: "", amount: "", expenseDate: format(new Date(), "yyyy-MM-dd"), note: "" });
      fetchExpenses();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setCreating(false); }
  }

  /* ═══ View detail ═══ */
  async function viewDetail(id: string) {
    if (!branchId) return;
    try {
      const res = await apiRequest<Expense>(`/expenses/${branchId}/${id}`);
      setDetail(res.data);
      setShowDetail(true);
      setEditing(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  /* ═══ Update ═══ */
  async function handleUpdate() {
    if (!branchId || !detail) return;
    setSaving(true);
    try {
      const payload: any = {};
      if (editForm.category && editForm.category !== detail.category) payload.category = editForm.category;
      if (editForm.amount && editForm.amount !== detail.amount) payload.amount = Number(editForm.amount);
      if (editForm.expenseDate && editForm.expenseDate !== format(new Date(detail.expenseDate), "yyyy-MM-dd")) payload.expenseDate = editForm.expenseDate;
      if (editForm.note !== (detail.note || "")) payload.note = editForm.note;

      if (Object.keys(payload).length === 0) { setEditing(false); setSaving(false); return; }
      const res = await apiRequest(`/expenses/${branchId}/${detail.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      toast({ title: "Success", description: res.message });
      setEditing(false);
      setShowDetail(false);
      fetchExpenses();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  /* ═══ Delete ═══ */
  async function handleDelete(id: string) {
    if (!branchId) return;
    setDeleting(id);
    try {
      const res = await apiRequest(`/expenses/${branchId}/${id}`, { method: "DELETE" });
      toast({ title: "Success", description: res.message });
      setShowDetail(false);
      fetchExpenses();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setDeleting(null); }
  }

  /* ═══ Fetch report ═══ */
  async function fetchReport() {
    if (!branchId) return;
    setReportLoading(true);
    try {
      const { start, end } = getRange(reportPreset, reportCS, reportCE);
      const res = await apiRequest<ExpenseReport>(`/expenses/reports/all/${branchId}?start_date=${start}&end_date=${end}`);
      setReport(res.data);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setReportLoading(false); }
  }

  useEffect(() => { if (tab === "reports") fetchReport(); }, [tab, reportPreset, reportCS, reportCE]);

  /* ─ Derived ─ */
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const filtered = expenses.filter(e =>
    e.category.toLowerCase().includes(search.toLowerCase()) ||
    (e.note || "").toLowerCase().includes(search.toLowerCase())
  );

  /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Expenses</h2>
          <p className="text-sm text-muted-foreground">Track and manage branch spending</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors self-start sm:self-auto">
          <Plus size={16} /> <span className="hidden sm:inline">Record</span> Expense
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {([
          { v: "expenses" as Tab, l: "Expenses", icon: <BarChart3 size={14} /> },
          { v: "reports" as Tab, l: "Reports", icon: <BarChart3 size={14} /> },
        ]).map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${tab === t.v ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.icon} {t.l}
          </button>
        ))}
      </div>

      {/* ════════ EXPENSES TAB ════════ */}
      {tab === "expenses" && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-lg font-bold text-foreground mt-1">{naira(totalSpent)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Records</p>
              <p className="text-lg font-bold text-foreground mt-1">{expenses.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground">Avg. Expense</p>
              <p className="text-lg font-bold text-foreground mt-1">{expenses.length ? naira(totalSpent / expenses.length) : "—"}</p>
            </div>
          </div>

          {/* Filters */}
          <DateRangeSelector preset={preset} onPreset={setPreset} customStart={customStart} customEnd={customEnd} onCustomStart={setCustomStart} onCustomEnd={setCustomEnd} />

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by category or note…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-sm text-muted-foreground">No expenses found for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Note</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">By</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(exp => (
                    <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{exp.category}</td>
                      <td className="px-4 py-3 text-foreground">{naira(exp.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{toLagosDate(exp.expenseDate)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{exp.note || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{exp.user?.username || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => viewDetail(exp.id)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground" title="View"><Eye size={15} /></button>
                          <button onClick={() => { if (confirm("Delete this expense record?")) handleDelete(exp.id); }}
                            disabled={deleting === exp.id}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════ REPORTS TAB ════════ */}
      {tab === "reports" && (
        <div className="space-y-4">
          <DateRangeSelector preset={reportPreset} onPreset={setReportPreset} customStart={reportCS} customEnd={reportCE} onCustomStart={setReportCS} onCustomEnd={setReportCE} />

          {reportLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading report…</div>
          ) : !report ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-sm text-muted-foreground">No report data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-bold text-foreground mt-1">{naira(report.summary.totalSpent)}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-lg font-bold text-foreground mt-1">{report.summary.transactionCount}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Average</p>
                  <p className="text-lg font-bold text-foreground mt-1">{naira(report.summary.averageExpense)}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Highest Single</p>
                  <p className="text-lg font-bold text-foreground mt-1">{naira(report.summary.highestSingleExpense)}</p>
                </div>
              </div>

              {/* Categorical breakdown */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Spending by Category</h3>
                </div>
                {report.categoricalBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No data</div>
                ) : (
                  <div className="divide-y divide-border">
                    {report.categoricalBreakdown.map(cat => (
                      <div key={cat.category} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{cat.category}</p>
                          <p className="text-xs text-muted-foreground">{cat.count} transaction{cat.count !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-foreground">{naira(cat.total)}</p>
                          <p className="text-xs text-muted-foreground">{cat.percentage}%</p>
                        </div>
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${cat.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ CREATE MODAL ════════ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-background w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Record Expense</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-accent text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Category *</label>
                <CategorySelect value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Amount (₦) *</label>
                <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Date *</label>
                <input type="date" value={form.expenseDate} onChange={e => setForm(p => ({ ...p, expenseDate: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Note</label>
                <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  rows={2} placeholder="What was this expense for?"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none" />
              </div>
              <button onClick={handleCreate} disabled={creating || !form.category || !form.amount}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {creating ? "Saving…" : "Record Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ DETAIL / EDIT MODAL ════════ */}
      {showDetail && detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => { setShowDetail(false); setEditing(false); }}>
          <div className="bg-background w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto overflow-x-visible" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">{editing ? "Edit Expense" : "Expense Details"}</h3>
              <div className="flex items-center gap-1">
                {!editing && (
                  <button onClick={() => {
                    setEditing(true);
                    setEditForm({
                      category: detail.category,
                      amount: detail.amount,
                      expenseDate: format(new Date(detail.expenseDate), "yyyy-MM-dd"),
                      note: detail.note || "",
                    });
                  }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><Edit2 size={16} /></button>
                )}
                <button onClick={() => { setShowDetail(false); setEditing(false); }} className="p-1 rounded-lg hover:bg-accent text-muted-foreground"><X size={18} /></button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {editing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                    <CategorySelect value={editForm.category} onChange={v => setEditForm(p => ({ ...p, category: v }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Amount (₦)</label>
                    <input type="number" value={editForm.amount} onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
                    <input type="date" value={editForm.expenseDate} onChange={e => setEditForm(p => ({ ...p, expenseDate: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Note</label>
                    <textarea value={editForm.note} onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="flex-1 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
                    <button onClick={handleUpdate} disabled={saving}
                      className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Category</span>
                      <span className="text-sm font-medium text-foreground">{detail.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="text-sm font-semibold text-foreground">{naira(detail.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Date</span>
                      <span className="text-sm text-foreground">{toLagosDate(detail.expenseDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Recorded by</span>
                      <span className="text-sm text-foreground">{detail.user?.username || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm text-foreground">{toLagosDateTime(detail.createdAt)}</span>
                    </div>
                    {detail.note && (
                      <div>
                        <span className="text-sm text-muted-foreground block mb-1">Note</span>
                        <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{detail.note}</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => { if (confirm("Delete this expense record?")) handleDelete(detail.id); }}
                    disabled={deleting === detail.id}
                    className="w-full py-2.5 border border-destructive text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 disabled:opacity-50 transition-colors">
                    {deleting === detail.id ? "Deleting…" : "Delete Expense"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
