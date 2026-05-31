import { redirect } from "next/navigation";

export default function PartnersRedirectPage() {
  redirect("/settings?tab=partners");
}
