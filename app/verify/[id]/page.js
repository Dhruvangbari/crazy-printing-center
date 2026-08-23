"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import OfficialTaxInvoice from "../../../components/OfficialTaxInvoice";
import VirtualDeliveryMap from "../../../components/VirtualDeliveryMap";
import { 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft, 
  Home, 
  Clock, 
  Printer, 
  FileText,
  AlertCircle
} from "lucide-react";
import FormattedDate from "../../../components/FormattedDate";

export default function VerifyBillPage() {
  const p = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [proofUrl, setProofUrl] = useState(null);

  useEffect(() => {
    async function loadVerifiedOrder() {
      if (!p?.id) return;
      try {
        const s = supabase();
        const { data, error } = await s
          .from("orders")
          .select("*, order_files(*), status_history(*)")
          .eq("id", p.id)
          .single();

        if (error || !data) {
          setErrorMsg("No official record found for this Invoice ID. It may be invalid or expired.");
        } else {
          setOrder(data);

          if (data.payment_proof_path) {
            try {
              const { data: pub } = s.storage
                .from("payment-proofs")
                .getPublicUrl(data.payment_proof_path);
              if (pub?.publicUrl) setProofUrl(pub.publicUrl);
            } catch (e) {}
          }
        }
      } catch (err) {
        setErrorMsg("Failed to verify invoice: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadVerifiedOrder();
  }, [p?.id]);

  if (loading) {
    return (
      <main className="wrap">
        <div className="card" style={{ maxWidth: 600, margin: "60px auto", textAlign: "center", padding: 50 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Verifying Official Invoice Authenticity...</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Connecting to Crazy Printing Center secure database ledger
          </p>
        </div>
      </main>
    );
  }

  if (errorMsg || !order) {
    return (
      <main className="wrap">
        <div className="card" style={{ maxWidth: 550, margin: "60px auto", textAlign: "center", padding: 40 }}>
          <AlertCircle size={48} color="var(--danger)" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Invoice Verification Failed</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
            {errorMsg || "The requested invoice QR code does not match any genuine printing record in our ledger."}
          </p>
          <div style={{ marginTop: 24 }}>
            <Link href="/" className="btn btn-sm">
              <Home size={14} />
              <span>Back to Crazy Printing Center</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div style={{ maxWidth: 840, margin: "20px auto" }}>
        {/* Navigation Breadcrumbs */}
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>
              <Home size={15} />
              <span>Home</span>
            </Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 600 }}>QR Verification Portal</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#ecfdf5", color: "#065f46", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, border: "1px solid #a7f3d0" }}>
            <ShieldCheck size={15} />
            <span>GENUINE DIGITAL RECORD</span>
          </div>
        </div>

        {/* Official Tax Invoice & Scannable QR Code */}
        <OfficialTaxInvoice order={order} proofUrl={proofUrl} isPublicView={true} />

        {/* Live Delivery Route & Progress */}
        <div className="no-print" style={{ marginTop: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🚚</span>
            <span>Live Order Fulfillment & Delivery Route</span>
          </div>
          <VirtualDeliveryMap order={order} />
        </div>

        {/* Status Timeline History */}
        <div className="card no-print" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: 16 }}>
              <Clock size={16} color="var(--primary)" />
              <span>Official Status Verification Timeline</span>
            </h3>
          </div>

          <div className="timeline">
            {(order.status_history || [])
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
              .map((h) => (
                <div className="timeline-step" key={h.id}>
                  <div className="timeline-dot" />
                  <div className="timeline-title">{h.status?.replaceAll("_", " ")}</div>
                  <div className="timeline-time">
                    <FormattedDate date={h.created_at} />
                  </div>
                  {h.message && <div className="timeline-msg">{h.message}</div>}
                </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
