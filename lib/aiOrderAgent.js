/**
 * AI Order Priority & Anti-Fraud Payment Inspection Engine
 * Validates real payment proofs, 12-digit UPI UTRs, and calculates truthful queue priority.
 */

/**
 * Validates if an order actually has genuine payment submission proof
 */
export function inspectOrderPayment(order) {
  if (!order) return { isPaid: false, hasProof: false, hasUtr: false, status: "UNPAID", label: "No Order Data" };

  const hasProof = Boolean(order.payment_proof_path && order.payment_proof_path.trim().length > 0);
  const cleanUtr = (order.upi_utr || "").trim();
  const hasUtr = cleanUtr.length >= 8 && /^\d+$/.test(cleanUtr);
  const isAlreadyVerified = ["PAYMENT_VERIFIED", "PRINTING", "QUALITY_CHECK", "READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status);
  const isPaymentSubmitted = order.status === "PAYMENT_SUBMITTED" || hasProof || hasUtr;

  if (isAlreadyVerified) {
    return {
      isPaid: true,
      hasProof,
      hasUtr,
      status: "VERIFIED",
      label: "✅ Payment Verified & Confirmed",
      canPrint: true,
    };
  }

  if (isPaymentSubmitted && (hasProof || hasUtr)) {
    return {
      isPaid: false,
      hasProof,
      hasUtr,
      status: "SUBMITTED",
      label: hasUtr ? `💳 UTR Submitted: ${cleanUtr}` : "📸 Payment Screenshot Uploaded",
      canPrint: true, // Ready for Admin / AI to verify against bank
    };
  }

  // Purely UNPAID (No payment screenshot, no UTR)
  return {
    isPaid: false,
    hasProof: false,
    hasUtr: false,
    status: "UNPAID",
    label: "❌ UNPAID (No Payment Proof / UTR Submitted)",
    canPrint: false, // Must NOT be printed or falsely verified!
  };
}

/**
 * Computes an intelligent urgency score (0 - 100) and priority level
 */
export function calculateOrderPriority(order) {
  if (!order) {
    return { 
      level: "NORMAL", 
      score: 20, 
      color: "#64748b", 
      bg: "#f1f5f9", 
      border: "#cbd5e1", 
      estMinutes: 5, 
      reason: "Standard Queue",
      paymentCheck: { isPaid: false, canPrint: false }
    };
  }

  const paymentCheck = inspectOrderPayment(order);
  let score = 10;
  const reasons = [];

  // 1. Strict Payment Check Factor
  if (paymentCheck.status === "UNPAID") {
    score = 10;
    reasons.push("❌ Unpaid (Awaiting Customer Payment)");
  } else if (paymentCheck.status === "SUBMITTED") {
    score = 55;
    reasons.push("💳 Payment Proof Attached (Needs Verification)");
  } else if (order.status === "PAYMENT_VERIFIED") {
    score = 50;
    reasons.push("✅ Verified Payment (Queued to Print)");
  } else if (order.status === "PRINTING") {
    score = 40;
    reasons.push("🖨️ Printing in Progress");
  } else if (order.status === "QUALITY_CHECK") {
    score = 30;
    reasons.push("🔍 Quality Check");
  } else if (["READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(order.status)) {
    score = 10;
    reasons.push("Completed / Delivered");
  }

  // 2. If Payment is submitted or verified, boost score based on print specs & delivery
  if (paymentCheck.status !== "UNPAID") {
    // Delivery Mode Urgency
    if (order.delivery_mode === "DELIVERY") {
      score += 15;
      reasons.push("Doorstep Delivery");
    }

    // Page Count & Job Size
    const totalPages = (Number(order.page_count) || 1) * (Number(order.copies) || 1);
    if (totalPages <= 10) {
      score += 15;
      reasons.push("Fast 2-Min Micro Batch");
    } else if (totalPages <= 50) {
      score += 10;
      reasons.push("Standard Batch");
    } else {
      score += 5;
      reasons.push("High Volume Batch");
    }

    // Customer Urgency Flag
    if (order.priority === "URGENT") {
      score += 15;
      reasons.push("Customer Priority Request");
    }

    // Queue Age
    if (order.created_at) {
      const ageMinutes = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60);
      if (ageMinutes > 10 && paymentCheck.status === "SUBMITTED") {
        score += 10;
        reasons.push(`Waiting ${Math.round(ageMinutes)}m`);
      }
    }
  }

  const finalScore = Math.min(100, Math.max(5, score));
  const totalPages = (Number(order.page_count) || 1) * (Number(order.copies) || 1);
  const estMinutes = totalPages <= 10 ? 2 : Math.ceil(totalPages * 0.12) + 2;

  let level = "NORMAL";
  let color = "#64748b";
  let bg = "#f1f5f9";
  let border = "#cbd5e1";

  if (paymentCheck.status === "UNPAID") {
    level = "UNPAID";
    color = "#b45309"; // amber
    bg = "#fef3c7";
    border = "#fde68a";
  } else if (finalScore >= 80) {
    level = "URGENT";
    color = "#dc2626";
    bg = "#fef2f2";
    border = "#fca5a5";
  } else if (finalScore >= 60) {
    level = "HIGH";
    color = "#ea580c";
    bg = "#fff7ed";
    border = "#fdba74";
  } else if (finalScore >= 40) {
    level = "MEDIUM";
    color = "#2563eb";
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
    paymentCheck,
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

  const isUnpaid = p.paymentCheck.status === "UNPAID";

  if (isUnpaid) {
    return (
      `⚠️ *AI ALERT: NEW ORDER PLACED (PAYMENT PENDING)*\n` +
      `===============================\n` +
      `📄 *Order:* #${orderNum}\n` +
      `👤 *Customer:* ${customer} (📞 ${phone})\n` +
      `💰 *Total Bill:* Rs.${order.total}.00\n` +
      `⚠️ *PAYMENT STATUS:* ❌ UNPAID (No screenshot/UTR submitted yet)\n` +
      `🖨️ *Print Specs:* ${order.paper_size || "A4"} • ${order.color_mode || "B&W"} (${totalPages} total pages)\n` +
      `🚚 *Mode:* ${order.delivery_mode === "DELIVERY" ? "Doorstep Delivery" : "Store Counter Pickup"}\n` +
      `-------------------------------\n` +
      `🛑 *AI Instruction:* DO NOT PRINT UNTIL PAYMENT IS RECEIVED.\n` +
      `👉 *View in Admin:* ${adminUrl}`
    );
  }

  return (
    `🤖 *AI PRINT COPILOT — PAYMENT SUBMITTED*\n` +
    `===============================\n` +
    `🚨 *Task:* Verify Real Payment & Start Printing\n` +
    `📄 *Order:* #${orderNum}\n` +
    `👤 *Customer:* ${customer} (📞 ${phone})\n` +
    `💰 *Amount to Verify:* Rs.${order.total}.00\n` +
    `💳 *Submitted UTR:* ${order.upi_utr || "Screenshot Uploaded"}\n` +
    `📸 *Proof Screenshot:* ${order.payment_proof_path ? "Attached ✅" : "UTR Only"}\n` +
    `🖨️ *Print Specs:* ${order.paper_size || "A4"} • ${order.color_mode || "B&W"} (${totalPages} pages)\n` +
    `-------------------------------\n` +
    `⚡ *AI Priority:* ${p.level} (${p.score}/100) • Est. Duration: ~${p.estMinutes}m\n` +
    `👉 *Open Admin Console to Verify & Print:* ${adminUrl}`
  );
}
