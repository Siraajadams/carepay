import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CarePay",
  description: "Secure healthcare payments for SymptomAI and CareScriber",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
