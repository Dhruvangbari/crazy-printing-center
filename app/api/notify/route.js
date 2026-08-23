import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      type, 
      orderId, 
      orderNumber, 
      customerName, 
      customerEmail, 
      customerPhone, 
      total, 
      upiUtr, 
      paperSize,
      colorMode,
      pageCount,
      copies,
      deliveryMode,
      address,
      trackingUrl 
    } = body;

    const invoiceNumber = `BILL-${orderNumber || "CPC"}`;
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // 1. Generate Plaintext SMS Notification Template
    const smsMessage = `Dear ${customerName || "Customer"}, your payment of Rs.${total} for Order #${orderNumber} (UTR: ${upiUtr || "VERIFIED"}) has been VERIFIED by Crazy Printing Center! Your print job is now printing. Track live: ${trackingUrl || "https://crazy-printing-center.vercel.app/track"}`;

    // 2. Generate WhatsApp Direct URL
    const cleanPhone = (customerPhone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(
      `🧾 *OFFICIAL BILL & PAYMENT RECEIPT*\n` +
      `*Crazy Printing Center*\n` +
      `--------------------------------\n` +
      `📄 *Invoice No:* ${invoiceNumber}\n` +
      `👤 *Customer:* ${customerName}\n` +
      `📞 *Phone:* ${customerPhone}\n` +
      `📅 *Date:* ${timestamp}\n` +
      `🖨️ *Job:* ${paperSize || "A4"} ${colorMode || "B&W"} (${pageCount || 1} pgs × ${copies || 1} copies)\n` +
      `💳 *Paid Amount:* Rs.${total}.00\n` +
      `✅ *UTR Ref:* ${upiUtr || "VERIFIED"}\n` +
      `🚚 *Mode:* ${deliveryMode === "DELIVERY" ? "Doorstep Delivery" : "Store Counter Pickup"}\n` +
      `--------------------------------\n` +
      `📍 *Track Live Status:* ${trackingUrl}\n` +
      `Thank you for printing with Crazy Printing Center!`
    )}`;

    // 3. Generate HTML Email Template
    const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 32px 24px; text-align: center; }
          .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: 800; padding: 6px 14px; border-radius: 999px; font-size: 13px; margin-top: 10px; border: 1px solid #a7f3d0; }
          .content { padding: 28px 24px; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th { background: #f8fafc; padding: 10px; text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
          .table td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .total-row { font-size: 18px; font-weight: 800; color: #4f46e5; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          .btn { display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Crazy Printing Center</h1>
            <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Official Tax Invoice & Payment Receipt</p>
            <div class="badge">PAID & VERIFIED</div>
          </div>
          <div class="content">
            <p>Dear <b>${customerName || "Valued Customer"}</b>,</p>
            <p>Your payment of <b>Rs.${total}.00</b> for Order <b>#${orderNumber}</b> has been verified. Your document is now being processed on our production printers.</p>
            
            <div style="background: #f8fafc; padding: 14px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
              <div><b>Invoice No:</b> ${invoiceNumber}</div>
              <div><b>Payment UTR:</b> ${upiUtr || "VERIFIED"}</div>
              <div><b>Date:</b> ${timestamp}</div>
              <div><b>Delivery Mode:</b> ${deliveryMode === "DELIVERY" ? `Doorstep Delivery (${address || ""})` : "Store Counter Pickup"}</div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Pages × Qty</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${paperSize || "A4"} Document Printing (${colorMode || "B&W"})</td>
                  <td>${pageCount || 1} pgs × ${copies || 1} copy</td>
                  <td class="total-row">Rs.${total}.00</td>
                </tr>
              </tbody>
            </table>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${trackingUrl || "https://crazy-printing-center.vercel.app/track"}" class="btn">Track Order Live</a>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 Crazy Printing Center. All rights reserved.</p>
            <p>Designed & Developed by Dhruvang Bari</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`[Notification] Payment verified for Order #${orderNumber} (${customerName}, ${customerPhone}). SMS sent: ${smsMessage}`);

    return NextResponse.json({
      success: true,
      invoiceNumber,
      smsMessage,
      whatsappUrl,
      emailHtml: htmlEmail,
      message: `Invoice generated and notifications dispatched for Order #${orderNumber}`,
    });
  } catch (error) {
    console.error("Notification API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
