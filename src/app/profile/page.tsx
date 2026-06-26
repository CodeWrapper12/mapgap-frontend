"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Edit3, Upload, Save, X, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useRequireApproved, useAuth } from "@/lib/auth";
import { Step } from "@/components/ui";
import type { CandidateProfile } from "@/lib/types";

type Mode = "loading" | "view" | "edit" | "reupload";

export default function ProfilePage() {
  useRequireApproved();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [editProfile, setEditProfile] = useState<CandidateProfile | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true, summary: true, skills: true, experience: true, projects: true, education: true, certifications: true, seniority: true
  });

  // Re-upload state
  const [file, setFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState("");
  const [parsing, setParsing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const p = await api.getProfile();
      setProfile(p);
      setMode("view");
    } catch (e: any) {
      if (e.status === 404) {
        router.push("/onboarding");
      } else {
        setErr(e.message);
        setMode("view");
      }
    }
  }, [router]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  function startEdit() {
    setEditProfile(JSON.parse(JSON.stringify(profile)));
    setMode("edit");
  }

  async function saveEdit() {
    if (!editProfile) return;
    setSaving(true); setErr("");
    try {
      await api.updateProfile(editProfile);
      setProfile(editProfile);
      setMode("view");
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  function cancelEdit() { setEditProfile(null); setMode("view"); setErr(""); }

  async function reUpload() {
    if (!file) return;
    setParsing(true); setErr("");
    try {
      const p = await api.reParseProfile(file, answers || undefined);
      setProfile(p);
      setFile(null);
      setAnswers("");
      setMode("view");
    } catch (e: any) { setErr(e.message); }
    finally { setParsing(false); }
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (mode === "loading") {
    return (
      <section className="pad center">
        <p className="grey">Loading your profile…</p>
      </section>
    );
  }

  return (
    <section className="pad">
      <Step n="—" label="Your profile" />

      <div className="prof-header">
        <div>
          <h2 className="h2">{profile?.identity?.name ?? "Your Profile"}</h2>
          {profile?.identity?.targetTitles && profile.identity.targetTitles.length > 0 && (
            <p className="grey">{profile.identity.targetTitles.join(" · ")}</p>
          )}
        </div>
        <div className="prof-actions">
          {mode === "view" && (
            <>
              <button className="btn-ghost" onClick={startEdit}>
                <Edit3 size={14} strokeWidth={2} /> Edit
              </button>
              <button className="btn-ghost" onClick={() => setMode("reupload")}>
                <Upload size={14} strokeWidth={2} /> Re-upload CV
              </button>
            </>
          )}
          {mode === "edit" && (
            <>
              <button className="btn" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : <><Save size={14} strokeWidth={2} /> Save</>}
              </button>
              <button className="btn-ghost" onClick={cancelEdit}>
                <X size={14} strokeWidth={2} /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {err && <p className="err">{err}</p>}

      {/* Re-upload panel */}
      {mode === "reupload" && (
        <div className="prof-reupload card">
          <p className="ovl">Re-upload your CV</p>
          <p className="grey sm mb">Upload a new PDF or .docx to re-parse your profile. Your previous profile will be replaced.</p>
          <input className="field" type="file" accept=".pdf,.docx"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 10 * 1024 * 1024) { setErr("File is too large. Maximum size is 10 MB."); setFile(null); return; }
              setErr(""); setFile(f);
            }} />
          {file && <p className="prof-fileinfo mono sm">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
          <p className="ovl" style={{ marginTop: 18 }}>Additional context <span className="faint">(optional)</span></p>
          <textarea className="field" style={{ minHeight: 70 }} placeholder="Real experience your CV leaves out…"
            value={answers} onChange={(e) => setAnswers(e.target.value)} />
          <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
            <button className="btn" onClick={reUpload} disabled={parsing || !file}>
              {parsing ? "Parsing…" : <><Upload size={14} strokeWidth={2} /> Parse new CV</>}
            </button>
            <button className="btn-ghost" onClick={() => { setMode("view"); setFile(null); setAnswers(""); setErr(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Profile sections */}
      {profile && mode !== "reupload" && (
        <div className="prof-sections">
          {/* Contact Info */}
          <ProfileSection title="Contact" expanded={expandedSections.identity} onToggle={() => toggleSection("identity")}>
            {mode === "view" ? (
              <div className="prof-grid">
                {profile.identity?.contact?.email && <div className="prof-field"><span className="prof-label">Email</span><span>{profile.identity.contact.email}</span></div>}
                {profile.identity?.contact?.phone && <div className="prof-field"><span className="prof-label">Phone</span><span>{profile.identity.contact.phone}</span></div>}
                {profile.identity?.contact?.links && profile.identity.contact.links.length > 0 && (
                  <div className="prof-field"><span className="prof-label">Links</span>
                    <div>{profile.identity.contact.links.map((l, i) => <a key={i} href={l} className="prof-link" target="_blank" rel="noopener">{l}</a>)}</div>
                  </div>
                )}
                {profile.identity?.targetTitles && profile.identity.targetTitles.length > 0 && (
                  <div className="prof-field"><span className="prof-label">Target roles</span><span>{profile.identity.targetTitles.join(", ")}</span></div>
                )}
              </div>
            ) : editProfile && (
              <div className="prof-grid">
                <div className="prof-field">
                  <span className="prof-label">Name</span>
                  <input className="field" value={editProfile.identity?.name ?? ""}
                    onChange={(e) => setEditProfile({ ...editProfile, identity: { ...editProfile.identity, name: e.target.value } })} />
                </div>
                <div className="prof-field">
                  <span className="prof-label">Email</span>
                  <input className="field" value={editProfile.identity?.contact?.email ?? ""}
                    onChange={(e) => setEditProfile({ ...editProfile, identity: { ...editProfile.identity, contact: { ...editProfile.identity.contact, email: e.target.value } } })} />
                </div>
                <div className="prof-field">
                  <span className="prof-label">Phone</span>
                  <input className="field" value={editProfile.identity?.contact?.phone ?? ""}
                    onChange={(e) => setEditProfile({ ...editProfile, identity: { ...editProfile.identity, contact: { ...editProfile.identity.contact, phone: e.target.value } } })} />
                </div>
                <div className="prof-field">
                  <span className="prof-label">Target roles</span>
                  <input className="field" placeholder="Comma-separated"
                    value={editProfile.identity?.targetTitles?.join(", ") ?? ""}
                    onChange={(e) => setEditProfile({ ...editProfile, identity: { ...editProfile.identity, targetTitles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} />
                </div>
              </div>
            )}
          </ProfileSection>

          {/* Professional Summary */}
          <ProfileSection title="Professional Summary" expanded={expandedSections.summary} onToggle={() => toggleSection("summary")}>
            {mode === "view" ? (
              <p className="grey" style={{ whiteSpace: "pre-wrap" }}>
                {profile.summarySeed || "No summary provided."}
              </p>
            ) : editProfile && (
              <textarea className="field" placeholder="A brief professional summary..." style={{ minHeight: 100 }}
                value={editProfile.summarySeed ?? ""}
                onChange={(e) => setEditProfile({ ...editProfile, summarySeed: e.target.value })} />
            )}
          </ProfileSection>

          {/* Skills */}
          <ProfileSection title="Skills" expanded={expandedSections.skills} onToggle={() => toggleSection("skills")}>
            {mode === "view" ? (
              <div className="prof-skills">
                {profile.skills && Object.entries(profile.skills).map(([cat, items]) => {
                  const arr = items as string[];
                  if (!arr || arr.length === 0) return null;
                  return (
                    <div className="prof-skill-cat" key={cat}>
                      <span className="prof-skill-label">{cat}</span>
                      <div className="prof-chips">
                        {arr.map((s, i) => <span className="prof-chip" key={i}>{s}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : editProfile && (
              <div className="prof-skills">
                {editProfile.skills && Object.entries(editProfile.skills).map(([cat, items]) => (
                  <div className="prof-skill-cat" key={cat}>
                    <span className="prof-skill-label">{cat}</span>
                    <input className="field" placeholder="Comma-separated skills"
                      value={(items as string[])?.join(", ") ?? ""}
                      onChange={(e) => {
                        const skills = { ...editProfile.skills, [cat]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) };
                        setEditProfile({ ...editProfile, skills });
                      }} />
                  </div>
                ))}
              </div>
            )}
          </ProfileSection>

          {/* Experience */}
          <ProfileSection title="Experience" expanded={expandedSections.experience} onToggle={() => toggleSection("experience")}>
            {profile.experience?.map((exp, ei) => (
              <div className="prof-exp" key={exp.id}>
                {mode === "view" ? (
                  <>
                    <div className="prof-exp-head">
                      <div>
                        <div className="prof-exp-title">{exp.title}</div>
                        <div className="prof-exp-company">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</div>
                      </div>
                      <span className="prof-exp-dates mono sm">
                        {exp.start ?? ""}–{exp.current ? "Present" : exp.end ?? ""}
                      </span>
                    </div>
                    {exp.bullets?.map((b) => (
                      <div className="prof-bullet" key={b.id}>
                        <span className="bdot" />
                        <div>
                          <p>{b.text}</p>
                          {b.tech && b.tech.length > 0 && (
                            <div className="prof-chips sm">
                              {b.tech.map((t, i) => <span className="prof-chip sm" key={i}>{t}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : editProfile && (
                  <>
                    <>
                      <div className="prof-edit-row">
                        <input className="field" placeholder="Job Title" value={editProfile.experience?.[ei]?.title ?? ""}
                          onChange={(e) => {
                            const exps = [...(editProfile.experience ?? [])];
                            exps[ei] = { ...exps[ei], title: e.target.value };
                            setEditProfile({ ...editProfile, experience: exps });
                          }} />
                        <input className="field" placeholder="Company" value={editProfile.experience?.[ei]?.company ?? ""}
                          onChange={(e) => {
                            const exps = [...(editProfile.experience ?? [])];
                            exps[ei] = { ...exps[ei], company: e.target.value };
                            setEditProfile({ ...editProfile, experience: exps });
                          }} />
                        <input className="field" placeholder="Location" value={editProfile.experience?.[ei]?.location ?? ""}
                          onChange={(e) => {
                            const exps = [...(editProfile.experience ?? [])];
                            exps[ei] = { ...exps[ei], location: e.target.value };
                            setEditProfile({ ...editProfile, experience: exps });
                          }} />
                      </div>
                      <div className="prof-edit-row" style={{ marginTop: 8 }}>
                        <input className="field" placeholder="Start (e.g. Jan 2020)" value={editProfile.experience?.[ei]?.start ?? ""}
                          onChange={(e) => {
                            const exps = [...(editProfile.experience ?? [])];
                            exps[ei] = { ...exps[ei], start: e.target.value };
                            setEditProfile({ ...editProfile, experience: exps });
                          }} />
                        <input className="field" placeholder="End (e.g. Present)" value={editProfile.experience?.[ei]?.end ?? ""}
                          onChange={(e) => {
                            const exps = [...(editProfile.experience ?? [])];
                            exps[ei] = { ...exps[ei], end: e.target.value };
                            setEditProfile({ ...editProfile, experience: exps });
                          }} />
                      </div>
                    </>
                    {editProfile.experience?.[ei]?.bullets?.map((b, bi) => (
                      <div className="prof-edit-bullet" key={b.id}>
                        <textarea className="field" value={b.text}
                          onChange={(e) => {
                            const exps = [...(editProfile.experience ?? [])];
                            const bullets = [...(exps[ei].bullets ?? [])];
                            bullets[bi] = { ...bullets[bi], text: e.target.value };
                            exps[ei] = { ...exps[ei], bullets };
                            setEditProfile({ ...editProfile, experience: exps });
                          }} />
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </ProfileSection>

          {/* Projects */}
          {profile.projects && profile.projects.length > 0 && (
            <ProfileSection title="Projects" expanded={expandedSections.projects} onToggle={() => toggleSection("projects")}>
              {profile.projects.map((proj, pi) => (
                <div className="prof-project" key={proj.id}>
                  {mode === "view" ? (
                    <>
                      <div className="prof-exp-head">
                        <div className="prof-exp-title">{proj.name}</div>
                        {proj.period && <span className="prof-exp-dates mono sm">{proj.period}</span>}
                      </div>
                      {proj.link && <a href={proj.link} target="_blank" rel="noopener" className="prof-link sm" style={{ display: "block", marginBottom: 4 }}>{proj.link}</a>}
                      {proj.description && <p className="grey sm">{proj.description}</p>}
                      {proj.tech && proj.tech.length > 0 && (
                        <div className="prof-chips sm" style={{ marginTop: 8 }}>
                          {proj.tech.map((t, i) => <span className="prof-chip sm" key={i}>{t}</span>)}
                        </div>
                      )}
                    </>
                  ) : editProfile && (
                    <>
                      <div className="prof-edit-row">
                        <input className="field" placeholder="Project name" value={editProfile.projects?.[pi]?.name ?? ""}
                          onChange={(e) => {
                            const projs = [...(editProfile.projects ?? [])];
                            projs[pi] = { ...projs[pi], name: e.target.value };
                            setEditProfile({ ...editProfile, projects: projs });
                          }} />
                        <input className="field" placeholder="Period" value={editProfile.projects?.[pi]?.period ?? ""}
                          onChange={(e) => {
                            const projs = [...(editProfile.projects ?? [])];
                            projs[pi] = { ...projs[pi], period: e.target.value };
                            setEditProfile({ ...editProfile, projects: projs });
                          }} />
                      </div>
                      <div className="prof-edit-row" style={{ marginTop: 8 }}>
                        <input className="field" placeholder="Link" value={editProfile.projects?.[pi]?.link ?? ""}
                          onChange={(e) => {
                            const projs = [...(editProfile.projects ?? [])];
                            projs[pi] = { ...projs[pi], link: e.target.value };
                            setEditProfile({ ...editProfile, projects: projs });
                          }} />
                        <input className="field" placeholder="Description" value={editProfile.projects?.[pi]?.description ?? ""}
                          onChange={(e) => {
                            const projs = [...(editProfile.projects ?? [])];
                            projs[pi] = { ...projs[pi], description: e.target.value };
                            setEditProfile({ ...editProfile, projects: projs });
                          }} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </ProfileSection>
          )}

          {/* Education */}
          {profile.education && profile.education.length > 0 && (
            <ProfileSection title="Education" expanded={expandedSections.education} onToggle={() => toggleSection("education")}>
              {profile.education.map((edu, ei) => (
                <div className="prof-edu" key={ei}>
                  {mode === "view" ? (
                    <div className="prof-exp-head">
                      <div>
                        <div className="prof-exp-title">{edu.degree}</div>
                        <div className="prof-exp-company">{edu.institution}{edu.location ? ` · ${edu.location}` : ""}</div>
                      </div>
                      <span className="prof-exp-dates mono sm">
                        {edu.start ?? ""}–{edu.end ?? ""}
                      </span>
                    </div>
                  ) : editProfile && (
                    <>
                      <div className="prof-edit-row">
                        <input className="field" placeholder="Degree" value={editProfile.education?.[ei]?.degree ?? ""}
                          onChange={(e) => {
                            const edus = [...(editProfile.education ?? [])];
                            edus[ei] = { ...edus[ei], degree: e.target.value };
                            setEditProfile({ ...editProfile, education: edus });
                          }} />
                        <input className="field" placeholder="Institution" value={editProfile.education?.[ei]?.institution ?? ""}
                          onChange={(e) => {
                            const edus = [...(editProfile.education ?? [])];
                            edus[ei] = { ...edus[ei], institution: e.target.value };
                            setEditProfile({ ...editProfile, education: edus });
                          }} />
                        <input className="field" placeholder="Location" value={editProfile.education?.[ei]?.location ?? ""}
                          onChange={(e) => {
                            const edus = [...(editProfile.education ?? [])];
                            edus[ei] = { ...edus[ei], location: e.target.value };
                            setEditProfile({ ...editProfile, education: edus });
                          }} />
                      </div>
                      <div className="prof-edit-row" style={{ marginTop: 8 }}>
                        <input className="field" placeholder="Start (e.g. 2018)" value={editProfile.education?.[ei]?.start ?? ""}
                          onChange={(e) => {
                            const edus = [...(editProfile.education ?? [])];
                            edus[ei] = { ...edus[ei], start: e.target.value };
                            setEditProfile({ ...editProfile, education: edus });
                          }} />
                        <input className="field" placeholder="End (e.g. 2022)" value={editProfile.education?.[ei]?.end ?? ""}
                          onChange={(e) => {
                            const edus = [...(editProfile.education ?? [])];
                            edus[ei] = { ...edus[ei], end: e.target.value };
                            setEditProfile({ ...editProfile, education: edus });
                          }} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </ProfileSection>
          )}

          {/* Certifications */}
          {profile.certifications && profile.certifications.length > 0 && (
            <ProfileSection title="Certifications" expanded={expandedSections.certifications} onToggle={() => toggleSection("certifications")}>
              <div className="prof-certs">
                {profile.certifications.map((cert, ci) => (
                  <div className="prof-cert" key={ci}>
                    {mode === "view" ? (
                      <div className="prof-exp-head" style={{ marginBottom: 0 }}>
                        <div>
                          <span className="prof-cert-name">{cert.name}</span>
                          {cert.issuer && <span className="grey sm"> — {cert.issuer}</span>}
                        </div>
                        {cert.date && <span className="prof-exp-dates mono sm">{cert.date}</span>}
                      </div>
                    ) : editProfile && (
                      <div className="prof-edit-row">
                        <input className="field" placeholder="Cert name" value={editProfile.certifications?.[ci]?.name ?? ""}
                          onChange={(e) => {
                            const certs = [...(editProfile.certifications ?? [])];
                            certs[ci] = { ...certs[ci], name: e.target.value };
                            setEditProfile({ ...editProfile, certifications: certs });
                          }} />
                        <input className="field" placeholder="Issuer" value={editProfile.certifications?.[ci]?.issuer ?? ""}
                          onChange={(e) => {
                            const certs = [...(editProfile.certifications ?? [])];
                            certs[ci] = { ...certs[ci], issuer: e.target.value };
                            setEditProfile({ ...editProfile, certifications: certs });
                          }} />
                        <input className="field" placeholder="Date" value={editProfile.certifications?.[ci]?.date ?? ""}
                          onChange={(e) => {
                            const certs = [...(editProfile.certifications ?? [])];
                            certs[ci] = { ...certs[ci], date: e.target.value };
                            setEditProfile({ ...editProfile, certifications: certs });
                          }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ProfileSection>
          )}

          {/* Seniority */}
          <ProfileSection title="Seniority" expanded={expandedSections.seniority} onToggle={() => toggleSection("seniority")}>
            {mode === "view" ? (
              <div className="prof-grid">
                {profile.seniority?.totalYearsOfExperience && <div className="prof-field"><span className="prof-label">Total years</span><span>{profile.seniority.totalYearsOfExperience}</span></div>}
                {profile.seniority?.level && <div className="prof-field"><span className="prof-label">Level</span><span>{profile.seniority.level}</span></div>}
                {profile.seniority?.domains && profile.seniority.domains.length > 0 && (
                  <div className="prof-field"><span className="prof-label">Domains</span>
                    <div className="prof-chips">{profile.seniority.domains.map((d, i) => <span className="prof-chip" key={i}>{d}</span>)}</div>
                  </div>
                )}
                {!profile.seniority && <p className="grey sm">Seniority details not extracted.</p>}
              </div>
            ) : editProfile && (
              <div className="prof-grid">
                <div className="prof-field">
                  <span className="prof-label">Total Years</span>
                  <input className="field" placeholder="e.g. 5" value={editProfile.seniority?.totalYearsOfExperience ?? ""}
                    onChange={(e) => setEditProfile({ ...editProfile, seniority: { ...(editProfile.seniority || { domains: [] }), totalYearsOfExperience: e.target.value } })} />
                </div>
                <div className="prof-field">
                  <span className="prof-label">Level</span>
                  <input className="field" placeholder="e.g. Senior" value={editProfile.seniority?.level ?? ""}
                    onChange={(e) => setEditProfile({ ...editProfile, seniority: { ...(editProfile.seniority || { domains: [] }), level: e.target.value } })} />
                </div>
                <div className="prof-field">
                  <span className="prof-label">Domains</span>
                  <input className="field" placeholder="Comma-separated" value={editProfile.seniority?.domains?.join(", ") ?? ""}
                    onChange={(e) => setEditProfile({ ...editProfile, seniority: { ...(editProfile.seniority || { domains: [] }), domains: e.target.value.split(",").map(d => d.trim()).filter(Boolean) } })} />
                </div>
              </div>
            )}
          </ProfileSection>
        </div>
      )}
    </section>
  );
}

function ProfileSection({ title, expanded, onToggle, children }: {
  title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="prof-section">
      <button className="prof-section-head" onClick={onToggle}>
        <span className="ovl" style={{ margin: 0 }}>{title}</span>
        {expanded ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
      </button>
      {expanded && <div className="prof-section-body">{children}</div>}
    </div>
  );
}
