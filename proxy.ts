/**
 * /buy → checkout, at the edge: this runs before any page, script or cache sees the request.
 *
 * Wired in vercel.json (`proxy.entrypoint`, matcher `/buy`), so it runs on /buy and nowhere
 * else. The app opens the checkout host directly; this path is for links from outside the app
 * (WhatsApp, SMS, this site's pricing cards).
 *
 * - CHECKOUT_URL empty (checkout not live): /buy → /pricing with NO query at all, so a one-time
 *   purchase link (`i`) never reaches a page, a script or the address bar of /pricing.
 * - CHECKOUT_URL set: /buy → CHECKOUT_URL with only `project` and `i`, byte for byte as they
 *   came in. Every other query value is dropped.
 * Nothing here logs the request. 307 + no-store, so no browser or CDN keeps the hop.
 *
 * CHECKOUT_URL is written by scripts/build.mjs from site.config.json (`buy.checkout_url`).
 * Change the config, not this line: the build checks the host is live before it writes it, and
 * a Vercel build fails when the two differ.
 */
const CHECKOUT_URL = '';

const FORWARD = new Set(['project', 'i']);

export default function proxy(request: Request): Response {
  const location = CHECKOUT_URL ? withQuery(CHECKOUT_URL, new URL(request.url).search) : '/pricing';
  return new Response(null, {
    status: 307,
    headers: {
      Location: location,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

/** `base` plus the `project` and `i` pairs of `search`, unchanged. */
function withQuery(base: string, search: string): string {
  const kept = search
    .slice(1)
    .split('&')
    .filter((pair) => FORWARD.has(keyOf(pair)));
  return kept.length ? `${base}?${kept.join('&')}` : base;
}

function keyOf(pair: string): string {
  try {
    return decodeURIComponent(pair.split('=')[0].replace(/\+/g, ' '));
  } catch {
    return '';
  }
}
