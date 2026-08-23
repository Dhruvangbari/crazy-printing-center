"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { 
  playChime, 
  showWebPushNotification, 
  requestWebNotificationPermission 
} from "../lib/webNotifications";
import { 
  Bell, 
  CheckCircle2, 
  Printer, 
  Package, 
  Truck, 
  X, 
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

export default function WebNotificationListener() {
  const [activeToast, setActiveToast] = useState(null);
  const [permState, setPermState] = useState("default");
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermState(Notification.permission);
      if (Notification.permission === "default") {
        // Show banner after 3 seconds on first visit
        const timer = setTimeout(() => setShowPromptBanner(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    const s = supabase();

    // 1. Listen for Order Status updates
    const channel = s
      .channel("web_notifications_channel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new;
          if (!updated) return;

          let title = "Print Job Update";
          let message = `Order #${updated.order_number} status is now ${updated.status?.replaceAll("_", " ")}`;
          let type = "info";

          if (updated.status === "PAYMENT_VERIFIED") {
            title = "Payment Verified ✅";
            message = `Order #${updated.order_number} (₹${updated.total}) has been verified! Sent to high-speed printer.`;
            type = "success";
          } else if (updated.status === "PRINTING") {
            title = "Printing in Progress 🖨️";
            message = `Order #${updated.order_number} is currently printing on the machine.`;
            type = "alert";
          } else if (updated.status === "READY") {
            title = "Order Ready for Collection 🎉";
            message = `Order #${updated.order_number} is packed & ready at our store counter!`;
            type = "success";
          } else if (updated.status === "OUT_FOR_DELIVERY") {
            title = "Out for Delivery 🚚";
            message = `Order #${updated.order_number} has been handed over to the courier partner.`;
            type = "alert";
          } else if (updated.status === "DELIVERED") {
            title = "Order Delivered 📦";
            message = `Order #${updated.order_number} has been delivered successfully!`;
            type = "success";
          }

          // Trigger sound and native OS push
          playChime(type);
          showWebPushNotification({
            title: `Crazy Printing: ${title}`,
            body: message,
            url: `/orders/${updated.id}`,
          });

          // Show floating in-app toast
          setActiveToast({
            id: updated.id,
            orderNumber: updated.order_number,
            title,
            message,
            status: updated.status,
            total: updated.total,
          });

          // Auto-dismiss in-app toast after 8 seconds
          setTimeout(() => {
            setActiveToast((prev) => (prev?.orderNumber === updated.order_number ? null : prev));
          }, 8000);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new;
          if (!newOrder) return;

          playChime("alert");
          showWebPushNotification({
            title: "Crazy Printing: New Order Placed 📄",
            body: `Order #${newOrder.order_number} (₹${newOrder.total}) received.`,
            url: `/orders/${newOrder.id}`,
          });

          setActiveToast({
            id: newOrder.id,
            orderNumber: newOrder.order_number,
            title: "New Order Placed 📄",
            message: `Order #${newOrder.order_number} (₹${newOrder.total}) placed successfully.`,
            status: newOrder.status,
            total: newOrder.total,
          });

          setTimeout(() => setActiveToast(null), 8000);
        }
      )
      .subscribe();

    return () => {
      s.removeChannel(channel);
    };
  }, []);

  async function handleEnablePush() {
    const result = await requestWebNotificationPermission();
    setPermState(result);
    setShowPromptBanner(false);
  }

  return (
    <>
      {/* 1. Optional Permission Prompt Banner */}
      {showPromptBanner && permState === "default" && (
        <div 
          className="no-print animate-fade-in"
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
            zIndex: 9999,
            background: "#0f172a",
            color: "white",
            padding: "14px 18px",
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
            maxWidth: 380,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            border: "1px solid #334155"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bell size={15} color="white" />
              </div>
              <span style={{ fontWeight: 800, fontSize: 14 }}>Enable Web Notifications?</span>
            </div>
            <button
              onClick={() => setShowPromptBanner(false)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 2 }}
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ fontSize: 12, color: "#cbd5e1", margin: 0, lineHeight: 1.5 }}>
            Get instant sound alerts and desktop/mobile notifications when your print job is verified, printing, and ready!
          </p>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={handleEnablePush}
              className="btn btn-sm"
              style={{ flex: 1, fontSize: 12, padding: "6px 12px" }}
            >
              <span>Turn On Notifications</span>
            </button>
            <button
              onClick={() => setShowPromptBanner(false)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 12, padding: "6px 12px", background: "transparent", color: "#94a3b8", border: "1px solid #475569" }}
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* 2. Floating Live Notification Toast */}
      {activeToast && (
        <div
          className="no-print animate-slide-up"
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.96)",
            color: "white",
            padding: "16px 20px",
            borderRadius: 14,
            boxShadow: "0 15px 35px rgba(0,0,0,0.35)",
            backdropFilter: "blur(10px)",
            maxWidth: 380,
            width: "90%",
            border: "1px solid rgba(255,255,255,0.15)",
            animation: "slideInRight 0.3s ease-out"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
              <div style={{ fontWeight: 800, fontSize: 14, color: "#f8fafc" }}>{activeToast.title}</div>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 2 }}
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ fontSize: 12, color: "#cbd5e1", margin: "4px 0 12px", lineHeight: 1.5 }}>
            {activeToast.message}
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #334155", paddingTop: 10 }}>
            <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
              #{activeToast.orderNumber}
            </span>

            <Link
              href={`/orders/${activeToast.id}`}
              onClick={() => setActiveToast(null)}
              className="btn btn-sm"
              style={{ fontSize: 11, padding: "4px 10px", background: "#4f46e5" }}
            >
              <span>View Bill & Track</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
