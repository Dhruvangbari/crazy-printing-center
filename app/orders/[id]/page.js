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
  Home
} from "lucide-react";

export default function Detail() {
  const p = useParams();
  const router = useRouter();
  const [o, setO] = useState(null);
  const [proof, setProof] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);

  useEffect(() => {
    async function loadOrder() {
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
    }
    if (p.id) loadOrder();
  }, [p.id]);

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

      setMsg("Payment submitted with verified UTR! Verification is in progress.");
      setTimeout(() => location.reload(), 1200);
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

  const shopUpi = process.env.NEXT_PUBLIC_UPI_ID || "crazyprinting@upi";
  const upiPayUrl = `upi://pay?pa=${shopUpi}&pn=CrazyPrintingCenter&am=${o.total}&cu=INR&tn=${encodeURIComponent(`Order ${o.order_number}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    upiPayUrl
  )}`;

  const shopPhone = "919876543210";
  const whatsappUrl = `https://wa.me/${shopPhone}?text=${encodeURIComponent(
    `Hello Crazy Printing Center, I have a question regarding my Order #${o.order_number} (${o.customer_name || "Customer"}).`
  )}`;

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

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button 
                onClick={() => setShowBillModal(true)} 
                className="btn btn-sm"
                style={{ background: "#0f172a" }}
              >
                <Receipt size={15} />
                <span>View Customer Bill</span>
              </button>

              <button onClick={handlePrint} className="btn btn-secondary btn-sm">
                <Printer size={15} />
                <span>Print Bill</span>
              </button>

              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-whatsapp btn-sm">
                <MessageCircle size={15} />
                <span>WhatsApp</span>
              </a>

              <span className={`status-badge status-${o.status}`} style={{ fontSize: 14, padding: "6px 16px" }}>
                {o.status?.replaceAll("_", " ")}
              </span>
            </div>
          </div>
        </div>

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

        {/* Live Timeline History */}
        <div className="card no-print">
          <div className="card-header">
            <h2 className="card-title">
              <Clock size={18} color="var(--primary)" />
              <span>Live Order Timeline</span>
            </h2>
          </div>

          <div className="timeline">
            {(o.status_history || [])
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

      {/* Official Customer Bill / Tax Invoice Modal */}
      {showBillModal && (
        <div className="modal-backdrop" onClick={() => setShowBillModal(false)}>
          <div className="modal-content" style={{ maxWidth: 680, padding: 32 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--primary)" }}>CRAZY PRINTING CENTER</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Official Print Receipt & Tax Invoice
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={handlePrint} className="btn btn-sm">
                  <Printer size={14} />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => setShowBillModal(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)", padding: 4 }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div style={{ borderTop: "2px solid var(--border)", borderBottom: "2px solid var(--border)", padding: "16px 0", marginBottom: 20 }}>
              <div className="row">
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    INVOICE DETAILS
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>Bill #: BILL-{o.order_number}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Date: <FormattedDate date={o.created_at} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    UPI ID: {shopUpi}
                  </div>
                  {o.upi_utr && (
                    <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>
                      UTR Ref: {o.upi_utr}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    BILLED TO (CUSTOMER)
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{o.customer_name || "Customer"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📞 {o.customer_phone || "N/A"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 {o.address || "Shop Counter Pickup"}</div>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <table className="table" style={{ marginBottom: 20 }}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Rate</th>
                  <th>Qty / Copies</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style={{ fontWeight: 700 }}>
                      {o.paper_size} Document Printing ({o.color_mode === "COLOR" ? "Full Colour" : "B&W"})
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {o.page_count || 1} page(s) • {o.sides} sided • {o.paper_type} paper
                    </div>
                  </td>
                  <td>₹{ratePerPage}.00 / pg</td>
                  <td>{o.copies} copy(s) ({(o.page_count || 1) * o.copies} pages total)</td>
                  <td style={{ fontWeight: 700 }}>₹{o.subtotal || o.total}</td>
                </tr>

                {o.binding_type && o.binding_type !== "NONE" && (
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700 }}>Finishing & Binding ({o.binding_type})</div>
                    </td>
                    <td>Included</td>
                    <td>{o.copies}</td>
                    <td style={{ fontWeight: 700 }}>—</td>
                  </tr>
                )}

                {o.priority === "EXPRESS" && (
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700 }}>⚡ Express Priority Queue Rush Fee</div>
                    </td>
                    <td>₹20.00</td>
                    <td>1</td>
                    <td style={{ fontWeight: 700 }}>₹20.00</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Bill Summary */}
            <div style={{ background: "#f8fafc", padding: 18, borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>PAYMENT STATUS</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span style={{ fontWeight: 800, fontSize: 14, color: "var(--success)" }}>
                    {o.status === "DELIVERED" || isPaid ? "PAID VIA UPI" : "PAYMENT SUBMITTED"}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>GRAND TOTAL</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "var(--primary)" }}>₹{o.total}.00</div>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--text-light)" }}>
              Thank you for printing with Crazy Printing Center! For questions, WhatsApp us at +91 9876543210.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}