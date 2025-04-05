"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthGuard({
  children,
  requireAdmin = false,
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [devUser, setDevUser] = useState<any>(null);

  useEffect(() => {
    // Check for development user in localStorage
    const storedDevUser = localStorage.getItem("devUser");
    if (storedDevUser) {
      try {
        setDevUser(JSON.parse(storedDevUser));
      } catch (e) {
        console.error("Failed to parse dev user:", e);
        localStorage.removeItem("devUser");
      }
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      // If we have a Firebase user, use that
      if (user) {
        if (requireAdmin && !user.isAdmin) {
          router.push("/");
          router.refresh();
        }
      }
      // If we have a dev user, check that
      else if (devUser) {
        if (requireAdmin && !devUser.isAdmin) {
          router.push("/");
          router.refresh();
        }
      }
      // If no user at all, redirect to login
      else {
        router.push("/login");
        router.refresh();
      }
    }
  }, [user, devUser, loading, router, requireAdmin]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Allow access if we have a Firebase user or a dev user with appropriate permissions
  if (
    (user && (!requireAdmin || user.isAdmin)) ||
    (devUser && (!requireAdmin || devUser.isAdmin))
  ) {
    return <>{children}</>;
  }

  return null;
}
