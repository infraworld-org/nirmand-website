# SEAL-16OCT — nirmand.com, 13–16 Oct 2026

Status note for this repo, written 16 Oct 2026 (SEAL-16OCT). All times are IST.

Sources: this repo's git history, GitHub's PR and deployment records, and — only where marked
**[founder, chat]** — the founder's own record from chat. Anything found in none of these is written
as **not recorded**.

This file is **not published**. `scripts/build.mjs` reads only `src/`, `assets/`, `static/`,
`site.config.json`, `vercel.json` and `proxy.ts`, and Vercel serves only `public/`. Nothing in
`docs/` is copied into `public/` (checked with a local build, see the end).

---

## 1. What this repo is

`nirmand-website` is the static site for **nirmand.com**, the public website of Nirmand India
Private Limited: the homepage film, pricing, and every company and policy page that Razorpay,
Google Play, the App Store and Indian law ask for. It is hosted on Vercel; every push to `main`
builds and deploys. Zero-dependency build (`node scripts/build.mjs`, Node 18+). The README is the
how-to; this file is the record of what happened.

The whole repo was born in this window: the root commit is `555b59b` (13 Oct 21:58).

## 2. Timeline

| Hash | Time (IST) | What |
|---|---|---|
| `555b59b` | 13 Oct 21:58 | **Launch build of nirmand.com** (162 files) — direct to `main` |
| `c25a5f9` | 14 Oct 14:25 | Company facts + one contact email — direct to `main` |
| `e7e2fbb` | 14 Oct 14:28 | `site.policies_updated` = `2026-10-14` — direct to `main` |
| `a8a86ec` | 14 Oct 16:24 | Terms: Bricks cannot be sold or resold — direct to `main` |
| `7a39c09` | 14 Oct 21:59 | Account A4: `/buy` edge redirect, `?app=1` content-only pages, pricing anchors |
| `2622f1c` | 14 Oct 22:21 | In-app copies: no prices or how-to-buy lines; terms name no amount |
| `e299639` | 14 Oct 22:24 | **PR #1 merged** (`claude/account-a4`) |
| `34ef3e0` | 14 Oct 22:29 | Terms: "Prices are shown in Indian rupees at checkout…"; in-app help drops the download FAQ |
| `097df31` | 14 Oct 22:36 | **PR #2 merged** (`claude/account-a4-b`) |

No commits on 15 or 16 Oct. `main` is at `097df31`. No open PRs.

## 3. What was built

### 3a. Launch build (13 Oct, `555b59b`)

- Homepage film and pricing, both reading `site.config.json`.
- Shared footer with the legal block; every Buy button points at `/buy`.
- Pages: about, contact, help, download, privacy, terms, refund-policy, delivery-policy, grievance,
  delete-account, ai-content-policy, community-guidelines, news-policy, buy (holding page), 404.
- Self-hosted fonts; images moved to WebP (6.3 MB → 2.9 MB).
- `scripts/build.mjs` with link, meta and leftover-text checks.
- `vercel.json`: clean URLs, redirects (old policy URLs such as `/privacy-policy`, `/refunds`,
  `/shipping`), security headers (CSP, HSTS and others).

### 3b. Company facts and one email (14 Oct, `c25a5f9` · `e7e2fbb` · `a8a86ec`)

- CIN, registered office (Indore, PIN 452010) and the public phone number filled in
  `site.config.json`.
- **One contact email for everything: `ops@nirmand.com`.** The separate support, grievance and
  privacy addresses were removed.
- Removed from the site: the Grievance Officer line, the founder line and the GSTIN line. The
  grievance process itself stays.
- Tax line is now: "Prices shown are the final amount you pay. Nothing more is added at checkout."
- `site.policies_updated` = `2026-10-14` — the "Last updated" date on every policy.
- Terms: Bricks "cannot be withdrawn, sold or resold, exchanged for money, or moved to another
  project or person" (matches Razorpay's rule on credits).

### 3c. Account A4 (14 Oct, PR #1 + PR #2)

The website side of the app's Account round A4 (PR #1 points at the full evidence in the
`infraworld-app` repo, branch `claude/account-hub`, `docs/handoff/ACCOUNT_A4_DIGEST.md`).

- **`/buy` at the edge** (`proxy.ts`, Vercel Routing Middleware, matcher `/buy`). The page never
  renders. With `buy.checkout_url` empty (today) `/buy` answers 307 to `/pricing` and drops every
  query value, so a one-time purchase link (`i`) never reaches a page. When it is set, `/buy`
  forwards to that address with only `project` and `i`, byte for byte. 307 + `no-store` +
  `no-referrer`, no logging. The old client-side redirect in `layout.html` is gone. The build only
  writes a checkout address that is `https://<subdomain>.nirmand.com/buy` and answers; on Vercel
  the build fails if `proxy.ts` and the config disagree. `src/pages/buy.html` is only a fallback.
