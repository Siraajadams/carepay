"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const [message, setMessage] = useState("Verifying payment...");

  useEffect(() => {
    async function verify() {
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Payment verification failed");
        return;
      }

      setMessage("Payment successful. Your prescription request has been submitted.");
    }

    if (reference) verify();
  }, [reference]);

  return (
    <main style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>CarePay</h1>
      <p>{message}</p>
    </main>
  );
}
