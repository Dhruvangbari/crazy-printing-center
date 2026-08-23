/**
 * Official Meta WhatsApp Cloud API Helper for Next.js (Vercel Serverless)
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WHATSAPP_API_VERSION = "v21.0";
const STORE_HELPLINE = "8857871669";
const STORE_NAME = "DHRUVANG CRAZY PRINTING CENTER";
const WEBSITE_URL = "https://crazy-printing-center.vercel.app";

/**
 * Format phone number to international E.164 (e.g. 8857871669 -> 918857871669)
 */
export function formatPhoneNumber(phone) {
  if (!phone) return "";
  const clean = phone.toString().replace(/[^0-9]/g, "");
  if (clean.startsWith("91") && clean.length >= 12) return clean;
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

/**
 * Send standard text message via WhatsApp Cloud API
 */
export async function sendWhatsAppCloudText(to, text) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.log("[WhatsApp Cloud API] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set.");
    return { success: false, error: "Missing WhatsApp credentials" };
  }

  const recipient = formatPhoneNumber(to);
  if (!recipient) return { success: false, error: "Invalid recipient phone number" };

  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: { preview_url: true, body: text },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[WhatsApp Cloud API Error]:", data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[WhatsApp Cloud API Exception]:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send PDF Document attachment (Official Tax Invoice) via WhatsApp Cloud API
 */
export async function sendWhatsAppCloudDocument(to, { documentUrl, fileName, caption }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return { success: false, error: "Missing WhatsApp credentials" };
  }

  const recipient = formatPhoneNumber(to);
  if (!recipient || !documentUrl) {
    return { success: false, error: "Invalid recipient or document URL" };
  }

  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "document",
        document: {
          link: documentUrl,
          filename: fileName || "DHRUVANG-PRINTING-INVOICE.pdf",
          caption: caption || `🧾 Official Tax Invoice from ${STORE_NAME}`,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[WhatsApp Cloud Document Error]:", data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[WhatsApp Cloud Document Exception]:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send Interactive Quick-Reply Buttons
 */
export async function sendWhatsAppCloudInteractiveButtons(to, { bodyText, buttons }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) return { success: false, error: "Missing WhatsApp credentials" };

  const recipient = formatPhoneNumber(to);
  if (!recipient) return { success: false, error: "Invalid recipient phone" };

  try {
    const formattedButtons = (buttons || []).slice(0, 3).map((btn, idx) => ({
      type: "reply",
      reply: {
        id: btn.id || `btn_${idx}`,
        title: (btn.title || "Option").slice(0, 20),
      },
    }));

    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: bodyText },
          action: { buttons: formattedButtons },
        },
      }),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
