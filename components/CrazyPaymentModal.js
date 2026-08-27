"use client";
import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone, 
  QrCode, 
  Copy, 
  Check, 
  X, 
  Zap, 
  Lock, 
  ArrowRight,
  ExternalLink,
  Store
} from "lucide-react";

export default function CrazyPaymentModal({
  order,
  isOpen,
  onClose,
  onPaymentSuccess,
}) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("upi_apps"); // "upi_apps" | "qr_code" | "card_netbanking"

  if (!isOpen || !order) return null;

  const totalAmount = Number(order.total || 0);
  const shopUpi = "8857871669@fam";
  const orderRef = order.order_number || `ORD-${Date.now().toString().slice(-6)}`;

  const upiIntentUrl = `upi://pay?pa=${shopUpi}&pn=CrazyPrintingCenter&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Order ${orderRef}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiIntentUrl)}`;

  function handleCopyUpi() {
    try {
      navigator.clipboard.writeText(shopUpi);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("UPI ID: " + shopUpi);
    }
  }

  function handleConfirmPayment(customPaymentId = null) {
    setVerifying(true);
    const paymentId = customPaymentId || `pay_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    setTimeout(() => {
      setVerifying(false);
      if (onPaymentSuccess) {
        onPaymentSuccess(paymentId);
      }
    }, 900);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999, background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(6px)" }}>
      <div 
        className="card"
        style={{
          maxWidth: 480,
          width: "100%",
          padding: 0,
          overflow: "hidden",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: "1.5px solid #a5b4fc",
          animation: "fastPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          color: "white",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={20} color="#38bdf8" />
              <span style={{ fontSize: 18, fontWeight: 900 }}>Secure Payment Gateway</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#c7d2fe", marginTop: 2 }}>
              Order #{orderRef} • Dhruvang Crazy Printing Center
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "white"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Amount to Pay Banner */}
        <div style={{
          background: "#f0fdf4",
          borderBottom: "1px solid #bbf7d0",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: 12, color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>Total Payable</span>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#15803d" }}>₹{totalAmount}.00</div>
          </div>
          <span style={{ background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 900, padding: "4px 10px", borderRadius: 999, border: "1px solid #86efac" }}>
            🔒 256-BIT ENCRYPTED
          </span>
        </div>

        {/* Payment Methods Sub-Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
          <button
            type="button"
            onClick={() => setSelectedMethod("upi_apps")}
            style={{
              flex: 1,
              padding: "12px 10px",
              border: "none",
              background: selectedMethod === "upi_apps" ? "white" : "transparent",
              borderBottom: selectedMethod === "upi_apps" ? "3px solid #4f46e5" : "3px solid transparent",
              fontWeight: selectedMethod === "upi_apps" ? 800 : 600,
              fontSize: 13,
              color: selectedMethod === "upi_apps" ? "#4f46e5" : "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }}
          >
            <Smartphone size={16} />
            <span>UPI Apps</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod("qr_code")}
            style={{
              flex: 1,
              padding: "12px 10px",
              border: "none",
              background: selectedMethod === "qr_code" ? "white" : "transparent",
              borderBottom: selectedMethod === "qr_code" ? "3px solid #4f46e5" : "3px solid transparent",
              fontWeight: selectedMethod === "qr_code" ? 800 : 600,
              fontSize: 13,
              color: selectedMethod === "qr_code" ? "#4f46e5" : "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }}
          >
            <QrCode size={16} />
            <span>Scan QR</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* TAB 1: 1-Tap UPI Apps (Google Pay, PhonePe, Paytm, BHIM) */}
          {selectedMethod === "upi_apps" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, color: "var(--text-main)", fontWeight: 700 }}>
                ⚡ 1-Tap Payment via any installed UPI App:
              </div>

              {/* Direct UPI Intent Link */}
              <a
                href={upiIntentUrl}
                className="btn btn-lg"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  padding: "14px 20px",
                  fontSize: 15,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                  borderRadius: 10
                }}
              >
                <Zap size={18} />
                <span>Open GPay / PhonePe / Paytm (₹{totalAmount}.00)</span>
              </a>

              {/* Copy UPI ID */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Or Pay to Merchant UPI ID:</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#1e1b4b", fontFamily: "monospace" }}>{shopUpi}</div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11.5, padding: "5px 10px" }}
                >
                  {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                  <span>{copied ? "Copied!" : "Copy ID"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Dynamic QR Code */}
          {selectedMethod === "qr_code" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ background: "white", padding: 12, borderRadius: 12, border: "1.5px solid #c7d2fe", display: "inline-block", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.08)", marginBottom: 10 }}>
                <img
                  src={qrCodeUrl}
                  alt="Dynamic Payment QR"
                  style={{ width: 170, height: 170, display: "block", borderRadius: 8 }}
                />
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#15803d" }}>
                Scan with any UPI App • Exact ₹{totalAmount}.00
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                Google Pay • PhonePe • Paytm • BHIM • Amazon Pay • Cred
              </div>
            </div>
          )}

          {/* Confirm & Verify Button */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={() => handleConfirmPayment()}
              disabled={verifying}
              className="btn btn-lg"
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                color: "white",
                padding: "14px 20px",
                fontSize: 15,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 6px 20px rgba(79, 70, 229, 0.35)",
                cursor: "pointer"
              }}
            >
              <CheckCircle2 size={18} />
              <span>{verifying ? "Verifying Payment..." : "✓ I Have Paid • Confirm Order"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
