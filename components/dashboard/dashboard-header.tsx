"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { useAuth } from "@/app/context/auth-context";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type User = { id: string; name: string };

export function DashboardHeader({ user }: { user: User }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push("/login");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    // Reset after a short delay for visual feedback
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold">Hi, {user.name}!</h1>
        <p className="text-muted-foreground text-sm">Thailand Trip</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-9 w-9"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}
