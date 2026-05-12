"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch } from "./utils";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  tenant_name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  login: async () => {},
  logout: () => {},
  loading: true,
});

function _readStored(): { token: string | null; user: User | null } {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem("kk_token");
  const userRaw = localStorage.getItem("kk_user");
  if (!token || !userRaw) return { token: null, user: null };
  try {
    return { token, user: JSON.parse(userRaw) as User };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // useState の lazy initialiser は1度だけ実行される（SSR でも CSR でも安全）
  const [token, setToken] = useState<string | null>(() => _readStored().token);
  const [user, setUser] = useState<User | null>(() => _readStored().user);
  // SSR では typeof window === undefined → true、クライアント描画時には false。
  // 認証状態の確定（localStorage 読み）が SSR では一度ペンディングになる。
  const [loading] = useState<boolean>(() => typeof window === "undefined");

  // Cross-tab sync via storage events
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "kk_token" || e.key === "kk_user") {
        const next = _readStored();
        setToken(next.token);
        setUser(next.user);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("kk_token", res.access_token);
    localStorage.setItem("kk_user", JSON.stringify(res.user));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("kk_token");
    localStorage.removeItem("kk_user");
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
