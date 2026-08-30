import { useState } from "react";
import { getUser, saveUser, type UserData } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

export default function BranchProfile() {
  const user = getUser();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!user) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest<UserData>(`/users/${user.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      saveUser(res.data);
      setSuccess(res.message);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 animate-fade-in">
      <h2 className="text-xl font-bold text-foreground mb-1">My Profile</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {user.firstName} {user.lastName} · {user.role.replace(/_/g, " ")}
      </p>

      <div className="bg-card rounded-xl border border-border p-5 max-w-md">
        <h3 className="text-sm font-semibold text-foreground mb-4">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3 text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-primary/10 text-primary text-sm px-4 py-3 text-center">
              {success}
            </div>
          )}
          <input
            type="password"
            placeholder="Current password"
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition"
          />
          <input
            type="password"
            placeholder="New password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
