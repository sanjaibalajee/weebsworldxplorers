"use server";

import { db } from "@/app/db/drizzle";
import { users } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export async function getUsers() {
  const allUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .orderBy(users.name);
  return allUsers;
}

export async function login(userId: string, pin: string) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    return { success: false, error: "User not found" };
  }

  if (user[0].pin !== pin) {
    return { success: false, error: "Incorrect PIN" };
  }

  const cookieStore = await cookies();
  cookieStore.set("userId", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { success: true, user: { id: user[0].id, name: user[0].name } };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("userId");
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    return null;
  }

  const user = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user[0] || null;
}
