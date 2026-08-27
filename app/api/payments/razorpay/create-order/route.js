import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, amount, customerName, customerPhone, customerEmail, notes } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (orderId, amount)" },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(Number(amount) * 100);

    // If live/test Razorpay API credentials are configured in environment
    if (keyId && keySecret) {
      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `cpc_${orderId.substring(0, 18)}`,
          notes: {
            orderId: orderId,
            customerName: customerName || "",
            customerPhone: customerPhone || "",
            ...(notes || {}),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Razorpay API Error]", data);
        return NextResponse.json(
          { 
            success: false, 
            error: data.error?.description || "Failed to initialize Razorpay order" 
          },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
        keyId: keyId,
      });
    }

    // Fallback Mock/Demo order ID for instant sandbox testing before live keys are configured
    const mockRazorpayOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return NextResponse.json({
      success: true,
      isDemoMode: true,
      orderId: mockRazorpayOrderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: keyId || "rzp_test_demo123456",
      message: "Running in Instant Demo / Gateway Ready mode. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local to connect your live Razorpay merchant account.",
    });
  } catch (error) {
    console.error("[Razorpay Create Order Route Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
