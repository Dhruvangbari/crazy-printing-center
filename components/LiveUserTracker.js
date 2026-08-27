"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getSessionId, getDeviceInfo, logUserAction } from "../lib/telemetry";

export default function LiveUserTracker() {
  const pathname = usePathname();
  const presenceChannelRef = useRef(null);
  const actionsChannelRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const s = supabase();
    const sessionId = getSessionId();
    const deviceInfo = getDeviceInfo();

    // Helper to get fresh user details
    function getUserDetails() {
      let name = "Guest Visitor";
      let phone = "";
      let email = "";
      try {
        const saved = JSON.parse(localStorage.getItem("cpc_saved_customer_data") || "{}");
        if (saved.name) name = saved.name;
        if (saved.phone) phone = saved.phone;
      } catch (e) {}
      return { name, phone, email };
    }

    try {
      // 1. Join Realtime Presence Channel for Live Active Users
      const presenceChannel = s?.channel ? s.channel("cpc_live_presence", {
        config: {
          presence: {
            key: sessionId,
          },
        },
      }) : null;

      presenceChannelRef.current = presenceChannel;

      // 2. Dedicated Live Action Broadcast Channel
      const actionsChannel = s?.channel ? s.channel("cpc_live_actions_channel") : null;
      actionsChannelRef.current = actionsChannel;

      if (actionsChannel?.subscribe) {
        actionsChannel.subscribe();
      }

      if (presenceChannel?.subscribe) {
        presenceChannel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            try {
              const u = getUserDetails();
              await presenceChannel.track({
                sessionId,
                name: u.name,
                phone: u.phone,
                email: u.email,
                currentPath: pathname || window.location.pathname,
                deviceInfo,
                locality: "Boisar, Maharashtra",
                onlineAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
                status: pathname === "/order" ? "Placing Order" : pathname.startsWith("/orders/") ? "Viewing Order Tracker" : "Browsing",
              });
            } catch (err) {}
          }
        });
      }
    } catch (e) {
      console.warn("Presence channel setup error:", e);
    }

    // 3. Listen to local user action events and broadcast across network
    const handleLocalAction = (e) => {
      try {
        const detail = e.detail;
        if (actionsChannelRef.current && actionsChannelRef.current.state === "joined") {
          actionsChannelRef.current.send({
            type: "broadcast",
            event: "user_action",
            payload: detail,
          });
        }
      } catch (err) {}
    };

    window.addEventListener("cpc:user_action", handleLocalAction);

    // Initial announce ping to telemetry
    try {
      const u = getUserDetails();
      fetch("/api/telemetry/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          actionType: "PAGE_VIEW",
          actionTitle: `Visitor active on ${window.location.pathname}`,
          pageUrl: window.location.pathname,
          deviceInfo,
          userName: u.name,
          userPhone: u.phone,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch (e) {}

    // Heartbeat to update presence & persistent active state every 20 seconds
    const interval = setInterval(() => {
      try {
        const u = getUserDetails();
        if (presenceChannelRef.current && presenceChannelRef.current.state === "joined") {
          presenceChannelRef.current.track({
            sessionId,
            name: u.name,
            phone: u.phone,
            email: u.email,
            currentPath: window.location.pathname,
            deviceInfo,
            locality: "Boisar, Maharashtra",
            onlineAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            status: window.location.pathname === "/order" ? "Placing Order" : "Active",
          });
        }

        // Also ping telemetry DB so admin sees active users across devices reliably
        fetch("/api/telemetry/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            actionType: "HEARTBEAT",
            actionTitle: `Active browsing ${window.location.pathname}`,
            pageUrl: window.location.pathname,
            deviceInfo,
            userName: u.name,
            userPhone: u.phone,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});
      } catch (err) {}
    }, 20000);

    return () => {
      window.removeEventListener("cpc:user_action", handleLocalAction);
      clearInterval(interval);
      try {
        if (presenceChannelRef.current) {
          presenceChannelRef.current?.untrack?.();
          if (s?.removeChannel) s.removeChannel(presenceChannelRef.current);
        }
      } catch (e) {}
      try {
        if (actionsChannelRef.current && s?.removeChannel) {
          s.removeChannel(actionsChannelRef.current);
        }
      } catch (e) {}
    };
  }, []);

  // Track page view action on navigation
  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;

    // Log Page View Action
    let pageLabel = "Visited Home";
    if (pathname === "/order") pageLabel = "Started New Order (Upload & Specs)";
    else if (pathname.startsWith("/orders/")) pageLabel = `Viewing Order Tracking & Bill (#${pathname.split("/").pop()})`;
    else if (pathname === "/orders") pageLabel = "Browsing My Orders History";
    else if (pathname === "/bills") pageLabel = "Viewing Official Tax Invoices & Advance Bills";
    else if (pathname === "/track") pageLabel = "Using Live Order Tracker Search";
    else if (pathname === "/customer-service" || pathname === "/support") pageLabel = "Opened 24/7 Customer Helpline";
    else if (pathname === "/admin") pageLabel = "Admin Dashboard Session";

    logUserAction("PAGE_VIEW", pageLabel, { path: pathname });

    // Update presence path
    if (presenceChannelRef.current && presenceChannelRef.current.state === "joined") {
      let name = "Guest Visitor";
      let phone = "";
      try {
        const saved = JSON.parse(localStorage.getItem("cpc_saved_customer_data") || "{}");
        if (saved.name) name = saved.name;
        if (saved.phone) phone = saved.phone;
      } catch (e) {}

      presenceChannelRef.current.track({
        sessionId: getSessionId(),
        name,
        phone,
        currentPath: pathname,
        deviceInfo: getDeviceInfo(),
        locality: "Boisar, Maharashtra",
        lastActiveAt: new Date().toISOString(),
        status: pathname === "/order" ? "Placing Order" : "Browsing",
      });
    }
  }, [pathname]);

  return null;
}
