"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [message, setMessage] = useState("Verifying payment...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyPayment() {
      if (!reference) {
        setMessage("No payment reference was provided.");
        return;
      }

      try {
        const response = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        });

        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Payment verification failed.");
          return;
        }

        setSuccess(true);
        setMessage(
          "Payment successful. Your prescription request has been submitted to a doctor."
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Payment verification failed."
        );
      }
    }

    verifyPayment();
  }, [reference]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#eef4fb",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: 620,
          margin: "80px auto",
          background: "#ffffff",
          borderRadius: 24,
          padding: 32,
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#0f172a", fontSize: 40 }}>CarePay</h1>

        <div
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 18,
            background: success ? "#dcfce7" : "#e0f2fe",
            color: success ? "#166534" : "#075985",
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>

        {reference && (
          <p style={{ marginTop: 20, color: "#64748b" }}>
            Reference: {reference}
          </p>
        )}

        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: 24,
            padding: "14px 22px",
            borderRadius: 14,
            background: "#2563eb",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Return to CarePay
        </a>
      </section>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: 30 }}>Loading payment...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
