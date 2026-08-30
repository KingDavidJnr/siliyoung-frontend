import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { toLagosDateTime, toLagosDate } from "@/lib/date";
import { getUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, X, Search, Eye, CreditCard, Users,
  AlertTriangle, BarChart3, FileText,
} from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";

/* ─── Types ─── */
interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Payment {
  id: string;
  branchId: string;
  customerId: string;
  saleId: string | null;
  amount: string;
  paymentDate: string;
  note: string | null;
  receiptUrl: string | null;
  createdBy: string;
  createdAt: string;
  customer?: { name: string; phone?: string };
  user?: { username: string };
}

interface PaymentDetail extends Payment {
  customer: Customer | null;
  user: { username: string };
}

interface Debtor {
  id: string;
  name: string;
  phone: string;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
}

interface BalanceEntry {
  date: string;
  type: "PAYMENT" | "SALE";
  amount: string;
  id: string;
}

interface FinancialReport {
  totalRevenue: number;
  totalCollected: number;
  outstandingDebt: number;
}

type Tab = "payments" | "debtors" | "reports";

/* ─── Currency helper ─── */
function naira(v: string | number) {
  return `₦${Number(v).toLocaleString("en-NG")}`;
}

/* ─── Date range helpers ─── */
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

/* ─── Main Component ─── */
export default function BranchPayments() {
  const { branchId } = useParams<{ branchId: string }>();
  const currentUser = getUser();
  const isViewer = currentUser?.role === "GENERAL_VIEWER";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [rangePreset, setRangePreset] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [debtorsLoading, setDebtorsLoading] = useState(false);
  const [viewBalance, setViewBalance] = useState<{ customer: Debtor; entries: BalanceEntry[] } | null>(null);

  const [report, setReport] = useState<FinancialReport | null>(null);
  const [reportRange, setReportRange] = useState("today");
  const [reportCustomStart, setReportCustomStart] = useState("");
  const [reportCustomEnd, setReportCustomEnd] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [viewPayment, setViewPayment] = useState<PaymentDetail | null>(null);
  const [editPayment, setEditPayment] = useState<PaymentDetail | null>(null);
  const [deletePayment, setDeletePayment] = useState<Payment | null>(null);
  const [tab, setTab] = useState<Tab>("payments");

  const [customers, setCustomers] = useState<Customer[]>([]);

  /* ─── Fetch Payments ─── */
  async function fetchPayments() {
    if (!branchId) return;
    setLoading(true);
    try {
      const { start, end } = getRange(rangePreset, customStart, customEnd);
      const res = await apiRequest<Payment[]>(`/payments/${branchId}?start_date=${start}&end_date=${end}`);
      setPayments(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function fetchDebtors() {
    if (!branchId) return;
    setDebtorsLoading(true);
    try {
      const res = await apiRequest<Debtor[]>(`/payments/debts/all/${branchId}`);
      setDebtors(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setDebtorsLoading(false);
    }
  }

  async function fetchReport() {
    if (!branchId) return;
    setReportLoading(true);
    try {
      const { start, end } = getRange(reportRange, reportCustomStart, reportCustomEnd);
      const res = await apiRequest<FinancialReport>(`/payments/financial/report/${branchId}?start_date=${start}&end_date=${end}`);
      setReport(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  }

  async function fetchCustomers() {
    if (!branchId) return;
    try {
      const res = await apiRequest<Customer[]>(`/customers/${branchId}`);
      setCustomers(res.data);
    } catch {}
  }

  useEffect(() => {
    if (branchId) { fetchPayments(); fetchCustomers(); }
  }, [branchId, rangePreset, customStart, customEnd]);

  useEffect(() => {
    if (branchId && tab === "debtors") fetchDebtors();
  }, [branchId, tab]);

  useEffect(() => {
    if (branchId && tab === "reports") fetchReport();
  }, [branchId, tab, reportRange, reportCustomStart, reportCustomEnd]);

  async function openPaymentDetail(paymentId: string) {
    try {
      const res = await apiRequest<PaymentDetail>(`/payments/${branchId}/${paymentId}`);
      setViewPayment(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    }
  }

  async function openCustomerBalance(debtor: Debtor) {
    try {
      const res = await apiRequest<BalanceEntry[]>(`/payments/customer-balance/${branchId}/${debtor.id}`);
      setViewBalance({ customer: debtor, entries: res.data });
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deletePayment) return;
    try {
      const res = await apiRequest(`/payments/${branchId}/${deletePayment.id}`, { method: "DELETE" });
      toast({ description: res.message });
      setDeletePayment(null);
      fetchPayments();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    }
  }

  async function handleUpdate(data: { amount?: number; note?: string; paymentDate?: string }) {
    if (!editPayment) return;
    try {
      const res = await apiRequest(`/payments/${branchId}/${editPayment.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      toast({ description: res.message });
      setEditPayment(null);
      fetchPayments();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    }
  }

  const filtered = payments.filter((p) => {
    const q = searchQ.toLowerCase();
    return (
      (p.customer?.name || "").toLowerCase().includes(q) ||
      (p.user?.username || "").toLowerCase().includes(q) ||
      (p.note || "").toLowerCase().includes(q) ||
      p.amount.includes(q)
    );
  });

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);

  /* ─── Date Range Selector ─── */
  function DateRangeSelector({
    preset, setPreset, cs, setCs, ce, setCe,
  }: {
    preset: string; setPreset: (v: string) => void;
    cs: string; setCs: (v: string) => void;
    ce: string; setCe: (v: string) => void;
  }) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: "Today", value: "today" },
          { label: "Last 7 days", value: "7days" },
          { label: "This month", value: "month" },
          { label: "Custom", value: "custom" },
        ].map((o) => (
          <button key={o.value} onClick={() => setPreset(o.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              preset === o.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}>
            {o.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={cs} onChange={(e) => setCs(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground" />
            <span className="text-muted-foreground text-sm">to</span>
            <input type="date" value={ce} onChange={(e) => setCe(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="text-primary shrink-0" size={22} /> Payments
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Record and track payments from customers</p>
          </div>
          {!isViewer && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
              <Plus size={16} /> <span className="hidden sm:inline">Record</span> Payment
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-full sm:w-fit overflow-x-auto">
        {([
          { key: "payments" as Tab, label: "Payments", icon: CreditCard },
          { key: "debtors" as Tab, label: "Debtor Book", icon: Users },
          { key: "reports" as Tab, label: "Reports", icon: BarChart3 },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ═══ PAYMENTS TAB ═══ */}
      {tab === "payments" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Payments</p>
              <p className="text-2xl font-bold text-foreground mt-1">{payments.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Collected</p>
              <p className="text-2xl font-bold text-primary mt-1">{naira(totalCollected)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Payment</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {payments.length ? naira(totalCollected / payments.length) : "₦0"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <DateRangeSelector preset={rangePreset} setPreset={setRangePreset}
              cs={customStart} setCs={setCustomStart} ce={customEnd} setCe={setCustomEnd} />
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search by customer, user, note..."
                value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading payments...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard size={40} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No payments found for this period</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-4 text-muted-foreground font-medium">Date</th>
                    <th className="p-4 text-muted-foreground font-medium">Customer</th>
                    <th className="p-4 text-muted-foreground font-medium">Amount</th>
                    <th className="p-4 text-muted-foreground font-medium">Note</th>
                    <th className="p-4 text-muted-foreground font-medium">Recorded By</th>
                    <th className="p-4 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 whitespace-nowrap">{toLagosDate(p.paymentDate)}</td>
                      <td className="p-4">{p.customer?.name || "—"}</td>
                      <td className="p-4 font-medium text-primary">{naira(p.amount)}</td>
                      <td className="p-4 text-muted-foreground max-w-[200px] truncate">{p.note || "—"}</td>
                      <td className="p-4 text-muted-foreground">{p.user?.username || "—"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openPaymentDetail(p.id)} title="View"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Eye size={15} />
                          </button>
                          {!isViewer && (
                            <button onClick={() => setDeletePayment(p)} title="Delete"
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ DEBTORS TAB ═══ */}
      {tab === "debtors" && (
        <>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Debtors</p>
            <p className="text-2xl font-bold text-foreground mt-1">{debtors.filter(d => d.balance > 0).length}</p>
          </div>

          {debtorsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading debtor book...</div>
          ) : debtors.length === 0 ? (
            <div className="text-center py-12">
              <Users size={40} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No debtor records found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {debtors.map((d) => (
                <div key={d.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{d.name}</p>
                    <p className="text-sm text-muted-foreground">{d.phone}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Invoiced</p>
                      <p className="font-medium text-foreground">{naira(d.totalInvoiced)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Paid</p>
                      <p className="font-medium text-primary">{naira(d.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Balance</p>
                      <p className={`font-bold ${d.balance > 0 ? "text-destructive" : "text-primary"}`}>{naira(d.balance)}</p>
                    </div>
                    <button onClick={() => openCustomerBalance(d)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground transition-colors">
                      <FileText size={14} /> Statement
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ REPORTS TAB ═══ */}
      {tab === "reports" && (
        <>
          <DateRangeSelector preset={reportRange} setPreset={setReportRange}
            cs={reportCustomStart} setCs={setReportCustomStart} ce={reportCustomEnd} setCe={setReportCustomEnd} />

          {reportLoading ? (
            <div className="text-center py-12 text-muted-foreground">Generating report...</div>
          ) : report ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground mt-2">{naira(report.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total sales invoiced</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Collected</p>
                <p className="text-2xl font-bold text-primary mt-2">{naira(report.totalCollected)}</p>
                <p className="text-xs text-muted-foreground mt-1">Payments received</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding Debt</p>
                <p className={`text-2xl font-bold mt-2 ${report.outstandingDebt > 0 ? "text-destructive" : "text-primary"}`}>
                  {naira(report.outstandingDebt)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {report.totalRevenue > 0
                    ? `${((report.totalCollected / report.totalRevenue) * 100).toFixed(1)}% collected`
                    : "No revenue yet"}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No report data</div>
          )}
        </>
      )}

      {/* ═══ CREATE PAYMENT MODAL ═══ */}
      {showCreate && (
        <CreatePaymentModal branchId={branchId!} customers={customers}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); fetchPayments(); fetchCustomers(); }} />
      )}

      {/* ═══ VIEW PAYMENT DETAIL MODAL ═══ */}
      {viewPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setViewPayment(null)}>
          <div className="bg-background rounded-xl border border-border w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Payment Details</h2>
              <button onClick={() => setViewPayment(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium text-foreground">{viewPayment.customer?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="text-foreground">{viewPayment.customer?.phone || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-foreground">{viewPayment.customer?.email || "—"}</span></div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold text-primary text-lg">{naira(viewPayment.amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment Date</span><span className="text-foreground">{toLagosDate(viewPayment.paymentDate)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Recorded</span><span className="text-foreground">{toLagosDateTime(viewPayment.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Recorded By</span><span className="text-foreground">{viewPayment.user?.username || "—"}</span></div>
              {viewPayment.note && (
                <div>
                  <p className="text-muted-foreground mb-1">Note</p>
                  <p className="text-foreground bg-muted rounded-lg p-3">{viewPayment.note}</p>
                </div>
              )}
            </div>
            {!isViewer && (
              <div className="flex gap-2 mt-5">
                <button onClick={() => { setEditPayment(viewPayment); setViewPayment(null); }}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  Edit Payment
                </button>
                <button onClick={() => { setDeletePayment(viewPayment); setViewPayment(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-destructive text-destructive hover:bg-destructive/10 transition-colors">
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ EDIT PAYMENT MODAL ═══ */}
      {editPayment && (
        <EditPaymentModal payment={editPayment} onClose={() => setEditPayment(null)} onSave={handleUpdate} />
      )}

      {/* ═══ DELETE CONFIRMATION ═══ */}
      {deletePayment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDeletePayment(null)}>
          <div className="bg-background rounded-xl border border-border w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-destructive" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Delete Payment</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Are you sure you want to delete this payment record of <span className="font-bold text-foreground">{naira(deletePayment.amount)}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletePayment(null)}
                className="flex-1 border border-border py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CUSTOMER BALANCE STATEMENT MODAL ═══ */}
      {viewBalance && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setViewBalance(null)}>
          <div className="bg-background rounded-xl border border-border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{viewBalance.customer.name}</h2>
                <p className="text-sm text-muted-foreground">Balance Statement</p>
              </div>
              <button onClick={() => setViewBalance(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Invoiced</p>
                <p className="font-bold text-foreground">{naira(viewBalance.customer.totalInvoiced)}</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-bold text-primary">{naira(viewBalance.customer.totalPaid)}</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className={`font-bold ${viewBalance.customer.balance > 0 ? "text-destructive" : "text-primary"}`}>{naira(viewBalance.customer.balance)}</p>
              </div>
            </div>
            <div className="space-y-2">
              {viewBalance.entries.map((e, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      e.type === "PAYMENT" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"
                    }`}>
                      {e.type === "PAYMENT" ? <CreditCard size={14} /> : <FileText size={14} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.type === "PAYMENT" ? "Payment" : "Sale"}</p>
                      <p className="text-xs text-muted-foreground">{toLagosDate(e.date)}</p>
                    </div>
                  </div>
                  <p className={`font-medium text-sm ${e.type === "PAYMENT" ? "text-primary" : "text-foreground"}`}>
                    {e.type === "PAYMENT" ? "+" : ""}{naira(e.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CREATE PAYMENT MODAL
   ═══════════════════════════════════════════════════════════ */
function CreatePaymentModal({
  branchId, customers: initialCustomers, onClose, onSuccess,
}: {
  branchId: string; customers: Customer[]; onClose: () => void; onSuccess: () => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [customerId, setCustomerId] = useState("");
  const [saleId, setSaleId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [creatingCust, setCreatingCust] = useState(false);

  async function handleCreateCustomer() {
    if (!newCustName.trim() || !newCustPhone.trim()) {
      toast({ description: "Customer name and phone are required", variant: "destructive" });
      return;
    }
    setCreatingCust(true);
    try {
      const payload: any = { name: newCustName.trim(), phone: newCustPhone.trim(), branchId };
      if (newCustEmail.trim()) payload.email = newCustEmail.trim();
      if (newCustAddress.trim()) payload.address = newCustAddress.trim();
      const res = await apiRequest<Customer>("/customers", { method: "POST", body: JSON.stringify(payload) });
      toast({ description: res.message });
      setCustomers((prev) => [...prev, res.data]);
      setCustomerId(res.data.id);
      setShowNewCustomer(false);
      setNewCustName(""); setNewCustPhone(""); setNewCustEmail(""); setNewCustAddress("");
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setCreatingCust(false);
    }
  }

  async function handleSubmit() {
    if (!customerId) {
      toast({ description: "Please select or create a customer", variant: "destructive" });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast({ description: "Enter a valid payment amount", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        customerId,
        amount: Number(amount),
        paymentDate: new Date(paymentDate).toISOString(),
      };
      if (saleId.trim()) payload.saleId = saleId.trim();
      if (note.trim()) payload.note = note.trim();
      const res = await apiRequest(`/payments/${branchId}`, { method: "POST", body: JSON.stringify(payload) });
      toast({ description: res.message });
      onSuccess();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl border border-border w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Record Payment</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {/* Customer */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-foreground">Customer *</label>
              <button onClick={() => setShowNewCustomer(!showNewCustomer)}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus size={12} /> {showNewCustomer ? "Cancel" : "New Customer"}
              </button>
            </div>
            {!showNewCustomer ? (
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 bg-muted/50 rounded-lg p-3 border border-border">
                <input type="text" placeholder="Customer name *" value={newCustName} onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="text" placeholder="Phone number *" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="email" placeholder="Email (optional)" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="text" placeholder="Address (optional)" value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={handleCreateCustomer} disabled={creatingCust}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {creatingCust ? "Creating..." : "Create Customer"}
                </button>
              </div>
            )}
          </div>

          {/* Sale ID */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Sale ID (optional)</label>
            <input type="text" placeholder="Link to a sale record (paste sale ID)" value={saleId} onChange={(e) => setSaleId(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <p className="text-xs text-muted-foreground mt-1">Optional — attach this payment to a specific sale</p>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Amount (₦) *</label>
            <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Payment Date */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Payment Date *</label>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Note (optional)</label>
            <textarea placeholder="Payment details, reference number, etc." value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <button onClick={handleSubmit} disabled={submitting || !customerId || !amount}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {submitting ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EDIT PAYMENT MODAL
   ═══════════════════════════════════════════════════════════ */
function EditPaymentModal({
  payment, onClose, onSave,
}: {
  payment: PaymentDetail; onClose: () => void;
  onSave: (data: { amount?: number; note?: string; paymentDate?: string }) => void;
}) {
  const [amount, setAmount] = useState(payment.amount);
  const [note, setNote] = useState(payment.note || "");
  const [paymentDate, setPaymentDate] = useState(format(new Date(payment.paymentDate), "yyyy-MM-dd"));

  function handleSave() {
    const updates: any = {};
    if (Number(amount) !== Number(payment.amount)) updates.amount = Number(amount);
    if (note !== (payment.note || "")) updates.note = note;
    const origDate = format(new Date(payment.paymentDate), "yyyy-MM-dd");
    if (paymentDate !== origDate) updates.paymentDate = new Date(paymentDate).toISOString();
    if (Object.keys(updates).length === 0) {
      toast({ description: "No changes to save" });
      return;
    }
    onSave(updates);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl border border-border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Edit Payment</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Amount (₦)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Payment Date</label>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <button onClick={handleSave}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
