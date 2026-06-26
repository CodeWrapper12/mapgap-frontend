"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export function NavBar() {
  const { token, claims, isApproved, isAdmin, logout } = useAuth();
  const router = useRouter();
  const hasProfile = claims?.hasProfile ?? false;
  return (
    <header className="bar">
      <Link href="/" className="brand">
        <span className="logo" aria-hidden><span /><span /><span /></span>
        <span className="brandtxt">GapMap</span>
      </Link>
      <nav className="navlinks">
        {token && isApproved && hasProfile && <>
          <Link href="/profile" className="navlink">Profile</Link>
          <Link href="/workspace" className="navlink">Tailor</Link>
          <Link href="/history" className="navlink">History</Link>
          {isAdmin && <Link href="/admin" className="navlink">Admin</Link>}
        </>}
        {token && <button className="navlink" onClick={() => { logout(); router.push("/"); }}>Sign out</button>}
        {!token && <Link href="/login" className="navlink">Sign in</Link>}
      </nav>
    </header>
  );
}

export function Contour() {
  return (
    <svg className="contour" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <ellipse key={i} cx="560" cy="180" rx={60 + i * 52} ry={42 + i * 38}
          className="ring" style={{ ["--i" as string]: i, opacity: 0.16 - i * 0.012 }} transform="rotate(-18 560 180)" />
      ))}
    </svg>
  );
}

export function Step({ n, label }: { n: string; label: string }) {
  return (
    <div className="stepmark rise">
      <span className="n">{n}</span><i /><span className="stepl">{label}</span>
    </div>
  );
}

// Google Identity Services button. Loads the GIS script, renders Google's button,
// and on credential exchanges it with the backend (passing a voucher when signing up).
declare global { interface Window { google?: any } }

export function GoogleButton({ onError }: { onError?: (m: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const router = useRouter();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) { onError?.("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set."); return; }
    const id = "gsi-script";
    const init = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: { credential: string }) => {
          try {
            const { token, status } = await api.googleAuth(resp.credential);
            login(token);
            router.push(status === "approved" ? "/workspace" : "/pending");
          } catch (e: any) { onError?.(e.message ?? "Sign-in failed."); }
        },
      });
      if (ref.current) window.google?.accounts.id.renderButton(ref.current, { theme: "filled_black", shape: "pill", text: "continue_with" });
    };
    if (document.getElementById(id)) { init(); return; }
    const s = document.createElement("script");
    s.id = id; s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = init;
    document.body.appendChild(s);
  }, [clientId, login, router, onError]);

  return <div ref={ref} />;
}

export function TopLoader() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const start = () => setLoading(true);
    const end = () => setLoading(false);
    window.addEventListener("gapmap-load-start", start);
    window.addEventListener("gapmap-load-end", end);
    return () => {
      window.removeEventListener("gapmap-load-start", start);
      window.removeEventListener("gapmap-load-end", end);
    };
  }, []);

  if (!loading) return null;
  return <div className="top-loader" />;
}
