"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Phone, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function Error({ error, reset }) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log the error safely to console for debugging
    console.error("[CPC Client Error Caught]:", error);
  }, [error]);

  function handleReload() {
    try {
      if (typeof reset === "function") {
        reset();
      } else if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (e) {
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  }

  return (
    <main className="wrap" style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "40px 20px" }}>
      <div 
        className="card" 
        style={{ 
          maxWidth: 560, 
          width: "100%", 
          textAlign: "center", 
          padding: "36px 28px",
          boxShadow: "0 20px 45px rgba(0,0,0,0.12)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)"
        }}
      >
        <div 
          style={{ 
            width: 56, 
            height: 56, 
            borderRadius: "50%", 
            background: "#fee2e2", 
            color: "#dc2626", 
            display: "grid", 
            placeItems: "center", 
            margin: "0 auto 18px",
            boxShadow: "0 0 20px rgba(220, 38, 38, 0.2)"
          }}
        >
          <AlertTriangle size={28} />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, letterSpacing: -0.3 }}>
          Dhruvang Crazy Printing Center
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          A momentary display glitch was caught. Don&apos;t worry — your print orders, uploads, and data remain completely safe.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          <button 
            type="button" 
            onClick={handleReload} 
            className="btn"
            style={{ fontWeight: 800, padding: "10px 22px" }}
          >
            <RefreshCw size={16} />
            <span>Reload Application</span>
          </button>

          <Link href="/" className="btn btn-secondary" style={{ padding: "10px 20px" }}>
            <Home size={16} />
            <span>Return to Home</span>
          </Link>
        </div>

        {/* Optional Error Diagnostic Details */}
        {error?.message && (
          <div style={{ marginBottom: 18, textAlign: "left" }}>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-light)",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                margin: "0 auto"
              }}
            >
              <span>{showDetails ? "Hide technical diagnostic" : "Show technical diagnostic"}</span>
              {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showDetails && (
              <div 
                style={{ 
                  marginTop: 8, 
                  padding: "10px 14px", 
                  background: "#0f172a", 
                  color: "#f8fafc", 
                  borderRadius: "var(--radius-sm)", 
                  fontSize: 11, 
                  fontFamily: "monospace", 
                  wordBreak: "break-all",
                  maxHeight: 140,
                  overflowY: "auto"
                }}
              >
                {error.message || "Unknown client exception"}
                {error.digest && <div style={{ color: "#94a3b8", marginTop: 4 }}>Digest: {error.digest}</div>}
              </div>
            )}
          </div>
        )}

        <div 
          style={{ 
            background: "#f8fafc", 
            border: "1px solid var(--border)", 
            borderRadius: "var(--radius-md)", 
            padding: "14px 16px",
            textAlign: "left"
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-main)", marginBottom: 4 }}>
            Need Immediate Support?
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            Call or WhatsApp the store desk directly:
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a 
              href="tel:8857871669" 
              className="btn btn-sm btn-success" 
              style={{ fontSize: 11, padding: "6px 12px", textDecoration: "none" }}
            >
              <Phone size={13} />
              <span>Call 8857871669</span>
            </a>
            <a 
              href="https://wa.me/918857871669?text=Hello%20Dhruvang%20Crazy%20Printing%2C%20I%20am%20facing%20an%20issue." 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-sm btn-whatsapp" 
              style={{ fontSize: 11, padding: "6px 12px", textDecoration: "none" }}
            >
              <MessageCircle size={13} />
              <span>WhatsApp Store</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
