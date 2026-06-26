"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { tokenStore } from "./api";

interface Claims { uid: string; role: string; status: string; email?: string; exp?: number; hasProfile: boolean; }
interface AuthState {
  token: string | null;
  claims: Claims | null;
  isApproved: boolean;
  isAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
}

function decode(token: string): Claims | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    // decodeURIComponent ensures proper UTF-8 decoding for non-ASCII characters
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return { 
      uid: payload.uid, 
      role: payload.role, 
      status: payload.status, 
      email: payload.email, 
      exp: payload.exp,
      hasProfile: payload.has_profile === "true"
    };
  } catch (e) { 
    return null; 
  }
}

/** Returns true if the token's exp claim is in the future (with 30s buffer). */
function isTokenValid(claims: Claims | null): boolean {
  if (!claims?.exp) return false;
  return claims.exp * 1000 > Date.now() + 30_000; // 30s buffer before actual expiry
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claims | null>(null);

  // Hydrate from storage on mount + validate expiry.
  useEffect(() => {
    const t = tokenStore.get();
    if (t) {
      const c = decode(t);
      if (isTokenValid(c)) {
        setToken(t);
        setClaims(c);
      } else {
        // Token expired — clean up silently.
        tokenStore.clear();
      }
    }
  }, []);

  // Periodic expiry check: auto-logout when the token expires while the tab is open.
  useEffect(() => {
    if (!claims?.exp) return;
    const msLeft = claims.exp * 1000 - Date.now();
    if (msLeft <= 0) { tokenStore.clear(); setToken(null); setClaims(null); return; }
    const timer = setTimeout(() => {
      tokenStore.clear();
      setToken(null);
      setClaims(null);
    }, msLeft);
    return () => clearTimeout(timer);
  }, [claims]);

  const login = useCallback((t: string) => { tokenStore.set(t); setToken(t); setClaims(decode(t)); }, []);
  const logout = useCallback(() => { tokenStore.clear(); setToken(null); setClaims(null); }, []);

  const value: AuthState = {
    token, claims,
    isApproved: claims?.status === "approved",
    isAdmin: claims?.role === "admin",
    login, logout,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Client-side guard for protected pages: requires a token; redirects pending/anon appropriately.
export function useRequireApproved() {
  const { token, claims } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (token === null && claims === null) {
      // give the provider a tick to hydrate from storage before deciding
      const t = tokenStore.get();
      if (!t) router.replace("/login");
      return;
    }
    if (!token) { router.replace("/login"); return; }
    if (claims && claims.status !== "approved") { router.replace("/pending"); return; }
    if (claims && !claims.hasProfile && window.location.pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [token, claims, router]);
}
