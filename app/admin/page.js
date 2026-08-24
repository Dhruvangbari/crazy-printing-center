"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import FormattedDate from "../../components/FormattedDate";
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Eye, 
  CheckCircle2, 
  Printer, 
  Truck, 
  XCircle, 
  RefreshCw, 
  IndianRupee, 
  Clock, 
  ShoppingBag, 
  Check, 
  X, 
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  MessageCircle,
  Receipt,
  User,
  Phone,
  MapPin,
  BookOpen,
  Zap,
  Home,
  Copy,
  ShieldAlert
} from "lucide-react";
import { buildWhatsAppLink, buildOrderStatusMessage, openWhatsAppChat } from "../../lib/whatsapp";
import OfficialTaxInvoice from "../../components/OfficialTaxInvoice";
import { calculateOrderPriority, generateAiAdminPaymentAlert } from "../../lib/aiOrderAgent";

const STATUS_LIST = [
  { key: "ALL", label: "All Orders" },
  { key: "ORDER_RECEIVED", label: "Order Received" },
  { key: "PAYMENT_SUBMITTED", label: "Payment Submitted" },
  { key: "PAYMENT_VERIFIED", label: "Payment Verified" },
  { key: "PRINTING", label: "Printing" },
  { key: "QUALITY_CHECK", label: "Quality Check" },
  { key: "READY", label: "Ready" },
  { key: "OUT_FOR_DELIVERY", label: "Out For Delivery" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "CANCELLED", label: "Cancelled" },
];

