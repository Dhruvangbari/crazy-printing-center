/**
 * Razorpay Payment Gateway Helper for Next.js
 */

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Initiates Razorpay Online Checkout
 */
export async function initiateRazorpayPayment({
  order,
  onSuccess,
  onFailure,
  onDismiss,
}) {
  try {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      alert("Failed to load Razorpay Payment Gateway SDK. Please check your internet connection.");
      return;
    }

    // 1. Request Order Creation from Next.js Backend
    const res = await fetch("/api/payments/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.id,
        amount: order.total,
        customerName: order.customer_name || "Customer",
        customerPhone: order.customer_phone || "",
        customerEmail: order.customer_email || "customer@crazyprinting.com",
        notes: {
          orderNumber: order.order_number || "",
          paperSize: order.paper_size || "",
          deliveryMode: order.delivery_mode || "PICKUP",
        },
      }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to initialize payment order");
    }

    // If sandbox / demo mode fallback
    if (data.isDemoMode) {
      const confirmed = window.confirm(
        `💳 Razorpay UPI / Card Gateway (Demo Mode)\n\n` +
        `Amount: ₹${order.total}.00\n` +
        `Order Ref: #${order.order_number}\n\n` +
        `Click OK to simulate instant successful payment verification on your store, or Cancel to abort.\n` +
        `(To enable Live Gateway mode, add RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET to .env.local)`
      );

      if (confirmed) {
        const mockPaymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const verifyRes = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            razorpayOrderId: data.orderId,
            razorpayPaymentId: mockPaymentId,
            razorpaySignature: "demo_verified_signature",
            amount: order.total,
          }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          if (onSuccess) onSuccess(mockPaymentId, verifyData);
        } else {
          throw new Error(verifyData.error || "Verification failed");
        }
      } else {
        if (onDismiss) onDismiss();
      }
      return;
    }

    // 2. Open Live Razorpay Options Modal
    const options = {
      key: data.keyId,
      amount: data.amount,
      currency: data.currency || "INR",
      name: "Crazy Printing Center",
      description: `Payment for Order #${order.order_number} (₹${order.total}.00)`,
      image: "https://crazy-printing-center.vercel.app/favicon.ico",
      order_id: data.orderId,
      prefill: {
        name: order.customer_name || "",
        contact: order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, "").slice(-10) : "",
        email: order.customer_email || "",
      },
      theme: {
        color: "#4f46e5",
      },
      modal: {
        ondismiss: function () {
          if (onDismiss) onDismiss();
        },
      },
      handler: async function (response) {
        try {
          // 3. Verify Payment Signature on Backend
          const verifyRes = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              amount: order.total,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            if (onSuccess) onSuccess(response.razorpay_payment_id, verifyData);
          } else {
            throw new Error(verifyData.error || "Payment verification failed");
          }
        } catch (err) {
          console.error("Verification error:", err);
          if (onFailure) onFailure(err);
          else alert("Payment verification error: " + err.message);
        }
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.on("payment.failed", function (response) {
      console.error("Razorpay Payment Failed:", response.error);
      if (onFailure) onFailure(response.error);
      else alert(`Payment Failed: ${response.error.description || response.error.reason}`);
    });

    paymentObject.open();
  } catch (err) {
    console.error("Initiate Razorpay Error:", err);
    if (onFailure) onFailure(err);
    else alert("Could not open payment gateway: " + err.message);
  }
}
