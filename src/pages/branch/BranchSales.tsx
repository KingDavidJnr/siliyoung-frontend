import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { toLagosDateTime, toLagosDate } from "@/lib/date";
import { getUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, X, Search, ShoppingCart, Eye, RotateCcw,
  MinusCircle, FileText, CalendarIcon, Download, ChevronDown,
  BarChart3, Receipt,
} from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";
import monesizeLogo from "@/assets/monesize-logo.svg";

/* ─── Types ─── */
interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sellingPrice: string;
  quantity: string;
}

interface SaleItem {
  id: string;
  inventoryItemId: string | null;
  name: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  isRemoved: boolean;
  createdAt: string;
  inventoryItem?: InventoryItem | null;
}

interface Sale {
  id: string;
  branchId: string;
  customerId: string | null;
  saleDate: string;
  totalAmount: string;
  status: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
  customer?: { name: string } | null;
  user?: { username: string; firstName?: string; lastName?: string };
}

interface SaleDetail extends Sale {
  customer: Customer | null;
  saleItems: SaleItem[];
  branch: { id: string; name: string; location: string };
  user: { firstName: string; lastName: string; username: string };
}

interface SaleReportItem extends Sale {
  customer?: { name: string } | null;
  saleItems: SaleItem[];
}

interface SaleItemInput {
  inventoryItemId: string | null;
  name: string;
  quantity: number;
  totalPrice: number;
  unitPrice: number;
  subtotal: number;
}

