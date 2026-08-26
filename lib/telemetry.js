"use client";

// Universal Telemetry & Live User Tracking Helper
export function getSessionId() {
  if (typeof window === "undefined") return "server-session";
  try {
    let sid = sessionStorage.getItem("cpc_live_session_id");
    if (!sid) {
      sid = "sess_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      sessionStorage.setItem("cpc_live_session_id", sid);
    }
    return sid;
  } catch (e) {
    return "guest-" + Date.now();
  }
}

export function getDeviceInfo() {
  if (typeof window === "undefined") return "Server";
  const ua = navigator.userAgent;
  let device = "Desktop";
  if (/mobile/i.test(ua)) device = "Mobile";
  else if (/tablet|ipad/i.test(ua)) device = "Tablet";

  let browser = "Browser";
  if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/edg/i.test(ua)) browser = "Edge";

  return `${device} (${browser})`;
}

export async function logUserAction(actionType, actionTitle, details = {}) {
  if (typeof window === "undefined") return;

  try {
    const sessionId = getSessionId();
    const deviceInfo = getDeviceInfo();
    const pageUrl = window.location.pathname + window.location.search;

    // Get cached customer identity if available
    let customerName = "Guest Visitor";
    let customerPhone = "";
    let customerEmail = "";
    let userId = null;

    try {
      const saved = JSON.parse(localStorage.getItem("cpc_saved_customer_data") || "{}");
      if (saved.name) customerName = saved.name;
      if (saved.phone) customerPhone = saved.phone;
    } catch (e) {}

    const payload = {
      sessionId,
      actionType,
      actionTitle,
      details,
      pageUrl,
      deviceInfo,
      userName: customerName,
      userPhone: customerPhone,
      userEmail: customerEmail,
      userId,
      timestamp: new Date().toISOString(),
    };

    // 1. Dispatch custom DOM event so LiveUserTracker can immediately broadcast to Supabase Realtime
    const event = new CustomEvent("cpc:user_action", { detail: payload });
    window.dispatchEvent(event);

    // 2. Post to telemetry log API asynchronously without blocking UI
    fetch("/api/telemetry/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (e) {
    console.debug("[Telemetry Error]", e);
  }
}
