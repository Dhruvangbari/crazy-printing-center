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

    // 1. Join Realtime Presence Channel for Live Active Users
    const presenceChannel = s.channel("cpc_live_presence", {
      config: {
        presence: {
          key: sessionId,
        },
      },
    });

    presenceChannelRef.current = presenceChannel;

    // 2. Dedicated Live Action Broadcast Channel
    const actionsChannel = s.channel("cpc_live_actions_channel");
    actionsChannelRef.current = actionsChannel;

    actionsChannel.subscribe();

    presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
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
      }
    });

    // 3. Listen to local user action events and broadcast across network
    const handleLocalAction = (e) => {
      const detail = e.detail;
      if (actionsChannel && actionsChannel.state === "joined") {
        actionsChannel.send({
          type: "broadcast",
          event: "user_action",
          payload: detail,
        });
      }
    };

    window.addEventListener("cpc:user_action", handleLocalAction);

    // Heartbeat to update presence every 20 seconds
    const interval = setInterval(() => {
      if (presenceChannel && presenceChannel.state === "joined") {
        const u = getUserDetails();
        presenceChannel.track({
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
    }, 20000);

    return () => {
      window.removeEventListener("cpc:user_action", handleLocalAction);
      clearInterval(interval);
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack();
        s.removeChannel(presenceChannelRef.current);
      }
      if (actionsChannelRef.current) {
        s.removeChannel(actionsChannelRef.current);
      }
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
