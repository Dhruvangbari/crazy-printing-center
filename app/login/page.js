"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { LogIn, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const s = supabase();
      const { data, error } = await s.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const returnUrl = params.get("returnUrl") || params.get("redirect");

        if (data?.user) {
          const isDhruvang = Boolean(data.user.email && data.user.email.toLowerCase() === "dhruvangbari2006@gmail.com");

          const { data: profile } = await s
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

          if (isDhruvang && profile?.role !== "ADMIN") {
            await s.from("profiles").upsert(
              { id: data.user.id, role: "ADMIN" },
              { onConflict: "id" }
            );
          }

          if (isDhruvang || profile?.role === "ADMIN") {
            window.location.href = "/admin";
          } else if (returnUrl) {
            window.location.href = returnUrl;
          } else {
            window.location.href = "/orders";
          }
        } else {
          window.location.href = returnUrl || "/orders";
        }
      }
    } catch (err) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    try {
      const s = supabase();
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const returnUrl = params.get("returnUrl") || params.get("redirect") || "/orders";
        localStorage.setItem("cpc_auth_origin", currentOrigin);
        localStorage.setItem("cpc_auth_return", returnUrl);
      }

      const redirectUrl = `${currentOrigin}/auth/callback`;

      const { error } = await s.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      setError(err.message || "Google login failed");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="wrap">
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to manage and track your print orders</p>
          </div>

          {error && (
            <div className="error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="btn-google"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          <div className="divider">
            <span>or email</span>
          </div>

          <form onSubmit={handleEmailLogin}>
            <div className="field">
              <label>Email Address</label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-light)",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn"
              style={{ width: "100%", marginTop: 8 }}
            >
              <LogIn size={16} />
              <span>{loading ? "Signing In..." : "Sign In"}</span>
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text-muted)" }}>
            Don't have an account?{" "}
            <Link href="/register" style={{ color: "var(--primary)", fontWeight: 700 }}>
              Create Account
            </Link>
          </div>

          {/* Supabase OAuth Configuration Helper */}
          <div style={{ marginTop: 24, background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#64748b" }}>
            <div style={{ fontWeight: 800, color: "#334155", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚙️ Google Login Opening Old Website?</span>
            </div>
            <p style={{ margin: "4px 0 8px", lineHeight: 1.4, fontSize: 11 }}>
              Supabase needs your active domain in its redirect whitelist.
            </p>
            <ol style={{ margin: "0 0 8px 16px", padding: 0, fontSize: 11, lineHeight: 1.5 }}>
              <li>Open <b>Supabase Dashboard ➔ Authentication ➔ URL Configuration</b>.</li>
              <li>Set <b>Site URL</b> to your current domain.</li>
              <li>Add <code>{typeof window !== "undefined" ? window.location.origin : "https://crazy-printing-center.vercel.app"}/**</code> to <b>Redirect URLs</b>.</li>
            </ol>
            <a
              href={
                (process.env.NEXT_PUBLIC_SUPABASE_URL || "").includes(".supabase.co")
                  ? `https://supabase.com/dashboard/project/${(process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace("https://", "").replace("http://", "").split(".")[0]}/auth/url-configuration`
                  : "https://supabase.com/dashboard"
              }
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-block", color: "#4f46e5", fontWeight: 800, fontSize: 11 }}
            >
              Open Supabase URL Configuration ↗
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}