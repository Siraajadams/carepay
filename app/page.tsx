import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>CarePay</h1>
      <p>Secure healthcare payments for SymptomAI and CareScriber.</p>

      <Link href="/payment">
        <button style={{ padding: 16, borderRadius: 12 }}>
          Start Prescription Payment
        </button>
      </Link>
    </main>
  );
}