type Tab = "sales" | "reports";

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
export default function BranchSales() {
  const { branchId } = useParams<{ branchId: string }>();
  const currentUser = getUser();
  const isViewer = currentUser?.role === "GENERAL_VIEWER";

  // Sales list state
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [rangePreset, setRangePreset] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Reports
  const [reports, setReports] = useState<SaleReportItem[]>([]);
  const [reportRange, setReportRange] = useState("today");
  const [reportCustomStart, setReportCustomStart] = useState("");
  const [reportCustomEnd, setReportCustomEnd] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [viewSale, setViewSale] = useState<SaleDetail | null>(null);
  const [deleteSale, setDeleteSale] = useState<Sale | null>(null);
  const [tab, setTab] = useState<Tab>("sales");

  // For create form
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  /* ─── Fetch Sales ─── */
  async function fetchSales() {
    setLoading(true);
    try {
      const { start, end } = getRange(rangePreset, customStart, customEnd);
      const res = await apiRequest<Sale[]>(`/sales/${branchId}?start_date=${start}&end_date=${end}`);
      setSales(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (branchId) fetchSales();
  }, [branchId, rangePreset, customStart, customEnd]);

  /* ─── Fetch Reports ─── */
  async function fetchReports() {
    setReportLoading(true);
    try {
      const { start, end } = getRange(reportRange, reportCustomStart, reportCustomEnd);
      const res = await apiRequest<SaleReportItem[]>(`/sales/reports/${branchId}?start_date=${start}&end_date=${end}`);
      setReports(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    if (branchId && tab === "reports") fetchReports();
  }, [branchId, tab, reportRange, reportCustomStart, reportCustomEnd]);

  useEffect(() => {
    if (branchId) fetchFormData();
  }, [branchId]);

  /* ─── Fetch customers & inventory for create form ─── */
  async function fetchFormData() {
    try {
      const [cRes, iRes] = await Promise.all([
        apiRequest<Customer[]>(`/customers/${branchId}`),
        apiRequest<InventoryItem[]>(`/inventory/${branchId}/inventory`),
      ]);
      setCustomers(cRes.data);
      setInventory(iRes.data);
    } catch {}
  }

  /* ─── View Sale Detail ─── */
  async function openSaleDetail(saleId: string) {
    try {
      const res = await apiRequest<SaleDetail>(`/sales/single/${saleId}`);
      setViewSale(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    }
  }

  /* ─── Reduce sale item ─── */
  async function handleReduce(saleItemId: string) {
    if (!viewSale) return;
    try {
      const res = await apiRequest(`/sales/reduce/${branchId}/${viewSale.id}`, {
        method: "PATCH",
        body: JSON.stringify({ saleItemId }),
      });
      toast({ description: res.message });
      // Refresh detail
      openSaleDetail(viewSale.id);
      fetchSales();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    }
  }

  /* ─── Delete sale ─── */
  async function handleDelete() {
    if (!deleteSale) return;
    try {
      const res = await apiRequest(`/sales/${branchId}/${deleteSale.id}`, { method: "DELETE" });
      toast({ description: res.message });
      setDeleteSale(null);
      fetchSales();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    }
  }

  /* ─── Filtered Sales ─── */
  const filtered = sales.filter((s) => {
    const q = searchQ.toLowerCase();
    return (
      (s.customer?.name || "").toLowerCase().includes(q) ||
      (s.user?.username || "").toLowerCase().includes(q) ||
      (s.note || "").toLowerCase().includes(q) ||
      naira(s.totalAmount).toLowerCase().includes(q)
    );
  });

  const totalRevenue = sales.reduce((a, s) => a + Number(s.totalAmount), 0);

  /* ─── Tab buttons ─── */
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "sales", label: "Sales", icon: <ShoppingCart size={16} /> },
    { key: "reports", label: "Reports", icon: <BarChart3 size={16} /> },
  ];

  /* ─── Date filter bar ─── */
  function DateFilterBar({ preset, setPreset, cs, setCs, ce, setCe }: any) {
    const presets = [
      { value: "today", label: "Today" },
      { value: "7days", label: "Last 7 Days" },
      { value: "month", label: "This Month" },
      { value: "custom", label: "Custom" },
    ];
    return (
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              preset === p.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={cs} onChange={(e) => setCs(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={ce} onChange={(e) => setCe(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-foreground">Sales</h2>
        {!isViewer && (
          <button
            onClick={() => { setShowCreate(true); fetchFormData(); }}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} /> New Sale
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">Record and manage branch sales.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── SALES TAB ─── */}
      {tab === "sales" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-xl font-bold text-foreground">{sales.length}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-xl font-bold text-primary">{naira(totalRevenue)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Avg. Sale</p>
              <p className="text-xl font-bold text-foreground">
                {sales.length > 0 ? naira(Math.round(totalRevenue / sales.length)) : "₦0"}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 mb-4">
            <DateFilterBar preset={rangePreset} setPreset={setRangePreset}
              cs={customStart} setCs={setCustomStart} ce={customEnd} setCe={setCustomEnd} />
            <div className="relative max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text" placeholder="Search by customer, user, note..."
                value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Sales Table */}
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-10 text-center">
              <ShoppingCart size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No sales found for selected period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-muted-foreground font-medium">Date</th>
                    <th className="pb-3 pr-4 text-muted-foreground font-medium">Customer</th>
                    <th className="pb-3 pr-4 text-muted-foreground font-medium">Amount</th>
                    <th className="pb-3 pr-4 text-muted-foreground font-medium">Status</th>
                    <th className="pb-3 pr-4 text-muted-foreground font-medium">Recorded By</th>
                    <th className="pb-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 whitespace-nowrap">{toLagosDate(s.saleDate)}</td>
                      <td className="py-3 pr-4">{s.customer?.name || "—"}</td>
                      <td className="py-3 pr-4 font-medium text-primary">{naira(s.totalAmount)}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          s.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{s.user?.username || "—"}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openSaleDetail(s.id)} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="View Details">
                            <Eye size={15} className="text-muted-foreground" />
                          </button>
                          {!isViewer && (
                            <button onClick={() => setDeleteSale(s)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                              <Trash2 size={15} className="text-destructive" />
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

      {/* ─── REPORTS TAB ─── */}
      {tab === "reports" && (
        <>
          <DateFilterBar preset={reportRange} setPreset={setReportRange}
            cs={reportCustomStart} setCs={setReportCustomStart} ce={reportCustomEnd} setCe={setReportCustomEnd} />
          <div className="mt-4">
            {reportLoading ? (
              <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : reports.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-10 text-center">
                <BarChart3 size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No sales reports for this period.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Report summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-card rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                    <p className="text-xl font-bold text-foreground">{reports.length}</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-primary">
                      {naira(reports.reduce((a, r) => a + Number(r.totalAmount), 0))}
                    </p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground">Items Sold</p>
                    <p className="text-xl font-bold text-foreground">
                      {reports.reduce((a, r) => a + r.saleItems.filter(si => !si.isRemoved).reduce((b, si) => b + Number(si.quantity), 0), 0)}
                    </p>
                  </div>
                </div>

                {/* Per-sale breakdown */}
                {reports.map((r) => (
                  <div key={r.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.customer?.name || "Walk-in"}</p>
                        <p className="text-xs text-muted-foreground">{toLagosDateTime(r.saleDate)}</p>
                      </div>
                      <p className="text-sm font-bold text-primary">{naira(r.totalAmount)}</p>
                    </div>
                    <div className="space-y-1">
                      {r.saleItems.map((si) => (
                        <div key={si.id} className={`flex justify-between text-xs ${si.isRemoved ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          <span>{si.name} × {si.quantity}</span>
                          <span>{naira(si.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── CREATE SALE MODAL ─── */}
      {showCreate && (
        <CreateSaleModal
          branchId={branchId!}
          customers={customers}
          inventory={inventory}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); fetchSales(); }}
        />
      )}

      {/* ─── VIEW SALE DETAIL MODAL ─── */}
      {viewSale && (
        <SaleDetailModal
          sale={viewSale}
          branchId={branchId!}
          isViewer={isViewer}
          onClose={() => setViewSale(null)}
          onReduce={handleReduce}
          onRefresh={() => { openSaleDetail(viewSale.id); fetchSales(); }}
        />
      )}

      {/* ─── DELETE CONFIRM ─── */}
      {deleteSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-foreground mb-2">Delete Sale</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Are you sure you want to delete this sale of <span className="font-semibold text-foreground">{naira(deleteSale.totalAmount)}</span>?
            </p>
            <p className="text-sm text-destructive font-medium mb-4">
              ⚠️ Stock quantities will be restored for inventory items in this sale. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteSale(null)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CREATE SALE MODAL
   ═══════════════════════════════════════════════════════════ */
function CreateSaleModal({
  branchId, customers: initialCustomers, inventory, onClose, onSuccess,
}: {
  branchId: string;
  customers: Customer[];
  inventory: InventoryItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [customerId, setCustomerId] = useState("");
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [note, setNote] = useState("");
  const [items, setItems] = useState<SaleItemInput[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Inline customer creation
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // For adding items
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemType, setItemType] = useState<"inventory" | "custom">("inventory");
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [itemTotal, setItemTotal] = useState("");

  async function handleCreateCustomer() {
    if (!newCustName.trim() || !newCustPhone.trim()) {
      toast({ description: "Customer name and phone are required", variant: "destructive" });
      return;
    }
    setCreatingCustomer(true);
    try {
      const payload: Record<string, string> = { name: newCustName.trim(), phone: newCustPhone.trim(), branchId };
      if (newCustEmail.trim()) payload.email = newCustEmail.trim();
      if (newCustAddress.trim()) payload.address = newCustAddress.trim();
      const res = await apiRequest<Customer>("/customers", { method: "POST", body: JSON.stringify(payload) });
      toast({ description: res.message });
      const created = res.data;
      setCustomers((prev) => [...prev, created]);
      setCustomerId(created.id);
      setShowNewCustomer(false);
      setNewCustName(""); setNewCustPhone(""); setNewCustEmail(""); setNewCustAddress("");
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setCreatingCustomer(false);
    }
  }

  function addItem() {
    const qty = Number(itemQty);
    const total = Number(itemTotal);
    if (qty <= 0 || total <= 0) {
      toast({ description: "Quantity and total price must be greater than 0", variant: "destructive" });
      return;
    }

    let name = customItemName;
    let inventoryItemId: string | null = null;

    if (itemType === "inventory") {
      const inv = inventory.find((i) => i.id === selectedInventoryId);
      if (!inv) {
        toast({ description: "Please select an inventory item", variant: "destructive" });
        return;
      }
      name = inv.name;
      inventoryItemId = inv.id;
    } else {
      if (!name.trim()) {
        toast({ description: "Please enter item name", variant: "destructive" });
        return;
      }
    }

    const unitPrice = Math.round(total / qty);

    setItems([...items, {
      inventoryItemId,
      name,
      quantity: qty,
      totalPrice: total,
      unitPrice,
      subtotal: total,
    }]);

    // Reset
    setShowItemForm(false);
    setSelectedInventoryId("");
    setCustomItemName("");
    setItemQty("");
    setItemTotal("");
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const grandTotal = items.reduce((a, i) => a + i.subtotal, 0);

  async function handleSubmit() {
    if (!customerId) {
      toast({ description: "Please select or create a customer for this sale", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ description: "Add at least one item to the sale", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        saleDate: new Date(saleDate).toISOString(),
        items: items.map((i) => ({
          inventoryItemId: i.inventoryItemId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
          subtotal: i.subtotal,
        })),
      };
      if (customerId) payload.customerId = customerId;
      if (note.trim()) payload.note = note.trim();

      const res = await apiRequest(`/sales/${branchId}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({ description: res.message });
      onSuccess();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-lg font-bold text-foreground">Record New Sale</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          {/* Customer */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Customer <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setShowNewCustomer(false); }}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select a customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowNewCustomer(!showNewCustomer)}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors whitespace-nowrap">
                <Plus size={14} className="inline mr-1" />New
              </button>
            </div>
            {!customerId && !showNewCustomer && (
              <p className="text-xs text-muted-foreground mt-1">Select an existing customer or create a new one.</p>
            )}
          </div>

          {/* Inline New Customer Form */}
          {showNewCustomer && (
            <div className="bg-muted/30 rounded-lg p-3 border border-border space-y-3">
              <p className="text-sm font-medium text-foreground">Create New Customer</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-0.5 block">Name <span className="text-destructive">*</span></label>
                  <input value={newCustName} onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-0.5 block">Phone <span className="text-destructive">*</span></label>
                  <input value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="08012345678"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-0.5 block">Email</label>
                  <input type="email" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-0.5 block">Address</label>
                  <input value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="Street, City"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNewCustomer(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleCreateCustomer} disabled={creatingCustomer}
                  className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {creatingCustomer ? "Creating..." : "Create & Select"}
                </button>
              </div>
            </div>
          )}

          {/* Sale date */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Sale Date & Time</label>
            <input type="datetime-local" value={saleDate} onChange={(e) => setSaleDate(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="E.g. Customer paid via transfer" />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Sale Items</label>
              <button onClick={() => setShowItemForm(true)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Plus size={14} /> Add Item
              </button>
            </div>

            {items.length === 0 && (
              <p className="text-xs text-muted-foreground py-3 text-center bg-muted/30 rounded-lg">No items added yet.</p>
            )}

            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {naira(item.unitPrice)} = {naira(item.subtotal)}
                    {!item.inventoryItemId && <span className="ml-1 text-yellow-600">(Field)</span>}
                  </p>
                </div>
                <button onClick={() => removeItem(idx)} className="p-1 hover:bg-destructive/10 rounded-lg">
                  <X size={14} className="text-destructive" />
                </button>
              </div>
            ))}

            {items.length > 0 && (
              <div className="flex justify-between pt-2 text-sm font-bold text-foreground">
                <span>Grand Total</span>
                <span className="text-primary">{naira(grandTotal)}</span>
              </div>
            )}
          </div>

          {/* Add item sub-form */}
          {showItemForm && (
            <div className="bg-muted/30 rounded-lg p-3 border border-border space-y-3">
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                <button onClick={() => setItemType("inventory")}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    itemType === "inventory" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}>Inventory Item</button>
                <button onClick={() => setItemType("custom")}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    itemType === "custom" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}>Custom / Field Item</button>
              </div>

              {itemType === "inventory" ? (
                <select value={selectedInventoryId} onChange={(e) => setSelectedInventoryId(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select inventory item</option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} — {naira(inv.sellingPrice)} (Stock: {inv.quantity})
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" placeholder="Item name (e.g. Field Rods)" value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-0.5 block">Quantity</label>
                  <input type="number" min="1" value={itemQty} onChange={(e) => setItemQty(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-0.5 block">Total Price (₦)</label>
                  <input type="number" min="1" value={itemTotal} onChange={(e) => setItemTotal(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              {itemQty && itemTotal && Number(itemQty) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Unit Price: <span className="font-medium text-foreground">{naira(Math.round(Number(itemTotal) / Number(itemQty)))}</span>
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowItemForm(false)} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
                <button onClick={addItem} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Add</button>
              </div>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || items.length === 0 || !customerId}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {submitting ? "Recording..." : "Record Sale"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SALE DETAIL MODAL
   ═══════════════════════════════════════════════════════════ */
function SaleDetailModal({
  sale, branchId, isViewer, onClose, onReduce, onRefresh,
}: {
  sale: SaleDetail;
  branchId: string;
  isViewer: boolean;
  onClose: () => void;
  onReduce: (saleItemId: string) => void;
  onRefresh: () => void;
}) {
  const [showReturn, setShowReturn] = useState<SaleItem | null>(null);
  const [returnQty, setReturnQty] = useState("");
  const [returnDate, setReturnDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [returnNote, setReturnNote] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  async function handleReturn() {
    if (!showReturn) return;
    const qty = Number(returnQty);
    if (qty <= 0) {
      toast({ description: "Return quantity must be greater than 0", variant: "destructive" });
      return;
    }
    if (qty > Number(showReturn.quantity)) {
      toast({ description: "Return quantity cannot exceed sold quantity", variant: "destructive" });
      return;
    }
    setReturnSubmitting(true);
    try {
      const res = await apiRequest(`/sales/return/${branchId}/${sale.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          saleItemId: showReturn.id,
          quantity: qty,
          returnDate,
          note: returnNote.trim() || undefined,
        }),
      });
      toast({ description: res.message });
      setShowReturn(null);
      setReturnQty("");
      setReturnNote("");
      onRefresh();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setReturnSubmitting(false);
    }
  }

  /* ─── Generate Invoice PDF ─── */
  async function generateInvoice() {
    setGeneratingInvoice(true);
    try {
      const invoiceRes = await apiRequest<SaleDetail>(`/sales/invoice/${sale.id}`);
      const inv = invoiceRes.data;
      downloadInvoiceHTML(inv);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setGeneratingInvoice(false);
    }
  }

  function downloadInvoiceHTML(inv: SaleDetail) {
    const activeItems = inv.saleItems.filter(si => !si.isRemoved);
    const activeTotal = activeItems.reduce((a, si) => a + Number(si.subtotal), 0);

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice - ${inv.id.slice(0, 8)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #228B22}
.org-name{font-size:22px;font-weight:700;color:#228B22}
.branch{font-size:13px;color:#555;margin-top:4px}
.inv-title{font-size:28px;font-weight:700;color:#228B22;text-align:right}
.inv-id{font-size:11px;color:#888;text-align:right;margin-top:2px}
.info-row{display:flex;justify-content:space-between;margin-bottom:24px;gap:24px}
.info-box{flex:1}
.info-label{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:0.5px;margin-bottom:4px}
.info-value{font-size:13px;color:#333}
table{width:100%;border-collapse:collapse;margin:20px 0}
th{background:#228B22;color:#fff;padding:10px 12px;text-align:left;font-size:12px;font-weight:600}
td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}
tr:nth-child(even){background:#f9f9f9}
.total-row{display:flex;justify-content:flex-end;margin-top:16px}
.total-box{background:#f0f7f0;border:2px solid #228B22;border-radius:8px;padding:16px 24px;text-align:right}
.total-label{font-size:12px;color:#555}
.total-value{font-size:24px;font-weight:700;color:#228B22}
.note-section{margin-top:24px;padding:12px;background:#fafafa;border-radius:6px;border:1px solid #eee}
.note-label{font-size:10px;text-transform:uppercase;color:#888;margin-bottom:4px}
.note-text{font-size:13px;color:#333}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:center;align-items:center;gap:6px;color:#999;font-size:11px}
@media print{body{padding:20px}@page{margin:15mm}}
</style></head>
<body>
<div class="header">
  <div>
    <div class="org-name">Siliyoung Enterprise Continental Ventures Limited</div>
    <div class="branch">${inv.branch.name} — ${inv.branch.location}</div>
  </div>
  <div>
    <div class="inv-title">INVOICE</div>
    <div class="inv-id">#${inv.id.slice(0, 8).toUpperCase()}</div>
  </div>
</div>
<div class="info-row">
  <div class="info-box">
    <div class="info-label">Customer</div>
    <div class="info-value">${inv.customer?.name || "Walk-in Customer"}</div>
    ${inv.customer?.phone ? `<div class="info-value">${inv.customer.phone}</div>` : ""}
    ${inv.customer?.email ? `<div class="info-value">${inv.customer.email}</div>` : ""}
    ${inv.customer?.address ? `<div class="info-value">${inv.customer.address}</div>` : ""}
  </div>
  <div class="info-box" style="text-align:right">
    <div class="info-label">Sale Date</div>
    <div class="info-value">${toLagosDateTime(inv.saleDate)}</div>
    <div class="info-label" style="margin-top:8px">Recorded By</div>
    <div class="info-value">${inv.user.firstName} ${inv.user.lastName}</div>
  </div>
</div>
<table>
  <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
  <tbody>
    ${activeItems.map((si, i) => `<tr>
      <td>${i + 1}</td>
      <td>${si.name}${!si.inventoryItemId ? ' <em style="color:#888">(Field)</em>' : ""}</td>
      <td>${si.quantity}</td>
      <td>₦${Number(si.unitPrice).toLocaleString("en-NG")}</td>
      <td>₦${Number(si.subtotal).toLocaleString("en-NG")}</td>
    </tr>`).join("")}
  </tbody>
</table>
<div class="total-row">
  <div class="total-box">
    <div class="total-label">Total Amount</div>
    <div class="total-value">₦${activeTotal.toLocaleString("en-NG")}</div>
  </div>
</div>
${inv.note ? `<div class="note-section"><div class="note-label">Note</div><div class="note-text">${inv.note}</div></div>` : ""}
<div class="footer">
  <span>Powered by</span>
  <strong style="color:#228B22">Monesize</strong>
</div>
</body></html>`;

    // Open in new tab for print/save as PDF
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) {
      w.onload = () => {
        setTimeout(() => w.print(), 500);
      };
    }
    URL.revokeObjectURL(url);
  }

  const activeItems = sale.saleItems.filter(si => !si.isRemoved);
  const removedItems = sale.saleItems.filter(si => si.isRemoved);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-lg font-bold text-foreground">Sale Details</h3>
          <div className="flex items-center gap-2">
            <button onClick={generateInvoice} disabled={generatingInvoice}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Download size={14} /> {generatingInvoice ? "..." : "Invoice"}
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Sale info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="font-medium text-foreground">{sale.customer?.name || "Walk-in"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium text-foreground">{toLagosDateTime(sale.saleDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                sale.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
              }`}>{sale.status}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recorded By</p>
              <p className="font-medium text-foreground">{sale.user.firstName} {sale.user.lastName}</p>
            </div>
          </div>

          {sale.note && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Note</p>
              <p className="text-sm text-foreground">{sale.note}</p>
            </div>
          )}

          {/* Active items */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Items</p>
            <div className="space-y-2">
              {activeItems.map((si) => (
                <div key={si.id} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg">
                  <div>
                    <p className="text-sm text-foreground">{si.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {si.quantity} × {naira(si.unitPrice)} = {naira(si.subtotal)}
                      {!si.inventoryItemId && <span className="ml-1 text-yellow-600">(Field)</span>}
                    </p>
                  </div>
                  {!isViewer && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => onReduce(si.id)} title="Reduce (same-day removal)"
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                        <MinusCircle size={14} className="text-orange-500" />
                      </button>
                      <button onClick={() => setShowReturn(si)} title="Record Return"
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                        <RotateCcw size={14} className="text-blue-500" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Removed / reduced items */}
          {removedItems.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Reduced / Removed Items</p>
              <div className="space-y-1">
                {removedItems.map((si) => (
                  <div key={si.id} className="flex items-center justify-between py-2 px-3 bg-destructive/5 rounded-lg line-through text-muted-foreground">
                    <div>
                      <p className="text-sm">{si.name}</p>
                      <p className="text-xs">{si.quantity} × {naira(si.unitPrice)}</p>
                    </div>
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Removed</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <p className="text-sm font-medium text-foreground">Total Amount</p>
            <p className="text-lg font-bold text-primary">{naira(sale.totalAmount)}</p>
          </div>
        </div>

        {/* Return sub-form */}
        {showReturn && (
          <div className="border-t border-border p-4 space-y-3 bg-muted/10">
            <p className="text-sm font-medium text-foreground">Return: {showReturn.name}</p>
            <p className="text-xs text-muted-foreground">
              Sold qty: {showReturn.quantity}. Enter the quantity being returned.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-0.5 block">Return Quantity</label>
                <input type="number" min="1" max={Number(showReturn.quantity)} value={returnQty}
                  onChange={(e) => setReturnQty(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-0.5 block">Return Date</label>
                <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-0.5 block">Reason (optional)</label>
              <input type="text" value={returnNote} onChange={(e) => setReturnNote(e.target.value)} placeholder="E.g. Expired goods"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReturn(null)} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleReturn} disabled={returnSubmitting}
                className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {returnSubmitting ? "Processing..." : "Record Return"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
