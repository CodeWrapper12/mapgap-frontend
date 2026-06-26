"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Lock, FileText, Download, ChevronDown, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Step } from "@/components/ui";
import { BUCKET_META, type MatchResponse, type RequirementClassification, type ConfirmedItem, type TailorResult, type CoverLetterResult } from "@/lib/types";

type Phase = "compose" | "analyzing" | "results" | "confirm" | "tailored";

export default function Workspace() {
  const [phase, setPhase] = useState<Phase>("compose");
  const [jd, setJd] = useState("");
  const [match, setMatch] = useState<MatchResponse | null>(null);
  const [tailor, setTailor] = useState<TailorResult | null>(null);
  const [err, setErr] = useState("");

  return (
    <div className="stage" key={phase}>
      {phase === "compose" && <Compose jd={jd} setJd={setJd} err={err}
        onAnalyze={async () => {
          setErr(""); setPhase("analyzing");
          try { const m = await api.match(jd); setMatch(m); setTimeout(() => setPhase("results"), 1800); }
          catch (e: any) { setErr(e.message); setPhase("compose"); }
        }} />}
      {phase === "analyzing" && <Analyzing />}
      {phase === "results" && match && <Results match={match.match} onNext={() => setPhase("confirm")} onBack={() => setPhase("compose")} />}
      {phase === "confirm" && match && <Confirm match={match} onTailored={(t) => { setTailor(t); setPhase("tailored"); }} onBack={() => setPhase("results")} />}
      {phase === "tailored" && match && tailor && <Tailored applicationId={match.applicationId} match={match.match} tailor={tailor} onReset={() => { setJd(""); setMatch(null); setTailor(null); setPhase("compose"); }} />}
    </div>
  );
}

function Compose({ jd, setJd, onAnalyze, err }: { jd: string; setJd: (s: string) => void; onAnalyze: () => void; err: string }) {
  return (
    <section className="pad">
      <Step n="01" label="Paste the job" />
      <h2 className="h2">Paste the job description</h2>
      <p className="grey mb">We read the posting you&rsquo;re looking at &mdash; no scraping, no link required.</p>
      <div className="jd-wrap">
        <textarea className="jd" value={jd} onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the full job description here…" spellCheck={false} />
      </div>
      <button className="btn" onClick={onAnalyze} disabled={jd.trim().length < 40}>Analyze match <ArrowRight size={16} strokeWidth={2} /></button>
      {err && <p className="err">{err}</p>}
    </section>
  );
}

