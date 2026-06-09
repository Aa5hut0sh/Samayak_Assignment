"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RootPage() {
  const { auth, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {

    if (!isLoading) {
      if (auth.isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [auth.isAuthenticated, isLoading, router]);

  // Display a loading state so the user isn't looking at a blank screen
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return null;
}