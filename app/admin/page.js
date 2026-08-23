"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
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
  AlertTriangle
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
        PAYMENT_VERIFIED: "Payment screenshot verified by shop admin.",
        PRINTING: "Document sent to printer.",
        QUALITY_CHECK: "Print quality inspection passed.",
        READY: "Order is printed and packed. Ready for pickup/delivery.",
        OUT_FOR_DELIVERY: "Order dispatched with delivery partner.",
        DELIVERED: "Order successfully handed over/delivered.",
        CANCELLED: "Order cancelled by admin.",
      };

      const message = statusMsg.trim() || defaultMessages[newStatus] || `Status updated to ${newStatus}`;

      await s.from("status_history").insert({
        order_id: orderId,
        status: newStatus,
        message: message,
      });

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

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      o.order_number?.toLowerCase().includes(q) ||
      o.profiles?.name?.toLowerCase().includes(q) ||
      o.profiles?.phone?.toLowerCase().includes(q) ||
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
            Your account is currently registered as a <b>CUSTOMER</b>. To access the Admin Order Processing Panel, update your role to <b>ADMIN</b> in the Supabase Dashboard:
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
      {/* Admin Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>Admin Order Console</h1>
            <span className="admin-nav-badge">
              <ShieldCheck size={15} />
              <span>LIVE ADMIN</span>
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Process, print, and track all store print orders in real-time
          </p>
        </div>

        <button onClick={fetchOrders} className="btn btn-secondary btn-sm">
          <RefreshCw size={15} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
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
            <div className="stat-label">In Printing</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div className="stat-value">₹{totalRevenue}</div>
            <div className="stat-label">Total Store Volume</div>
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="card" style={{ marginBottom: 24, padding: "18px 20px" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {/* Search bar */}
          <div style={{ position: "relative", minWidth: 280, flex: 1 }}>
            <Search size={17} color="var(--text-light)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search by order #, customer name, phone..."
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
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-container" style={{ border: "none" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Print Specifications</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: "var(--text-main)" }}>{o.order_number}</div>
                      <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}>
                        {new Date(o.created_at).toLocaleString()}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600 }}>{o.profiles?.name || "Customer"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {o.profiles?.phone || "No phone"}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {o.paper_size} • {o.color_mode} • {o.sides}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {o.copies} copies • {o.paper_type} • {o.delivery_mode}
                      </div>
                    </td>

                    <td style={{ fontWeight: 800, fontSize: 15 }}>
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
                ))
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
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>{selectedOrder.order_number}</h2>
                <span className={`status-badge status-${selectedOrder.status}`} style={{ marginTop: 6 }}>
                  {selectedOrder.status?.replaceAll("_", " ")}
                </span>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)" }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Customer & Print Specs */}
            <div className="row" style={{ marginBottom: 20 }}>
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Customer Details
                </div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{selectedOrder.profiles?.name || "Customer"}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Phone: {selectedOrder.profiles?.phone || "N/A"}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  Delivery: <b>{selectedOrder.delivery_mode}</b>
                </div>
                {selectedOrder.address && (
                  <div style={{ fontSize: 12, color: "var(--text-main)", marginTop: 4, background: "white", padding: 6, borderRadius: 6 }}>
                    📍 {selectedOrder.address}
                  </div>
                )}
              </div>

              <div style={{ background: "#f8fafc", padding: 14, borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Print Job Specs
                </div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>
                  {selectedOrder.paper_size} | {selectedOrder.color_mode}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {selectedOrder.sides} sided | {selectedOrder.paper_type} paper
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--primary)", marginTop: 4 }}>
                  {selectedOrder.copies} Copies — Total ₹{selectedOrder.total}
                </div>
                {selectedOrder.notes && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    Note: "{selectedOrder.notes}"
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

            {/* Payment Proof Preview */}
            <div style={{ marginBottom: 24, padding: 14, border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <IndianRupee size={16} color="var(--success)" />
                <span>Payment Screenshot</span>
              </div>

              {selectedOrder.payment_proof_path ? (
                <div>
                  <button
                    onClick={async () => {
                      const url = await getDownloadUrl("payment-proofs", selectedOrder.payment_proof_path);
                      setPreviewImage(url);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <Eye size={14} />
                    <span>View Payment Screenshot</span>
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
                Update Order Status & Send Notification
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
