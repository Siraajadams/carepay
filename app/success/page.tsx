import SuccessClient from "./SuccessClient";

type SuccessPageProps = {
  searchParams: Promise<{
    reference?: string;
    trxref?: string;
  }>;
};

export default async function SuccessPage({
  searchParams,
}: SuccessPageProps) {
  const params = await searchParams;

  const reference = params.reference || params.trxref || "";

  return <SuccessClient reference={reference} />;
}
