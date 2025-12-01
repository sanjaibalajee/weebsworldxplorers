"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/app/actions/auth";
import { useAuth } from "@/app/context/auth-context";
import { Button } from "@/components/ui/button";

type User = { id: string; name: string };

export function LoginForm({ users }: { users: User[] }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setError("");
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleSubmit = async () => {
    if (!selectedUser || pin.length !== 4) return;

    setIsSubmitting(true);
    setError("");

    const result = await login(selectedUser.id, pin);

    if (result.success && result.user) {
      setUser(result.user);
      router.push("/dashboard");
    } else {
      setError(result.error || "Login failed");
      setPin("");
    }

    setIsSubmitting(false);
  };

  useEffect(() => {
    if (pin.length === 4 && selectedUser) {
      handleSubmit();
    }
  }, [pin]);

  if (!selectedUser) {
    return (
      <div>
        <h2 className="text-base font-medium mb-4 text-center text-muted-foreground">
          Select your name
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {users.map((u) => (
            <Button
              key={u.id}
              variant="outline"
              className="h-14 text-sm font-medium bg-white/50 dark:bg-white/10 hover:bg-primary hover:text-primary-foreground border-white/30 transition-all"
              onClick={() => setSelectedUser(u)}
            >
              {u.name}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={() => {
          setSelectedUser(null);
          setPin("");
          setError("");
        }}
        className="text-sm text-muted-foreground mb-4 self-start hover:text-foreground transition-colors"
      >
        &larr; Back
      </button>

      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold">Hi, {selectedUser.name}!</h2>
        <p className="text-muted-foreground text-sm mt-1">Enter your 4-digit PIN</p>
      </div>

      <div className="flex justify-center gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
              pin.length > i
                ? "bg-primary scale-110"
                : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-destructive text-sm text-center mb-4 font-medium">{error}</p>
      )}

      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "back"].map((item, idx) => {
          if (item === null) {
            return <div key={idx} />;
          }
          if (item === "back") {
            return (
              <Button
                key={idx}
                variant="ghost"
                className="h-14 w-14 text-lg rounded-full"
                onClick={handleBackspace}
                disabled={isSubmitting}
              >
                &larr;
              </Button>
            );
          }
          return (
            <Button
              key={idx}
              variant="outline"
              className="h-14 w-14 text-lg font-medium rounded-full bg-white/50 dark:bg-white/10 hover:bg-primary hover:text-primary-foreground border-white/30 transition-all"
              onClick={() => handlePinInput(String(item))}
              disabled={isSubmitting}
            >
              {item}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
