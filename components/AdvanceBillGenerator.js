"use client";
import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import { 
  Receipt, 
  MessageCircle, 
  Printer, 
  Sparkles, 
  ArrowRight, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Plus, 
  Minus, 
  Check, 
  Copy,
  Zap,
  ShieldCheck,
  Building2,
  Calendar,
  Share2,
  Download,
  Loader2
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { buildWhatsAppLink, openWhatsAppChat } from "../lib/whatsapp";

const PAPER_SIZES = [
  { id: "A4", label: "A4 Standard", multiplier: 1 },
  { id: "A3", label: "A3 Poster / Drawing", multiplier: 1.8 },
  { id: "A5", label: "A5 Booklet", multiplier: 0.8 },
  { id: "Legal", label: "Legal (Official)", multiplier: 1.2 },
];

const BINDING_TYPES = [
  { id: "NONE", label: "No Binding (Loose Sheets)", price: 0 },
  { id: "STAPLE", label: "Corner Staple", price: 5 },
  { id: "SPIRAL", label: "Spiral Binding (Plastic Coil)", price: 30 },
  { id: "SOFT_COVER", label: "Soft Binding (Thermal Book)", price: 50 },
  { id: "HARD_BOUND", label: "Hard Bound (Golden Embossed)", price: 150 },
  { id: "LAMINATION", label: "Lamination (Glossy Waterproof)", price: 15 },
];

export default function AdvanceBillGenerator({ onConvertOrder }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("PICKUP");
  const [address, setAddress] = useState("");
  
  const [paperSize, setPaperSize] = useState("A4");
  const [colorMode, setColorMode] = useState("BW");
  const [sides, setSides] = useState("SINGLE");
  const [pageCount, setPageCount] = useState(10);
  const [copies, setCopies] = useState(1);
  const [paperType, setPaperType] = useState("75 GSM Standard Bond");
  const [bindingType, setBindingType] = useState("NONE");
  const [isExpress, setIsExpress] = useState(false);
  const [notes, setNotes] = useState("");

  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [advanceId, setAdvanceId] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const billSheetRef = React.useRef(null);

  useEffect(() => {
    setAdvanceId(`ADV-CPC-${Date.now().toString().slice(-6)}`);
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("cpc_saved_customer_data") || "{}");
        if (saved.name) setCustomerName(saved.name);
        if (saved.phone) setCustomerPhone(saved.phone);
        if (saved.address) setAddress(saved.address);
      } catch (e) {}
    }
  }, []);

  async function handleDownloadPdf() {
    if (!billSheetRef.current) return;
    setGeneratingPdf(true);
    try {
      const element = billSheetRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`${advanceId}-quotation.pdf`);
    } catch (err) {
      console.error("Advance PDF Error:", err);
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  }

  // Calculation formulas
  const baseRate = colorMode === "COLOR" ? 5 : 3;
  const sizeObj = PAPER_SIZES.find((s) => s.id === paperSize) || PAPER_SIZES[0];
  const sideMultiplier = sides === "DOUBLE" ? 0.9 : 1;
  const totalPages = Math.max(1, pageCount) * Math.max(1, copies);
  
  const printCost = Math.ceil(baseRate * sizeObj.multiplier * sideMultiplier * totalPages);
  const bindingObj = BINDING_TYPES.find((b) => b.id === bindingType) || BINDING_TYPES[0];
  const bindingCost = (bindingObj.price || 0) * Math.max(1, copies);
  const expressCost = isExpress ? 20 : 0;
  const grandTotal = printCost + bindingCost + expressCost;

  const shopUpi = "crazyprinting@upi";
  const upiPayUrl = `upi://pay?pa=${shopUpi}&pn=CrazyPrintingCenter&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(`Advance Bill ${advanceId}`)}`;

  useEffect(() => {
    if (upiPayUrl) {
      QRCode.toDataURL(upiPayUrl, { width: 220, margin: 2 })
        .then((url) => setQrCodeUrl(url))
        .catch(() => {});
    }
  }, [upiPayUrl]);

  function getAdvanceWhatsAppMessage() {
    const customer = customerName.trim() || "Customer";
    const phone = customerPhone.trim() || "N/A";
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const origin = typeof window !== "undefined" ? window.location.origin : "https://crazy-printing-center.vercel.app";

    return (
      `🧾 *CRAZY PRINTING CENTER - OFFICIAL ADVANCE BILL & ESTIMATE*\n` +
      `--------------------------------\n` +
      `📄 *Bill Quotation Ref:* ${advanceId}\n` +
      `👤 *Customer Name:* ${customer}\n` +
      `📞 *WhatsApp Number:* ${phone}\n` +
      `📅 *Date & Time:* ${timestamp}\n` +
      `--------------------------------\n` +
      `🖨️ *Print Specifications:*\n` +
      `• *Paper Size:* ${paperSize}\n` +
      `• *Colour Mode:* ${colorMode === "COLOR" ? "Full Colour (High Resolution)" : "Black & White (Sharp Laser)"}\n` +
      `• *Print Sides:* ${sides === "DOUBLE" ? "Double Sided (Duplex)" : "Single Sided"}\n` +
      `• *Paper Quality:* ${paperType}\n` +
      `• *Page Count:* ${pageCount} pages × ${copies} ${copies === 1 ? "copy" : "copies"} (${totalPages} total pages)\n` +
      (bindingType !== "NONE" ? `• *Finishing / Binding:* ${bindingObj.label}\n` : "") +
      (isExpress ? `• *Priority:* ⚡ Express Queue Rush Processing\n` : "") +
      `• *Fulfillment:* ${deliveryMode === "DELIVERY" ? `🚚 Doorstep Delivery (${address || "Address Provided"})` : "🏪 Store Counter Pickup"}\n` +
      `--------------------------------\n` +
      `💰 *ITEMIZED PRICING BREAKDOWN:*\n` +
      `• Document Printing (${totalPages} pgs): Rs.${printCost}.00\n` +
      (bindingCost > 0 ? `• Binding & Finishing (${copies} copies): Rs.${bindingCost}.00\n` : "") +
      (expressCost > 0 ? `• Express Priority Rush Fee: Rs.${expressCost}.00\n` : "") +
      `💳 *GRAND TOTAL PAYABLE:* Rs.${grandTotal}.00\n` +
      `--------------------------------\n` +
      `📲 *PAY ONLINE VIA UPI:* ${shopUpi}\n` +
      `📍 *Upload Your File & Confirm Job:* ${origin}/order\n\n` +
      `Thank you for choosing Crazy Printing Center!`
    );
  }

  function handleSendWhatsApp() {
    const clean = customerPhone.replace(/[^0-9]/g, "");
    if (!clean || clean.length < 10) {
      alert("Please enter a valid 10-digit customer WhatsApp phone number.");
      return;
    }
    const msg = getAdvanceWhatsAppMessage();
    openWhatsAppChat(customerPhone, msg);
  }

  function handlePrint() {
    window.print();
  }

  function handleCopySummary() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(getAdvanceWhatsAppMessage());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      {/* Advance Bill Top Banner */}
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "white", padding: "18px 24px", borderRadius: "16px 16px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Receipt size={22} color="#38bdf8" />
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Advance Proforma Bill & Quotation</h2>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
            Instant price calculation with 1-click WhatsApp dispatch and UPI advance settlement
          </p>
        </div>

        <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: 8 }}>
          Ref: <b>{advanceId}</b>
        </div>
      </div>

      {/* Main Advance Bill Body */}
      <div ref={billSheetRef} style={{ background: "white", padding: 28, borderRadius: "0 0 16px 16px", border: "1px solid var(--border)", borderTop: "none", boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
        {/* Section 1: Customer Details */}
        <div style={{ marginBottom: 24, padding: 18, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <User size={15} />
            <span>1. Customer & Delivery Contact</span>
          </div>

          <div className="row" style={{ marginBottom: 10 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Customer Name <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="text"
                placeholder="e.g. Dhruvang Bari"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ fontSize: 14 }}
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Customer WhatsApp Mobile <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ fontSize: 14 }}
              />
            </div>
          </div>

          <div className="row" style={{ marginTop: 12, marginBottom: 0 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Fulfillment Preference</label>
              <select value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value)}>
                <option value="PICKUP">🏪 Store Counter Pickup (Free)</option>
                <option value="DELIVERY">🚚 Doorstep Delivery (Local Courier)</option>
              </select>
            </div>

            {deliveryMode === "DELIVERY" && (
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Street Address / Campus</label>
                <input
                  type="text"
                  placeholder="e.g. Room 402, Hostel B"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Print Specifications */}
        <div style={{ marginBottom: 24, padding: 18, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={15} />
            <span>2. Document Specifications & Page Counts</span>
          </div>

          <div className="row" style={{ marginBottom: 12 }}>
            <div className="field">
              <label>Paper Size</label>
              <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
                {PAPER_SIZES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.multiplier}x rate)
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Colour Mode</label>
              <select value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
                <option value="BW">Black & White (₹3.00/pg)</option>
                <option value="COLOR">Full Colour (₹5.00/pg)</option>
              </select>
            </div>

            <div className="field">
              <label>Print Sides</label>
              <select value={sides} onChange={(e) => setSides(e.target.value)}>
                <option value="SINGLE">Single Sided</option>
                <option value="DOUBLE">Double Sided (Duplex, 10% Off)</option>
              </select>
            </div>
          </div>

          {/* Interactive Page Count and Copies Direct Editor */}
          <div className="row" style={{ alignItems: "center" }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Number of Document Pages</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setPageCount((p) => Math.max(1, p - 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ width: 34, height: 34, padding: 0 }}
                >
                  <Minus size={15} />
                </button>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={pageCount}
                  onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: 90, textAlign: "center", fontWeight: 800, fontSize: 16 }}
                />
                <button
                  type="button"
                  onClick={() => setPageCount((p) => p + 1)}
                  className="btn btn-secondary btn-sm"
                  style={{ width: 34, height: 34, padding: 0 }}
                >
                  <Plus size={15} />
                </button>
                <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 6 }}>Pages</span>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Number of Copies / Sets</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setCopies((c) => Math.max(1, c - 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ width: 34, height: 34, padding: 0 }}
                >
                  <Minus size={15} />
                </button>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: 90, textAlign: "center", fontWeight: 800, fontSize: 16 }}
                />
                <button
                  type="button"
                  onClick={() => setCopies((c) => c + 1)}
                  className="btn btn-secondary btn-sm"
                  style={{ width: 34, height: 34, padding: 0 }}
                >
                  <Plus size={15} />
                </button>
                <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 6 }}>Sets ({totalPages} Total Pages)</span>
              </div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 14, marginBottom: 0 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Finishing & Binding Option</label>
              <select value={bindingType} onChange={(e) => setBindingType(e.target.value)}>
                {BINDING_TYPES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} {b.price > 0 ? `(+₹${b.price})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Queue Priority</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isExpress}
                    onChange={(e) => setIsExpress(e.target.checked)}
                  />
                  <span>⚡ <b>Express Rush Queue (+₹20.00)</b></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Itemized Advance Quotation & UPI QR Code */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 20, background: "#f1f5f9", padding: 20, borderRadius: 14, border: "2px solid #e2e8f0", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>
              ITEMIZED ADVANCE BILL BREAKDOWN
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{paperSize} Printing ({colorMode === "COLOR" ? "Colour" : "B&W"} • {pageCount} pgs × {copies} sets):</span>
                <b>₹{printCost}.00</b>
              </div>

              {bindingCost > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Finishing & Binding ({bindingObj.label} × {copies}):</span>
                  <b>+₹{bindingCost}.00</b>
                </div>
              )}

              {expressCost > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#b45309" }}>
                  <span>⚡ Express Rush Queue Fee:</span>
                  <b>+₹{expressCost}.00</b>
                </div>
              )}

              <div style={{ borderTop: "2px solid #cbd5e1", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>GRAND TOTAL AMOUNT</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#4f46e5" }}>₹{grandTotal}.00</div>
                </div>

                <div style={{ textAlign: "right", fontSize: 11, color: "#64748b" }}>
                  <div>Rate: ₹{baseRate}.00 / pg</div>
                  <div>Total Sheets: {totalPages} pages</div>
                </div>
              </div>
            </div>
          </div>

          {/* Scannable Advance UPI QR Code */}
          <div style={{ textAlign: "center", background: "white", padding: 12, borderRadius: 10, border: "1px solid #cbd5e1" }}>
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Advance Payment QR"
                style={{ width: 130, height: 130, margin: "0 auto 4px", display: "block", borderRadius: 6 }}
              />
            ) : (
              <div style={{ width: 130, height: 130, background: "#f8fafc", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                Loading QR...
              </div>
            )}
            <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>
              Scan & Pay ₹{grandTotal}.00
            </div>
            <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>
              {shopUpi}
            </div>
          </div>
        </div>

        {/* Section 4: Action Dispatch Bar */}
        <div className="no-print" style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="btn btn-whatsapp"
              style={{ padding: "12px 20px", fontSize: 14 }}
            >
              <MessageCircle size={18} />
              <span>📲 Send Advance Bill to WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="btn btn-secondary"
              style={{ padding: "12px 18px", fontSize: 13 }}
            >
              {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
              <span>{copied ? "Copied Quotation!" : "Copy Text"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="btn btn-secondary"
              style={{ padding: "12px 18px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
              title="Download PDF document"
            >
              {generatingPdf ? <Loader2 size={16} className="spin-animation" /> : <Download size={16} />}
              <span>{generatingPdf ? "Creating PDF..." : "Download PDF Bill"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-secondary"
              style={{ padding: "12px 18px", fontSize: 13 }}
            >
              <Printer size={16} />
              <span>Print Quotation</span>
            </button>
          </div>

          <Link
            href="/order"
            className="btn btn-lg"
            style={{ background: "#4f46e5", color: "white", padding: "12px 24px", fontSize: 14 }}
          >
            <span>Upload Document & Confirm Order</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
