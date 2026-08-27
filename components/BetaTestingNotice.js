"use client";
import { useState, useEffect } from "react";
import { 
  FlaskConical, 
  X, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Users,
  ShieldCheck
} from "lucide-react";

export default function BetaTestingNotice() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    let dismissed = false;
    try {
      dismissed = typeof window !== "undefined" && sessionStorage.getItem("crazy_print_beta_notice_dismissed") === "true";
    } catch (e) {
      dismissed = false;
    }

    if (!dismissed) {
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleDismiss() {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("crazy_print_beta_notice_dismissed", "true");
      }
    } catch (e) {}
    setIsOpen(false);
  }

  function handleReopen() {
    setIsOpen(true);
  }

  if (!hasMounted) return null;

  return (
    <>
      {/* Floating Mini Beta Pill (Always accessible at bottom left) */}
      {!isOpen && (
        <button
          onClick={handleReopen}
          className="beta-floating-trigger no-print"
          title="Testing Department & Feedback"
          aria-label="Testing Department & Feedback"
        >
          <span className="beta-pulse-dot" />
          <FlaskConical size={14} />
          <span>Testing Department • Feedback</span>
        </button>
      )}

      {/* Modal Backdrop & Popup Card */}
      {isOpen && (
        <div 
          className="beta-modal-backdrop no-print"
          onClick={handleDismiss}
        >
          <div 
            className="beta-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Gradient Header */}
            <div className="beta-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="beta-icon-badge">
                  <FlaskConical size={22} color="#ffffff" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "white" }}>
                      Testing Department Notice
                    </h3>
                    <span className="beta-badge-pill">Quality & Beta Testing</span>
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
                    Dhruvang Crazy Printing Center
                  </p>
                </div>
              </div>

              <button 
                onClick={handleDismiss}
                className="beta-close-btn"
                aria-label="Close Notice"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="beta-modal-body">
              {/* Testing Department Officers Box */}
              <div 
                style={{
                  background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(99, 102, 241, 0.03))",
                  border: "1.5px solid rgba(99, 102, 241, 0.25)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  marginBottom: 16
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Users size={18} color="var(--primary)" />
                  <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text-main)" }}>
                    Testing Department
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <span 
                    style={{
                      background: "white",
                      border: "1px solid #e0e7ff",
                      color: "var(--primary-dark)",
                      fontWeight: 700,
                      fontSize: 13,
                      padding: "4px 12px",
                      borderRadius: 20,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                    }}
                  >
                    <ShieldCheck size={14} color="var(--primary)" />
                    Danish Khan
                  </span>
                  <span 
                    style={{
                      background: "white",
                      border: "1px solid #e0e7ff",
                      color: "var(--primary-dark)",
                      fontWeight: 700,
                      fontSize: 13,
                      padding: "4px 12px",
                      borderRadius: 20,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                    }}
                  >
                    <ShieldCheck size={14} color="var(--primary)" />
                    Tirthesh Bari
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.45 }}>
                  The Testing Department conducts continuous quality audits, UI responsiveness checks, and feature verification across the platform.
                </p>
              </div>

              {/* Notice Banner */}
              <div className="beta-alert-box">
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <AlertCircle size={18} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: "#854d0e", marginBottom: 3 }}>
                      Continuous Testing & Optimization in Progress
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#713f12", lineHeight: 1.5 }}>
                      Welcome! Our website is currently undergoing <b>active testing and continuous improvement</b>. Core services (file uploads, auto pricing, UPI checkout, and live order tracking) are fully operational.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feedback Prompt */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Sparkles size={16} color="var(--primary)" />
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-main)" }}>
                    Found an issue or have suggestions?
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                  If you notice any bugs, pricing discrepancies, or have suggestions for new features, please send your feedback via email to our testing & support desk.
                </p>
              </div>

              {/* Action Contact Cards - Email Only */}
              <div className="beta-contact-grid" style={{ gridTemplateColumns: "1fr" }}>
                <a
                  href="mailto:dhruvangbari2006@gmail.com?subject=Website%20Testing%20Feedback%20-%20Crazy%20Printing%20Center"
                  className="beta-contact-btn beta-email"
                  style={{ justifyContent: "center", padding: "12px 18px" }}
                >
                  <Mail size={18} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Email Testing & Support Desk</div>
                    <div style={{ fontSize: 11.5, opacity: 0.85 }}>dhruvangbari2006@gmail.com</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="beta-modal-footer">
              <div style={{ fontSize: 12, color: "var(--text-light)", display: "flex", alignItems: "center", gap: 5 }}>
                <CheckCircle2 size={14} color="#16a34a" />
                <span>Verified Quality & Support</span>
              </div>

              <button
                onClick={handleDismiss}
                className="btn btn-sm"
                style={{ padding: "8px 20px", fontWeight: 800, fontSize: 13 }}
              >
                <span>Got It, Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
