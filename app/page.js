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
  Search
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [calcSize, setCalcSize] = useState("A4");
  const [calcColor, setCalcColor] = useState("BW");
  const [calcSides, setCalcSides] = useState("SINGLE");
  const [calcCopies, setCalcCopies] = useState(1);
  const [calcPages, setCalcPages] = useState(1);

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

          const { data: prof } = await s
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          if (prof?.role === "ADMIN") {
            router.push("/admin");
          } else {
            router.push("/orders");
          }
        }
      });
    }
  }, [router]);

  // Quick price estimator
  const multipliers = { A4: 1, A5: 0.8, A3: 1.8, Legal: 1.2, Letter: 1, Custom: 1.5 };
  const baseRate = calcColor === "COLOR" ? 5 : 3;
  const sideMultiplier = calcSides === "DOUBLE" ? 0.9 : 1;
  const estPrice = Math.max(5, Math.ceil(baseRate * (multipliers[calcSize] || 1) * sideMultiplier * calcCopies * calcPages));

  return (
    <main className="wrap">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Smart Online Printing Service</span>
          </div>

          <h1>
            Print without the queue, <span>delivered to your door.</span>
          </h1>

          <p>
            Upload documents, customize print specifications, pay seamlessly via UPI, and track your print job live from submission to delivery.
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
          </div>
        </div>
      </section>

      {/* Interactive Price Estimator & Quick Info */}
      <div className="row" style={{ marginBottom: 36, alignItems: "stretch" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="card-header">
              <h2 className="card-title">
                <Sparkles size={20} color="var(--primary)" />
                <span>Instant Price Calculator</span>
              </h2>
              <span className="status-badge status-READY">Best Rates</span>
            </div>

            <div className="row" style={{ marginBottom: 14 }}>
              <div className="field">
                <label>Paper Size</label>
                <select value={calcSize} onChange={(e) => setCalcSize(e.target.value)}>
                  <option value="A4">A4 (Standard)</option>
                  <option value="A5">A5 (Booklet)</option>
                  <option value="A3">A3 (Poster / Drawing)</option>
                  <option value="Legal">Legal (Official)</option>
                </select>
              </div>

              <div className="field">
                <label>Colour Mode</label>
                <select value={calcColor} onChange={(e) => setCalcColor(e.target.value)}>
                  <option value="BW">Black & White (₹3.00/pg)</option>
                  <option value="COLOR">Full Colour (₹5.00/pg)</option>
                </select>
              </div>
            </div>

            <div className="row" style={{ marginBottom: 14 }}>
              <div className="field">
                <label>Print Sides</label>
                <select value={calcSides} onChange={(e) => setCalcSides(e.target.value)}>
                  <option value="SINGLE">Single Sided</option>
                  <option value="DOUBLE">Double Sided (10% Off)</option>
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
          </div>

          <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>
                ESTIMATED TOTAL ({calcPages} {calcPages === 1 ? "pg" : "pgs"} × {calcCopies} {calcCopies === 1 ? "copy" : "copies"})
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--primary)" }}>₹{estPrice}.00</div>
            </div>

            <Link href="/order" className="btn btn-sm">
              <span>Order This Job</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Why Crazy Printing Center?</h2>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <CheckCircle size={20} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>High-Speed Laser Printing</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Ultra crisp 1200 DPI prints on 75 to 100 GSM premium bond paper.</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <CheckCircle size={20} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>UPI QR Instant Payments</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Pay via Google Pay, PhonePe, Paytm or any UPI app with instant proof upload.</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <CheckCircle size={20} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Flexible Pickup & Delivery</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Zero waiting time counter pickup or fast doorstep delivery.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid">
        <div className="feature-card">
          <div className="feature-icon">
            <FileText size={24} />
          </div>
          <h3 className="feature-title">Any Document Format</h3>
          <p className="feature-desc">Upload PDF, Word (DOC/DOCX), PowerPoint (PPT/PPTX), JPG, PNG, and high-res scans.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon" style={{ background: "#ede9fe", color: "#6d28d9" }}>
            <Layers size={24} />
          </div>
          <h3 className="feature-title">Multiple Paper Sizes</h3>
          <p className="feature-desc">Full support for A4, A5, A3, Legal, Letter, glossy photopaper, and custom dimension prints.</p>
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
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>How It Works in 3 Simple Steps</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}>Get your prints ready without standing in crowded shop lines</p>

        <div className="row-3" style={{ textAlign: "left" }}>
          <div style={{ background: "#f8fafc", padding: 20, borderRadius: "var(--radius-md)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", color: "white", display: "grid", placeItems: "center", fontWeight: 800, marginBottom: 12 }}>
              1
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Upload & Customize</h4>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Choose your paper size, color options, single/double sided, and attach your documents.
            </p>
          </div>

          <div style={{ background: "#f8fafc", padding: 20, borderRadius: "var(--radius-md)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", color: "white", display: "grid", placeItems: "center", fontWeight: 800, marginBottom: 12 }}>
              2
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Pay with UPI</h4>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Scan the UPI QR code on the payment page and upload your payment screenshot.
            </p>
          </div>

          <div style={{ background: "#f8fafc", padding: 20, borderRadius: "var(--radius-md)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", color: "white", display: "grid", placeItems: "center", fontWeight: 800, marginBottom: 12 }}>
              3
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Track & Collect</h4>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Follow your order timeline live and pick up your prints or receive them at your doorstep.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}