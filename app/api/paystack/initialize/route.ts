import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const {
      patientId,
      referralId,
      service,
      amount,
      doctorFee,
      platformFee,
    } = body;

    const reference = `CP-${Date.now()}`;

    const { error } = await supabase.from("carepay_transactions").insert({
      patient_id: patientId || null,
      referral_id: referralId || null,
      service,
      amount,
      doctor_fee: doctorFee,
      platform_fee: platformFee,
      payment_reference: reference,
      payment_status: "Pending",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "patient@example.com",
        amount: amount * 100,
        reference,
        currency: "ZAR",
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?reference=${reference}`,
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok) {
      return NextResponse.json(
        { error: paystackData.message || "Paystack initialization failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Payment initialization failed" },
      { status: 500 }
    );
  }
}
