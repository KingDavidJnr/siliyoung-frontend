import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, clearUser, saveUser, type UserData, type UserRole } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { type Branch } from "@/lib/branches";
import { MapPin, Building2, Plus, Pencil, Trash2, X, Eye, EyeOff } from "lucide-react";
import { toLagosDate } from "@/lib/date";
import { toast } from "@/hooks/use-toast";

const isGeneralRole = (role: UserRole) =>
  role === "GENERAL_ADMIN" || role === "GENERAL_VIEWER";

export default function DashboardHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState("");

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Branch CRUD modal state
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchModalError, setBranchModalError] = useState("");

  // Delete confirmation
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      navigate("/", { replace: true });
      return;
    }
    setUser(u);
    if (u.firstLogin) {
      setShowPasswordModal(true);
    } else {
      fetchBranches(u);
    }
  }, [navigate]);

  const fetchBranches = async (u: UserData) => {
    setBranchesLoading(true);
    setBranchesError("");
    try {
      const res = await apiRequest<Branch[]>("/branches");
      let data = res.data;
      if (!isGeneralRole(u.role) && u.branchId) {
        data = data.filter((b) => b.id === u.branchId);
      }
      setBranches(data);
    } catch (err: any) {
      setBranchesError(err.message || "Failed to load branches");
    } finally {
      setBranchesLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (newPassword.length < 6) {
      setPwdError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Passwords do not match");
      return;
    }
    const oldPassword = sessionStorage.getItem("Siliyoung Enterprise_tmp_pwd");
    if (!oldPassword || !user) {
      setPwdError("Session expired. Please log in again.");
      return;
    }
    setPwdLoading(true);
    try {
      const res = await apiRequest<UserData>(`/users/${user.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      saveUser(res.data);
      setUser(res.data);
      sessionStorage.removeItem("Siliyoung Enterprise_tmp_pwd");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({ description: res.message });
      fetchBranches(res.data);
    } catch (err: any) {
      setPwdError(err.message || "Failed to update password");
    } finally {
      setPwdLoading(false);
    }
  };

  // Branch CRUD handlers
  const openCreateBranch = () => {
    setEditingBranch(null);
    setBranchName("");
    setBranchLocation("");
    setBranchModalError("");
    setShowBranchModal(true);
  };

  const openEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchLocation(branch.location);
    setBranchModalError("");
    setShowBranchModal(true);
  };

  const handleBranchSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBranchModalError("");
    if (!branchName.trim() || !branchLocation.trim()) {
      setBranchModalError("Name and location are required");
      return;
    }
    setBranchSaving(true);
    try {
      if (editingBranch) {
        const payload: Record<string, string> = {};
        if (branchName !== editingBranch.name) payload.name = branchName;
        if (branchLocation !== editingBranch.location) payload.location = branchLocation;
        if (Object.keys(payload).length === 0) {
          setShowBranchModal(false);
          return;
        }
        const res = await apiRequest(`/branches/${editingBranch.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ description: res.message });
      } else {
        const res = await apiRequest("/branches", {
          method: "POST",
          body: JSON.stringify({ name: branchName, location: branchLocation }),
        });
        toast({ description: res.message });
      }
      setShowBranchModal(false);
      if (user) fetchBranches(user);
    } catch (err: any) {
      setBranchModalError(err.message || "Failed to save branch");
    } finally {
      setBranchSaving(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!deletingBranch) return;
    setDeleteLoading(true);
    try {
      const res = await apiRequest(`/branches/${deletingBranch.id}`, { method: "DELETE" });
      toast({ description: res.message });
      setDeletingBranch(null);
      if (user) fetchBranches(user);
    } catch (err: any) {
      toast({ description: err.message || "Failed to delete branch", variant: "destructive" });
      setDeleteLoading(false);
    }
  };

  if (!user) return null;

  const isAdmin = user.role === "GENERAL_ADMIN";

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold text-foreground mb-1">
          Welcome, {user.firstName} 👋
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {isGeneralRole(user.role) ? "All branches" : "Your branch"}
        </p>

        {/* Branch header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            {isGeneralRole(user.role) ? "All Branches" : "Your Branch"}
          </h3>
          {isAdmin && (
            <button
              onClick={openCreateBranch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition active:scale-[0.97]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Branch
            </button>
          )}
        </div>

        {branchesLoading && (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading branches…</div>
        )}
        {branchesError && (
          <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3 text-center">{branchesError}</div>
        )}
        {!branchesLoading && !branchesError && branches.length === 0 && (
          <div className="text-sm text-muted-foreground py-8 text-center">No branches found.</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-card rounded-xl border border-border p-4 hover:border-primary/40 hover:shadow-sm transition"
            >
              <button
                onClick={() => navigate(`/dashboard/branch/${branch.id}`)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{branch.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {branch.location}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Created {toLagosDate(branch.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
              {isAdmin && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => openEditBranch(branch)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-accent transition"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingBranch(branch)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/5 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Force password change modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center px-4">
          <form
            onSubmit={handlePasswordUpdate}
            className="bg-card w-full max-w-sm rounded-2xl p-6 animate-slide-up"
          >
            <h3 className="text-lg font-bold text-foreground mb-2">Update Your Password</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Since this is your first login, please update your password to continue.
            </p>
            <div className="space-y-3">
              {pwdError && (
                <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3 text-center">{pwdError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">New Password</label>
                <div className="relative">
                  <input type={showNewPwd ? "text" : "password"} placeholder="Enter your new password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-12 px-4 pr-11 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition" />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input type={showConfirmPwd ? "text" : "password"} placeholder="Re-enter your new password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-12 px-4 pr-11 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition" />
                  <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                    {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1.5">Passwords do not match</p>
                )}
              </div>
              <button type="submit" disabled={pwdLoading || (confirmPassword.length > 0 && newPassword !== confirmPassword)} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm transition active:scale-[0.98] disabled:opacity-60">
                {pwdLoading ? "Updating…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Edit branch modal */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center">
          <form
            onSubmit={handleBranchSave}
            className="bg-card w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up safe-bottom relative"
          >
            <button type="button" onClick={() => setShowBranchModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-4">
              {editingBranch ? "Edit Branch" : "New Branch"}
            </h3>
            <div className="space-y-3">
              {branchModalError && (
                <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3 text-center">{branchModalError}</div>
              )}
              <input type="text" placeholder="Branch name" required value={branchName} onChange={(e) => setBranchName(e.target.value)} className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition" />
              <input type="text" placeholder="Location" required value={branchLocation} onChange={(e) => setBranchLocation(e.target.value)} className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition" />
              <button type="submit" disabled={branchSaving} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm transition active:scale-[0.98] disabled:opacity-60">
                {branchSaving ? "Saving…" : editingBranch ? "Update Branch" : "Create Branch"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingBranch && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up safe-bottom">
            <h3 className="text-lg font-bold text-foreground mb-2">Delete Branch</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deletingBranch.name}</span>?
            </p>
            <p className="text-sm text-destructive mb-4">
              ⚠️ All data associated with this branch (sales, inventory, users, etc.) will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingBranch(null)}
                className="flex-1 h-12 rounded-lg border border-border text-foreground font-semibold text-sm transition active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBranch}
                disabled={deleteLoading}
                className="flex-1 h-12 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm transition active:scale-[0.98] disabled:opacity-60"
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
