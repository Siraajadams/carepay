"use client";

import { useState } from "react";

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [referralId, setReferralId] = useState("");

  async function startPayment() {
    setLoading(true);

    const res = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientId,
        referralId,
        service: "Prescription Review",
        amount: 250,
        doctorFee: 150,
        platformFee: 100,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      alert(data.error || "Payment failed to start");
      return;
    }

    window.location.href = data.authorizationUrl;
  }

  return (
    <main style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>Prescription Review</h1>

      <p>
        Pay <b>R250</b> for a doctor to review your SymptomAI case and issue a
        prescription if clinically appropriate.
      </p>

      <input
        placeholder="Patient ID"
        value={patientId}
        onChange={(e) => setPatientId(e.target.value)}
        style={{ display: "block", padding: 14, marginBottom: 12, width: "100%" }}
      />

      <input
        placeholder="Referral ID"
        value={referralId}
        onChange={(e) => setReferralId(e.target.value)}
        style={{ display: "block", padding: 14, marginBottom: 12, width: "100%" }}
      />

      <button onClick={startPayment} disabled={loading} style={{ padding: 16 }}>
        {loading ? "Starting payment..." : "Pay R250"}
      </button>
    </main>
  );
}
