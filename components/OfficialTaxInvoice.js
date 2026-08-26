"use client";
import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  MapPin,
  Loader2,
  ScanLine
} from "lucide-react";
import FormattedDate from "./FormattedDate";
import { buildWhatsAppLink, buildOrderStatusMessage } from "../lib/whatsapp";
import { LOGO_BASE64 } from "../lib/logoBase64";

export default function OfficialTaxInvoice({ order, proofUrl, isPublicView = false }) {
  const [qrSvg, setQrSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const invoiceRef = useRef(null);

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
        width: 320,
        margin: 1,
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

  const [sharingPdf, setSharingPdf] = useState(false);

  // Generates a pixel-perfect, identical standard A4 Commercial Tax Invoice PDF for both Mobile & Desktop
  async function generateInvoicePdfDoc() {
    if (!invoiceRef.current) return null;
    const element = invoiceRef.current;

    // Create an isolated fixed-width A4 sandbox (794px = 210mm at 96 DPI) so mobile & desktop render identically
    const clone = element.cloneNode(true);
    clone.style.width = "794px";
    clone.style.minWidth = "794px";
    clone.style.maxWidth = "794px";
    clone.style.boxSizing = "border-box";
    clone.style.padding = "36px 40px";
    clone.style.position = "fixed";
    clone.style.top = "-99999px";
    clone.style.left = "-99999px";
    clone.style.zIndex = "-99999";
    clone.style.background = "#ffffff";
    clone.style.color = "#0f172a";
    clone.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    document.body.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2.5, // High-DPI 300 DPI equivalent
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], `${invoiceNumber}.pdf`, { type: "application/pdf" });

      return { pdf, pdfBlob, pdfFile };
    } finally {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    }
  }

  // 1-Click Download High-Resolution PDF Invoice
  async function handleDownloadPdf() {
    setGeneratingPdf(true);
    try {
      const res = await generateInvoicePdfDoc();
      if (res?.pdf) {
        res.pdf.save(`${invoiceNumber}.pdf`);
      }
    } catch (err) {
      console.error("PDF Generation Error:", err);
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  }

  // Send Actual PDF File to WhatsApp (Via Web Share API on Mobile/Desktop or Auto-Download + WhatsApp Web on PC)
  async function handleSendPdfToWhatsApp() {
    setSharingPdf(true);
    try {
      const res = await generateInvoicePdfDoc();
      if (!res) throw new Error("Could not create PDF");

      const { pdf, pdfFile } = res;

      // 1. Mobile & Modern Browsers: Native Share with PDF File directly into WhatsApp
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Tax Invoice - ${invoiceNumber}`,
          text: `🧾 Official PDF Tax Invoice for Order #${order.order_number} from Dhruvang Crazy Printing Center.\n📍 Verify & Track: ${verifyUrl}`,
        });
        setSharingPdf(false);
        return;
      }

      // 2. Desktop Fallback: Download the PDF immediately and open WhatsApp Web with reference
      pdf.save(`${invoiceNumber}.pdf`);
      const phone = order.customer_phone || "";
      const msg = `🧾 *OFFICIAL TAX INVOICE — DHRUVANG CRAZY PRINTING CENTER*\n\n📄 *Bill No:* ${invoiceNumber}\n👤 *Customer:* ${order.customer_name || "Customer"}\n💰 *Total Paid:* Rs.${order.total}.00 (PAID ✅)\n\n📥 *PDF Document Downloaded.* You can attach the downloaded PDF file or view live online here:\n📍 *Live Verification Portal:* ${verifyUrl}\n\nThank you for choosing Dhruvang Crazy Printing Center!`;
      
      const clean = phone.replace(/[^0-9]/g, "");
      const formatted = clean.startsWith("91") ? clean : clean.length === 10 ? `91${clean}` : clean;
      const waUrl = formatted ? `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");

      alert("📥 PDF Bill has been downloaded! You can attach the PDF document into your WhatsApp chat.");
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("WhatsApp PDF Share Error:", err);
        const shareMsg = buildOrderStatusMessage(order, "BILL");
        const waUrl = buildWhatsAppLink(order.customer_phone, shareMsg);
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setSharingPdf(false);
    }
  }

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

  return (
    <div className="tax-invoice-container" style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", maxWidth: 820, margin: "0 auto", boxShadow: "0 12px 30px rgba(0,0,0,0.08)" }}>
      {/* Top Verification Ribbon */}
      <div style={{ background: isPaid ? "linear-gradient(135deg, #059669, #10b981)" : "linear-gradient(135deg, #d97706, #f59e0b)", color: "white", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 800 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={18} />
          <span>{isPaid ? "OFFICIAL VERIFIED TAX INVOICE & RECEIPT" : "TAX INVOICE — PAYMENT CONFIRMATION PENDING"}</span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.95, fontFamily: "monospace", letterSpacing: 0.5 }}>
          HASH: {order.id?.slice(0, 14).toUpperCase()}
        </div>
      </div>

      {/* Action Toolbar (Hidden during Print) */}
      <div className="no-print" style={{ background: "#f8fafc", padding: "12px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
          <ScanLine size={16} color="#4f46e5" />
          <span>Scan the QR code with phone camera to verify invoice authenticity</span>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button 
            type="button" 
            onClick={handleCopyVerifyLink} 
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 12, padding: "7px 12px" }}
          >
            {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            <span>{copied ? "Copied Link!" : "Copy URL"}</span>
          </button>

          {/* Send PDF to WhatsApp Button */}
          <button 
            type="button" 
            onClick={handleSendPdfToWhatsApp} 
            disabled={sharingPdf || generatingPdf}
            className="btn btn-whatsapp btn-sm"
            style={{ fontSize: 12, padding: "7px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Attach & send the actual PDF document on WhatsApp"
          >
            {sharingPdf ? (
              <Loader2 size={13} className="spin-animation" />
            ) : (
              <MessageCircle size={14} />
            )}
            <span>{sharingPdf ? "Preparing PDF..." : "Send PDF to WhatsApp 📲"}</span>
          </button>

          {/* 1-Click PDF Download Button */}
          <button 
            type="button" 
            onClick={handleDownloadPdf} 
            disabled={generatingPdf || sharingPdf}
            className="btn btn-sm"
            style={{ fontSize: 12, padding: "7px 14px", background: "#4f46e5", color: "white", display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Download standard A4 PDF Document directly"
          >
            {generatingPdf ? (
              <Loader2 size={13} className="spin-animation" />
            ) : (
              <Download size={13} />
            )}
            <span>{generatingPdf ? "Creating PDF..." : "Download PDF Bill"}</span>
          </button>

          <button 
            type="button" 
            onClick={handlePrint} 
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 12, padding: "7px 12px" }}
          >
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Sheet (Captured by html2canvas for PDF) */}
      <div ref={invoiceRef} style={{ padding: "36px 40px", background: "#ffffff", color: "#0f172a" }}>
        {/* Header Grid: Brand Info + Live Scannable Authenticity QR Scanner */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 24, paddingBottom: 24, borderBottom: "2px solid #0f172a" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
              <img
                src={LOGO_BASE64 || "/logo.png"}
                alt="Dhruvang Crazy Printing Logo"
                style={{ width: 62, height: 62, borderRadius: "50%", objectFit: "contain", border: "2px solid #0f172a", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              />
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: "#0f172a", letterSpacing: -0.5 }}>
                  DHRUVANG CRAZY PRINTING CENTER
                </h1>
                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
                  High-Speed Commercial Digital Printing & Documentation Services
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, marginTop: 8 }}>
              <div>📍 <b>Center:</b> Main Campus Avenue, Opp. Tech Park, Vercel Central</div>
              <div>📞 <b>Helpline:</b> <a href="tel:8857871669" style={{ color: "#4f46e5", textDecoration: "none", fontWeight: 700 }}>+91 8857871669</a> • ✉️ <b>Email:</b> dhruvangbari2006@gmail.com</div>
              <div>🏷️ <b>GST SAC Code:</b> 9989 (Reprographic & Digital Document Printing)</div>
              <div>🌐 <b>Verification Portal:</b> {origin || "https://crazy-printing-center.vercel.app"}</div>
            </div>
          </div>

          {/* Official Verification QR Code Scanner Box */}
          <div style={{ textAlign: "center", background: "#f8fafc", padding: "10px 12px", borderRadius: 12, border: "2px solid #0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {qrSvg ? (
              <img 
                src={qrSvg} 
                alt="Verification QR Scanner" 
                style={{ width: 110, height: 110, display: "block", margin: "0 auto 4px", borderRadius: 4 }} 
              />
            ) : (
              <div style={{ width: 110, height: 110, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                Generating QR...
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5 }}>
              SCAN TO VERIFY
            </div>
            <div style={{ fontSize: 9, color: "#64748b", marginTop: 2, fontWeight: 600 }}>
              Phone Camera / Google Lens
            </div>
          </div>
        </div>

        {/* Invoice Meta & Billed To Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "20px 0", borderBottom: "1px solid #e2e8f0", fontSize: 13 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              OFFICIAL INVOICE DETAILS
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>{invoiceNumber}</div>
            <div style={{ color: "#475569", marginTop: 4 }}>
              <b>Order Number:</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{order.order_number}</span>
            </div>
            <div style={{ color: "#475569", marginTop: 2 }}>
              <b>Invoice Date:</b> <FormattedDate date={order.created_at} />
            </div>
            <div style={{ color: "#475569", marginTop: 2 }}>
              <b>Fulfillment:</b> {order.delivery_mode === "DELIVERY" ? "🚚 Doorstep Courier Delivery" : "🏪 Store Counter Pickup"}
            </div>
            {order.priority === "EXPRESS" && (
              <div style={{ display: "inline-block", background: "#fef3c7", color: "#b45309", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, marginTop: 4 }}>
                ⚡ EXPRESS PRIORITY RUSH QUEUE
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              BILLED TO (RECIPIENT)
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
              {order.customer_name || order.profiles?.name || "Valued Customer"}
            </div>
            <div style={{ color: "#475569", marginTop: 4 }}>
              📞 <b>WhatsApp / Phone:</b> {order.customer_phone || order.profiles?.phone || "N/A"}
            </div>
            <div style={{ color: "#475569", marginTop: 2 }}>
              📍 <b>Delivery Address:</b> {order.address || "Store Counter Pickup"}
            </div>
          </div>
        </div>

        {/* Itemized Specification Table */}
        <div style={{ margin: "24px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderTop: "1px solid #e2e8f0", borderBottom: "2px solid #cbd5e1" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, color: "#334155" }}>#</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, color: "#334155" }}>Item Description & Technical Specs</th>
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

              {order.delivery_mode === "DELIVERY" && (
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#64748b" }}>
                    {order.priority === "EXPRESS" ? 4 : 3}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700, color: "#0369a1" }}>🚚 Doorstep Delivery (Boisar, PIN 401501)</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Direct delivery to customer destination</div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>₹30.00</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>1 trip</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>₹30.00</td>
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
                  <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                    {f.original_name}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    ({f.size ? (f.size / 1024 / 1024).toFixed(2) + " MB" : "Document"})
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
              <div><b>Payment Mode:</b> UPI Instant Transfer</div>
              <div style={{ marginTop: 2 }}>
                <b>12-Digit UTR:</b> <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#059669" }}>{order.upi_utr || "Verified by Cashier"}</span>
              </div>
              <div style={{ marginTop: 2 }}>
                <b>Status:</b> <span style={{ fontWeight: 800, color: isPaid ? "#059669" : "#d97706" }}>{isPaid ? "PAID IN FULL ✅" : "PENDING SUBMISSION"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grand Total Calculation Block */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f1f5f9", padding: "18px 24px", borderRadius: 12, border: "2px solid #e2e8f0" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
              PAYMENT SETTLEMENT STATUS
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <CheckCircle2 size={18} color={isPaid ? "#059669" : "#d97706"} />
              <span style={{ fontWeight: 900, fontSize: 15, color: isPaid ? "#059669" : "#d97706" }}>
                {isPaid ? "PAID IN FULL (ZERO BALANCE)" : "PAYMENT DUE"}
              </span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>GRAND TOTAL (INR)</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#4f46e5", letterSpacing: -0.5 }}>
              ₹{order.total}.00
            </div>
          </div>
        </div>

        {/* Official Barcode Simulation & Digital Authenticity Stamp */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, padding: "14px 20px", background: "#fafafa", borderRadius: 10, border: "1px dashed #cbd5e1" }}>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: 16, letterSpacing: 3, fontWeight: 900, color: "#334155" }}>
              ||| | |||| || | |||| |||| ||| |||| |
            </div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b", marginTop: 2 }}>
              {invoiceNumber} • SAC-9989
            </div>
          </div>

          <div style={{ textAlign: "right", fontSize: 11, color: "#64748b" }}>
            <div style={{ fontWeight: 800, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
              <ShieldCheck size={14} />
              <span>AUTHENTIC DIGITAL TAX INVOICE</span>
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              Verify at: {origin || "https://crazy-printing-center.vercel.app"}/verify/{order.id?.slice(0, 8)}
            </div>
          </div>
        </div>

        {/* Official Footer */}
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#94a3b8" }}>
          <div style={{ fontWeight: 700, color: "#64748b" }}>
            © 2026 Dhruvang Crazy Printing Center. All rights reserved. • Computer Generated Official Tax Invoice
          </div>
          <div style={{ marginTop: 2 }}>
            Founder & Owner: <b>Dhruvang Bari</b> • Official Scannable Authenticity Record
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .tax-invoice-container {
            border-radius: 12px;
          }
          .tax-invoice-toolbar {
            flex-direction: column;
            align-items: stretch !important;
          }
          .tax-invoice-toolbar .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
