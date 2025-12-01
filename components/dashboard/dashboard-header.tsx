"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { useAuth } from "@/app/context/auth-context";
import { Button } from "@/components/ui/button";

type User = { id: string; name: string };

export function DashboardHeader({ user }: { user: User }) {
  const router = useRouter();
  const { setUser } = useAuth();

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push("/login");
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold">Hi, {user.name}!</h1>
        <p className="text-muted-foreground text-sm">Thailand Trip</p>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
}