function Analyzing() {
  const lines = ["Reading the job description", "Mapping requirements to your profile", "Finding hidden strengths", "Verifying every claim is true"];
  const [active, setActive] = useState(0);
  useEffect(() => { const iv = setInterval(() => setActive((a) => Math.min(a + 1, lines.length)), 440); return () => clearInterval(iv); }, []);
  return (
    <section className="pad center">
      <div className="scanbox">
        <div className="scanline" />
        <ul className="analyzing">
          {lines.map((l, i) => (
            <li key={l} className={i < active ? "done" : i === active ? "now" : ""}>
              <span className="tick">{i < active ? <Check size={13} strokeWidth={3} /> : <span className="spin" />}</span>{l}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Results({ match, onNext, onBack }: { match: MatchResponse["match"]; onNext: () => void; onBack: () => void }) {
  const [score, setScore] = useState(0);
  useEffect(() => { let s = 0; const iv = setInterval(() => { s += 2; if (s >= match.score) { s = match.score; clearInterval(iv); } setScore(s); }, 24); return () => clearInterval(iv); }, [match.score]);
  const counts = match.requirements.reduce<Record<string, number>>((a, r) => { const k = BUCKET_META[r.bucket].key; a[k] = (a[k] ?? 0) + 1; return a; }, {});

  return (
    <section className="pad">
      <Step n="02" label="Your match, read honestly" />
      <div className="score-head rise">
        <div className="score-row"><span className="score-num">{score}</span><span className="score-den mono">/100</span><span className="band">{match.scoreBand}</span></div>
        <div className="legend">
          {Object.entries(counts).map(([k, n]) => <span key={k} className="leg"><i className={`gl gl-${k}`} />{n} {k}</span>)}
        </div>
      </div>
      <div className="track rise"><div className="track-fill" style={{ width: `${score}%` }} /></div>
      <p className="note rise">Hidden strengths are real but buried by your CV&rsquo;s wording. Quick wins close in a weekend. Real gaps we won&rsquo;t touch &mdash; because you haven&rsquo;t done them.</p>
      <div className="ledger">
        {match.requirements.map((r, i) => {
          const k = BUCKET_META[r.bucket].key;
          return (
            <div key={i} className={`req req-${k}`} style={{ ["--d" as string]: `${i * 28}ms` }}>
              <div className="req-main"><span className={`tag tag-${k}`}>{BUCKET_META[r.bucket].label}</span><span className="req-label">{r.requirement}</span></div>
              <p className="req-ev">{r.profileEvidence ?? r.rationale ?? r.impact ?? ""}</p>
            </div>
          );
        })}
      </div>
      <div className="actions" style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn-ghost" onClick={onBack}>Back</button>
        <button className="btn" onClick={onNext}>Build my tailored CV <ArrowRight size={16} strokeWidth={2} /></button>
      </div>
    </section>
  );
}

function Confirm({ match, onTailored, onBack }: { match: MatchResponse; onTailored: (t: TailorResult) => void; onBack: () => void }) {
  const reqs = match.match.requirements;
  const surfaced = reqs.filter((r) => r.bucket === "Surfaced");
  const matched = reqs.filter((r) => r.bucket === "Matched");
  const learnable = reqs.filter((r) => r.bucket === "LearnableGap");
  const gaps = reqs.filter((r) => r.bucket === "RealGap");

  const [seeds, setSeeds] = useState<Record<string, string>>({});
  const [include, setInclude] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function generate() {
    setErr(""); setLoading(true);
    // matched + surfaced go in automatically (their evidence_ref); learnable only if included with a seed
    const items: ConfirmedItem[] = [
      ...matched.map((r) => ({ requirement: r.requirement, evidenceRef: r.evidenceRef })),
      ...surfaced.map((r) => ({ requirement: r.requirement, evidenceRef: r.evidenceRef })),
      ...learnable.filter((r) => include[r.requirement] && seeds[r.requirement]?.trim())
        .map((r) => ({ requirement: r.requirement, seed: seeds[r.requirement] })),
    ];
    try { const t = await api.tailor(match.applicationId, items); onTailored(t); }
    catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <section className="pad">
      <Step n="03" label="Confirm what's true" />
      <p className="grey mb rise">Nothing reaches your CV unless it traces to your real experience or a line you write yourself.</p>

      <div className="cg rise">
        <p className="cg-h">Strengths — added automatically</p>
        {[...matched, ...surfaced].map((r) => (
          <div className="row on" key={r.requirement}>
            <span className="box on"><Check size={12} strokeWidth={3} /></span>
            <div><div className="rl">{r.requirement}</div><div className="rs">{r.profileEvidence ?? "Already on your CV, in their words."}</div></div>
          </div>
        ))}
      </div>

      <div className="cg rise">
        <p className="cg-h">Quick wins — your choice</p>
        {learnable.map((r) => (
          <div className={`row ${include[r.requirement] ? "on" : ""}`} key={r.requirement}>
            <button className={`box ${include[r.requirement] ? "on" : ""}`} onClick={() => setInclude({ ...include, [r.requirement]: !include[r.requirement] })} aria-label={`Include ${r.requirement}`}>
              {include[r.requirement] && <Check size={12} strokeWidth={3} />}
            </button>
            <div className="rb">
              <div className="rl">{r.requirement}</div><div className="rs">{r.suggestedLearnPath ?? r.rationale}</div>
              {include[r.requirement] && (
                <div className="seed">
                  <input placeholder="Once you've done it, write one true line about what you built…"
                    value={seeds[r.requirement] ?? ""} onChange={(e) => setSeeds({ ...seeds, [r.requirement]: e.target.value })} />
                  {!seeds[r.requirement] && <span className="hint">We polish your words &mdash; we don&rsquo;t write the experience for you.</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="cg rise">
        <p className="cg-h">Real gaps — left off, honestly</p>
        {gaps.map((r) => (
          <div className="row locked" key={r.requirement}>
            <span className="box locked"><Lock size={11} strokeWidth={2.4} /></span>
            <div><div className="rl">{r.requirement}</div><div className="rs">{r.impact}</div></div>
          </div>
        ))}
      </div>

      <div className="actions" style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn-ghost" onClick={onBack} disabled={loading}>Back</button>
        <button className="btn" onClick={generate} disabled={loading}>{loading ? "Generating…" : <>Generate tailored CV <ArrowRight size={16} strokeWidth={2} /></>}</button>
      </div>
      {err && <p className="err">{err}</p>}
    </section>
  );
}

function Tailored({ applicationId, match, tailor, onReset }: { applicationId: string; match: MatchResponse["match"]; tailor: TailorResult; onReset: () => void }) {
  const [coverOpen, setCoverOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [err, setErr] = useState("");

  return (
    <section className="pad">
      <Step n="04" label="Your CV, told straight" />
      <span className="done-badge"><Check size={13} strokeWidth={3} /> Tailored &amp; verified true</span>
      <p className="grey mb">Every line traces to your real work. {tailor.rejected.length > 0 && `${tailor.rejected.length} couldn't be substantiated and were left out.`}</p>

      <div className="cv">
        <div className="cv-sec">Experience</div>
        {tailor.bullets.map((b, i) => (
          <div className="cv-b" key={i} style={{ ["--d" as string]: `${i * 90}ms` }}>
            <span className="bdot" />
            <div><p>{b.bullet}</p><span className="prov">{b.provenance}</span></div>
          </div>
        ))}
      </div>

      <div className="cover">
        <button className="cover-toggle" onClick={() => setCoverOpen(!coverOpen)}>
          <span><FileText size={15} strokeWidth={2} /> Add a cover letter</span>
          <span className="opt">Optional <ChevronDown size={15} style={{ transform: coverOpen ? "rotate(180deg)" : "none", transition: ".3s" }} /></span>
        </button>
        {coverOpen && <CoverLetter applicationId={applicationId} match={match} />}
      </div>

      <div className="actions" style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn-ghost" onClick={onReset}>Draft another CV</button>
        <button className="btn" onClick={() => setExportOpen(true)}>Export CV <Download size={16} strokeWidth={2} /></button>
      </div>
      {err && <p className="err">{err}</p>}
      {exportOpen && <ExportSheet applicationId={applicationId} onClose={() => setExportOpen(false)} onError={setErr} />}
    </section>
  );
}

function CoverLetter({ applicationId, match }: { applicationId: string; match: MatchResponse["match"] }) {
  const points = match.requirements.filter((r) => r.bucket === "Matched" || r.bucket === "Surfaced").map((r) => r.requirement);
  const [picked, setPicked] = useState<Record<number, boolean>>({ 0: true, 1: true });
  const [why, setWhy] = useState("");
  const [result, setResult] = useState<CoverLetterResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function write() {
    setLoading(true);
    const selected = points.filter((_, i) => picked[i]);
    try { setResult(await api.coverLetter(applicationId, selected, { motivation: why || undefined })); }
    finally { setLoading(false); }
  }

  return (
    <div className="cover-body">
      <p className="ovl">Feature these strengths</p>
      <div className="points">
        {points.map((p, i) => (
          <button key={p} className={`point ${picked[i] ? "on" : ""}`} onClick={() => setPicked({ ...picked, [i]: !picked[i] })}>
            {picked[i] ? <Check size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={2.2} />} {p}
          </button>
        ))}
      </div>
      <p className="ovl">Why this company? <span className="faint">(optional)</span></p>
      <input className="why" placeholder="In your own words…" value={why} onChange={(e) => setWhy(e.target.value)} />
      <button className="btn-ghost" onClick={write} disabled={loading} style={{ marginTop: 14 }}>{loading ? "Writing…" : "Write it"}</button>
      {result && (
        <div className="letter">
          {result.letter.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          {result.flags.map((f, i) => <div className="flag" key={i}>{f}</div>)}
        </div>
      )}
    </div>
  );
}

function ExportSheet({ applicationId, onClose, onError }: { applicationId: string; onClose: () => void; onError: (m: string) => void }) {
  const [fmt, setFmt] = useState({ pdf: true, docx: false });
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    const formats = [fmt.pdf && "pdf", fmt.docx && "docx"].filter(Boolean) as string[];
    try { await api.export(applicationId, formats); onClose(); }
    catch (e: any) { onError(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3 className="h3">Export your CV</h3>
        <p className="grey sm">Same content, ATS-safe in both formats.</p>
        <div className="fmt-row">
          <button className={`fmt ${fmt.pdf ? "on" : ""}`} onClick={() => setFmt({ ...fmt, pdf: !fmt.pdf })}><FileText size={20} strokeWidth={1.6} /><span>PDF</span>{fmt.pdf && <span className="fc"><Check size={11} strokeWidth={3} /></span>}</button>
          <button className={`fmt ${fmt.docx ? "on" : ""}`} onClick={() => setFmt({ ...fmt, docx: !fmt.docx })}><FileText size={20} strokeWidth={1.6} /><span>Word .docx</span>{fmt.docx && <span className="fc"><Check size={11} strokeWidth={3} /></span>}</button>
        </div>
        <div className="ats"><Check size={12} strokeWidth={3} /> Re-parsed after export — bullets &amp; sections verified intact</div>
        <button className="btn full" onClick={download} disabled={busy || (!fmt.pdf && !fmt.docx)}>{busy ? "Preparing…" : <>Download <Download size={16} strokeWidth={2} /></>}</button>
      </div>
    </div>
  );
}
