import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

/** Alias route: `/lot/edit/:id` → `/lots/edit/:id` */
export default async function EditLotAliasPage({ params }: Props) {
  const { id } = await params;
  redirect(`/lots/edit/${encodeURIComponent(id)}`);
}
