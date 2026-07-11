export default function DoctorDashboardPage() {
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
          maxWidth: 900,
          margin: "40px auto",
          background: "#ffffff",
          borderRadius: 24,
          padding: 32,
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
        }}
      >
        <h1
          style={{
            fontSize: 42,
            color: "#0f172a",
            marginBottom: 12,
          }}
        >
          CarePay Doctor Dashboard
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "#64748b",
            lineHeight: 1.5,
          }}
        >
          Paid prescription requests and on-demand doctor cases will appear here.
        </p>

        <div
          style={{
            marginTop: 28,
            padding: 22,
            borderRadius: 18,
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
          }}
        >
          <h2 style={{ color: "#0f172a" }}>Waiting Patients</h2>
          <p style={{ color: "#64748b" }}>
            No paid requests are currently waiting.
          </p>
        </div>
      </section>
    </main>
  );
}
