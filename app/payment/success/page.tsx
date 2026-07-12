"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerificationResult = {
  success?: boolean;
  status?: string;
  message?: string;
  error?: string;
  reference?: string;
  referralCode?: string;
};

function PaymentSuccessContent() {
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    async function verifyPayment() {
      try {
        /*
         * Paystack may add both reference and trxref.
         * Use reference first, then trxref as a fallback.
         */
        const reference =
          searchParams.get("reference") ||
          searchParams.get("trxref") ||
          "";

        if (!reference) {
          setResult({
            success: false,
            error: "No payment reference was provided.",
          });
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/paystack/verify?reference=${encodeURIComponent(reference)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = (await response.json()) as VerificationResult;

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "The payment could not be verified."
          );
        }

        setResult({
          ...data,
          reference,
        });
      } catch (error: unknown) {
        setResult({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "An unexpected verification error occurred.",
        });
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [searchParams]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        background:
          "linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)",
        fontFamily:
          'Arial, Helvetica, system-ui, -apple-system, sans-serif',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "32px",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
          textAlign: "center",
        }}
      >
        {loading ? (
          <>
            <div
              style={{
                width: "54px",
                height: "54px",
                margin: "0 auto 20px",
                border: "5px solid #dbeafe",
                borderTopColor: "#2563eb",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />

            <h1
              style={{
                margin: "0 0 10px",
                fontSize: "28px",
                color: "#0f172a",
              }}
            >
              Verifying payment
            </h1>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              Please wait while CarePay confirms your Paystack transaction.
            </p>
          </>
        ) : result?.success ? (
          <>
            <div
              style={{
                width: "72px",
                height: "72px",
                margin: "0 auto 20px",
                borderRadius: "50%",
                background: "#dcfce7",
                color: "#15803d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "38px",
                fontWeight: 700,
              }}
            >
              ✓
            </div>

            <h1
              style={{
                margin: "0 0 10px",
                fontSize: "30px",
                color: "#0f172a",
              }}
            >
              Payment successful
            </h1>

            <p
              style={{
                margin: "0 0 20px",
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              Your payment has been verified successfully.
            </p>

            {result.reference && (
              <div
                style={{
                  padding: "14px",
                  marginBottom: "16px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  color: "#334155",
                  wordBreak: "break-word",
                }}
              >
                <strong>Reference:</strong>
                <br />
                {result.reference}
              </div>
            )}

            {result.referralCode && (
              <div
                style={{
                  padding: "14px",
                  marginBottom: "16px",
                  background: "#eff6ff",
                  borderRadius: "12px",
                  color: "#1e3a8a",
                }}
              >
                <strong>Referral code:</strong>
                <br />
                {result.referralCode}
              </div>
            )}

            <a
              href="/"
              style={{
                display: "inline-block",
                width: "100%",
                boxSizing: "border-box",
                padding: "14px 20px",
                borderRadius: "12px",
                background: "#2563eb",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Continue
            </a>
          </>
        ) : (
          <>
            <div
              style={{
                width: "72px",
                height: "72px",
                margin: "0 auto 20px",
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#b91c1c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "38px",
                fontWeight: 700,
              }}
            >
              !
            </div>

            <h1
              style={{
                margin: "0 0 10px",
                fontSize: "30px",
                color: "#0f172a",
              }}
            >
              Payment verification failed
            </h1>

            <p
              style={{
                margin: "0 0 20px",
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              {result?.error ||
                result?.message ||
                "The transaction could not be verified."}
            </p>

            {result?.reference && (
              <div
                style={{
                  padding: "14px",
                  marginBottom: "16px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  color: "#334155",
                  wordBreak: "break-word",
                }}
              >
                <strong>Reference:</strong>
                <br />
                {result.reference}
              </div>
            )}

            <a
              href="/"
              style={{
                display: "inline-block",
                width: "100%",
                boxSizing: "border-box",
                padding: "14px 20px",
                borderRadius: "12px",
                background: "#0f172a",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Return to CarePay
            </a>
          </>
        )}

        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </section>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Loading payment result...
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
