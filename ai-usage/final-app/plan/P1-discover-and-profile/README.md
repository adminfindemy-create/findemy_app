# P1 — Discover & profile

> **Goal.** Build the catalog the conversion loop sells: a rich, Delhi-NCR academy profile (with media), working discovery, and — most importantly — the **Batch as the single source of truth** for fee, academy-set discount, mode, and capacity. **S1.3 defines the contract everything downstream (P2/P3) reads.**
>
> **Source:** [`../../master-execution-plan.md`](../../master-execution-plan.md) §P1. Code state from [`../../implementation-gap-analysis.md`](../../implementation-gap-analysis.md), re-grounded against the **post-P0** code (2026-06-23).

## Slices
| Slice | What | Status mix | Deps |
|---|---|---|---|
| [**S1.1**](./S1.1-academy-profile-gallery.md) | Academy profile + media gallery (**add video**) | REUSE / CHANGE | S0.1 |
| [**S1.2**](./S1.2-discovery-search.md) | Discovery & search | REUSE (verify) | S0.4, S1.1 |
| [**S1.3**](./S1.3-batches-fee-discount-mode.md) | **Batch = catalog source of truth** (fee + discount ≤30% + mode + spots) | CHANGE / BUILD | S0.1, S0.4 — **unblocks S2.1, S2.3, S3.x** |

## Order (solo dev)
```
S1.1   academy profile + video gallery     # mostly REUSE — gallery already built, add video MIME
S1.2   discovery/search                     # mostly REUSE/verify (Delhi-NCR done in S0.4)
S1.3   batches: fee + discount + mode        # the unlocker — do last in P1, it gates P2/P3
```
S1.1 and S1.2 are light (the heavy lifting was already done pre-P0 + in S0.4). **S1.3 is the real work and the critical path.**

## 🔗 Sync with executed P0 (read before starting)
P0 changed the ground under P1 — honor these:
- **Mode value set = Option A (locked in S0.1).** DB `BatchMode` stays `online | offline` (`offline` ≡ in-studio); the **wire** is canonical `Mode = 'in-studio' | 'online'` (`@findemy/types`). `Trial.mode` already emits canonical; **`Batch.mode` is still serialized raw** — there's a `TODO(S1.3)` on it in `backend/shared/types`. **S1.3 resolves that** (map `offline → 'in-studio'` in the batch read serializer, mirroring `studio/service.ts:93`).
- **`biannual` is still live** (deferred to S2.3). S1.3 **adds** `quarterlyDiscountBps`/`annualDiscountBps` to `Batch`, but **enrol pricing still reads the hardcoded `PACKAGE_CONFIG`** (with `biannual`) until **S2.3** wires pricing to the batch discount. So in P1 the discount columns are *stored*, not yet *consumed*. Don't try to remove `biannual` or rewire pricing here.
- **`getBatchAvailability` already computes `capacity − enrolled`** (`batches/service.ts` → `available`). Reuse it for "N trial spots" — don't reinvent. (Trial *booking* availability still uses `slots` — that's S2.1, not P1.)
- **Media gallery already exists** (≤10 cap in `studio/upload.ts`; `MAX_IMAGES=10` + picker in academy `profile/edit.tsx`; FlatList in student `academy/[id].tsx`). S1.1 is **add video** (decided §4), not build-the-gallery.
- **`modesOffered` now exists on `Academy`** (added in S0.3) and is returned as `modes_offered`. S1.1 can **surface offered modes on the profile** (new display).
- **Seed is Delhi-NCR** (S0.4). S1.3 **re-touches the seed** to set `quarterlyDiscountBps`/`annualDiscountBps` on The Rhythm House batches (demo 10% / 20%).
- **Shared rails available** (S0.1): import `Mode`, money=paise, discount=bps (cap 3000), `ApiErrorCode` from `@findemy/types`. Schema changes apply via **`prisma db push`** in this env (shadow-DB perms block `migrate dev`).

## P1 exit criteria (phase Definition of Done)
- [x] Academy can upload **photos and videos** (≤10 total); student sees both in the academy gallery (S1.1).
- [x] Discovery search/filter/category/top-rated/near-you works on the Delhi-NCR seed; reaches academy detail (S1.2).
- [x] **`Batch` carries `quarterlyDiscountBps`/`annualDiscountBps`** (≤3000, server-validated); academy New/Edit batch captures **discount % + mode**; batch read emits canonical `Mode` + computed **trial spots** (S1.3).
- [x] All 5 packages typecheck clean; backend boots; seed loads with discount fields.

## ✅ Implementation status (2026-06-25) — COMPLETE & VERIFIED
All three slices implemented; **5 packages typecheck clean**; **backend boots** (`:8080`); **full backend suite green (58/58)**. Verified evidence:
- **S1.1:** `studio/upload.ts` now accepts image **+ video** MIME (mp4/mov/webm) with an explicit allowlist (rejects unknown types) and keeps the ≤10 cap; `modes_offered` added to **both** the public academy detail (`academies/service.ts`) and the academy's own read (`GET /studio/academy`). Academy `profile/edit.tsx` → picker `MediaTypeOptions.All` + read-only offered-modes display + "Photos & videos"; student `academy/[id].tsx` → renders video gallery tiles + offered-modes chips. *(Inline video **playback** uses a poster tile — full playback needs `expo-video`, a deferred follow-up since no video lib is installed.)*
- **S1.2:** discovery verified on the Delhi-NCR seed (8 academies across music/dance/arts/yoga; params `q/category/radius_km/min_rating/sort` intact; pills match the enum). **No code change.**
- **S1.3:** `Batch.quarterlyDiscountBps`/`annualDiscountBps` added (`prisma db push`), server-validated `≤3000`; **mode canonicalized end-to-end** (Option A) — all four read serializers (`academies:143`, `studio:127/151`, `auth:649`) + write path map via `lib/mode.ts`, academy New/Edit toggles use `'in-studio'|'online'`, `TODO(S1.3)` removed from `@findemy/types`; **`trial_spots`** (= capacity − active enrolled) exposed on batch reads via a `_count`; seed sets demo **10%/20%** on the featured batches; api-client payloads carry discount + canonical mode.
- **Round-trips proven against the real DB:** academy-detail serializer returns `mode:"in-studio", trial_spots:8, q:1000/a:2000`; studio create→read maps `'in-studio'` → DB `offline` → back to `'in-studio'`, discount 2500 persists, `trial_spots:10`. `≤30%` enforced server-side (zod `.max(3000)`) **and** client-side (New zod refine + Edit guard).

### ⚠️ Deferred (not regressions — owned by later slices, per plan)
- **Discount stored, not consumed** — enrol pricing still uses `PACKAGE_CONFIG` (with `biannual`); **S2.3** rewires it to `Batch.*DiscountBps`.
- **Inline video playback** — gallery shows a poster tile; full playback needs `expo-video` (dep + device testing).
- **`fitness` category — DEFERRED** (decision settled): prisma `Category` stays music/dance/arts/yoga; not in seed/pills/cast, so adding it now would create an empty category. Add the enum value when a fitness academy is onboarded.

## Open decisions (resolved)
1. **`fitness` category** — **deferred** (see above).
2. **Mode** — Option A **implemented** end-to-end; revisit only if `offline`-means-in-studio causes confusion (would be a migration).
