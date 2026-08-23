"use client";
import React from "react";
import FormattedDate from "./FormattedDate";
import { 
  FileText, 
  CheckCircle2, 
  Printer, 
  Search, 
  Package, 
  Truck, 
  Sparkles, 
  Zap, 
  Clock, 
  ShieldCheck, 
  Flame,
  Check,
  AlertCircle
} from "lucide-react";

const TIMELINE_STAGES = [
  {
    key: "ORDER_RECEIVED",
    title: "Order Placed",
    subtitle: "Job received in print queue",
    icon: FileText,
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)",
    tag: "QUEUED",
  },
  {
    key: "PAYMENT_VERIFIED",
    title: "Payment Verified",
    subtitle: "UPI UTR cleared & authenticated",
    icon: ShieldCheck,
    color: "#10b981",
    gradient: "linear-gradient(135deg, #059669, #10b981)",
    tag: "VERIFIED",
  },
  {
    key: "PRINTING",
    title: "Laser Printing",
    subtitle: "1200 DPI laser engine active",
    icon: Printer,
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #7c3aed, #a855f7)",
    tag: "IN PRODUCTION",
    hasLaser: true,
  },
  {
    key: "QUALITY_CHECK",
    title: "Quality Inspection",
    subtitle: "Color calibration & binding check",
    icon: Search,
    color: "#ec4899",
    gradient: "linear-gradient(135deg, #db2777, #f472b6)",
    tag: "INSPECTING",
  },
  {
    key: "READY",
    title: "Packed & Ready",
    subtitle: "Counter pickup or packed for courier",
    icon: Package,
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #d97706, #fbbf24)",
    tag: "READY FOR YOU",
  },
  {
    key: "OUT_FOR_DELIVERY",
    title: "Out for Delivery",
    subtitle: "Dispatched with live courier partner",
    icon: Truck,
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, #0891b2, #22d3ee)",
    tag: "EN ROUTE",
  },
  {
    key: "DELIVERED",
    title: "Job Delivered",
    subtitle: "Handed over successfully",
    icon: CheckCircle2,
    color: "#10b981",
    gradient: "linear-gradient(135deg, #059669, #34d399)",
    tag: "COMPLETED",
  },
];

