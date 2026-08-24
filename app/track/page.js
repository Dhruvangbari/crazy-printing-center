"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import FormattedDate from "../../components/FormattedDate";
import VirtualDeliveryMap from "../../components/VirtualDeliveryMap";
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  Package, 
  Printer, 
  Truck, 
  AlertCircle,
  FileText,
  Home,
  ArrowRight,
  MessageCircle,
  Receipt,
  RefreshCw
} from "lucide-react";
import { buildWhatsAppLink, buildOrderStatusMessage } from "../../lib/whatsapp";
import CrazyLiveTimeline from "../../components/CrazyLiveTimeline";

export default function Track() {
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function reloadTrackedOrder(num, isSilent = false) {
    if (!num) return;
    if (!isSilent) setRefreshing(true);
    try {
      const s = supabase();
      const { data, error } = await s
        .from("orders")
        .select("*, status_history(*)")
        .eq("order_number", num.trim())
        .single();
      if (!error && data) {
        setOrder(data);
      }
    } catch (e) {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (order?.id && order?.order_number) {
      const s = supabase();
      const channel = s
        .channel(`track_live_order_${order.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
          () => {
            reloadTrackedOrder(order.order_number, true);
          }
        )
        .subscribe();

      const interval = setInterval(() => {
        reloadTrackedOrder(order.order_number, true);
      }, 5000);

      return () => {
        s.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [order?.id, order?.order_number]);

  async function handleTrack(e) {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    setErrorMsg("");
    setOrder(null);
    setLoading(true);

    try {
      const s = supabase();
      const { data, error } = await s
        .from("orders")
        .select("*, status_history(*)")
        .eq("order_number", orderNumber.trim())
        .single();

      if (error || !data) {
        setErrorMsg("No order found with this order number. Please verify your tracking code.");
      } else {
        setOrder(data);
      }
    } catch (err) {
      setErrorMsg("Failed to fetch order: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { key: "ORDER_RECEIVED", label: "Received", icon: FileText },
    { key: "PAYMENT_VERIFIED", label: "Paid", icon: CheckCircle2 },
    { key: "PRINTING", label: "Printing", icon: Printer },
    { key: "READY", label: "Ready", icon: Package },
    { key: "DELIVERED", label: "Delivered", icon: Truck },
  ];

  function getStepStatus(stepKey) {
    if (!order) return "pending";
    const statusOrder = [
      "ORDER_RECEIVED",
      "PAYMENT_SUBMITTED",
      "PAYMENT_VERIFIED",
      "PRINTING",
      "QUALITY_CHECK",
      "READY",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ];

    const currentIndex = statusOrder.indexOf(order.status);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (currentIndex >= stepIndex) return "completed";
    return "pending";
  }

  return (
    <main className="wrap">
      <div style={{ maxWidth: 760, margin: "20px auto" }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>
            <Home size={15} />
            <span>Home</span>
          </Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 600 }}>Track Order</span>
        </div>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Track Your Order</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Enter your order tracking number (e.g. CPC-20260823-1234)
          </p>
        </div>

        {/* Search Card */}
        <div className="card" style={{ marginBottom: 24, padding: "24px 28px" }}>
          <form onSubmit={handleTrack}>
            <div className="field">
              <label>Order Tracking Number</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  placeholder="CPC-20260823-1234"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  style={{ flex: 1, fontSize: 15 }}
                  required
                />
                <button type="submit" disabled={loading} className="btn">
                  <Search size={16} />
                  <span>{loading ? "Searching..." : "Track"}</span>
                </button>
              </div>
            </div>
          </form>

          {errorMsg && (
            <div className="error" style={{ marginTop: 12, marginBottom: 0 }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Track Result Details */}
        {order && (
          <div>
            {/* Live Virtual Route Tracker */}
            <VirtualDeliveryMap order={order} />

            {/* Anti-Fraud Rejection Alert if payment was rejected */}
            {(order.status === "CANCELLED" || (order.status_history && order.status_history.some((h) => h.message && (h.message.includes("FAKE_SCREENSHOT") || h.message.toLowerCase().includes("fake"))))) && (
              <div style={{ background: "#fef2f2", border: "2px solid #ef4444", borderRadius: "var(--radius-lg)", padding: "16px 20px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>🚨</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: "#991b1b" }}>Payment Verification Rejected: Fake / Invalid Screenshot</span>
                </div>
                <p style={{ fontSize: 13, color: "#7f1d1d", margin: "0 0 10px", lineHeight: 1.5 }}>
                  The uploaded payment screenshot / UTR was not credited to our store bank account. Please re-upload genuine proof.
                </p>
                <Link href={`/orders/${order.id}`} className="btn btn-sm" style={{ background: "#dc2626", color: "white", textDecoration: "none" }}>
                  <span>Re-upload Genuine Payment Proof & UTR ↻</span>
                </Link>
              </div>
            )}

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 800 }}>{order.order_number}</h2>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                    Ordered on <FormattedDate date={order.created_at} includeTime={false} />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => reloadTrackedOrder(order.order_number, false)}
                    disabled={refreshing}
                    className="btn btn-secondary btn-sm"
                    title="Refresh live status from print ledger"
                  >
                    <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
                    <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
                  </button>

                  <a
                    href={buildWhatsAppLink(null, buildOrderStatusMessage(order))}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-whatsapp btn-sm"
                    title="Share Live Tracking on WhatsApp"
                  >
                    <MessageCircle size={14} />
                    <span>Share on WhatsApp</span>
                  </a>

                  <span className={`status-badge status-${order.status}`} style={{ fontSize: 14, padding: "6px 14px" }}>
                    {order.status?.replaceAll("_", " ")}
                  </span>
                </div>
              </div>

              {/* Quick Specs */}
              <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: "var(--radius-md)", marginBottom: 20, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <b>Print Job:</b> {order.paper_size} • {order.color_mode} • {order.page_count || 1} pgs • {order.copies} copy(s)
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800, color: "var(--primary)" }}>
                    Total: ₹{order.total} ({order.delivery_mode === "PICKUP" ? "Counter Pickup" : "Doorstep Delivery"})
                  </div>
                  <Link href={`/verify/${order.id}`} className="btn btn-sm" style={{ background: "#0f172a" }}>
                    <Receipt size={13} />
                    <span>Verified Bill & QR</span>
                  </Link>
                  <Link href={`/orders/${order.id}`} className="btn btn-secondary btn-sm">
                    <span>Manage Order</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {/* Crazy Animated Live Timeline */}
              <CrazyLiveTimeline order={order} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}