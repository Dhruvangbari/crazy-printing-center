import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { Resend } from "resend";

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
    const targetEmail = customerEmail || "dhruvangbari2006@gmail.com";

    // 1. Plaintext SMS Message
    const smsMessage = `Dear ${customerName || "Customer"}, your payment of Rs.${total} for Order #${orderNumber} (UTR: ${upiUtr || "VERIFIED"}) has been VERIFIED by Dhruvang Crazy Printing Center! Your print job is now printing. Track live: ${trackingUrl || "https://crazy-printing-center.vercel.app/track"}`;

    // 2. WhatsApp Direct Link
    const cleanPhone = (customerPhone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(
      `🧾 *OFFICIAL BILL & PAYMENT RECEIPT*\n` +
      `*Dhruvang Crazy Printing Center*\n` +
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
      `Thank you for printing with Dhruvang Crazy Printing Center!`
    )}`;

    // 3. Formatted HTML Email Invoice
    const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #0f172a; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
          .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 36px 24px; text-align: center; }
          .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: 800; padding: 6px 16px; border-radius: 999px; font-size: 13px; margin-top: 12px; border: 1px solid #a7f3d0; }
          .body { padding: 32px 24px; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 10px; margin: 18px 0; font-size: 13px; line-height: 1.6; }
          .table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px; }
          .table th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 12px; color: #475569; border-bottom: 2px solid #e2e8f0; }
          .table td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; }
          .total { font-size: 20px; font-weight: 900; color: #4f46e5; }
          .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          .btn { display: inline-block; background: #4f46e5; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 800; font-size: 15px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 style="margin: 0; font-size: 26px; font-weight: 900;">Dhruvang Crazy Printing Center</h1>
            <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Official Tax Invoice & Payment Receipt</p>
            <div class="badge">PAID & VERIFIED ✅</div>
          </div>

          <div class="body">
            <p style="font-size: 15px;">Dear <b>${customerName || "Valued Customer"}</b>,</p>
            <p style="color: #475569; line-height: 1.6;">
              Your payment of <b>₹${total}.00</b> for Order <b>#${orderNumber}</b> has been <b>VERIFIED</b>. Your print job has been queued on our high-speed production printer.
            </p>

            <div class="info-box">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span><b>Invoice Number:</b></span>
                <span>${invoiceNumber}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span><b>Payment Mode:</b></span>
                <span>UPI (UTR: <b>${upiUtr || "VERIFIED"}</b>)</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span><b>Date & Time:</b></span>
                <span>${timestamp}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span><b>Fulfillment:</b></span>
                <span>${deliveryMode === "DELIVERY" ? `Doorstep Delivery (${address || ""})` : "Store Counter Pickup"}</span>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Job Description</th>
                  <th>Pages × Qty</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <b>${paperSize || "A4"} Document Printing</b>
                    <div style="font-size: 12px; color: #64748b;">${colorMode === "COLOR" ? "Full Colour" : "Black & White"}</div>
                  </td>
                  <td>${pageCount || 1} pgs × ${copies || 1} copy</td>
                  <td style="text-align: right; font-weight: 700;">₹${total}.00</td>
                </tr>
                <tr style="background: #f8fafc;">
                  <td colspan="2" style="font-weight: 800;">GRAND TOTAL PAID</td>
                  <td style="text-align: right;" class="total">₹${total}.00</td>
                </tr>
              </tbody>
            </table>

            <div style="text-align: center;">
              <a href="${trackingUrl || "https://crazy-printing-center.vercel.app/track"}" class="btn">
                Track Live Order Status ↗
              </a>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px;">© 2026 Dhruvang Crazy Printing Center. All rights reserved.</p>
            <p style="margin: 0; color: #64748b;">Founder & Developer: <b>Dhruvang Bari</b></p>
          </div>
        </div>
      </body>
      </html>
    `;

    let emailSent = false;
    let smsSent = false;
    let dispatchLog = [];

    // --- 4. Attempt Direct SMTP / Resend Email Dispatch ---
    const resendKey = process.env.RESEND_API_KEY;
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD;

    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "Dhruvang Crazy Printing Center <orders@crazyprinting.in>",
          to: targetEmail,
          subject: `Invoice #${invoiceNumber} — Payment Verified (Dhruvang Crazy Printing Center)`,
          html: htmlEmail,
        });
        emailSent = true;
        dispatchLog.push("Email delivered via Resend API");
      } catch (err) {
        console.warn("Resend email error:", err.message);
      }
    } else if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: `"Dhruvang Crazy Printing Center" <${smtpUser}>`,
          to: targetEmail,
          subject: `Invoice #${invoiceNumber} — Payment Verified (₹${total}.00)`,
          html: htmlEmail,
        });
        emailSent = true;
        dispatchLog.push(`Email delivered via Gmail SMTP to ${targetEmail}`);
      } catch (err) {
        console.warn("SMTP email error:", err.message);
      }
    }

    // --- 5. Attempt Live SMS Dispatch (Fast2SMS / Twilio) ---
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey && cleanPhone.length === 10) {
      try {
        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: fast2smsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "q",
            message: smsMessage,
            language: "english",
            numbers: cleanPhone,
          }),
        });
        const smsData = await smsRes.json();
        if (smsData.return) {
          smsSent = true;
          dispatchLog.push(`SMS sent via Fast2SMS to ${cleanPhone}`);
        }
      } catch (err) {
        console.warn("Fast2SMS error:", err.message);
      }
    }

    // Mailto link for fallback
    const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(
      `Official Bill for Order #${invoiceNumber} - Dhruvang Crazy Printing Center`
    )}&body=${encodeURIComponent(
      `Dear ${customerName},\n\nYour payment of Rs.${total}.00 for Order #${orderNumber} (UTR: ${upiUtr || "VERIFIED"}) has been verified!\n\nInvoice No: ${invoiceNumber}\nJob: ${paperSize} ${colorMode} (${pageCount} pages x ${copies} copies)\nTotal Paid: Rs.${total}.00\n\nTrack your order live: ${trackingUrl}\n\nDhruvang Crazy Printing Center\nFounder & Developer: Dhruvang Bari`
    )}`;

    console.log(`[Notification Engine] Order #${orderNumber} processed. Email sent: ${emailSent}, SMS sent: ${smsSent}. Log: ${dispatchLog.join(", ")}`);

    return NextResponse.json({
      success: true,
      emailSent,
      smsSent,
      invoiceNumber,
      smsMessage,
      whatsappUrl,
      mailtoUrl,
      targetEmail,
      formattedPhone,
      message: emailSent 
        ? `Invoice successfully emailed to ${targetEmail} and SMS logged!` 
        : `Official Invoice generated! Use WhatsApp/Email action buttons for instant delivery.`,
    });
  } catch (error) {
    console.error("Notification API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
