"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import AdvanceBillGenerator from "../../components/AdvanceBillGenerator";
import OfficialTaxInvoice from "../../components/OfficialTaxInvoice";
import FormattedDate from "../../components/FormattedDate";
import { 
  Receipt, 
  FileText, 
  ShieldCheck, 
  Search, 
  Printer, 
  MessageCircle, 
  ExternalLink, 
  ArrowRight, 
  Home, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  QrCode,
  Lock,
  PlusCircle,
  Eye,
  X,
  RefreshCw
} from "lucide-react";
import { buildWhatsAppLink, buildOrderStatusMessage } from "../../lib/whatsapp";

export default function BillsHubPage() {
  const [activeTab, setActiveTab] = useState("advance"); // "advance" | "invoices" | "verify"
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Verification search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedOrder, setSearchedOrder] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  async function loadInvoices(isSilent = false) {
    if (!isSilent) setRefreshing(true);
    try {
      const s = supabase();
      if (!s?.auth) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const authRes = await s.auth.getUser();
      const user = authRes?.data?.user || null;
      setUser(user);

      if (user) {
        const { data } = await s
          .from("orders")
          .select("*, order_files(*), status_history(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setOrders(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadInvoices();

    const s = supabase();
    let channel = null;

    try {
      if (s?.channel) {
        channel = s
          .channel("bills_hub_live_sync")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders" },
            () => {
              loadInvoices(true);
            }
          )
          .subscribe();
      }
    } catch (e) {
      console.warn("Bills hub realtime sync error:", e);
    }

    const interval = setInterval(() => {
      loadInvoices(true);
    }, 6000);

    return () => {
      try {
        if (s?.removeChannel && channel) s.removeChannel(channel);
      } catch (e) {}
      clearInterval(interval);
    };
  }, []);

  async function handleVerifySearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchError("");
    setSearchedOrder(null);
    setSearchLoading(true);

    try {
      const clean = searchQuery.trim().replace(/^BILL-/, "");
      const s = supabase();
      const { data, error } = await s
        .from("orders")
        .select("*, order_files(*), status_history(*)")
        .or(`order_number.eq.${clean},id.eq.${clean}`)
        .single();

      if (error || !data) {
        setSearchError("No official invoice found matching this reference number or QR code.");
      } else {
        setSearchedOrder(data);
      }
    } catch (err) {
      setSearchError("Verification query error: " + err.message);
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <main className="wrap">
      <div style={{ maxWidth: 960, margin: "20px auto 50px" }}>
        {/* Navigation Breadcrumb */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>
            <Home size={15} />
            <span>Home</span>
          </Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 600 }}>Bill & Invoice Hub</span>
        </div>

        {/* Top Header */}
        <div className="no-print" style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f1f5f9", padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 800, color: "var(--primary)", marginBottom: 10 }}>
            <Receipt size={16} />
            <span>OFFICIAL BILL & INVOICE MANAGEMENT</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>
            Print Bills, Advance Estimates & Invoices
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, marginTop: 6, maxWidth: 620, margin: "6px auto 0" }}>
            Generate advance estimates with 1-click WhatsApp delivery, access verified tax invoices, and verify scannable QR barcodes.
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="no-print" style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("advance")}
            className="btn btn-sm"
            style={{
              background: activeTab === "advance" ? "var(--primary)" : "white",
              color: activeTab === "advance" ? "white" : "var(--text-main)",
              border: "1px solid var(--border)",
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: activeTab === "advance" ? "0 4px 12px rgba(79, 70, 229, 0.3)" : "none"
            }}
          >
            <Sparkles size={16} />
            <span>1. Advance Bill & Quotation</span>
          </button>

          <button
            onClick={() => setActiveTab("invoices")}
            className="btn btn-sm"
            style={{
              background: activeTab === "invoices" ? "var(--primary)" : "white",
              color: activeTab === "invoices" ? "white" : "var(--text-main)",
              border: "1px solid var(--border)",
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: activeTab === "invoices" ? "0 4px 12px rgba(79, 70, 229, 0.3)" : "none"
            }}
          >
            <ShieldCheck size={16} />
            <span>2. Verified Tax Invoices ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("verify")}
            className="btn btn-sm"
            style={{
              background: activeTab === "verify" ? "var(--primary)" : "white",
              color: activeTab === "verify" ? "white" : "var(--text-main)",
              border: "1px solid var(--border)",
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: activeTab === "verify" ? "0 4px 12px rgba(79, 70, 229, 0.3)" : "none"
            }}
          >
            <QrCode size={16} />
            <span>3. QR Code Bill Scanner</span>
          </button>

          <button
            onClick={() => loadInvoices(false)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ padding: "10px 16px", display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Refresh bills and tax invoices from database"
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: ADVANCE BILL GENERATOR */}
        {/* ========================================================================= */}
        {activeTab === "advance" && (
          <div className="animate-fade-in">
            <AdvanceBillGenerator />
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: MY VERIFIED TAX INVOICES ARCHIVE */}
        {/* ========================================================================= */}
        {activeTab === "invoices" && (
          <div className="animate-fade-in">
            {loading ? (
              <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                Loading official tax invoices...
              </div>
            ) : !user ? (
              <div className="card" style={{ textAlign: "center", padding: 40 }}>
                <Receipt size={40} color="var(--primary)" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>Sign in to View Your Tax Invoices</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 420, margin: "6px auto 18px" }}>
                  All verified tax invoices and payment receipts associated with your account are securely stored here.
                </p>
                <Link href="/login" className="btn btn-sm">
                  Sign In
                </Link>
              </div>
            ) : orders.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 40 }}>
                <Receipt size={40} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>No Tax Invoices Yet</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 420, margin: "6px auto 18px" }}>
                  When you submit a print job and complete payment, your official tax invoices will be archived here.
                </p>
                <button onClick={() => setActiveTab("advance")} className="btn btn-sm">
                  Generate Advance Bill
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {orders.map((o) => {
                  const isPaid = ["PAYMENT_VERIFIED", "PRINTING", "QUALITY_CHECK", "READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(o.status);
                  const shareMsg = buildOrderStatusMessage(o, "BILL");
                  const waUrl = buildWhatsAppLink(o.customer_phone, shareMsg);

                  return (
                    <div 
                      key={o.id}
                      className="card"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 16,
                        borderLeft: isPaid ? "4px solid #10b981" : "4px solid #f59e0b"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 900, color: "var(--text-main)" }}>
                            BILL-{o.order_number}
                          </span>
                          <span className={`status-badge status-${o.status}`} style={{ fontSize: 11, padding: "2px 8px" }}>
                            {isPaid ? "PAID & VERIFIED ✅" : o.status?.replaceAll("_", " ")}
                          </span>
                        </div>

                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                          <b>Job:</b> {o.paper_size} {o.color_mode === "COLOR" ? "Colour" : "B&W"} • {o.page_count || 1} pgs × {o.copies} copy(s) • Total: <b>₹{o.total}.00</b>
                        </div>

                        <div style={{ fontSize: 11, color: "var(--text-light)", marginTop: 2 }}>
                          Date: <FormattedDate date={o.created_at} /> • {o.upi_utr ? `UTR: ${o.upi_utr}` : "Advance Order"}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          onClick={() => setSelectedInvoice(o)}
                          className="btn btn-sm"
                          style={{ background: "#0f172a" }}
                        >
                          <Eye size={14} />
                          <span>View Official Bill & QR</span>
                        </button>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-whatsapp btn-sm"
                          title="Share Bill on WhatsApp"
                        >
                          <MessageCircle size={14} />
                          <span>WhatsApp</span>
                        </a>

                        <Link href={`/orders/${o.id}`} className="btn btn-secondary btn-sm">
                          <span>Order Details</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: QR CODE BILL SCANNER & AUTHENTICITY VERIFIER */}
        {/* ========================================================================= */}
        {activeTab === "verify" && (
          <div className="animate-fade-in">
            <div className="card" style={{ maxWidth: 640, margin: "0 auto 24px", textAlign: "center", padding: "28px 32px" }}>
              <QrCode size={36} color="var(--primary)" style={{ margin: "0 auto 10px" }} />
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Invoice Authenticity QR Verifier</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginBottom: 20 }}>
                Scan the QR code on your printed receipt with any phone camera, or enter the Bill / Order reference number below.
              </p>

              <form onSubmit={handleVerifySearch}>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="text"
                    placeholder="e.g. BILL-CPC-20260823-1234 or order UUID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1, fontSize: 14 }}
                    required
                  />
                  <button type="submit" disabled={searchLoading} className="btn">
                    <Search size={15} />
                    <span>{searchLoading ? "Verifying..." : "Verify"}</span>
                  </button>
                </div>
              </form>

              {searchError && (
                <div className="error" style={{ marginTop: 14, textAlign: "left", fontSize: 13 }}>
                  {searchError}
                </div>
              )}
            </div>

            {searchedOrder && (
              <div style={{ marginTop: 24 }}>
                <OfficialTaxInvoice order={searchedOrder} isPublicView={true} />
              </div>
            )}
          </div>
        )}

        {/* Full Official Tax Invoice Modal */}
        {selectedInvoice && (
          <div className="modal-backdrop" onClick={() => setSelectedInvoice(null)}>
            <div style={{ maxWidth: 840, width: "100%", maxHeight: "95vh", overflowY: "auto", position: "relative" }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="no-print"
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  zIndex: 10,
                  background: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                }}
              >
                <X size={18} />
              </button>

              <OfficialTaxInvoice order={selectedInvoice} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
