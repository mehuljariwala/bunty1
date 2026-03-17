"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, getDefaultPage } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(getDefaultPage(user));
    }
  }, [user, loading, router]);

  return null;
}
