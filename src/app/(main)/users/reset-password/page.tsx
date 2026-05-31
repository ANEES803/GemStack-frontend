import { redirect } from "next/navigation";

export default function AdminResetPasswordRedirectPage() {
  redirect("/settings?tab=reset_password");
}
