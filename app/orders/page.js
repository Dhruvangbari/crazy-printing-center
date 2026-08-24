"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import FormattedDate from "../../components/FormattedDate";
import { 
  FileText, 
  PlusCircle, 
  Eye, 
  ShoppingBag, 
  ArrowRight,
  Clock,
  RefreshCw,
  Receipt,
  CheckCircle2,
  Sparkles,
  Zap
} from "lucide-react";
import { calculateOrderPriority } from "../../lib/aiOrderAgent";

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const s = supabase();
      const { data: { user } } = await s.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await s
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading orders:", error);
      } else {
        setOrders(data || []);
        setLastRefreshed(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadOrders();

    const s = supabase();
    // 1. Supabase Postgres Realtime Subscription
    const channel = s
      .channel("customer_orders_live_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadOrders(true);
        }
      )
      .subscribe();

    // 2. Auto-refresh polling every 6 seconds as a backup
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadOrders(true);
      }
    }, 6000);

    return () => {
      s.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadOrders, autoRefresh]);

  if (loading) {
    return (
      <main className="wrap">
        <div className="card" style={{ textAlign: "center", padding: 50 }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          <div>Connecting to Real-time Print Ledger...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      {/* Header & Refresh Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>My Print Orders</h1>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ecfdf5", color: "#065f46", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, border: "1px solid #a7f3d0" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              <span>LIVE SYNC</span>
            </div>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Real-time status updates & instant tax invoices • {lastRefreshed ? `Updated at ${lastRefreshed}` : "Auto-synced"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => loadOrders(false)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Refresh order statuses"
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <Link href="/bills" className="btn btn-secondary btn-sm">
            <Receipt size={14} />
            <span>Bill Center</span>
          </Link>

          <Link href="/order" className="btn btn-sm">
            <PlusCircle size={15} />
            <span>New Print Order</span>
          </Link>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <ShoppingBag size={30} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Print Orders Yet</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 400, margin: "0 auto 24px" }}>
            You haven't placed any print jobs yet. Upload your first PDF or document to get started!
          </p>
          <Link href="/order" className="btn btn-lg">
            <PlusCircle size={18} />
            <span>Create Your First Order</span>
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container" style={{ border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Date & Time</th>
                  <th>Specifications</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: "var(--text-main)" }}>{o.order_number}</div>
                      {o.priority === "EXPRESS" && (
                        <span style={{ fontSize: 10, fontWeight: 800, background: "#fef3c7", color: "#b45309", padding: "2px 6px", borderRadius: 4, marginTop: 4, display: "inline-block" }}>
                          ⚡ EXPRESS
                        </span>
                      )}
                    </td>

                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      <FormattedDate date={o.created_at} />
                    </td>

                    <td>
                      <div style={{ fontWeight: 700 }}>{o.paper_size} • {o.color_mode}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {o.page_count || 1} pgs • {o.copies} {o.copies === 1 ? "copy" : "copies"} • {o.sides}
                      </div>
                    </td>

                    <td style={{ fontWeight: 900, fontSize: 15, color: "var(--primary)" }}>
                      ₹{o.total}.00
                    </td>

                    <td>
                      <span className={`status-badge status-${o.status}`}>
                        {o.status?.replaceAll("_", " ")}
                      </span>
                      {(() => {
                        const p = calculateOrderPriority(o);
                        if (["DELIVERED", "CANCELLED"].includes(o.status)) return null;
                        return (
                          <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                            <Clock size={10} color="var(--primary)" />
                            <span>Queue: ~{p.estMinutes}m ({p.level})</span>
                          </div>
                        );
                      })()}
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Link href={`/orders/${o.id}`} className="btn btn-sm" style={{ padding: "5px 12px", fontSize: 12 }}>
                          <Eye size={13} />
                          <span>Track & Bill</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}