- **`?app=1` in-app pages.** A redirect at the top of `vercel.json` sends 11 pages (privacy,
  terms, refund-policy, help, delete-account, grievance, contact, delivery-policy,
  ai-content-policy, community-guidelines, news-policy) with `?app=1` to `/in-app/<page>?app=1`:
  no header, nav, CTA or footer; links to home, pricing, checkout and early access become plain
  text; links between the listed pages keep `?app=1`. Copies are `noindex, nofollow` and their
  canonical points at the normal page.
- **No price or how-to-buy line in the in-app copies** (App Store and Play rules on steering):
  such lines sit inside `<!--if !page.app-->`; the build fails if a copy shows `₹`, `Rs` or `INR`.
  The terms have one text for both copies, so they name no amount ("price shown at checkout").
- **Pricing anchors:** `#bricks` / `#pro` on the pricing page, with a scroll-margin fix.
- PR #1's open "Decision for you" (₹999 / ₹2,600 in the in-app help and terms) was settled by
  `2622f1c` and PR #2: the in-app copies show no amount.

PR #1 created 22:13 → merged 22:24. PR #2 created 22:30 → merged 22:36.

### 3d. Prices on the site (`site.config.json`)

Packs: Entry 60 Bricks ₹999 (Starter) · Serious 180 ₹2,499 · Power 400 ₹4,999 (Best value).
Pro ₹2,600 for 365 days, 10 bonus Bricks, 25 family. Free: 1 project, 5 family, 15 per module,
5 Bricks on the first project. Final Look: 1K 2 · 2K 3 · 4K 4 Bricks. Catalogue line: "9,000+
products, 790+ brands, as of October 2026". The README rule: keep these the same as the app's
`app_config`. This seal did **not** compare the two.

## 4. Deploys

Vercel deployments from GitHub's deployment records (all success):

| Commit | Production | Preview |
|---|---|---|
| `e7e2fbb` | 14 Oct 14:36 | |
| `a8a86ec` | 14 Oct 16:25 | |
| `7a39c09` | | 14 Oct 22:00 |
| `2622f1c` | | 14 Oct 22:23 |
| `e299639` (PR #1) | 14 Oct 22:24 | |
| `34ef3e0` | | 14 Oct 22:30 |
| `097df31` (PR #2) | 14 Oct 22:36 | |

No separate deployment shows for `555b59b` or `c25a5f9`. nirmand.com was live on 14 Oct
**[founder, chat]**. Whether the live domain serves `097df31` today was **not checked** from this
session (the session's network proxy blocked the request) and is **not recorded** in this repo.

## 5. Open items

1. **`nirmand.com/buy` still goes to `/pricing`.** `buy.checkout_url` is empty. The app does not
   depend on it — it opens `https://pay.nirmand.com/buy` directly, and pay.nirmand.com went live on
   16 Oct **[founder, chat]**. `/buy` on this site is only for links from outside the app
   (WhatsApp, SMS, pricing cards). Turning it on = the README's four steps (host live → set
   `buy.checkout_url` → `node scripts/build.mjs` → commit `site.config.json` + `proxy.ts`). When —
   **not recorded** (founder's call).
2. **PR #1's "Not checked yet" curl checks** — three URLs to run from the founder's machine:
   `/buy?project=test&i=test` → 307 to `/pricing`, `no-store`; `/privacy?app=1` → 307 to
   `/in-app/privacy?app=1`; `/privacy` → 200. Whether they were run — **not recorded**.
3. **Empty config values** (the build hides these lines):
   - `app.android_url`, `app.ios_url` — the download page says "Coming soon on Google Play / the
     App Store" until they are filled.
   - `app.delete_in_app` — the "In the app" part of `/delete-account` does not render; today the
     page offers only the email route.
   - `company.whatsapp` — no WhatsApp buttons on early access, help, contact or refund.
   - `social.instagram`, `social.linkedin`, `social.youtube`, `social.x` — only
     `social.news_instagram_indore` is filled.
4. **`/delete-account` needs an update when in-app deletion ships in the app (Account round A5):**
   fill `app.delete_in_app` and re-read the page so the email route and the in-app route say the
   same thing.
5. **GSTIN** was removed from the site on 14 Oct. The GST registration status is **not recorded**
   in this repo.
6. **Merged branch `claude/account-a4`** is still on the remote (not deleted). `claude/account-a4-b`
   is not on the remote.

## 6. Local build check (16 Oct, this branch)

`node scripts/build.mjs` on this branch (= `097df31` + this file):

```
Built 28 pages into public/ (169 files).
In-app copies (?app=1): 11 pages. Shown there as plain text, not links: none.
```

No required fact reported missing. `public/` has no `docs/` folder and no `.md` file, and
`proxy.ts` was not rewritten (`CHECKOUT_URL` stays empty, matching the config) — so this note is
not published.
