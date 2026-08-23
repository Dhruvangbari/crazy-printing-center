import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { 
  sendWhatsAppCloudText, 
  sendWhatsAppCloudInteractiveButtons 
} from "../../../../lib/whatsappCloud";

const STORE_NAME = "DHRUVANG CRAZY PRINTING CENTER";
const STORE_HELPLINE = "8857871669";
const WEBSITE_URL = "https://crazy-printing-center.vercel.app";

// ------------------------------------------------------------------
// 1. GET: META WEBHOOK VERIFICATION ENDPOINT
// ------------------------------------------------------------------
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "dhruvang_crazy_printing_2026";

    if (mode === "subscribe" && token === expectedToken) {
      console.log("✅ [Meta WhatsApp Webhook] Verified successfully!");
      return new Response(challenge, { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}

// ------------------------------------------------------------------
// 2. POST: INCOMING WHATSAPP MESSAGE PROCESSOR
// ------------------------------------------------------------------
export async function POST(req) {
  try {
    const body = await req.json();

    // Check if this is a WhatsApp API event
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "not_whatsapp" }, { status: 404 });
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value || !value.messages) continue;

        const messages = value.messages || [];
        for (const message of messages) {
          const from = message.from; // Customer phone (e.g. 918857871669)
          const messageType = message.type;
          
          let userText = "";
          if (messageType === "text") {
            userText = message.text?.body || "";
          } else if (messageType === "interactive") {
            userText = message.interactive?.button_reply?.id || message.interactive?.button_reply?.title || "";
          } else if (messageType === "document" || messageType === "image") {
            userText = "[DOCUMENT_UPLOADED]";
          }

          const text = userText.trim();
          const lower = text.toLowerCase();
          console.log(`📩 [WhatsApp Cloud API] Received from ${from}: "${text}"`);

          // Initialize Supabase Client
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

          // 1. Document / Image uploaded via WhatsApp
          if (messageType === "document" || messageType === "image" || text === "[DOCUMENT_UPLOADED]") {
            const fileName = message.document?.filename || "Your Document";
            await sendWhatsAppCloudText(from, 
              `📄 *Document Received:* _${fileName}_\n\n` +
              `Thank you for sending your file to *${STORE_NAME}*! 🖨️\n\n` +
              `To configure print options (Color/B&W, paper size, binding) and get an instant bill, please submit your job here:\n` +
              `📍 *Instant Order Portal:* ${WEBSITE_URL}/order\n\n` +
              `📞 Helpline / Support: +91 ${STORE_HELPLINE}`
            );
            continue;
          }

          // 2. Order Tracking Command (e.g., "TRACK CPC-1234", "ORD-1234", "status 1234")
          if (
            lower.startsWith("track") || 
            lower.startsWith("status") || 
            lower.startsWith("order") || 
            /^[A-Z0-9-]{4,15}$/i.test(text)
          ) {
            const searchKey = text.replace(/track|status|order/gi, "").trim();
            if (searchKey.length >= 3 && supabase) {
              const { data: order } = await supabase
                .from("orders")
                .select("*, order_files(*)")
                .or(`order_number.ilike.%${searchKey}%,id.ilike.%${searchKey}%`)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (order) {
                const statusEmoji = {
                  SUBMITTED: "📝 Submitted (Payment Pending)",
                  PAYMENT_VERIFIED: "💳 Payment Verified",
                  PRINTING: "🖨️ Printing in Progress",
                  QUALITY_CHECK: "🔍 Quality Checked",
                  READY: "📦 Ready for Pickup",
                  OUT_FOR_DELIVERY: "🚚 Out for Delivery",
                  DELIVERED: "✅ Delivered Successfully",
                  CANCELLED: "❌ Order Cancelled"
                }[order.status] || order.status;

                await sendWhatsAppCloudText(from,
                  `📦 *ORDER STATUS — ${STORE_NAME}*\n` +
                  `------------------------------------\n` +
                  `🏷️ *Order Number:* #${order.order_number}\n` +
                  `👤 *Customer:* ${order.customer_name || "Valued Customer"}\n` +
                  `📊 *Current Status:* *${statusEmoji}*\n` +
                  `📄 *Specs:* ${order.paper_size || "A4"} • ${order.color_mode === "COLOR" ? "Full Colour" : "Black & White"} • ${order.copies || 1} copies\n` +
                  `💰 *Total Amount:* Rs.${order.total}.00 (${order.status === "SUBMITTED" ? "Payment Due" : "PAID ✅"})\n` +
                  `🚚 *Fulfillment:* ${order.delivery_mode === "DELIVERY" ? "Doorstep Delivery" : "Store Counter Pickup"}\n` +
                  `------------------------------------\n` +
                  `📍 *Live Tracking & PDF Bill:* ${WEBSITE_URL}/orders/${order.id}\n` +
                  `📞 Helpline: +91 ${STORE_HELPLINE}`
                );
                continue;
              }
            }
          }

          // 3. Price / Rates Inquiry
          if (lower.includes("rate") || lower.includes("price") || lower === "rates" || lower === "btn_rates") {
            await sendWhatsAppCloudText(from,
              `💰 *OFFICIAL RATE CARD — ${STORE_NAME}*\n` +
              `------------------------------------\n` +
              `🖨️ *Printing & Xerox:*\n` +
              `• Black & White (A4): *Rs.3.00* / page\n` +
              `• Full Colour (A4): *Rs.5.00* / page\n` +
              `• A3 Poster / Drawing: *1.8x Standard*\n` +
              `• Duplex (Double Sided): *10% Discount*\n\n` +
              `📚 *Finishing & Binding:*\n` +
              `• Corner Staple: *Rs.5.00*\n` +
              `• Spiral Binding: *Rs.30.00*\n` +
              `• Soft Thermal Book Binding: *Rs.50.00*\n\n` +
              `⚡ *Express Priority Rush Queue:* +Rs.20.00\n` +
              `🚚 *Doorstep Delivery:* Available for all orders\n` +
              `------------------------------------\n` +
              `📍 *Calculate Instant Advance Bill:* ${WEBSITE_URL}/bills\n` +
              `📞 Helpline: +91 ${STORE_HELPLINE}`
            );
            continue;
          }

          // 4. Advance Bill Link
          if (lower.includes("bill") || lower === "btn_bill") {
            await sendWhatsAppCloudText(from,
              `🧾 *ADVANCE PROFORMA BILL & ESTIMATE*\n\n` +
              `You can generate an official advance bill with live UPI QR payment code here:\n` +
              `👉 ${WEBSITE_URL}/bills\n\n` +
              `Or reply with your requirements (e.g. _"50 pages, Color, 2 sets"_) for a quote.`
            );
            continue;
          }

          // 5. Store Location & Timings
          if (lower.includes("location") || lower.includes("address") || lower.includes("timing") || lower.includes("shop")) {
            await sendWhatsAppCloudText(from,
              `🏪 *STORE LOCATION & COUNTER — ${STORE_NAME}*\n` +
              `------------------------------------\n` +
              `📍 *Address:* Main Campus Avenue, Opp. Tech Park, Vercel Central\n` +
              `⏰ *Timings:* Mon - Sat: 8:00 AM – 10:00 PM | Sun: 9:00 AM – 8:00 PM\n` +
              `📞 *Helpline / WhatsApp:* +91 ${STORE_HELPLINE}\n` +
              `🌐 *Website:* ${WEBSITE_URL}\n` +
              `------------------------------------\n` +
              `Drop by anytime for instant document printing, binding, and Xerox!`
            );
            continue;
          }

          // 6. Direct Support
          if (lower.includes("support") || lower.includes("contact") || lower.includes("owner") || lower.includes("dhruvang")) {
            await sendWhatsAppCloudText(from,
              `👤 *DIRECT STORE SUPPORT — ${STORE_NAME}*\n\n` +
              `Founder & Owner: *Dhruvang Bari*\n` +
              `📞 *Direct Helpline:* +91 ${STORE_HELPLINE}\n` +
              `✉️ *Email:* dhruvangbari2006@gmail.com\n\n` +
              `Leave your message right here and Dhruvang will reply shortly!`
            );
            continue;
          }

          // Default: Interactive Menu
          await sendWhatsAppCloudInteractiveButtons(from, {
            bodyText:
              `🖨️ *WELCOME TO ${STORE_NAME}* 🖨️\n` +
              `_High-Speed Commercial Digital Printing & Documentation_\n\n` +
              `How can we assist you today?\n\n` +
              `• To *Track an Order*, send \`TRACK <OrderNumber>\` (e.g. \`TRACK CPC-7890\`)\n` +
              `• To *Print a Document*, simply attach your PDF or Photo here!\n` +
              `• Or select an option below:\n\n` +
              `📞 Helpline: +91 ${STORE_HELPLINE}`,
            buttons: [
              { id: "btn_rates", title: "💰 Rate Card" },
              { id: "btn_bill", title: "🧾 Advance Bill" },
              { id: "btn_support", title: "📞 Support" }
            ]
          });
        }
      }
    }

    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook Error]:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
