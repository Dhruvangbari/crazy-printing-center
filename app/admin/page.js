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
  AlertCircle,
  Store,
  Trash2,
  CheckSquare,
  Square,
  Package,
  Layers,
  ArrowRight,
  SlidersHorizontal
} from "lucide-react";
import { buildWhatsAppLink, buildOrderStatusMessage, openWhatsAppChat } from "../../lib/whatsapp";
import OfficialTaxInvoice from "../../components/OfficialTaxInvoice";

const STATUS_LIST = [
  { key: "ALL", label: "All Statuses" },
  { key: "ORDER_RECEIVED", label: "Order Received" },
  { key: "PAYMENT_SUBMITTED", label: "Payment Submitted" },
  { key: "PAYMENT_VERIFIED", label: "Payment Verified" },
  { key: "PRINTING", label: "Printing" },
  { key: "QUALITY_CHECK", label: "Quality Check" },
  { key: "READY", label: "Ready for Pickup" },
  { key: "OUT_FOR_DELIVERY", label: "Out For Delivery" },
  { key: "DELIVERED", label: "Delivered (Fulfilled)" },
  { key: "CANCELLED", label: "Cancelled" },
];

const SORT_OPTIONS = [
  { key: "NEWEST", label: "⏱️ Newest First" },
  { key: "OLDEST", label: "⏳ Oldest First" },
  { key: "VALUE_HIGH", label: "💰 Highest Total First" },
  { key: "VALUE_LOW", label: "💵 Lowest Total First" },
  { key: "MOST_PAGES", label: "📄 Most Pages" },
  { key: "FEWEST_PAGES", label: "📑 Fewest Pages" },
];

const ACTION_CATEGORIES = [
  { key: "ALL", label: "⚡ All Live Actions" },
  { key: "ORDER", label: "📦 Orders Placed" },
  { key: "PAYMENT", label: "💳 Payments & UTR" },
  { key: "UPLOAD", label: "📄 Document Uploads" },
  { key: "LOCATION", label: "📍 Boisar Locations" },
  { key: "PAGE_VIEW", label: "🧭 Page Navigation" },
];

