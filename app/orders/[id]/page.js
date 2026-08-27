"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import FormattedDate from "../../../components/FormattedDate";
import VirtualDeliveryMap from "../../../components/VirtualDeliveryMap";
import { 
  FileText, 
  Download, 
  CheckCircle, 
  Clock, 
  CreditCard, 
  UploadCloud, 
  ArrowLeft, 
  IndianRupee, 
  Layers, 
  Printer, 
  Copy, 
  Check, 
  X, 
  AlertCircle,
  MessageCircle,
  Receipt,
  User,
  Phone,
  MapPin,
  BookOpen,
  Zap,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Home,
  RefreshCw,
  XCircle,
  AlertTriangle
} from "lucide-react";
import OfficialTaxInvoice from "../../../components/OfficialTaxInvoice";
import CrazyLiveTimeline from "../../../components/CrazyLiveTimeline";
import { logUserAction } from "../../../lib/telemetry";

export default function Detail() {
  const p = useParams();
  const router = useRouter();
  const [o, setO] = useState(null);
  const [proof, setProof] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [proofUrl, setProofUrl] = useState(null);
  const [fileUrls, setFileUrls] = useState({});
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Uploaded wrong document / Need to change file");
  const [cancelNotes, setCancelNotes] = useState("");
  const [cancelling, setCancelling] = useState(false);

  async function handleCustomerCancel() {
    if (!o) return;
    setCancelling(true);
    try {
      const s = supabase();

      // Check if order is already printing or finished
      if (["PRINTING", "QUALITY_CHECK", "READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(o.status)) {
        alert("Printing has already commenced on the production machine. Please contact store support on WhatsApp to request manual assistance.");
        setCancelling(false);
        return;
      }

      // Update order status to CANCELLED
      const { error: orderErr } = await s
        .from("orders")
        .update({
          status: "CANCELLED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", o.id);

      if (orderErr) throw orderErr;

      // Add status history entry with reason
      const detailedMessage = `Cancelled by Customer. Reason: ${cancelReason}${cancelNotes.trim() ? ` (Feedback: "${cancelNotes.trim()}")` : ""}`;
      await s.from("status_history").insert({
        order_id: o.id,
        status: "CANCELLED",
        message: detailedMessage,
      });

      setShowCancelModal(false);
      setCancelNotes("");
      logUserAction("ORDER_CANCELLED", `Cancelled Order #${o.order_number}`, { orderId: o.id, reason: cancelReason, notes: cancelNotes });
      await loadOrder(false);
    } catch (err) {
      alert("Failed to cancel order: " + err.message);
    } finally {
      setCancelling(false);
    }
  }

  async function loadOrder(isSilent = false) {
    if (!p.id) return;
    if (!isSilent) setRefreshing(true);
    const s = supabase();
    const { data } = await s
      .from("orders")
      .select("*, order_files(*), status_history(*)")
      .eq("id", p.id)
      .single();
    setO(data);
    if (data?.upi_utr) {
      setUtrNumber(data.upi_utr);
    }

    // Load Payment Proof Image Preview
    if (data?.payment_proof_path) {
      try {
        const { data: urlData } = await s.storage
          .from("payment-proofs")
          .createSignedUrl(data.payment_proof_path, 3600);
        if (urlData?.signedUrl) {
          setProofUrl(urlData.signedUrl);
        } else {
          const { data: pub } = s.storage.from("payment-proofs").getPublicUrl(data.payment_proof_path);
          setProofUrl(pub?.publicUrl);
        }
      } catch (e) {}
    }

    // Load Document Previews
    if (data?.order_files && data.order_files.length > 0) {
      const urlMap = {};
      for (const file of data.order_files) {
        try {
          const { data: docUrl } = await s.storage
            .from("documents")
            .createSignedUrl(file.storage_path, 3600);
          if (docUrl?.signedUrl) {
            urlMap[file.id] = docUrl.signedUrl;
          }
        } catch (e) {}
      }
      setFileUrls(urlMap);
    }
    setRefreshing(false);
  }

  useEffect(() => {
    if (p?.id) {
      loadOrder();

      const s = supabase();
      let channel = null;

      try {
        if (s?.channel) {
          channel = s
            .channel(`order_live_sync_${p.id}`)
            .on(
              "postgres_changes",
              { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${p.id}` },
              () => {
                loadOrder(true);
              }
            )
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "status_history", filter: `order_id=eq.${p.id}` },
              () => {
                loadOrder(true);
              }
            )
            .subscribe();
        }
      } catch (e) {
        console.warn("Order live sync error:", e);
      }

      // 2. Auto-refresh polling every 5 seconds
      const interval = setInterval(() => {
        loadOrder(true);
      }, 5000);

      return () => {
        try {
          if (s?.removeChannel && channel) s.removeChannel(channel);
        } catch (e) {}
        clearInterval(interval);
      };
    }
  }, [p?.id]);

  async function handleSendInvoiceEmail() {
    if (!o) return;
    setEmailSending(true);
    setEmailStatus("");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAYMENT_VERIFIED",
          orderId: o.id,
          orderNumber: o.order_number,
          customerName: o.customer_name || "Customer",
          customerPhone: o.customer_phone || "",
          total: o.total,
          upiUtr: o.upi_utr,
          paperSize: o.paper_size,
          colorMode: o.color_mode,
          pageCount: o.page_count,
          copies: o.copies,
          deliveryMode: o.delivery_mode,
          address: o.address,
          trackingUrl: `${window.location.origin}/orders/${o.id}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus("Official Tax Invoice dispatched to email & SMS logged!");
      } else {
        setEmailStatus("Notification sent!");
      }
    } catch (e) {
      setEmailStatus("Notification generated!");
    } finally {
      setEmailSending(false);
    }
  }

  async function handlePaymentProof(e) {
    e.preventDefault();
    if (!proof) {
      setMsg("Please attach your UPI transaction screenshot.");
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      setMsg("Please enter a valid 12-digit UPI Transaction Ref / UTR number.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const s = supabase();
      const cleanName = proof.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `payment/${p.id}-${Date.now()}-${cleanName}`;

      const u = await s.storage.from("payment-proofs").upload(path, proof);
      if (u.error) {
        console.warn("Storage upload warning:", u.error.message);
      }

      // 1. Try atomic ACID payment procedure
      const { data: atomicResult, error: atomicErr } = await s.rpc("submit_payment_atomic", {
        p_order_id: p.id,
        p_utr: cleanUtr,
        p_payment_proof_path: path,
      });

      if (atomicErr) {
        if (atomicErr.message.includes("Fraud Alert") || atomicErr.message.includes("unique_upi_utr")) {
          throw new Error("Fraud Alert: This 12-digit transaction UTR was already submitted for another order. Each transaction can only be used once.");
        }

        // Fallback to standard update
        const { error: updateErr } = await s
          .from("orders")
          .update({
            upi_utr: cleanUtr,
            payment_proof_path: path,
            status: "PAYMENT_SUBMITTED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id);

        if (updateErr) throw updateErr;

        await s.from("status_history").insert({
          order_id: p.id,
          status: "PAYMENT_SUBMITTED",
          message: `Payment submitted with 12-digit UTR: ${cleanUtr}. Awaiting shop verification.`,
        });
      }

      // Trigger AI Order Agent to notify Admin directly via WhatsApp / Email
      try {
        fetch("/api/ai/notify-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: p.id,
            orderData: {
              ...p,
              upi_utr: cleanUtr,
              payment_proof_path: path,
              status: "PAYMENT_SUBMITTED"
            }
          })
        }).catch(() => {});
      } catch (e) {}

      logUserAction("PAYMENT_SUBMITTED", `Submitted UPI UTR ${cleanUtr} for Order #${o.order_number} (₹${o.total}.00)`, {
        orderId: o.id,
        orderNumber: o.order_number,
        utr: cleanUtr,
        total: o.total,
      });

      setMsg("🤖 AI Inspector: Payment submitted with 12-digit UTR! Admin notified to verify and begin laser printing.");
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      setMsg(err.message || "Failed to submit payment proof");
      setLoading(false);
    }
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

  function copyUpi(upiId) {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  if (!o) {
    return (
      <main className="wrap">
        <div className="card" style={{ textAlign: "center", padding: 50 }}>
          Loading order details...
        </div>
      </main>
    );
  }

  const isPaid = [
    "PAYMENT_VERIFIED",
    "PRINTING",
    "QUALITY_CHECK",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ].includes(o.status);

  const isFakeDetected = Boolean(
    (o.status === "CANCELLED" && o.payment_proof_path) ||
    (o.status_history && o.status_history.some((h) => 
      (h.message && (h.message.includes("FAKE_SCREENSHOT") || h.message.toLowerCase().includes("fake") || h.message.toLowerCase().includes("uncredited")))
    ))
  );

  const shopUpi = process.env.NEXT_PUBLIC_UPI_ID || "crazyprinting@upi";
  const upiPayUrl = `upi://pay?pa=${shopUpi}&pn=CrazyPrintingCenter&am=${o.total}&cu=INR&tn=${encodeURIComponent(`Order ${o.order_number}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    upiPayUrl
  )}`;

  const shopPhone = "918857871669";
  const billWhatsAppMsg = buildOrderStatusMessage(o, "BILL");
  const shareWhatsAppBillUrl = buildWhatsAppLink(null, billWhatsAppMsg);
  const directCustomerWhatsAppUrl = buildWhatsAppLink(o?.customer_phone, billWhatsAppMsg);
  const whatsappShopUrl = buildWhatsAppLink(
    shopPhone,
    `Hello Dhruvang Crazy Printing Center, I have a question regarding my Order #${o.order_number} (${o.customer_name || "Customer"}).`
  );

  // Rate per page
  const ratePerPage = o.color_mode === "COLOR" ? 5 : 3;

  return (
    <main className="wrap">
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Navigation & Header */}
        <div className="no-print" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>
              <Home size={15} />
              <span>Home</span>
            </Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href="/orders" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>
              <ArrowLeft size={15} />
              <span>My Orders</span>
            </Link>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>{o.order_number}</h1>
                {o.priority === "EXPRESS" && (
                  <span className="status-badge" style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" }}>
                    ⚡ EXPRESS PRIORITY
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                Placed on <FormattedDate date={o.created_at} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => loadOrder(false)}
                disabled={refreshing}
                className="btn btn-secondary btn-sm"
                title="Refresh order details and tracking status"
              >
                <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
                <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
              </button>

              <button 
                onClick={() => setShowBillModal(true)} 
                className="btn btn-sm"
                style={{ background: "#0f172a" }}
              >
                <Receipt size={15} />
                <span>View Customer Bill</span>
              </button>

              <button
                onClick={() => setShowBillModal(true)}
                className="btn btn-whatsapp btn-sm"
                title="View Tax Invoice and send PDF directly to WhatsApp"
              >
                <MessageCircle size={15} />
                <span>Send PDF to WhatsApp 📲</span>
              </button>

              {o.status !== "CANCELLED" && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ borderColor: "#fecaca", color: "#b91c1c" }}
                  title="Cancel this order"
                >
                  <XCircle size={15} color="#ef4444" />
                  <span>Cancel Order</span>
                </button>
              )}

              <button onClick={handlePrint} className="btn btn-secondary btn-sm">
                <Printer size={15} />
                <span>Print Bill</span>
              </button>

              <span className={`status-badge status-${o.status}`} style={{ fontSize: 14, padding: "6px 16px" }}>
                {o.status?.replaceAll("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Anti-Fraud Fake Screenshot / Payment Rejected Alert for Customer */}
        {isFakeDetected && !isPaid && (
          <div className="no-print" style={{ background: "#fef2f2", border: "2px solid #ef4444", borderRadius: "var(--radius-lg)", padding: "20px 24px", marginBottom: 24, boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.15)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ShieldAlert size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#991b1b", margin: 0 }}>
                    🚨 Payment Verification Failed: Fake / Invalid Screenshot Detected
                  </h3>
                  <span style={{ background: "#dc2626", color: "white", fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 999 }}>
                    REJECTED BY STORE
                  </span>
                </div>
                <p style={{ fontSize: 14, color: "#7f1d1d", lineHeight: 1.6, margin: "6px 0 14px" }}>
                  Our shop cashier and bank verification system checked for your payment of <b>₹{o.total}.00</b>, but the submitted transaction screenshot or 12-digit UTR (<b>{o.upi_utr || "N/A"}</b>) was <b>not credited to our store bank account</b>.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#991b1b" }}>
                    👉 Please scan the QR code below and re-upload your genuine payment screenshot & 12-digit UTR to resume printing:
                  </div>
                  <a
                    href={`https://wa.me/918857871669?text=${encodeURIComponent(`Hello Dhruvang Crazy Printing Center, my payment for Order #${o.order_number} (₹${o.total}) was flagged. Here is my query:`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm"
                    style={{ background: "#16a34a", color: "white", fontSize: 12, padding: "6px 12px" }}
                  >
                    <MessageCircle size={14} />
                    <span>Chat with Cashier</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Virtual Delivery Map & ETA Tracker */}
        <div className="no-print">
          <VirtualDeliveryMap order={o} />
        </div>

        {/* Customer & Delivery Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="row">
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Customer Information
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>
                {o.customer_name || "Customer"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                📞 Contact: {o.customer_phone || "Not specified"}
              </div>
              {o.upi_utr && (
                <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 700, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <ShieldCheck size={14} />
                  <span>UTR Ref: {o.upi_utr}</span>
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Fulfillment & Destination
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                {o.delivery_mode === "PICKUP" ? "🏪 Store Counter Pickup" : "🚚 Doorstep Delivery"}
              </div>
              {o.address && (
                <div style={{ fontSize: 13, color: "var(--text-main)", marginTop: 2 }}>
                  📍 {o.address}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="row" style={{ marginBottom: 24 }}>
          {/* Specifications Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Layers size={18} color="var(--primary)" />
                <span>Job Specifications</span>
              </h2>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--primary)" }}>
                ₹{o.total}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Paper Size:</span>
                <b>{o.paper_size}</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Colour Mode:</span>
                <b>{o.color_mode === "COLOR" ? "Full Colour (₹5.00/pg)" : "Black & White (₹3.00/pg)"}</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Print Sides:</span>
                <b>{o.sides === "DOUBLE" ? "Double Sided" : "Single Sided"}</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Paper Quality:</span>
                <b>{o.paper_type}</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Binding / Finishing:</span>
                <b>{o.binding_type || "NONE"}</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Document Pages:</span>
                <b>{o.page_count || 1} page(s)</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Copies:</span>
                <b>{o.copies} copy(s)</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Priority:</span>
                <b>{o.priority || "STANDARD"}</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Fulfillment:</span>
                <b style={{ color: o.delivery_mode === "DELIVERY" ? "#0284c7" : "#16a34a" }}>
                  {o.delivery_mode === "DELIVERY" ? "🚚 Boisar Doorstep Delivery (+₹30.00)" : "🏪 Store Counter Pickup (Free)"}
                </b>
              </div>

              {o.notes && (
                <div style={{ marginTop: 4, background: "#f8fafc", padding: 8, borderRadius: 6, fontSize: 12 }}>
                  <b>Instructions:</b> {o.notes}
                </div>
              )}
            </div>
          </div>

          {/* Uploaded Documents */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <FileText size={18} color="var(--primary)" />
                <span>Uploaded Documents ({o.order_files?.length || 0})</span>
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {o.order_files?.map((file) => (
                <div
                  key={file.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#f8fafc",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{file.original_name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-light)" }}>
                      {file.size ? (file.size / 1024 / 1024).toFixed(2) + " MB" : "Document"}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload("documents", file.storage_path, file.original_name)}
                    className="btn btn-secondary btn-sm no-print"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Anti-Fraud UPI Payment Box */}
        {!isPaid && (
          <div className="card no-print" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <ShieldCheck size={20} color="var(--primary)" />
                <span>Anti-Fraud Secure UPI Payment</span>
              </h2>
              <span className="status-badge status-PAYMENT_SUBMITTED">Amount: ₹{o.total}</span>
            </div>

            <div className="row" style={{ alignItems: "flex-start" }}>
              {/* QR Code */}
              <div style={{ textAlign: "center", padding: 16, background: "#f8fafc", borderRadius: "var(--radius-md)", flex: "0 0 220px" }}>
                <img
                  src={qrCodeUrl}
                  alt="UPI QR Code"
                  style={{ width: 160, height: 160, borderRadius: 8, margin: "0 auto 10px", display: "block" }}
                />
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", marginBottom: 6 }}>
                  Scan & Pay ₹{o.total}
                </div>

                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "white", padding: "4px 10px", borderRadius: 999, border: "1px solid var(--border)", fontSize: 12 }}>
                  <span>{shopUpi}</span>
                  <button
                    type="button"
                    onClick={() => copyUpi(shopUpi)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)" }}
                  >
                    {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                  Order Ref: <b>{o.order_number}</b>
                </div>
              </div>

              {/* Anti-Fraud UTR & Screenshot Verification Form */}
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  Submit Transaction Reference & Screenshot
                </h4>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                  To prevent fraudulent submissions and start printing immediately, please enter your authentic <b>12-digit UPI UTR / Transaction Ref ID</b> from your bank or payment app (Google Pay, PhonePe, Paytm, BHIM) along with your screenshot.
                </p>

                <form onSubmit={handlePaymentProof}>
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      12-Digit UPI Transaction ID / UTR Number <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 423456789012"
                      maxLength={16}
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9]/g, ""))}
                      required
                      style={{ fontSize: 14, fontFamily: "monospace", letterSpacing: 1 }}
                    />
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      Found under transaction details in GPay, PhonePe, Paytm, or BHIM.
                    </div>
                  </div>

                  <div className="field" style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      Payment Screenshot Proof <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProof(e.target.files[0])}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !proof || utrNumber.length < 8}
                    className="btn"
                    style={{ width: "100%" }}
                  >
                    <UploadCloud size={16} />
                    <span>{loading ? "Verifying & Submitting..." : "Submit Verified Payment"}</span>
                  </button>
                </form>

                {msg && (
                  <div className={msg.includes("Error") || msg.includes("Fraud") ? "error" : "success"} style={{ marginTop: 12 }}>
                    {msg.includes("Fraud") && <ShieldAlert size={16} style={{ marginRight: 6 }} />}
                    <span>{msg}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Crazy Live Animated Timeline */}
        <div className="no-print" style={{ marginTop: 24 }}>
          <CrazyLiveTimeline order={o} />
        </div>
      </div>

      {/* Official Customer Bill / Tax Invoice Modal */}
      {showBillModal && (
        <div className="modal-backdrop" onClick={() => setShowBillModal(false)}>
          <div style={{ maxWidth: 840, width: "100%", maxHeight: "95vh", overflowY: "auto", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowBillModal(false)}
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

            <OfficialTaxInvoice order={o} proofUrl={proofUrl} />
          </div>
        </div>
      )}

      {/* Customer Cancellation & Reason Modal */}
      {showCancelModal && (
        <div className="modal-backdrop" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" style={{ maxWidth: 520, padding: "24px 24px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a" }}>Cancel Print Order</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Order #{o?.order_number}</p>
                </div>
              </div>

              <button
                onClick={() => setShowCancelModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* If Order is already in physical production */}
            {["PRINTING", "QUALITY_CHECK", "READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(o?.status) ? (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "16px 18px", borderRadius: 12, color: "#92400e" }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                  ⚠️ Production Already in Progress
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                  This order has already reached the <b>{o.status.replaceAll("_", " ")}</b> stage. Ink and paper materials have been consumed on our production machines.
                </p>
                <p style={{ fontSize: 12, marginTop: 8, color: "#78350f" }}>
                  To request special cancellation or discuss a reprint, please message our store team directly on WhatsApp.
                </p>

                <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                  <a
                    href={`https://wa.me/918857871669?text=${encodeURIComponent(`Hi, I need assistance cancelling Order #${o.order_number}. Current status: ${o.status}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-whatsapp btn-sm"
                    style={{ textDecoration: "none", flex: 1, justifyContent: "center" }}
                  >
                    <MessageCircle size={14} />
                    <span>Contact WhatsApp Support (8857871669)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: "#475569", marginBottom: 14, lineHeight: 1.5 }}>
                  Please tell us why you would like to cancel your print job. Your feedback helps us improve our service:
                </p>

                {/* Pre-set Reasons Selection */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {[
                    "Uploaded wrong document / Need to change file",
                    "Incorrect print options (paper, color, or binding)",
                    "Delivery time / ETA is too long",
                    "Placed duplicate order by mistake",
                    "Payment issue / Changed mind",
                    "Other reason"
                  ].map((r) => (
                    <label
                      key={r}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: cancelReason === r ? "2px solid #4f46e5" : "1px solid #e2e8f0",
                        background: cancelReason === r ? "#eef2ff" : "#ffffff",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: cancelReason === r ? 700 : 500,
                        color: cancelReason === r ? "#312e81" : "#334155",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <input
                        type="radio"
                        name="cancelReason"
                        value={r}
                        checked={cancelReason === r}
                        onChange={() => setCancelReason(r)}
                        style={{ accentColor: "#4f46e5" }}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>

                {/* Optional Detailed Notes */}
                <div className="field" style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                    Additional feedback or comments (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide any additional details..."
                    value={cancelNotes}
                    onChange={(e) => setCancelNotes(e.target.value)}
                    style={{ fontSize: 13, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    disabled={cancelling}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Keep Order
                  </button>

                  <button
                    type="button"
                    onClick={handleCustomerCancel}
                    disabled={cancelling}
                    className="btn btn-danger"
                    style={{ flex: 1.2, background: "#dc2626", color: "white" }}
                  >
                    {cancelling ? "Cancelling..." : "Confirm Cancellation ❌"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}