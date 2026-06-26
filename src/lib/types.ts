// Mirrors the backend Domain contracts. Responses are camelCase; enums are strings
// (the API is configured with JsonStringEnumConverter).

export type Bucket = "Matched" | "Surfaced" | "LearnableGap" | "RealGap";
export type Importance = "Required" | "Preferred";
export type ScoreBand = "Strong" | "Moderate" | "Weak";

export interface RequirementClassification {
  requirement: string;
  importance: Importance;
  bucket: Bucket;
  evidenceRef?: string | null;
  jdPhrase?: string | null;
  profileEvidence?: string | null;
  rationale?: string | null;
  suggestedLearnPath?: string | null;
  impact?: string | null;
}

export interface MatchResult {
  score: number;
  scoreBand: ScoreBand;
  requirements: RequirementClassification[];
}

export interface MatchResponse {
  applicationId: string;
  match: MatchResult;
}

export interface ConfirmedItem {
  requirement: string;
  evidenceRef?: string | null;
  seed?: string | null;
}

export interface TailoredBullet {
  requirement: string;
  bullet: string;
  provenance: string;
  skillsUsed: string[];
}

export interface TailorResult {
  bullets: TailoredBullet[];
  rejected: string[];
}

export interface CoverLetterInputs {
  motivation?: string;
  hiringManager?: string;
  tone?: string;
  length?: string;
}

export interface CoverLetterResult {
  letter: string;
  flags: string[];
}

// Profile (subset used by the UI; the full shape matches the backend CandidateProfile).
export interface CandidateProfile {
  identity: { name: string; targetTitles: string[]; contact: { email?: string; phone?: string; links: string[] } };
  summarySeed?: string;
  skills: Record<string, string[]>;
  experience: { id: string; company: string; title: string; location?: string; start?: string; end?: string; current: boolean; description?: string; bullets: { id: string; text: string; metrics: string[]; tech: string[] }[] }[];
  projects: { id: string; name: string; period?: string; description?: string; link?: string; tech: string[] }[];
  education: { degree: string; institution: string; location?: string; start?: string; end?: string; highlights?: string[] }[];
  certifications: { name: string; issuer?: string; date?: string }[];
  seniority?: { totalYearsOfExperience?: string; level?: string; domains: string[] };
}

export interface HistoryItem {
  id: string;
  targetTitle?: string | null;
  score: number;
  hasTailored: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  status: "pending" | "approved" | "disabled";
}

// Bucket display metadata — monochrome encoding lives in CSS via the bucket key.
export const BUCKET_META: Record<Bucket, { label: string; key: string }> = {
  Matched: { label: "Matched", key: "matched" },
  Surfaced: { label: "Hidden strength", key: "surfaced" },
  LearnableGap: { label: "Quick win", key: "learnable" },
  RealGap: { label: "Real gap", key: "gap" },
};
