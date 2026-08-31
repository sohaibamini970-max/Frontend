"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const pathname = usePathname();

  useEffect(() => {
    const syncAuth = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (storedUser && token && storedUser !== "undefined") {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth sync error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    syncAuth();

    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
    };
  }, [pathname]);

  // Logout function
  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    setUser(null);

    // Notify other components/tabs
    window.dispatchEvent(new Event("storage"));
  };

  return {
    user,
    loading,
    logout,
  };
}