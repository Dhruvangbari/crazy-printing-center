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

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updating, setUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    checkAdminAndFetch();

    // Setup Realtime listener for incoming orders
    const s = supabase();
    const channel = s
      .channel("admin_orders_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      s.removeChannel(channel);
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

      // Verify Admin role
      const { data: profile } = await s
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "ADMIN") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await fetchOrders();
    } catch (err) {
      console.error("Admin check error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrders() {
    const s = supabase();
    const { data, error } = await s
      .from("orders")
      .select("*, profiles(name, phone), order_files(*), status_history(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
      if (selectedOrder) {
        const updated = (data || []).find((o) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    setUpdating(true);
    try {
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
        DELIVERED: "Order successfully delivered / handed over.",
        CANCELLED: "Order has been cancelled.",
      };

      const message = statusMsg.trim() || defaultMessages[newStatus] || `Status updated to ${newStatus}`;

      await s.from("status_history").insert({
        order_id: orderId,
        status: newStatus,
        message: message,
      });

      // 3. Auto-Dispatch Email & SMS Bill when payment is verified
      if (newStatus === "PAYMENT_VERIFIED") {
        const targetOrder = (orders || []).find((o) => o.id === orderId) || selectedOrder;
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

  function getStatusWhatsAppMessage(order, targetStatus) {
    const currentStatus = targetStatus || order.status;
    const trackingUrl = typeof window !== "undefined" ? `${window.location.origin}/orders/${order.id}` : `https://crazy-printing-center.vercel.app/orders/${order.id}`;
    const customerName = order.customer_name || order.profiles?.name || "Customer";
    const jobSummary = `${order.paper_size} ${order.color_mode === "COLOR" ? "Full Colour" : "B&W"} (${order.page_count || 1} pgs × ${order.copies || 1} copies)`;
    const invoiceNum = `BILL-${order.order_number}`;

    if (targetStatus === "BILL") {
      return (
        `🧾 *OFFICIAL TAX INVOICE & RECEIPT*\n` +
        `*Crazy Printing Center*\n` +
        `--------------------------------\n` +
        `📄 *Invoice No:* ${invoiceNum}\n` +
        `👤 *Customer:* ${customerName}\n` +
        `📞 *Phone:* ${order.customer_phone || "N/A"}\n` +
        `🖨️ *Print Job:* ${jobSummary}\n` +
        `📚 *Binding:* ${order.binding_type || "None"}\n` +
        `💳 *Total Paid:* Rs.${order.total}.00 (PAID & VERIFIED ✅)\n` +
        `🔢 *Payment UTR:* ${order.upi_utr || "Counter Verified"}\n` +
        `🚚 *Mode:* ${order.delivery_mode === "DELIVERY" ? `Doorstep Delivery (${order.address || ""})` : "Store Counter Pickup"}\n` +
        `--------------------------------\n` +
        `📍 *View & Download Official PDF Bill:* ${trackingUrl}\n\n` +
        `Thank you for choosing Crazy Printing Center!`
      );
    }

    switch (currentStatus) {
      case "PAYMENT_VERIFIED":
        return `✅ *Payment Verified - Crazy Printing Center*\n\nHello ${customerName}, your payment of *₹${order.total}.00* for Order *#${order.order_number}* (UTR: ${order.upi_utr || "Verified"}) is confirmed! 🎉\n\n📄 *Job:* ${jobSummary}\n🖨️ *Status:* Queued for High-Speed Printing\n\n📍 *Track Live Status & View Bill:* ${trackingUrl}\n\nThank you!`;
      case "PRINTING":
        return `🖨️ *Printing in Progress - Crazy Printing Center*\n\nHello ${customerName}, your print job *#${order.order_number}* (${jobSummary}) is currently on the printer!\n\n📍 *Track Live Progress:* ${trackingUrl}\n\nCrazy Printing Center`;
      case "READY":
        return `🎉 *Order Ready - Crazy Printing Center*\n\nHello ${customerName}, your print order *#${order.order_number}* is printed, packed, and *READY* for pickup!\n\n🏪 *Store Counter:* Crazy Printing Center\n💰 *Total Paid:* ₹${order.total}.00\n\n📍 *View Bill & Pickup Pass:* ${trackingUrl}\n\nSee you soon!`;
      case "OUT_FOR_DELIVERY":
        return `🚚 *Out for Delivery - Crazy Printing Center*\n\nHello ${customerName}, your print package for Order *#${order.order_number}* has been dispatched with our courier partner!\n\n📍 *Delivery Address:* ${order.address || "Your Address"}\n🛵 *Track Live Delivery Route:* ${trackingUrl}\n\nPlease keep your phone available.`;
      case "DELIVERED":
        return `📦 *Order Delivered - Crazy Printing Center*\n\nHello ${customerName}, your print order *#${order.order_number}* has been successfully delivered! ✅\n\n🧾 *Download Tax Invoice:* ${trackingUrl}\n\nThank you for printing with Crazy Printing Center!`;
      default:
        return `🧾 *Order Update - Crazy Printing Center*\n\nHello ${customerName}, update for Order #${order.order_number}:\nStatus: *${order.status?.replaceAll("_", " ")}*\nTotal: ₹${order.total}.00\n\n📍 *Track Live & View Bill:* ${trackingUrl}`;
    }
  }

  function getCustomerWhatsAppLink(order, targetStatus) {
    const phone = (order.customer_phone || order.profiles?.phone || "").replace(/[^0-9]/g, "");
    if (!phone) return null;
    const cleanPhone = phone.startsWith("91") ? phone : phone.length === 10 ? `91${phone}` : phone;
    const msg = getStatusWhatsAppMessage(order, targetStatus);
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
  }

  function handlePrintJobSheet() {
    window.print();
  }

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
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

  // Calculate KPIs
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const pendingPaymentCount = orders.filter((o) => o.status === "PAYMENT_SUBMITTED" || o.status === "ORDER_RECEIVED").length;
  const inProgressCount = orders.filter((o) => ["PAYMENT_VERIFIED", "PRINTING", "QUALITY_CHECK"].includes(o.status)).length;
  const readyCount = orders.filter((o) => o.status === "READY" || o.status === "OUT_FOR_DELIVERY").length;

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

        <button onClick={fetchOrders} className="btn btn-secondary btn-sm">
          <RefreshCw size={15} />
          <span>Refresh Orders</span>
        </button>
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

      {/* Search & Status Filters */}
      <div className="card no-print" style={{ marginBottom: 24, padding: "18px 20px" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {/* Search bar */}
          <div style={{ position: "relative", minWidth: 280, flex: 1 }}>
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

          {/* Status Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "9px 14px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 14,
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
                  <td colSpan="7" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const waLink = getCustomerWhatsAppLink(o);
                  return (
                    <tr key={o.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: "var(--text-main)" }}>{o.order_number}</div>
                        <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}>
                          <FormattedDate date={o.created_at} />
                        </div>
                        {o.priority === "EXPRESS" && (
                          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 800, background: "#fef3c7", color: "#b45309", padding: "2px 6px", borderRadius: 4, marginTop: 4 }}>
                            ⚡ EXPRESS
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: 700 }}>{o.customer_name || o.profiles?.name || "Customer"}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          📞 {o.customer_phone || o.profiles?.phone || "No phone"}
                        </div>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#16a34a", fontWeight: 700, marginTop: 4 }}
                          >
                            <MessageCircle size={12} />
                            <span>WhatsApp</span>
                          </a>
                        )}
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
                      </td>

                      <td>
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="btn btn-sm"
                          style={{ padding: "6px 14px" }}
                        >
                          <Eye size={14} />
                          <span>Process</span>
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

            {/* Status Update Actions */}
            <div style={{ background: "#f8fafc", padding: 18, borderRadius: "var(--radius-lg)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "var(--text-main)" }}>
                Update Order Status & Send Live Notification
              </div>

              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Optional custom message (e.g. 'Printed & packed ready for pickup')"
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
                <button
                  disabled={updating}
                  onClick={() => handleStatusChange(selectedOrder.id, "PAYMENT_VERIFIED")}
                  className="btn btn-sm"
                  style={{ background: "#0284c7" }}
                >
                  <CheckCircle2 size={14} />
                  <span>Verify Payment</span>
                </button>

                <button
                  disabled={updating}
                  onClick={() => handleStatusChange(selectedOrder.id, "PRINTING")}
                  className="btn btn-sm"
                  style={{ background: "#7c3aed" }}
                >
                  <Printer size={14} />
                  <span>Start Printing</span>
                </button>

                <button
                  disabled={updating}
                  onClick={() => handleStatusChange(selectedOrder.id, "READY")}
                  className="btn btn-sm"
                  style={{ background: "#16a34a" }}
                >
                  <Check size={14} />
                  <span>Mark Ready</span>
                </button>

                <button
                  disabled={updating}
                  onClick={() => handleStatusChange(selectedOrder.id, "OUT_FOR_DELIVERY")}
                  className="btn btn-sm"
                  style={{ background: "#ea580c" }}
                >
                  <Truck size={14} />
                  <span>Out For Delivery</span>
                </button>

                <button
                  disabled={updating}
                  onClick={() => handleStatusChange(selectedOrder.id, "DELIVERED")}
                  className="btn btn-sm btn-success"
                >
                  <CheckCircle2 size={14} />
                  <span>Mark Delivered</span>
                </button>

                <button
                  disabled={updating}
                  onClick={() => handleStatusChange(selectedOrder.id, "CANCELLED")}
                  className="btn btn-sm btn-danger"
                >
                  <XCircle size={14} />
                  <span>Cancel Order</span>
                </button>
              </div>

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

                <a
                  href={getCustomerWhatsAppLink(selectedOrder, "BILL") || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  style={{ background: "#0f172a", color: "white", textDecoration: "none" }}
                >
                  <Receipt size={14} />
                  <span>🧾 WhatsApp Official Bill</span>
                </a>
              </div>
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
    </main>
  );
}