const SORT_OPTIONS = [
  { key: "AI_PRIORITY", label: "🤖 AI Smart Priority (Highest First)" },
  { key: "NEWEST", label: "⏱️ Newest First" },
  { key: "VALUE", label: "💰 Highest Total First" },
  { key: "PAGES", label: "📄 Quickest (Fewest Pages)" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("AI_PRIORITY");
  const [updating, setUpdating] = useState(false);
  const [aiProcessingId, setAiProcessingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");

  useEffect(() => {
    checkAdminAndFetch();

    // 1. Setup Supabase Realtime subscription for instant incoming orders & updates
    const s = supabase();
    const channel = s
      .channel("admin_orders_realtime_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "status_history" },
        () => {
          fetchOrders(true);
        }
      )
      .subscribe();

    // 2. Auto-refresh polling every 5 seconds as a rock-solid backup
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 5000);

    return () => {
      s.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  async function checkAdminAndFetch() {
    setLoading(true);
    try {
      const s = supabase();
      const { data: { user } } = await s.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Verify Admin role or direct Dhruvang email
      const isDhruvang = Boolean(user.email && user.email.toLowerCase() === "dhruvangbari2006@gmail.com");

      const { data: profile } = await s
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const hasAdminRole = profile?.role === "ADMIN" || isDhruvang;

      if (!hasAdminRole) {
        setIsAdmin(false);
        setLoading(false);
        router.push("/orders");
        return;
      }

      if (isDhruvang && profile?.role !== "ADMIN") {
        await s.from("profiles").upsert(
          { id: user.id, role: "ADMIN" },
          { onConflict: "id" }
        );
      }

      setIsAdmin(true);
      await fetchOrders();
    } catch (err) {
      console.error("Admin check error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrders(isSilent = false) {
    if (!isSilent) setRefreshing(true);
    const s = supabase();
    const { data, error } = await s
      .from("orders")
      .select("*, profiles(name, phone), order_files(*), status_history(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      if (selectedOrder) {
        const updated = (data || []).find((o) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    }
    setRefreshing(false);
  }

  async function handleStatusChange(orderId, newStatus, customMsg = "", allowOverride = false) {
    setUpdating(true);
    try {
      const targetOrder = (orders || []).find((o) => o.id === orderId) || selectedOrder;

      // Strict guard against invalid backwards transition from DELIVERED or CANCELLED
      if (targetOrder?.status === "DELIVERED" && newStatus !== "DELIVERED" && !allowOverride) {
        alert("⚠️ Action Blocked: This order has already been DELIVERED to the customer. Moving backwards to earlier stages (like 'Out for Delivery' or 'Printing') is not allowed.");
        setUpdating(false);
        return;
      }

      if (targetOrder?.status === "CANCELLED" && newStatus !== "CANCELLED" && !allowOverride) {
        alert("⚠️ This order is currently CANCELLED. Please use 'Restore Order' if you wish to reactivate it.");
        setUpdating(false);
        return;
      }

      const s = supabase();

      // 1. Update order status
      const { error: orderError } = await s
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // 2. Add entry to status history
      const defaultMessages = {
        PAYMENT_VERIFIED: "Payment verified by store admin. Order queued for printing.",
        PRINTING: "Document sent to production printer.",
        QUALITY_CHECK: "Print job completed and quality checked.",
        READY: "Order is packed and ready for pickup / dispatch.",
        OUT_FOR_DELIVERY: "Order dispatched with delivery partner.",
        DELIVERED: "Order successfully delivered / handed over to customer.",
        CANCELLED: "Order has been cancelled.",
      };

      const finalMessage = customMsg.trim() || statusMsg.trim() || defaultMessages[newStatus] || `Status updated to ${newStatus}`;

      await s.from("status_history").insert({
        order_id: orderId,
        status: newStatus,
        message: finalMessage,
      });

      // 3. Auto-Dispatch Email & SMS Bill when payment is verified
      if (newStatus === "PAYMENT_VERIFIED") {
        if (targetOrder) {
          fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "PAYMENT_VERIFIED",
              orderId: targetOrder.id,
              orderNumber: targetOrder.order_number,
              customerName: targetOrder.customer_name || targetOrder.profiles?.name || "Customer",
              customerPhone: targetOrder.customer_phone || targetOrder.profiles?.phone || "",
              total: targetOrder.total,
              upiUtr: targetOrder.upi_utr,
              paperSize: targetOrder.paper_size,
              colorMode: targetOrder.color_mode,
              pageCount: targetOrder.page_count,
              copies: targetOrder.copies,
              deliveryMode: targetOrder.delivery_mode,
              address: targetOrder.address,
              trackingUrl: typeof window !== "undefined" ? `${window.location.origin}/orders/${targetOrder.id}` : "",
            }),
          }).catch((notifyErr) => console.warn("Notify API error:", notifyErr));
        }
      }

      setStatusMsg("");
      await fetchOrders();
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function getDownloadUrl(bucket, path) {
    const s = supabase();
    const { data } = s.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || "#";
  }

  async function handleDownload(bucket, path, filename) {
    try {
      const s = supabase();
      const { data, error } = await s.storage.from(bucket).download(path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download error: " + err.message);
    }
  }

  function getCustomerWhatsAppLink(order, targetStatus) {
    if (!order) return "#";
    const msg = buildOrderStatusMessage(order, targetStatus);
    return buildWhatsAppLink(order.customer_phone || order.profiles?.phone, msg);
  }

  function handlePrintJobSheet() {
    window.print();
  }

  // 1-Click AI One-Tap Verify & Start Printing Action
  async function handleAiVerifyAndPrint(order) {
    if (!order) return;
    setAiProcessingId(order.id);
    try {
      const res = await fetch("/api/ai/auto-pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_AND_PRINT",
          orderId: order.id,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert("AI Action Failed: " + (data.error || "Unknown error"));
        return;
      }

      // Auto-dispatch customer payment receipt notification
      try {
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name || order.profiles?.name,
            customerEmail: order.profiles?.email,
            customerPhone: order.customer_phone || order.profiles?.phone,
            total: order.total,
            upiUtr: order.upi_utr,
            paperSize: order.paper_size,
            colorMode: order.color_mode,
            pageCount: order.page_count,
            copies: order.copies,
            deliveryMode: order.delivery_mode,
            address: order.address,
            trackingUrl: typeof window !== "undefined" ? `${window.location.origin}/orders/${order.id}` : "",
          }),
        }).catch(() => {});
      } catch (e) {}

      await fetchOrders(true);
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev) => ({ ...prev, status: "PRINTING" }));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setAiProcessingId(null);
    }
  }

  // AI 1-Click Mark Ready / Dispatch
  async function handleAiMarkReady(order) {
    if (!order) return;
    setAiProcessingId(order.id);
    try {
      const res = await fetch("/api/ai/auto-pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MARK_READY",
          orderId: order.id,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert("AI Action Failed: " + (data.error || "Unknown error"));
        return;
      }
      await fetchOrders(true);
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev) => ({ ...prev, status: data.newStatus }));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setAiProcessingId(null);
    }
  }

  // 1-Click AI Batch Process All Real Submitted Payments
  async function handleAiBatchProcessPending() {
    const verifiedSubmittedOrders = orders.filter(
      (o) => o.status === "PAYMENT_SUBMITTED" || (o.payment_proof_path || (o.upi_utr && o.upi_utr.trim().length >= 8))
    ).filter((o) => !["PAYMENT_VERIFIED", "PRINTING", "QUALITY_CHECK", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(o.status));

    if (verifiedSubmittedOrders.length === 0) {
      const unpaidCount = orders.filter((o) => o.status === "ORDER_RECEIVED" && !o.payment_proof_path && !o.upi_utr).length;
      alert(`No payment proofs or UTRs pending verification.\n(${unpaidCount} order(s) are currently UNPAID and awaiting customer payment).`);
      return;
    }

    if (!confirm(`🤖 AI Anti-Fraud Auto-Pilot: Verify and start printing for ${verifiedSubmittedOrders.length} order(s) with submitted payment proofs?`)) {
      return;
    }

    setRefreshing(true);
    for (const ord of verifiedSubmittedOrders) {
      await handleAiVerifyAndPrint(ord);
    }
    await fetchOrders(true);
  }

  function handleSendAiWhatsAppAlert(order) {
    const alertText = generateAiAdminPaymentAlert(order);
    openWhatsAppChat("8857871669", alertText);
  }

  function handleSendPaymentReminder(order) {
    const targetPhone = order.customer_phone || order.profiles?.phone;
    if (!targetPhone) {
      alert("Customer phone number is not available.");
      return;
    }
    const payUrl = typeof window !== "undefined" ? `${window.location.origin}/orders/${order.id}` : `https://crazy-printing-center.vercel.app/orders/${order.id}`;
    const reminderText = 
      `👋 *Hello ${order.customer_name || "Valued Customer"}*,\n\n` +
      `Your print order *#${order.order_number || "CPC"}* (Total: *₹${order.total}.00*) has been received at *Dhruvang Crazy Printing Center*.\n\n` +
      `💳 *Action Required:* Please complete your UPI payment and upload the screenshot / 12-digit UTR here:\n` +
      `🔗 ${payUrl}\n\n` +
      `As soon as your payment proof is submitted, our high-speed laser printer will begin printing your documents immediately! 🖨️✨\n` +
      `Helpline: +91 8857871669`;

    openWhatsAppChat(targetPhone, reminderText);
  }

  // Calculate AI Priority on all orders
  const scoredOrders = orders.map((o) => ({
    ...o,
    aiPriority: calculateOrderPriority(o),
  }));

  // Filtered orders
  const filteredOrders = scoredOrders.filter((o) => {
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.toLowerCase().includes(q) ||
      o.profiles?.name?.toLowerCase().includes(q) ||
      o.address?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  // Sort orders based on chosen sort option
  filteredOrders.sort((a, b) => {
    if (sortBy === "AI_PRIORITY") {
      return b.aiPriority.score - a.aiPriority.score;
    }
    if (sortBy === "NEWEST") {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }
    if (sortBy === "VALUE") {
      return (Number(b.total) || 0) - (Number(a.total) || 0);
    }
    if (sortBy === "PAGES") {
      const aPages = (Number(a.page_count) || 1) * (Number(a.copies) || 1);
      const bPages = (Number(b.page_count) || 1) * (Number(b.copies) || 1);
      return aPages - bPages;
    }
    return 0;
  });

  // Calculate KPIs & AI Insights
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const pendingPaymentCount = orders.filter((o) => o.status === "PAYMENT_SUBMITTED" || (o.payment_proof_path || (o.upi_utr && o.upi_utr.trim().length >= 8))).filter((o) => !["PAYMENT_VERIFIED", "PRINTING", "QUALITY_CHECK", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(o.status)).length;
  const unpaidOrdersCount = orders.filter((o) => o.status === "ORDER_RECEIVED" && !o.payment_proof_path && !o.upi_utr).length;
  const inProgressCount = orders.filter((o) => ["PAYMENT_VERIFIED", "PRINTING", "QUALITY_CHECK"].includes(o.status)).length;
  const readyCount = orders.filter((o) => o.status === "READY" || o.status === "OUT_FOR_DELIVERY").length;
  const urgentAiCount = scoredOrders.filter((o) => o.aiPriority.level === "URGENT" && !["DELIVERED", "CANCELLED"].includes(o.status)).length;
  const totalEstQueueTime = scoredOrders
    .filter((o) => ["PAYMENT_SUBMITTED", "PAYMENT_VERIFIED", "PRINTING"].includes(o.status))
    .reduce((sum, o) => sum + (o.aiPriority.estMinutes || 3), 0);

  if (loading) {
    return (
      <main className="wrap">
        <div className="card" style={{ textAlign: "center", padding: 50 }}>
          Verifying Admin Credentials...
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="wrap">
        <div className="card" style={{ maxWidth: 550, margin: "40px auto", textAlign: "center", padding: 36 }}>
          <AlertTriangle size={48} color="var(--warning)" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Admin Access Required</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Your account is currently registered as a <b>CUSTOMER</b>. To access the Admin Console, promote your role to <b>ADMIN</b> in Supabase:
          </p>
          <div style={{ background: "#f1f5f9", padding: "12px 16px", borderRadius: 8, textAlign: "left", fontSize: 13, fontFamily: "monospace", marginBottom: 24 }}>
            UPDATE public.profiles SET role = 'ADMIN' WHERE id = 'YOUR-USER-ID';
          </div>
          <Link href="/orders" className="btn btn-sm">
            Go to My Customer Orders
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      {/* Admin Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>
          <Home size={15} />
          <span>Home</span>
        </Link>
        <span style={{ color: "var(--border)" }}>/</span>
        <span style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 600 }}>Admin Console</span>
      </div>

      {/* Admin Top Header */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>Admin Order Console</h1>
            <span className="admin-nav-badge">
              <ShieldCheck size={15} />
              <span>LIVE ADMIN</span>
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Real-time live queue, automated job ticketing, and WhatsApp customer updates
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ecfdf5", color: "#065f46", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, border: "1px solid #a7f3d0" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            <span>REALTIME (5s)</span>
          </div>

          <button 
            onClick={() => fetchOrders(false)} 
            disabled={refreshing} 
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Refresh order queue"
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh Orders"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid no-print">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="stat-value">{orders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-value">{pendingPaymentCount}</div>
            <div className="stat-label">Pending Review</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#ede9fe", color: "#6d28d9" }}>
            <Printer size={24} />
          </div>
          <div>
            <div className="stat-value">{inProgressCount}</div>
            <div className="stat-label">In Production</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div className="stat-value">₹{totalRevenue}</div>
            <div className="stat-label">Store Revenue</div>
          </div>
        </div>
      </div>

      {/* AI Print Dispatcher & Copilot Banner */}
      <div className="card no-print" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", color: "white", padding: "20px 24px", marginBottom: 24, border: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Zap size={18} color="#facc15" />
              <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: -0.2 }}>AI Print Dispatcher & Anti-Fraud Queue Copilot</span>
              {urgentAiCount > 0 && (
                <span style={{ background: "#dc2626", color: "white", fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 999 }}>
                  {urgentAiCount} URGENT
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span>⏱️ Queue Load: <b>~{totalEstQueueTime} mins</b></span>
              <span>•</span>
              <span style={{ color: pendingPaymentCount > 0 ? "#4ade80" : "#cbd5e1" }}>💳 Payment Proofs to Verify: <b>{pendingPaymentCount}</b></span>
              <span>•</span>
              <span style={{ color: unpaidOrdersCount > 0 ? "#fde047" : "#cbd5e1" }}>⚠️ Unpaid Orders: <b>{unpaidOrdersCount}</b></span>
              <span>•</span>
              <span>🖨️ In Production: <b>{inProgressCount}</b></span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {pendingPaymentCount > 0 ? (
              <button
                onClick={handleAiBatchProcessPending}
                disabled={refreshing}
                className="btn btn-sm"
                style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4)", fontWeight: 800, border: "none", boxShadow: "0 2px 10px rgba(79, 70, 229, 0.4)" }}
                title="AI Auto-Verify orders with real submitted payment proofs and queue for printing"
              >
                <Zap size={14} />
                <span>Verify Real Payments ({pendingPaymentCount})</span>
              </button>
            ) : (
              <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", padding: "6px 12px", borderRadius: 8 }}>
                <CheckCircle2 size={14} color="#34d399" />
                <span>All submitted payments verified</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search, Status & AI Sort Filters */}
      <div className="card no-print" style={{ marginBottom: 24, padding: "18px 20px" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {/* Search bar */}
          <div style={{ position: "relative", minWidth: 260, flex: 1 }}>
            <Search size={17} color="var(--text-light)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search by order #, recipient name, phone, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: 38,
                paddingRight: 14,
                paddingTop: 9,
                paddingBottom: 9,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 14,
              }}
            />
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "9px 12px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--primary)",
                background: "var(--primary-light)",
              }}
            >
              {SORT_OPTIONS.map((so) => (
                <option key={so.key} value={so.key}>
                  {so.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "9px 14px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--text-main)",
                background: "white",
              }}
            >
              {STATUS_LIST.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card no-print" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-container" style={{ border: "none" }}>
          <table className="table">
            <thead>
              <tr>
                <th>AI Priority</th>
                <th>Order Number</th>
                <th>Recipient / Customer</th>
                <th>Print Specifications</th>
                <th>Fulfillment</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const waLink = getCustomerWhatsAppLink(o);
                  const p = o.aiPriority;
                  const isProcessing = aiProcessingId === o.id;

                  return (
                    <tr key={o.id}>
                      {/* AI Priority Column */}
                      <td>
                        <div 
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 900,
                            padding: "3px 8px",
                            borderRadius: 6,
                            color: p.color,
                            background: p.bg,
                            border: `1px solid ${p.border}`
                          }}
                          title={`Score: ${p.score}/100 • ${p.reason}`}
                        >
                          <span>{p.level === "URGENT" ? "🔴" : p.level === "HIGH" ? "🟠" : p.level === "MEDIUM" ? "🔵" : "⚪"}</span>
                          <span>{p.level} ({p.score})</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={11} />
                          <span>~{p.estMinutes}m print</span>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 800, color: "var(--text-main)" }}>{o.order_number}</div>
                        <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}>
                          <FormattedDate date={o.created_at} />
                        </div>
                        {o.priority === "URGENT" && (
                          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 800, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", padding: "1px 6px", borderRadius: 4, marginTop: 4 }}>
                            ⚡ VIP URGENT
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: 700 }}>{o.customer_name || o.profiles?.name || "Customer"}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          📞 {o.customer_phone || o.profiles?.phone || "No phone"}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#16a34a", fontWeight: 700 }}
                            >
                              <MessageCircle size={12} />
                              <span>Customer</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSendAiWhatsAppAlert(o)}
                            style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}
                            title="Send AI Alert to Admin WhatsApp"
                          >
                            <Zap size={11} />
                            <span>AI Alert</span>
                          </button>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          {o.paper_size} • {o.color_mode} • {o.sides}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {o.page_count || 1} pgs • {o.copies} {o.copies === 1 ? "copy" : "copies"} • {o.paper_type}
                        </div>
                        {o.binding_type && o.binding_type !== "NONE" && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", marginTop: 2 }}>
                            📚 {o.binding_type}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {o.delivery_mode === "PICKUP" ? "🏪 Store Pickup" : "🚚 Delivery"}
                        </div>
                        {o.address && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {o.address}
                          </div>
                        )}
                      </td>

                      <td style={{ fontWeight: 900, fontSize: 15 }}>
                        ₹{o.total}
                      </td>

                      <td>
                        <span className={`status-badge status-${o.status}`}>
                          {o.status?.replaceAll("_", " ")}
                        </span>
                        {p.paymentCheck.status === "UNPAID" && (
                          <div style={{ marginTop: 4 }}>
                            <span style={{ display: "inline-block", fontSize: 10, fontWeight: 900, color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a", padding: "2px 6px", borderRadius: 4 }}>
                              ⚠️ NO PAYMENT YET
                            </span>
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {/* 1. If customer submitted payment proof or UTR -> Allow AI Verify & Print */}
                          {p.paymentCheck.canPrint && ["ORDER_RECEIVED", "PAYMENT_SUBMITTED"].includes(o.status) && (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleAiVerifyAndPrint(o)}
                              className="btn btn-sm"
                              style={{ background: "linear-gradient(135deg, #0284c7, #4f46e5)", color: "white", padding: "5px 10px", fontSize: 11, fontWeight: 800 }}
                              title="1-Click AI Verify Real Payment Proof & Queue Print"
                            >
                              <Zap size={12} />
                              <span>{isProcessing ? "Verifying..." : "AI Verify & Print"}</span>
                            </button>
                          )}

                          {/* 2. If order is UNPAID (No screenshot/UTR) -> DO NOT ALLOW printing, provide WhatsApp payment reminder */}
                          {p.paymentCheck.status === "UNPAID" && (
                            <button
                              type="button"
                              onClick={() => handleSendPaymentReminder(o)}
                              className="btn btn-sm"
                              style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", padding: "5px 8px", fontSize: 11, fontWeight: 700 }}
                              title="Send UPI payment reminder link to Customer on WhatsApp"
                            >
                              <MessageCircle size={12} color="#16a34a" />
                              <span>Remind to Pay</span>
                            </button>
                          )}

                          {o.status === "PRINTING" && (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleAiMarkReady(o)}
                              className="btn btn-sm btn-success"
                              style={{ padding: "5px 10px", fontSize: 11, fontWeight: 800 }}
                              title="Mark order ready and notify customer"
                            >
                              <Check size={12} />
                              <span>{isProcessing ? "Updating..." : "AI Mark Ready"}</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "5px 10px", fontSize: 11 }}
                          >
                            <Eye size={12} />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Processing Modal */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800 }}>{selectedOrder.order_number}</h2>
                  {selectedOrder.priority === "EXPRESS" && (
                    <span className="status-badge" style={{ background: "#fef3c7", color: "#b45309" }}>
                      ⚡ EXPRESS
                    </span>
                  )}
                </div>
                <span className={`status-badge status-${selectedOrder.status}`} style={{ marginTop: 6 }}>
                  {selectedOrder.status?.replaceAll("_", " ")}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => setInvoiceModalOrder(selectedOrder)}
                  className="btn btn-sm"
                  style={{ background: "#0f172a" }}
                  title="View Official Tax Invoice with Scannable QR Code"
                >
                  <Receipt size={14} />
                  <span>Tax Invoice & QR</span>
                </button>

                <button
                  onClick={handlePrintJobSheet}
                  className="btn btn-secondary btn-sm"
                  title="Print Machine Operator Job Sheet"
                >
                  <Printer size={14} />
                  <span>Job Ticket</span>
                </button>

                {getCustomerWhatsAppLink(selectedOrder) && (
                  <a
                    href={getCustomerWhatsAppLink(selectedOrder)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-whatsapp btn-sm"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)", padding: 4 }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Customer & Fulfillment Details */}
            <div className="row" style={{ marginBottom: 20 }}>
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Recipient & Contact
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>
                  {selectedOrder.customer_name || selectedOrder.profiles?.name || "Customer"}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-main)", marginTop: 2 }}>
                  📞 {selectedOrder.customer_phone || selectedOrder.profiles?.phone || "N/A"}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  Fulfillment: <b>{selectedOrder.delivery_mode === "PICKUP" ? "Store Pickup" : "Doorstep Delivery"}</b>
                </div>
                {selectedOrder.address && (
                  <div style={{ fontSize: 12, color: "var(--text-main)", marginTop: 6, background: "white", padding: 8, borderRadius: 6, border: "1px solid var(--border)" }}>
                    📍 <b>Address:</b> {selectedOrder.address}
                  </div>
                )}
              </div>

              <div style={{ background: "#f8fafc", padding: 14, borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Print Job Specifications
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>
                  {selectedOrder.paper_size} | {selectedOrder.color_mode}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {selectedOrder.page_count || 1} page(s) | {selectedOrder.sides} sided | {selectedOrder.paper_type} paper
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Binding: <b>{selectedOrder.binding_type || "NONE"}</b>
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: "var(--primary)", marginTop: 4 }}>
                  {selectedOrder.copies} Copies ({(selectedOrder.page_count || 1) * selectedOrder.copies} total pages) — Total ₹{selectedOrder.total}
                </div>
                {selectedOrder.notes && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, background: "white", padding: 6, borderRadius: 6 }}>
                    <b>Note:</b> "{selectedOrder.notes}"
                  </div>
                )}
              </div>
            </div>

            {/* AI Order Inspector & Anti-Fraud Payment Panel */}
            {(() => {
              const p = selectedOrder.aiPriority || calculateOrderPriority(selectedOrder);
              const isProcessing = aiProcessingId === selectedOrder.id;
              const isUnpaid = p.paymentCheck.status === "UNPAID";

              return (
                <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: "var(--radius-md)", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Zap size={16} color="#facc15" />
                      <span style={{ fontWeight: 900, fontSize: 14 }}>AI Order Inspector & Anti-Fraud Gate</span>
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: p.bg, color: p.color, border: `1px solid ${p.border}`, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 900 }}>
                      <span>{isUnpaid ? "⚠️" : p.level === "URGENT" ? "🔴" : p.level === "HIGH" ? "🟠" : p.level === "MEDIUM" ? "🔵" : "⚪"}</span>
                      <span>{p.paymentCheck.status}: {p.level} ({p.score}/100)</span>
                    </div>
                  </div>

                  {/* Unpaid Warning Banner */}
                  {isUnpaid && (
                    <div style={{ background: "rgba(220, 38, 38, 0.2)", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#fecaca", lineHeight: 1.5 }}>
                      🛑 <b>PAYMENT NOT RECEIVED:</b> Customer has placed this order for <b>₹{selectedOrder.total}.00</b>, but has <b>NOT</b> uploaded a payment screenshot or 12-digit UPI UTR. <b>Do not print without receiving payment!</b>
                    </div>
                  )}

                  {!isUnpaid && (
                    <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 12 }}>
                      ⏱️ <b>Estimated Print Duration:</b> ~{p.estMinutes} mins • 💡 <b>Payment Status:</b> {p.paymentCheck.label}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {/* If genuine proof is attached -> Allow AI Verify & Print */}
                    {!isUnpaid && ["ORDER_RECEIVED", "PAYMENT_SUBMITTED"].includes(selectedOrder.status) && (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleAiVerifyAndPrint(selectedOrder)}
                        className="btn btn-sm"
                        style={{ background: "linear-gradient(135deg, #0284c7, #4f46e5)", color: "white", fontWeight: 800, border: "none" }}
                      >
                        <Zap size={13} />
                        <span>{isProcessing ? "Processing..." : "⚡ AI Verify Real Payment & Queue Print"}</span>
                      </button>
                    )}

                    {/* If unpaid -> Offer WhatsApp payment reminder */}
                    {isUnpaid && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSendPaymentReminder(selectedOrder)}
                          className="btn btn-sm"
                          style={{ background: "#22c55e", color: "white", fontWeight: 800, border: "none" }}
                        >
                          <MessageCircle size={13} />
                          <span>Send WhatsApp Payment Reminder</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => {
                            if (confirm(`Confirm customer paid ₹${selectedOrder.total} in CASH directly at the store counter?`)) {
                              handleAiVerifyAndPrint(selectedOrder);
                            }
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ background: "rgba(255,255,255,0.1)", color: "#f8fafc", borderColor: "rgba(255,255,255,0.2)", fontSize: 11 }}
                          title="Override: Customer paid cash in person at shop counter"
                        >
                          <span>💵 Cash Paid at Counter</span>
                        </button>
                      </>
                    )}

                    {selectedOrder.status === "PRINTING" && (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleAiMarkReady(selectedOrder)}
                        className="btn btn-sm btn-success"
                        style={{ fontWeight: 800 }}
                      >
                        <Check size={13} />
                        <span>{isProcessing ? "Updating..." : "🤖 AI Mark Ready & Alert Customer"}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSendAiWhatsAppAlert(selectedOrder)}
                      className="btn btn-secondary btn-sm"
                      style={{ background: "rgba(255,255,255,0.12)", color: "white", borderColor: "rgba(255,255,255,0.25)", fontSize: 11 }}
                      title="Resend structured AI alert to Store Admin WhatsApp"
                    >
                      <MessageCircle size={13} color="#22c55e" />
                      <span>Send AI Alert to Admin WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Uploaded Documents List */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <FileText size={16} color="var(--primary)" />
                <span>Uploaded Documents ({selectedOrder.order_files?.length || 0})</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedOrder.order_files?.map((file) => (
                  <div
                    key={file.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "white",
                      border: "1px solid var(--border)",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{file.original_name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-light)" }}>
                        {file.size ? (file.size / 1024 / 1024).toFixed(2) + " MB" : ""}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload("documents", file.storage_path, file.original_name)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Proof & Anti-Fraud UTR Verification */}
            <div style={{ marginBottom: 24, padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "#fafafa" }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={17} color="var(--primary)" />
                  <span>Anti-Fraud Payment Verification</span>
                </div>
                {selectedOrder.upi_utr && (
                  <span style={{ fontSize: 11, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>
                    UTR SUBMITTED
                  </span>
                )}
              </div>

              {/* 12-Digit UTR Display */}
              <div style={{ background: "white", padding: 12, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Customer UPI Ref / 12-Digit UTR
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: selectedOrder.upi_utr ? "var(--primary)" : "var(--text-light)", letterSpacing: 1 }}>
                    {selectedOrder.upi_utr || "No UTR provided"}
                  </div>
                  {selectedOrder.upi_utr && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOrder.upi_utr);
                        alert("Copied UTR: " + selectedOrder.upi_utr + " to clipboard. Paste into your bank/merchant app to verify.");
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Copy UTR to verify in Merchant Bank App"
                    >
                      <Copy size={13} />
                      <span>Copy UTR</span>
                    </button>
                  )}
                </div>
              </div>

              {selectedOrder.payment_proof_path ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    onClick={async () => {
                      const url = await getDownloadUrl("payment-proofs", selectedOrder.payment_proof_path);
                      setPreviewImage(url);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <Eye size={14} />
                    <span>Inspect Screenshot</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm("Flag this payment as FAKE / UNVERIFIED and cancel the order?")) {
                        handleStatusChange(selectedOrder.id, "CANCELLED");
                      }
                    }}
                    className="btn btn-sm"
                    style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}
                  >
                    <ShieldAlert size={14} />
                    <span>Reject / Fake Screenshot</span>
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  No payment screenshot uploaded yet.
                </div>
              )}
            </div>

            {/* Status Update Actions with Forward-Only Lifecycle & Delivery Lock */}
            {selectedOrder.status === "DELIVERED" ? (
              <div style={{ background: "#ecfdf5", border: "2px solid #a7f3d0", padding: "16px 20px", borderRadius: "var(--radius-lg)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#10b981", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 15, color: "#065f46" }}>
                        Order Fulfilled & Delivered Successfully ✅
                      </div>
                      <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>
                        This job is completed. Reverting backwards to "Out for Delivery" or "Printing" is locked to protect order authenticity.
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={updating}
                    onClick={() => {
                      if (confirm("Are you sure you want to REOPEN this completed order? (e.g. for customer reprint/re-delivery)")) {
                        handleStatusChange(selectedOrder.id, "PRINTING", "Order reopened by Admin for reprinting", true);
                      }
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 12, borderColor: "#a7f3d0", color: "#047857" }}
                    title="Reopen order if customer requested a reprint"
                  >
                    <span>Reopen for Reprint ↻</span>
                  </button>
                </div>
              </div>
            ) : selectedOrder.status === "CANCELLED" ? (
              <div style={{ background: "#fef2f2", border: "2px solid #fecaca", padding: "16px 20px", borderRadius: "var(--radius-lg)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ef4444", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <XCircle size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 15, color: "#991b1b" }}>
                        Order Cancelled
                      </div>
                      <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 2 }}>
                        This order is cancelled and inactive.
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={updating}
                    onClick={() => {
                      if (confirm("Restore this order back to Verified Payment stage?")) {
                        handleStatusChange(selectedOrder.id, "PAYMENT_VERIFIED", "Order restored from cancelled by Admin", true);
                      }
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 12, borderColor: "#fecaca", color: "#991b1b" }}
                  >
                    <span>Restore Order ↻</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: "#f8fafc", padding: 18, borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "var(--text-main)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Advance Order Status (Current: <b>{selectedOrder.status?.replaceAll("_", " ")}</b>)</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Sequential forward workflow</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="Optional custom message for customer (e.g. 'Printed & packed ready for pickup')"
                    value={statusMsg}
                    onChange={(e) => setStatusMsg(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      fontSize: 13,
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["ORDER_RECEIVED", "PAYMENT_SUBMITTED"].includes(selectedOrder.status) && (
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange(selectedOrder.id, "PAYMENT_VERIFIED")}
                      className="btn btn-sm"
                      style={{ background: "#0284c7" }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Verify Payment</span>
                    </button>
                  )}

                  {["ORDER_RECEIVED", "PAYMENT_SUBMITTED", "PAYMENT_VERIFIED"].includes(selectedOrder.status) && (
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange(selectedOrder.id, "PRINTING")}
                      className="btn btn-sm"
                      style={{ background: "#7c3aed" }}
                    >
                      <Printer size={14} />
                      <span>Start Printing</span>
                    </button>
                  )}

                  {["PAYMENT_VERIFIED", "PRINTING", "QUALITY_CHECK"].includes(selectedOrder.status) && (
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange(selectedOrder.id, "READY")}
                      className="btn btn-sm"
                      style={{ background: "#16a34a" }}
                    >
                      <Check size={14} />
                      <span>Mark Ready for Pickup/Dispatch</span>
                    </button>
                  )}

                  {selectedOrder.status === "READY" && selectedOrder.delivery_mode === "DELIVERY" && (
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange(selectedOrder.id, "OUT_FOR_DELIVERY")}
                      className="btn btn-sm"
                      style={{ background: "#ea580c" }}
                    >
                      <Truck size={14} />
                      <span>Out For Delivery</span>
                    </button>
                  )}

                  {["READY", "OUT_FOR_DELIVERY"].includes(selectedOrder.status) && (
                    <button
                      disabled={updating}
                      onClick={() => {
                        if (confirm(`Confirm order #${selectedOrder.order_number} has been DELIVERED / handed over to ${selectedOrder.customer_name || "customer"}?`)) {
                          handleStatusChange(selectedOrder.id, "DELIVERED");
                        }
                      }}
                      className="btn btn-sm btn-success"
                    >
                      <CheckCircle2 size={14} />
                      <span>Mark Delivered & Handed Over ✅</span>
                    </button>
                  )}

                  <button
                    disabled={updating}
                    onClick={() => {
                      if (confirm(`Are you sure you want to CANCEL order #${selectedOrder.order_number}?`)) {
                        handleStatusChange(selectedOrder.id, "CANCELLED");
                      }
                    }}
                    className="btn btn-sm btn-danger"
                    style={{ marginLeft: "auto" }}
                  >
                    <XCircle size={14} />
                    <span>Cancel Order</span>
                  </button>
                </div>
              </div>
            )}

              {/* WhatsApp Live Update & Bill Action Bar */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <a
                  href={getCustomerWhatsAppLink(selectedOrder, selectedOrder.status) || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-whatsapp btn-sm"
                  style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}
                >
                  <MessageCircle size={15} />
                  <span>📲 Send Live WhatsApp Update ({selectedOrder.status?.replaceAll("_", " ")})</span>
                </a>

                <button
                  type="button"
                  onClick={() => setInvoiceModalOrder(selectedOrder)}
                  className="btn btn-sm"
                  style={{ background: "#0f172a", color: "white" }}
                  title="Open Official Tax Invoice to send PDF to WhatsApp or download"
                >
                  <Receipt size={14} />
                  <span>🧾 Send PDF Bill to WhatsApp</span>
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Image Preview Zoom Modal */}
      {previewImage && (
        <div className="modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div style={{ maxWidth: 600, maxHeight: "90vh", background: "white", padding: 16, borderRadius: "var(--radius-lg)", position: "relative" }}>
            <button
              onClick={() => setPreviewImage(null)}
              style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", padding: 6, cursor: "pointer" }}
            >
              <X size={18} />
            </button>
            <img src={previewImage} alt="Payment Proof" style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 8 }} />
          </div>
        </div>
      )}

      {/* Official Tax Invoice & QR Scanner Modal */}
      {invoiceModalOrder && (
        <div className="modal-backdrop" onClick={() => setInvoiceModalOrder(null)}>
          <div style={{ maxWidth: 840, width: "100%", maxHeight: "95vh", overflowY: "auto", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setInvoiceModalOrder(null)}
              className="no-print"
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                zIndex: 10,
                background: "white",
                border: "1px solid var(--border)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
              }}
            >
              <X size={18} />
            </button>
            <OfficialTaxInvoice order={invoiceModalOrder} />
          </div>
        </div>
      )}
    </main>
  );
}
