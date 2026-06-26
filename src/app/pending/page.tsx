"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function PendingPage() {
  const { claims, login } = useAuth();
  const router = useRouter();
  const [voucher, setVoucher] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (!voucher.trim()) return;
    setLoading(true);
    setErr("");
    try {
      const res = await api.redeemVoucher(voucher.trim());
      login(res.token);
      router.push("/workspace");
    } catch (e: any) {
      setErr(e.message || "Invalid voucher code");
      setLoading(false);
    }
  };

  return (
    <section className="pad center">
      <div className="auth-wrap">
        <p className="eyebrow">Account pending</p>
        <h1 className="h2">You&rsquo;re on the list</h1>
        <p className="grey mb">
          Your account ({claims?.email ?? "your Google account"}) is awaiting admin approval.
          You&rsquo;ll be able to start tailoring once it&rsquo;s approved &mdash; check back shortly.
        </p>

        <hr className="mb" style={{ opacity: 0.1, margin: "32px 0" }} />

        <div style={{ textAlign: "left" }}>
          <p className="ovl">Have an invite voucher?</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <input 
              className="field" 
              placeholder="Enter voucher code" 
              value={voucher}
              onChange={(e) => setVoucher(e.target.value)}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button 
              className="btn" 
              onClick={handleRedeem}
              disabled={loading || !voucher.trim()}
            >
              Redeem
            </button>
          </div>
          {err && <p className="err mt" style={{ marginTop: "12px" }}>{err}</p>}
        </div>
      </div>
    </section>
  );
}
