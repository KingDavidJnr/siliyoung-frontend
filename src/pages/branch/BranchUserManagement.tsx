import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { toLagosDateTime } from "@/lib/date";
import { getUser, UserData } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Eye, EyeOff, ChevronDown } from "lucide-react";

type BranchUser = UserData;

const ROLE_LABELS: Record<string, string> = {
  BRANCH_ADMIN: "Branch Admin",
  BRANCH_MEMBER: "Branch Member",
};

const BRANCH_ROLES = ["BRANCH_ADMIN", "BRANCH_MEMBER"] as const;

export default function BranchUserManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const currentUser = getUser();
  const isGeneralAdmin = currentUser?.role === "GENERAL_ADMIN";
  const [users, setUsers] = useState<BranchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<BranchUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<BranchUser | null>(null);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await apiRequest<BranchUser[]>(`/users/branch/${branchId}`);
      setUsers(res.data);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, [branchId]);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">User Management</h2>
          <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? "s" : ""} in this branch</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No users in this branch.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Username</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{user.firstName} {user.lastName}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">@{user.username}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">@{user.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "BRANCH_ADMIN" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{toLagosDateTime(user.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditUser(user)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Edit role">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteUser(user)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Delete user">
                          <Trash2 className="w-4 h-4" />
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

      {showCreateModal && branchId && (
        <CreateBranchUserModal branchId={branchId} onClose={() => setShowCreateModal(false)} onSuccess={fetchUsers} />
      )}
      {editUser && (
        <EditBranchUserModal user={editUser} onClose={() => setEditUser(null)} onSuccess={fetchUsers} />
      )}
      {deleteUser && (
        <DeleteBranchUserModal user={deleteUser} onClose={() => setDeleteUser(null)} onSuccess={fetchUsers} />
      )}
    </div>
  );
}

function CreateBranchUserModal({ branchId, onClose, onSuccess }: { branchId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", username: "", password: "", role: "BRANCH_MEMBER" });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, branchId };
      const res = await apiRequest("/users", { method: "POST", body: JSON.stringify(payload) });
      toast({ description: res.message });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="Create Branch User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FieldInput label="First Name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
          <FieldInput label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
        </div>
        <FieldInput label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
        <div className="relative">
          <FieldInput label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type={showPass ? "text" : "password"} required />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-8 text-muted-foreground hover:text-foreground">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <FieldSelect label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={BRANCH_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {submitting ? "Creating…" : "Create User"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function EditBranchUserModal({ user, onClose, onSuccess }: { user: BranchUser; onClose: () => void; onSuccess: () => void }) {
  const [role, setRole] = useState(user.role);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (role === user.role) { onClose(); return; }
    setSubmitting(true);
    try {
      const res = await apiRequest(`/users/${user.id}/role-branch`, { method: "PATCH", body: JSON.stringify({ role }) });
      toast({ description: res.message });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose} title={`Edit ${user.firstName} ${user.lastName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldSelect label="Role" value={role} onChange={(v) => setRole(v as any)} options={BRANCH_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function DeleteBranchUserModal({ user, onClose, onSuccess }: { user: BranchUser; onClose: () => void; onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);
    try {
      const res = await apiRequest(`/users/${user.id}`, { method: "DELETE" });
      toast({ description: res.message });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="Delete User">
      <p className="text-sm text-muted-foreground mb-4">
        Are you sure you want to delete <strong className="text-foreground">{user.firstName} {user.lastName}</strong>? This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
        <button onClick={handleDelete} disabled={submitting} className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50">
          {submitting ? "Deleting…" : "Delete User"}
        </button>
      </div>
    </ModalOverlay>
  );
}

/* Shared UI helpers */
function ModalOverlay({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-lg animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options, required }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} required={required}
          className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}
