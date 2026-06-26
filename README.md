# GapMap — Frontend (Next.js 15)

The monochrome GapMap UI, wired to the .NET backend. App Router + TypeScript, the design
system in `globals.css` (Fraunces / Inter / Space Mono, the contour-map hero, the four-bucket
monochrome encoding). Same honesty boundary as the backend doc: this is complete source to
run locally, not a build I could compile against the live API from here.

## Run
1. `npm install`
2. Copy `.env.example` → `.env.local` and set:
   - `NEXT_PUBLIC_API_URL` — the backend, e.g. `http://localhost:5080/api`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — your Google OAuth web client ID (same Google project the
     backend validates against)
3. `npm run dev` → http://localhost:3000
4. Start the backend too, and make sure its CORS `Frontend:Origin` matches `http://localhost:3000`.

## Pages & flow
| Route | Purpose | Backend calls |
|---|---|---|
| `/` | Hero landing | — |
| `/login` | Google sign-in + voucher (signup) | `POST /auth/google` |
| `/pending` | Awaiting-approval screen | — |
| `/onboarding` | Upload CV / answers → parse → review | `POST /profile/parse` |
| `/workspace` | The core loop: paste JD → match → confirm → tailor → cover letter → export | `POST /match`, `/tailor`, `/cover-letter`, `/export` |
| `/history` | Past applications; delete | `GET`/`DELETE /applications` |
| `/admin` | Approve users, vouchers, usage | `/admin/*` |

## How auth works
Google Identity Services returns an `id_token` → `POST /auth/google` (with a voucher on first
sign-up) → backend returns a JWT. The token is stored in `localStorage`; `lib/auth.tsx` decodes
its `status`/`role` claims to gate routes (`useRequireApproved`) and the nav. Because status lives
in the token, a user whose status an admin changes must sign in again to get a fresh token —
matching the backend's design note.

## Notes / things to verify
- The four buckets are encoded by **value and form**, not colour — see the `.tag-*` / `.gl-*` /
  `.req-*` rules in `globals.css`. Keep it monochrome.
- `next/font` loads the three families; `layout.tsx` maps them onto the CSS variables `globals.css` uses.
- Enum values from the API are strings (`"Surfaced"`, `"Strong"`, …) because the backend uses
  `JsonStringEnumConverter`. `lib/types.ts` matches that.
- The Google button uses the GIS script; it needs a real client ID and an authorized origin of
  `http://localhost:3000` in the Google console.
