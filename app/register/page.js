"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { UserPlus, AlertCircle, CheckCircle } from "lucide-react";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setMsg("");
    setIsError(false);
    setLoading(true);

    try {
      const s = supabase();
      const { data, error } = await s.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
          },
        },
      });

      if (error) {
        setIsError(true);
        setMsg(error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Ensure profile is recorded
        await s.from("profiles").upsert(
          {
            id: data.user.id,
            name: formData.name.trim(),
            phone: formData.phone.trim() || null,
          },
          { onConflict: "id" }
        );
      }

      setIsError(false);
      setMsg("Account created successfully! Redirecting...");
      setTimeout(() => router.push("/orders"), 1200);
    } catch (err) {
      setIsError(true);
      setMsg(err.message || "Registration failed");
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setMsg("");
    setIsError(false);
    setGoogleLoading(true);

    try {
      const s = supabase();
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { error } = await s.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setIsError(true);
        setMsg(error.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      setIsError(true);
      setMsg(err.message || "Google signup failed");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="wrap">
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join Dhruvang Crazy Printing Center for quick & easy printing</p>
          </div>

          {msg && (
            <div className={isError ? "error" : "success"}>
              {isError ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              <span>{msg}</span>
            </div>
          )}

          {/* Google Sign Up */}
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
            <span>{googleLoading ? "Connecting to Google..." : "Sign up with Google"}</span>
          </button>

          <div className="divider">
            <span>or with email</span>
          </div>

          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label>Phone Number</label>
              <input
                type="text"
                placeholder="+91 8857871669"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn"
              style={{ width: "100%", marginTop: 8 }}
            >
              <UserPlus size={16} />
              <span>{loading ? "Creating Account..." : "Create Account"}</span>
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}