const UNDELIVERED_STATUSES = [
  "ORDER_RECEIVED",
  "PAYMENT_SUBMITTED",
  "PAYMENT_VERIFIED",
  "PRINTING",
  "QUALITY_CHECK",
  "READY",
  "OUT_FOR_DELIVERY",
];

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [updating, setUpdating] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState(null);
  const [jobSlipOrder, setJobSlipOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");

  // Navigation & Queue Tabs: "active_orders" | "delivered_orders" | "cancelled_orders" | "all_orders" | "live_users" | "actions_stream"
  const [adminTab, setAdminTab] = useState("active_orders");

  // Multi-Select Batch Actions
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // Database Tools / Clear Orders Modal
  const [showDbToolsModal, setShowDbToolsModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [dbActionLoading, setDbActionLoading] = useState(false);

  // Realtime Live Users & Telemetry State
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

    // 4. Initial fetch of activity logs
    fetchInitialActivityLogs();

    // 5. Polling interval backup
    const interval = setInterval(() => {
      fetchOrders(true);
      fetchInitialActivityLogs();
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

    // Load Payment Screenshot Proof
    if (selectedOrder.payment_proof_path) {
      if (selectedOrder.payment_proof_path.startsWith("razorpay://")) {
        setSelectedOrderProofUrl(null);
      } else {
        try {
          s.storage
            .from("payment-proofs")
            .createSignedUrl(selectedOrder.payment_proof_path, 3600)
            .then(({ data }) => {
              if (data?.signedUrl) {
                setSelectedOrderProofUrl(data.signedUrl);
              } else {
                const { data: pub } = s.storage
                  .from("payment-proofs")
                  .getPublicUrl(selectedOrder.payment_proof_path);
                setSelectedOrderProofUrl(pub?.publicUrl || null);
              }
            })
            .catch(() => setSelectedOrderProofUrl(null));
        } catch (e) {
          setSelectedOrderProofUrl(null);
        }
      }
    } else {
      setSelectedOrderProofUrl(null);
    }

    // Load Document Download/Preview URLs
    if (selectedOrder.order_files && selectedOrder.order_files.length > 0) {
      const urls = {};
      const promises = selectedOrder.order_files.map(async (file) => {
        try {
          const { data } = await s.storage
            .from("documents")
            .createSignedUrl(file.storage_path, 3600);
          if (data?.signedUrl) {
            urls[file.id] = data.signedUrl;
          } else {
            const { data: pub } = s.storage
              .from("documents")
              .getPublicUrl(file.storage_path);
            urls[file.id] = pub?.publicUrl || "";
          }
        } catch (err) {
          urls[file.id] = "";
        }
      });

      Promise.all(promises).then(() => {
        setSelectedOrderDocUrls({ ...urls });
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
    } catch (e) {}
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

  async function handleStatusChange(orderId, newStatus, customMsg = "") {
    setUpdating(true);
    try {
      const s = supabase();
      const { error: orderError } = await s
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      const defaultMsgMap = {
        ORDER_RECEIVED: "Order confirmed by shop admin.",
        PAYMENT_SUBMITTED: "Payment submitted. Verifying reference.",
        PAYMENT_VERIFIED: "Payment confirmed & verified by shop admin.",
        PRINTING: "Job is currently on the high-speed production printer.",
        QUALITY_CHECK: "Printing completed. Final binding & quality inspection underway.",
        READY: "Print job is packed, verified, and READY for pickup at shop counter!",
        OUT_FOR_DELIVERY: "Package dispatched with Boisar delivery courier.",
        DELIVERED: "Order successfully delivered & completed! Thank you for printing with Dhruvang Crazy Printing Center.",
        CANCELLED: "Order cancelled by administrator.",
      };

      const message = customMsg || defaultMsgMap[newStatus] || `Status updated to ${newStatus}`;

      await s.from("status_history").insert({
        order_id: orderId,
        status: newStatus,
        message: message,
      });

      playNotificationChime("success");
      await fetchOrders(true);
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdating(false);
    }
  }

  // ==========================================
  // BULK BATCH ACTIONS
  // ==========================================
  function handleToggleSelect(orderId) {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  }

  function handleSelectAllVisible() {
    const visibleIds = displayedOrders.map((o) => o.id);
    const allSelected = visibleIds.every((id) => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  }

  async function handleBulkStatusChange(newStatus) {
    if (selectedOrderIds.length === 0) return;
    const confirmMsg = `Are you sure you want to update ${selectedOrderIds.length} order(s) to "${newStatus.replaceAll("_", " ")}"?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdating(true);
    try {
      const s = supabase();
      for (const orderId of selectedOrderIds) {
        await s.from("orders").update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        }).eq("id", orderId);

        await s.from("status_history").insert({
          order_id: orderId,
          status: newStatus,
          message: `Bulk status update to ${newStatus.replaceAll("_", " ")} by admin.`,
        });
      }
      playNotificationChime("success");
      setSelectedOrderIds([]);
      await fetchOrders(false);
    } catch (err) {
      alert("Bulk update error: " + err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleBulkDeleteOrders() {
    if (selectedOrderIds.length === 0) return;
    const count = selectedOrderIds.length;
    if (!window.confirm(`⚠️ CAUTION: Permanently delete ${count} selected order(s) from the database? This cannot be undone.`)) return;

    setUpdating(true);
    try {
      const s = supabase();
      // Delete child records first for safety
      await s.from("order_files").delete().in("order_id", selectedOrderIds);
      await s.from("status_history").delete().in("order_id", selectedOrderIds);
      const { error } = await s.from("orders").delete().in("id", selectedOrderIds);
      if (error) throw error;

      playNotificationChime("success");
      setSelectedOrderIds([]);
      await fetchOrders(false);
      alert(`✅ Successfully deleted ${count} order(s).`);
    } catch (err) {
      alert("Delete error: " + err.message);
    } finally {
      setUpdating(false);
    }
  }

  // ==========================================
  // SINGLE ORDER DELETE
  // ==========================================
  async function handleDeleteSingleOrder(orderId, orderNumber) {
    if (!window.confirm(`⚠️ Permanently delete Order #${orderNumber} from database?`)) return;
    setUpdating(true);
    try {
      const s = supabase();
      await s.from("order_files").delete().eq("order_id", orderId);
      await s.from("status_history").delete().eq("order_id", orderId);
      const { error } = await s.from("orders").delete().eq("id", orderId);
      if (error) throw error;

      setSelectedOrder(null);
      await fetchOrders(false);
      alert(`✅ Order #${orderNumber} deleted.`);
    } catch (err) {
      alert("Delete failed: " + err.message);
    } finally {
      setUpdating(false);
    }
  }

  // ==========================================
  // DATABASE CLEAN-UP / CLEAR ALL ACTIONS
  // ==========================================
  async function handleClearAllOrders() {
    if (clearConfirmText !== "CLEAR ALL") {
      alert("Please type 'CLEAR ALL' exactly in uppercase to confirm wiping all orders.");
      return;
    }

    setDbActionLoading(true);
    try {
      const s = supabase();
      await s.from("order_files").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await s.from("status_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await s.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;

      playNotificationChime("success");
      setShowDbToolsModal(false);
      setClearConfirmText("");
      setSelectedOrder(null);
      setSelectedOrderIds([]);
      await fetchOrders(false);
      alert("✅ All orders, documents, and logs have been completely cleared!");
    } catch (err) {
      alert("Failed to clear orders: " + err.message);
    } finally {
      setDbActionLoading(false);
    }
  }

  async function handleClearDeliveredOrdersOnly() {
    if (!window.confirm("Purge all DELIVERED (fulfilled) orders from the database to clean up storage?")) return;
    setDbActionLoading(true);
    try {
      const s = supabase();
      const deliveredIds = orders.filter((o) => o.status === "DELIVERED").map((o) => o.id);
      if (deliveredIds.length === 0) {
        alert("No delivered orders to clear.");
        setDbActionLoading(false);
        return;
      }
      await s.from("order_files").delete().in("order_id", deliveredIds);
      await s.from("status_history").delete().in("order_id", deliveredIds);
      const { error } = await s.from("orders").delete().in("id", deliveredIds);
      if (error) throw error;

      setShowDbToolsModal(false);
      await fetchOrders(false);
      alert(`✅ Cleaned up ${deliveredIds.length} delivered order(s).`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setDbActionLoading(false);
    }
  }

  async function handleClearCancelledOrdersOnly() {
    if (!window.confirm("Purge all CANCELLED orders from the database?")) return;
    setDbActionLoading(true);
    try {
      const s = supabase();
      const cancelledIds = orders.filter((o) => o.status === "CANCELLED").map((o) => o.id);
      if (cancelledIds.length === 0) {
        alert("No cancelled orders to clear.");
        setDbActionLoading(false);
        return;
      }
      await s.from("order_files").delete().in("order_id", cancelledIds);
      await s.from("status_history").delete().in("order_id", cancelledIds);
      const { error } = await s.from("orders").delete().in("id", cancelledIds);
      if (error) throw error;

      setShowDbToolsModal(false);
      await fetchOrders(false);
      alert(`✅ Cleaned up ${cancelledIds.length} cancelled order(s).`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setDbActionLoading(false);
    }
  }

  async function handleDownloadDocument(storagePath, filename) {
    try {
      const s = supabase();
      const { data, error } = await s.storage.from("documents").download(storagePath);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download error: " + err.message);
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

  // ==========================================
  // FILTER & SORT ORDERS (Clean human logic)
  // ==========================================
  const displayedOrders = useMemo(() => {
    let result = [...orders];

    // Sub-Tab Filter:
    if (adminTab === "active_orders") {
      // Show ONLY undelivered active orders
      result = result.filter((o) => UNDELIVERED_STATUSES.includes(o.status));
    } else if (adminTab === "delivered_orders") {
      // Show ONLY delivered orders
      result = result.filter((o) => o.status === "DELIVERED");
    } else if (adminTab === "cancelled_orders") {
      // Show ONLY cancelled orders
      result = result.filter((o) => o.status === "CANCELLED");
    }

    // Status Dropdown Filter (when in "all_orders" tab)
    if (adminTab === "all_orders" && statusFilter !== "ALL") {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Text Search
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

    // Standard Sorting
    if (sortBy === "NEWEST") {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "OLDEST") {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === "VALUE_HIGH") {
      result.sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
    } else if (sortBy === "VALUE_LOW") {
      result.sort((a, b) => Number(a.total || 0) - Number(b.total || 0));
    } else if (sortBy === "MOST_PAGES") {
      result.sort((a, b) => Number(b.page_count || 1) - Number(a.page_count || 1));
    } else if (sortBy === "FEWEST_PAGES") {
      result.sort((a, b) => Number(a.page_count || 1) - Number(b.page_count || 1));
    }

    return result;
  }, [orders, adminTab, search, statusFilter, sortBy]);

  // Order Metrics Breakdown
  const undeliveredCount = useMemo(
    () => orders.filter((o) => UNDELIVERED_STATUSES.includes(o.status)).length,
    [orders]
  );
  const deliveredCount = useMemo(
    () => orders.filter((o) => o.status === "DELIVERED").length,
    [orders]
  );
  const cancelledCount = useMemo(
    () => orders.filter((o) => o.status === "CANCELLED").length,
    [orders]
  );
  const pendingPaymentCount = useMemo(
    () => orders.filter((o) => o.status === "PAYMENT_SUBMITTED" || o.status === "ORDER_RECEIVED").length,
    [orders]
  );
  const inPrintingCount = useMemo(
    () => orders.filter((o) => o.status === "PRINTING").length,
    [orders]
  );
  const readyCount = useMemo(
    () => orders.filter((o) => o.status === "READY" || o.status === "OUT_FOR_DELIVERY").length,
    [orders]
  );
  const totalRevenue = useMemo(
    () => orders.filter((o) => o.status !== "CANCELLED").reduce((acc, curr) => acc + Number(curr.total || 0), 0),
    [orders]
  );
  const activePagesCount = useMemo(
    () => orders.filter((o) => UNDELIVERED_STATUSES.includes(o.status)).reduce((acc, curr) => acc + Number(curr.page_count || 1) * Number(curr.copies || 1), 0),
    [orders]
  );

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

  // Combined Hybrid Live Active Users
  const activeLiveUsers = useMemo(() => {
    const userMap = new Map();
    liveUsers.forEach((u) => {
      const key = u.sessionId || u.presenceKey || "anon";
      userMap.set(key, {
        sessionId: u.sessionId || key,
        name: u.name || "Guest Visitor",
        phone: u.phone || "",
        currentPath: u.currentPath || "/",
        deviceInfo: u.deviceInfo || "Desktop Browser",
        locality: u.locality || "Boisar, Maharashtra",
        onlineAt: u.onlineAt || new Date().toISOString(),
        lastActiveAt: u.lastActiveAt || new Date().toISOString(),
      });
    });

    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    actionLogs.forEach((act) => {
      const actTime = act.timestamp ? new Date(act.timestamp).getTime() : 0;
      if (actTime >= fiveMinsAgo && act.sessionId) {
        const key = act.sessionId;
        const existing = userMap.get(key);
        if (!existing) {
          userMap.set(key, {
            sessionId: act.sessionId,
            name: act.userName || "Guest Visitor",
            phone: act.userPhone || "",
            currentPath: act.pageUrl || "/",
            deviceInfo: act.deviceInfo || "Browser Device",
            locality: "Boisar, Maharashtra",
            onlineAt: act.timestamp || new Date().toISOString(),
            lastActiveAt: act.timestamp || new Date().toISOString(),
          });
        }
      }
    });

    return Array.from(userMap.values());
  }, [liveUsers, actionLogs]);

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

  const isAllVisibleSelected = displayedOrders.length > 0 && displayedOrders.every((o) => selectedOrderIds.includes(o.id));

  return (
    <main className="wrap">
      {/* Top Header & Fast Navigation */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>
              Shop Operations Command Center
            </h1>
            <span className="admin-nav-badge">
              <ShieldCheck size={15} />
              <span>LIVE ADMIN</span>
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginTop: 4, margin: "4px 0 0" }}>
            Dhruvang Crazy Printing Center • High-Speed Production & Delivery Queue
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Database Tools & Clear Orders Trigger */}
          <button
            type="button"
            onClick={() => setShowDbToolsModal(true)}
            className="btn btn-sm"
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fca5a5",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Trash2 size={14} />
            <span>Database & Clear Tools</span>
          </button>

          {/* Live Online Users Presence Pill */}
          <button
            onClick={() => setAdminTab("live_users")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: activeLiveUsers.length > 0 ? "#ecfdf5" : "#f1f5f9",
              color: activeLiveUsers.length > 0 ? "#065f46" : "#64748b",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              border: `1px solid ${activeLiveUsers.length > 0 ? "#a7f3d0" : "var(--border)"}`,
              cursor: "pointer"
            }}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: activeLiveUsers.length > 0 ? "#10b981" : "#94a3b8",
              boxShadow: activeLiveUsers.length > 0 ? "0 0 10px #10b981" : "none"
            }} />
            <span>{activeLiveUsers.length} Online</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn btn-secondary btn-sm"
            style={{ padding: "6px 10px" }}
            title={soundEnabled ? "Mute audio chimes" : "Enable audio chimes"}
          >
            {soundEnabled ? <Volume2 size={15} color="#10b981" /> : <VolumeX size={15} color="#94a3b8" />}
          </button>

          {/* Refresh Button */}
          <button 
            onClick={() => {
              fetchOrders(false);
              fetchInitialActivityLogs();
            }} 
            disabled={refreshing} 
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Production & Financial Stats Bar */}
      <div className="stats-grid no-print" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ borderLeft: "4px solid #4f46e5" }}>
          <div className="stat-icon" style={{ background: "#eef2ff", color: "#4f46e5" }}>
            <Printer size={22} />
          </div>
          <div>
            <div className="stat-value">{undeliveredCount}</div>
            <div className="stat-label">Active Undelivered Jobs</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #eab308" }}>
          <div className="stat-icon" style={{ background: "#fef9c3", color: "#ca8a04" }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-value">{pendingPaymentCount}</div>
            <div className="stat-label">Pending Verification</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #06b6d4" }}>
          <div className="stat-icon" style={{ background: "#ecfeff", color: "#0891b2" }}>
            <Layers size={22} />
          </div>
          <div>
            <div className="stat-value">{activePagesCount}</div>
            <div className="stat-label">Active Sheets to Print</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #16a34a" }}>
          <div className="stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
            <IndianRupee size={22} />
          </div>
          <div>
            <div className="stat-value">₹{totalRevenue}</div>
            <div className="stat-label">Total Store Revenue</div>
          </div>
        </div>
      </div>

      {/* Main Admin Navigation Sub-Tabs */}
      <div className="no-print" style={{
        display: "flex",
        gap: 8,
        borderBottom: "2px solid var(--border)",
        marginBottom: 20,
        overflowX: "auto",
        paddingBottom: 4
      }}>
        {/* Tab 1: Active Undelivered Orders (Default) */}
        <button
          onClick={() => { setAdminTab("active_orders"); setSelectedOrderIds([]); }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom: adminTab === "active_orders" ? "3px solid var(--primary)" : "3px solid transparent",
            color: adminTab === "active_orders" ? "var(--primary)" : "var(--text-muted)",
            fontWeight: adminTab === "active_orders" ? 900 : 600,
            fontSize: 14.5,
            cursor: "pointer",
            marginBottom: -6,
            whiteSpace: "nowrap"
          }}
        >
          <Zap size={18} color={adminTab === "active_orders" ? "var(--primary)" : "currentColor"} />
          <span>⚡ Active Undelivered Queue</span>
          <span style={{
            background: undeliveredCount > 0 ? "var(--primary)" : "#f1f5f9",
            color: undeliveredCount > 0 ? "white" : "var(--text-muted)",
            fontSize: 11,
            fontWeight: 900,
            padding: "2px 8px",
            borderRadius: 999
          }}>
            {undeliveredCount} ACTIVE
          </span>
        </button>

        {/* Tab 2: Delivered Archive */}
        <button
          onClick={() => { setAdminTab("delivered_orders"); setSelectedOrderIds([]); }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom: adminTab === "delivered_orders" ? "3px solid #16a34a" : "3px solid transparent",
            color: adminTab === "delivered_orders" ? "#16a34a" : "var(--text-muted)",
            fontWeight: adminTab === "delivered_orders" ? 900 : 600,
            fontSize: 14.5,
            cursor: "pointer",
            marginBottom: -6,
            whiteSpace: "nowrap"
          }}
        >
          <Package size={18} color={adminTab === "delivered_orders" ? "#16a34a" : "currentColor"} />
          <span>📦 Delivered Archive</span>
          <span style={{
            background: "#f0fdf4",
            color: "#166534",
            fontSize: 11,
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 999,
            border: "1px solid #bbf7d0"
          }}>
            {deliveredCount}
          </span>
        </button>

        {/* Tab 3: Cancelled */}
        <button
          onClick={() => { setAdminTab("cancelled_orders"); setSelectedOrderIds([]); }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom: adminTab === "cancelled_orders" ? "3px solid #ef4444" : "3px solid transparent",
            color: adminTab === "cancelled_orders" ? "#dc2626" : "var(--text-muted)",
            fontWeight: adminTab === "cancelled_orders" ? 900 : 600,
            fontSize: 14.5,
            cursor: "pointer",
            marginBottom: -6,
            whiteSpace: "nowrap"
          }}
        >
          <XCircle size={18} color={adminTab === "cancelled_orders" ? "#dc2626" : "currentColor"} />
          <span>❌ Cancelled</span>
          <span style={{
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 11,
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 999,
            border: "1px solid #fecaca"
          }}>
            {cancelledCount}
          </span>
        </button>

        {/* Tab 4: All Orders */}
        <button
          onClick={() => { setAdminTab("all_orders"); setSelectedOrderIds([]); }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom: adminTab === "all_orders" ? "3px solid #64748b" : "3px solid transparent",
            color: adminTab === "all_orders" ? "#334155" : "var(--text-muted)",
            fontWeight: adminTab === "all_orders" ? 900 : 600,
            fontSize: 14.5,
            cursor: "pointer",
            marginBottom: -6,
            whiteSpace: "nowrap"
          }}
        >
          <Layers size={18} color={adminTab === "all_orders" ? "#334155" : "currentColor"} />
          <span>📋 All Master Orders ({orders.length})</span>
        </button>

        {/* Tab 5: Live Active Users */}
        <button
          onClick={() => setAdminTab("live_users")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom: adminTab === "live_users" ? "3px solid #0891b2" : "3px solid transparent",
            color: adminTab === "live_users" ? "#0891b2" : "var(--text-muted)",
            fontWeight: adminTab === "live_users" ? 900 : 600,
            fontSize: 14.5,
            cursor: "pointer",
            marginBottom: -6,
            whiteSpace: "nowrap"
          }}
        >
          <Users size={18} color={adminTab === "live_users" ? "#0891b2" : "currentColor"} />
          <span>Live Users Radar ({activeLiveUsers.length})</span>
        </button>

        {/* Tab 6: Action Stream */}
        <button
          onClick={() => setAdminTab("actions_stream")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom: adminTab === "actions_stream" ? "3px solid #8b5cf6" : "3px solid transparent",
            color: adminTab === "actions_stream" ? "#7c3aed" : "var(--text-muted)",
            fontWeight: adminTab === "actions_stream" ? 900 : 600,
            fontSize: 14.5,
            cursor: "pointer",
            marginBottom: -6,
            whiteSpace: "nowrap"
          }}
        >
          <Activity size={18} color={adminTab === "actions_stream" ? "#7c3aed" : "currentColor"} />
          <span>Action Stream</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* ORDERS SECTION (Tabs: active_orders, delivered_orders, cancelled_orders, all_orders) */}
      {/* ========================================================= */}
      {["active_orders", "delivered_orders", "cancelled_orders", "all_orders"].includes(adminTab) && (
        <div className="fast-pop-anim">
          {/* Search & Sort Toolbar */}
          <div className="card no-print" style={{ marginBottom: 18, padding: "14px 18px" }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              {/* Search Bar */}
              <div style={{ position: "relative", minWidth: 260, flex: 1 }}>
                <Search size={16} color="var(--text-light)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  placeholder="Search by order #, customer name, mobile, 12-digit UTR, Boisar address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    paddingLeft: 36,
                    paddingRight: 12,
                    paddingTop: 8,
                    paddingBottom: 8,
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13.5,
                  }}
                />
              </div>

              {/* Sorting Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)" }}>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: "8px 12px",
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

              {/* Status Filter (Only active in "all_orders" tab) */}
              {adminTab === "all_orders" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Filter size={15} color="var(--text-muted)" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: 13,
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
              )}
            </div>
          </div>

          {/* Bulk Multi-Action Floating Bar */}
          {selectedOrderIds.length > 0 && (
            <div 
              style={{
                background: "#1e1b4b",
                color: "white",
                padding: "12px 20px",
                borderRadius: "var(--radius-md)",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                boxShadow: "0 10px 25px -5px rgba(30, 27, 75, 0.4)",
                animation: "fastPopIn 0.2s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: "var(--primary)", color: "white", fontSize: 12, fontWeight: 900, padding: "3px 10px", borderRadius: 999 }}>
                  {selectedOrderIds.length} Selected
                </span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Bulk Batch Actions:</span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleBulkStatusChange("PRINTING")}
                  disabled={updating}
                  className="btn btn-sm"
                  style={{ background: "#4f46e5", color: "white", fontSize: 12, fontWeight: 800 }}
                >
                  <Printer size={13} />
                  <span>Start Printing</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkStatusChange("READY")}
                  disabled={updating}
                  className="btn btn-sm"
                  style={{ background: "#0284c7", color: "white", fontSize: 12, fontWeight: 800 }}
                >
                  <CheckCircle2 size={13} />
                  <span>Mark Ready</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkStatusChange("DELIVERED")}
                  disabled={updating}
                  className="btn btn-sm"
                  style={{ background: "#16a34a", color: "white", fontSize: 12, fontWeight: 800 }}
                >
                  <Package size={13} />
                  <span>Mark Delivered</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkDeleteOrders}
                  disabled={updating}
                  className="btn btn-sm"
                  style={{ background: "#dc2626", color: "white", fontSize: 12, fontWeight: 800 }}
                >
                  <Trash2 size={13} />
                  <span>Delete Selected</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrderIds([])}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className="card no-print" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-container" style={{ border: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={handleSelectAllVisible}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)" }}
                        title="Select/Deselect All Visible"
                      >
                        {isAllVisibleSelected ? <CheckSquare size={17} color="var(--primary)" /> : <Square size={17} color="#94a3b8" />}
                      </button>
                    </th>
                    <th>Order Ref</th>
                    <th>Customer &amp; Contact</th>
                    <th>Print Documents</th>
                    <th>Payment &amp; UTR</th>
                    <th>Job Specs</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOrders.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>
                          {adminTab === "active_orders" ? "🎉 No Pending Undelivered Orders!" : "No orders found in this view."}
                        </div>
                        <p style={{ fontSize: 13, marginTop: 4 }}>
                          {adminTab === "active_orders" 
                            ? "All received orders have been printed and delivered. New incoming customer orders will appear here in real-time." 
                            : "Try adjusting your search query or filter tab."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    displayedOrders.map((o) => {
                      const isSelected = selectedOrderIds.includes(o.id);
                      const fileCount = o.order_files ? o.order_files.length : 0;
                      const isPayAtStore = Boolean(o.upi_utr === "PAY_AT_STORE" || o.notes?.includes("PAY_AT_STORE"));

                      return (
                        <tr 
                          key={o.id}
                          style={{
                            background: isSelected ? "#f5f3ff" : "inherit",
                            borderLeft: o.priority === "EXPRESS" ? "4px solid #f59e0b" : "none"
                          }}
                        >
                          {/* Multi-Select Checkbox */}
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(o.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)" }}
                            >
                              {isSelected ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="#cbd5e1" />}
                            </button>
                          </td>

                          {/* Order Number & Timestamp */}
                          <td style={{ fontWeight: 800, fontFamily: "monospace" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span>{o.order_number}</span>
                              {o.priority === "EXPRESS" && (
                                <span style={{ background: "#fef3c7", color: "#b45309", fontSize: 9.5, fontWeight: 900, padding: "1px 5px", borderRadius: 3 }}>
                                  ⚡ RUSH
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, fontFamily: "sans-serif" }}>
                              <FormattedDate date={o.created_at} />
                            </div>
                          </td>

                          {/* Customer Name & Phone */}
                          <td>
                            <div style={{ fontWeight: 800 }}>{o.customer_name || o.profiles?.name || "Customer"}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                              <span>📞 {o.customer_phone || o.profiles?.phone || "N/A"}</span>
                            </div>
                          </td>

                          {/* Documents Preview & Download */}
                          <td>
                            {fileCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(o)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: 12, padding: "4px 8px", background: "#eef2ff", color: "var(--primary)", borderColor: "#c7d2fe" }}
                              >
                                <FileText size={13} />
                                <span>{fileCount} {fileCount === 1 ? "file" : "files"}</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, color: "var(--text-light)" }}>No files</span>
                            )}
                          </td>

                          {/* Payment & UTR */}
                          <td>
                            {o.status === "PAYMENT_VERIFIED" ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#ecfdf5", color: "#166534", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 4, border: "1px solid #a7f3d0" }}>
                                <CheckCircle2 size={12} />
                                <span>PAID &amp; VERIFIED</span>
                              </div>
                            ) : isPayAtStore ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f0f9ff", color: "#0369a1", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 4, border: "1px solid #bae6fd" }}>
                                <Store size={12} />
                                <span>Pay at Store</span>
                              </div>
                            ) : o.upi_utr ? (
                              <div style={{ fontSize: 11.5 }}>
                                <div style={{ fontWeight: 800, color: "#854d0e" }}>💳 UTR: {o.upi_utr}</div>
                                {o.payment_proof_path && <span style={{ color: "#16a34a", fontSize: 10.5, fontWeight: 700 }}>✓ Proof Attached</span>}
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>❌ UNPAID</span>
                            )}
                          </td>

                          {/* Job Specs */}
                          <td style={{ fontSize: 12 }}>
                            <div><b>{o.paper_size}</b> • {o.color_mode === "COLOR" ? "Color" : "B&W"}</div>
                            <div style={{ color: "var(--text-muted)" }}>
                              {o.page_count || 1} pg(s) × {o.copies || 1} copy • {o.delivery_mode === "DELIVERY" ? "🚚 Boisar" : "🏪 Pickup"}
                            </div>
                          </td>

                          {/* Total Price */}
                          <td style={{ fontWeight: 900, color: "var(--primary)", fontSize: 15 }}>
                            ₹{o.total}.00
                          </td>

                          {/* Order Status Badge */}
                          <td>
                            <span className={`status-badge status-${o.status}`}>
                              {o.status?.replaceAll("_", " ")}
                            </span>
                          </td>

                          {/* Quick 1-Click Operations */}
                          <td>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              {/* Open Details Drawer */}
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(o)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: "5px 9px", fontSize: 12 }}
                                title="Open Full Order Details & Files"
                              >
                                <Eye size={13} />
                                <span>Manage</span>
                              </button>

                              {/* Print Job Slip Ticket */}
                              <button
                                type="button"
                                onClick={() => setJobSlipOrder(o)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: "5px 8px", fontSize: 12 }}
                                title="Print Shop Job Ticket / Bag Slip"
                              >
                                <Printer size={13} />
                              </button>

                              {/* Direct WhatsApp Customer */}
                              <a
                                href={buildWhatsAppLink(o.customer_phone, `Hello ${o.customer_name || "Customer"}, update for Order #${o.order_number}: Status is now ${o.status?.replaceAll("_", " ")}.`)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: "5px 8px", color: "#16a34a" }}
                                title="WhatsApp Customer"
                              >
                                <MessageCircle size={13} />
                              </a>

                              {/* 1-Click Next Step Action */}
                              {o.status === "ORDER_RECEIVED" && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(o.id, "PAYMENT_VERIFIED")}
                                  disabled={updating}
                                  className="btn btn-sm"
                                  style={{ background: "#16a34a", color: "white", padding: "5px 8px", fontSize: 11.5, fontWeight: 800 }}
                                  title="Confirm & Verify Payment"
                                >
                                  ✓ Verify Paid
                                </button>
                              )}

                              {o.status === "PAYMENT_SUBMITTED" && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(o.id, "PAYMENT_VERIFIED")}
                                  disabled={updating}
                                  className="btn btn-sm"
                                  style={{ background: "#16a34a", color: "white", padding: "5px 8px", fontSize: 11.5, fontWeight: 800 }}
                                  title="Approve & Verify UTR Payment"
                                >
                                  ✓ Approve UTR
                                </button>
                              )}

                              {o.status === "PAYMENT_VERIFIED" && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(o.id, "PRINTING")}
                                  disabled={updating}
                                  className="btn btn-sm"
                                  style={{ background: "#4f46e5", color: "white", padding: "5px 8px", fontSize: 11.5, fontWeight: 800 }}
                                  title="Send to Printer"
                                >
                                  🖨️ Print
                                </button>
                              )}

                              {o.status === "PRINTING" && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(o.id, "READY")}
                                  disabled={updating}
                                  className="btn btn-sm"
                                  style={{ background: "#0284c7", color: "white", padding: "5px 8px", fontSize: 11.5, fontWeight: 800 }}
                                  title="Mark Ready for Pickup"
                                >
                                  🎉 Mark Ready
                                </button>
                              )}

                              {(o.status === "READY" || o.status === "OUT_FOR_DELIVERY") && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(o.id, "DELIVERED")}
                                  disabled={updating}
                                  className="btn btn-sm"
                                  style={{ background: "#059669", color: "white", padding: "5px 8px", fontSize: 11.5, fontWeight: 800 }}
                                  title="Mark Delivered (Removes from active queue & archives)"
                                >
                                  ✅ Deliver
                                </button>
                              )}
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
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: LIVE ACTIVE USERS RADAR */}
      {/* ========================================================= */}
      {adminTab === "live_users" && (
        <div className="fast-pop-anim">
          <div className="card" style={{ marginBottom: 20, padding: "18px 22px", background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)", borderColor: "#a7f3d0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 12px #10b981" }} />
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: "#065f46", margin: 0 }}>
                    Real-Time Customer Presence Radar ({activeLiveUsers.length} Online)
                  </h2>
                </div>
                <p style={{ fontSize: 13, color: "#047857", margin: 0 }}>
                  Tracks visitors live as they configure print settings, upload documents, and complete UPI checkout.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {activeLiveUsers.length === 0 ? (
              <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                <Users size={36} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
                <div style={{ fontWeight: 800, fontSize: 16 }}>No Active Customers Online Right Now</div>
                <p style={{ fontSize: 13, marginTop: 4 }}>Live presence updates automatically via Supabase Realtime when a visitor arrives.</p>
              </div>
            ) : (
              activeLiveUsers.map((u, i) => (
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
                    cursor: "pointer"
                  }}
                  onClick={() => setSelectedUserInspect(u)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "white", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 15 }}>
                        {(u.name || "G")[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14.5 }}>{u.name || "Guest Customer"}</div>
                        {u.phone && <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>📞 {u.phone}</div>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, background: "#ecfdf5", color: "#065f46", fontWeight: 900, padding: "3px 8px", borderRadius: 999, border: "1px solid #a7f3d0" }}>
                      ONLINE
                    </span>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, fontSize: 12, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Compass size={13} color="var(--primary)" />
                      <span><b>Route:</b> <code>{u.currentPath || "/"}</code></span>
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
      {/* TAB: REAL-TIME ACTION STREAM */}
      {/* ========================================================= */}
      {adminTab === "actions_stream" && (
        <div className="fast-pop-anim">
          <div className="card" style={{ marginBottom: 18, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={20} color="#06b6d4" />
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                  Live Action Stream &amp; Telemetry Feed
                </h3>
                <span style={{ background: "#ecfeff", color: "#0891b2", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, border: "1px solid #a5f3fc" }}>
                  {filteredActionLogs.length} Actions
                </span>
              </div>

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

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ACTION_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActionFilter(cat.key)}
                  style={{
                    background: actionFilter === cat.key ? "var(--primary)" : "#f1f5f9",
                    color: actionFilter === cat.key ? "white" : "var(--text-main)",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: actionFilter === cat.key ? 800 : 600,
                    cursor: "pointer"
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredActionLogs.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                No telemetry actions recorded yet.
              </div>
            ) : (
              filteredActionLogs.map((action, i) => (
                <div
                  key={i}
                  style={{
                    background: "white",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--text-main)", marginBottom: 2 }}>
                      {action.actionTitle}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      👤 <b>{action.userName || "Guest"}</b> {action.userPhone && `(📞 ${action.userPhone})`} • <code>{action.pageUrl || "/"}</code>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-light)" }}>
                    <FormattedDate date={action.timestamp || new Date().toISOString()} />
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DATABASE & MAINTENANCE MODAL */}
      {/* ========================================================= */}
      {showDbToolsModal && (
        <div className="modal-backdrop" onClick={() => setShowDbToolsModal(false)}>
          <div
            className="card"
            style={{ maxWidth: 540, width: "100%", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#dc2626" }}>
                <Trash2 size={20} />
                <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Database Maintenance &amp; Clear Tools</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDbToolsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Option 1: Clean Delivered Orders */}
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                  🧹 Clear Delivered Orders Only ({deliveredCount})
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 10px" }}>
                  Safely clears fulfilled delivered orders and their storage files to free up database capacity.
                </p>
                <button
                  type="button"
                  onClick={handleClearDeliveredOrdersOnly}
                  disabled={dbActionLoading || deliveredCount === 0}
                  className="btn btn-sm"
                  style={{ background: "#0284c7", color: "white", fontWeight: 800 }}
                >
                  Clear {deliveredCount} Delivered Orders
                </button>
              </div>

              {/* Option 2: Clean Cancelled Orders */}
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                  ❌ Clear Cancelled Orders ({cancelledCount})
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 10px" }}>
                  Removes junk/cancelled orders from the database.
                </p>
                <button
                  type="button"
                  onClick={handleClearCancelledOrdersOnly}
                  disabled={dbActionLoading || cancelledCount === 0}
                  className="btn btn-sm"
                  style={{ background: "#64748b", color: "white", fontWeight: 800 }}
                >
                  Clear {cancelledCount} Cancelled Orders
                </button>
              </div>

              {/* Option 3: DANGER - Wipe All Orders */}
              <div style={{ background: "#fef2f2", padding: 16, borderRadius: 8, border: "1.5px solid #f87171" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#991b1b", fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
                  <AlertTriangle size={18} />
                  <span>DANGER ZONE: Clear ALL Orders ({orders.length})</span>
                </div>
                <p style={{ fontSize: 12.5, color: "#7f1d1d", margin: "0 0 12px", lineHeight: 1.5 }}>
                  This will <b>permanently erase all orders, uploaded print documents, UTR references, and status history logs</b>.
                </p>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: "#991b1b", display: "block", marginBottom: 4 }}>
                    Type <code>CLEAR ALL</code> to confirm:
                  </label>
                  <input
                    type="text"
                    placeholder="CLEAR ALL"
                    value={clearConfirmText}
                    onChange={(e) => setClearConfirmText(e.target.value)}
                    style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace" }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleClearAllOrders}
                  disabled={dbActionLoading || clearConfirmText !== "CLEAR ALL"}
                  className="btn btn-sm"
                  style={{
                    background: clearConfirmText === "CLEAR ALL" ? "#dc2626" : "#cbd5e1",
                    color: "white",
                    fontWeight: 900,
                    width: "100%",
                    justifyContent: "center",
                    cursor: clearConfirmText === "CLEAR ALL" ? "pointer" : "not-allowed"
                  }}
                >
                  {dbActionLoading ? "Clearing Database..." : "Permanently Wipe All Orders 🗑️"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SHOP PRODUCTION JOB SLIP / TICKET MODAL */}
      {/* ========================================================= */}
      {jobSlipOrder && (
        <div className="modal-backdrop" onClick={() => setJobSlipOrder(null)}>
          <div
            className="card"
            style={{ maxWidth: 440, width: "100%", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>🖨️ Production Job Ticket</h3>
              <button onClick={() => setJobSlipOrder(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {/* Printable Ticket Area */}
            <div 
              id="printable-job-slip"
              style={{
                border: "2px dashed #334155",
                borderRadius: 8,
                padding: 16,
                background: "#ffffff",
                fontFamily: "monospace"
              }}
            >
              <div style={{ textAlign: "center", borderBottom: "1px dashed #334155", paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>DHRUVANG CRAZY PRINTING</div>
                <div style={{ fontSize: 11 }}>Boisar, Maharashtra • Store Counter</div>
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>
                  ORDER #{jobSlipOrder.order_number}
                </div>
                <div style={{ fontSize: 11 }}>{new Date(jobSlipOrder.created_at).toLocaleString()}</div>
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
                <div><b>Customer:</b> {jobSlipOrder.customer_name}</div>
                <div><b>Contact:</b> {jobSlipOrder.customer_phone || "N/A"}</div>
                <div><b>Delivery:</b> {jobSlipOrder.delivery_mode === "DELIVERY" ? "🚚 Boisar Doorstep" : "🏪 Counter Pickup"}</div>
                {jobSlipOrder.address && <div style={{ fontSize: 11 }}>📍 {jobSlipOrder.address}</div>}
              </div>

              <div style={{ borderTop: "1px dashed #334155", borderBottom: "1px dashed #334155", padding: "8px 0", margin: "8px 0", fontSize: 12.5, lineHeight: 1.5 }}>
                <div><b>Size:</b> {jobSlipOrder.paper_size}</div>
                <div><b>Color Mode:</b> {jobSlipOrder.color_mode === "COLOR" ? "Full Color" : "Black & White"}</div>
                <div><b>Sides:</b> {jobSlipOrder.sides === "DOUBLE" ? "Double Sided" : "Single Sided"}</div>
                <div><b>Paper Type:</b> {jobSlipOrder.paper_type || "Standard"}</div>
                <div><b>Binding:</b> {jobSlipOrder.binding_type || "None"}</div>
                <div><b>Pages:</b> {jobSlipOrder.page_count || 1} pg(s)</div>
                <div><b>Copies:</b> {jobSlipOrder.copies || 1} copy(s)</div>
                {jobSlipOrder.priority === "EXPRESS" && <div style={{ fontWeight: 900, color: "#b45309" }}>⚡ PRIORITY: EXPRESS RUSH</div>}
                {jobSlipOrder.notes && <div><b>Notes:</b> {jobSlipOrder.notes}</div>}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, fontWeight: 900, marginTop: 8 }}>
                <span>TOTAL AMOUNT:</span>
                <span style={{ fontSize: 18 }}>₹{jobSlipOrder.total}.00</span>
              </div>
              <div style={{ fontSize: 11, textAlign: "right", color: "#16a34a", fontWeight: 800 }}>
                {jobSlipOrder.status === "DELIVERED" ? "✅ DELIVERED & PAID" : jobSlipOrder.upi_utr ? `UTR: ${jobSlipOrder.upi_utr}` : "CASH / STORE PAYMENT"}
              </div>
            </div>

            <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-sm"
                style={{ flex: 1, justifyContent: "center", background: "var(--primary)", color: "white", fontWeight: 800 }}
              >
                <Printer size={15} />
                <span>Print Job Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setJobSlipOrder(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MANAGE ORDER DETAILS DRAWER / MODAL */}
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
                  Placed on <FormattedDate date={selectedOrder.created_at} /> • Amount: <b style={{ color: "var(--primary)" }}>₹{selectedOrder.total}.00</b>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setJobSlipOrder(selectedOrder)}
                  className="btn btn-secondary btn-sm"
                  title="Print Production Slip"
                >
                  <Printer size={14} />
                  <span>Job Slip</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

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
                    <div>No files attached.</div>
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
                    <span>Payment Verification &amp; Proof</span>
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

                {/* Pay at Store Badge */}
                {Boolean(selectedOrder.upi_utr === "PAY_AT_STORE" || selectedOrder.notes?.includes("PAY_AT_STORE")) && (
                  <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0369a1", fontWeight: 800, fontSize: 13.5, marginBottom: 4 }}>
                      <Store size={16} />
                      <span>Pay at Store Counter Selected</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#075985" }}>
                      Customer selected to pay <b>₹{selectedOrder.total}.00</b> via Cash or UPI Standee upon collecting prints.
                    </div>
                  </div>
                )}

                {/* 12-Digit UTR Number */}
                {selectedOrder.upi_utr && selectedOrder.upi_utr !== "PAY_AT_STORE" && (
                  <div style={{ background: "white", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>12-Digit UPI Transaction ID (UTR):</div>
                      <div style={{ fontSize: 14, fontWeight: 900, fontFamily: "monospace", letterSpacing: 1, color: "#1e1b4b" }}>
                        {selectedOrder.upi_utr}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyUtr(selectedOrder.upi_utr)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                    >
                      {copiedUtr ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                      <span>{copiedUtr ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                )}

                {/* Payment Screenshot Image Preview */}
                {selectedOrderProofUrl ? (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Payment Screenshot Proof:</div>
                    <div 
                      onClick={() => setPreviewImage(selectedOrderProofUrl)}
                      style={{ 
                        maxHeight: 180, 
                        overflow: "hidden", 
                        borderRadius: 8, 
                        border: "1px solid var(--border)",
                        cursor: "zoom-in",
                        background: "#000",
                        position: "relative"
                      }}
                    >
                      <img 
                        src={selectedOrderProofUrl} 
                        alt="Payment Proof" 
                        style={{ width: "100%", height: 180, objectFit: "contain", display: "block" }} 
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    No payment screenshot image attached.
                  </div>
                )}
              </div>
            </div>

            {/* Status Change Operations Bar */}
            <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "var(--text-main)" }}>
                ⚡ Update Order Status:
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {STATUS_LIST.filter((s) => s.key !== "ALL").map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => handleStatusChange(selectedOrder.id, st.key)}
                    disabled={updating || selectedOrder.status === st.key}
                    className="btn btn-sm"
                    style={{
                      background: selectedOrder.status === st.key ? "var(--primary)" : "white",
                      color: selectedOrder.status === st.key ? "white" : "var(--text-main)",
                      border: "1px solid var(--border)",
                      fontWeight: selectedOrder.status === st.key ? 900 : 600,
                      fontSize: 12,
                      opacity: selectedOrder.status === st.key ? 1 : 0.85
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => handleDeleteSingleOrder(selectedOrder.id, selectedOrder.order_number)}
                disabled={updating}
                className="btn btn-sm"
                style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", fontWeight: 800 }}
              >
                <Trash2 size={14} />
                <span>Delete Order</span>
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setInvoiceModalOrder(selectedOrder)}
                  className="btn btn-secondary btn-sm"
                >
                  <Receipt size={14} />
                  <span>View Tax Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Preview Modal */}
      {previewImage && (
        <div className="modal-backdrop" onClick={() => setPreviewImage(null)} style={{ zIndex: 9999 }}>
          <div style={{ maxWidth: "90vw", maxHeight: "90vh", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Zoom Preview" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 8, display: "block" }} />
            <button
              onClick={() => setPreviewImage(null)}
              style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.7)", color: "white", border: "none", borderRadius: "50%", width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer" }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Official Tax Invoice Modal */}
      {invoiceModalOrder && (
        <OfficialTaxInvoice order={invoiceModalOrder} onClose={() => setInvoiceModalOrder(null)} />
      )}
    </main>
  );
}
