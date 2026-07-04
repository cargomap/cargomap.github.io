/**
 * Cargomap — China mainland geo-block (free-tier version)
 * Single source of truth: included once via _layouts/default.html,
 * so every page (current and future) picks it up automatically.
 *
 * Logic:
 *   1. Try ipwho.is → geojs.io → ipapi.co, in order, 2.5s timeout each.
 *   2. First service that resolves a country code wins; stop trying further ones.
 *   3. country_code === 'CN' → show neutral block message. (HK / MO / TW are NOT China and are never blocked.)
 *   4. All three fail/timeout → fail-open (page displays normally). This is a deliberate,
 *      business-approved choice (favours not misblocking genuine Gulf/SE Asia buyers over
 *      stricter enforcement) — see delivery notes for the alternative that was declined.
 *
 * Honest limits (do not oversell this to anyone as a hard block):
 *   - Bypassed by disabling JavaScript, reader-mode extraction, or any VPN/proxy.
 *   - Does not affect what search engines or social-share crawlers see (server-side fetch, no JS execution).
 *   - This can only ever be "reduce", not "prevent" — see delivery notes §5 of the spec doc.
 */
(function () {
  var SERVICES = [
    { url: 'https://ipwho.is/' },
    { url: 'https://get.geojs.io/v1/ip/geo.json' },
    { url: 'https://ipapi.co/json/' }
  ];
  var TIMEOUT_MS = 2500;

  function fetchWithTimeout(url) {
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (t) clearTimeout(t);
        return d;
      })
      .catch(function (err) {
        if (t) clearTimeout(t);
        throw err;
      });
  }

  function tryServices(i) {
    if (i >= SERVICES.length) {
      // All three failed or timed out — fail-open (approved default, see spec §2.2).
      return;
    }
    fetchWithTimeout(SERVICES[i].url)
      .then(function (d) {
        var code = d && d.country_code;
        if (!code) { tryServices(i + 1); return; }
        if (code === 'CN') {
          showBlockScreen();
        }
        // else: HK / MO / TW / anything else — normal display, do nothing.
      })
      .catch(function () {
        tryServices(i + 1);
      });
  }

  function showBlockScreen() {
    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;' +
      'background:var(--deep,#0B3B3E);color:var(--light,#F2ECE1);font-family:\'Mulish\',sans-serif;' +
      'text-align:center;padding:32px;box-sizing:border-box;">' +
      '<div style="max-width:440px;">' +
      '<p style="font-size:17px;line-height:1.7;margin:0;">此網站的內容目前不對中國大陸地區公開顯示。</p>' +
      '<p style="font-size:14px;line-height:1.7;margin:14px 0 0;opacity:.75;">This site\'s content is not currently displayed for mainland China visitors.</p>' +
      '</div></div>';
  }

  tryServices(0);
})();
