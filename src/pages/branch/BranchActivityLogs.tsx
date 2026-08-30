import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { toLagosDateTime } from "@/lib/date";
import { ScrollText, Filter, ChevronRight, X, Package, ShoppingCart, CreditCard, Receipt, User } from "lucide-react";

type AuditLog = {
  id: string;
  branchId: string;
  userId: string;
  module: string;
  action: string;
  referenceType: string;
  referenceId: string;
  createdAt: string;
  user: { firstName?: string; lastName?: string; username: string };
};

type DateRange = "today" | "7days" | "month" | "custom";

const MODULE_OPTIONS = ["Sales", "Inventory", "Payments", "Expenses"] as const;

const MODULE_ICONS: Record<string, React.ReactNode> = {
  Sales: <ShoppingCart className="w-4 h-4" />,
  Inventory: <Package className="w-4 h-4" />,
  Payments: <CreditCard className="w-4 h-4" />,
  Expenses: <Receipt className="w-4 h-4" />,
};

const MODULE_COLORS: Record<string, string> = {
  Sales: "bg-blue-500/10 text-blue-600 border-blue-200",
  Inventory: "bg-amber-500/10 text-amber-600 border-amber-200",
  Payments: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  Expenses: "bg-rose-500/10 text-rose-600 border-rose-200",
};

function getDateRange(range: DateRange, customStart: string, customEnd: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = today.toISOString().split("T")[0];
  let end = start;

  if (range === "7days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    start = d.toISOString().split("T")[0];
  } else if (range === "month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
  } else if (range === "custom") {
    start = customStart;
    end = customEnd;
  }
  return { start, end };
}

export default function BranchActivityLogs() {
  const { branchId } = useParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLogs = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const { start, end } = getDateRange(range, customStart, customEnd);
      if (range === "custom" && (!customStart || !customEnd)) { setLoading(false); return; }

      let url: string;
      if (moduleFilter) {
        url = `/audit-logs/report/filter/${branchId}?start_date=${start}&end_date=${end}&module=${moduleFilter}`;
      } else {
        url = `/audit-logs/${branchId}?start_date=${start}&end_date=${end}`;
      }
      const res = await apiRequest<AuditLog[]>(url);
      setLogs(res.data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [branchId, range, customStart, customEnd, moduleFilter]);

  const viewDetail = async (log: AuditLog) => {
    setDetailLoading(true);
    setSelectedLog(log);
    try {
      const res = await apiRequest<AuditLog>(`/audit-logs/${branchId}/${log.id}`);
      setSelectedLog(res.data);
    } catch {
      // keep the list version
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-xl font-bold text-foreground">Activity Logs</h2>
          <p className="text-sm text-muted-foreground">Track all actions performed in this branch.</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition"
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mt-4 bg-card rounded-xl border border-border p-4 space-y-4">
          {/* Date Range */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Time Range</label>
            <div className="flex flex-wrap gap-2">
              {([["today", "Today"], ["7days", "Last 7 Days"], ["month", "This Month"], ["custom", "Custom"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setRange(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${range === val ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-accent"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <div className="flex gap-2 mt-3">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              </div>
            )}
          </div>

          {/* Module Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Filter by Module</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setModuleFilter("")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${!moduleFilter ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-accent"}`}
              >
                All
              </button>
              {MODULE_OPTIONS.map(m => (
                <button
                  key={m}
                  onClick={() => setModuleFilter(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${moduleFilter === m ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-accent"}`}
                >
                  {MODULE_ICONS[m]}
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <ScrollText className="w-4 h-4" />
        <span>{loading ? "Loading..." : `${logs.length} log${logs.length !== 1 ? "s" : ""} found`}</span>
        {moduleFilter && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs">
            {moduleFilter}
            <button onClick={() => setModuleFilter("")}><X className="w-3 h-3" /></button>
          </span>
        )}
      </div>

      {/* Logs List */}
      <div className="mt-4 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))
        ) : logs.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <ScrollText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No activity logs found for this period.</p>
          </div>
        ) : (
          logs.map(log => (
            <button
              key={log.id}
              onClick={() => viewDetail(log)}
              className="w-full text-left bg-card rounded-xl border border-border p-4 hover:bg-accent/50 transition flex items-start gap-3"
            >
              <div className={`mt-0.5 p-2 rounded-lg border ${MODULE_COLORS[log.module] || "bg-muted text-muted-foreground border-border"}`}>
                {MODULE_ICONS[log.module] || <ScrollText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug line-clamp-2">{log.action}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-muted-foreground">{toLagosDateTime(log.createdAt)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${MODULE_COLORS[log.module] || "bg-muted border-border text-muted-foreground"}`}>{log.module}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
            </button>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedLog(null)}>
          <div className="fixed inset-0 bg-foreground/40" />
          <div
            className="relative bg-background w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border p-6 max-h-[85vh] overflow-y-auto z-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Log Details</h3>
              <button onClick={() => setSelectedLog(null)} className="p-1 rounded-lg hover:bg-accent text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            {detailLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Module Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${MODULE_COLORS[selectedLog.module] || "bg-muted border-border text-muted-foreground"}`}>
                  {MODULE_ICONS[selectedLog.module] || <ScrollText className="w-4 h-4" />}
                  {selectedLog.module}
                </div>

                {/* Action */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Action</label>
                  <p className="text-sm text-foreground mt-1">{selectedLog.action}</p>
                </div>

                {/* User */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Performed By</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {selectedLog.user.firstName && selectedLog.user.lastName
                          ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}`
                          : selectedLog.user.username}
                      </p>
                      <p className="text-xs text-muted-foreground">@{selectedLog.user.username}</p>
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Timestamp</label>
                  <p className="text-sm text-foreground mt-1">{toLagosDateTime(selectedLog.createdAt)}</p>
                </div>

                {/* Reference */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Reference Type</label>
                    <p className="text-sm text-foreground mt-1">{selectedLog.referenceType}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Reference ID</label>
                    <p className="text-xs text-foreground mt-1 font-mono break-all">{selectedLog.referenceId}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
