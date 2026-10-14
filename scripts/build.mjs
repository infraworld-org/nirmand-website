#!/usr/bin/env node
/**
 * Nirmand website build — zero dependencies, Node 18+.
 *
 *   node scripts/build.mjs            build into public/
 *   node scripts/build.mjs --strict   also fail when a company fact is still empty
 *
 * Inputs : site.config.json (company facts, prices), src/ (pages and partials),
 *          assets/ (images, fonts, css) and static/ (files served from the site root).
 * Output : public/  — what Vercel serves. Never edit public/ by hand.
 *
 * Template syntax (used in src/):
 *   {{path}}  escaped value       {{{path}}}  raw HTML value
 *   <!--include name-->           inserts src/partials/name.html
 *   <!--if path--> … <!--/if path-->      kept only when the value is filled
 *   <!--if !path--> … <!--/if !path-->    kept only when the value is empty
 *   <!--each list as x--> … {{x.name}} … <!--/each x-->
 * A page in src/pages starts with  <!--page {json} -->  (slug, title, description, …).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'public');
const STRICT = process.argv.includes('--strict');

const errors = [];
const warnings = [];
const missingFacts = new Map(); // fact -> Set(pages)

// ------------------------------------------------------------------ config
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const human = (s) =>
  new Date(`${s}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const digits = (s) => String(s || '').replace(/\D/g, '');

function buildContext() {
  const c = cfg.company;
  const o = c.office || {};
  const officeComplete = Boolean(o.line1 && o.city && o.state && o.pin);
  const officeFull = officeComplete
    ? [o.line1, o.line2, o.city, `${o.state} ${o.pin}`, o.country].filter(Boolean).join(', ')
    : '';
  const location = [o.city, o.state, o.country].filter(Boolean).join(', ');
  const wa = digits(c.whatsapp);
  const waText = encodeURIComponent(cfg.app.early_access_message || '');
  const p = cfg.pricing;
  const base = p.packs[0].price / p.packs[0].bricks;
  const packs = p.packs.map((k, i) => {
    const save = i === 0 ? 0 : Math.round((1 - k.price / k.bricks / base) * 100);
    return {
      ...k,
      price_fmt: inr(k.price),
      per_brick: `₹${(k.price / k.bricks).toFixed(2)}`,
      save_pct: save > 0 ? String(save) : '',
      tag_line: [k.tag, save > 0 ? `Save ${save}%` : ''].filter(Boolean).join(' · '),
      best: k.tag === 'Best value' ? 'yes' : '',
      starter: i === 0 ? 'yes' : '',
    };
  });
  return {
    site: { ...cfg.site, policies_updated_human: human(cfg.site.policies_updated) },
    company: {
      ...c,
      office_full: officeFull,
      location,
      phone_tel: c.phone ? `tel:${c.phone.replace(/[^\d+]/g, '')}` : '',
      whatsapp_link: wa ? `https://wa.me/${wa}?text=${waText}` : '',
      whatsapp_chat: wa ? `https://wa.me/${wa}` : '',
      incorporated_human: c.incorporated ? human(c.incorporated) : '',
    },
    social: cfg.social,
    app: cfg.app,
    buy: cfg.buy,
    data_location: cfg.data_location,
    catalogue: {
      ...cfg.catalogue,
      products_count: digits(cfg.catalogue.products),
      brands_count: digits(cfg.catalogue.brands),
    },
    pricing: {
      packs,
      base_per_brick: `₹${base.toFixed(2)}`,
      from_fmt: packs[0].price_fmt,
      pro: { ...p.pro, price_fmt: inr(p.pro.price) },
      free: p.free,
      final_look: p.final_look,
      price_note: 'Prices shown are the final amount you pay. Nothing more is added at checkout.',
    },
    build: { date: iso(today), year: String(today.getUTCFullYear()) },
    org_jsonld: orgJsonLd(c, o, officeComplete),
  };
}

function orgJsonLd(c, o, officeComplete) {
  const site = cfg.site.url;
  const sameAs = Object.values(cfg.social).filter((v) => typeof v === 'string' && /^https?:\/\//.test(v));
  const support = { '@type': 'ContactPoint', contactType: 'customer support', email: c.email, areaServed: 'IN', availableLanguage: ['en', 'hi'] };
  if (c.phone) support.telephone = c.phone;
  const address = { '@type': 'PostalAddress', addressLocality: o.city, addressRegion: o.state, addressCountry: 'IN' };
  if (officeComplete) {
    address.streetAddress = [o.line1, o.line2].filter(Boolean).join(', ');
    address.postalCode = o.pin;
  }
  const org = {
    '@type': 'Organization',
    '@id': `${site}/#org`,
    name: c.brand,
    legalName: c.legal_name,
    alternateName: ['Nirmaan', 'Nirman'],
    url: `${site}/`,
    logo: `${site}/assets/img/logo-ink.png`,
    email: c.email,
    foundingDate: c.incorporated,
    address,
    contactPoint: [support],
  };
  if (c.phone) org.telephone = c.phone;
  if (c.cin) org.identifier = { '@type': 'PropertyValue', propertyID: 'CIN', value: c.cin };
  if (sameAs.length) org.sameAs = sameAs;
  const website = { '@type': 'WebSite', '@id': `${site}/#website`, url: `${site}/`, name: c.brand, publisher: { '@id': `${site}/#org` }, inLanguage: 'en-IN' };
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [org, website] }).replace(/</g, '\\u003c');
}
const ctx = buildContext();

// Facts the law, Razorpay or the stores expect on the site. Empty = warning (error with --strict).
const FACTS = [
  ['company.cin', 'CIN (Companies Act, Razorpay)'],
  ['company.office_full', 'Registered office address with PIN code'],
  ['company.email', 'Public email address (Razorpay, Play, Apple)'],
  ['company.phone', 'Public support phone number (Razorpay, Play, Apple)'],
];

// ---------------------------------------------------------------- template
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function lookup(scope, p) {
  return p.split('.').reduce((v, k) => (v == null ? undefined : v[k]), scope);
}
function filled(v) {
  if (v == null || v === false) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

const partials = new Map();
for (const f of fs.readdirSync(path.join(SRC, 'partials'))) {
  if (f.endsWith('.html')) partials.set(f.replace(/\.html$/, ''), fs.readFileSync(path.join(SRC, 'partials', f), 'utf8'));
}

function render(tpl, scope, where, depth = 0) {
  if (depth > 8) throw new Error(`include loop in ${where}`);
  // includes
  tpl = tpl.replace(/<!--include ([\w-]+)-->/g, (_, name) => {
    if (!partials.has(name)) {
      errors.push(`${where}: unknown partial "${name}"`);
      return '';
    }
    return render(partials.get(name), scope, `${where} > ${name}`, depth + 1);
  });
  // loops
  tpl = tpl.replace(/<!--each ([\w.]+) as (\w+)-->([\s\S]*?)<!--\/each \2-->/g, (_, list, name, inner) => {
    const arr = lookup(scope, list);
    if (!Array.isArray(arr)) {
      errors.push(`${where}: "${list}" is not a list`);
      return '';
    }
    return arr
      .map((item, i) => render(inner, { ...scope, [name]: item, [`${name}_n`]: String(i + 1) }, where, depth + 1))
      .join('');
  });
  // conditionals (repeat for nesting)
  const IF = /<!--if (!?)([\w.]+)-->([\s\S]*?)<!--\/if \1\2-->/g;
  let prev;
  do {
    prev = tpl;
    tpl = tpl.replace(IF, (_, neg, p, inner) => {
      const ok = filled(lookup(scope, p));
      if (!ok && !neg) noteMissing(p, where);
      return (neg ? !ok : ok) ? inner : '';
    });
  } while (tpl !== prev);
  // values
  tpl = tpl.replace(/\{\{\{([\w.]+)\}\}\}|\{\{([\w.]+)\}\}/g, (m, raw, plain) => {
    const p = raw || plain;
    const v = lookup(scope, p);
    if (!filled(v) && v !== 0) {
      errors.push(`${where}: empty value {{${p}}} — wrap it in <!--if ${p}--> or fill it in site.config.json`);
      return '';
    }
    return raw ? String(v) : esc(v);
  });
  return tpl;
}
function noteMissing(p, where) {
  if (!FACTS.some(([f]) => f === p)) return;
  if (!missingFacts.has(p)) missingFacts.set(p, new Set());
  const parts = where.split(' > ');
  missingFacts.get(p).add(parts[parts.length - 1].replace(/^pages\//, ''));
}

// ------------------------------------------------------------------ helpers
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&amp;|&/g, ' and ')
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function addHeadingIds(html) {
  const seen = new Set();
  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (m, attrs = '', text) => {
    if (/\sid="/.test(attrs)) {
      seen.add(attrs.match(/\sid="([^"]+)"/)[1]);
      return m;
    }
    let id = slugify(text) || 'section';
    while (seen.has(id)) id += '-2';
    seen.add(id);
    return `<h2 id="${id}"${attrs}>${text}</h2>`;
  });
}
function toc(html) {
  const items = [...html.matchAll(/<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map(
    ([, id, text]) => `<li><a href="#${id}">${text.replace(/<[^>]+>/g, '')}</a></li>`,
  );
  return items.length > 2
    ? `<details class="toc" open><summary class="toc-h">On this page</summary><nav aria-label="On this page"><ol>${items.join('')}</ol></nav></details>`
    : '';
}

const plain = (s) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
function faqData(html) {
  const qa = [...html.matchAll(/<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<div>([\s\S]*?)<\/div>\s*<\/details>/g)].map(
    ([, q, a]) => ({ '@type': 'Question', name: plain(q), acceptedAnswer: { '@type': 'Answer', text: plain(a) } }),
  );
  return qa.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa } : null;
}
const ldString = (data) => JSON.stringify(data).replace(/</g, '\\u003c');
function jsonLd(meta, body) {
  let data = meta.jsonld || null;
  if (meta.faq_schema) data = faqData(body) || data;
  return data ? ldString(data) : '';
}

// -------------------------------------------------------------------- build
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
if (fs.existsSync(path.join(ROOT, 'static'))) fs.cpSync(path.join(ROOT, 'static'), OUT, { recursive: true });

const pages = []; // {slug, file, html, meta}

// hand-built pages (the film homepage and pricing)
for (const [file, slug] of [
  ['index.html', ''],
  ['pricing.html', 'pricing'],
]) {
  let html = render(fs.readFileSync(path.join(SRC, file), 'utf8'), ctx, file);
  if (html.includes('<!--faq-schema-->')) {
    const data = faqData(html);
    html = html.replace('<!--faq-schema-->', data ? `<script type="application/ld+json">${ldString(data)}</script>` : '');
  }
  pages.push({ slug, file, html, meta: { sitemap: true, priority: slug ? '0.8' : '1.0' } });
}

// ?app=1 pages: the app opens privacy, terms, help and the pages they link to as content only
// (no header, no footer, no way to pricing or checkout). The list lives in ONE place, the
// vercel.json redirect that sends /<slug>?app=1 to /in-app/<slug>; this build makes those copies.
const vercelJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const appRule = (vercelJson.redirects || []).find((r) => (r.has || []).some((h) => h.type === 'query' && h.key === 'app'));
const APP_PAGES = new Set((appRule?.source.match(/^\/:slug\(([\w|-]+)\)$/)?.[1] || '').split('|').filter(Boolean));
if (!APP_PAGES.size) errors.push('vercel.json: the ?app=1 redirect (source "/:slug(privacy|terms|...)") is missing');
if (appRule && appRule.destination !== '/in-app/:slug') errors.push('vercel.json: the ?app=1 redirect must go to /in-app/:slug');
const inAppUnlinked = new Set();

// Links inside an in-app page: a page on the list stays a link (to its in-app copy, ?app=1
// kept); any other page of ours (home, pricing, buy, download) becomes plain text. Mail, phone
// and other websites stay as they are.
function inAppLinks(html) {
  return html.replace(/<a\b([^>]*?)\shref="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (m, pre, href, post, text) => {
    if (/^(#|mailto:|tel:)/i.test(href)) return m;
    let url;
    try {
      url = new URL(href, `${cfg.site.url}/`);
    } catch {
      return text;
    }
    if (!/(^|\.)nirmand\.com$/i.test(url.hostname)) return m;
    const slug = url.pathname.replace(/^\//, '').replace(/\.html$/, '');
    if (!APP_PAGES.has(slug)) {
      inAppUnlinked.add(`/${slug}`);
      return text;
    }
    return `<a${pre} href="/in-app/${slug}?app=1${url.hash}"${post}>${text}</a>`;
  });
}

// content pages
const layout = fs.readFileSync(path.join(SRC, 'layout.html'), 'utf8');
for (const f of fs.readdirSync(path.join(SRC, 'pages')).sort()) {
  if (!f.endsWith('.html')) continue;
  const raw = fs.readFileSync(path.join(SRC, 'pages', f), 'utf8');
  const fm = raw.match(/^<!--page\s*([\s\S]*?)-->\s*/);
  if (!fm) {
    errors.push(`pages/${f}: missing <!--page {…} --> header`);
    continue;
  }
  let meta;
  try {
    meta = JSON.parse(fm[1]);
  } catch (e) {
    errors.push(`pages/${f}: page header is not valid JSON (${e.message})`);
    continue;
  }
  const slug = meta.slug ?? f.replace(/\.html$/, '');
  const where = `pages/${f}`;
  let body = addHeadingIds(render(raw.slice(fm[0].length), ctx, where));
  const intro = meta.intro ? render(meta.intro, ctx, where) : '';
  const updated = meta.updated === 'policies' ? ctx.site.policies_updated_human : meta.updated ? human(meta.updated) : '';
  const page = {
    ...meta,
    slug,
    heading: meta.heading || meta.title,
    jsonld: jsonLd(meta, body),
    canonical: slug === '404' ? '' : `${cfg.site.url}/${slug}`,
    robots: meta.noindex ? 'noindex, follow' : 'index, follow',
    updated_human: updated,
    intro,
    toc: meta.toc === false ? '' : toc(body),
    body,
    body_class: meta.wide ? 'pg pg-wide' : 'pg',
  };
  const html = render(layout, { ...ctx, page }, where);
  pages.push({ slug, file: `${slug}.html`, html, meta: { ...meta, sitemap: !meta.noindex && slug !== '404' } });
  if (APP_PAGES.has(slug)) {
    // Rendered again with page.app set, so <!--if !page.app--> … <!--/if !page.app--> keeps
    // prices and how-to-buy lines out of the copy the app opens (store rules on steering).
    const appCtx = { ...ctx, page: { app: 'yes' } };
    const appBody = addHeadingIds(render(raw.slice(fm[0].length), appCtx, where));
    const appIntro = meta.intro ? render(meta.intro, appCtx, where) : '';
    const appPage = {
      ...page,
      app: 'yes',
      jsonld: '',
      robots: 'noindex, nofollow',
      intro: inAppLinks(appIntro),
      toc: meta.toc === false ? '' : toc(appBody),
      body: inAppLinks(appBody),
    };
    const appHtml = render(layout, { ...ctx, page: appPage }, `${where} (in-app)`);
    pages.push({ slug: `in-app/${slug}`, file: `in-app/${slug}.html`, html: appHtml, meta: { sitemap: false } });
  }
}
for (const slug of APP_PAGES) {
  if (!pages.some((p) => p.slug === `in-app/${slug}`)) errors.push(`vercel.json: ?app=1 lists "${slug}" but src/pages has no such page`);
}

