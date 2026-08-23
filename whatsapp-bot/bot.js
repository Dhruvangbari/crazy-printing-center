const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys");
const qrcodeTerminal = require("qrcode-terminal");
const QRCode = require("qrcode");
const express = require("express");
const cors = require("cors");
const pino = require("pino");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// Load Environment Variables
const envLocalPath = path.resolve(__dirname, "..", ".env.local");
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bwdutjtvyboyiaicjqid.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const STORE_HELPLINE = "8857871669";
const STORE_NAME = "DHRUVANG CRAZY PRINTING CENTER";
const WEBSITE_URL = "https://crazy-printing-center.vercel.app";

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const logger = pino({ level: "silent" });
let sock = null;
let currentQrCode = "";
let isConnected = false;
let connectedUser = null;

const PORT = process.env.BOT_PORT || 5001;
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// -------------------------------------------------------------
// BAILEYS WHATSAPP CLIENT INITIALIZATION
// -------------------------------------------------------------
async function startWhatsAppBot() {
  const authFolder = path.resolve(__dirname, "..", "whatsapp_auth");
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log("\n======================================================");
  console.log("🤖 " + STORE_NAME + " — BAILEYS WHATSAPP BOT");
  console.log("Using Baileys v" + version.join(".") + ", isLatest: " + isLatest);
  console.log("Store Helpline: +91 " + STORE_HELPLINE);
  console.log("======================================================\n");

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    generateHighQualityLinkPreview: true,
    browser: ["Dhruvang Crazy Printing", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQrCode = qr;
      console.log("\n📱 SCAN THIS QR CODE WITH YOUR WHATSAPP (Settings > Linked Devices):\n");
      qrcodeTerminal.generate(qr, { small: true });
      console.log("\n👉 Or open Web Pairing Page: http://localhost:" + PORT + "/qr\n");
    }

    if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("⚠️ Connection closed. Reconnecting:", shouldReconnect);
      isConnected = false;
      connectedUser = null;
      if (shouldReconnect) {
        setTimeout(startWhatsAppBot, 3000);
      }
    } else if (connection === "open") {
      isConnected = true;
      currentQrCode = "";
      connectedUser = sock.user?.id?.split(":")[0] || "Connected";
      console.log("\n✅ WHATSAPP BOT CONNECTED SUCCESSFULLY! Connected as: " + connectedUser);
      console.log("🚀 HTTP Bridge running at http://localhost:" + PORT + "\n");
    }
  });

  // -------------------------------------------------------------
  // INCOMING MESSAGE HANDLER & AUTO-REPLY ENGINE
  // -------------------------------------------------------------
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const senderJid = msg.key.remoteJid;
      if (senderJid.endsWith("@g.us") || senderJid === "status@broadcast") continue;

      const senderPhone = senderJid.replace("@s.whatsapp.net", "");
      const messageContent = 
        msg.message.conversation || 
        msg.message.extendedTextMessage?.text || 
        msg.message.imageMessage?.caption || 
        msg.message.documentMessage?.caption || 
        "";

      const text = messageContent.trim();
      const lower = text.toLowerCase();

      const isDocument = !!msg.message.documentMessage;
      const isImage = !!msg.message.imageMessage;

      console.log("📩 Incoming message from " + senderPhone + ': "' + (text || (isDocument ? "[Document]" : isImage ? "[Image]" : "")) + '"');

      try {
        // 1. Handle Document Uploads (Direct Print via WhatsApp)
        if (isDocument || isImage) {
          const docName = msg.message.documentMessage?.fileName || (isImage ? "Uploaded-Photo.jpg" : "Document.pdf");
          await sock.sendMessage(senderJid, {
            text: 
              "📄 *Document Received:* _" + docName + "_\n\n" +
              "Thank you for sending your file to *" + STORE_NAME + "*! 🖨️\n\n" +
              "To configure print settings (Color/B&W, copies, binding) and get an instant bill, please click below:\n" +
              "📍 *Order Portal:* " + WEBSITE_URL + "/order\n\n" +
              "Or reply with your requirements (e.g., _\"2 copies, Black & White, Single sided\"_).\n" +
              "📞 Helpline / Support: +91 " + STORE_HELPLINE
          });
          continue;
        }

        // 2. Order Tracking (e.g. "TRACK CPC-1234", "ORD-1234", "STATUS 1234")
        if (
          (lower.startsWith("track") || lower.startsWith("status") || lower.startsWith("order") || /^[A-Z0-9-]{4,15}$/i.test(text)) &&
          supabase
        ) {
          const searchKey = text.replace(/track|status|order/gi, "").trim();
          if (searchKey.length >= 3) {
            const { data: order, error } = await supabase
              .from("orders")
              .select("*, order_files(*)")
              .or("order_number.ilike.%" + searchKey + "%,id.ilike.%" + searchKey + "%")
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

              await sock.sendMessage(senderJid, {
                text:
                  "📦 *ORDER STATUS — " + STORE_NAME + "*\n" +
                  "------------------------------------\n" +
                  "🏷️ *Order Number:* #" + order.order_number + "\n" +
                  "👤 *Customer:* " + (order.customer_name || "Valued Customer") + "\n" +
                  "📊 *Current Status:* *" + statusEmoji + "*\n" +
                  "📄 *Specs:* " + (order.paper_size || "A4") + " • " + (order.color_mode === "COLOR" ? "Full Colour" : "Black & White") + " • " + (order.copies || 1) + " copies\n" +
                  "💰 *Total Amount:* Rs." + order.total + ".00 (" + (order.status === "SUBMITTED" ? "Payment Due" : "PAID ✅") + ")\n" +
                  "🚚 *Fulfillment:* " + (order.delivery_mode === "DELIVERY" ? "Doorstep Delivery" : "Store Counter Pickup") + "\n" +
                  "------------------------------------\n" +
                  "📍 *Live Tracking & PDF Bill:* " + WEBSITE_URL + "/orders/" + order.id + "\n" +
                  "📞 Helpline: +91 " + STORE_HELPLINE
              });
              continue;
            }
          }
        }

        // 3. Price / Rates Inquiry
        if (lower.includes("price") || lower.includes("rate") || lower === "2" || lower === "rates") {
          await sock.sendMessage(senderJid, {
            text:
              "💰 *OFFICIAL RATE CARD — " + STORE_NAME + "*\n" +
              "------------------------------------\n" +
              "🖨️ *Printing & Xerox:*\n" +
              "• Black & White (A4): *Rs.3.00* / page\n" +
              "• Full Colour (A4): *Rs.5.00* / page\n" +
              "• A3 Poster / Drawing: *1.8x Standard*\n" +
              "• Duplex (Double Sided): *10% Discount*\n\n" +
              "📚 *Finishing & Binding:*\n" +
              "• Corner Staple: *Rs.5.00*\n" +
              "• Spiral Binding: *Rs.30.00*\n" +
              "• Soft Thermal Book Binding: *Rs.50.00*\n\n" +
              "⚡ *Express Priority Rush Queue:* +Rs.20.00\n" +
              "🚚 *Doorstep Delivery:* Available for all orders\n" +
              "------------------------------------\n" +
              "📍 *Calculate Instant Advance Bill:* " + WEBSITE_URL + "/bills\n" +
              "📞 Helpline: +91 " + STORE_HELPLINE
          });
          continue;
        }

        // 4. Advance Bill Link
        if (lower.includes("bill") || lower === "3") {
          await sock.sendMessage(senderJid, {
            text:
              "🧾 *ADVANCE PROFORMA BILL & ESTIMATE*\n\n" +
              "You can generate an official advance bill with live UPI payment QR code here:\n" +
              "👉 " + WEBSITE_URL + "/bills\n\n" +
              "Or reply with: _\"Pages: 50, Color: Color, Copies: 2\"_ for an instant quotation."
          });
          continue;
        }

        // 5. Location & Address
        if (lower.includes("location") || lower.includes("address") || lower === "4" || lower.includes("timing") || lower.includes("shop")) {
          await sock.sendMessage(senderJid, {
            text:
              "🏪 *STORE LOCATION & COUNTER — " + STORE_NAME + "*\n" +
              "------------------------------------\n" +
              "📍 *Address:* Main Campus Avenue, Opp. Tech Park, Vercel Central\n" +
              "⏰ *Timings:* Mon - Sat: 8:00 AM – 10:00 PM | Sun: 9:00 AM – 8:00 PM\n" +
              "📞 *Helpline / WhatsApp:* +91 " + STORE_HELPLINE + "\n" +
              "🌐 *Website:* " + WEBSITE_URL + "\n" +
              "------------------------------------\n" +
              "Drop by anytime for instant document printing, binding, and Xerox!"
          });
          continue;
        }

        // 6. Support / Contact
        if (lower.includes("support") || lower.includes("contact") || lower === "5" || lower.includes("owner") || lower.includes("dhruvang")) {
          await sock.sendMessage(senderJid, {
            text:
              "👤 *DIRECT STORE SUPPORT — " + STORE_NAME + "*\n\n" +
              "Founder & Owner: *Dhruvang Bari*\n" +
              "📞 *Direct Helpline:* +91 " + STORE_HELPLINE + "\n" +
              "✉️ *Email:* dhruvangbari2006@gmail.com\n\n" +
              "Leave your message right here and Dhruvang will reply shortly!"
          });
          continue;
        }

        // Default: Welcome Menu
        await sock.sendMessage(senderJid, {
          text:
            "🖨️ *WELCOME TO " + STORE_NAME + "* 🖨️\n" +
            "_High-Speed Commercial Digital Printing & Documentation_\n\n" +
            "How can we help you today? Reply with a number or keyword:\n\n" +
            "1️⃣ *Track Order* — Send TRACK <OrderNumber> (e.g. TRACK CPC-7890)\n" +
            "2️⃣ *Rate Card & Prices* — Send RATES\n" +
            "3️⃣ *Advance Bill Calculator* — Send BILL\n" +
            "4️⃣ *Store Location & Timings* — Send LOCATION\n" +
            "5️⃣ *Customer Care Helpline* — Send SUPPORT\n\n" +
            "📄 *Want to print a document?*\n" +
            "Simply attach and send your *PDF, Word file, or Photo* right here in this chat!\n\n" +
            "📞 Helpline: +91 " + STORE_HELPLINE + "\n" +
            "🌐 Portal: " + WEBSITE_URL
        });
      } catch (err) {
        console.error("Error processing message:", err);
      }
    }
  });
}

