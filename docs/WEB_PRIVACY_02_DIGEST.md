# WEB-PRIVACY-02 — Privacy policy: pending lines · 365 din · data location · Last updated

**Aadesh:** founder, 24-Nov-2026 + doosra aadesh 26-Nov-2026 (tareekh merge-din · fal.ai · Grievance Officer) ·
**Repo:** `nirmand-website` · **Branch:** `claude/web-privacy-02` (base `main` @ `5c867a8`, PR #5 ka merge) ·
**PR:** #6, ready for review — merge NAHI · **Deploy:** founder ka (merge `main` = Vercel Production, README).

> 🔴 **Grievance Officer ka naam aur designation khaali hain, isliye build abhi jaan-boojh kar FAIL hota hai**
> (§4a). Is haal me PR ka Vercel preview bhi fail hoga, aur merge karne par production deploy fail hoga. Tab live
> site purane deploy par hi rahegi, yani is PR ka koi badlav live nahi jaayega. Pehle naam bharo, phir merge.

Ye file publish NAHI hoti — `scripts/build.mjs` `docs/` nahi padhta (build ke baad `public/` me grep: 0).

**Srot (app repo `infraworld-app`, `origin/main` @ `290aab1`, 24-Nov fetch):**
`docs/plans/PRIVACY_PENDING_LINES.md` · `docs/handoff/PLAY_01_DIGEST.md` §4 ("Data safety → `PLAY_DATA_SAFETY_v1.md`
§1 se hubahu") · `docs/handoff/PLAY_DATA_SAFETY_v1.md` · `docs/handoff/POLICY_VERSION_13NOV_DIGEST.md`.
Mumbai tathya: brain `40_Sessions/2026-11-24-mumbai-switch-seal.md`.

---

## 0. Ek nazar

| #   | Aadesh                                     | Haal                                                                                                       |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1   | PENDING_LINES ki har line verbatim         | **Pehle se LIVE** (PR #5, 13-Nov). File me 1 hi line; repo + live + in-app teeno me EXACT MATCH. Badlav: 0 |
| 2   | Product-view records 365 din               | **Pehle se LIVE** (privacy + delete-account, PR #5). Badlav: 0. 🔴 DB ka 365 Mumbai par naapa nahi (§2)     |
| 3   | Data location: app DB India (Mumbai)       | **Badla** — 1 naya sentence. `data_location` (R2 wali line) byte-wahi, chhui nahi                          |
| 4   | "Last updated" + milaan-table              | **Badla** — `2026-11-13` → `2026-11-26` (26-Nov aadesh: merge-din). 🔴 app `POLICY_VERSION` usi din (§4). Milaan-table §5 |
| 5   | fal.ai (26-Nov)                            | **Badla** — privacy provider table me row + AI para; ai-content-policy ka para. Founder ka text hu-ba-hu      |
| 6   | Grievance Officer (26-Nov)                 | **Badla** — `site.config.json` `grievance_officer {name, designation}` (khaali) + grievance aur privacy par line. 🔴 khaali = build FAIL (§4a) |

Diff: `src/pages/privacy.html` · `src/pages/grievance.html` · `src/pages/ai-content-policy.html` ·
`site.config.json` · `scripts/build.mjs` (gate) · `README.md` (Grievance Officer ka note) · ye digest.

---

## 1. Pending lines — verbatim (naapa, andaaza nahi)

`PRIVACY_PENDING_LINES.md` ki table me **sirf ek row** hai (#1, 139 akshar):

> We record which products you view in the app to improve recommendations and for aggregate brand analytics; never
> shared with your identity.

Naap: Node script — row ke quotes ke beech ka text, `String.includes` (byte-exact), har jagah ginti:

| Jagah                                                      | Natija             |
| ---------------------------------------------------------- | ------------------ |
| `src/pages/privacy.html` (main = is branch)                | EXACT MATCH, 1 baar |
| live `https://nirmand.com/privacy` (24-Nov curl)           | EXACT MATCH, 1 baar |
| live `https://nirmand.com/privacy?app=1` → `/in-app/privacy` | EXACT MATCH, 1 baar |
| `public/privacy.html` + `public/in-app/privacy.html` (is branch ka build) | EXACT MATCH, 1-1 baar |

Live dono panne "Last updated: 13 November 2026" dikhate hain. GitHub deployment record: `5c867a8` (PR #5) →
**Production, success, 13-Nov 12:28:46 UTC (17:58 IST)**.

**"Aaj live me nahi mili" ka sambhavit srot:** app repo ke docs abhi bhi 28-Oct (PR #5 se pehle) ki baat kehte hain —
`PLAY_01_DIGEST.md` §3 #4 ("product-views line policy me nahi mili") + §7 ("Privacy policy me product-views line —
NAHI mili") aur `PLAY_DATA_SAFETY_v1.md` §4 UNKNOWN-5. Ye teen jagah purani hain; inhe sudharna app repo ka kaam
hai (is PR me nahi). Doosra sambhav: purani browser tab / cache — hard refresh.

## 2. 365 din

Website par pehle se (PR #5): privacy "How long we keep it" → *"Up to 365 days, then deleted automatically. If you
delete your account, they are kept without your name for the rest of that period."* · delete-account → *"Up to 365
days"*. Is PR me badlav nahi.

🔴 **DB ka sach naapa NAHI:** 180 → 365 migration `20261113090000_retention_365.sql` (app repo, `main` par hai) dono
sweep function ki body badalti hai. Mumbai seal (24-Nov) me iska RUN-haal KHULA hai. Policy ki line "Up to 365"
180 par bhi jhoothi nahi (pehle mitata hai), par PENDING_LINES aur Play naksha "365" kehte hain. Read-only naap
(Mumbai SQL editor):

```sql
select p.proname,
       pg_get_functiondef(p.oid) like '%interval ''180 days''%' as abhi_bhi_180
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('sku_view_events_retention_sweep', 'promo_events_retention_sweep');
```

**Ummeed (RUN hua):** dono rows `abhi_bhi_180 = false`. `true` = migration Mumbai par nahi chali → RUN app repo ke
`RETENTION_365_DIGEST` se.

## 3. Data location

**Pehle:**
> Your data is kept on secure cloud servers run by the service providers listed above. Some of our service providers
> store or process data outside India. Wherever it is processed, …

**Ab:**
> Your data is kept on secure cloud servers run by the service providers listed above. **The Nirmand app's main
> database, which holds your account and project records, is in Mumbai, India.** Some of our service providers store
> or process data outside India. Wherever it is processed, …

- **Nahi chhui:** `site.config.json` `data_location` = *"Some of our service providers store or process data outside
  India."* — byte-wahi. Photos (Cloudflare R2) ki location founder naapega; tab tak ye line aur photo ke baare me
  koi daawa nahi. "account and project records" jaan-boojh kar — photo / document files ka zikr nahi.
- **Catch-all aaj bhi sach aur zaroori:** Sentry (US), Gemini / OpenAI / fal.ai, Expo; Sydney ki purani copy
  8-Dec delete tak; staff APK aur `com.infraworld.app` 1.1.0 (runtime `5c9deb49`) abhi Sydney par (seal KHULA).
- **Ek baat dekhni:** policy ki provider table me Supabase = *"Database, sign-in and file storage — … photos,
  documents"*. Agar Supabase Storage me koi photo / document hai to wo bhi ab Mumbai me — naapa nahi; R2 naap ke
  saath dekh lena.

## 4. "Last updated" — aur 🔴 app ka POLICY_VERSION

`site.policies_updated` `2026-11-13` → `2026-11-26` (24-Nov ko `2026-11-24` tha; 26-Nov aadesh: merge-din). Ye EK
tareekh har policy panne par lagti hai (privacy, terms, refund, delivery, grievance, delete-account, ai-content,
community, news + in-app copies). Build me naapa (scratch copy, test-naam ke saath — §8): privacy, grievance, terms,
ai-content-policy + in-app terms → "Last updated: 26 November 2026". Ek tareekh isliye ki app ka EK `POLICY_VERSION`
Terms aur Privacy dono ka hai (POLICY_VERSION_13NOV_DIGEST).

🔴 **Jod (app repo, is PR me nahi):** `record_policy_consent` naya manzoori-record `app_config.POLICY_VERSION` se
likhta hai, aur ye live panne ki tareekh ke barabar hona chahiye. Deploy ke **usi din**:

1. Mumbai par `POLICY_VERSION` → deploy ki tareekh (neeche §7 kadam 3).
2. App repo `scripts/redteam-auth02.js:43` `EXPECTED_PAGE_DATE` → `'Last updated: 26 November 2026'`.

Merge 26-Nov ke baad ho (jaise naam kal aaye) → pehle `policies_updated` ko merge ke din par badlo, phir wahi
tareekh POLICY_VERSION aur R4 me.

## 4a. Grievance Officer (26-Nov aadesh)

**Kyun:** IT Rules 2021 rule 3(2) · SPDI Rules 2011 rule 5(9) · Consumer Protection (E-Commerce) Rules 2020
rule 4(4). Ye niyam Grievance Officer ka naam, designation aur contact site par maangte hain. **Itihaas:** 14-Oct
(`c25a5f9`, SEAL-16OCT §3b) ko "Grievance Officer" line site se hataayi gayi thi. 26-Nov ke founder aadesh se wapas
aa rahi hai.

**Kya bana:**
- `site.config.json`: `"grievance_officer": { "name": "", "designation": "" }`. Ye company block ke turant baad hai.
  Naam founder dega.
- Grievance → "Where to send a complaint" aur privacy → "Contact us", dono me ye line aayi, aur uske turant neeche
  pehle wale email / phone / address facts hain:
  > Grievance Officer: <name>, <designation>. You can reach the Grievance Officer at the email address and phone
  > number below.
- `scripts/build.mjs`: `name` ya `designation` me se koi bhi khaali ho to **ERROR**, chahe `--strict` ho ya na ho.
  Ye MISSING-fact wali chetavni nahi hai.
- `README.md` me ek para joda: "The Grievance Officer".

**Naam ke saath designation bhi kyun:** aadesh me sirf naam par FAIL likha tha. Maine designation par bhi FAIL
rakha, kyunki E-Commerce Rules rule 4(4) designation alag se maangta hai aur line ka format "<name>,
<designation>" hai. Aapko sirf naam ka gate chahiye ho to `build.mjs` ki list se `'designation'` hata dena.

**Naam bharne ka kadam:** `site.config.json` me `name` aur `designation` bharo → `node scripts/build.mjs` → exit 0
→ commit → push.

---

## 5. Milaan-table — Policy ↔ Play Data safety form

**Form** = `PLAY_DATA_SAFETY_v1.md` §1 (PLAY_01_DIGEST §4 isi ko "hubahu" bharne ko kehta hai). **Policy** = is
branch ka `src/pages/privacy.html`. ✅ mila · ⚠️ adhoora (policy chup / chhota fark) · 🔴 takraav (form ya policy
badalni padegi). Play paribhasha (Play Help 10787469 / 9859455, 24-Nov search): *Advertising or marketing = "used to
display or target ads or marketing communications"*; sponsored content / native ads = "Contains ads: Yes".

### 5a. Section A

| #   | Form sawaal                     | Form jawab                                 | Policy me                                                         | Milaan |
| --- | ------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- | ------ |
| A1  | Collect / share required data   | Yes                                        | "What we collect"                                                 | ✅      |
| A2  | Encrypted in transit            | Yes                                        | "How we protect your data": encryption in transit (HTTPS)         | ✅      |
| A3  | Account creation                | Google OAuth + phone OTP (sirf login)      | "Your account": Google account + mobile number with OTP           | ✅      |
| A4  | Deletion request · URL          | Yes · `https://nirmand.com/delete-account` | "Your rights" + Delete account page, 7 din (PR #4, 29-Oct)        | ✅ (naksha §3 ka "30 vs 7 din" website par hal; naksha ka note purana) |

### 5b. Data types (form: Collected · Shared · Req/Opt · Purposes)

| #   | Play type                    | Form                                                            | Policy me                                                                                                          | Milaan |
| --- | ---------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | Name                         | Yes · No · Req · App func, Account mgmt                         | "Your account" (Google naam) + "People and shops you add: their names". **Par** "Professionals and shops": unke naam / number se *"invite them to Nirmand"* = Nirmand ka marketing | 🔴 purpose me "Advertising or marketing" nahi |
| 2   | Email address                | Yes · No · Req · App func, Account mgmt                         | Google email + "People and shops you add: … email addresses"                                                       | ✅      |
| 3   | User IDs                     | Yes · No · Req · App func, Account mgmt, Analytics, Fraud       | Account nihit hai; **par** Sentry ko account ID jaata hai (`sentry.ts:147`) — Sentry row sirf "Device data, crash details" | ⚠️      |
| 4   | Address                      | Yes · No · Opt · App func                                       | "Project details: name, type, location…" (shop ka pata-text policy me nahi — chhota)                                | ✅      |
| 5   | Phone number                 | Yes · No · Req · App func, Account mgmt, Fraud                  | Mobile + OTP ✅; **par** "Send updates and city news on WhatsApp, only if you agree" + professionals ko invite = marketing | 🔴 purpose me "Advertising or marketing" (ya "Developer communications") nahi |
| 6   | Race / religion / orientation | No                                                             | Kahin nahi                                                                                                         | ✅      |
| 7   | Other info                   | Yes · No · Opt · App func (My Home: property / utility / consumer IDs, warranties, society, staff / vendor + rating) | "Site records", "People and shops you add" — **My Home records ka zikr nahi**                                       | ⚠️      |
| 8   | User payment info            | **No**                                                          | "We never see your card number, CVV, UPI PIN or banking password"                                                  | ✅      |
| 9   | Purchase history             | Yes · No · Opt                                                  | "Payments: What you bought, for which project…"                                                                    | ✅      |
| 10  | Credit score                 | No                                                              | Kahin nahi                                                                                                         | ✅      |
| 11  | Other financial info         | Yes · No · Opt · App func                                       | "Site records: materials, payments, expenses", "quotations, rates", "payments you record with them"                | ✅      |
| 12  | Approximate location         | Yes · No · Opt · App func, Analytics                            | City ✅; **par** *"We may use your city and the products you view to choose which promotions to show you, including promotions from brands"* | 🔴 purpose me "Personalization" + "Advertising or marketing" nahi |
| 13  | Precise location             | Yes · No · Opt · App func                                       | "your location if you allow it … only while you are using it" (shop GPS ka zikr nahi — chhota)                     | ✅      |
| 14  | Photos                       | Yes · No (service providers) · Opt · App func                   | Room photos, documents, people photos ✅. fal.ai (code: `segment-surface/index.ts`, `generation-openai.ts:45` → `fal.run`) — **26-Nov se policy me**: provider row + *"… to Google's Gemini API, or to OpenAI's models directly or through fal.ai."* (privacy + ai-content-policy) | ✅ (24-Nov 🔴 tha) |
| 15  | Videos                       | No                                                              | Kahin nahi                                                                                                         | ✅      |
| 16  | Voice or sound recordings    | No                                                              | "Nirmand receives only the text"                                                                                   | ✅      |
| 17  | Music / other audio          | No                                                              | Kahin nahi                                                                                                         | ✅      |
| 18  | Files and docs               | Yes · No · Opt · App func                                       | "Documents and photos: bills, … drawings"                                                                          | ✅      |
| 19  | Calendar                     | No                                                              | Kahin nahi                                                                                                         | ✅      |
| 20  | Contacts                     | No                                                              | Contact list padhne ka daawa nahi; log haath se jode jaate hain                                                    | ✅      |
| 21  | Emails                       | No                                                              | "When you contact us" = user ka apna mail app                                                                      | ✅      |
| 22  | SMS or MMS                   | No                                                              | SMS sirf OTP bhejne ke liye                                                                                        | ✅      |
| 23  | Other in-app messages        | Yes · No · Opt · App func                                       | "Family Voice questions, answers and comments"                                                                     | ✅      |
| 24  | App interactions             | Yes · No · Req · Analytics, Personalization, App func           | **Line #1 verbatim ✅**, promo see / tap ✅, 365 din ✅. **Par** (a) brand promo ki targeting = purpose me "Advertising or marketing" nahi; (b) "app last opened" (`last-opened.ts:47`) policy me nahi | 🔴 (a) · ⚠️ (b) |
| 25  | In-app search history        | Yes · No · Opt · App func                                       | Text search ka zikr **nahi** (sirf voice: "receives only the text")                                               | ⚠️      |
| 26  | Installed apps               | No                                                              | Kahin nahi                                                                                                         | ✅      |
| 27  | Other user-generated content | Yes · No · Opt · App func                                       | Projects, shortlists, selections, notes, AI previews                                                               | ✅      |
| 28  | Other actions                | Yes · No · Req · App func, Fraud                                | "decisions" ✅; consent ka record rakhna nihit ("Our legal basis")                                                  | ✅      |
| 29  | Web browsing history         | No                                                              | Website: "does not run analytics"                                                                                  | ✅      |
| 30  | Crash logs                   | Yes · No (Sentry) · Req                                         | "Crash reports" + Sentry row                                                                                       | ✅      |
| 31  | Diagnostics                  | Yes · No · Req                                                  | "App version, device model, operating system, language"                                                            | ✅      |
| 32  | Other app performance data   | No                                                              | Kahin nahi                                                                                                         | ✅      |
| 33  | Device or other IDs          | Yes · No · Opt · App func                                       | "push-notification token"; ad networks nahi (AD_ID naap AAB par baaki — naksha UNKNOWN-3)                           | ✅      |
| 34  | Health / fitness             | No                                                              | Kahin nahi                                                                                                         | ✅      |

### 5c. App content (wahi Play round)

| #   | Section          | Form jawab                    | Policy me                                                                                         | Milaan |
| --- | ---------------- | ----------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| C1  | Privacy policy   | `https://nirmand.com/privacy` | Live 200 (24-Nov)                                                                                 | ✅      |
| C2  | Ads              | No                            | *"We may also show promotions from brands … always marked as sponsored"*. Play: sponsored = ads    | ⚠️ aaj "No" tab tak sach jab tak app me koi brand promo nahi; **pehla brand promo = "Yes" usi din** |
| C3  | Target audience  | 18 and over                   | "Children": 18 and above                                                                          | ✅      |

### 5d. Service providers (naksha §2 ↔ policy table)

Supabase ✅ · Cloudflare ✅ · Google (Gemini) ✅ · OpenAI ✅ · fal.ai ✅ (26-Nov row) · Sentry ✅ · Expo ✅ ·
MSG91 ✅ ("SMS and messaging providers") · Razorpay ✅ · (Vercel sirf policy me — website hosting, theek).

**Ginti (41 row, 26-Nov):** ✅ 33 · ⚠️ 4 (#3, #7, #25, C2) · 🔴 4 (#1, #5, #12, #24). #24 me ek ⚠️ bhi hai. 24-Nov
ko 🔴 5 the; #14 fal.ai ab ✅ hai.

---

## 6. Faisle chahiye (founder) — kuch bhi lagaya NAHI

Policy ka text founder ka hai; isliye neeche ka copy **sirf sujhav** hai (#3 chhod kar — wo 26-Nov ko laga). Form ke badlav app repo ke
`PLAY_DATA_SAFETY_v1.md` me (app lane).

1. 🔴 **Purposes (#12, #24):** form me Approximate location → `Personalization` + `Advertising or marketing`; App
   interactions → `Advertising or marketing`. Mera sujhav: abhi se jodo (policy "may" kehti hai; naksha ka niyam —
   zyada batana = listing par ek line, kam batana = ullanghan). Ya policy se brand-promo targeting hatao.
2. 🔴 **Name + Phone purpose (#1, #5):** professionals ko invite + WhatsApp city news = marketing. Form me
   `Advertising or marketing` jodo — ya ye dono kaam band hain to policy se lines hatao.
3. ✅ **fal.ai (#14) — LAGAYA 26-Nov (founder aadesh):** provider table me row hai, aur AI para privacy +
   ai-content-policy dono me hai. Text founder ka hai, hu-ba-hu.
4. ⚠️ **Search (#25)** — "How you use the app" me: *"The words you type or say in search are sent to our servers to
   find products. We do not keep a search history in your account."*
5. ⚠️ **App last opened (#24b)** — wahi section: *"We also record the day you last opened the app."* (24 mahine ke
   inactive-account niyam se judta hai.)
6. ⚠️ **My Home (#7)** — "What you add to your projects" me: *"Home records: property, utility and consumer numbers,
   warranties, society details, and the staff and vendors you add, with your ratings."*
7. ⚠️ **Sentry (#3)** — provider table "Data involved": *"Device data, crash details, your account ID"*.
8. ⚠️ **Ads (C2)** — pehla brand promo live hone ke din Play "Contains ads" → Yes.

**UNKNOWN (naapa nahi):**
- Play ki "anonymised data = sharing nahi" chhoot 24-Nov search me pakki nahi hui. "Brands and partners"
  (statistics) ke liye "Shared: No" isi par tika hai → Help 10787469 ka "sharing" hissa aankh se padho.
- Mumbai par 365 RUN (§2) · Supabase Storage me photos (§3). (fal.ai live hai ya nahi, ye ab policy ke liye
  zaroori nahi: naam policy me hai.)

---

## 7. Founder ke kadam (kram se)

0. **Grievance Officer ka naam + designation** do → `site.config.json` me bharna → `node scripts/build.mjs` exit 0
   → commit + push (§4a). Iske bina merge mat karo: production build fail hoga aur site purani rahegi.
1. PR review → **merge = Production deploy**. Merge 26-Nov ke baad ho → pehle `site.policies_updated` merge-din
   par, aur neeche ke SQL + R4 me bhi wahi tareekh.
2. **Deploy naap:** `/privacy`, `/privacy?app=1`, `/terms?app=1`, `/grievance` → "Last updated: 26 November 2026".
   Privacy par "is in Mumbai, India." + "through fal.ai" + "Grievance Officer: <naam>, <designation>". Grievance par
   bhi "Grievance Officer: …". Purani tab band karke hard refresh karna.
3. **Usi din, Mumbai SQL editor** — POLICY_VERSION_13NOV_DIGEST ke kadam 1–4, sirf value aur note naye. Kadam 2 ki
   ummeed ab `2026-11-13` hai (switch ke baad Mumbai par pehli baar dekh rahe ho; kuch aur dikhe → RUKO). Kadam 3:
   naya tab, POORA ek saath Run:

   ```sql
   select set_config('request.jwt.claims', json_build_object('sub', (select user_id::text from public.app_admins order by added_at limit 1), 'role', 'authenticated', 'aal', 'aal2')::text, false);
   select public.admin_set_config('POLICY_VERSION', '2026-11-26', 'WEB-PRIVACY-02: privacy policy updated 26 Nov 2026 (app database in Mumbai, fal.ai, Grievance Officer)');
   select set_config('request.jwt.claims', '', false);
   ```

   Phir kadam 4 ka verify: `value = 2026-11-26`, `admin_actions` me `set_config` row, actor = pehla admin.
4. App repo: `scripts/redteam-auth02.js:43` `EXPECTED_PAGE_DATE` → `'Last updated: 26 November 2026'` (app lane PR).
5. §2 ki read-only query Mumbai par (365 RUN hua ya nahi).
6. §6 ke faisle. App repo ke purane notes (PLAY_01_DIGEST §3 #4 + §7, PLAY_DATA_SAFETY_v1 §4 UNKNOWN-5 + §3 "30 din")
   app lane me sudharna.

## 8. Naap (gates) — 26-Nov

**(a) Repo, naam khaali (jaisa commit hua):** `node scripts/build.mjs` → **exit 1**, `--strict` → exit 1. ERRORs:
- `site.config.json: grievance_officer.name is empty …`
- `site.config.json: grievance_officer.designation is empty …`
- template-guard: `pages/grievance.html` + `pages/privacy.html` me `{{grievance_officer.name}}` aur
  `{{grievance_officer.designation}}` khaali.

**(b) Scratch copy (src, assets, static, scripts, config, vercel.json, proxy.ts), config me test-naam "Test Person" /
"Test Designation"** (commit nahi hua): exit 0. *"Built 28 pages into public/ (169 files)"*. In-app copies 11,
plain-text links: none.
- grievance, privacy + dono in-app copies: `<p>Grievance Officer: Test Person, Test Designation. You can reach the
  Grievance Officer at the email address and phone number below.</p>`. Grievance par iske neeche
  `mailto:ops@nirmand.com?subject=Grievance` aur `tel:+919669929990` hain.
- fal.ai: privacy me 2 baar (row + para), aur ai-content-policy + in-app copy me 1-1 baar. Founder ka sentence
  hu-ba-hu: *"to Google's Gemini API, or to OpenAI's models directly or through fal.ai."*
- privacy, grievance, terms, ai-content-policy + in-app terms: "Last updated: 26 November 2026".
- 24-Nov ke badlav bache hain: Mumbai sentence privacy + in-app me 1-1 baar, aur line #1 EXACT MATCH 1-1 baar.

**(c) Bypass koshish (scratch):** naam khaali rakha aur dono line `<!--if grievance_officer.name-->` me lapet di →
**exit 1**, gate ke dono ERROR. Matlab line chhupa kar gate se bacha nahi ja sakta.

**(d)** `site.config.json` `data_location` byte-wahi raha. `public/` me `WEB_PRIVACY` / `PLAY_01` / `milaan`: 0 (ye
digest publish nahi hota).
