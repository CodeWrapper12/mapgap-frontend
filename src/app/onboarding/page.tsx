"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { useRequireApproved, useAuth } from "@/lib/auth";
import { Step } from "@/components/ui";
import type { CandidateProfile } from "@/lib/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function OnboardingPage() {
  useRequireApproved();
  const { login } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [err, setErr] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setErr("");
    if (f && f.size > MAX_FILE_SIZE) {
      setErr(`File is too large (${(f.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is 10 MB.`);
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function parse() {
    setErr(""); setLoading(true);
    try { setProfile(await api.parseProfile(file ?? undefined, answers || undefined)); }
    catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  if (profile) {
    const skills = Object.values(profile.skills ?? {}).flat();
    return (
      <section className="pad">
        <Step n="01" label="Your profile" />
        <span className="done-badge"><Check size={13} strokeWidth={3} /> Parsed from your CV</span>
        <h2 className="h2">{profile.identity?.name}</h2>
        <p className="grey mb">{profile.experience?.length ?? 0} roles · {skills.length} skills captured</p>
        <div className="card" style={{ marginBottom: 28 }}>
          <p className="ovl">Experience</p>
          {profile.experience?.map((e) => (
            <div className="role" key={e.id}>
              <div className="role-co">{e.company} — {e.title}</div>
              <div className="role-nt faint">{e.bullets?.length ?? 0} bullets</div>
            </div>
          ))}
        </div>
        <p className="grey sm mb">You can edit this later from the <strong>Profile</strong> page. Ready to tailor against a job?</p>
        <button className="btn" onClick={async () => {
          try {
            const res = await api.refreshAuth();
            login(res.token);
            router.push("/workspace");
          } catch (e) {
            router.push("/workspace"); // fallback
          }
        }}>Start tailoring <ArrowRight size={16} strokeWidth={2} /></button>
      </section>
    );
  }

  return (
    <section className="pad">
      <Step n="01" label="Onboard once" />
      <h2 className="h2">Bring in your career</h2>
      <p className="grey mb">Upload your CV (PDF or .docx). We parse it once into a structured profile every later step reuses.</p>

      <div className="card" style={{ marginBottom: 18 }}>
        <p className="ovl">CV file</p>
        <p className="grey sm" style={{ marginBottom: 10 }}>
          <FileText size={13} strokeWidth={2} style={{ verticalAlign: "middle", marginRight: 4 }} />
          Accepted formats: <strong>PDF (.pdf)</strong> and <strong>Word (.docx)</strong> · Max 10 MB
        </p>
        <input className="field" type="file" accept=".pdf,.docx" onChange={handleFile} />
        {file && (
          <p className="mono sm" style={{ marginTop: 8, color: "var(--grey)" }}>
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </p>
        )}
        <p className="ovl" style={{ marginTop: 20 }}>Anything to add? <span className="faint">(optional)</span></p>
        <textarea className="field" style={{ minHeight: 90 }} placeholder="Real experience your CV leaves out…"
          value={answers} onChange={(e) => setAnswers(e.target.value)} />
      </div>

      {loading ? (
        <ParsingLoader />
      ) : (
        <button className="btn" onClick={parse} disabled={(!file && !answers)}>
          Parse my profile <ArrowRight size={16} strokeWidth={2} />
        </button>
      )}
      {err && <p className="err">{err}</p>}
    </section>
  );
}

function ParsingLoader() {
  const lines = ["Reading your CV", "Extracting experience and skills", "Structuring your profile", "Verifying dates and roles"];
  const [active, setActive] = useState(0);
  useEffect(() => { const iv = setInterval(() => setActive((a) => Math.min(a + 1, lines.length)), 600); return () => clearInterval(iv); }, []);
  return (
    <div className="scanbox" style={{ margin: "20px 0" }}>
      <div className="scanline" />
      <ul className="analyzing">
        {lines.map((l, i) => (
          <li key={l} className={i < active ? "done" : i === active ? "now" : ""}>
            <span className="tick">{i < active ? <Check size={13} strokeWidth={3} /> : <span className="spin" />}</span>{l}
          </li>
        ))}
      </ul>
    </div>
  );
}