// -------------------------------------------------------------
// EXPRESS HTTP BRIDGE API (Port 5001)
// -------------------------------------------------------------

// 1. Status & Health Check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    bot: STORE_NAME,
    connected: isConnected,
    user: connectedUser,
    helpline: STORE_HELPLINE,
    pairingUrl: "http://localhost:" + PORT + "/qr"
  });
});

// 2. Web QR Code Pairing Page
app.get("/qr", async (req, res) => {
  if (isConnected) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>` + STORE_NAME + ` WhatsApp Bot</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8fafc;">
        <div style="max-width: 480px; margin: 0 auto; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
          <div style="font-size: 48px;">✅</div>
          <h1 style="color: #059669; margin: 10px 0;">WhatsApp Bot Connected!</h1>
          <p style="color: #64748b;">Connected as: <b>` + connectedUser + `</b></p>
          <div style="margin-top: 20px; padding: 12px; background: #ecfdf5; border-radius: 8px; color: #065f46; font-size: 13px;">
            🤖 ` + STORE_NAME + ` Baileys WhatsApp Engine is active and auto-replying to customers!
          </div>
        </div>
      </body>
      </html>
    `);
  }

  if (!currentQrCode) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><meta http-equiv="refresh" content="3"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2>Generating WhatsApp QR Code...</h2>
        <p>Please wait a moment (page will refresh automatically).</p>
      </body>
      </html>
    `);
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(currentQrCode, { width: 300, margin: 2 });
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pair WhatsApp Bot — ` + STORE_NAME + `</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="15">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 30px 15px; background: #0f172a; color: white;">
        <div style="max-width: 440px; margin: 0 auto; background: #1e293b; padding: 28px; border-radius: 20px; border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <h2 style="margin: 0 0 8px; color: #38bdf8;">` + STORE_NAME + `</h2>
          <h3 style="margin: 0 0 16px; font-weight: 600; color: #e2e8f0;">Scan to Connect WhatsApp Bot 📲</h3>
          
          <div style="background: white; padding: 16px; border-radius: 14px; display: inline-block; box-shadow: 0 8px 20px rgba(0,0,0,0.3);">
            <img src="` + qrDataUrl + `" alt="WhatsApp QR Code" style="width: 260px; height: 260px; display: block;" />
          </div>

          <div style="margin-top: 20px; text-align: left; font-size: 13px; color: #94a3b8; background: rgba(0,0,0,0.2); padding: 14px; border-radius: 10px; line-height: 1.5;">
            1. Open WhatsApp on your phone (e.g. <b>` + STORE_HELPLINE + `</b>)<br/>
            2. Tap <b>Settings</b> or <b>Menu (⋮)</b> &gt; <b>Linked Devices</b><br/>
            3. Tap <b>Link a Device</b> and point your camera at this QR code!
          </div>
          
          <div style="margin-top: 14px; font-size: 11px; color: #64748b;">
            Refreshes automatically every 15 seconds.
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (e) {
    res.status(500).send("Error rendering QR code");
  }
});

