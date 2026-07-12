import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

type InitializePaymentBody = {
  patientId?: string;
  referralId?: string;
  email?: string;
  service?: string;
  amount?: number;
  doctorFee?: number;
  platformFee?: number;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let reference = "";

  try {
    const body = (await req.json()) as InitializePaymentBody;

    const patientIdentifier = String(body.patientId || "").trim();

    const referralCode = String(body.referralId || "")
      .trim()
      .toUpperCase();

    const email = String(body.email || "").trim().toLowerCase();

    const service = String(
      body.service || "Prescription Review"
    ).trim();

    const amount = Number(body.amount ?? 250);
    const doctorFee = Number(body.doctorFee ?? 150);
    const platformFee = Number(body.platformFee ?? 100);

    /*
     * Validate patient information
     */
    if (!patientIdentifier) {
      return NextResponse.json(
        {
          success: false,
          error: "Patient ID is required.",
        },
        { status: 400 }
      );
    }

    if (!referralCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Referral code is required.",
        },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid patient email address is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Validate payment amounts
     */
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid payment amount is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(doctorFee) ||
      !Number.isFinite(platformFee) ||
      doctorFee < 0 ||
      platformFee < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "The doctor and platform fees are invalid.",
        },
        { status: 400 }
      );
    }

    /*
     * Convert to cents before comparing.
     * This avoids decimal rounding problems.
     */
    const amountInCents = Math.round(amount * 100);
    const doctorFeeInCents = Math.round(doctorFee * 100);
    const platformFeeInCents = Math.round(platformFee * 100);

    if (
      doctorFeeInCents + platformFeeInCents !==
      amountInCents
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The doctor fee and platform fee must equal the total payment amount.",
        },
        { status: 400 }
      );
    }

    /*
     * Paystack configuration
     */
    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY?.trim();

    if (!paystackSecretKey) {
      console.error(
        "CAREPAY INITIALIZE: PAYSTACK_SECRET_KEY is missing."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "PAYSTACK_SECRET_KEY is missing from the CarePay Vercel environment variables.",
        },
        { status: 500 }
      );
    }

    if (
      !paystackSecretKey.startsWith("sk_test_") &&
      !paystackSecretKey.startsWith("sk_live_")
    ) {
      console.error(
        "CAREPAY INITIALIZE: Invalid Paystack secret-key format."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid Paystack secret key. It must start with sk_test_ or sk_live_.",
        },
        { status: 500 }
      );
    }

    /*
     * Production CarePay application URL.
     *
     * Vercel environment variable:
     * NEXT_PUBLIC_APP_URL=https://carepay-olive.vercel.app
     */
    const configuredAppUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim();

    const fallbackAppUrl = "https://carepay-olive.vercel.app";

    const appUrl = (
      configuredAppUrl || fallbackAppUrl
    ).replace(/\/+$/, "");

    let validatedAppUrl: URL;

    try {
      validatedAppUrl = new URL(appUrl);
    } catch {
      console.error(
        "CAREPAY INITIALIZE: NEXT_PUBLIC_APP_URL is invalid:",
        appUrl
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "NEXT_PUBLIC_APP_URL is invalid. It must be a complete URL such as https://carepay-olive.vercel.app.",
        },
        { status: 500 }
      );
    }

    if (
      validatedAppUrl.protocol !== "https:" &&
      validatedAppUrl.hostname !== "localhost"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "NEXT_PUBLIC_APP_URL must use HTTPS in production.",
        },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();

    /*
     * Create a unique CarePay reference
     */
    reference = `CP-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    /*
     * Paystack redirects here after payment.
     *
     * Final callback example:
     * https://carepay-olive.vercel.app/payment/success?reference=CP-...
     */
    const callbackUrl = new URL(
      "/payment/success",
      `${appUrl}/`
    );

    callbackUrl.searchParams.set("reference", reference);

    console.log("CAREPAY INITIALIZE: Creating transaction", {
      reference,
      patientIdentifier,
      referralCode,
      service,
      amount,
      doctorFee,
      platformFee,
      email,
      callbackUrl: callbackUrl.toString(),
    });

    /*
     * Save pending transaction before redirecting to Paystack
     */
    const { data: transaction, error: insertError } =
      await supabase
        .from("carepay_transactions")
        .insert({
          patient_id: null,
          patient_identifier: patientIdentifier,
          referral_id: null,
          referral_code: referralCode,
          service,
          amount,
          doctor_fee: doctorFee,
          platform_fee: platformFee,
          payment_reference: reference,
          payment_status: "Pending",
        })
        .select("id, payment_reference")
        .single();

    if (insertError) {
      console.error(
        "CAREPAY INITIALIZE: Supabase transaction insert failed:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          error: `CarePay transaction could not be created: ${insertError.message}`,
          stage: "database_insert",
          details: insertError.details || null,
          hint: insertError.hint || null,
          code: insertError.code || null,
        },
        { status: 500 }
      );
    }

    console.log(
      "CAREPAY INITIALIZE: Transaction created:",
      transaction
    );

    /*
     * Initialize Paystack checkout
     */
    const paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountInCents,
          reference,
          currency: "ZAR",
          callback_url: callbackUrl.toString(),
          metadata: {
            carepay_transaction_id: transaction.id,
            patient_identifier: patientIdentifier,
            referral_code: referralCode,
            service,
            total_amount: amount,
            doctor_fee: doctorFee,
            platform_fee: platformFee,
            callback_url: callbackUrl.toString(),
          },
        }),
        cache: "no-store",
      }
    );

    const paystackData = await paystackRes
      .json()
      .catch(() => null);

    if (
      !paystackRes.ok ||
      !paystackData?.status ||
      !paystackData?.data?.authorization_url
    ) {
      console.error(
        "CAREPAY INITIALIZE: Paystack initialization failed:",
        {
          status: paystackRes.status,
          response: paystackData,
        }
      );

      const { error: failureUpdateError } = await supabase
        .from("carepay_transactions")
        .update({
          payment_status: "Failed",
        })
        .eq("payment_reference", reference);

      if (failureUpdateError) {
        console.error(
          "CAREPAY INITIALIZE: Could not mark transaction as failed:",
          failureUpdateError
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
            "Paystack payment initialization failed.",
          stage: "paystack_initialize",
          paystackStatus: paystackRes.status,
          paystackResponse: paystackData,
          reference,
        },
        { status: 500 }
      );
    }

    console.log(
      "CAREPAY INITIALIZE: Paystack initialized successfully:",
      {
        reference,
        callbackUrl: callbackUrl.toString(),
      }
    );

    return NextResponse.json({
      success: true,
      authorizationUrl:
        paystackData.data.authorization_url,
      accessCode: paystackData.data.access_code,
      reference,
      transactionId: transaction.id,
      callbackUrl: callbackUrl.toString(),
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Unknown payment initialization error.";

    console.error("CAREPAY INITIALIZE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        stage: "unexpected_error",
        reference: reference || null,
      },
      { status: 500 }
    );
  }
}
