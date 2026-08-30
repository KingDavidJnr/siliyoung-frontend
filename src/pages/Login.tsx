import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { saveUser, type UserData } from "@/lib/auth";
import PoweredByFooter from "@/components/PoweredByFooter";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Login() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiRequest<UserData>("/users/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      saveUser(res.data);
      if (res.data.firstLogin) {
        sessionStorage.setItem("Siliyoung Enterprise_tmp_pwd", password);
      }
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Mobile layout (unchanged)
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background safe-top">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                Siliyoung Enterprise <span className="text-primary">ERP</span>
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Access Siliyoung Enterprise ERP to manage sales, inventory, and finances seamlessly. Secure, real-time insights for all branches.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3 text-center">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-input bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-4 pr-12 rounded-lg border border-input bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm transition active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        <PoweredByFooter />
      </div>
    );
  }

  // Desktop layout — split screen
  return (
    <div className="min-h-screen flex">
      {/* Left branded panel */}
      <div
        className="hidden lg:flex w-1/2 relative overflow-hidden flex-col items-center justify-center text-center px-12"
        style={{
          background: "linear-gradient(135deg, hsl(120 61% 20%) 0%, hsl(120 61% 34%) 50%, hsl(120 40% 25%) 100%)",
        }}
      >
        {/* Animated decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, hsl(120 61% 60%) 0%, transparent 70%)",
              animation: "float1 8s ease-in-out infinite",
            }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, hsl(120 80% 70%) 0%, transparent 70%)",
              animation: "float2 10s ease-in-out infinite",
            }}
          />
          <div
            className="absolute top-1/3 right-12 w-48 h-48 rounded-full opacity-[0.07]"
            style={{
              background: "radial-gradient(circle, hsl(120 61% 80%) 0%, transparent 70%)",
              animation: "float3 6s ease-in-out infinite",
            }}
          />
        </div>

        <div className="relative z-10 max-w-md animate-fade-in">
          <h2 className="text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Siliyoung Enterprise ERP
          </h2>
          <p className="text-white/80 text-base leading-relaxed mb-12">
            Your complete business management dashboard.
            Monitor sales, manage inventory, track expenses,
            and grow your business across all branches.
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-10">
            <div className="text-center" style={{ animation: "statFade 0.6s ease-out 0.3s both" }}>
              <div className="text-3xl font-extrabold text-white">Real-time</div>
              <div className="text-white/60 text-sm mt-1">Analytics</div>
            </div>
            <div className="text-center" style={{ animation: "statFade 0.6s ease-out 0.5s both" }}>
              <div className="text-3xl font-extrabold text-white">Multi</div>
              <div className="text-white/60 text-sm mt-1">Branch</div>
            </div>
            <div className="text-center" style={{ animation: "statFade 0.6s ease-out 0.7s both" }}>
              <div className="text-3xl font-extrabold text-white">Secure</div>
              <div className="text-white/60 text-sm mt-1">Platform</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-full max-w-sm animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                Siliyoung Enterprise <span className="text-primary">ERP</span>
              </h1>
              <h2 className="mt-3 text-lg font-semibold text-foreground">Welcome Back</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to access your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3 text-center">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-input bg-muted/40 text-foreground text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all duration-200"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-4 pr-12 rounded-xl border border-input bg-muted/40 text-foreground text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all duration-200"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign In →"}
              </button>
            </form>
          </div>
        </div>

        <PoweredByFooter />
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 20px) scale(1.1); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, -30px) scale(1.05); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-15px, 15px); }
        }
        @keyframes statFade {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
