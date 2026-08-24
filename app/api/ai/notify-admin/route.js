import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { calculateOrderPriority, generateAiAdminPaymentAlert } from "../../../../lib/aiOrderAgent";
import { sendWhatsAppCloudText } from "../../../../lib/whatsappCloud";
import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, orderData } = body;

    let order = orderData;

    if (!order && orderId) {
      const s = supabase();
      const { data, error } = await s
        .from("orders")
        .select("*, profiles(name, phone), order_files(*)")
        .eq("id", orderId)
        .single();

      if (!error && data) {
        order = data;
      }
    }

    if (!order) {
      return NextResponse.json({ success: false, error: "Order details not found" }, { status: 400 });
    }

    const priorityInfo = calculateOrderPriority(order);
    const alertMessage = generateAiAdminPaymentAlert(order, priorityInfo);
    const adminPhone = "918857871669";
    const adminEmail = "dhruvangbari2006@gmail.com";

    let whatsappSent = false;
    let emailSent = false;

    // 1. Meta WhatsApp Cloud API
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      try {
        const cloudRes = await sendWhatsAppCloudText(adminPhone, alertMessage);
        if (cloudRes.success) whatsappSent = true;
      } catch (e) {
        console.warn("[AI Alert] Cloud API warning:", e.message);
      }
    }

    // 2. Local Baileys Bot Bridge Fallback
    if (!whatsappSent) {
      try {
        const botPort = process.env.BOT_PORT || 5001;
        const res = await fetch(`http://127.0.0.1:${botPort}/api/send-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: adminPhone, message: alertMessage }),
          signal: AbortSignal.timeout(2500),
        });
        if (res.ok) whatsappSent = true;
      } catch (e) {}
    }

    // 3. Email Dispatch via Nodemailer (if configured)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true",
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        await transporter.sendMail({
          from: `"AI Print Copilot" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `🚨 [AI Alert] Verify Payment & Print #${order.order_number || "CPC"} (${priorityInfo.level} - ₹${order.total})`,
          text: alertMessage,
        });
        emailSent = true;
      } catch (e) {
        console.warn("[AI Alert] Email dispatch warning:", e.message);
      }
    }

    // Generated WhatsApp direct URL
    const encodedAlert = encodeURIComponent(alertMessage);
    const adminWhatsAppUrl = `https://wa.me/918857871669?text=${encodedAlert}`;

    return NextResponse.json({
      success: true,
      priorityInfo,
      whatsappSent,
      emailSent,
      alertMessage,
      adminWhatsAppUrl,
      orderNumber: order.order_number,
      message: `AI evaluated order #${order.order_number || "CPC"} (Priority: ${priorityInfo.level} - ${priorityInfo.score}/100). Admin alert dispatched.`,
    });
  } catch (error) {
    console.error("AI Notify Admin API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
