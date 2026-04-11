import { EditLotForm } from "@/components/lots/EditLotForm";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Edit an existing lot. `id` is the lot code (e.g. LO-09), URL-encoded.
 */
export default async function EditLotPage({ params }: Props) {
  const { id } = await params;
  const lotCode = decodeURIComponent(id);
  return (
    <div className="px-4 py-8 sm:px-6">
      <EditLotForm lotCode={lotCode} />
    </div>
  );
}
