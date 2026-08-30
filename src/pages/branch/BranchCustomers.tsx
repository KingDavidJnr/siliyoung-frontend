import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { toLagosDateTime } from "@/lib/date";
import { getUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Users, Phone, Mail, MapPin, Search } from "lucide-react";

interface Customer {
  id: string;
  branchId: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function BranchCustomers() {
  const { branchId } = useParams<{ branchId: string }>();
  const currentUser = getUser();
  const isViewer = currentUser?.role === "GENERAL_VIEWER";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const res = await apiRequest<Customer[]>(`/customers/${branchId}`);
      setCustomers(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (branchId) fetchCustomers();
  }, [branchId]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const withEmail = customers.filter((c) => c.email).length;
  const withAddress = customers.filter((c) => c.address).length;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Customers</h2>
          <p className="text-sm text-muted-foreground">Manage branch customers.</p>
        </div>
        {!isViewer && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{customers.length}</p>
            <p className="text-xs text-muted-foreground">Total Customers</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{withEmail}</p>
            <p className="text-xs text-muted-foreground">With Email</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{withAddress}</p>
            <p className="text-xs text-muted-foreground">With Address</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading customers...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground text-sm">
            {search ? "No customers match your search." : "No customers yet. Add your first customer."}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Address</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Added</th>
                {!isViewer && <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.address || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{toLagosDateTime(c.createdAt)}</td>
                  {!isViewer && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditCustomer(c)}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteCustomer(c)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CustomerFormModal
          branchId={branchId!}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCustomers();
          }}
        />
      )}

      {/* Edit Modal */}
      {editCustomer && (
        <CustomerFormModal
          branchId={branchId!}
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
          onSuccess={() => {
            setEditCustomer(null);
            fetchCustomers();
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteCustomer && (
        <DeleteCustomerModal
          customer={deleteCustomer}
          onClose={() => setDeleteCustomer(null)}
          onSuccess={() => {
            setDeleteCustomer(null);
            fetchCustomers();
          }}
        />
      )}
    </div>
  );
}

/* ─── Create / Edit Modal ─── */
function CustomerFormModal({
  branchId,
  customer,
  onClose,
  onSuccess,
}: {
  branchId: string;
  customer?: Customer;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!customer;
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [address, setAddress] = useState(customer?.address || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        const payload: Record<string, string> = {};
        if (name !== customer.name) payload.name = name.trim();
        if (phone !== customer.phone) payload.phone = phone.trim();
        if (email !== (customer.email || "")) payload.email = email.trim();
        if (address !== (customer.address || "")) payload.address = address.trim();

        if (Object.keys(payload).length === 0) {
          onClose();
          return;
        }
        const res = await apiRequest(`/customers/${customer.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ description: res.message });
      } else {
        const payload: Record<string, string> = {
          name: name.trim(),
          phone: phone.trim(),
          branchId,
        };
        if (email.trim()) payload.email = email.trim();
        if (address.trim()) payload.address = address.trim();

        const res = await apiRequest("/customers", {
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
      <div className="bg-background rounded-xl shadow-lg border border-border w-full max-w-md p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {isEdit ? "Edit Customer" : "Add Customer"}
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
              placeholder="Customer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Phone <span className="text-destructive">*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="08012345678"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="customer@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Street address, city"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim() || !phone.trim()}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update Customer" : "Add Customer"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Confirmation Modal ─── */
function DeleteCustomerModal({
  customer,
  onClose,
  onSuccess,
}: {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await apiRequest(`/customers/${customer.id}`, { method: "DELETE" });
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
        <h3 className="text-lg font-semibold text-foreground mb-2">Delete Customer</h3>
        <div className="space-y-3 mb-6">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{customer.name}</strong>?
          </p>
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium">⚠️ Warning</p>
            <p className="text-xs text-destructive/80 mt-1">
              All records attached to this customer will be permanently deleted — including any outstanding debt or payment history. This action cannot be undone.
            </p>
          </div>
        </div>
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
            {deleting ? "Deleting..." : "Delete Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
