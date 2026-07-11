"use client";

import { useState } from "react";

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [referralId, setReferralId] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function startPayment() {
    setMessage("");

    if (!patientId.trim()) {
      setMessage("Please enter the patient ID.");
      return;
    }

    if (!referralId.trim()) {
      setMessage("Please enter the referral code.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setMessage("Please enter a valid patient email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: patientId.trim(),
          referralId: referralId.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          service: "Prescription Review",
          amount: 250,
          doctorFee: 150,
          platformFee: 100,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(
          data.error ||
            data.message ||
            `Payment failed to start. Server status: ${res.status}`
        );
        return;
      }

      if (!data.authorizationUrl) {
        setMessage("Paystack payment link was not returned.");
        return;
      }

      window.location.href = data.authorizationUrl;
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment could not be started."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 16,
    marginBottom: 14,
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    fontSize: 16,
  };

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
          maxWidth: 680,
          margin: "40px auto",
          background: "#ffffff",
          borderRadius: 24,
          padding: 32,
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: 12,
            fontSize: 42,
            color: "#0f172a",
          }}
        >
          Prescription Review
        </h1>

        <p
          style={{
            color: "#475569",
            fontSize: 18,
            lineHeight: 1.6,
            marginBottom: 26,
          }}
        >
          Pay <strong>R250</strong> for a doctor to review your SymptomAI case
          and issue a prescription if clinically appropriate.
        </p>

        <label
          style={{
            display: "block",
            marginBottom: 8,
            color: "#0f172a",
            fontWeight: 700,
          }}
        >
          Patient ID
        </label>

        <input
          type="text"
          placeholder="National ID, passport or patient ID"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          style={inputStyle}
        />

        <label
          style={{
            display: "block",
            marginBottom: 8,
            color: "#0f172a",
            fontWeight: 700,
          }}
        >
          Referral Code
        </label>

        <input
          type="text"
          placeholder="Example: CS-H7FENG"
          value={referralId}
          onChange={(e) => setReferralId(e.target.value.toUpperCase())}
          style={inputStyle}
        />

        <label
          style={{
            display: "block",
            marginBottom: 8,
            color: "#0f172a",
            fontWeight: 700,
          }}
        >
          Patient Email
        </label>

        <input
          type="email"
          placeholder="patient@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        {message && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 12,
              background: "#fee2e2",
              color: "#991b1b",
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 14,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 8,
            }}
          >
            <span>Prescription review</span>
            <strong>R250</strong>
          </div>

          <div
            style={{
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            A prescription is issued only when the reviewing doctor determines
            that it is clinically appropriate.
          </div>
        </div>

        <button
          type="button"
          onClick={startPayment}
          disabled={loading}
          style={{
            width: "100%",
            padding: 17,
            border: "none",
            borderRadius: 14,
            background: loading ? "#94a3b8" : "#2563eb",
            color: "#ffffff",
            fontSize: 18,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Starting payment..." : "Pay R250"}
        </button>
      </section>
    </main>
  );
}
