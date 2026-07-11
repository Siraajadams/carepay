"use client";

import { useEffect, useState } from "react";

type SuccessClientProps = {
  reference: string;
};

export default function SuccessClient({
  reference,
}: SuccessClientProps) {
  const [message, setMessage] = useState("Verifying payment...");
  const [status, setStatus] = useState<
    "loading" | "success" | "error"
  >("loading");

  useEffect(() => {
    let cancelled = false;

    async function verifyPayment() {
      if (!reference) {
        if (!cancelled) {
          setStatus("error");
          setMessage("No payment reference was provided.");
        }
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

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error || "Payment verification failed."
          );
        }

        if (!cancelled) {
          setStatus("success");
          setMessage(
            "Payment successful. Your prescription request has been submitted to a doctor."
          );
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "Payment verification failed."
          );
        }
      }
    }

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  const background =
    status === "success"
      ? "#dcfce7"
      : status === "error"
        ? "#fee2e2"
        : "#e0f2fe";

  const textColor =
    status === "success"
      ? "#166534"
      : status === "error"
        ? "#991b1b"
        : "#075985";

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
        <h1
          style={{
            color: "#0f172a",
            fontSize: 40,
            marginBottom: 8,
          }}
        >
          CarePay
        </h1>

        <p
          style={{
            color: "#64748b",
            fontSize: 18,
          }}
        >
          Prescription Review Payment
        </p>

        <div
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 18,
            background,
            color: textColor,
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>

        {reference && (
          <p
            style={{
              marginTop: 20,
              color: "#64748b",
              overflowWrap: "anywhere",
            }}
          >
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
