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
    const totalPgs = calcPages * calcCopies;
    const quotNum = `ADV-CPC-${Date.now().toString().slice(-6)}`;
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
      `📍 *Upload Your Files & Place Order:* ${typeof window !== "undefined" ? window.location.origin : "https://crazy-printing-center.vercel.app"}/order\n\n` +
      `Dhruvang Crazy Printing Center • Fast Online Printing Service`;

    openWhatsAppChat(estPhone, msg);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      const s = supabase();
      s.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Customer";

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
        }
      });
    }
  }, [router]);

  // Quick price estimator calculation
  const multipliers = { A4: 1, A5: 0.8, A3: 1.8, Legal: 1.2, Letter: 1, Custom: 1.5 };
  const baseRate = calcColor === "COLOR" ? 5 : 3;
  const sideMultiplier = calcSides === "DOUBLE" ? 0.9 : 1;
  const estPrice = Math.max(5, Math.ceil(baseRate * (multipliers[calcSize] || 1) * sideMultiplier * calcCopies * calcPages));

  return (
    <main className="wrap">
      {/* Elevated Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="live-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", display: "inline-block", boxShadow: "0 0 10px #38bdf8" }}></span>
            <span>Laser-Fast Online Xerox & Printing Service</span>
          </div>

          <h1>
            Print without the queue, <span>delivered to your door.</span>
          </h1>

          <p>
            Upload documents in seconds, customize print specifications, pay seamlessly via UPI, and track your print job live from laser printing to zero-wait counter pickup or doorstep delivery.
          </p>

          <div className="hero-actions">
            <Link href="/order" className="btn btn-lg">
              <UploadCloud size={18} />
              <span>Start Printing Now</span>
            </Link>

            <Link href="/track" className="btn btn-secondary btn-lg" style={{ background: "rgba(255,255,255,0.1)", color: "white", borderColor: "rgba(255,255,255,0.2)" }}>
              <Search size={18} />
              <span>Track Order</span>
            </Link>

            <Link href="/customer-service" className="btn btn-secondary btn-lg" style={{ background: "rgba(22, 163, 74, 0.2)", color: "#a7f3d0", borderColor: "rgba(167, 243, 208, 0.3)" }}>
              <Headphones size={18} />
              <span>24/7 Helpline</span>
            </Link>
          </div>

          {/* Hero Trust Badges Row */}
          <div className="hero-badges-row">
            <div className="hero-stat-pill">
              <Zap size={14} color="#facc15" />
              <span>5-Min Fast Turnaround</span>
            </div>
            <div className="hero-stat-pill">
              <ShieldCheck size={14} color="#4ade80" />
              <span>100% 1200 DPI Quality</span>
            </div>
            <div className="hero-stat-pill">
              <CreditCard size={14} color="#38bdf8" />
              <span>Zero-Fee UPI Instant Pay</span>
            </div>
            <div className="hero-stat-pill">
              <Truck size={14} color="#c084fc" />
              <span>Doorstep & Store Pickup</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Price Estimator & Why Choose Us */}
      <div className="row" style={{ marginBottom: 36, alignItems: "stretch" }}>
        {/* Instant Price Calculator */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="card-header">
              <h2 className="card-title">
                <Sparkles size={20} color="var(--primary)" />
                <span>Instant Price Calculator</span>
              </h2>
              <span className="status-badge status-READY" style={{ background: "#ecfdf5", color: "#16a34a", fontWeight: 800 }}>
                Transparent Pricing
              </span>
            </div>

            <div className="row" style={{ marginBottom: 14 }}>
              <div className="field">
                <label>Paper Size</label>
                <select value={calcSize} onChange={(e) => setCalcSize(e.target.value)}>
                  <option value="A4">A4 (Standard Document)</option>
                  <option value="A5">A5 (Booklet / Memo)</option>
                  <option value="A3">A3 (Poster / Drawing Sheet)</option>
                  <option value="Legal">Legal (Official Stamp)</option>
                </select>
              </div>

              <div className="field">
                <label>Colour Mode</label>
                <select value={calcColor} onChange={(e) => setCalcColor(e.target.value)}>
                  <option value="BW">Black & White (₹3.00/pg)</option>
                  <option value="COLOR">Full High-Res Colour (₹5.00/pg)</option>
                </select>
              </div>
            </div>

            <div className="row" style={{ marginBottom: 14 }}>
              <div className="field">
                <label>Print Sides</label>
                <select value={calcSides} onChange={(e) => setCalcSides(e.target.value)}>
                  <option value="SINGLE">Single Sided</option>
                  <option value="DOUBLE">Double Sided (10% Discount)</option>
                </select>
              </div>

              <div className="field">
                <label>Document Pages</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={calcPages}
                  onChange={(e) => setCalcPages(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="e.g. 10"
                />
              </div>

              <div className="field">
                <label>Number of Copies</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={calcCopies}
                  onChange={(e) => setCalcCopies(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>

            {/* Advance WhatsApp Quotation Input Row */}
            <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "var(--radius-md)", marginTop: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <MessageCircle size={14} color="#16a34a" />
                <span>Instant WhatsApp Advance Bill Delivery</span>
              </div>
              <div className="row" style={{ marginBottom: 0 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>Your Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dhruvang Bari"
                    value={estName}
                    onChange={(e) => setEstName(e.target.value)}
                    style={{ fontSize: 13, padding: "8px 10px" }}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>WhatsApp Mobile Number <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="tel"
                    placeholder="e.g. 8857871669"
                    value={estPhone}
                    onChange={(e) => setEstPhone(e.target.value)}
                    style={{ fontSize: 13, padding: "8px 10px" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 16, border: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 800, letterSpacing: 0.3 }}>
                ESTIMATED TOTAL ({calcPages} {calcPages === 1 ? "pg" : "pgs"} × {calcCopies} {calcCopies === 1 ? "copy" : "copies"})
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "var(--primary)" }}>₹{estPrice}.00</div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleSendAdvanceBillWhatsApp}
                className="btn btn-whatsapp btn-sm"
                title="Send official advance bill quotation directly to WhatsApp"
              >
                <MessageCircle size={15} />
                <span>Send to WhatsApp</span>
              </button>

              <Link href="/order" className="btn btn-sm">
                <span>Upload & Order</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.3 }}>Why Dhruvang Crazy Printing Center?</h2>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ecfdf5", color: "#16a34a", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Printer size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>High-Speed Laser Printing</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4 }}>Ultra crisp 1200 DPI prints on 75 to 100 GSM premium imported bond paper.</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eef2ff", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <CreditCard size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Instant UPI QR Verification</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4 }}>Pay with Google Pay, PhonePe, or Paytm with instant payment screenshot check.</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#faf5ff", color: "#9333ea", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Truck size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Zero-Wait Counter & Doorstep Pickup</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4 }}>Grab your finished prints instantly at our counter or get express home delivery.</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ecfeff", color: "#0891b2", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Headphones size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Dedicated Support & Helpline</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4 }}>Have custom requirements? Call or WhatsApp our helpline directly at <b>8857871669</b>.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Customer Service & Helpline Callout Banner */}
      <section className="card" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", color: "white", padding: "28px 32px", marginBottom: 36, border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ maxWidth: 620 }}>
            <div className="brand-badge" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#a7f3d0", borderColor: "rgba(167, 243, 208, 0.3)", marginBottom: 10 }}>
              <Headphones size={13} />
              <span>Direct Customer Support Desk</span>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
              Need Assistance with your Print Job or Bill?
            </h3>
            <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>
              Our customer service team is ready to help you with order status, bill generation, custom booklet bindings, or urgent print requests.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="tel:8857871669" className="btn btn-success" style={{ fontWeight: 800 }}>
              <Phone size={16} />
              <span>Call Helpline: 8857871669</span>
            </a>

            <Link href="/customer-service" className="btn btn-secondary" style={{ background: "rgba(255,255,255,0.12)", color: "white", borderColor: "rgba(255,255,255,0.25)" }}>
              <HelpCircle size={16} />
              <span>Customer Service Hub</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <div className="grid">
        <div className="feature-card">
          <div className="feature-icon">
            <FileText size={24} />
          </div>
          <h3 className="feature-title">Any Document Format</h3>
          <p className="feature-desc">Upload PDF, Word (DOC/DOCX), PowerPoint (PPT/PPTX), JPG, PNG, and high-res scanned notes.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon" style={{ background: "#ede9fe", color: "#6d28d9" }}>
            <Layers size={24} />
          </div>
          <h3 className="feature-title">Multiple Paper Sizes</h3>
          <p className="feature-desc">Full support for A4, A5, A3, Legal, Letter, glossy photopaper, and custom project prints.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
            <CreditCard size={24} />
          </div>
          <h3 className="feature-title">Instant UPI Payments</h3>
          <p className="feature-desc">Scan dynamic QR code on checkout, upload screenshot, and get verified in minutes.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
            <Clock size={24} />
          </div>
          <h3 className="feature-title">Live Status Tracking</h3>
          <p className="feature-desc">Real-time order tracker from payment received, printing, quality inspection, to pickup ready.</p>
        </div>
      </div>

      {/* How it Works 3 Steps */}
      <section className="card" style={{ padding: 36, textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, letterSpacing: -0.3 }}>How It Works in 3 Simple Steps</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}>Get your documents printed without standing in crowded shop lines</p>

        <div className="row-3" style={{ textAlign: "left" }}>
          <div style={{ background: "#f8fafc", padding: 22, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--primary)", color: "white", display: "grid", placeItems: "center", fontWeight: 900, marginBottom: 14 }}>
              1
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Upload & Customize</h4>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Choose your paper size, color options, single/double sided, and attach your documents.
            </p>
          </div>

          <div style={{ background: "#f8fafc", padding: 22, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--primary)", color: "white", display: "grid", placeItems: "center", fontWeight: 900, marginBottom: 14 }}>
              2
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Pay with UPI</h4>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Scan the UPI QR code on the payment page and upload your payment screenshot.
            </p>
          </div>

          <div style={{ background: "#f8fafc", padding: 22, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--primary)", color: "white", display: "grid", placeItems: "center", fontWeight: 900, marginBottom: 14 }}>
              3
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Track & Collect</h4>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Follow your order timeline live and pick up your prints or receive them at your doorstep.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}