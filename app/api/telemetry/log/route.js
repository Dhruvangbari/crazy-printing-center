import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      actionType,
      actionTitle,
      details,
      pageUrl,
      deviceInfo,
      userName,
      userPhone,
      userEmail,
      userId,
    } = body;

    // Get client IP address from headers
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    const s = supabase();
    const { data, error } = await s.from("activity_logs").insert({
      session_id: sessionId || "anon-session",
      action_type: actionType || "UNKNOWN_ACTION",
      action_title: actionTitle || "User Activity",
      details: details || {},
      page_url: pageUrl || "/",
      device_info: deviceInfo || "Unknown Device",
      ip_address: ipAddress,
      user_name: userName || "Guest Visitor",
      user_phone: userPhone || null,
      user_email: userEmail || null,
      user_id: userId || null,
    });

    if (error) {
      // Table might not exist yet or permission error, return silent success with warning
      return NextResponse.json({ success: false, warning: error.message }, { status: 200 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 200 });
  }
}
