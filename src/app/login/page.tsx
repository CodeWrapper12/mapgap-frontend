"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleButton } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const [err, setErr] = useState("");
  const { token, claims } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token) {
      if (claims?.status === "approved") {
        router.push("/workspace");
      } else {
        router.push("/pending");
      }
    }
  }, [token, claims, router]);

  return (
    <section className="pad">
      <div className="auth-wrap">
        <p className="eyebrow">Welcome to GapMap</p>
        <h1 className="h2">Transform Your Career Journey</h1>
        <p className="grey mb" style={{ lineHeight: 1.6 }}>
          Automatically parse your CV, uncover hidden skill gaps, and get AI-tailored cover letters instantly. Join the private beta to supercharge your applications.
        </p>

        <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
          <GoogleButton onError={setErr} />
        </div>
        {err && <p className="err">{err}</p>}
      </div>
    </section>
  );
}
