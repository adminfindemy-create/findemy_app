# ai-usage

Working docs and design assets for **Findemy** (skill-academy discovery app). Organized by purpose.

> **Resuming work / new machine?** Read [`CLAUDE.md`](CLAUDE.md) first — it's the session context handoff (decisions, folder map, what's done, what's next). Canonical product docs live in [`app-ideation/`](app-ideation/).

## app-ideation/  ← canonical product docs
The non-technical source of truth: what Findemy is, who it's for, the problem, MVP scope, business model, differentiation, roadmap. Start at `app-ideation/README.md`. Supersedes the old `vision.md` (now in `_archive/`).

## audits/
Point-in-time reviews of the apps (all 2026-05-17).
- `audit-student.md` — Student app audit vs mockup. P0/P1/P2 gaps.
- `audit-admin.md` — Admin app audit vs mockup. P0/P1/P2 gaps.
- `student_enhancement.md` — Verified bug + UI/UX consistency sweep for the student app, grouped (A–G) with per-group execution + verification plans.
- `ui-deep-comparison.md` — Pixel-level, screen-by-screen comparison of the student app vs the `student.html` mockup.

## specs/
Forward-looking specs and operational prep.
- `improvements_Stu.md` — Student prototype → production-grade frontend refactor spec.
- `pre-launch-checklist.md` — Everything outside the codebase needed before launch (accounts, OAuth, Razorpay, MSG91, R2, EAS, store submission, env vars).

## assets/
Source mockups, design references, and screenshots referenced by the docs above.
- `student.html`, `admin.html` — full HTML mockups.
- `academy-cta-prototype.html`, `program-cards-prototype.html` — component prototypes.
- `findemy-app-idea.png`, `app-banner.jpeg`, `splash_screen.jpeg` — design / ideation references.
- `current_Stu_app/` — screenshots of the current student app (img1–img7).

## _archive/
Superseded docs kept for reference.
- `vision.md` — the original product vision; replaced by `app-ideation/`.
