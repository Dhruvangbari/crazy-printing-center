"use client";
import { useState, useEffect } from "react";
import { 
  FlaskConical, 
  X, 
  MessageCircle, 
  Phone, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
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
          title="Website Testing Status & Feedback"
          aria-label="Website Testing Status"
        >
          <span className="beta-pulse-dot" />
          <FlaskConical size={14} />
          <span>Testing Mode • Feedback</span>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "white" }}>
                      Live Beta & Testing Notice
                    </h3>
                    <span className="beta-badge-pill">v2.2 Stable Beta</span>
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
              {/* Notice Banner */}
              <div className="beta-alert-box">
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <AlertCircle size={18} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: "#854d0e", marginBottom: 3 }}>
                      Continuous Optimization in Progress
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#713f12", lineHeight: 1.5 }}>
                      Welcome! Our website is currently in <b>active testing and continuous improvement</b>. While core services (document uploads, instant pricing, UPI verification, and live order tracking) are fully operational, some experimental features are still being polished.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feedback Prompt */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Sparkles size={16} color="var(--primary)" />
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-main)" }}>
                    Found something to improve or need assistance?
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                  If you notice any glitches, have suggestions for new paper sizes/features, or need immediate help with your print job, please contact the Admin directly. Your feedback helps us make printing faster for everyone!
                </p>
              </div>

              {/* Action Contact Cards */}
              <div className="beta-contact-grid">
                <a
                  href="https://wa.me/918857871669?text=Hi%20Dhruvang,%20I%20am%20using%20Crazy%20Printing%20Center%20and%20have%20feedback/suggestion:"
                  target="_blank"
                  rel="noreferrer"
                  className="beta-contact-btn beta-wa"
                >
                  <MessageCircle size={16} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>WhatsApp Admin</div>
                    <div style={{ fontSize: 10.5, opacity: 0.85 }}>8857871669 (Instant)</div>
                  </div>
                </a>

                <a
                  href="tel:8857871669"
                  className="beta-contact-btn beta-call"
                >
                  <Phone size={16} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Store Helpline</div>
                    <div style={{ fontSize: 10.5, opacity: 0.85 }}>+91 8857871669</div>
                  </div>
                </a>

                <a
                  href="mailto:dhruvangbari2006@gmail.com?subject=Website%20Feedback%20-%20Crazy%20Printing%20Center"
                  className="beta-contact-btn beta-email"
                >
                  <Mail size={16} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Email Feedback</div>
                    <div style={{ fontSize: 10.5, opacity: 0.85 }}>dhruvangbari2006@gmail.com</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="beta-modal-footer">
              <div style={{ fontSize: 12, color: "var(--text-light)", display: "flex", alignItems: "center", gap: 5 }}>
                <CheckCircle2 size={14} color="#16a34a" />
                <span>Zero spam • Official store support</span>
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
