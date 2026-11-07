"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    apiFetch("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password, remember = true) => {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, remember }),
    });
    // 2FA on: no session yet, the login page asks for the authenticator code next
    if (data.requires2FA) return { requires2FA: true, challenge: data.challenge };
    setUser(data.user);
    toast(`Welcome back, ${data.user.name?.split(" ")[0] || "there"}!`, "success", { title: "Signed in successfully" });
    return { user: data.user };
  }, [toast]);

  const verify2FA = useCallback(
    async (challenge, code) => {
      const data = await apiFetch("/auth/login/2fa", { method: "POST", body: JSON.stringify({ challenge, code }) });
      setUser(data.user);
      toast(`Welcome back, ${data.user.name?.split(" ")[0] || "there"}!`, "success", { title: "Signed in with 2-step verification" });
      return data.user;
    },
    [toast]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
      toast("Your session has been closed securely.", "success", { title: "Signed out" });
    } catch {
      toast("You were signed out on this device.", "info", { title: "Signed out" });
    } finally {
      setUser(null);
    }
  }, [toast]);

  return (
    <AuthContext.Provider value={{ user, loading, login, verify2FA, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
