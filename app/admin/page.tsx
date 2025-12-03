import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { getAllUsersWithPots, getAllPotBalances } from "@/app/actions/pot";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Check if admin
  if (user.name.toLowerCase() !== "admin") {
    redirect("/dashboard");
  }

  const [usersResult, potBalancesResult] = await Promise.all([
    getAllUsersWithPots(),
    getAllPotBalances(),
  ]);

  const users = usersResult.success ? usersResult.users || [] : [];
  const totalPotBalance = potBalancesResult.success ? potBalancesResult.total : 0;

  return (
    <AdminDashboard
      users={users}
      totalPotBalance={totalPotBalance}
    />
  );
}
