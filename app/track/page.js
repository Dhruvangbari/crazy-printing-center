"use client";
import { useState } from "react";
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
  Receipt
} from "lucide-react";
import { buildWhatsAppLink, buildOrderStatusMessage } from "../../lib/whatsapp";

export default function Track() {
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

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

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 800 }}>{order.order_number}</h2>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                    Ordered on <FormattedDate date={order.created_at} includeTime={false} />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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

              {/* Visual Step Progress Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", position: "relative", margin: "30px 10px 40px" }}>
                {/* Progress Line */}
                <div style={{ position: "absolute", top: 18, left: 20, right: 20, height: 3, background: "#e2e8f0", zIndex: 0 }} />

                {steps.map((s) => {
                  const isCompleted = getStepStatus(s.key) === "completed";
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.key}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: isCompleted ? "var(--primary)" : "white",
                          color: isCompleted ? "white" : "var(--text-light)",
                          border: `2px solid ${isCompleted ? "var(--primary)" : "var(--border)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "var(--shadow-sm)",
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: isCompleted ? 700 : 500,
                          color: isCompleted ? "var(--text-main)" : "var(--text-muted)",
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  );
                })}
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

              {/* Detailed Timeline */}
              <div className="card-header" style={{ marginBottom: 12, marginTop: 10 }}>
                <h3 className="card-title" style={{ fontSize: 16 }}>
                  <Clock size={16} color="var(--primary)" />
                  <span>Status Update History</span>
                </h3>
              </div>

              <div className="timeline">
                {(order.status_history || [])
                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                  .map((h) => (
                    <div className="timeline-step" key={h.id}>
                      <div className="timeline-dot" />
                      <div className="timeline-title">{h.status?.replaceAll("_", " ")}</div>
                      <div className="timeline-time">
                        <FormattedDate date={h.created_at} />
                      </div>
                      {h.message && <div className="timeline-msg">{h.message}</div>}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}