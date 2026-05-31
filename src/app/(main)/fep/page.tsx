import { redirect } from "next/navigation";

export default function FepRedirectPage() {
  redirect("/settings?tab=fep");
}
