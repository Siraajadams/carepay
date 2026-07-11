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

export async function POST(req: NextRequest) {
  let reference = "";

  try {
    const body = (await req.json()) as InitializePaymentBody;

    const patientId = String(body.patientId || "").trim();
    const referralId = String(body.referralId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const service = String(body.service || "Prescription Review").trim();

    const amount = Number(body.amount ?? 250);
    const doctorFee = Number(body.doctorFee ?? 150);
    const platformFee = Number(body.platformFee ?? 100);

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required." },
        { status: 400 }
      );
    }

    if (!referralId) {
      return NextResponse.json(
        { error: "Referral ID is required." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid patient email address is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "A valid payment amount is required." },
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
        { error: "The doctor and platform fees are invalid." },
        { status: 400 }
      );
    }

    if (doctorFee + platformFee !== amount) {
      return NextResponse.json(
        {
          error:
            "The doctor fee and platform fee must equal the total payment amount.",
        },
        { status: 400 }
      );
    }

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY?.trim();

    if (!paystackSecretKey) {
      console.error(
        "CAREPAY INITIALIZE: PAYSTACK_SECRET_KEY is missing."
      );

      return NextResponse.json(
        {
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
          error:
            "Invalid Paystack secret key. It must start with sk_test_ or sk_live_.",
        },
        { status: 500 }
      );
    }

    const configuredAppUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim();

    const appUrl = (
      configuredAppUrl || req.nextUrl.origin
    ).replace(/\/$/, "");

    const supabase = getSupabaseAdmin();

    reference = `CP-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    console.log("CAREPAY INITIALIZE: Creating transaction", {
      reference,
      patientId,
      referralId,
      service,
      amount,
      doctorFee,
      platformFee,
      email,
    });

    const { data: transaction, error: insertError } =
      await supabase
        .from("carepay_transactions")
        .insert({
          patient_id: patientId,
          referral_id: referralId,
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

    const callbackUrl =
      `${appUrl}/success?reference=${encodeURIComponent(reference)}`;

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
          amount: Math.round(amount * 100),
          reference,
          currency: "ZAR",
          callback_url: callbackUrl,
          metadata: {
            carepay_transaction_id: transaction.id,
            patient_id: patientId,
            referral_id: referralId,
            service,
            doctor_fee: doctorFee,
            platform_fee: platformFee,
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
          "CAREPAY INITIALIZE: Could not mark transaction failed:",
          failureUpdateError
        );
      }

      return NextResponse.json(
        {
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
      reference
    );

    return NextResponse.json({
      success: true,
      authorizationUrl:
        paystackData.data.authorization_url,
      accessCode: paystackData.data.access_code,
      reference,
      transactionId: transaction.id,
      callbackUrl,
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Unknown payment initialization error.";

    console.error("CAREPAY INITIALIZE ERROR:", err);

    return NextResponse.json(
      {
        error: errorMessage,
        stage: "unexpected_error",
        reference: reference || null,
      },
      { status: 500 }
    );
  }
}
