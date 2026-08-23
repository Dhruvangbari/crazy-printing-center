"use client";
import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { 
  Printer, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Copy, 
  Check, 
  QrCode, 
  Share2, 
  MessageCircle,
  ExternalLink,
  Lock,
  Building2,
  Calendar,
  User,
  Phone,
  MapPin
} from "lucide-react";
import FormattedDate from "./FormattedDate";
import { buildWhatsAppLink, buildOrderStatusMessage } from "../lib/whatsapp";

export default function OfficialTaxInvoice({ order, proofUrl, isPublicView = false }) {
  const [qrSvg, setQrSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const verifyUrl = origin 
    ? `${origin}/verify/${order?.id}` 
    : `https://crazy-printing-center.vercel.app/verify/${order?.id}`;

  useEffect(() => {
    if (order?.id && verifyUrl) {
      QRCode.toDataURL(verifyUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      }).then((url) => {
        setQrSvg(url);
      }).catch((err) => console.error("QR Code Error:", err));
    }
  }, [order?.id, verifyUrl]);

  if (!order) return null;

  const isPaid = [
    "PAYMENT_VERIFIED",
    "PRINTING",
    "QUALITY_CHECK",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ].includes(order.status);

  const ratePerPage = order.color_mode === "COLOR" ? 5 : 3;
  const totalPages = (order.page_count || 1) * (order.copies || 1);
  const invoiceNumber = `BILL-${order.order_number || "CPC"}`;

  function handlePrint() {
    window.print();
  }

  function handleCopyVerifyLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  const shareMsg = buildOrderStatusMessage(order, "BILL");
  const whatsAppUrl = buildWhatsAppLink(null, shareMsg);

  return (
    <div className="tax-invoice-container" style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", maxWidth: 780, margin: "0 auto", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
      {/* Top Verification Ribbon */}
      <div style={{ background: isPaid ? "linear-gradient(135deg, #059669, #10b981)" : "linear-gradient(135deg, #d97706, #f59e0b)", color: "white", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={18} />
          <span>{isPaid ? "OFFICIALLY VERIFIED & PAID INVOICE" : "TAX INVOICE — PAYMENT PENDING"}</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.95, fontFamily: "monospace" }}>
          AUTH HASH: {order.id?.slice(0, 12).toUpperCase()}
        </div>
      </div>

      {/* Action Toolbar (Hidden during Print) */}
      <div className="no-print" style={{ background: "#f8fafc", padding: "12px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b" }}>
          <QrCode size={16} color="#4f46e5" />
          <span>Scan QR on any mobile phone camera to verify details online</span>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button 
            type="button" 
            onClick={handleCopyVerifyLink} 
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 12, padding: "5px 12px" }}
          >
            {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            <span>{copied ? "Link Copied!" : "Copy Verification URL"}</span>
          </button>

          <a 
            href={whatsAppUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="btn btn-whatsapp btn-sm"
            style={{ fontSize: 12, padding: "5px 12px", textDecoration: "none" }}
          >
            <MessageCircle size={13} />
            <span>Share Bill</span>
          </a>

          <button 
            type="button" 
            onClick={handlePrint} 
            className="btn btn-sm"
            style={{ fontSize: 12, padding: "5px 14px", background: "#0f172a" }}
          >
            <Printer size={13} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Sheet */}
      <div style={{ padding: "32px 36px" }}>
        {/* Header Grid: Store Info + Live Scannable QR Code */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, paddingBottom: 24, borderBottom: "2px solid #0f172a" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18 }}>
                CP
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: "#0f172a", letterSpacing: -0.5 }}>
                  CRAZY PRINTING CENTER
                </h1>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                  High-Speed Digital Printing & Documentation Solutions
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, marginTop: 10 }}>
              <div>📍 Store: Main Campus Road, Opp. Tech Park, Vercel Hub</div>
              <div>📞 Support: +91 9876543210 • ✉️ dhruvangbari2006@gmail.com</div>
              <div>🌐 Digital Portal: {origin || "https://crazy-printing-center.vercel.app"}</div>
            </div>
          </div>

          {/* Official Verification QR Code Scanner Box */}
          <div style={{ textAlign: "center", background: "#f8fafc", padding: "12px 14px", borderRadius: 12, border: "2px dashed #cbd5e1", minWidth: 140 }}>
            {qrSvg ? (
              <img 
                src={qrSvg} 
                alt="Verification QR Code" 
                style={{ width: 110, height: 110, display: "block", margin: "0 auto 6px", borderRadius: 6 }} 
              />
            ) : (
              <div style={{ width: 110, height: 110, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                Generating QR...
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 800, color: "#4f46e5", textTransform: "uppercase", letterSpacing: 0.5 }}>
              SCAN TO VERIFY
            </div>
            <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
              Official Authenticity Scanner
            </div>
          </div>
        </div>

        {/* Invoice & Customer Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "20px 0", borderBottom: "1px solid #e2e8f0", fontSize: 13 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              INVOICE & ORDER DETAILS
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{invoiceNumber}</div>
            <div style={{ color: "#475569", marginTop: 4 }}>
              <b>Order Ref:</b> <span style={{ fontFamily: "monospace" }}>{order.order_number}</span>
            </div>
            <div style={{ color: "#475569", marginTop: 2 }}>
              <b>Date & Time:</b> <FormattedDate date={order.created_at} />
            </div>
            <div style={{ color: "#475569", marginTop: 2 }}>
              <b>Fulfillment:</b> {order.delivery_mode === "DELIVERY" ? "🚚 Doorstep Delivery" : "🏪 Store Counter Pickup"}
            </div>
            {order.priority === "EXPRESS" && (
              <div style={{ display: "inline-block", background: "#fef3c7", color: "#b45309", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, marginTop: 4 }}>
                ⚡ EXPRESS PRIORITY QUEUE
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              BILLED TO (CUSTOMER)
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
              {order.customer_name || order.profiles?.name || "Valued Customer"}
            </div>
            <div style={{ color: "#475569", marginTop: 4 }}>
              📞 <b>Phone:</b> {order.customer_phone || order.profiles?.phone || "N/A"}
            </div>
            <div style={{ color: "#475569", marginTop: 2 }}>
              📍 <b>Address:</b> {order.address || "Store Pickup (No shipping address required)"}
            </div>
          </div>
        </div>

        {/* Itemized Specification Table */}
        <div style={{ margin: "24px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderTop: "1px solid #e2e8f0", borderBottom: "2px solid #cbd5e1" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, color: "#334155" }}>#</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, color: "#334155" }}>Job Description & Specs</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, color: "#334155" }}>Rate</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, color: "#334155" }}>Pages × Copies</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#334155" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "14px 12px", verticalAlign: "top", fontWeight: 700, color: "#64748b" }}>1</td>
                <td style={{ padding: "14px 12px" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>
                    {order.paper_size || "A4"} Document Printing ({order.color_mode === "COLOR" ? "Full Colour (High Quality)" : "Black & White (Sharp Text)"})
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    • Print Mode: <b>{order.sides === "DOUBLE" ? "Double Sided (Duplex)" : "Single Sided (Front Only)"}</b>
                    <br />
                    • Paper Quality: <b>{order.paper_type || "75 GSM Premium"}</b>
                    {order.binding_type && order.binding_type !== "NONE" && (
                      <span> • Finishing: <b>{order.binding_type}</b></span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "14px 12px", textAlign: "center", fontWeight: 600 }}>
                  ₹{ratePerPage}.00 / pg
                </td>
                <td style={{ padding: "14px 12px", textAlign: "center" }}>
                  <div style={{ fontWeight: 700 }}>{order.page_count || 1} pgs × {order.copies || 1} {order.copies === 1 ? "copy" : "copies"}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>({totalPages} total pages)</div>
                </td>
                <td style={{ padding: "14px 12px", textAlign: "right", fontWeight: 800, fontSize: 14, color: "#0f172a" }}>
                  ₹{order.subtotal || (ratePerPage * totalPages)}.00
                </td>
              </tr>

              {order.binding_type && order.binding_type !== "NONE" && (
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#64748b" }}>2</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700 }}>Finishing & Binding ({order.binding_type})</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Professional thermal / spiral binding</div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>Included</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>{order.copies || 1}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>₹0.00</td>
                </tr>
              )}

              {order.priority === "EXPRESS" && (
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#64748b" }}>3</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700, color: "#b45309" }}>⚡ Express Priority Queue Rush Processing</div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>₹20.00</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>1</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>₹20.00</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Attached Files & Anti-Fraud Payment Proof Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "#f8fafc", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={14} color="#4f46e5" />
              <span>Attached Documents ({order.order_files?.length || 0})</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              {order.order_files?.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                  <span>📄</span>
                  <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                    {f.original_name}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    ({f.size ? (f.size / 1024 / 1024).toFixed(2) + " MB" : "PDF"})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={14} color="#059669" />
              <span>Payment Verification Record</span>
            </div>
            <div style={{ fontSize: 12, color: "#334155" }}>
              <div><b>Payment Mode:</b> UPI / Online</div>
              <div style={{ marginTop: 2 }}>
                <b>12-Digit UTR:</b> <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#059669" }}>{order.upi_utr || "Verified on Counter"}</span>
              </div>
              <div style={{ marginTop: 2 }}>
                <b>Status:</b> <span style={{ fontWeight: 800, color: isPaid ? "#059669" : "#d97706" }}>{isPaid ? "PAID & VERIFIED ✅" : "PENDING SUBMISSION"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grand Total Calculation Block */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f1f5f9", padding: "18px 24px", borderRadius: 12, border: "2px solid #e2e8f0" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
              PAYMENT SETTLEMENT
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <CheckCircle2 size={18} color={isPaid ? "#059669" : "#d97706"} />
              <span style={{ fontWeight: 900, fontSize: 15, color: isPaid ? "#059669" : "#d97706" }}>
                {isPaid ? "PAID IN FULL" : "PAYMENT DUE"}
              </span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>GRAND TOTAL (INR)</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#4f46e5", letterSpacing: -0.5 }}>
              ₹{order.total}.00
            </div>
          </div>
        </div>

        {/* Official Footer & Verification Stamp */}
        <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px dashed #cbd5e1", textAlign: "center", fontSize: 11, color: "#94a3b8" }}>
          <div style={{ fontWeight: 700, color: "#64748b" }}>
            © 2026 Crazy Printing Center. All rights reserved. • Computer Generated Official Tax Invoice
          </div>
          <div style={{ marginTop: 4 }}>
            Designed & Developed by <b>Dhruvang Bari</b> • Verified Digital Authenticity Seal
          </div>
          <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 10, color: "#cbd5e1" }}>
            VERIFY URL: {verifyUrl}
          </div>
        </div>
      </div>
    </div>
  );
}
