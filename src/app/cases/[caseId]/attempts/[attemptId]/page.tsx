import ReviewPage from "../../review/page";

export default async function HistoricalCasePage({
  params,
}: {
  params: Promise<{ caseId: string; attemptId: string }>;
}) {
  const { caseId, attemptId } = await params;
  return <ReviewPage params={Promise.resolve({ caseId })} searchParams={Promise.resolve({ attemptId })} />;
}
