"use client";
import { useEffect, useState, useMemo, useRef } from "react";
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
  MessageCircle,
  Receipt,
  User,
  Phone,
  MapPin,
  Sparkles,
  Zap,
  Copy,
  Activity,
  Users,
  Laptop,
  Compass,
  AlertTriangle,
  Volume2,
  VolumeX,
  AlertCircle
} from "lucide-react";
import { buildWhatsAppLink, buildOrderStatusMessage, openWhatsAppChat } from "../../lib/whatsapp";
import OfficialTaxInvoice from "../../components/OfficialTaxInvoice";
import { calculateOrderPriority } from "../../lib/aiOrderAgent";

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

const ACTION_CATEGORIES = [
  { key: "ALL", label: "⚡ All Live Actions" },
  { key: "ORDER", label: "📦 Orders Placed" },
  { key: "PAYMENT", label: "💳 Payments & UTR" },
  { key: "UPLOAD", label: "📄 Document Uploads" },
  { key: "LOCATION", label: "📍 Boisar Locations" },
  { key: "PAGE_VIEW", label: "🧭 Page Navigation" },
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
  const [previewImage, setPreviewImage] = useState(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");

  // ==========================================
  // REAL-TIME LIVE USERS & TELEMETRY STATE
  // ==========================================
  const [adminTab, setAdminTab] = useState("orders"); // "orders" | "live_users" | "actions_stream"
  const [liveUsers, setLiveUsers] = useState([]);
  const [actionLogs, setActionLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [actionSearch, setActionSearch] = useState("");
  const [selectedUserInspect, setSelectedUserInspect] = useState(null);
  const [newActionFlash, setNewActionFlash] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef(null);

  // Selected order files & payment screenshot URL states
  const [selectedOrderProofUrl, setSelectedOrderProofUrl] = useState(null);
  const [selectedOrderDocUrls, setSelectedOrderDocUrls] = useState({});
  const [copiedUtr, setCopiedUtr] = useState(false);

  // Play audio chime
  function playNotificationChime(type = "info") {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {}
  }

  useEffect(() => {
    checkAdminAndFetch();

    const s = supabase();
    let orderChannel = null;
    let presenceChannel = null;
    let actionsBroadcastChannel = null;

    try {
      if (s?.channel) {
        // 1. Orders & Status History Realtime Listener
        orderChannel = s
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

        // 2. Real-Time Presence for Live Connected Users
        presenceChannel = s.channel("cpc_live_presence");
        presenceChannel
          .on("presence", { event: "sync" }, () => {
            try {
              const state = presenceChannel.presenceState?.() || {};
              const usersList = [];
              Object.keys(state).forEach((key) => {
                (state[key] || []).forEach((u) => {
                  usersList.push({
                    ...u,
                    presenceKey: key,
                  });
                });
              });
              setLiveUsers(usersList);
            } catch (err) {}
          })
          .on("presence", { event: "join" }, ({ newPresences }) => {
            if (newPresences && newPresences.length > 0) {
              const joinedUser = newPresences[0];
              const joinAction = {
                sessionId: joinedUser.sessionId,
                actionType: "PAGE_VIEW",
                actionTitle: `User joined site at ${joinedUser.currentPath || "/"}`,
                userName: joinedUser.name || "Guest Visitor",
                userPhone: joinedUser.phone || "",
                pageUrl: joinedUser.currentPath || "/",
                deviceInfo: joinedUser.deviceInfo || "Device",
                timestamp: new Date().toISOString(),
              };
              setActionLogs((prev) => [joinAction, ...prev.slice(0, 199)]);
            }
          })
          .subscribe();

        // 3. Real-Time Action Stream
        actionsBroadcastChannel = s.channel("cpc_live_actions_channel");
        actionsBroadcastChannel
          .on("broadcast", { event: "user_action" }, ({ payload }) => {
            if (payload) {
              setActionLogs((prev) => [payload, ...prev.slice(0, 199)]);
              setNewActionFlash(true);
              playNotificationChime();
              setTimeout(() => setNewActionFlash(false), 2000);
            }
          })
          .subscribe();
      }
    } catch (e) {
      console.warn("Admin realtime sync error:", e);
    }

    // 4. Initial fetch of persistent activity logs
    fetchInitialActivityLogs();

    // 5. Auto-refresh polling backup every 5 seconds
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 5000);

    return () => {
      try {
        if (s?.removeChannel) {
          if (orderChannel) s.removeChannel(orderChannel);
          if (presenceChannel) s.removeChannel(presenceChannel);
          if (actionsBroadcastChannel) s.removeChannel(actionsBroadcastChannel);
        }
      } catch (e) {}
      clearInterval(interval);
    };
  }, [soundEnabled]);

  // Load Document Previews & Payment Screenshot when an order is opened
  useEffect(() => {
    if (!selectedOrder) {
      setSelectedOrderProofUrl(null);
      setSelectedOrderDocUrls({});
      return;
    }

    const s = supabase();

    // 1. Fetch Payment Proof Image URL
    if (selectedOrder.payment_proof_path) {
      s.storage
        .from("payment-proofs")
        .createSignedUrl(selectedOrder.payment_proof_path, 3600)
        .then(({ data, error }) => {
          if (!error && data?.signedUrl) {
            setSelectedOrderProofUrl(data.signedUrl);
          } else {
            const { data: pub } = s.storage.from("payment-proofs").getPublicUrl(selectedOrder.payment_proof_path);
            setSelectedOrderProofUrl(pub?.publicUrl || null);
          }
        })
        .catch(() => {
          const { data: pub } = s.storage.from("payment-proofs").getPublicUrl(selectedOrder.payment_proof_path);
          setSelectedOrderProofUrl(pub?.publicUrl || null);
        });
    } else {
      setSelectedOrderProofUrl(null);
    }

    // 2. Fetch Document Signed URLs for instant viewing
    if (selectedOrder.order_files && selectedOrder.order_files.length > 0) {
      const urls = {};
      Promise.all(
        selectedOrder.order_files.map(async (file) => {
          try {
            const { data, error } = await s.storage.from("documents").createSignedUrl(file.storage_path, 3600);
            if (!error && data?.signedUrl) {
              urls[file.id] = data.signedUrl;
            } else {
              const { data: pub } = s.storage.from("documents").getPublicUrl(file.storage_path);
              urls[file.id] = pub?.publicUrl || null;
            }
          } catch (e) {
            const { data: pub } = s.storage.from("documents").getPublicUrl(file.storage_path);
            urls[file.id] = pub?.publicUrl || null;
          }
        })
      ).then(() => {
        setSelectedOrderDocUrls(urls);
      });
    } else {
      setSelectedOrderDocUrls({});
    }
  }, [selectedOrder]);

  async function fetchInitialActivityLogs() {
    try {
      const s = supabase();
      if (!s?.from) return;
      const { data } = await s
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        const mapped = data.map((d) => ({
          sessionId: d.session_id,
          actionType: d.action_type,
          actionTitle: d.action_title,
          details: d.details,
          pageUrl: d.page_url,
          deviceInfo: d.device_info,
          userName: d.user_name,
          userPhone: d.user_phone,
          timestamp: d.created_at,
          ipAddress: d.ip_address,
        }));
        setActionLogs((prev) => {
          const combined = [...prev, ...mapped];
          const unique = [];
          const seen = new Set();
          for (const item of combined) {
            const key = `${item.sessionId}-${item.timestamp}-${item.actionTitle}`;
            if (!seen.has(key)) {
              seen.add(key);
              unique.push(item);
            }
          }
          return unique.slice(0, 200);
        });
      }
    } catch (e) {
      console.debug("Activity logs fetch warning:", e);
    }
  }

  async function checkAdminAndFetch() {
    setLoading(true);
    try {
      const s = supabase();
      if (!s?.auth) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const authRes = await s.auth.getUser();
      const user = authRes?.data?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const isDhruvang = Boolean(user.email && user.email.toLowerCase() === "dhruvangbari2006@gmail.com");

      let profile = null;
      try {
        const { data } = await s
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        profile = data;
      } catch (err) {}

      const hasAdminRole = profile?.role === "ADMIN" || isDhruvang;

      if (!hasAdminRole) {
        setIsAdmin(false);
        setLoading(false);
        router.push("/orders");
        return;
      }

      if (isDhruvang && profile?.role !== "ADMIN") {
        try {
          await s.from("profiles").upsert(
            { id: user.id, role: "ADMIN" },
            { onConflict: "id" }
          );
        } catch (err) {}
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

      if (targetOrder?.status === "DELIVERED" && newStatus !== "DELIVERED" && !allowOverride) {
        alert("⚠️ Action Blocked: This order has already been DELIVERED to the customer.");
        setUpdating(false);
        return;
      }

      if (targetOrder?.status === "CANCELLED" && newStatus !== "CANCELLED" && !allowOverride) {
        alert("⚠️ This order is currently CANCELLED. Please use 'Restore Order' if you wish to reactivate it.");
        setUpdating(false);
        return;
      }

      const s = supabase();
      const { error: orderError } = await s
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      const defaultMsg = customMsg || `Status updated to ${newStatus.replaceAll("_", " ")} by Store Administrator.`;
      await s.from("status_history").insert({
        order_id: orderId,
        status: newStatus,
        message: defaultMsg,
      });

      playNotificationChime("success");
      await fetchOrders(true);
    } catch (err) {
      alert("Status update failed: " + err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDownloadDocument(storagePath, originalName) {
    try {
      const s = supabase();
      const { data, error } = await s.storage.from("documents").download(storagePath);
      if (error) {
        const { data: pub } = s.storage.from("documents").getPublicUrl(storagePath);
        if (pub?.publicUrl) window.open(pub.publicUrl, "_blank");
        return;
      }
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = originalName || "print-document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert("Could not download file: " + e.message);
    }
  }

  function handleCopyUtr(utr) {
    if (!utr) return;
    try {
      navigator.clipboard.writeText(utr);
      setCopiedUtr(true);
      setTimeout(() => setCopiedUtr(false), 2000);
    } catch (e) {
      alert("UTR: " + utr);
    }
  }

  // Filter & Sort Orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_phone?.toLowerCase().includes(q) ||
          o.address?.toLowerCase().includes(q) ||
          o.upi_utr?.toLowerCase().includes(q) ||
          o.profiles?.name?.toLowerCase().includes(q) ||
          o.profiles?.phone?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter((o) => o.status === statusFilter);
    }

    result = result.map((o) => ({
      ...o,
      aiPriority: calculateOrderPriority(o),
    }));

    if (sortBy === "AI_PRIORITY") {
      result.sort((a, b) => b.aiPriority.score - a.aiPriority.score);
    } else if (sortBy === "NEWEST") {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "VALUE") {
      result.sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
    } else if (sortBy === "PAGES") {
      result.sort((a, b) => Number(a.page_count || 1) - Number(b.page_count || 1));
    }

    return result;
  }, [orders, search, statusFilter, sortBy]);

  // Filter Action Logs
  const filteredActionLogs = useMemo(() => {
    let result = [...actionLogs];

    if (actionFilter === "ORDER") {
      result = result.filter((a) => a.actionType === "ORDER_PLACED" || a.actionType === "ORDER_CANCELLED");
    } else if (actionFilter === "PAYMENT") {
      result = result.filter((a) => a.actionType === "PAYMENT_SUBMITTED");
    } else if (actionFilter === "UPLOAD") {
      result = result.filter((a) => a.actionType === "DOC_UPLOAD");
    } else if (actionFilter === "LOCATION") {
      result = result.filter((a) => a.actionType === "LOCATION_SELECT");
    } else if (actionFilter === "PAGE_VIEW") {
      result = result.filter((a) => a.actionType === "PAGE_VIEW");
    }

    if (actionSearch.trim()) {
      const q = actionSearch.toLowerCase();
      result = result.filter(
        (a) =>
          a.userName?.toLowerCase().includes(q) ||
          a.userPhone?.toLowerCase().includes(q) ||
          a.actionTitle?.toLowerCase().includes(q) ||
          a.pageUrl?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [actionLogs, actionFilter, actionSearch]);

  // Order Metrics
  const pendingPaymentCount = useMemo(
    () => orders.filter((o) => o.status === "PAYMENT_SUBMITTED" || o.status === "ORDER_RECEIVED").length,
    [orders]
  );
  const inProgressCount = useMemo(
    () => orders.filter((o) => ["PRINTING", "QUALITY_CHECK", "READY", "OUT_FOR_DELIVERY"].includes(o.status)).length,
    [orders]
  );
  const totalRevenue = useMemo(
    () => orders.filter((o) => o.status !== "CANCELLED").reduce((acc, curr) => acc + Number(curr.total || 0), 0),
    [orders]
  );

  // Check if selected order has an issue / refund ticket reported
  const hasIssueReport = useMemo(() => {
    if (!selectedOrder?.status_history) return false;
    return selectedOrder.status_history.some(
      (h) =>
        h.status === "CANCELLED" ||
        (h.message && /refund|replacement|defect|wrong|misprint|damage|issue/i.test(h.message))
    );
  }, [selectedOrder]);

  if (loading) {
    return (
      <main className="wrap" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spin-animation" style={{ width: 44, height: 44, borderRadius: "50%", border: "4px solid #e0e7ff", borderTopColor: "var(--primary)", margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>Loading Admin Operations Hub...</h3>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="wrap" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <div className="card" style={{ maxWidth: 440, textAlign: "center", padding: 36 }}>
          <ShieldCheck size={48} color="#ef4444" style={{ margin: "0 auto 14px" }} />
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Admin Access Restricted</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>
            Only authorized administrators can access this portal.
          </p>
          <Link href="/orders" className="btn btn-sm">
            Go to My Orders
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      {/* Admin Top Header */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>Admin Operations Command Center</h1>
            <span className="admin-nav-badge">
              <ShieldCheck size={15} />
              <span>LIVE ADMIN</span>
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Real-time live user presence, action telemetry stream, print document queue, and payment approvals
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Live Online Users Presence Pill */}
          <button
            onClick={() => setAdminTab("live_users")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: liveUsers.length > 0 ? "#ecfdf5" : "#f1f5f9",
              color: liveUsers.length > 0 ? "#065f46" : "#64748b",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              border: `1px solid ${liveUsers.length > 0 ? "#a7f3d0" : "var(--border)"}`,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: liveUsers.length > 0 ? "#10b981" : "#94a3b8",
              boxShadow: liveUsers.length > 0 ? "0 0 10px #10b981" : "none",
              animation: liveUsers.length > 0 ? "pulseGlow 1.5s infinite" : "none"
            }} />
            <span>{liveUsers.length} {liveUsers.length === 1 ? "User" : "Users"} Online Now</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn btn-secondary btn-sm"
            style={{ padding: "6px 10px" }}
            title={soundEnabled ? "Mute live action audio chimes" : "Enable live action audio chimes"}
          >
            {soundEnabled ? <Volume2 size={15} color="#10b981" /> : <VolumeX size={15} color="#94a3b8" />}
          </button>

          <button 
            onClick={() => {
              fetchOrders(false);
              fetchInitialActivityLogs();
            }} 
            disabled={refreshing} 
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Refresh order queue and action feed"
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Main Admin Navigation Tabs */}
      <div className="no-print" style={{
        display: "flex",
        gap: 8,
        borderBottom: "2px solid var(--border)",
        marginBottom: 24,
        overflowX: "auto",
        paddingBottom: 2
      }}>
        <button
          onClick={() => setAdminTab("orders")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom: adminTab === "orders" ? "3px solid var(--primary)" : "3px solid transparent",
            color: adminTab === "orders" ? "var(--primary)" : "var(--text-muted)",
            fontWeight: adminTab === "orders" ? 800 : 600,
            fontSize: 14,
            cursor: "pointer",
            marginBottom: -2,
            transition: "all 0.2s ease",
            whiteSpace: "nowrap"
          }}
        >
          <ShoppingBag size={18} />
          <span>Print Orders & Queue</span>
          <span style={{
            background: adminTab === "orders" ? "var(--primary-light)" : "#f1f5f9",
            color: adminTab === "orders" ? "var(--primary)" : "var(--text-muted)",
            fontSize: 11,
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 999
          }}>
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab("live_users")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom: adminTab === "live_users" ? "3px solid #10b981" : "3px solid transparent",
            color: adminTab === "live_users" ? "#059669" : "var(--text-muted)",
            fontWeight: adminTab === "live_users" ? 800 : 600,
            fontSize: 14,
            cursor: "pointer",
            marginBottom: -2,
            transition: "all 0.2s ease",
            whiteSpace: "nowrap"
          }}
        >
          <Users size={18} color={adminTab === "live_users" ? "#10b981" : "currentColor"} />
          <span>Live Active Users</span>
          <span style={{
            background: liveUsers.length > 0 ? "#ecfdf5" : "#f1f5f9",
            color: liveUsers.length > 0 ? "#059669" : "var(--text-muted)",
            fontSize: 11,
            fontWeight: 900,
            padding: "2px 8px",
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            gap: 4
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            {liveUsers.length} ONLINE
          </span>
        </button>

        <button
          onClick={() => setAdminTab("actions_stream")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom: adminTab === "actions_stream" ? "3px solid #06b6d4" : "3px solid transparent",
            color: adminTab === "actions_stream" ? "#0891b2" : "var(--text-muted)",
            fontWeight: adminTab === "actions_stream" ? 800 : 600,
            fontSize: 14,
            cursor: "pointer",
            marginBottom: -2,
            transition: "all 0.2s ease",
            whiteSpace: "nowrap"
          }}
        >
          <Activity size={18} color={adminTab === "actions_stream" ? "#06b6d4" : "currentColor"} />
          <span>Real-Time Action Stream</span>
          {newActionFlash && (
            <span style={{
              background: "#06b6d4",
              color: "white",
              fontSize: 10,
              fontWeight: 900,
              padding: "2px 6px",
              borderRadius: 999,
              animation: "pulseGlow 1s infinite"
            }}>
              LIVE PING
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LIVE ACTIVE USERS PRESENCE MONITOR */}
      {/* ========================================================= */}
      {adminTab === "live_users" && (
        <div className="fast-pop-anim">
          <div className="card" style={{ marginBottom: 24, padding: "20px 24px", background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)", borderColor: "#a7f3d0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 12px #10b981" }} />
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: "#065f46", margin: 0 }}>
                    Real-Time Customer Presence Radar ({liveUsers.length} Active)
                  </h2>
                </div>
                <p style={{ fontSize: 13, color: "#047857", margin: 0 }}>
                  Tracks visitors live as they configure print settings, upload documents, and complete UPI checkout.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {liveUsers.length === 0 ? (
              <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                <Users size={36} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
                <div style={{ fontWeight: 800, fontSize: 16 }}>No Active Customers Online Right Now</div>
                <p style={{ fontSize: 13, marginTop: 4 }}>Live presence updates automatically via Supabase Realtime when a visitor arrives.</p>
              </div>
            ) : (
              liveUsers.map((u, i) => (
                <div
                  key={u.sessionId || i}
                  className="card"
                  style={{
                    padding: "18px 20px",
                    borderLeft: "4px solid #10b981",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 12,
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onClick={() => setSelectedUserInspect(u)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "white", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 15 }}>
                        {(u.name || "G")[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--text-main)" }}>
                          {u.name || "Guest Customer"}
                        </div>
                        {u.phone && <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>📞 {u.phone}</div>}
                      </div>
                    </div>

                    <span style={{ fontSize: 11, background: "#ecfdf5", color: "#065f46", fontWeight: 900, padding: "3px 8px", borderRadius: 999, border: "1px solid #a7f3d0" }}>
                      ACTIVE
                    </span>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, fontSize: 12, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Compass size={13} color="var(--primary)" />
                      <span><b>Current Route:</b> <code>{u.currentPath || "/"}</code></span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                      <Laptop size={13} />
                      <span>{u.deviceInfo || "Desktop Browser"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--text-muted)" }}>
                    <span>📍 {u.locality || "Boisar, Maharashtra"}</span>
                    <span style={{ color: "var(--primary)", fontWeight: 700 }}>Click to Inspect ➔</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: REAL-TIME ACTION STREAM & TELEMETRY */}
      {/* ========================================================= */}
      {adminTab === "actions_stream" && (
        <div className="fast-pop-anim">
          {/* Action Stream Controls */}
          <div className="card" style={{ marginBottom: 20, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={20} color="#06b6d4" />
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                  Live Action Stream & Telemetry Feed
                </h3>
                <span style={{ background: "#ecfeff", color: "#0891b2", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, border: "1px solid #a5f3fc" }}>
                  {filteredActionLogs.length} Actions
                </span>
              </div>

              {/* Search in actions */}
              <div style={{ position: "relative", minWidth: 240 }}>
                <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  placeholder="Search user, action, phone..."
                  value={actionSearch}
                  onChange={(e) => setActionSearch(e.target.value)}
                  style={{ paddingLeft: 32, paddingTop: 6, paddingBottom: 6, fontSize: 13 }}
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ACTION_CATEGORIES.map((cat) => {
                const isSelected = actionFilter === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActionFilter(cat.key)}
                    style={{
                      background: isSelected ? "var(--primary)" : "#f1f5f9",
                      color: isSelected ? "white" : "var(--text-main)",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: isSelected ? 800 : 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Log Items Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredActionLogs.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                <Activity size={32} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontWeight: 700 }}>No user actions match this filter</div>
              </div>
            ) : (
              filteredActionLogs.map((action, index) => {
                let badgeColor = "#4f46e5";
                let badgeBg = "#eef2ff";
                let icon = <Activity size={15} />;

                if (action.actionType === "ORDER_PLACED") {
                  badgeColor = "#16a34a";
                  badgeBg = "#f0fdf4";
                  icon = <ShoppingBag size={15} />;
                } else if (action.actionType === "PAYMENT_SUBMITTED") {
                  badgeColor = "#0284c7";
                  badgeBg = "#f0f9ff";
                  icon = <IndianRupee size={15} />;
                } else if (action.actionType === "DOC_UPLOAD") {
                  badgeColor = "#7c3aed";
                  badgeBg = "#faf5ff";
                  icon = <FileText size={15} />;
                } else if (action.actionType === "LOCATION_SELECT") {
                  badgeColor = "#ea580c";
                  badgeBg = "#fff7ed";
                  icon = <MapPin size={15} />;
                } else if (action.actionType === "ORDER_CANCELLED") {
                  badgeColor = "#dc2626";
                  badgeBg = "#fef2f2";
                  icon = <XCircle size={15} />;
                }

                return (
                  <div
                    key={index}
                    className="fast-pop-anim"
                    style={{
                      background: "white",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                      boxShadow: "var(--shadow-sm)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 260 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: badgeBg,
                        color: badgeColor,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        border: `1px solid ${badgeColor}33`
                      }}>
                        {icon}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text-main)" }}>
                            {action.actionTitle}
                          </span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 900,
                            background: badgeBg,
                            color: badgeColor,
                            padding: "2px 6px",
                            borderRadius: 4,
                            textTransform: "uppercase"
                          }}>
                            {action.actionType?.replaceAll("_", " ")}
                          </span>
                        </div>

                        <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span>👤 <b>{action.userName || "Guest"}</b></span>
                          {action.userPhone && <span>📞 {action.userPhone}</span>}
                          <span>•</span>
                          <span>🧭 <code>{action.pageUrl || "/"}</code></span>
                          <span>•</span>
                          <span>💻 {action.deviceInfo || "Device"}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600 }}>
                        <FormattedDate date={action.timestamp || new Date().toISOString()} />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: STANDARD ORDER MANAGEMENT QUEUE */}
      {/* ========================================================= */}
      {adminTab === "orders" && (
        <div className="fast-pop-anim">
          {/* KPI Summary Cards */}
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

          {/* Search, Status & AI Sort Filters */}
          <div className="card no-print" style={{ marginBottom: 24, padding: "18px 20px" }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ position: "relative", minWidth: 260, flex: 1 }}>
                <Search size={17} color="var(--text-light)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  placeholder="Search by order #, recipient name, phone, UTR, address..."
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

          {/* Orders Table with Direct File & Payment SS Visuals */}
          <div className="card no-print" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-container" style={{ border: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>AI Priority</th>
                    <th>Order Number</th>
                    <th>Recipient / Customer</th>
                    <th>Print Documents</th>
                    <th>Payment &amp; Proof</th>
                    <th>Specs &amp; Delivery</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                        No orders found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => {
                      const p = o.aiPriority;
                      const fileCount = o.order_files ? o.order_files.length : 0;
                      const hasProof = Boolean(o.payment_proof_path);

                      return (
                        <tr key={o.id}>
                          <td>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 900,
                              background: p?.urgency === "HIGH" ? "#fee2e2" : "#f1f5f9",
                              color: p?.urgency === "HIGH" ? "#b91c1c" : "#475569",
                              padding: "2px 6px",
                              borderRadius: 4
                            }}>
                              {p?.score || 50} pts
                            </span>
                          </td>
                          <td style={{ fontWeight: 800, fontFamily: "monospace" }}>
                            <div>{o.order_number}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                              <FormattedDate date={o.created_at} />
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{o.customer_name || o.profiles?.name || "Customer"}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.customer_phone || o.profiles?.phone || "N/A"}</div>
                          </td>
                          {/* Uploaded Print Files */}
                          <td>
                            {fileCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(o)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: 12, padding: "4px 8px", background: "#eef2ff", color: "var(--primary)", borderColor: "#c7d2fe" }}
                                title="Click to view & download print documents"
                              >
                                <FileText size={13} />
                                <span><b>{fileCount}</b> {fileCount === 1 ? "File" : "Files"}</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: 11.5, color: "var(--text-light)" }}>No files</span>
                            )}
                          </td>
                          {/* Payment Screenshot & UTR */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {hasProof ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrder(o)}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    background: "#ecfdf5",
                                    color: "#166534",
                                    border: "1px solid #a7f3d0",
                                    borderRadius: 6,
                                    padding: "3px 8px",
                                    fontSize: 11.5,
                                    fontWeight: 800,
                                    cursor: "pointer",
                                    width: "fit-content"
                                  }}
                                  title="Click to view full payment screenshot"
                                >
                                  <span>🖼️ SS Attached</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: 11, color: "#d97706", background: "#fef3c7", padding: "2px 6px", borderRadius: 4, width: "fit-content", fontWeight: 700 }}>
                                  ⏳ SS Pending
                                </span>
                              )}
                              {o.upi_utr && (
                                <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)", fontWeight: 700 }}>
                                  UTR: {o.upi_utr}
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Specs & Fulfillment */}
                          <td style={{ fontSize: 12 }}>
                            <div><b>{o.paper_size}</b> • {o.color_mode === "COLOR" ? "Color" : "B&W"}</div>
                            <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{o.page_count}pgs × {o.copies}cps • {o.delivery_mode === "DELIVERY" ? "🚚 Delivery" : "🏪 Pickup"}</div>
                          </td>
                          <td style={{ fontWeight: 900, color: "var(--primary)" }}>₹{o.total}.00</td>
                          <td>
                            <span className={`status-badge status-${o.status}`}>
                              {o.status?.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontWeight: 800 }}
                            >
                              <Eye size={13} />
                              <span>Manage</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Session History Inspector Modal */}
      {selectedUserInspect && (
        <div className="modal-backdrop" onClick={() => setSelectedUserInspect(null)}>
          <div
            className="card"
            style={{ maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4f46e5, #06b6d4)", color: "white", display: "grid", placeItems: "center", fontWeight: 900 }}>
                  {(selectedUserInspect.name || "G")[0]}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>{selectedUserInspect.name || "Guest Visitor"}</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Session: <code>{selectedUserInspect.sessionId}</code></div>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserInspect(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 16, fontSize: 13 }}>
              <div>📱 <b>Device:</b> {selectedUserInspect.deviceInfo || "Desktop Browser"}</div>
              <div style={{ marginTop: 4 }}>📍 <b>Location:</b> {selectedUserInspect.locality || "Boisar, Maharashtra"}</div>
              <div style={{ marginTop: 4 }}>🧭 <b>Current Route:</b> <code>{selectedUserInspect.currentPath || "/"}</code></div>
              <div style={{ marginTop: 4 }}>🟢 <b>Online Since:</b> <FormattedDate date={selectedUserInspect.onlineAt || new Date().toISOString()} /></div>
            </div>

            <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
              Recent Action Timeline ({actionLogs.filter((a) => a.sessionId === selectedUserInspect.sessionId).length} events)
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {actionLogs
                .filter((a) => a.sessionId === selectedUserInspect.sessionId)
                .map((act, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "white", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{act.actionTitle}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                      <FormattedDate date={act.timestamp} /> • <code>{act.pageUrl}</code>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MANAGE ORDER MODAL (Full Files, Payment SS & Controls) */}
      {/* ========================================================= */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div
            className="card"
            style={{ maxWidth: 880, width: "100%", maxHeight: "92vh", overflowY: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Order #{selectedOrder.order_number}</h2>
                  <span className={`status-badge status-${selectedOrder.status}`}>
                    {selectedOrder.status?.replaceAll("_", " ")}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Placed on <FormattedDate date={selectedOrder.created_at} /> • Total Amount: <b style={{ color: "var(--primary)" }}>₹{selectedOrder.total}.00</b>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Issue / Refund Ticket Alert Banner */}
            {hasIssueReport && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                marginBottom: 18,
                color: "#991b1b"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 14, marginBottom: 4 }}>
                  <AlertTriangle size={18} color="#dc2626" />
                  <span>Customer Support / Refund Request Logged</span>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#7f1d1d" }}>
                  The customer has reported an issue or requested a refund / replacement for this order. Check status history log below and contact customer immediately.
                </div>
                <div style={{ marginTop: 8 }}>
                  <a
                    href={buildWhatsAppLink(selectedOrder.customer_phone, `Hello ${selectedOrder.customer_name || "Customer"}, regarding your issue report on Order #${selectedOrder.order_number}, our store manager is here to assist you with free replacement or refund.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-whatsapp btn-sm"
                    style={{ fontSize: 12 }}
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp Customer to Resolve Issue</span>
                  </a>
                </div>
              </div>
            )}

            {/* Grid with 2 Columns: Files & Customer Info + Payment SS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16, marginBottom: 20 }}>
              
              {/* SECTION A: UPLOADED PRINT DOCUMENTS */}
              <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 14 }}>
                    <Printer size={16} color="var(--primary)" />
                    <span>Uploaded Print Documents</span>
                  </div>
                  <span style={{ background: "var(--primary-light)", color: "var(--primary)", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>
                    {selectedOrder.order_files ? selectedOrder.order_files.length : 0} {selectedOrder.order_files?.length === 1 ? "file" : "files"}
                  </span>
                </div>

                {(!selectedOrder.order_files || selectedOrder.order_files.length === 0) ? (
                  <div style={{ textAlign: "center", padding: "24px 10px", color: "var(--text-muted)", fontSize: 13 }}>
                    <FileText size={28} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
                    <div>No files uploaded in database.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {selectedOrder.order_files.map((file, idx) => {
                      const docUrl = selectedOrderDocUrls[file.id];
                      const fileSizeMb = file.size ? (file.size / (1024 * 1024)).toFixed(2) + " MB" : "Document";

                      return (
                        <div
                          key={file.id || idx}
                          style={{
                            background: "white",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 6, background: "#eef2ff", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                              <FileText size={16} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={file.original_name}>
                                {file.original_name || `Document_${idx + 1}`}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fileSizeMb}</div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            {docUrl ? (
                              <a
                                href={docUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: "5px 9px", fontSize: 12 }}
                                title="Open / Preview file in new tab"
                              >
                                <ExternalLink size={13} />
                                <span>Preview</span>
                              </a>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(file.storage_path, file.original_name)}
                              className="btn btn-sm"
                              style={{ padding: "5px 10px", fontSize: 12, background: "var(--primary)", color: "white" }}
                              title="Download document for printing"
                            >
                              <Download size={13} />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION B: PAYMENT SCREENSHOT & UTR VERIFICATION */}
              <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 14 }}>
                    <IndianRupee size={16} color="#16a34a" />
                    <span>Payment Verification &amp; SS</span>
                  </div>
                  {selectedOrder.status === "PAYMENT_VERIFIED" ? (
                    <span style={{ background: "#ecfdf5", color: "#166534", fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 999, border: "1px solid #a7f3d0" }}>
                      ✅ VERIFIED
                    </span>
                  ) : (
                    <span style={{ background: "#fef3c7", color: "#b45309", fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 999, border: "1px solid #fde68a" }}>
                      REVIEW NEEDED
                    </span>
                  )}
                </div>

                {/* 12-Digit UTR Number */}
                <div style={{ background: "white", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>UPI Transaction Ref (UTR):</div>
                    <div style={{ fontSize: 14, fontWeight: 900, fontFamily: "monospace", color: "var(--text-main)" }}>
                      {selectedOrder.upi_utr || "No UTR Entered"}
                    </div>
                  </div>
                  {selectedOrder.upi_utr && (
                    <button
                      type="button"
                      onClick={() => handleCopyUtr(selectedOrder.upi_utr)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, padding: "4px 8px" }}
                    >
                      {copiedUtr ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                      <span>{copiedUtr ? "Copied" : "Copy"}</span>
                    </button>
                  )}
                </div>

                {/* Screenshot Image Preview */}
                {selectedOrderProofUrl ? (
                  <div>
                    <div
                      style={{
                        position: "relative",
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "2px solid #bbf7d0",
                        cursor: "pointer",
                        maxHeight: 180,
                        textAlign: "center",
                        background: "#000"
                      }}
                      onClick={() => setPreviewImage(selectedOrderProofUrl)}
                      title="Click to zoom payment screenshot"
                    >
                      <img
                        src={selectedOrderProofUrl}
                        alt="Payment Screenshot"
                        style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain", margin: "0 auto", display: "block" }}
                      />
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "rgba(0,0,0,0.7)",
                        color: "white",
                        fontSize: 11,
                        padding: "4px 8px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4
                      }}>
                        <Eye size={12} />
                        <span>Click to view Full-Screen Screenshot</span>
                      </div>
                    </div>

                    {/* Quick Approve Button */}
                    {selectedOrder.status !== "PAYMENT_VERIFIED" && selectedOrder.status !== "CANCELLED" && (
                      <button
                        type="button"
                        onClick={() => {
                          handleStatusChange(selectedOrder.id, "PAYMENT_VERIFIED", `Payment verified via UPI screenshot (UTR: ${selectedOrder.upi_utr || "Verified"}). Proceeding to laser printing.`);
                        }}
                        className="btn btn-success"
                        style={{ width: "100%", justifyContent: "center", marginTop: 12, fontWeight: 900 }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Approve &amp; Confirm Payment (₹{selectedOrder.total}.00)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 10px", color: "var(--text-muted)", fontSize: 12 }}>
                    <AlertCircle size={24} color="#f59e0b" style={{ margin: "0 auto 6px" }} />
                    <div>Customer hasn't uploaded payment screenshot yet.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Customer & Fulfillment Details */}
            <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, color: "var(--text-muted)" }}>
                Customer &amp; Fulfillment Specs
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Recipient:</span>
                  <div style={{ fontWeight: 800 }}>{selectedOrder.customer_name || selectedOrder.profiles?.name || "Customer"}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Phone Number:</span>
                  <div style={{ fontWeight: 800 }}>
                    <a href={`tel:${selectedOrder.customer_phone}`} style={{ color: "var(--primary)", textDecoration: "none" }}>
                      📞 {selectedOrder.customer_phone || selectedOrder.profiles?.phone || "N/A"}
                    </a>
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Print Job:</span>
                  <div style={{ fontWeight: 800 }}>{selectedOrder.paper_size} • {selectedOrder.color_mode === "COLOR" ? "Full Colour" : "B&W"} • {selectedOrder.sides === "DOUBLE" ? "Double Sided" : "Single Sided"}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Pages × Copies:</span>
                  <div style={{ fontWeight: 800 }}>{selectedOrder.page_count} pages × {selectedOrder.copies} copy(s)</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Binding:</span>
                  <div style={{ fontWeight: 800 }}>{selectedOrder.binding_type || "No Binding"}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Fulfillment:</span>
                  <div style={{ fontWeight: 800 }}>{selectedOrder.delivery_mode === "DELIVERY" ? "🚚 Doorstep Delivery" : "🏪 Counter Pickup"}</div>
                </div>
              </div>
              {selectedOrder.address && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 12.5 }}>
                  <span style={{ color: "var(--text-muted)" }}>📍 Delivery Address:</span>
                  <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{selectedOrder.address}</div>
                </div>
              )}
              {selectedOrder.notes && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#854d0e", background: "#fef9c3", padding: "6px 10px", borderRadius: 6 }}>
                  <b>Customer Notes:</b> {selectedOrder.notes}
                </div>
              )}
            </div>

            {/* Status Transition Row */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 800, display: "block", marginBottom: 8 }}>
                Update Order Stage:
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {STATUS_LIST.filter((s) => s.key !== "ALL").map((st) => {
                  const isCurrent = selectedOrder.status === st.key;
                  return (
                    <button
                      key={st.key}
                      disabled={updating || isCurrent}
                      onClick={() => handleStatusChange(selectedOrder.id, st.key)}
                      style={{
                        background: isCurrent ? "var(--primary)" : "#f1f5f9",
                        color: isCurrent ? "white" : "var(--text-main)",
                        border: "none",
                        padding: "7px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isCurrent ? "default" : "pointer"
                      }}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <button
                type="button"
                onClick={() => setInvoiceModalOrder(selectedOrder)}
                className="btn btn-sm"
                style={{ background: "#0f172a", color: "white" }}
              >
                <Receipt size={14} />
                <span>View Official Tax Invoice</span>
              </button>

              <a
                href={buildWhatsAppLink(selectedOrder.customer_phone, buildOrderStatusMessage(selectedOrder, selectedOrder.status))}
                target="_blank"
                rel="noreferrer"
                className="btn btn-whatsapp btn-sm"
              >
                <MessageCircle size={14} />
                <span>Send WhatsApp Live Update</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Payment Screenshot Zoom Modal */}
      {previewImage && (
        <div className="modal-backdrop" onClick={() => setPreviewImage(null)} style={{ zIndex: 99999 }}>
          <div style={{ maxWidth: 800, width: "90%", position: "relative", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: "absolute",
                top: -14,
                right: -14,
                background: "white",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
              }}
            >
              <X size={20} />
            </button>
            <img
              src={previewImage}
              alt="Full Payment Screenshot"
              style={{ width: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: 12, background: "#000" }}
            />
            <div style={{ marginTop: 10 }}>
              <a
                href={previewImage}
                download="payment-screenshot.png"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ background: "rgba(255,255,255,0.9)" }}
              >
                <Download size={14} />
                <span>Download Screenshot File</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
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
