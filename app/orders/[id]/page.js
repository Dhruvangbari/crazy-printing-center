"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
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
  AlertCircle
} from "lucide-react";

export default function Detail() {
  const p = useParams();
  const router = useRouter();
  const [o, setO] = useState(null);
  const [proof, setProof] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      const s = supabase();
      const { data } = await s
        .from("orders")
        .select("*, order_files(*), status_history(*)")
        .eq("id", p.id)
        .single();
      setO(data);
    }
    if (p.id) loadOrder();
  }, [p.id]);

  async function handlePaymentProof(e) {
    e.preventDefault();
    if (!proof) return;
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

      const { error } = await s
        .from("orders")
        .update({
          payment_proof_path: path,
          status: "PAYMENT_SUBMITTED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id);

      if (error) {
        setMsg("Error updating order: " + error.message);
        setLoading(false);
        return;
      }

      // Add to status history
      await s.from("status_history").insert({
        order_id: p.id,
        status: "PAYMENT_SUBMITTED",
        message: "Payment screenshot submitted by customer. Awaiting shop verification.",
      });

      setMsg("Payment screenshot uploaded! Host is verifying your payment.");
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      setMsg(err.message || "Failed to submit screenshot");
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
  const upiPayUrl = `upi://pay?pa=${shopUpi}&pn=CrazyPrintingCenter&am=${o.total}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    upiPayUrl
  )}`;

  return (
    <main className="wrap">
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <Link href="/orders" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            <ArrowLeft size={16} />
            <span>Back to My Orders</span>
          </Link>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800 }}>{o.order_number}</h1>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                Placed on {new Date(o.created_at).toLocaleString()}
              </div>
            </div>

            <span className={`status-badge status-${o.status}`} style={{ fontSize: 14, padding: "6px 16px" }}>
              {o.status?.replaceAll("_", " ")}
            </span>
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
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--primary)" }}>
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
                <b>{o.color_mode === "COLOR" ? "Full Colour" : "Black & White"}</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Sides:</span>
                <b>{o.sides === "DOUBLE" ? "Double Sided" : "Single Sided"}</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Paper Quality:</span>
                <b>{o.paper_type}</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Copies:</span>
                <b>{o.copies}</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Delivery Mode:</span>
                <b>{o.delivery_mode}</b>
              </div>

              {o.address && (
                <div style={{ marginTop: 6, background: "#f8fafc", padding: 8, borderRadius: 6, fontSize: 12 }}>
                  <b>Address:</b> {o.address}
                </div>
              )}

              {o.notes && (
                <div style={{ marginTop: 2, background: "#f8fafc", padding: 8, borderRadius: 6, fontSize: 12 }}>
                  <b>Notes:</b> {o.notes}
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
                    className="btn btn-secondary btn-sm"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* UPI Payment Box (if not yet verified) */}
        {!isPaid && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2 className="card-title">
                <CreditCard size={20} color="var(--primary)" />
                <span>UPI Payment & Proof Submission</span>
              </h2>
              <span className="status-badge status-PAYMENT_SUBMITTED">Amount: ₹{o.total}</span>
            </div>

            <div className="row" style={{ alignItems: "center" }}>
              {/* QR Code */}
              <div style={{ textAlign: "center", padding: 16, background: "#f8fafc", borderRadius: "var(--radius-md)" }}>
                <img
                  src={qrCodeUrl}
                  alt="UPI QR Code"
                  style={{ width: 160, height: 160, borderRadius: 8, margin: "0 auto 10px", display: "block" }}
                />
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", marginBottom: 6 }}>
                  Scan with Google Pay, PhonePe, Paytm, or BHIM
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
              </div>

              {/* Upload Screenshot Form */}
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                  Upload Payment Screenshot
                </h4>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                  After completing your UPI payment of <b>₹{o.total}</b>, upload the transaction receipt screenshot below to start printing immediately.
                </p>

                <form onSubmit={handlePaymentProof}>
                  <div className="field">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProof(e.target.files[0])}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !proof}
                    className="btn"
                    style={{ width: "100%" }}
                  >
                    <UploadCloud size={16} />
                    <span>{loading ? "Uploading Screenshot..." : "Submit Payment Receipt"}</span>
                  </button>
                </form>

                {msg && (
                  <p className={msg.includes("Error") ? "error" : "success"} style={{ marginTop: 12 }}>
                    {msg}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Timeline History */}
        <div className="card">
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
                    {new Date(h.created_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {h.message && <div className="timeline-msg">{h.message}</div>}
                </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}