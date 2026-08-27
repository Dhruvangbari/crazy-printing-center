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
  AlertTriangle,
  Store,
  Star
} from "lucide-react";
import OfficialTaxInvoice from "../../../components/OfficialTaxInvoice";
import CrazyLiveTimeline from "../../../components/CrazyLiveTimeline";
import { logUserAction } from "../../../lib/telemetry";
import { playChime } from "../../../lib/webNotifications";
import { openWhatsAppChat, buildWhatsAppLink, buildOrderStatusMessage } from "../../../lib/whatsapp";
import { initiateRazorpayPayment } from "../../../lib/razorpay";

export default function Detail() {
  const p = useParams();
  const router = useRouter();
  const [o, setO] = useState(null);
  const [proof, setProof] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
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

  async function handleRazorpayCheckout() {
    if (!o) return;
    setRazorpayLoading(true);
    setMsg("");
    try {
      await initiateRazorpayPayment({
        order: o,
        onSuccess: (paymentId) => {
          playChime("success");
          setMsg(`✅ Payment verified successfully (Ref: ${paymentId})! Order queued for high-speed printing.`);
          loadOrder(false);
        },
        onFailure: (err) => {
          console.error("Razorpay Error:", err);
          setMsg("Payment was not completed. You can retry or upload your screenshot below.");
        },
        onDismiss: () => {
          setRazorpayLoading(false);
        },
      });
    } catch (err) {
      alert("Payment gateway error: " + err.message);
    } finally {
      setRazorpayLoading(false);
    }
  }

  // Issue / Refund & Replacement Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState("MISPRINT");
  const [issueResolution, setIssueResolution] = useState("REPLACEMENT"); // "REPLACEMENT" | "REFUND"
  const [issueDesc, setIssueDesc] = useState("");
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueSubmitted, setIssueSubmitted] = useState(false);

  async function handleReportIssue(e) {
    e.preventDefault();
    if (!o) return;
    setIssueSubmitting(true);
    try {
      const s = supabase();
      const issueLabelMap = {
        MISPRINT: "Print Quality / Misprint / Blurred Text",
        MISSING_PAGES: "Wrong Pages / Missing Pages",
        BINDING_SIZE: "Wrong Paper Size / Binding Issue",
        DAMAGE: "Damaged in Delivery / Folded Package",
        PAYMENT_ISSUE: "Payment Deducted Twice / Overcharged",
        OTHER: "Other Issue"
      };

      const typeLabel = issueLabelMap[issueType] || issueType;
      const resolutionLabel = issueResolution === "REFUND" ? "Instant UPI Refund" : "Free Reprint & Replacement";
      const message = `🚨 Issue Reported by Customer: [${typeLabel}] -> Requested Resolution: [${resolutionLabel}]. Details: "${issueDesc.trim()}".`;

      // 1. Insert into status history
      await s.from("status_history").insert({
        order_id: o.id,
        status: o.status,
        message: message,
      });

      // 2. Play alert chime
      playChime("alert");

      // 3. Construct WhatsApp escalation text
      const waText = 
        `🚨 *ISSUE & REFUND REPORT — DHRUVANG CRAZY PRINTING*\n` +
        `--------------------------------\n` +
        `📦 *Order Ref:* #${o.order_number}\n` +
        `👤 *Customer Name:* ${o.customer_name || "Customer"}\n` +
        `📞 *Phone:* ${o.customer_phone || "N/A"}\n` +
        `⚠️ *Issue Type:* ${typeLabel}\n` +
        `🔄 *Requested Action:* ${resolutionLabel}\n` +
        `💬 *Description:* ${issueDesc.trim()}\n` +
        `💰 *Order Total:* ₹${o.total}.00\n` +
        `--------------------------------\n` +
        `Please resolve this issue immediately.`;

      openWhatsAppChat("8857871669", waText);

      setIssueSubmitted(true);
      setTimeout(() => {
        setShowIssueModal(false);
        setIssueSubmitted(false);
        loadOrder(false);
      }, 2000);
    } catch (err) {
      alert("Failed to report issue: " + err.message);
    } finally {
      setIssueSubmitting(false);
    }
  }

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

  function handleRazorpayPayNow() {
    if (!o) return;
    setRazorpayLoading(true);
    initiateRazorpayPayment({
      order: {
        id: o.id,
        order_number: o.order_number,
        total: o.total,
        customer_name: o.customer_name || o.profiles?.name || "Customer",
        customer_phone: o.customer_phone || o.profiles?.phone || "",
        customer_email: o.profiles?.email || "customer@crazyprinting.com",
        paper_size: o.paper_size,
        delivery_mode: o.delivery_mode,
      },
      onSuccess: async (paymentId) => {
        try {
          const s = supabase();
          await s.from("orders").update({
            status: "PAYMENT_VERIFIED",
            upi_utr: paymentId,
            payment_proof_path: `razorpay://${paymentId}`,
            updated_at: new Date().toISOString(),
          }).eq("id", o.id);

          await s.from("status_history").insert({
            order_id: o.id,
            status: "PAYMENT_VERIFIED",
            message: `💳 Payment of ₹${o.total}.00 verified via Razorpay (Ref ID: ${paymentId}). Queued for high-speed laser printing!`,
          });
        } catch (e) {}

        setRazorpayLoading(false);
        playChime("success");
        setMsg("✅ Payment verified via Razorpay! Your order is queued for printing.");
        fetchOrder(false);
      },
      onFailure: (err) => {
        setRazorpayLoading(false);
      },
      onDismiss: () => {
        setRazorpayLoading(false);
      }
    });
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

        // Fallback to standard update with schema column compatibility
        let updateErr = null;
        try {
          const res = await s
            .from("orders")
            .update({
              upi_utr: cleanUtr,
              payment_proof_path: path,
              status: "PAYMENT_SUBMITTED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", p.id);
          updateErr = res.error;
        } catch (e) {
          updateErr = e;
        }

        if (updateErr) {
          // If upi_utr column is missing in schema, update without it safely
          const { error: safeErr } = await s
            .from("orders")
            .update({
              payment_proof_path: path,
              status: "PAYMENT_SUBMITTED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", p.id);

          if (safeErr) throw safeErr;
        }

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

      playChime("success");
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
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>Order #{o.order_number}</h1>
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
                <span>View Tax Invoice / Bill</span>
              </button>

              <button
                onClick={() => setShowBillModal(true)}
                className="btn btn-whatsapp btn-sm"
                title="View Tax Invoice and send PDF directly to WhatsApp"
              >
                <MessageCircle size={15} />
                <span>Send PDF to WhatsApp 📲</span>
              </button>

              {/* Report Defect / Wrong Product / Request Refund */}
              <button
                type="button"
                onClick={() => setShowIssueModal(true)}
                className="btn btn-secondary btn-sm"
                style={{ borderColor: "#fde047", background: "#fefce8", color: "#854d0e", fontWeight: 700 }}
                title="Report issue, defective print, or request refund/replacement"
              >
                <AlertTriangle size={15} color="#ca8a04" />
                <span>Report Issue / Refund</span>
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

        {/* 🌟 ENHANCED ORDER RECEIVED CONFIRMATION BANNER */}
        <div 
          className="no-print"
          style={{
            background: isPaid 
              ? "linear-gradient(135deg, #065f46 0%, #047857 100%)" 
              : "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
            color: "white",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
            marginBottom: 24,
            boxShadow: "0 10px 30px rgba(6, 95, 70, 0.2)",
            animation: "fastPopIn 0.3s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.2)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}>
                <CheckCircle2 size={26} color="#34d399" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: "#ffffff" }}>
                    🎉 Order Received Successfully!
                  </h3>
                  <span style={{
                    background: "rgba(255, 255, 255, 0.25)",
                    fontSize: 11,
                    fontWeight: 900,
                    padding: "2px 8px",
                    borderRadius: 999
                  }}>
                    ID: #{o.order_number}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", color: "#d1fae5", fontSize: 13.5, lineHeight: 1.5 }}>
                  Your documents are confirmed and queued for high-speed laser printing at Dhruvang Crazy Printing Center.
                </p>
              </div>
            </div>

            {/* Estimated Ready Time & Payment Status Pill */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.15)", fontSize: 12.5 }}>
                <div style={{ color: "#a7f3d0", fontWeight: 700 }}>⏱️ Estimated Ready:</div>
                <div style={{ fontWeight: 900, fontSize: 14, color: "#ffffff" }}>
                  {o.priority === "EXPRESS" ? "~5-10 Minutes (Express)" : "~15-20 Minutes"}
                </div>
              </div>

              <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.15)", fontSize: 12.5 }}>
                <div style={{ color: "#a7f3d0", fontWeight: 700 }}>💳 Payment Status:</div>
                <div style={{ fontWeight: 900, fontSize: 13.5, color: isPaid ? "#34d399" : "#fbbf24" }}>
                  {isPaid ? "✅ Verified via Razorpay" : "⏳ Payment Pending"}
                </div>
              </div>
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

        {/* Secure Razorpay Online Payment Box */}
        {!isPaid && (
          <div className="card no-print" style={{ marginBottom: 24, border: "1.5px solid #a5b4fc", background: "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)" }}>
            <div className="card-header" style={{ borderBottom: "1px solid #e0e7ff", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#4f46e5", color: "white", display: "grid", placeItems: "center" }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="card-title" style={{ margin: 0, fontSize: 17, color: "#1e1b4b" }}>
                    Online Payment (Razorpay)
                  </h2>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    Instant verification with Google Pay, PhonePe, Paytm, BHIM, Cards &amp; NetBanking
                  </div>
                </div>
              </div>
              <span className="status-badge status-PAYMENT_SUBMITTED" style={{ fontSize: 13 }}>
                Amount Due: ₹{o.total}.00
              </span>
            </div>

            <div style={{ padding: "16px 0 8px" }}>
              <p style={{ fontSize: 14, color: "#3730a3", lineHeight: 1.5, margin: "0 0 16px" }}>
                Complete payment for Order <b>#{o.order_number}</b> via Razorpay to instantly queue your files for laser printing.
              </p>

              <button
                type="button"
                onClick={handleRazorpayPayNow}
                disabled={razorpayLoading || loading}
                className="btn btn-lg"
                style={{
                  background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                  color: "white",
                  padding: "16px 28px",
                  fontSize: 16,
                  fontWeight: 900,
                  width: "100%",
                  justifyContent: "center",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 8px 24px rgba(79, 70, 229, 0.35)",
                  cursor: "pointer"
                }}
              >
                <CreditCard size={20} />
                <span>{razorpayLoading ? "Opening Razorpay..." : `⚡ Pay ₹${o.total}.00 via Razorpay (UPI / Cards)`}</span>
              </button>

              {msg && (
                <div className={msg.includes("Error") || msg.includes("Fraud") ? "error" : "success"} style={{ marginTop: 14 }}>
                  <span>{msg}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Crazy Live Animated Timeline */}
        <div className="no-print" style={{ marginTop: 24 }}>
          <CrazyLiveTimeline order={o} />
        </div>

        {/* 🌟 5-STAR CUSTOMER RATING & REVIEW CARD (When Delivered) */}
        {o.status === "DELIVERED" && (
          <div 
            className="card no-print" 
            style={{ 
              marginTop: 24, 
              border: "1.5px solid #86efac", 
              background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
              padding: "24px 28px",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 10px 25px rgba(16, 185, 129, 0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Star size={22} color="#eab308" fill="#eab308" />
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#166534", margin: 0 }}>
                    How was your Print Quality &amp; Experience?
                  </h3>
                </div>
                <p style={{ fontSize: 13.5, color: "#15803d", margin: "4px 0 0" }}>
                  Your feedback helps Dhruvang Crazy Printing Center maintain crisp, high-speed laser printing standards.
                </p>
              </div>

              {/* 5 Interactive Stars */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      const updated = { ...ratings, [o.id]: { stars: star, ratedAt: new Date().toISOString() } };
                      setRatings(updated);
                      try { localStorage.setItem("cpc_customer_ratings", JSON.stringify(updated)); } catch (e) {}
                      playChime("success");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      transform: (ratings[o.id]?.stars || 5) >= star ? "scale(1.2)" : "scale(1)",
                      transition: "transform 0.15s ease"
                    }}
                    title={`Rate ${star} Star${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      size={28}
                      color="#eab308"
                      fill={(ratings[o.id]?.stars || 5) >= star ? "#eab308" : "none"}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Feedback Tags */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {[
                "⚡ Super Fast Printing",
                "📄 Crisp High-GSM Paper",
                "🎨 Vibrant Accurate Colors",
                "🛵 Fast Boisar Delivery",
                "🤝 Friendly Staff Service",
                "💰 Best Affordable Pricing"
              ].map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: "white",
                    border: "1px solid #a7f3d0",
                    color: "#166534",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 999
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 10, borderTop: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>
                {ratings[o.id] ? `✅ You rated this order ${ratings[o.id].stars} / 5 Stars! Thank you for choosing us.` : "⭐ Click any star above to rate!"}
              </div>

              <a
                href="https://g.page/r/dhruvang-printing/review"
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm"
                style={{ background: "#16a34a", color: "white", fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Star size={13} fill="white" />
                <span>Share Review on Google ⭐</span>
              </a>
            </div>
          </div>
        )}
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

      {/* Customer Issue, Defective Print & Refund/Replacement Modal */}
      {showIssueModal && (
        <div className="modal-backdrop" onClick={() => setShowIssueModal(false)}>
          <div className="modal-content" style={{ maxWidth: 560, padding: "24px 24px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a" }}>Report Issue / Request Refund</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Order #{o?.order_number} • Total ₹{o?.total}.00</p>
                </div>
              </div>

              <button
                onClick={() => setShowIssueModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {issueSubmitted ? (
              <div style={{ textAlign: "center", padding: "24px 10px" }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#ecfdf5", color: "#10b981", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
                  <CheckCircle2 size={30} />
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: "#065f46", margin: "0 0 6px" }}>
                  Issue Ticket Logged &amp; Escalated!
                </h4>
                <p style={{ fontSize: 13, color: "#047857", margin: 0 }}>
                  Opening WhatsApp support with our store manager to resolve your refund or replacement immediately.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReportIssue}>
                {/* 1. Category of Defect / Problem */}
                <div className="field" style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 800, color: "#334155", marginBottom: 6, display: "block" }}>
                    What issue occurred with your print job? <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { key: "MISPRINT", label: "🖨️ Quality / Misprint" },
                      { key: "MISSING_PAGES", label: "📄 Wrong / Missing Pages" },
                      { key: "BINDING_SIZE", label: "📏 Paper / Binding Issue" },
                      { key: "DAMAGE", label: "📦 Damaged in Delivery" },
                      { key: "PAYMENT_ISSUE", label: "💳 Double UPI Charge" },
                      { key: "OTHER", label: "❓ Other Issue" },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => setIssueType(item.key)}
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: issueType === item.key ? "2px solid var(--primary)" : "1px solid var(--border)",
                          background: issueType === item.key ? "#eef2ff" : "#ffffff",
                          color: issueType === item.key ? "var(--primary)" : "var(--text-main)",
                          fontSize: 12.5,
                          fontWeight: issueType === item.key ? 800 : 500,
                          cursor: "pointer"
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Choose Resolution */}
                <div className="field" style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 800, color: "#334155", marginBottom: 6, display: "block" }}>
                    How would you like us to resolve this? <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <label style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: issueResolution === "REPLACEMENT" ? "2px solid #10b981" : "1px solid var(--border)",
                      background: issueResolution === "REPLACEMENT" ? "#ecfdf5" : "#ffffff",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: issueResolution === "REPLACEMENT" ? 800 : 500,
                      color: issueResolution === "REPLACEMENT" ? "#065f46" : "var(--text-main)"
                    }}>
                      <input
                        type="radio"
                        name="resolution"
                        value="REPLACEMENT"
                        checked={issueResolution === "REPLACEMENT"}
                        onChange={() => setIssueResolution("REPLACEMENT")}
                        style={{ accentColor: "#10b981" }}
                      />
                      <span>🔁 Free Reprint &amp; Replacement</span>
                    </label>

                    <label style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: issueResolution === "REFUND" ? "2px solid #0284c7" : "1px solid var(--border)",
                      background: issueResolution === "REFUND" ? "#f0f9ff" : "#ffffff",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: issueResolution === "REFUND" ? 800 : 500,
                      color: issueResolution === "REFUND" ? "#0369a1" : "var(--text-main)"
                    }}>
                      <input
                        type="radio"
                        name="resolution"
                        value="REFUND"
                        checked={issueResolution === "REFUND"}
                        onChange={() => setIssueResolution("REFUND")}
                        style={{ accentColor: "#0284c7" }}
                      />
                      <span>💰 Instant UPI Refund</span>
                    </label>
                  </div>
                </div>

                {/* 3. Description Notes */}
                <div className="field" style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4, display: "block" }}>
                    Please explain the defect or issue: <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe what was wrong with the print or delivery..."
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                    required
                    style={{ fontSize: 13, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                  />
                </div>

                {/* 4. Action Buttons */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    disabled={issueSubmitting}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={issueSubmitting || !issueDesc.trim()}
                    className="btn btn-sm"
                    style={{ background: "#d97706", color: "white", fontWeight: 800 }}
                  >
                    {issueSubmitting ? "Submitting Ticket..." : "Submit Ticket & Contact Store 📲"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}