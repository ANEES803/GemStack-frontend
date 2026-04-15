import { notFound } from "next/navigation";

import { AccountantDashboard } from "@/components/dashboard/roles/AccountantDashboard";
import { AdminDashboard } from "@/components/dashboard/roles/AdminDashboard";
import { FepDashboard } from "@/components/dashboard/roles/FepDashboard";
import { OwnerDashboard } from "@/components/dashboard/roles/OwnerDashboard";
import { StockManagerDashboard } from "@/components/dashboard/roles/StockManagerDashboard";
import { isRoleSlug } from "@/lib/roles";

type Props = { params: Promise<{ role: string }> };

export default async function RoleDashboardPage({ params }: Props) {
  const { role } = await params;
  if (!isRoleSlug(role)) notFound();

  switch (role) {
    case "owner":
      return <OwnerDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "accountant":
      return <AccountantDashboard />;
    case "stock-manager":
      return <StockManagerDashboard />;
    case "fep":
      return <FepDashboard />;
    default:
      notFound();
  }
}
