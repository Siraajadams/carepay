import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json(
        { error: "Payment reference is required" },
        { status: 400 }
      );
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecret) {
      return NextResponse.json(
        { error: "PAYSTACK_SECRET_KEY is missing" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok || !result?.status) {
      return NextResponse.json(
        { error: result?.message || "Payment verification failed" },
        { status: 400 }
      );
    }

    if (result.data?.status !== "success") {
      return NextResponse.json(
        { error: "Payment has not been completed successfully" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("carepay_transactions")
      .update({
        payment_status: "Paid",
        paid_at: new Date().toISOString(),
      })
      .eq("payment_reference", reference);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reference,
      payment: result.data,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Verification failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
