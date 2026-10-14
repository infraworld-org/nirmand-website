# nirmand.com

The public website of Nirmand India Private Limited: the homepage film, pricing, and every
company and policy page that Razorpay, Google Play, the App Store and Indian law ask for.

Hosted on Vercel. Every push to `main` builds and deploys automatically.

## How it is built

```
site.config.json      company facts and prices: CIN, address, email, phone, packs, Pro
src/index.html        the homepage film (hand-built, uses the shared footer and pricing)
src/pricing.html      the pricing page
src/layout.html       the shell for every content page (header, title band, footer)
src/pages/*.html      one file per content page: about, contact, privacy, terms, …
src/partials/         pieces shared by several pages: footer, pricing plans
assets/               images, fonts, css, video
static/               files served from the site root (favicon.ico)
scripts/build.mjs     turns all of the above into public/ (no dependencies, Node 18+)
vercel.json           build settings, clean URLs, redirects, security headers
```

`public/` is generated on every deploy and is not committed.

## Everyday changes

**A company fact (CIN, address, email, phone, WhatsApp number):** change the value in
`site.config.json` and push. Every page uses the one email address in `company.email`. Lines
with an empty value stay hidden, so the site never shows "to be added". The build prints which
required facts are still missing. A WhatsApp number is optional: when it is filled, the early
access buttons and the help, contact and refund pages also offer WhatsApp.

**A price or pack:** change `pricing` in `site.config.json`. The homepage, the pricing page,
help and the policies all read from there. Keep it the same as the app's `app_config`.

**Policy text:** edit the page in `src/pages/`. If the change is material, also change
`site.policies_updated` in `site.config.json` (it sets the "Last updated" date on every policy).

**A new page:** copy any file in `src/pages/`, change the `<!--page {…} -->` header at the top
(slug, title, description), write the body, and link it from `src/partials/footer.html`.

## Template syntax

```
{{company.cin}}                         a value from site.config.json (escaped)
{{{page.body}}}                         raw HTML
<!--if company.cin--> … <!--/if company.cin-->     only when the value is filled
<!--if !company.cin--> … <!--/if !company.cin-->   only when it is empty
<!--each pricing.packs as k--> {{k.name}} <!--/each k-->
<!--include footer-->                    src/partials/footer.html
```

## Check before you push

```
node scripts/build.mjs
npx serve public
```

The build fails on broken internal links, missing images, a page without a title,
description or canonical, invalid structured data, or leftover text such as "TODO",
"to be added" or `{{`. `node scripts/build.mjs --strict` also fails while any company
fact is missing; use it before the Razorpay review.

## Checkout

`/buy` is a holding page until the web checkout is live. The checkout itself is the Expo web
build of the app (`infraworld-app`, route `/buy`) on its own subdomain. When it is live, set
`buy.checkout_url` in `site.config.json` to its address (for example
`https://pay.nirmand.com/buy`); `/buy` then forwards there and keeps the `?project=` value
the app adds.
