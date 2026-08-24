"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  ShoppingBag, 
  Clock, 
  IndianRupee, 
  ShieldCheck,
  PlusCircle
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, spent: 0 });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = supabase();

    async function loadProfile() {
      try {
        const { data: { user } } = await s.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        setUser(user);

        // Fetch profile
        const { data: prof } = await s
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (prof) {
          setProfile(prof);
          setName(prof.name || "");
          setPhone(prof.phone || "");
        }

        // Fetch order stats
        const { data: orders } = await s
          .from("orders")
          .select("id, total, status")
          .eq("user_id", user.id);

        if (orders) {
          const totalOrders = orders.length;
          const activeOrders = orders.filter(
            (o) => !["DELIVERED", "CANCELLED"].includes(o.status)
          ).length;
          const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

          setStats({ total: totalOrders, active: activeOrders, spent: totalSpent });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setIsError(false);

    try {
      const s = supabase();
      const { error } = await s
        .from("profiles")
        .update({
          name: name.trim(),
          phone: phone.trim(),
        })
        .eq("id", user.id);

      if (error) {
        setIsError(true);
        setMsg("Failed to save: " + error.message);
      } else {
        setProfile((prev) => ({ ...prev, name, phone }));
        setIsError(false);
        setMsg("Profile details updated successfully!");
        setTimeout(() => setMsg(""), 3000);
      }
    } catch (err) {
      setIsError(true);
      setMsg(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="wrap">
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          Loading profile...
        </div>
      </main>
    );
  }

  const isAdmin = Boolean(
    (user?.email && user.email.toLowerCase() === "dhruvangbari2006@gmail.com") ||
    profile?.role === "ADMIN"
  );

  return (
    <main className="wrap">
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Profile Header Card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div 
              className="avatar-badge" 
              style={{ width: 64, height: 64, fontSize: 24 }}
            >
              {(name || user?.email || "U")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>{name || "Customer"}</h1>
                <span 
                  className="status-badge"
                  style={{
                    background: isAdmin ? "linear-gradient(135deg, #ec4899, #8b5cf6)" : "var(--primary-light)",
                    color: isAdmin ? "white" : "var(--primary)",
                    border: "none",
                  }}
                >
                  {isAdmin ? "⚡ ADMIN / SHOP OWNER" : "CUSTOMER"}
                </span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
                {user?.email}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/order" className="btn btn-sm">
                <PlusCircle size={15} />
                <span>New Order</span>
              </Link>
              {isAdmin && (
                <Link href="/admin" className="btn btn-secondary btn-sm">
                  <ShieldCheck size={15} />
                  <span>Admin Dashboard</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Quick Order Stats */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <ShoppingBag size={24} />
            </div>
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Orders</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
              <Clock size={24} />
            </div>
            <div>
              <div className="stat-value">{stats.active}</div>
              <div className="stat-label">Active Orders</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <IndianRupee size={24} />
            </div>
            <div>
              <div className="stat-value">₹{stats.spent}</div>
              <div className="stat-label">Total Spent</div>
            </div>
          </div>
        </div>

        {/* Edit Profile Details */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <User size={20} color="var(--primary)" />
              <span>Personal Information</span>
            </h2>
          </div>

          {msg && (
            <div className={isError ? "error" : "success"}>
              {isError ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              <span>{msg}</span>
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="row">
              <div className="field">
                <label>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="field">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 8857871669"
                />
              </div>
            </div>

            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                style={{ background: "#f1f5f9", cursor: "not-allowed" }}
              />
              <small style={{ color: "var(--text-light)", fontSize: 12, marginTop: 4, display: "block" }}>
                Email address is linked to your authentication account
              </small>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button type="submit" disabled={saving} className="btn">
                <Save size={16} />
                <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
