"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { 
  Printer, 
  UploadCloud, 
  CreditCard, 
  Truck, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Layers, 
  Sparkles, 
  ArrowRight,
  CheckCircle,
  Search,
  MessageCircle,
  Headphones,
  Phone,
  HelpCircle,
  Zap,
  Receipt
} from "lucide-react";
import { openWhatsAppChat } from "../lib/whatsapp";

export default function Home() {
  const router = useRouter();
  const [calcSize, setCalcSize] = useState("A4");
  const [calcColor, setCalcColor] = useState("BW");
  const [calcSides, setCalcSides] = useState("SINGLE");
  const [calcCopies, setCalcCopies] = useState(1);
  const [calcPages, setCalcPages] = useState(1);
  const [estName, setEstName] = useState("");
  const [estPhone, setEstPhone] = useState("");

  // Quick price estimator calculation
  const multipliers = { A4: 1, A5: 0.8, A3: 1.8, Legal: 1.2, Letter: 1, Custom: 1.5 };
  const baseRate = calcColor === "COLOR" ? 5 : 3;
  const sideMultiplier = calcSides === "DOUBLE" ? 0.9 : 1;
  const estPrice = Math.max(5, Math.ceil(baseRate * (multipliers[calcSize] || 1) * sideMultiplier * (calcCopies || 1) * (calcPages || 1)));

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("cpc_saved_customer_data") || "{}");
        if (saved.name) setEstName(saved.name);
        if (saved.phone) setEstPhone(saved.phone);
      } catch (e) {}
    }
  }, []);

  function handleSendAdvanceBillWhatsApp() {
    const cleanPhone = (estPhone || "").replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit WhatsApp phone number.");
      return;
    }
    const customer = estName.trim() || "Customer";
    const totalPgs = (calcPages || 1) * (calcCopies || 1);
    const quotNum = `ADV-CPC-${Date.now().toString().slice(-6)}`;
    const originUrl = typeof window !== "undefined" ? window.location.origin : "https://crazy-printing-center-3ca2.vercel.app";
    const msg = 
      `🧾 *DHRUVANG CRAZY PRINTING CENTER - ADVANCE BILL & ESTIMATE*\n` +
      `--------------------------------\n` +
      `📄 *Quotation Ref:* ${quotNum}\n` +
      `👤 *Customer Name:* ${customer}\n` +
      `📞 *WhatsApp:* ${estPhone}\n` +
      `🖨️ *Print Specs:* ${calcSize} • ${calcColor === "COLOR" ? "Full Colour" : "Black & White"} • ${calcSides === "DOUBLE" ? "Double Sided" : "Single Sided"}\n` +
      `📄 *Pages × Copies:* ${calcPages} pgs × ${calcCopies} ${calcCopies === 1 ? "copy" : "copies"} (${totalPgs} total pages)\n` +
      `💰 *Estimated Total Amount:* Rs.${estPrice}.00\n` +
      `💳 *UPI Payment ID:* crazyprinting@upi\n` +
      `--------------------------------\n` +
      `📍 *Upload Your Files & Place Order:* ${originUrl}/order\n\n` +
      `Dhruvang Crazy Printing Center • Fast Online Printing Service`;

    openWhatsAppChat(estPhone, msg);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const s = supabase();
        if (!s?.auth) return;
        s.auth.getUser().then(async (authRes) => {
          const user = authRes?.data?.user;
          if (user) {
            const name =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "Customer";

            try {
              await s.from("profiles").upsert(
                {
                  id: user.id,
                  name: name,
                  phone: user.user_metadata?.phone || null,
                },
                { onConflict: "id" }
              );

              const isDhruvang = Boolean(user.email && user.email.toLowerCase() === "dhruvangbari2006@gmail.com");

              const { data: prof } = await s
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

              if (isDhruvang && prof?.role !== "ADMIN") {
                await s.from("profiles").upsert(
                  { id: user.id, role: "ADMIN" },
                  { onConflict: "id" }
                );
              }

              if (isDhruvang || prof?.role === "ADMIN") {
                router.push("/admin");
              } else {
                router.push("/orders");
              }
            } catch (dbErr) {
              console.warn("Profile sync error on OAuth callback:", dbErr);
            }
          }
        }).catch((err) => {
          console.warn("OAuth getUser error:", err);
        });
      }
    } catch (e) {
      console.warn("OAuth parameter check error:", e);
    }
  }, [router]);

  return (
    <main className="wrap">
      {/* ======================================================== */}
      {/* HERO BANNER (SWIGGY / BLINKIT STYLE) */}
      {/* ======================================================== */}
      <section className="hero" style={{ padding: "40px 24px", marginBottom: 32, borderRadius: "var(--radius-xl)" }}>
        <div className="hero-content" style={{ maxWidth: 760 }}>
          <div className="hero-badge">
            <span className="live-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 10px #10b981" }}></span>
            <span>⚡ Boisar's #1 Instant Document &amp; Xerox Store</span>
          </div>

          <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.15, fontWeight: 900, marginBottom: 14 }}>
            Document printing &amp; xerox, <span>delivered to your door.</span>
          </h1>

          <p style={{ fontSize: 16, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 24 }}>
            Upload PDFs, notes, or project reports in seconds. Fast laser printing with <b>zero-wait store pickup</b> or <b>15–30 min Boisar doorstep delivery</b>.
          </p>

          <div className="hero-actions" style={{ gap: 12 }}>
            <Link href="/order" className="btn btn-lg" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", padding: "16px 28px", fontSize: 16, fontWeight: 900, boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.5)", borderRadius: 12 }}>
              <UploadCloud size={20} />
              <span>Start Printing Now ⚡</span>
            </Link>

            <Link href="/track" className="btn btn-secondary btn-lg" style={{ background: "rgba(255,255,255,0.12)", color: "white", borderColor: "rgba(255,255,255,0.25)", padding: "16px 24px", fontSize: 15, fontWeight: 700, borderRadius: 12 }}>
              <Search size={18} />
              <span>Track Order</span>
            </Link>

            <a
              href="https://wa.me/918857871669?text=Hello%20Dhruvang%20Crazy%20Printing%2C%20I%20have%20a%20question."
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-lg"
              style={{ background: "rgba(37, 211, 102, 0.15)", color: "#86efac", borderColor: "rgba(37, 211, 102, 0.3)", padding: "16px 20px", fontSize: 15, fontWeight: 700, borderRadius: 12 }}
            >
              <MessageCircle size={18} />
              <span>WhatsApp Support</span>
            </a>
          </div>

          {/* Key Value Propositions */}
          <div className="hero-badges-row" style={{ marginTop: 24 }}>
            <div className="hero-stat-pill">
              <Zap size={14} color="#facc15" />
              <span>⚡ 10–30 Min Fast Turnaround</span>
            </div>
            <div className="hero-stat-pill">
              <Printer size={14} color="#38bdf8" />
              <span>⬛ B&amp;W @ ₹3 • 🌈 Color @ ₹5</span>
            </div>
            <div className="hero-stat-pill">
              <Truck size={14} color="#a78bfa" />
              <span>🚚 Boisar Doorstep Delivery</span>
            </div>
            <div className="hero-stat-pill">
              <CreditCard size={14} color="#4ade80" />
              <span>📲 Instant UPI or Pay at Store</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4 QUICK-SELECT PRINT PRESETS (BLINKIT STYLE) */}
      {/* ======================================================== */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.4, margin: 0 }}>
              Popular Print Services
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13.5, margin: "2px 0 0" }}>
              Tap any category to pre-configure your print order instantly
            </p>
          </div>

          <Link href="/order" style={{ fontSize: 13.5, fontWeight: 800, color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span>Custom Order</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {/* Preset 1: College Notes & Xerox */}
          <Link href="/order?preset=notes" className="store-product-tile">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#eef2ff", color: "var(--primary)", display: "grid", placeItems: "center" }}>
                  <FileText size={22} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, background: "#ecfdf5", color: "#059669", padding: "3px 8px", borderRadius: 999 }}>
                  MOST POPULAR
                </span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>College Notes &amp; Xerox</h3>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                B&amp;W double-sided high-speed printing for study materials, assignments, and question papers.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: "var(--text-main)" }}>From ₹3.00 <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>/ page</span></span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)" }}>Print Notes →</span>
            </div>
          </Link>

          {/* Preset 2: Project Reports & Binding */}
          <Link href="/order?preset=report" className="store-product-tile">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fdf4ff", color: "#c026d3", display: "grid", placeItems: "center" }}>
                  <Layers size={22} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, background: "#fdf4ff", color: "#c026d3", padding: "3px 8px", borderRadius: 999 }}>
                  STUDENT SPECIAL
                </span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>Project Reports &amp; Binding</h3>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                Full color cover page, premium bond sheets with professional plastic spiral coil binding.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: "var(--text-main)" }}>₹30 <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>binding + prints</span></span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)" }}>Order Report →</span>
            </div>
          </Link>

          {/* Preset 3: Full Color Presentations */}
          <Link href="/order?preset=color" className="store-product-tile">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#ecfeff", color: "#0891b2", display: "grid", placeItems: "center" }}>
                  <Sparkles size={22} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, background: "#ecfeff", color: "#0891b2", padding: "3px 8px", borderRadius: 999 }}>
                  HD 1200 DPI
                </span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>Full Color Documents</h3>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                Rich high-resolution color laser prints for business pitch decks, flyers, graphs, and brochures.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: "var(--text-main)" }}>₹5.00 <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>/ page</span></span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)" }}>Print Color →</span>
            </div>
          </Link>

          {/* Preset 4: Certificates & Photo Glossy */}
          <Link href="/order?preset=certificate" className="store-product-tile">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fffbeb", color: "#d97706", display: "grid", placeItems: "center" }}>
                  <Receipt size={22} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, background: "#fffbeb", color: "#d97706", padding: "3px 8px", borderRadius: 999 }}>
                  GLOSSY FINISH
                </span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>Certificates &amp; Photos</h3>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                Heavyweight 180 GSM glossy finish paper for awards, college degrees, and portfolio artwork.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: "var(--text-main)" }}>From ₹7.50 <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>/ page</span></span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)" }}>Print Glossy →</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TRANSPARENT PRICING CARD & QUICK ESTIMATOR */}
      {/* ======================================================== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 36 }}>
        {/* Simple Price Calculator */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={18} color="var(--primary)" />
              <span>Instant Price Calculator</span>
            </h3>
            <span style={{ fontSize: 11, fontWeight: 800, background: "#ecfdf5", color: "#059669", padding: "2px 8px", borderRadius: 999 }}>
              100% TRANSPARENT
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div className="field">
              <label style={{ fontSize: 12, fontWeight: 700 }}>Paper Size</label>
              <select value={calcSize} onChange={(e) => setCalcSize(e.target.value)} style={{ padding: "8px 10px", fontSize: 13 }}>
                <option value="A4">A4 Standard</option>
                <option value="A3">A3 Large (2×)</option>
                <option value="Legal">Legal / Stamp</option>
              </select>
            </div>

            <div className="field">
              <label style={{ fontSize: 12, fontWeight: 700 }}>Color</label>
              <select value={calcColor} onChange={(e) => setCalcColor(e.target.value)} style={{ padding: "8px 10px", fontSize: 13 }}>
                <option value="BW">B&amp;W (₹3/pg)</option>
                <option value="COLOR">Color (₹5/pg)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div className="field">
              <label style={{ fontSize: 12, fontWeight: 700 }}>Sides</label>
              <select value={calcSides} onChange={(e) => setCalcSides(e.target.value)} style={{ padding: "8px 10px", fontSize: 13 }}>
                <option value="SINGLE">Single</option>
                <option value="DOUBLE">Double (10% off)</option>
              </select>
            </div>

            <div className="field">
              <label style={{ fontSize: 12, fontWeight: 700 }}>Pages</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={calcPages}
                onChange={(e) => setCalcPages(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ padding: "8px 10px", fontSize: 13 }}
              />
            </div>

            <div className="field">
              <label style={{ fontSize: 12, fontWeight: 700 }}>Copies</label>
              <input
                type="number"
                min="1"
                max="500"
                value={calcCopies}
                onChange={(e) => setCalcCopies(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ padding: "8px 10px", fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 800 }}>ESTIMATED COST</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "var(--primary)" }}>₹{estPrice}.00</div>
            </div>

            <Link href="/order" className="btn btn-sm" style={{ fontWeight: 800, padding: "8px 16px" }}>
              <span>Order Now</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Why People Love Dhruvang Crazy Printing */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 14 }}>
              Why Order from Crazy Printing Center?
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ecfdf5", color: "#16a34a", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <CheckCircle size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13.5 }}>Zero Wait Times</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Skip shop lines. Order online and pick up ready prints in 5 mins.</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e0f2fe", color: "#0284c7", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Truck size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13.5 }}>Boisar 401501 Doorstep Delivery</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Delivered straight to your home, office, or college in 15–30 mins.</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef3c7", color: "#d97706", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13.5 }}>Easy UPI or Pay at Store Counter</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Pay via GPay, PhonePe, Paytm, or Cash at store pickup.</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid var(--border)", marginTop: 14 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>
              📍 Boisar Railway Station Road (West)
            </div>
            <a href="tel:8857871669" style={{ fontSize: 12, color: "#16a34a", fontWeight: 800, textDecoration: "none" }}>
              📞 8857871669
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}