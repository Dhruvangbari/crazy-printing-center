"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const s = supabase();

    async function handleAuth() {
      try {
        const { data: { user }, error } = await s.auth.getUser();

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (user) {
          // Sync profile
          const name = 
            user.user_metadata?.full_name || 
            user.user_metadata?.name || 
            user.email?.split("@")[0] || 
            "Customer";

          await s.from("profiles").upsert(
            {
              id: user.id,
              name: name,
              phone: user.user_metadata?.phone || null,
            },
            { onConflict: "id" }
          );

          // Check role
          const { data: profile } = await s
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          if (profile?.role === "ADMIN") {
            router.push("/admin");
          } else {
            router.push("/orders");
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        setErrorMsg(err.message || "Authentication failed");
      }
    }

    handleAuth();
  }, [router]);

  return (
    <main className="wrap" style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ textAlign: "center", padding: "40px 30px", maxWidth: 400 }}>
        {errorMsg ? (
          <div>
            <h3 style={{ color: "var(--danger)", marginBottom: 10 }}>Authentication Error</h3>
            <p className="error">{errorMsg}</p>
            <a href="/login" className="btn btn-sm" style={{ marginTop: 15 }}>
              Return to Login
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Loader2 className="spinner" size={36} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Completing Sign In...</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Setting up your secure session
              </p>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
