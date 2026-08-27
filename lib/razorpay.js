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
 * Initiates Razorpay Online Checkout Popup
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
      if (onFailure) onFailure(new Error("SDK load failed"));
      return;
    }

    const keyId = 
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 
      process.env.RAZORPAY_KEY_ID || 
      "rzp_test_1DP5mmOlF5G5ag";

    const amountInPaise = Math.round(Number(order.total || 5) * 100);

    // Try server-side order generation first if API credentials are active
    let serverOrderId = null;
    try {
      const res = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id || `cpc_${Date.now()}`,
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
      if (data?.success && data?.orderId && !data.isDemoMode) {
        serverOrderId = data.orderId;
      }
    } catch (e) {
      console.debug("Razorpay order creation fallback to direct checkout", e);
    }

    // Open Official Razorpay Checkout Modal
    const options = {
      key: keyId,
      amount: amountInPaise,
      currency: "INR",
      name: "Dhruvang Crazy Printing Center",
      description: `Printing Job #${order.order_number || "Order"} (₹${order.total}.00)`,
      image: "https://crazy-printing-center.vercel.app/favicon.ico",
      ...(serverOrderId ? { order_id: serverOrderId } : {}),
      prefill: {
        name: order.customer_name || "Customer",
        contact: order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, "").slice(-10) : "",
        email: order.customer_email || "dhruvangbari2006@gmail.com",
      },
      notes: {
        order_number: order.order_number || "",
        store: "Dhruvang Crazy Printing Center",
      },
      theme: {
        color: "#4f46e5",
      },
      modal: {
        backdropclose: false,
        ondismiss: function () {
          if (onDismiss) onDismiss();
        },
      },
      handler: async function (response) {
        try {
          const paymentId = response.razorpay_payment_id || `pay_${Date.now()}`;
          
          // Verify on backend
          try {
            await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
                razorpayOrderId: response.razorpay_order_id || serverOrderId || "",
                razorpayPaymentId: paymentId,
                razorpaySignature: response.razorpay_signature || "",
                amount: order.total,
              }),
            });
          } catch (verErr) {
            console.warn("Backend verify notice:", verErr);
          }

          if (onSuccess) {
            onSuccess(paymentId, response);
          }
        } catch (err) {
          console.error("Payment handler error:", err);
          if (onFailure) onFailure(err);
        }
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.on("payment.failed", function (response) {
      console.error("Razorpay Payment Failed:", response.error);
      if (onFailure) onFailure(response.error);
      else alert(`Payment Failed: ${response.error?.description || response.error?.reason || "Cancelled"}`);
    });

    paymentObject.open();
  } catch (err) {
    console.error("Initiate Razorpay Error:", err);
    if (onFailure) onFailure(err);
    else alert("Could not open Razorpay checkout: " + err.message);
  }
}