for (const p of pages) {
  const file = path.join(OUT, p.slug ? `${p.slug}.html` : 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, p.html);
}

// -------------------------------------------------------- generated files
const indexable = pages.filter((p) => p.meta.sitemap);
fs.writeFileSync(
  path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable
    .map(
      (p) =>
        `  <url><loc>${cfg.site.url}/${p.slug}</loc><lastmod>${ctx.build.date}</lastmod><priority>${p.meta.priority || '0.5'}</priority></url>`,
    )
    .join('\n')}\n</urlset>\n`,
);
fs.writeFileSync(
  path.join(OUT, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /buy\n\nSitemap: ${cfg.site.url}/sitemap.xml\n`,
);
const expires = new Date(today.getTime() + 330 * 864e5);
fs.mkdirSync(path.join(OUT, '.well-known'), { recursive: true });
fs.writeFileSync(
  path.join(OUT, '.well-known', 'security.txt'),
  `Contact: mailto:${cfg.company.email}\nExpires: ${expires.toISOString().replace(/\.\d+Z$/, 'Z')}\nPreferred-Languages: en, hi\nCanonical: ${cfg.site.url}/.well-known/security.txt\nPolicy: ${cfg.site.url}/privacy\n`,
);
fs.writeFileSync(
  path.join(OUT, 'site.webmanifest'),
  JSON.stringify(
    {
      name: cfg.site.name,
      short_name: cfg.site.name,
      description: cfg.site.tagline,
      start_url: '/',
      display: 'browser',
      background_color: '#0C1429',
      theme_color: '#0C1429',
      icons: [
        { src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/assets/img/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ),
);

// ------------------------------------------------------------ verification
const files = new Set();
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else files.add('/' + path.relative(OUT, full).split(path.sep).join('/'));
  }
})(OUT);

