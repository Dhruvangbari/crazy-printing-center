import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "../../../../../lib/supabase";

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload.payment.entity;
      const orderId = payment.notes?.orderId;
      const paymentId = payment.id;
      const amount = payment.amount ? payment.amount / 100 : null;

      if (orderId) {
        const s = supabase();
        await s
          .from("orders")
          .update({
            status: "PAYMENT_VERIFIED",
            upi_utr: paymentId,
            payment_proof_path: `razorpay://${paymentId}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        await s.from("status_history").insert({
          order_id: orderId,
          status: "PAYMENT_VERIFIED",
          message: `Webhook: Payment of ₹${amount || ""} captured via Razorpay Gateway (Ref: ${paymentId}).`,
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[Razorpay Webhook Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
