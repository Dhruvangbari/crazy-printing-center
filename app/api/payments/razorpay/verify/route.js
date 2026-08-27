import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "../../../../../lib/supabase";

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      orderId, 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature,
      amount
    } = body;

    if (!orderId || !razorpayPaymentId) {
      return NextResponse.json(
        { success: false, error: "Missing verification parameters" },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Verify cryptographic HMAC signature if secret is configured and not in mock mode
    if (keySecret && razorpaySignature && !razorpayOrderId.startsWith("order_mock_")) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (generatedSignature !== razorpaySignature) {
        console.error("[Razorpay Signature Verification Failed]");
        return NextResponse.json(
          { success: false, error: "Invalid payment signature verification failed." },
          { status: 400 }
        );
      }
    }

    // Connect to Supabase and update order to PAYMENT_VERIFIED
    const s = supabase();

    // 1. Update order status and payment reference
    const { error: orderError } = await s
      .from("orders")
      .update({
        status: "PAYMENT_VERIFIED",
        upi_utr: razorpayPaymentId,
        payment_proof_path: `razorpay://${razorpayPaymentId}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (orderError) {
      console.warn("[Supabase Order Update Warning]", orderError.message);
    }

    // 2. Insert verified timeline history record
    const totalDisplay = amount ? `₹${amount}` : "online";
    try {
      await s.from("status_history").insert({
        order_id: orderId,
        status: "PAYMENT_VERIFIED",
        message: `💳 King / Razorpay Online Payment of ${totalDisplay} verified automatically (Gateway Ref: ${razorpayPaymentId}). Order sent to printing queue!`,
      });
    } catch (e) {
      console.warn("[Supabase Status History Insert Warning]", e.message);
    }

    // 3. Notify Admin & customer via WhatsApp / Email asynchronously
    try {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://crazy-printing-center.vercel.app"}/api/ai/notify-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId,
          orderData: {
            id: orderId,
            status: "PAYMENT_VERIFIED",
            upi_utr: razorpayPaymentId,
          }
        })
      }).catch(() => {});
    } catch (e) {}

    return NextResponse.json({
      success: true,
      verified: true,
      paymentId: razorpayPaymentId,
      message: "Payment successfully verified and order queued for printing!",
    });
  } catch (error) {
    console.error("[Razorpay Verification Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
