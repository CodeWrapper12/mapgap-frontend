"use client";
import { useEffect, useState } from "react";
import { Trash2, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useRequireApproved } from "@/lib/auth";
import { Step } from "@/components/ui";
import type { HistoryItem } from "@/lib/types";

export default function HistoryPage() {
  useRequireApproved();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.history().then(setItems).finally(() => setLoading(false)); }, []);

  async function remove(id: string) {
    await api.deleteApplication(id);
    setItems((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <section className="pad">
      <Step n="—" label="Your history" />
      <h2 className="h2">Past applications</h2>
      <p className="grey mb">Every run you&rsquo;ve done. Your data, your control &mdash; delete any time.</p>

      {loading && <p className="grey">Loading…</p>}
      {!loading && items.length === 0 && <p className="grey">Nothing yet. Tailor your first CV to see it here.</p>}

      {items.map((it) => (
        <div className="hist-row" key={it.id}>
          <div>
            <div className="rl">{it.targetTitle ?? "Untitled role"}</div>
            <div className="rs mono">
              {new Date(it.createdAt).toLocaleDateString()} {it.hasTailored && <>· <Check size={11} strokeWidth={3} style={{ verticalAlign: "middle" }} /> tailored</>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className="hist-score">{it.score}</span>
            <button className="btn-ghost" onClick={() => remove(it.id)} aria-label="Delete"><Trash2 size={14} strokeWidth={2} /></button>
          </div>
        </div>
      ))}
    </section>
  );
}
