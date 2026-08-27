"use client";
import React, { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("[CPC Global Error Caught]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", margin: 0, padding: 0, background: "#f8fafc", color: "#0f172a" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ maxWidth: 500, width: "100%", background: "#ffffff", padding: "36px 28px", borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,0.08)", textAlign: "center", border: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: "#4f46e5" }}>
              Dhruvang Crazy Printing Center
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              The application encountered a reloadable condition. Click below to refresh your session.
            </p>
            <button
              onClick={() => {
                if (typeof reset === "function") {
                  reset();
                } else if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
              style={{
                background: "#4f46e5",
                color: "#ffffff",
                border: "none",
                borderRadius: 10,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(79,70,229,0.3)"
              }}
            >
              Reload Website
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
