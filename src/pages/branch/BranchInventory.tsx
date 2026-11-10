import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { toLagosDateTime } from "@/lib/date";
import { getUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, X, Search, Package, AlertTriangle,
  TrendingUp, TrendingDown, BarChart3, PackagePlus, PackageMinus,
  CalendarIcon, History, Download, ChevronDown, FileSpreadsheet, FileText,
} from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";

interface InventoryItem {
  id: string;
  branchId: string;
  name: string;
  costPrice: string | null;
  sellingPrice: string;
  quantity: string;
  lowStockThreshold: string;
  createdAt: string;
  updatedAt: string;
}

interface StockReport {
  itemId: string;
  itemName: string;
  totalAdded: number;
  totalSold: number;
  totalReduced: number;
  totalReturned: number;
  totalWrittenOff: number;
  totalFieldSales: number;
  closingStock: number;
}

interface StockMovement {
  id: string;
  branchId: string;
  inventoryItemId: string;
  type: string;
  quantity: string;
  referenceId: string | null;
  note: string | null;
  narration: string | null;
  createdAt: string;
}

type Tab = "all" | "low-stock" | "reports";

export default function BranchInventory() {
  const { branchId } = useParams<{ branchId: string }>();
  const currentUser = getUser();
  const isViewer = currentUser?.role === "GENERAL_VIEWER";

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [reports, setReports] = useState<StockReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [addStockItem, setAddStockItem] = useState<InventoryItem | null>(null);
  const [writeOffItem, setWriteOffItem] = useState<InventoryItem | null>(null);
  const [movementsItem, setMovementsItem] = useState<InventoryItem | null>(null);

  // Reports date range
  const [reportRange, setReportRange] = useState<string>("7days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const basePath = `/inventory/${branchId}/inventory`;

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await apiRequest<InventoryItem[]>(basePath);
      setItems(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function fetchLowStock() {
    try {
      const res = await apiRequest<InventoryItem[]>(`${basePath}/low/stock`);
      setLowStockItems(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    }
  }

  async function fetchReports(start: string, end: string) {
    setReportLoading(true);
    try {
      const res = await apiRequest<StockReport[]>(
        `${basePath}/reports/stock?start_date=${start}&end_date=${end}`
      );
      setReports(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    if (branchId) {
      fetchItems();
      fetchLowStock();
    }
  }, [branchId]);

  useEffect(() => {
    if (tab === "reports") {
      loadReport();
    }
  }, [tab, reportRange]);

  function loadReport() {
    const today = new Date();
    let start: string;
    let end: string = format(today, "yyyy-MM-dd");

    if (reportRange === "today") {
      start = end;
    } else if (reportRange === "7days") {
      start = format(subDays(today, 7), "yyyy-MM-dd");
    } else if (reportRange === "month") {
      start = format(startOfMonth(today), "yyyy-MM-dd");
    } else {
      if (!customStart || !customEnd) return;
      start = customStart;
      end = customEnd;
    }
    fetchReports(start, end);
  }

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalItems = items.length;
  const totalStock = items.reduce((sum, i) => sum + Number(i.quantity), 0);
  const lowCount = lowStockItems.length;
  const totalValue = items.reduce(
    (sum, i) => sum + Number(i.sellingPrice) * Number(i.quantity),
    0
  );

  function refreshAll() {
    fetchItems();
    fetchLowStock();
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Inventory</h2>
          <p className="text-sm text-muted-foreground">
            Manage stock items for this branch.
          </p>
        </div>
        {!isViewer && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Package} label="Total Items" value={totalItems} />
        <StatCard icon={TrendingUp} label="Total Stock" value={totalStock} />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock"
          value={lowCount}
          highlight={lowCount > 0}
        />
        <StatCard
          icon={BarChart3}
          label="Stock Value"
          value={`₦${totalValue.toLocaleString()}`}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4 w-fit">
        {(["all", "low-stock", "reports"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "all" ? "All Items" : t === "low-stock" ? "Low Stock" : "Reports"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "all" && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <ItemsTable
            items={filtered}
            loading={loading}
            search={search}
            isViewer={isViewer}
            onEdit={setEditItem}
            onDelete={setDeleteItem}
            onAddStock={setAddStockItem}
            onWriteOff={setWriteOffItem}
            onMovements={setMovementsItem}
          />
        </>
      )}

      {tab === "low-stock" && (
        <ItemsTable
          items={lowStockItems}
          loading={false}
          search=""
          isViewer={isViewer}
          onEdit={setEditItem}
          onDelete={setDeleteItem}
          onAddStock={setAddStockItem}
          onWriteOff={setWriteOffItem}
          onMovements={setMovementsItem}
          emptyMsg="No low stock items. All items are well stocked!"
        />
      )}

      {tab === "reports" && (
        <ReportsView
          reports={reports}
          loading={reportLoading}
          range={reportRange}
          onRangeChange={setReportRange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          onApplyCustom={loadReport}
        />
      )}

      {/* Modals */}
      {showCreateModal && (
        <InventoryFormModal
          branchId={branchId!}
          basePath={basePath}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); refreshAll(); }}
        />
      )}
      {editItem && (
        <InventoryFormModal
          branchId={branchId!}
          basePath={basePath}
          item={editItem}
          onClose={() => setEditItem(null)}
          onSuccess={() => { setEditItem(null); refreshAll(); }}
        />
      )}
      {deleteItem && (
        <DeleteItemModal
          item={deleteItem}
          basePath={basePath}
          onClose={() => setDeleteItem(null)}
          onSuccess={() => { setDeleteItem(null); refreshAll(); }}
        />
      )}
      {addStockItem && (
        <AddStockModal
          item={addStockItem}
          basePath={basePath}
          onClose={() => setAddStockItem(null)}
          onSuccess={() => { setAddStockItem(null); refreshAll(); }}
        />
      )}
      {writeOffItem && (
        <WriteOffModal
          item={writeOffItem}
          basePath={basePath}
          onClose={() => setWriteOffItem(null)}
          onSuccess={() => { setWriteOffItem(null); refreshAll(); }}
        />
      )}
      {movementsItem && (
        <MovementsModal
          item={movementsItem}
          basePath={basePath}
          onClose={() => setMovementsItem(null)}
        />
      )}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          highlight ? "bg-destructive/10" : "bg-primary/10"
        }`}
      >
        <Icon className={`w-5 h-5 ${highlight ? "text-destructive" : "text-primary"}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/* ─── Items Table ─── */
function ItemsTable({
  items,
  loading,
  search,
  isViewer,
  onEdit,
  onDelete,
  onAddStock,
  onWriteOff,
  onMovements,
  emptyMsg,
}: {
  items: InventoryItem[];
  loading: boolean;
  search: string;
  isViewer: boolean;
  onEdit: (i: InventoryItem) => void;
  onDelete: (i: InventoryItem) => void;
  onAddStock: (i: InventoryItem) => void;
  onWriteOff: (i: InventoryItem) => void;
  onMovements: (i: InventoryItem) => void;
  emptyMsg?: string;
}) {
  if (loading)
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Loading inventory...
      </div>
    );

  if (items.length === 0)
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground text-sm">
          {emptyMsg || (search ? "No items match your search." : "No inventory items yet.")}
        </p>
      </div>
    );

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Qty</th>
            <th className="px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Cost</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Price</th>
            <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Low Threshold</th>
            <th className="px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Updated</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const qty = Number(item.quantity);
            const threshold = Number(item.lowStockThreshold);
            const isLow = qty <= threshold;
            return (
              <tr
                key={item.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      isLow
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {qty}
                    {isLow && <AlertTriangle className="w-3 h-3" />}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  {item.costPrice ? `₦${Number(item.costPrice).toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 text-foreground">
                  ₦{Number(item.sellingPrice).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {threshold}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {toLagosDateTime(item.updatedAt)}
                </td>
                {!isViewer && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => onMovements(item)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="View Movements"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAddStock(item)}
                        className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Add Stock"
                      >
                        <PackagePlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onWriteOff(item)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Write Off"
                      >
                        <PackageMinus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
                {isViewer && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onMovements(item)}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="View Movements"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Reports View ─── */
function ReportsView({
  reports,
  loading,
  range,
  onRangeChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  onApplyCustom,
}: {
  reports: StockReport[];
  loading: boolean;
  range: string;
  onRangeChange: (v: string) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
  onApplyCustom: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Range selector */}
      <div className="flex flex-wrap gap-2 items-end">
        {[
          { value: "today", label: "Today" },
          { value: "7days", label: "Last 7 Days" },
          { value: "month", label: "This Month" },
          { value: "custom", label: "Custom" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => onRangeChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              range === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => onCustomStartChange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              End Date
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => onCustomEndChange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={onApplyCustom}
            disabled={!customStart || !customEnd}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">Understanding the Report</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li><strong className="text-foreground">Added:</strong> New stock purchased and added to inventory.</li>
          <li><strong className="text-foreground">Sold:</strong> Quantity sold through recorded sales.</li>
          <li><strong className="text-foreground">Reduced:</strong> Goods returned on the same day they were sold.</li>
          <li><strong className="text-foreground">Returned:</strong> Goods returned after the day they were purchased.</li>
          <li><strong className="text-foreground">Written Off:</strong> Stock removed due to damage, expiry, or loss.</li>
          <li><strong className="text-foreground">Field Sales:</strong> Goods sold outside official branch inventory records.</li>
        </ul>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Loading report...
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No stock activity found for this period.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Item</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Added</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Sold</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Reduced</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Returned</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Written Off</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Field Sales</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Closing</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr
                  key={r.itemId}
                  className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{r.itemName}</td>
                  <td className="px-4 py-3 text-primary">{r.totalAdded}</td>
                  <td className="px-4 py-3 text-foreground">{r.totalSold}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.totalReduced}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.totalReturned}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.totalWrittenOff}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.totalFieldSales}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{r.closingStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Create / Edit Modal ─── */
function InventoryFormModal({
  branchId,
  basePath,
  item,
  onClose,
  onSuccess,
}: {
  branchId: string;
  basePath: string;
  item?: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!item;
  const [name, setName] = useState(item?.name || "");
  const [costPrice, setCostPrice] = useState(item?.costPrice || "");
  const [sellingPrice, setSellingPrice] = useState(item?.sellingPrice || "");
  const [quantity, setQuantity] = useState(item?.quantity || "");
  const [threshold, setThreshold] = useState(item?.lowStockThreshold || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const payload: Record<string, string | number> = {};
        if (name !== item.name) payload.name = name.trim();
        if (costPrice !== (item.costPrice || ""))
          payload.costPrice = costPrice ? Number(costPrice) : 0;
        if (sellingPrice !== item.sellingPrice)
          payload.sellingPrice = Number(sellingPrice);
        if (threshold !== item.lowStockThreshold)
          payload.lowStockThreshold = Number(threshold);

        if (Object.keys(payload).length === 0) {
          onClose();
          return;
        }
        const res = await apiRequest(`${basePath}/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ description: res.message });
      } else {
        const payload: Record<string, string | number> = {
          name: name.trim(),
          sellingPrice: Number(sellingPrice),
          quantity: Number(quantity),
          lowStockThreshold: Number(threshold),
        };
        if (costPrice) payload.costPrice = Number(costPrice);

        const res = await apiRequest(basePath, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ description: res.message });
      }
      onSuccess();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-background rounded-xl shadow-lg border border-border w-full max-w-md p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {isEdit ? "Edit Item" : "Add Inventory Item"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Hollandia Yoghurt"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Selling Price (₦) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="2200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Cost Price (₦)
            </label>
            <p className="text-xs text-muted-foreground mb-1">
              Optional. The price you bought the item for.
            </p>
            <input
              type="number"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="1500"
            />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Quantity <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="20"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Low Stock Threshold <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-1">
              You'll be alerted when stock falls to or below this number.
            </p>
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="15"
            />
          </div>
          <button
            type="submit"
            disabled={
              saving ||
              !name.trim() ||
              !sellingPrice ||
              !threshold ||
              (!isEdit && !quantity)
            }
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update Item" : "Add Item"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Confirmation ─── */
function DeleteItemModal({
  item,
  basePath,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  basePath: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const qty = Number(item.quantity);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await apiRequest(`${basePath}/${item.id}`, { method: "DELETE" });
      toast({ description: res.message });
      onSuccess();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-background rounded-xl shadow-lg border border-border w-full max-w-md p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-foreground mb-2">Delete Item</h3>
        {qty > 0 ? (
          <div className="space-y-3 mb-6">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">⚠️ Cannot delete</p>
              <p className="text-xs text-destructive/80 mt-1">
                <strong>{item.name}</strong> still has <strong>{qty}</strong> unit(s) in stock.
                Please write off or sell the remaining stock before deleting.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{item.name}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Item"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Add Stock Modal ─── */
function AddStockModal({
  item,
  basePath,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  basePath: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qty || Number(qty) <= 0) return;
    setSaving(true);
    try {
      const res = await apiRequest(`${basePath}/${item.id}/add-stock`, {
        method: "POST",
        body: JSON.stringify({ quantity: Number(qty) }),
      });
      toast({ description: res.message });
      onSuccess();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-background rounded-xl shadow-lg border border-border w-full max-w-md p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-foreground mb-1">Add Stock</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add new stock to <strong className="text-foreground">{item.name}</strong>. Current
          stock: <strong className="text-foreground">{item.quantity}</strong>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Quantity to Add <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="5"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !qty || Number(qty) <= 0}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add Stock"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Write Off Modal ─── */
function WriteOffModal({
  item,
  basePath,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  basePath: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const currentStock = Number(item.quantity);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) return;
    if (qtyNum > currentStock) {
      toast({
        description: `Cannot write off ${qtyNum} units. Only ${currentStock} in stock.`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await apiRequest(`${basePath}/${item.id}/write-off`, {
        method: "POST",
        body: JSON.stringify({ quantity: qtyNum, reason: reason.trim() }),
      });
      toast({ description: res.message });
      onSuccess();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-background rounded-xl shadow-lg border border-border w-full max-w-md p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-foreground mb-1">Write Off Stock</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Remove stock from <strong className="text-foreground">{item.name}</strong>. Current
          stock: <strong className="text-foreground">{currentStock}</strong>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Quantity to Write Off <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={currentStock}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="5"
            />
            {qty && Number(qty) > currentStock && (
              <p className="text-xs text-destructive mt-1">
                Cannot exceed current stock ({currentStock}).
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="e.g. Goods expired"
            />
          </div>
          <button
              type="submit"
              disabled={
                saving || !qty || Number(qty) <= 0 || Number(qty) > currentStock || !reason.trim()
              }
              className="w-full py-2 rounded-lg bg-destructive text-destructive-foreground font-medium text-sm hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Processing..." : "Write Off Stock"}
            </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Movements Modal ─── */
function MovementsModal({
  item,
  basePath,
  onClose,
}: {
  item: InventoryItem;
  basePath: string;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest<StockMovement[]>(`${basePath}/${item.id}/movements`);
        setMovements(res.data);
      } catch (err: any) {
        toast({ description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [item.id]);

  async function handleExport(fmt: "excel" | "pdf") {
    setExporting(fmt);
    setShowExportMenu(false);
    try {
      const API_BASE = import.meta.env.VITE_BASE_URL || "https://Siliyoung Enterprise-api.monesize.com/v1";
      const endpoint = `${API_BASE}${basePath}/${item.id}/movements/export/${fmt}`;
      const response = await fetch(endpoint, { credentials: "include" });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error((json as any).message || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = item.name.replace(/[^a-z0-9]/gi, "_");
      link.download = `stock_movement_${safeName}.${fmt === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ description: err.message || "Export failed", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  }

  const typeStyles: Record<string, string> = {
    ADD: "bg-primary/10 text-primary",
    SALE: "bg-blue-500/10 text-blue-600",
    RETURN: "bg-amber-500/10 text-amber-600",
    REDUCE: "bg-orange-500/10 text-orange-600",
    WRITE_OFF: "bg-destructive/10 text-destructive",
    FIELD_SALE: "bg-purple-500/10 text-purple-600",
  };

  const inflowTypes = new Set(["ADD", "RETURN"]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Stock Movements</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{item.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Download dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu((v) => !v)}
                disabled={loading || movements.length === 0 || !!exporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium hover:bg-accent transition-colors disabled:opacity-40"
              >
                {exporting ? (
                  <span className="text-xs text-muted-foreground">Exporting...</span>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Export
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-44 rounded-lg border border-border bg-background shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={() => handleExport("excel")}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <FileText className="w-4 h-4 text-red-500" />
                    PDF (.pdf)
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-accent text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Loading movements...
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No stock movements recorded yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {movements.map((m) => {
                const isInflow = inflowTypes.has(m.type);
                const displayNote = m.narration || m.note;
                return (
                  <li
                    key={m.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isInflow ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {isInflow ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            typeStyles[m.type] || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {m.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {isInflow ? "+" : "−"}{m.quantity}
                        </span>
                      </div>
                      {displayNote && (
                        <p className="text-xs text-muted-foreground mt-1 break-words">
                          {displayNote}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {toLagosDateTime(m.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