const ORDER_STAGES_SEQUENCE = [
  "ORDER_RECEIVED",
  "PAYMENT_SUBMITTED",
  "PAYMENT_VERIFIED",
  "PRINTING",
  "QUALITY_CHECK",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export default function CrazyLiveTimeline({ order }) {
  if (!order) return null;

  const currentStatus = order.status || "ORDER_RECEIVED";
  const currentIndex = ORDER_STAGES_SEQUENCE.indexOf(currentStatus);

  function getStageState(stageKey) {
    if (currentStatus === "CANCELLED") return stageKey === "ORDER_RECEIVED" ? "completed" : "pending";
    const stageIdx = ORDER_STAGES_SEQUENCE.indexOf(stageKey);
    if (currentIndex > stageIdx) return "completed";
    if (currentIndex === stageIdx) return "active";
    // Handle PAYMENT_SUBMITTED mapping
    if (currentStatus === "PAYMENT_SUBMITTED" && stageKey === "PAYMENT_VERIFIED") return "active";
    return "pending";
  }

  // Calculate overall completion percentage for the animated electric pipeline
  let activeStageIdx = TIMELINE_STAGES.findIndex((s) => s.key === currentStatus);
  if (activeStageIdx === -1) {
    if (currentStatus === "PAYMENT_SUBMITTED") activeStageIdx = 1;
    else if (currentStatus === "CANCELLED") activeStageIdx = 0;
    else activeStageIdx = 0;
  }
  const progressPercent = Math.min(100, Math.max(10, (activeStageIdx / (TIMELINE_STAGES.length - 1)) * 100));

  return (
    <div className="crazy-timeline-card" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)", borderRadius: 20, padding: "28px 24px", color: "white", boxShadow: "0 20px 40px rgba(15, 23, 42, 0.4)", position: "relative", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.1)", marginBottom: 24 }}>
      
      {/* Background Animated Cyber Grid & Ambient Glows */}
      <div style={{ position: "absolute", top: -80, right: -80, width: 220, height: 220, background: "radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(99, 102, 241, 0) 70%)", borderRadius: "50%", filter: "blur(30px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 220, height: 220, background: "radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, rgba(236, 72, 153, 0) 70%)", borderRadius: "50%", filter: "blur(30px)", pointerEvents: "none" }} />

      {/* Top HUD Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 28, position: "relative", zIndex: 2 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="crazy-laser-dot" />
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: "#38bdf8", textTransform: "uppercase" }}>
              LIVE PRODUCTION PIPELINE
            </span>
            <div className="crazy-sound-equalizer">
              <span /><span /><span /><span /><span />
            </div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 900, margin: "6px 0 0", color: "#ffffff", letterSpacing: -0.5, display: "flex", alignItems: "center", gap: 8 }}>
            <span>Order Status:</span>
            <span style={{ color: "#38bdf8", textShadow: "0 0 16px rgba(56, 189, 248, 0.6)" }}>
              {currentStatus.replaceAll("_", " ")}
            </span>
          </h2>
        </div>

        {/* Live Engine Badge */}
        <div style={{ background: "rgba(255, 255, 255, 0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.15)", padding: "8px 16px", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <Zap size={16} color="#eab308" className="crazy-zap-pulse" />
          <div style={{ fontSize: 12 }}>
            <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 800 }}>ENGINE STATUS</div>
            <div style={{ fontWeight: 800, color: "#f8fafc" }}>
              {currentStatus === "PRINTING" ? "⚡ LASER ACTIVE (120 PPM)" : currentStatus === "DELIVERED" ? "✅ ORDER COMPLETED" : "SYNCHRONIZED (LIVE)"}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HORIZONTAL INTERACTIVE CYBER PIPELINE (Desktop / Tablet) */}
      {/* ========================================================================= */}
      <div className="desktop-cyber-pipeline" style={{ position: "relative", margin: "40px 10px 30px", zIndex: 2 }}>
        {/* Background Track Line */}
        <div style={{ position: "absolute", top: 22, left: 30, right: 30, height: 4, background: "rgba(255, 255, 255, 0.12)", borderRadius: 999, zIndex: 0 }} />

        {/* Animated Electric Laser Fill Line */}
        <div
          className="crazy-laser-track"
          style={{
            position: "absolute",
            top: 22,
            left: 30,
            width: `calc(${progressPercent}% - 30px)`,
            height: 4,
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #10b981)",
            borderRadius: 999,
            zIndex: 1,
            boxShadow: "0 0 14px rgba(56, 189, 248, 0.8)",
            transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}
        />

        {/* Pipeline Nodes */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${TIMELINE_STAGES.length}, 1fr)`, position: "relative", zIndex: 2 }}>
          {TIMELINE_STAGES.map((stage, idx) => {
            const state = getStageState(stage.key);
            const isDone = state === "completed";
            const isActive = state === "active";
            const Icon = stage.icon;

            return (
              <div key={stage.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                {/* Node Orb */}
                <div
                  className={`crazy-node-orb ${isActive ? "crazy-active-pulse" : ""} ${isDone ? "crazy-done-glow" : ""}`}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isDone
                      ? "#10b981"
                      : isActive
                      ? stage.gradient
                      : "rgba(15, 23, 42, 0.9)",
                    border: isActive
                      ? "3px solid #ffffff"
                      : isDone
                      ? "2px solid #34d399"
                      : "2px solid rgba(255, 255, 255, 0.2)",
                    boxShadow: isActive
                      ? `0 0 24px ${stage.color}, 0 0 10px #ffffff`
                      : isDone
                      ? "0 0 12px rgba(16, 185, 129, 0.5)"
                      : "none",
                    color: isDone || isActive ? "#ffffff" : "rgba(255, 255, 255, 0.4)",
                    cursor: "default",
                    position: "relative",
                    transition: "all 0.4s ease"
                  }}
                >
                  {isDone ? (
                    <Check size={20} strokeWidth={3} />
                  ) : (
                    <Icon size={20} className={isActive ? "crazy-icon-spin" : ""} />
                  )}

                  {/* Active Radar Ripple Rings */}
                  {isActive && (
                    <>
                      <div className="crazy-ripple-1" style={{ borderColor: stage.color }} />
                      <div className="crazy-ripple-2" style={{ borderColor: stage.color }} />
                    </>
                  )}
                </div>

                {/* Node Title & Tag */}
                <div style={{ marginTop: 12, maxWidth: 100 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? 900 : isDone ? 700 : 500,
                      color: isActive ? "#38bdf8" : isDone ? "#f8fafc" : "#64748b",
                      textShadow: isActive ? "0 0 8px rgba(56, 189, 248, 0.5)" : "none",
                      lineHeight: 1.2
                    }}
                  >
                    {stage.title}
                  </div>

                  {isActive && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 4,
                        fontSize: 9,
                        fontWeight: 900,
                        background: stage.gradient,
                        color: "white",
                        padding: "2px 6px",
                        borderRadius: 999,
                        letterSpacing: 0.5,
                        boxShadow: `0 0 8px ${stage.color}`
                      }}
                    >
                      {stage.tag}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DETAILED LIVE STATUS EVENT LOG */}
      {/* ========================================================================= */}
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255, 255, 255, 0.1)", position: "relative", zIndex: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={13} color="#38bdf8" />
          <span>Real-time Status History & Audit Log ({order.status_history?.length || 0} Events)</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(order.status_history || [])
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((h, i) => {
              const isLatest = i === 0;
              return (
                <div
                  key={h.id || i}
                  className={`crazy-history-row ${isLatest ? "crazy-latest-highlight" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    background: isLatest ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    border: isLatest ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)",
                    padding: "12px 16px",
                    borderRadius: 12,
                    position: "relative",
                    transition: "all 0.3s ease"
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: isLatest ? "#10b981" : "#64748b",
                      marginTop: 5,
                      flexShrink: 0,
                      boxShadow: isLatest ? "0 0 10px #10b981" : "none"
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: isLatest ? "#38bdf8" : "#f1f5f9" }}>
                        {h.status?.replaceAll("_", " ")}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
                        <FormattedDate date={h.created_at} />
                      </div>
                    </div>

                    {h.message && (
                      <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 3, lineHeight: 1.4 }}>
                        {h.message}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CSS STYLES FOR CRAZY ANIMATIONS */}
      {/* ========================================================================= */}
      <style jsx>{`
        .crazy-laser-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 10px #ef4444, 0 0 20px #ef4444;
          animation: pulseLaser 1s infinite alternate;
        }

        @keyframes pulseLaser {
          from { transform: scale(0.8); opacity: 0.7; }
          to { transform: scale(1.3); opacity: 1; }
        }

        .crazy-sound-equalizer {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 12px;
        }

        .crazy-sound-equalizer span {
          width: 2px;
          background: #38bdf8;
          border-radius: 999px;
          animation: equalize 1.2s infinite ease-in-out alternate;
        }
        .crazy-sound-equalizer span:nth-child(1) { height: 40%; animation-delay: 0.1s; }
        .crazy-sound-equalizer span:nth-child(2) { height: 80%; animation-delay: 0.3s; }
        .crazy-sound-equalizer span:nth-child(3) { height: 100%; animation-delay: 0.2s; }
        .crazy-sound-equalizer span:nth-child(4) { height: 60%; animation-delay: 0.4s; }
        .crazy-sound-equalizer span:nth-child(5) { height: 90%; animation-delay: 0.15s; }

        @keyframes equalize {
          0% { height: 20%; }
          100% { height: 100%; }
        }

        .crazy-zap-pulse {
          animation: zapShake 2s infinite ease-in-out;
        }

        @keyframes zapShake {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25) rotate(-5deg); }
        }

        .crazy-active-pulse {
          animation: orbFloat 2.5s infinite ease-in-out;
        }

        @keyframes orbFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .crazy-ripple-1, .crazy-ripple-2 {
          position: absolute;
          top: -6px;
          left: -6px;
          right: -6px;
          bottom: -6px;
          border-radius: 50%;
          border: 2px solid;
          opacity: 0.8;
          animation: rippleExpand 1.8s infinite cubic-bezier(0, 0.2, 0.8, 1);
          pointer-events: none;
        }
        .crazy-ripple-2 {
          animation-delay: 0.9s;
        }

        @keyframes rippleExpand {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        .crazy-laser-track {
          background-size: 200% 200%;
          animation: laserShimmer 2s linear infinite;
        }

        @keyframes laserShimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        .crazy-latest-highlight {
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.25);
        }

        @media (max-width: 768px) {
          .desktop-cyber-pipeline {
            overflow-x: auto;
            padding-bottom: 12px;
          }
        }
      `}</style>
    </div>
  );
}
