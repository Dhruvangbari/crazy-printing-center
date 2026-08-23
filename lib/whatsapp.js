/**
 * Universal WhatsApp Helper
 * Cleans phone numbers and builds rock-solid WhatsApp click-to-chat links.
 */

export function sanitizePhone(rawPhone) {
  if (!rawPhone) return "";
  let digits = String(rawPhone).replace(/[^0-9]/g, "");
  // Strip leading zero if provided (e.g. 09876543210 -> 9876543210)
  digits = digits.replace(/^0+/, "");
  
  // If 10-digit Indian number, prepend 91 country code
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function buildWhatsAppLink(phone, message) {
  const clean = sanitizePhone(phone);
  const encoded = encodeURIComponent(message || "");
  if (clean) {
    // Direct chat with specific phone number
    return `https://wa.me/${clean}?text=${encoded}`;
  }
  // Share sheet to choose any contact/group
  return `https://wa.me/?text=${encoded}`;
}

export function buildOrderStatusMessage(order, targetStatus) {
  if (!order) return "";
  const currentStatus = targetStatus || order.status;
  const trackingUrl = typeof window !== "undefined" ? `${window.location.origin}/orders/${order.id}` : `https://crazy-printing-center.vercel.app/orders/${order.id}`;
  const customerName = order.customer_name || order.profiles?.name || "Customer";
  const jobSummary = `${order.paper_size || "A4"} ${order.color_mode === "COLOR" ? "Full Colour" : "B&W"} (${order.page_count || 1} pgs × ${order.copies || 1} copies)`;
  const invoiceNum = `BILL-${order.order_number || "CPC"}`;

  if (targetStatus === "BILL") {
    return (
      `🧾 *OFFICIAL TAX INVOICE & RECEIPT*\n` +
      `*Crazy Printing Center*\n` +
      `--------------------------------\n` +
      `📄 *Bill No:* ${invoiceNum}\n` +
      `👤 *Customer:* ${customerName}\n` +
      `📞 *Phone:* ${order.customer_phone || "N/A"}\n` +
      `🖨️ *Print Job:* ${jobSummary}\n` +
      `📚 *Binding:* ${order.binding_type || "None"}\n` +
      `💳 *Total Paid:* Rs.${order.total}.00 (PAID & VERIFIED ✅)\n` +
      `🔢 *Payment UTR:* ${order.upi_utr || "Counter Verified"}\n` +
      `🚚 *Mode:* ${order.delivery_mode === "DELIVERY" ? `Doorstep Delivery (${order.address || ""})` : "Store Counter Pickup"}\n` +
      `--------------------------------\n` +
      `📍 *View & Download Official PDF Bill:* ${trackingUrl}\n\n` +
      `Thank you for choosing Crazy Printing Center!`
    );
  }

  switch (currentStatus) {
    case "PAYMENT_VERIFIED":
      return `✅ *Payment Verified - Crazy Printing Center*\n\nHello ${customerName}, your payment of *₹${order.total}.00* for Order *#${order.order_number}* (UTR: ${order.upi_utr || "Verified"}) is confirmed! 🎉\n\n📄 *Job:* ${jobSummary}\n🖨️ *Status:* Queued for High-Speed Printing\n\n📍 *Track Live Status & View Bill:* ${trackingUrl}\n\nThank you!`;
    case "PRINTING":
      return `🖨️ *Printing in Progress - Crazy Printing Center*\n\nHello ${customerName}, your print job *#${order.order_number}* (${jobSummary}) is currently on the printer!\n\n📍 *Track Live Progress:* ${trackingUrl}\n\nCrazy Printing Center`;
    case "QUALITY_CHECK":
      return `🔍 *Quality Check - Crazy Printing Center*\n\nHello ${customerName}, printing for Order *#${order.order_number}* is complete! We are now performing quality & binding checks.\n\n📍 *Track Live Progress:* ${trackingUrl}\n\nCrazy Printing Center`;
    case "READY":
      return `🎉 *Order Ready - Crazy Printing Center*\n\nHello ${customerName}, your print order *#${order.order_number}* is printed, packed, and *READY* for pickup!\n\n🏪 *Store Counter:* Crazy Printing Center\n💰 *Total Paid:* ₹${order.total}.00\n\n📍 *View Bill & Pickup Pass:* ${trackingUrl}\n\nSee you soon!`;
    case "OUT_FOR_DELIVERY":
      return `🚚 *Out for Delivery - Crazy Printing Center*\n\nHello ${customerName}, your print package for Order *#${order.order_number}* has been dispatched with our courier partner!\n\n📍 *Delivery Address:* ${order.address || "Your Address"}\n🛵 *Track Live Delivery Route:* ${trackingUrl}\n\nPlease keep your phone available.`;
    case "DELIVERED":
      return `📦 *Order Delivered - Crazy Printing Center*\n\nHello ${customerName}, your print order *#${order.order_number}* has been successfully delivered! ✅\n\n🧾 *Download Tax Invoice:* ${trackingUrl}\n\nThank you for printing with Crazy Printing Center!`;
    default:
      return `🧾 *Order Update - Crazy Printing Center*\n\nHello ${customerName}, update for Order #${order.order_number}:\nStatus: *${order.status?.replaceAll("_", " ")}*\nTotal: ₹${order.total}.00\n\n📍 *Track Live & View Bill:* ${trackingUrl}`;
  }
}

export function openWhatsAppChat(phone, message) {
  const url = buildWhatsAppLink(phone, message);
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
