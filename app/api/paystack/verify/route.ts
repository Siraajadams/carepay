import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaystackVerificationData = {
  status?: boolean;
  message?: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    paid_at?: string | null;
    channel?: string;
    gateway_response?: string;
    customer?: {
      email?: string;
    };
    metadata?: {
      carepay_transaction_id?: string;
      patient_identifier?: string;
      referral_code?: string;
      service?: string;
      doctor_fee?: number;
      platform_fee?: number;
    };
  };
};

async function verifyTransaction(reference: string) {
  const cleanReference = String(reference || "").trim();

  if (!cleanReference) {
    return NextResponse.json(
      {
        success: false,
        error: "Payment reference is required.",
      },
      { status: 400 }
    );
  }

  const paystackSecretKey =
    process.env.PAYSTACK_SECRET_KEY?.trim();

  if (!paystackSecretKey) {
    console.error(
      "CAREPAY VERIFY: PAYSTACK_SECRET_KEY is missing."
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "PAYSTACK_SECRET_KEY is missing from the CarePay environment variables.",
      },
      { status: 500 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    console.log(
      "CAREPAY VERIFY: Verifying Paystack transaction:",
      cleanReference
    );

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        cleanReference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const responseText = await paystackResponse.text();

    let paystackData: PaystackVerificationData | null = null;

    try {
      paystackData = responseText
        ? (JSON.parse(responseText) as PaystackVerificationData)
        : null;
    } catch {
      console.error(
        "CAREPAY VERIFY: Paystack returned invalid JSON:",
        responseText
      );
    }

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData.data
    ) {
      console.error(
        "CAREPAY VERIFY: Paystack verification failed:",
        {
          httpStatus: paystackResponse.status,
          response: paystackData,
          rawResponse: responseText,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
            "Paystack could not verify this payment.",
          reference: cleanReference,
          paystackStatus: paystackResponse.status,
        },
        { status: 400 }
      );
    }

    const payment = paystackData.data;
    const paymentStatus = String(
      payment.status || ""
    ).toLowerCase();

    const paidAmountInCents = Number(payment.amount || 0);
    const paidAmount = paidAmountInCents / 100;

    const {
      data: existingTransaction,
      error: transactionLookupError,
    } = await supabase
      .from("carepay_transactions")
      .select(
        `
          id,
          patient_identifier,
          referral_code,
          service,
          amount,
          doctor_fee,
          platform_fee,
          payment_reference,
          payment_status
        `
      )
      .eq("payment_reference", cleanReference)
      .single();

    if (transactionLookupError || !existingTransaction) {
      console.error(
        "CAREPAY VERIFY: Transaction was not found:",
        transactionLookupError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The CarePay transaction could not be found.",
          reference: cleanReference,
        },
        { status: 404 }
      );
    }

    const expectedAmount = Number(
      existingTransaction.amount || 0
    );

    const expectedAmountInCents = Math.round(
      expectedAmount * 100
    );

    if (paidAmountInCents !== expectedAmountInCents) {
      console.error(
        "CAREPAY VERIFY: Payment amount mismatch:",
        {
          expectedAmountInCents,
          paidAmountInCents,
        }
      );

      await supabase
        .from("carepay_transactions")
        .update({
          payment_status: "Amount Mismatch",
        })
        .eq("id", existingTransaction.id);

      return NextResponse.json(
        {
          success: false,
          error:
            "The amount received does not match the CarePay transaction amount.",
          reference: cleanReference,
          expectedAmount,
          paidAmount,
        },
        { status: 400 }
      );
    }

    if (paymentStatus !== "success") {
      await supabase
        .from("carepay_transactions")
        .update({
          payment_status:
            paymentStatus === "failed"
              ? "Failed"
              : "Pending",
        })
        .eq("id", existingTransaction.id);

      return NextResponse.json(
        {
          success: false,
          error:
            payment.gateway_response ||
            `Payment status is ${paymentStatus || "unknown"}.`,
          reference: cleanReference,
          status: paymentStatus,
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("carepay_transactions")
      .update({
        payment_status: "Paid",
      })
      .eq("id", existingTransaction.id);

    if (updateError) {
      console.error(
        "CAREPAY VERIFY: Transaction update failed:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          error: `Payment was verified, but the CarePay transaction could not be updated: ${updateError.message}`,
          reference: cleanReference,
        },
        { status: 500 }
      );
    }

    console.log(
      "CAREPAY VERIFY: Payment verified successfully:",
      cleanReference
    );

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully.",
      status: "success",
      reference: cleanReference,
      transactionId: existingTransaction.id,
      referralCode: existingTransaction.referral_code,
      patientIdentifier:
        existingTransaction.patient_identifier,
      service: existingTransaction.service,
      amount: paidAmount,
      doctorFee: Number(
        existingTransaction.doctor_fee || 0
      ),
      platformFee: Number(
        existingTransaction.platform_fee || 0
      ),
      currency: payment.currency || "ZAR",
      paidAt: payment.paid_at || null,
      customerEmail: payment.customer?.email || null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown payment verification error.";

    console.error("CAREPAY VERIFY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
        reference: cleanReference,
      },
      { status: 500 }
    );
  }
}

/**
 * Supports:
 * GET /api/paystack/verify?reference=CP-...
 */
export async function GET(req: NextRequest) {
  const reference =
    req.nextUrl.searchParams.get("reference") ||
    req.nextUrl.searchParams.get("trxref") ||
    "";

  return verifyTransaction(reference);
}

/**
 * Supports:
 * POST /api/paystack/verify
 * Body: { reference: "CP-..." }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      reference?: string;
      trxref?: string;
    };

    const reference =
      String(body.reference || "").trim() ||
      String(body.trxref || "").trim();

    return verifyTransaction(reference);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid verification request body.",
      },
      { status: 400 }
    );
  }
}
