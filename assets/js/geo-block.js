/**
 * Cargomap — China mainland geo-block (free-tier version)
 * Single source of truth: included once via _layouts/default.html,
 * so every page (current and future) picks it up automatically.
 *
 * Logic:
 *   1. First page view in a browsing session: race ipwho.is, geojs.io and ipapi.co
 *      in PARALLEL (not sequential) — whichever answers first wins, 2s timeout each.
 *      This exists purely to shrink the "flash of real content" window on the very
 *      first page for a mainland China visitor; it does not add any wait for anyone,
 *      since non-China visitors are never held up by it either way.
 *   2. Result is cached in sessionStorage for this tab's session, so every
 *      subsequent page the same visitor opens blocks (or clears) instantly —
 *      no repeat network round-trip, no repeat flash, after the first page.
 *   3. country_code === 'CN' → block screen. (HK / MO / TW are NOT China, never blocked.)
 *   4. All three fail/time out → fail-open (page displays normally, uncached —
 *      so the next page retries rather than permanently trusting one bad read).
 *      This is a deliberate, business-approved choice — see delivery notes.
 *
 * Honest limits (do not oversell this to anyone as a hard block):
 *   - Bypassed by disabling JavaScript, reader-mode extraction, or any VPN/proxy.
 *   - Does not affect what search engines or social-share crawlers see (server-side fetch, no JS execution).
 *   - A brief flash of real content on a mainland visitor's FIRST page of a session is
 *     an accepted trade-off of doing this client-side on a static host with no server/edge
 *     control — eliminating it entirely would mean hiding every visitor's page (including
 *     genuine Gulf/SE Asia buyers) until the geo-check resolves, which was deliberately
 *     ruled out earlier for the performance cost it added to real customers.
 *   - This can only ever be "reduce", not "prevent" — see delivery notes §5 of the spec doc.
 */
(function () {
  var CACHE_KEY = 'cargomap_geo_cn';
  var SERVICES = [
    'https://ipwho.is/',
    'https://get.geojs.io/v1/ip/geo.json',
    'https://ipapi.co/json/'
  ];
  var TIMEOUT_MS = 2000;

  function showBlockScreen() {
    document.title = '403 ERROR';
    document.body.innerHTML =
      '<div style="min-height:100vh;background:#fff;color:#1a1a1a;' +
      'font-family:Georgia,\'Times New Roman\',serif;padding:56px 64px;box-sizing:border-box;">' +
      '<h1 style="font-size:40px;font-weight:700;margin:0 0 28px;">403 ERROR</h1>' +
      '<p style="font-size:19px;font-weight:700;margin:0 0 20px;">The request could not be satisfied.</p>' +
      '<hr style="border:none;border-top:1px solid #ccc;margin:0 0 20px;">' +
      '<p style="font-size:15px;line-height:1.7;max-width:760px;margin:0 0 20px;">' +
      'An unexpected error occurred while processing this request. Please try again later, or contact the site owner if the problem persists.</p>' +
      '<hr style="border:none;border-top:1px solid #ccc;margin:0 0 20px;">' +
      '<p style="font-family:\'Courier New\',monospace;font-size:13px;color:#555;margin:0;">Error reference: ' + Date.now().toString(36) + '</p>' +
      '</div>';
  }

  function block() {
    if (document.body) { showBlockScreen(); }
    else { document.addEventListener('DOMContentLoaded', showBlockScreen); }
  }

  // 0. Instant path — already resolved earlier this session, skip the network entirely.
  var cached = null;
  try { cached = sessionStorage.getItem(CACHE_KEY); } catch (e) { /* privacy mode etc. — fall through */ }
  if (cached === '1') { block(); return; }
  if (cached === '0') { return; }

  // 1. First page this session — race all three, first successful answer wins.
  function fetchCode(url) {
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (t) clearTimeout(t);
        if (!d || !d.country_code) { throw new Error('no country_code'); }
        return d.country_code;
      })
      .catch(function (err) {
        if (t) clearTimeout(t);
        throw err;
      });
  }

  function raceAll(urls) {
    return new Promise(function (resolve, reject) {
      var remaining = urls.length;
      var settled = false;
      urls.forEach(function (u) {
        fetchCode(u).then(function (code) {
          if (!settled) { settled = true; resolve(code); }
        }).catch(function () {
          remaining -= 1;
          if (remaining === 0 && !settled) { reject(new Error('all services failed')); }
        });
      });
    });
  }

  raceAll(SERVICES).then(function (code) {
    var isCN = (code === 'CN');
    try { sessionStorage.setItem(CACHE_KEY, isCN ? '1' : '0'); } catch (e) { /* ignore */ }
    if (isCN) { block(); }
    // else: HK / MO / TW / anything else — normal display, do nothing.
  }).catch(function () {
    // all three failed or timed out — fail-open, uncached, retry on next page.
  });
})();
