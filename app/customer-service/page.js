"use client";
import { useState } from "react";
import Link from "next/link";
import { 
  Headphones, 
  Phone, 
  MessageCircle, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Sparkles, 
  ArrowRight,
  HelpCircle,
  FileText,
  Receipt,
  Search,
  Send
} from "lucide-react";
import { openWhatsAppChat } from "../../lib/whatsapp";

export default function CustomerServicePage() {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [queryName, setQueryName] = useState("");
  const [queryPhone, setQueryPhone] = useState("");
  const [queryOrderNum, setQueryOrderNum] = useState("");
  const [queryMessage, setQueryMessage] = useState("");

  const faqs = [
    {
      q: "How does the online printing order process work?",
      a: "Simply navigate to 'Order Print', upload your documents (PDF, DOCX, Images), select paper size (A4, A5, A3, Legal), choose Color or B&W and single/double-sided. You'll see the exact rate instantly. Complete payment via UPI QR, upload the screenshot, and we start printing immediately!"
    },
    {
      q: "How fast will my prints be ready?",
      a: "Standard print orders of up to 100 pages are typically printed and ready within 5 to 15 minutes after payment verification. You can track real-time status (Printing, Ready for Pickup, Out for Delivery) on the 'Track Order' page."
    },
    {
      q: "How do I download my Official Bill or Tax Invoice?",
      a: "Visit the 'Bill Center' from the top navigation. Enter your Order Number to view, generate, print, or download your Official Tax Invoice or Advance Proforma Bill in 1 click."
    },
    {
      q: "What payment methods are supported?",
      a: "We accept all UPI applications including Google Pay, PhonePe, Paytm, BHIM, and UPI NetBanking. Simply scan our UPI QR code on checkout and enter your transaction UTR or upload the screenshot."
    },
    {
      q: "Can I collect my prints directly from the counter?",
      a: "Yes! When placing your order, select 'Store Counter Pickup'. As soon as the live status shows 'READY_FOR_PICKUP', you can walk in and collect your documents with zero waiting time."
    },
    {
      q: "What if I need emergency bulk printing or special paper binding?",
      a: "Contact our direct WhatsApp helpline at 8857871669. We support spiral binding, hardcover project binding, glossy photopaper prints, and custom dimension printing upon request."
    }
  ];

  function copyHelpline() {
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText("8857871669");
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      } else {
        alert("Helpline Number: 8857871669");
      }
    } catch (e) {
      alert("Helpline Number: 8857871669");
    }
  }

  function handleSendSupportWhatsApp(e) {
    e.preventDefault();
    const cleanPhone = (queryPhone || "").replace(/[^0-9]/g, "");
    const customer = queryName.trim() || "Customer";
    const orderTxt = queryOrderNum.trim() ? `• *Order Ref:* #${queryOrderNum.trim()}\n` : "";
    const msgTxt = queryMessage.trim() || "I need general assistance with Dhruvang Crazy Printing Center.";

    const text = 
      `🎧 *CUSTOMER SERVICE INQUIRY — DHRUVANG CRAZY PRINTING*\n` +
      `--------------------------------\n` +
      `👤 *Name:* ${customer}\n` +
      `📞 *Phone:* ${cleanPhone || "Not specified"}\n` +
      orderTxt +
      `💬 *Message:* ${msgTxt}\n` +
      `--------------------------------\n` +
      `Submitted via Customer Service Hub`;

    openWhatsAppChat("8857871669", text);
  }

  return (
    <main className="wrap">
      {/* Support Hero Header */}
      <section className="support-hero">
        <div style={{ maxWidth: 700, position: "relative", zIndex: 1 }}>
          <div className="brand-badge" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#a7f3d0", borderColor: "rgba(167, 243, 208, 0.3)", marginBottom: 14 }}>
            <span className="live-dot"></span>
            <span>24/7 Dedicated Customer Care</span>
          </div>

          <h1 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: 900, letterSpacing: -0.5, marginBottom: 14 }}>
            How can we help you today?
          </h1>

          <p style={{ fontSize: 16, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 20 }}>
            Reach out directly for instant order support, payment verification assistance, bulk printing quotes, or custom print inquiries.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a 
              href="tel:8857871669"
              className="btn btn-success btn-sm"
              style={{ fontSize: 13, padding: "8px 16px", borderRadius: 999 }}
            >
              <Phone size={15} />
              <span>Call 8857871669</span>
            </a>

            <a 
              href="https://wa.me/918857871669?text=Hello%20Dhruvang%20Crazy%20Printing%20Customer%20Support%2C%20I%20need%20help."
              target="_blank"
              rel="noreferrer"
              className="btn btn-whatsapp btn-sm"
              style={{ fontSize: 13, padding: "8px 16px", borderRadius: 999 }}
            >
              <MessageCircle size={15} />
              <span>WhatsApp Chat</span>
            </a>

            <button 
              type="button" 
              onClick={copyHelpline} 
              className="btn btn-secondary btn-sm" 
              style={{ fontSize: 13, padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,0.15)", color: "white", borderColor: "rgba(255,255,255,0.25)" }}
            >
              {copiedPhone ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
              <span>{copiedPhone ? "Copied 8857871669" : "Copy Helpline Number"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4 Core Support Channels */}
      <div className="support-grid">
        {/* Helpline Call Card */}
        <div className="support-card support-card-primary">
          <div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#dcfce7", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Phone size={22} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Phone Helpline</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              Direct call line for immediate order verification, status check, or instant queries.
            </p>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#15803d", marginBottom: 6 }}>
              +91 8857871669
            </div>
            <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={13} />
              <span>Available 8:00 AM – 10:00 PM</span>
            </div>
          </div>

          <a href="tel:8857871669" className="btn btn-success" style={{ width: "100%", justifyContent: "center" }}>
            <Phone size={16} />
            <span>Call Store Helpline</span>
          </a>
        </div>

        {/* WhatsApp Chat Card */}
        <div className="support-card" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)" }}>
          <div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#dcfce7", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <MessageCircle size={22} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>WhatsApp Live Chat</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              Send files, ask questions, or request advance quotations directly on WhatsApp.
            </p>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-main)", marginBottom: 6 }}>
              WhatsApp: 8857871669
            </div>
            <div style={{ fontSize: 12, color: "#15803d", fontWeight: 700 }}>
              ⚡ Average response time: {"< 2 minutes"}
            </div>
          </div>

          <a 
            href="https://wa.me/918857871669?text=Hello%20Dhruvang%20Crazy%20Printing%2C%20I%20need%20assistance." 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-whatsapp" 
            style={{ width: "100%", justifyContent: "center" }}
          >
            <MessageCircle size={16} />
            <span>Open WhatsApp Chat</span>
          </a>
        </div>

        {/* Store Counter & Pickup */}
        <div className="support-card">
          <div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <MapPin size={22} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Store Counter Pickup</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              Collect your prints directly at the counter with zero waiting time once status is Ready.
            </p>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
              📍 Dhruvang Crazy Printing Center
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              Open Monday to Sunday: 8 AM to 10 PM
            </div>
            <div style={{ fontSize: 11.5, color: "#0284c7", fontWeight: 700, marginBottom: 8 }}>
              GPS: 19.787653° N, 72.694511° E (Boisar)
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=19.787653,72.694511" 
              target="_blank" 
              rel="noreferrer"
              className="btn btn-secondary btn-sm" 
              style={{ width: "100%", justifyContent: "center" }}
            >
              <MapPin size={14} color="#0284c7" />
              <span>Open in Google Maps 📍</span>
            </a>

            <Link href="/track" className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
              <Search size={14} />
              <span>Track Order for Pickup</span>
            </Link>
          </div>
        </div>

        {/* Email Support */}
        <div className="support-card">
          <div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#ede9fe", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Mail size={22} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Email Support</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              For formal corporate inquiries, institutional billing, or official correspondence.
            </p>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-main)", wordBreak: "break-all", marginBottom: 6 }}>
              dhruvangbari2006@gmail.com
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Owner & Founder: Dhruvang Bari
            </div>
          </div>

          <a href="mailto:dhruvangbari2006@gmail.com" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
            <Mail size={16} />
            <span>Send Email</span>
          </a>
        </div>
      </div>

      {/* Quick Self-Service Links & System Status */}
      <div className="card" style={{ marginBottom: 36, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} color="var(--primary)" />
            <span>Instant Self-Service Tools</span>
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "4px 10px", borderRadius: 999, color: "#166534" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 6px #10b981" }}></span>
            <span><b>System Status:</b> Operational • Updated 24 Aug 2026</span>
          </div>
        </div>

        <div className="row-3">
          <Link href="/track" style={{ padding: "14px 16px", background: "#f8fafc", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--text-main)", transition: "all 0.2s" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#eef2ff", color: "var(--primary)", display: "grid", placeItems: "center" }}>
              <Search size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Track Live Order</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Realtime printer status</div>
            </div>
          </Link>

          <Link href="/bills" style={{ padding: "14px 16px", background: "#f8fafc", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--text-main)", transition: "all 0.2s" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f0fdf4", color: "#16a34a", display: "grid", placeItems: "center" }}>
              <Receipt size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Tax Invoice & Bills</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Download official PDF</div>
            </div>
          </Link>

          <Link href="/order" style={{ padding: "14px 16px", background: "#f8fafc", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--text-main)", transition: "all 0.2s" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#faf5ff", color: "#9333ea", display: "grid", placeItems: "center" }}>
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Place New Order</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Upload & print instantly</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Interactive FAQ & Contact Form Section */}
      <div className="row" style={{ alignItems: "flex-start", marginBottom: 36 }}>
        {/* FAQ Accordion */}
        <div style={{ flex: 1.2 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <HelpCircle size={20} color="var(--primary)" />
            <span>Frequently Asked Questions</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {faqs.map((faq, idx) => (
              <div key={idx} className="faq-card">
                <div 
                  className="faq-header"
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp size={18} color="var(--primary)" />
                  ) : (
                    <ChevronDown size={18} color="var(--text-muted)" />
                  )}
                </div>
                {openFaq === idx && (
                  <div className="faq-body animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Message / Query Form */}
        <div className="card" style={{ flex: 1 }}>
          <div className="card-header">
            <h3 className="card-title">
              <MessageCircle size={18} color="#22c55e" />
              <span>Send Direct Inquiry</span>
            </h3>
            <span className="status-badge status-PRINTING" style={{ background: "#ecfdf5", color: "#16a34a" }}>WhatsApp Desk</span>
          </div>

          <form onSubmit={handleSendSupportWhatsApp}>
            <div className="field">
              <label>Your Full Name</label>
              <input
                type="text"
                placeholder="e.g. Dhruvang Bari"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Your Mobile / WhatsApp Number</label>
              <input
                type="tel"
                placeholder="e.g. 8857871669"
                value={queryPhone}
                onChange={(e) => setQueryPhone(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Order Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. CPC-2026-8921"
                value={queryOrderNum}
                onChange={(e) => setQueryOrderNum(e.target.value)}
              />
            </div>

            <div className="field">
              <label>How can we assist you?</label>
              <textarea
                rows={3}
                placeholder="Describe your issue or print requirements..."
                value={queryMessage}
                onChange={(e) => setQueryMessage(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-whatsapp" style={{ width: "100%", justifyContent: "center" }}>
              <Send size={15} />
              <span>Send to Support Desk (8857871669)</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