// 3. Send Text Message API Endpoint
app.post("/api/send-message", async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: "Missing phone or message" });
  }

  if (!sock || !isConnected) {
    return res.status(503).json({ error: "WhatsApp bot is not connected. Please scan QR at /qr" });
  }

  try {
    const clean = phone.replace(/[^0-9]/g, "");
    const formatted = clean.startsWith("91") ? clean : clean.length === 10 ? ("91" + clean) : clean;
    const jid = formatted + "@s.whatsapp.net";

    await sock.sendMessage(jid, { text: message });
    console.log("✅ Sent WhatsApp message to " + formatted);
    res.json({ success: true, recipient: formatted });
  } catch (err) {
    console.error("Failed to send WhatsApp message:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Send Document / PDF Bill API Endpoint
app.post("/api/send-document", async (req, res) => {
  const { phone, documentBase64, documentUrl, fileName, caption } = req.body;
  if (!phone || (!documentBase64 && !documentUrl)) {
    return res.status(400).json({ error: "Missing phone or document content" });
  }

  if (!sock || !isConnected) {
    return res.status(503).json({ error: "WhatsApp bot is not connected. Please scan QR at /qr" });
  }

  try {
    const clean = phone.replace(/[^0-9]/g, "");
    const formatted = clean.startsWith("91") ? clean : clean.length === 10 ? ("91" + clean) : clean;
    const jid = formatted + "@s.whatsapp.net";

    let docBuffer;
    if (documentBase64) {
      const cleanB64 = documentBase64.replace(/^data:application\/pdf;base64,/, "");
      docBuffer = Buffer.from(cleanB64, "base64");
    } else if (documentUrl) {
      const response = await fetch(documentUrl);
      const arrayBuffer = await response.arrayBuffer();
      docBuffer = Buffer.from(arrayBuffer);
    }

    await sock.sendMessage(jid, {
      document: docBuffer,
      mimetype: "application/pdf",
      fileName: fileName || "DHRUVANG-PRINTING-INVOICE.pdf",
      caption: caption || ("🧾 Official Tax Invoice from " + STORE_NAME)
    });

    console.log("✅ Sent WhatsApp PDF document to " + formatted);
    res.json({ success: true, recipient: formatted });
  } catch (err) {
    console.error("Failed to send WhatsApp document:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start Express Bridge & WhatsApp Bot
app.listen(PORT, () => {
  console.log("🌐 WhatsApp HTTP Bridge listening on port " + PORT);
  startWhatsAppBot();
});
