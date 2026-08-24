import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { calculateOrderPriority } from "../../../../lib/aiOrderAgent";

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, orderId } = body;

    const s = supabase();

    if (!orderId && action !== "QUEUE_INSIGHTS") {
      return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 });
    }

    // 1. Fetch current order
    let order = null;
    if (orderId) {
      const { data, error } = await s
        .from("orders")
        .select("*, profiles(name, phone), order_files(*)")
        .eq("id", orderId)
        .single();

      if (error || !data) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }
      order = data;
    }

    const priorityInfo = order ? calculateOrderPriority(order) : null;

    if (action === "VERIFY_AND_PRINT") {
      const isCashOverride = Boolean(body.isCashOverride);
      const hasProof = Boolean(order.payment_proof_path && order.payment_proof_path.trim().length > 0);
      const cleanUtr = (order.upi_utr || "").trim();
      const hasValidUtr = cleanUtr.length >= 8;
      const isAlreadyVerified = ["PAYMENT_VERIFIED", "PRINTING", "QUALITY_CHECK", "READY"].includes(order.status);

      // BLOCK FAKE / UNPAID ORDERS (unless authorized cash payment at store counter)
      if (!isCashOverride && !hasProof && !hasValidUtr && !isAlreadyVerified) {
        return NextResponse.json({
          success: false,
          error: "❌ Anti-Fraud Check Failed: Customer has NOT uploaded a payment screenshot or entered a 12-digit UPI UTR. Printing cannot be started for unpaid orders.",
          code: "PAYMENT_NOT_SUBMITTED"
        }, { status: 400 });
      }

      // 1. Update order to PRINTING
      const updateData = {
        status: "PRINTING",
        updated_at: new Date().toISOString(),
      };
      if (isCashOverride && !order.upi_utr) {
        updateData.upi_utr = "CASH_AT_COUNTER";
      }

      const { error: updateErr } = await s
        .from("orders")
        .update(updateData)
        .eq("id", order.id);

      if (updateErr) throw updateErr;

      // 2. Insert AI status history note
      const aiNote = isCashOverride
        ? `💵 [Store Counter] Cash payment of ₹${order.total}.00 verified in person at shop counter. Laser print queued.`
        : `🤖 [AI Auto-Pilot] Real Payment Verified (UTR: ${order.upi_utr || "Screenshot Uploaded"}). Laser print queued. Priority: ${priorityInfo.level} (Score: ${priorityInfo.score}). Est. Duration: ~${priorityInfo.estMinutes} mins.`;

      await s.from("status_history").insert({
        order_id: order.id,
        status: "PRINTING",
        message: aiNote,
      });

      return NextResponse.json({
        success: true,
        action: "VERIFY_AND_PRINT",
        newStatus: "PRINTING",
        isCashOverride,
        priorityInfo,
        message: `Order #${order.order_number} verified and transitioned to PRINTING.`,
      });
    }

    if (action === "MARK_READY") {
      const targetStatus = order.delivery_mode === "DELIVERY" ? "OUT_FOR_DELIVERY" : "READY";
      const targetMsg = order.delivery_mode === "DELIVERY"
        ? `🤖 [AI Auto-Pilot] Quality checked & dispatched for express doorstep delivery.`
        : `🤖 [AI Auto-Pilot] Quality checked & ready for zero-wait counter pickup.`;

      const { error: updateErr } = await s
        .from("orders")
        .update({
          status: targetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateErr) throw updateErr;

      await s.from("status_history").insert({
        order_id: order.id,
        status: targetStatus,
        message: targetMsg,
      });

      return NextResponse.json({
        success: true,
        action: "MARK_READY",
        newStatus: targetStatus,
        message: `Order #${order.order_number} marked as ${targetStatus} by AI Copilot.`,
      });
    }

    if (action === "QUEUE_INSIGHTS") {
      const { data: allOrders, error: fetchErr } = await s
        .from("orders")
        .select("*, profiles(name, phone)")
        .not("status", "in", '("DELIVERED","CANCELLED")');

      if (fetchErr) throw fetchErr;

      const scoredOrders = (allOrders || []).map((o) => ({
        ...o,
        aiPriority: calculateOrderPriority(o),
      }));

      scoredOrders.sort((a, b) => b.aiPriority.score - a.aiPriority.score);

      const urgentCount = scoredOrders.filter((o) => o.aiPriority.level === "URGENT").length;
      const totalEstMinutes = scoredOrders.reduce((sum, o) => sum + (o.aiPriority.estMinutes || 3), 0);

      return NextResponse.json({
        success: true,
        urgentCount,
        totalActive: scoredOrders.length,
        totalEstMinutes,
        queue: scoredOrders,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("AI Auto-Pilot API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
