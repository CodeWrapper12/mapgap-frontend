import type {
  AuthResponse, CandidateProfile, MatchResponse, ConfirmedItem, TailorResult,
  CoverLetterInputs, CoverLetterResult, HistoryItem,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080/api";
const TOKEN_KEY = "gapmap_token";

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let activeRequests = 0;
function updateLoader(delta: number) {
  if (typeof window === "undefined") return;
  activeRequests = Math.max(0, activeRequests + delta);
  if (activeRequests > 0) window.dispatchEvent(new Event("gapmap-load-start"));
  else window.dispatchEvent(new Event("gapmap-load-end"));
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  updateLoader(1);
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers });
    if (res.status === 401) { tokenStore.clear(); throw new ApiError(401, "Not authenticated."); }
    if (!res.ok) {
      let msg = res.statusText;
      try { const body = await res.json(); msg = body.error ?? body.errors?.[0] ?? msg; } catch { /* ignore */ }
      throw new ApiError(res.status, msg);
    }
    if (res.status === 204) return undefined as T;
    const ct = res.headers.get("content-type") ?? "";
    return (ct.includes("application/json") ? res.json() : (res as unknown)) as T;
  } finally {
    updateLoader(-1);
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const api = {
  // Auth
  googleAuth: (idToken: string) =>
    req<AuthResponse>("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) }),
  redeemVoucher: (code: string) =>
    req<AuthResponse>("/auth/redeem", { method: "POST", body: JSON.stringify({ code }) }),
  refreshAuth: () =>
    req<AuthResponse>("/auth/refresh", { method: "POST" }),

  // Profile / onboarding
  parseProfile: (file?: File, answers?: string) => {
    const fd = new FormData();
    if (file) fd.append("file", file);
    if (answers) fd.append("answers", answers);
    return req<CandidateProfile>("/profile/parse", { method: "POST", body: fd });
  },
  getProfile: () => req<CandidateProfile>("/profile"),
  updateProfile: (p: CandidateProfile) => req<void>("/profile", { method: "PUT", body: JSON.stringify(p) }),

  // Re-upload CV to re-parse the profile (used from the profile management page).
  reParseProfile: (file: File, answers?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (answers) fd.append("answers", answers);
    return req<CandidateProfile>("/profile/parse", { method: "POST", body: fd });
  },

  // Core loop
  match: (jdText: string) => req<MatchResponse>("/match", { method: "POST", body: JSON.stringify({ jdText }) }),
  tailor: (applicationId: string, confirmedItems: ConfirmedItem[]) =>
    req<TailorResult>("/tailor", { method: "POST", body: JSON.stringify({ applicationId, confirmedItems }) }),
  coverLetter: (applicationId: string, selectedPoints: string[], inputs: CoverLetterInputs) =>
    req<CoverLetterResult>("/cover-letter", { method: "POST", body: JSON.stringify({ applicationId, selectedPoints, inputs }) }),

  // Export returns a file — handle the blob directly
  export: async (applicationId: string, formats: string[]) => {
    const token = tokenStore.get();
    const res = await fetch(`${BASE}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ applicationId, formats }),
    });
    if (!res.ok) throw new ApiError(res.status, "Export failed.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = formats[0] === "docx" ? "cv.docx" : "cv.pdf";
    a.click();
    URL.revokeObjectURL(url);
  },

  // History / PII
  history: () => req<HistoryItem[]>("/applications"),
  deleteApplication: (id: string) => req<void>(`/applications/${id}`, { method: "DELETE" }),
  deleteAccount: () => req<void>("/me", { method: "DELETE" }),

  // Admin
  pendingUsers: () => req<{ id: string; email: string; createdAt: string }[]>("/admin/users"),
  approveUser: (id: string, approve: boolean) =>
    req<void>("/admin/users/approve", { method: "POST", body: JSON.stringify({ id, approve }) }),
  updateUser: (id: string, name: string) =>
    req<void>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  createVoucher: (maxUses: number, expiresAt?: string) =>
    req<{ code: string }>("/admin/vouchers", { method: "POST", body: JSON.stringify({ maxUses, expiresAt }) }),
  usage: () => req<{ total: number; limit: number; remaining: number; mostTokenUsedFor: string; users: { id: string; email: string; name: string; status: string; cost: number; calls: number }[] }>("/admin/usage"),
};
