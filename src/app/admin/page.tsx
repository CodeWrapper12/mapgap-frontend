"use client";
import { useEffect, useState, useCallback } from "react";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth, useRequireApproved } from "@/lib/auth";
import { Step } from "@/components/ui";

export default function AdminPage() {
  useRequireApproved();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<{ id: string; email: string }[]>([]);
  const [usage, setUsage] = useState<{ total: number; limit: number; remaining: number; mostTokenUsedFor: string; users: { id: string; email: string; name: string; status: string; cost: number; calls: number }[] } | null>(null);
  const [voucher, setVoucher] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleSaveName(id: string) {
    try {
      await api.updateUser(id, editName);
      setEditingUserId(null);
      refresh();
    } catch (e: any) {
      alert("Failed to update name: " + e.message);
    }
  }

  const refresh = useCallback(() => {
    api.pendingUsers().then(setPending).catch(() => {});
    api.usage().then(setUsage).catch(() => {});
  }, []);

  useEffect(() => { if (isAdmin) refresh(); else router.replace("/workspace"); }, [isAdmin, refresh, router]);

  async function decide(id: string, approve: boolean) { await api.approveUser(id, approve); refresh(); }
  async function makeVoucher() { const { code } = await api.createVoucher(1); setVoucher(code); }

  if (!isAdmin) return null;
  return (
    <section className="pad">
      <Step n="—" label="Admin" />
      <h2 className="h2">Operate the beta</h2>

      <p className="ovl" style={{ marginTop: 28 }}>Pending approvals</p>
      {pending.length === 0 && <p className="grey sm">No one waiting.</p>}
      {pending.map((u) => (
        <div className="admin-card" key={u.id}>
          <span>{u.email}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={() => decide(u.id, true)}><Check size={14} strokeWidth={2} /> Approve</button>
            <button className="btn-ghost" onClick={() => decide(u.id, false)}><X size={14} strokeWidth={2} /> Reject</button>
          </div>
        </div>
      ))}

      <p className="ovl" style={{ marginTop: 32 }}>Vouchers</p>
      <button className="btn-ghost" onClick={makeVoucher}>Create a voucher</button>
      {voucher && <p className="mono" style={{ marginTop: 12, fontSize: 15 }}>{voucher}</p>}

      <p className="ovl" style={{ marginTop: 32 }}>Spend &amp; Users</p>
      {usage && (
        <>
          <p className="hist-score">${usage.total.toFixed(2)} <span className="grey sm mono">of ${usage.limit.toFixed(2)} · remaining ${usage.remaining.toFixed(2)}</span></p>
          <p className="grey sm" style={{ marginBottom: 16 }}>Most tokens used for: <strong>{usage.mostTokenUsedFor}</strong></p>
          {usage.users.map((u) => (
            <div className="admin-card" key={u.id} style={{ alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="mono sm">{u.id.slice(0, 8)}…</span>
                <span>{u.email}</span>
                {editingUserId === u.id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                    <input className="jd" style={{ minHeight: "auto", padding: "4px 8px", fontSize: 13 }} value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <button className="btn-ghost" onClick={() => handleSaveName(u.id)} style={{ padding: "4px 8px", fontSize: 12 }}>Save</button>
                    <button className="btn-ghost" onClick={() => setEditingUserId(null)} style={{ padding: "4px 8px", fontSize: 12 }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                    <strong>{u.name || "No name"}</strong>
                    <button className="btn-ghost" onClick={() => { setEditingUserId(u.id); setEditName(u.name); }} style={{ padding: "2px 6px", fontSize: 12 }}>Edit</button>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="grey sm">{u.calls} calls · ${u.cost.toFixed(3)}</span><br/>
                <span className="grey sm" style={{ textTransform: "capitalize" }}>{u.status}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
