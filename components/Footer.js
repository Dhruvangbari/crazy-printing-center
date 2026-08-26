import Link from "next/link";
import { Phone, MessageCircle, Headphones, MapPin, Clock, Code2, ShieldCheck, Heart, RefreshCw, Activity } from "lucide-react";

export default function Footer() {
  const lastUpdated = "24 Aug 2026, 08:41 PM IST";
  const appVersion = "v2.2.0 (Stable)";

  return (
    <footer className="footer" suppressHydrationWarning>
      <div className="footer-wrap">
        {/* Column 1: Brand & Bio */}
        <div style={{ maxWidth: 360 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: 12 }}>
            <img 
              src="/logo.png" 
              alt="Dhruvang Crazy Printing Logo" 
              style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #4f46e5" }} 
            />
            <div>
              <div style={{ fontWeight: 900, color: "white", fontSize: 16, letterSpacing: -0.3 }}>
                Dhruvang Crazy Printing Center
              </div>
              <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700 }}>
                Smart Xerox & Online Printing
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>
            Fast, high-precision document and xerox printing with instant UPI payments, live status tracking, and zero-wait counter or doorstep delivery.
          </p>
          <div style={{ fontSize: 12, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 }}>
            <Code2 size={14} color="#38bdf8" />
            <span>Founder & Owner: <b style={{ color: "#38bdf8" }}>Dhruvang Bari</b></span>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "white", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
            Navigation
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <Link href="/" style={{ color: "#94a3b8", transition: "color 0.2s" }} className="footer-link">Home</Link>
            <Link href="/order" style={{ color: "#94a3b8", transition: "color 0.2s" }} className="footer-link">Order Print</Link>
            <Link href="/track" style={{ color: "#94a3b8", transition: "color 0.2s" }} className="footer-link">Track Order Live</Link>
            <Link href="/bills" style={{ color: "#94a3b8", transition: "color 0.2s" }} className="footer-link">Bill Center (Tax Invoice)</Link>
            <Link href="/customer-service" style={{ color: "#38bdf8", fontWeight: 700 }} className="footer-link">Customer Service & Help</Link>
            <Link href="/login" style={{ color: "#94a3b8", transition: "color 0.2s" }} className="footer-link">Customer Login</Link>
          </div>
        </div>

        {/* Column 3: Customer Service & Helpline */}
        <div style={{ maxWidth: 300 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "white", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Headphones size={15} color="#38bdf8" />
            <span>Customer Service</span>
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Direct Store Helpline</div>
            <a 
              href="tel:8857871669" 
              style={{ fontSize: 16, fontWeight: 900, color: "#4ade80", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Phone size={14} />
              <span>8857871669</span>
            </a>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <a 
              href="https://wa.me/918857871669?text=Hello%20Dhruvang%20Crazy%20Printing%2C%20I%20need%20assistance."
              target="_blank"
              rel="noreferrer"
              className="btn btn-whatsapp btn-sm"
              style={{ flex: 1, justifyContent: "center", fontSize: 11, padding: "6px 10px" }}
            >
              <MessageCircle size={13} />
              <span>WhatsApp Chat</span>
            </a>

            <Link
              href="/customer-service"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, justifyContent: "center", fontSize: 11, padding: "6px 10px", background: "rgba(255,255,255,0.1)", color: "white", borderColor: "rgba(255,255,255,0.2)" }}
            >
              <span>Help Center</span>
            </Link>
          </div>

          <div style={{ fontSize: 11.5, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} color="#38bdf8" />
            <span>Store Counter Hours: 8 AM – 10 PM</span>
          </div>

          <a 
            href="https://www.google.com/maps/dir/?api=1&destination=19.787653,72.694511"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 11.5, color: "#38bdf8", display: "flex", alignItems: "center", gap: 5, textDecoration: "none", marginTop: 6 }}
          >
            <MapPin size={12} color="#38bdf8" />
            <span>Store Location: Boisar (19.787653, 72.694511) 📍</span>
          </a>
        </div>
      </div>

      {/* Live System & Website Update Status Bar */}
      <div style={{ maxWidth: 1200, margin: "0 auto 16px", padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#cbd5e1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(52,211,153,0.3)", padding: "3px 9px", borderRadius: 999 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 6px #34d399" }}></span>
            <span style={{ fontWeight: 800, color: "#34d399", fontSize: 11 }}>System Operational</span>
          </div>
          <span style={{ color: "#64748b" }}>•</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={13} color="#38bdf8" />
            <span>Last Website Update: <b style={{ color: "#f8fafc" }}>{lastUpdated}</b></span>
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 6, fontFamily: "monospace" }}>{appVersion}</span>
          <span>⚡ Realtime Supabase v2 Sync Active</span>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px 0", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, fontSize: 12, color: "#64748b" }}>
        <div>
          © 2026 Dhruvang Crazy Printing Center. All rights reserved.
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <span>100% Laser Print Quality</span>
          <span>•</span>
          <span>Instant UPI Verification</span>
          <span>•</span>
          <span>Live Order Tracking</span>
        </div>
      </div>
    </footer>
  );
}
