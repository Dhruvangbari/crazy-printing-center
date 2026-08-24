/**
 * AI Order Priority & Dispatch Engine
 * Client-safe calculations, urgency ranking, and alert generator
 */

/**
 * Computes an intelligent urgency score (0 - 100) and priority level based on:
 * - Payment status (awaiting verification vs verified)
 * - Fulfillment type (express delivery vs counter pickup)
 * - Document size & page volume
 * - Queue age (time waiting)
 * - Color / Binding complexity
 */
export function calculateOrderPriority(order) {
  if (!order) return { level: "NORMAL", score: 20, color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1", estMinutes: 5, reason: "Standard Queue" };

  let score = 20;
  const reasons = [];

  // 1. Payment Verification Status
  if (order.status === "PAYMENT_SUBMITTED") {
    score += 45;
    reasons.push("Payment Submitted (Awaiting Verification)");
  } else if (order.status === "ORDER_RECEIVED") {
    score += 30;
    reasons.push("New Order Created");
  } else if (order.status === "PAYMENT_VERIFIED") {
    score += 35;
    reasons.push("Payment Verified (Ready to Print)");
  } else if (order.status === "PRINTING") {
    score += 25;
    reasons.push("Printing in Progress");
  } else if (order.status === "QUALITY_CHECK") {
    score += 20;
    reasons.push("Quality Check");
  } else if (["READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(order.status)) {
    score = 10;
    reasons.push("Completed / In Transit");
  }

  // 2. Delivery Mode Urgency
  if (order.delivery_mode === "DELIVERY") {
    score += 15;
    reasons.push("Doorstep Express Delivery");
  }

  // 3. Page Count & Job Size (Fast Turnaround prioritization)
  const totalPages = (Number(order.page_count) || 1) * (Number(order.copies) || 1);
  let estMinutes = 3;

  if (totalPages <= 10) {
    score += 15;
    estMinutes = 2;
    reasons.push("Fast 2-Min Micro Batch (≤10 pgs)");
  } else if (totalPages <= 50) {
    score += 10;
    estMinutes = Math.ceil(totalPages * 0.15) + 2;
    reasons.push("Standard Batch");
  } else {
    score += 5;
    estMinutes = Math.ceil(totalPages * 0.12) + 5;
    reasons.push("High Volume Batch (>50 pgs)");
  }

  // 4. Time In Queue Aging Factor
  if (order.created_at) {
    const ageMinutes = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60);
    if (ageMinutes > 15 && !["DELIVERED", "CANCELLED", "READY"].includes(order.status)) {
      score += 15;
      reasons.push(`Waiting in queue for ${Math.round(ageMinutes)}m`);
    } else if (ageMinutes > 5 && order.status === "PAYMENT_SUBMITTED") {
      score += 10;
      reasons.push("Pending verification > 5m");
    }
  }

  // 5. Special Priority Flag
  if (order.priority === "URGENT") {
    score += 20;
    reasons.push("Customer Requested Urgent Priority");
  }

  // Clamp score between 0 and 100
  const finalScore = Math.min(100, Math.max(5, score));

  let level = "NORMAL";
  let color = "#64748b"; // slate
  let bg = "#f1f5f9";
  let border = "#cbd5e1";

  if (finalScore >= 80) {
    level = "URGENT";
    color = "#dc2626"; // red
    bg = "#fef2f2";
    border = "#fca5a5";
  } else if (finalScore >= 60) {
    level = "HIGH";
    color = "#ea580c"; // orange
    bg = "#fff7ed";
    border = "#fdba74";
  } else if (finalScore >= 40) {
    level = "MEDIUM";
    color = "#2563eb"; // blue
    bg = "#eff6ff";
    border = "#93c5fd";
  }

  return {
    level,
    score: finalScore,
    color,
    bg,
    border,
    estMinutes,
    reason: reasons.slice(0, 2).join(" • ") || "Normal Queue",
    reasons,
  };
}

/**
 * Generates structured AI Alert message for Admin WhatsApp
 */
export function generateAiAdminPaymentAlert(order, priorityInfo) {
  const p = priorityInfo || calculateOrderPriority(order);
  const totalPages = (Number(order.page_count) || 1) * (Number(order.copies) || 1);
  const orderNum = order.order_number || order.id?.slice(0, 8) || "N/A";
  const customer = order.customer_name || order.profiles?.name || "Customer";
  const phone = order.customer_phone || order.profiles?.phone || "N/A";
  const adminUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/admin`
    : `https://crazy-printing-center.vercel.app/admin`;

  return (
    `🤖 *AI PRINT COPILOT — ACTION REQUIRED*\n` +
    `===============================\n` +
    `🚨 *Task:* Verify Payment & Start Printing\n` +
    `📄 *Order:* #${orderNum}\n` +
    `👤 *Customer:* ${customer} (📞 ${phone})\n` +
    `💰 *Amount to Verify:* Rs.${order.total}.00\n` +
    `💳 *Submitted UTR:* ${order.upi_utr || "Screenshot Uploaded"}\n` +
    `🖨️ *Print Specs:* ${order.paper_size || "A4"} • ${order.color_mode === "COLOR" ? "Full Colour" : "Black & White"} • ${order.sides === "DOUBLE" ? "Double Sided" : "Single Sided"}\n` +
    `📄 *Job Volume:* ${order.page_count || 1} pgs × ${order.copies || 1} copies (${totalPages} total pages)\n` +
    `🚚 *Fulfillment:* ${order.delivery_mode === "DELIVERY" ? "Doorstep Delivery" : "Store Counter Pickup"}\n` +
    `-------------------------------\n` +
    `⚡ *AI Priority Score:* ${p.score}/100 (${p.level})\n` +
    `⏱️ *Est. Print Time:* ~${p.estMinutes} mins\n` +
    `💡 *AI Reason:* ${p.reason}\n` +
    `-------------------------------\n` +
    `👉 *Open Admin Dashboard to Verify:* ${adminUrl}\n` +
    `Dhruvang Crazy Printing Center • Automated AI Dispatcher`
  );
}
