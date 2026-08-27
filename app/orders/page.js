"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
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
  Zap,
  IndianRupee,
  Package,
  Printer,
  Truck,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Star,
  MessageCircle,
  ExternalLink,
  Store,
  User,
  Phone
} from "lucide-react";
import OfficialTaxInvoice from "../../components/OfficialTaxInvoice";
import { buildWhatsAppLink } from "../../lib/whatsapp";

const ACTIVE_STATUSES = [
  "ORDER_RECEIVED",
  "PAYMENT_SUBMITTED",
  "PAYMENT_VERIFIED",
  "PRINTING",
  "QUALITY_CHECK",
  "READY",
  "OUT_FOR_DELIVERY"
];

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState(null);

  // Ratings State for Delivered Orders
  const [ratings, setRatings] = useState({});
  const [ratingSubmitting, setRatingSubmitting] = useState({});

  const loadOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const s = supabase();
      if (!s?.auth) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const authRes = await s.auth.getUser();
      const user = authRes?.data?.user;

      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user);

      const { data, error } = await s
        .from("orders")
        .select("*, order_files(*), status_history(*)")
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

    // Load saved ratings from localStorage
    try {
      const saved = localStorage.getItem("cpc_customer_ratings");
      if (saved) setRatings(JSON.parse(saved));
    } catch (e) {}

    const s = supabase();
    let channel = null;

    try {
      if (s?.channel) {
        channel = s
          .channel("customer_orders_live_sync")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders" },
            () => {
              loadOrders(true);
            }
          )
          .subscribe();
      }
    } catch (e) {
      console.warn("Orders realtime sync error:", e);
    }

    const interval = setInterval(() => {
      loadOrders(true);
    }, 6000);

    return () => {
      try {
        if (s?.removeChannel && channel) s.removeChannel(channel);
      } catch (e) {}
      clearInterval(interval);
    };
  }, [loadOrders]);

  // Customer Metrics Breakdown
  const activeOrdersCount = useMemo(
    () => orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
    [orders]
  );
  const totalOrdersCount = orders.length;
  const totalSpent = useMemo(
    () => orders.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + Number(o.total || 0), 0),
    [orders]
  );

  const customerDisplayName = useMemo(() => {
    const fromOrder = orders.find((o) => o.customer_name)?.customer_name;
    if (fromOrder) return fromOrder;
    if (currentUser?.user_metadata?.name) return currentUser.user_metadata.name;
    if (currentUser?.email) return currentUser.email.split("@")[0];
    return "Valued Customer";
  }, [orders, currentUser]);

  function copyOrderNumber(orderNumber, e) {
    if (e) e.stopPropagation();
    try {
      navigator.clipboard.writeText(orderNumber);
      setCopiedId(orderNumber);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      alert("Order #" + orderNumber);
    }
  }

  function handleRateOrder(orderId, starCount, tag = "") {
    const updated = {
      ...ratings,
      [orderId]: {
        stars: starCount,
        tag: tag,
        ratedAt: new Date().toISOString(),
      },
    };
    setRatings(updated);
    try {
      localStorage.setItem("cpc_customer_ratings", JSON.stringify(updated));
    } catch (e) {}
  }

  if (loading) {
    return (
      <main className="wrap" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spin-animation" style={{ width: 44, height: 44, borderRadius: "50%", border: "4px solid #e0e7ff", borderTopColor: "var(--primary)", margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>Loading Customer Dashboard...</h3>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      {/* 1. Welcome Customer Top Banner */}
      <div 
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          color: "white",
          borderRadius: "var(--radius-lg)",
          padding: "24px 28px",
          marginBottom: 24,
          boxShadow: "0 10px 30px rgba(30, 27, 75, 0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #06b6d4)",
            color: "white",
            display: "grid",
            placeItems: "center",
            fontSize: 22,
            fontWeight: 900,
            boxShadow: "0 0 16px rgba(99, 102, 241, 0.4)"
          }}>
            {customerDisplayName[0]?.toUpperCase() || "C"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>
                👋 Welcome, {customerDisplayName}!
              </h1>
              <span style={{ background: "#10b981", color: "white", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 999 }}>
                VERIFIED
              </span>
            </div>
            <p style={{ margin: "4px 0 0", color: "#c7d2fe", fontSize: 13.5 }}>
              Track live print progress, view official tax invoices, and re-order prints in 1 click.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => loadOrders(false)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ background: "rgba(255, 255, 255, 0.12)", color: "white", border: "1px solid rgba(255, 255, 255, 0.2)" }}
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            <span>{refreshing ? "Syncing..." : "Sync Orders"}</span>
          </button>

          <Link
            href="/order"
            className="btn btn-sm"
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              fontWeight: 900,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
            }}
          >
            <PlusCircle size={16} />
            <span>New Print Job</span>
          </Link>
        </div>
      </div>

      {/* 2. Customer 3 KPI Chart Cards (Active Orders, Total Orders, Total Spent) */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {/* Metric 1: Active Orders */}
        <div className="stat-card" style={{ borderLeft: "4px solid #4f46e5", background: "white" }}>
          <div className="stat-icon" style={{ background: "#eef2ff", color: "#4f46e5" }}>
            <Zap size={24} />
          </div>
          <div>
            <div className="stat-value" style={{ color: "#1e1b4b" }}>{activeOrdersCount}</div>
            <div className="stat-label">Active Print Jobs</div>
            <div style={{ fontSize: 11.5, color: "#6366f1", fontWeight: 700, marginTop: 2 }}>
              {activeOrdersCount > 0 ? "⚡ Currently in production" : "✓ All caught up"}
            </div>
          </div>
        </div>

        {/* Metric 2: Total Orders */}
        <div className="stat-card" style={{ borderLeft: "4px solid #0284c7", background: "white" }}>
          <div className="stat-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}>
            <Package size={24} />
          </div>
          <div>
            <div className="stat-value" style={{ color: "#082f49" }}>{totalOrdersCount}</div>
            <div className="stat-label">Total Orders Placed</div>
            <div style={{ fontSize: 11.5, color: "#0284c7", fontWeight: 700, marginTop: 2 }}>
              Lifetime customer history
            </div>
          </div>
        </div>

        {/* Metric 3: Total Spent */}
        <div className="stat-card" style={{ borderLeft: "4px solid #16a34a", background: "white" }}>
          <div className="stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div className="stat-value" style={{ color: "#14532d" }}>₹{totalSpent}.00</div>
            <div className="stat-label">Total Amount Spent</div>
            <div style={{ fontSize: 11.5, color: "#16a34a", fontWeight: 700, marginTop: 2 }}>
              100% Tax Invoiced
            </div>
          </div>
        </div>
      </div>

      {/* 3. Orders History Chart (4 Primary Columns: Order ID, Date, Amount, Status) */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: "var(--text-main)" }}>
              📊 Print Order History ({orders.length})
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>
              Click any order row to view detailed specifications, print documents, tax invoices, and ratings.
            </p>
          </div>
          <Link href="/bills" className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>
            <Receipt size={14} />
            <span>Open Bill Center</span>
          </Link>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
            <ShoppingBag size={48} color="#cbd5e1" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main)" }}>No print orders found</h3>
            <p style={{ fontSize: 14, margin: "6px 0 16px" }}>Upload your PDFs or images to start your first laser print job.</p>
            <Link href="/order" className="btn">
              <PlusCircle size={16} />
              <span>Create Print Order</span>
            </Link>
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>1. Order ID</th>
                  <th>2. Date &amp; Time</th>
                  <th>3. Total Amount</th>
                  <th>4. Live Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const isExpanded = expandedOrderId === o.id;
                  const isDelivered = o.status === "DELIVERED";
                  const orderRating = ratings[o.id];

                  return (
                    <React.Fragment key={o.id}>
                      <tr 
                        onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                        style={{
                          cursor: "pointer",
                          background: isExpanded ? "#f5f3ff" : "inherit",
                          borderLeft: o.priority === "EXPRESS" ? "4px solid #f59e0b" : "none"
                        }}
                      >
                        {/* 1. Order ID */}
                        <td style={{ fontWeight: 800, fontFamily: "monospace" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, color: "var(--primary)" }}>{o.order_number}</span>
                            <button
                              type="button"
                              onClick={(e) => copyOrderNumber(o.order_number, e)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                              title="Copy Order ID"
                            >
                              {copiedId === o.order_number ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                            </button>
                            {o.priority === "EXPRESS" && (
                              <span style={{ background: "#fef3c7", color: "#b45309", fontSize: 9.5, fontWeight: 900, padding: "1px 5px", borderRadius: 3 }}>
                                ⚡ RUSH
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Date & Time */}
                        <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          <FormattedDate date={o.created_at} />
                        </td>

                        {/* 3. Amount */}
                        <td style={{ fontWeight: 900, fontSize: 15, color: "#1e1b4b" }}>
                          ₹{o.total}.00
                        </td>

                        {/* 4. Live Status */}
                        <td>
                          <span className={`status-badge status-${o.status}`}>
                            {o.status?.replaceAll("_", " ")}
                          </span>
                        </td>

                        {/* Action Trigger */}
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/orders/${o.id}`);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                            >
                              <Eye size={13} />
                              <span>Track</span>
                            </button>
                            <span style={{ color: "var(--text-muted)" }}>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Drawer */}
                      {isExpanded && (
                        <tr style={{ background: "#f8fafc" }}>
                          <td colSpan={5} style={{ padding: "18px 24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
                              {/* Job Specs */}
                              <div style={{ background: "white", padding: 14, borderRadius: 8, border: "1px solid var(--border)" }}>
                                <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 8, color: "var(--primary)" }}>
                                  🖨️ Print Specifications
                                </div>
                                <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-main)" }}>
                                  <div><b>Paper:</b> {o.paper_size} ({o.paper_type || "Standard"})</div>
                                  <div><b>Color:</b> {o.color_mode === "COLOR" ? "Full Color" : "Black & White"} ({o.sides === "DOUBLE" ? "Double Sided" : "Single Sided"})</div>
                                  <div><b>Quantity:</b> {o.page_count || 1} pages × {o.copies || 1} copies</div>
                                  <div><b>Binding:</b> {o.binding_type || "None"}</div>
                                  <div><b>Delivery:</b> {o.delivery_mode === "DELIVERY" ? `🚚 Boisar Doorstep (${o.address})` : "🏪 Counter Pickup"}</div>
                                </div>
                              </div>

                              {/* Payment & Documents */}
                              <div style={{ background: "white", padding: 14, borderRadius: 8, border: "1px solid var(--border)" }}>
                                <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 8, color: "#16a34a" }}>
                                  💳 Payment &amp; Files
                                </div>
                                <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                                  <div><b>Grand Total:</b> ₹{o.total}.00</div>
                                  <div><b>Payment Ref:</b> {o.upi_utr ? `Razorpay / UTR (${o.upi_utr})` : "Store Payment"}</div>
                                  <div><b>Attached Files:</b> {o.order_files ? o.order_files.length : 0} documents</div>
                                  {o.notes && <div style={{ color: "var(--text-muted)", marginTop: 4 }}><b>Notes:</b> {o.notes}</div>}
                                </div>
                              </div>
                            </div>

                            {/* 5-Star Rating Box for Delivered Orders */}
                            {isDelivered && (
                              <div style={{
                                background: "#f0fdf4",
                                border: "1.5px solid #86efac",
                                borderRadius: 8,
                                padding: "14px 18px",
                                marginBottom: 16,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 12
                              }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 14, color: "#166534", display: "flex", alignItems: "center", gap: 6 }}>
                                    <Star size={16} color="#eab308" fill="#eab308" />
                                    <span>Rate Your Print Quality &amp; Experience</span>
                                  </div>
                                  <div style={{ fontSize: 12.5, color: "#15803d", marginTop: 2 }}>
                                    {orderRating ? `You rated this order ${orderRating.stars} / 5 Stars! Thank you.` : "How was the paper quality, color accuracy, and delivery speed?"}
                                  </div>
                                </div>

                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => handleRateOrder(o.id, star)}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 2,
                                        transform: (orderRating?.stars || 0) >= star ? "scale(1.15)" : "scale(1)",
                                        transition: "transform 0.15s ease"
                                      }}
                                    >
                                      <Star
                                        size={22}
                                        color="#eab308"
                                        fill={(orderRating?.stars || 0) >= star ? "#eab308" : "none"}
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Bottom Actions Toolbar */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <Link href={`/orders/${o.id}`} className="btn btn-sm">
                                <Zap size={14} />
                                <span>Track Live Timeline</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => setInvoiceModalOrder(o)}
                                className="btn btn-secondary btn-sm"
                              >
                                <Receipt size={14} />
                                <span>Official Tax Invoice</span>
                              </button>

                              <a
                                href={buildWhatsAppLink("918857871669", `Hello Dhruvang Crazy Printing Center, regarding Order #${o.order_number}:`)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ color: "#16a34a" }}
                              >
                                <MessageCircle size={14} />
                                <span>WhatsApp Support</span>
                              </a>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tax Invoice Modal */}
      {invoiceModalOrder && (
        <OfficialTaxInvoice order={invoiceModalOrder} onClose={() => setInvoiceModalOrder(null)} />
      )}
    </main>
  );
}