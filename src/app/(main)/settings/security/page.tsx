import { redirect } from "next/navigation";

export default function SecuritySettingsRedirectPage() {
  redirect("/profile?tab=security");
}