for (const icon of JSON.parse(fs.readFileSync(path.join(OUT, 'site.webmanifest'), 'utf8')).icons) {
  if (!files.has(icon.src)) errors.push(`site.webmanifest: missing icon ${icon.src}`);
}

const idsByPage = new Map();
for (const p of pages) {
  const ids = new Set([...p.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  idsByPage.set(p.slug, ids);
}
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');

for (const p of pages) {
  const name = p.slug || 'index';
  const html = p.html;
  // basic head checks
  if (!/<title>[^<]{5,}<\/title>/.test(html)) errors.push(`${name}: missing <title>`);
  if (!/<meta name="description" content="[^"]{40,}"/.test(html)) errors.push(`${name}: missing or short meta description`);
  if (p.slug !== '404' && !/<link rel="canonical" href="https:\/\/[^"]+"/.test(html)) errors.push(`${name}: missing canonical`);
  const h1 = (visible(html).match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) errors.push(`${name}: has ${h1} <h1> elements (want exactly 1)`);
  // structured data must parse
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch (e) {
      errors.push(`${name}: JSON-LD does not parse (${e.message})`);
    }
  }
  // leftovers
  const text = visible(html);
  for (const bad of [/to be added/i, /lorem ipsum/i, /\bTODO\b/, /\bTBD\b/, /\{\{|\}\}/, /\bundefined\b/, /\bNaN\b/, /\[object Object\]/]) {
    const m = text.match(bad);
    if (m) errors.push(`${name}: leftover text "${m[0]}"`);
  }
  // in-app copies open inside the store builds of the app: no price may show there
  if (p.slug.startsWith('in-app/')) {
    const m = text.match(/₹|&#(?:8377|x20[bB]9);|\bRs\b|\bINR\b/);
    if (m) errors.push(`${name}: shows a price ("${m[0]}"); wrap it in <!--if !page.app--> … <!--/if !page.app-->`);
  }
  // links (markup only: scripts and styles are skipped)
  for (const m of text.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    checkLink(m[1], p, name);
  }
  for (const m of text.matchAll(/\ssrcset="([^"]*)"/g)) {
    for (const part of m[1].split(',')) checkLink(part.trim().split(/\s+/)[0], p, name);
  }
}

function checkLink(href, page, name) {
  if (!href || /^(https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(href)) {
    if (href === '') errors.push(`${name}: empty href/src`);
    return;
  }
  if (href.startsWith('#')) {
    const id = decodeURIComponent(href.slice(1));
    if (id && !idsByPage.get(page.slug).has(id)) errors.push(`${name}: anchor ${href} has no target on the page`);
    return;
  }
  const url = new URL(href, `${cfg.site.url}/${page.slug}`);
  if (url.origin !== cfg.site.url) return;
  let p = decodeURIComponent(url.pathname);
  const hash = url.hash.slice(1);
  if (p.endsWith('.html') && p !== '/404.html') warnings.push(`${name}: link ${href} uses .html — use the clean URL`);
  let slug = p.replace(/^\//, '').replace(/\.html$/, '');
  if (p.startsWith('/assets/') || (/\.[a-z0-9]+$/i.test(p) && !p.endsWith('.html'))) {
    if (!files.has(p)) errors.push(`${name}: missing file ${p}`);
    return;
  }
  if (!idsByPage.has(slug)) {
    errors.push(`${name}: link to ${p} — no such page`);
    return;
  }
  if (hash && !idsByPage.get(slug).has(hash)) errors.push(`${name}: link ${href} — #${hash} not found on /${slug}`);
}

// ---------------------------------------------------- /buy -> checkout (proxy.ts)
// The edge redirect in proxy.ts holds the checkout address as one constant. Its only source is
// site.config.json (buy.checkout_url). A local build checks the host answers, then writes the
// constant; on Vercel the build only checks, and a proxy.ts out of step with the config stops
// the deploy (the live site keeps its last good redirect).
await syncCheckout();

async function syncCheckout() {
  const want = cfg.buy.checkout_url || '';
  if (want) {
    const why = await checkoutProblem(want);
    if (why) {
      errors.push(`buy.checkout_url ${want}: ${why}. /buy never forwards to a host that is not live; leave it empty until it is`);
      return;
    }
  }
  const file = path.join(ROOT, 'proxy.ts');
  const src = fs.readFileSync(file, 'utf8');
  const line = /^const CHECKOUT_URL = (['"])(.*?)\1;(\r?)$/m;
  const m = src.match(line);
  if (!m) {
    errors.push('proxy.ts: the line `const CHECKOUT_URL = ...;` is missing');
    return;
  }
  if (m[2] === want) return;
  if (process.env.VERCEL) {
    errors.push(`proxy.ts has CHECKOUT_URL ${JSON.stringify(m[2])} but site.config.json has ${JSON.stringify(want)}: run node scripts/build.mjs locally and commit proxy.ts`);
    return;
  }
  fs.writeFileSync(file, src.replace(line, (_, q, v, cr) => `const CHECKOUT_URL = '${want}';${cr}`));
  warnings.push(`proxy.ts: CHECKOUT_URL is now ${JSON.stringify(want)} (from site.config.json); commit proxy.ts`);
}

async function checkoutProblem(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return 'not a URL';
  }
  if (u.protocol !== 'https:') return 'must start with https://';
  if (!u.hostname.endsWith('.nirmand.com') || u.hostname === 'www.nirmand.com') {
    return 'must be a nirmand.com subdomain such as pay.nirmand.com (not nirmand.com itself)';
  }
  if (u.pathname !== '/buy' || u.search || u.hash || u.port || u.username) return 'must be exactly https://<host>/buy';
  try {
    const res = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    if (res.status >= 400) return `the host answered HTTP ${res.status}`;
  } catch (e) {
    return `the host did not answer (${e.cause?.code || e.name})`;
  }
  return '';
}

// ------------------------------------------------------------------ report
const out = [];
out.push(`Built ${pages.length} pages into public/ (${files.size} files).`);
out.push(`In-app copies (?app=1): ${APP_PAGES.size} pages. Shown there as plain text, not links: ${[...inAppUnlinked].sort().join(', ') || 'none'}.`);
for (const [f] of FACTS) if (!filled(lookup(ctx, f)) && !missingFacts.has(f)) missingFacts.set(f, new Set());
if (missingFacts.size) {
  out.push('');
  out.push('MISSING company facts (lines hidden until filled in site.config.json):');
  for (const [f, label] of FACTS) {
    if (!missingFacts.has(f)) continue;
    const used = [...missingFacts.get(f)];
    out.push(`  - ${f}: ${label}${used.length ? `  [used on: ${used.join(', ')}]` : ''}`);
  }
}
for (const w of [...new Set(warnings)]) out.push(`WARN  ${w}`);
for (const e of [...new Set(errors)]) out.push(`ERROR ${e}`);
console.log(out.join('\n'));
if (errors.length || (STRICT && missingFacts.size)) {
  console.error(`\nBuild failed: ${errors.length} error(s)${STRICT && missingFacts.size ? `, ${missingFacts.size} missing fact(s) in --strict mode` : ''}.`);
  process.exit(1);
}
