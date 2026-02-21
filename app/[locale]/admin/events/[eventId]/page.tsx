import AdminEventViewClient from "./AdminEventViewClient";

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <AdminEventViewClient eventId={eventId} />;
}
