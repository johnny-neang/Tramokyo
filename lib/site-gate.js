// The site's shared password, used by middleware.js (in front of every
// request) and api/unlock.js (the lock screen's form): the word check, the
// signed cookie and the "Say the word." lock screen.
// Env: SITE_PASSWORD, SITE_SESSION_SECRET (rotate it to sign everyone out).

import crypto from 'node:crypto';

export const COOKIE = 'tramokyo_pass';
export const TTL_SEC = 30 * 24 * 60 * 60; // 30 days
// Reachable without the cookie: the form's endpoint and the lock screen's own images.
export const OPEN_PATHS = new Set(['/api/unlock', '/assets/logo.png', '/assets/hero-bg-480.webp', '/assets/hero-bg.png']);

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is not set`);
  return v;
}

// Case and stray spaces don't matter: phone keyboards capitalise the first letter.
const digest = (s) => crypto.createHash('sha256').update(String(s || '').trim().toLowerCase()).digest();
const sign = (exp) => crypto.createHmac('sha256', env('SITE_SESSION_SECRET')).update(`v1.${exp}`).digest('base64url');

export function checkWord(word) {
  return crypto.timingSafeEqual(digest(word), digest(env('SITE_PASSWORD')));
}

/** True when the Cookie header carries an unexpired, correctly signed site cookie. */
export function hasValidCookie(cookieHeader) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(cookieHeader || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!/^\d+$/.test(exp || '') || !sig || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Set-Cookie value for a fresh 30-day session. */
export function sessionCookie(secure) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  return `${COOKIE}=${exp}.${sign(exp)}; Max-Age=${TTL_SEC}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

// Only paths on this site, so the form can't bounce anyone elsewhere.
export function safeNext(value) {
  const v = String(value || '/');
  return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/';
}

export const LOCK_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function lockPageHtml({ next = '/', error = '' } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Tramokyo · Say the word</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#E8412A">
<meta name="color-scheme" content="light">
<meta name="description" content="The survey, the Trubiki playlists and the TMKO podcast. Invitation only.">
<meta property="og:type" content="website">
<meta property="og:title" content="Tramokyo · Thank you">
<meta property="og:description" content="The survey, the Trubiki playlists and the TMKO podcast. Invitation only.">
<meta property="og:image" content="https://tramokyo.johnnyneang.com/assets/hero-bg.png">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23F2E8D5'/%3E%3Ccircle cx='16' cy='16' r='9' fill='%23E8412A'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=DM+Sans:wght@400;600&family=Zen+Kaku+Gothic+New:wght@900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root {
    --oy-red: #E8412A; --oy-red-deep: #C8341F;
    --oy-cream: #F2E8D5; --oy-cream-warm: #F7F0E0;
    --oy-ink: #1C1917; --oy-ink-soft: #3B3430; --oy-mute: #6B625B; --oy-hairline: #C8BCA3;
    --oy-font-display: 'Archivo Black', 'Impact', sans-serif;
    --oy-font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
    --oy-font-jp: 'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', sans-serif;
    --oy-font-mono: 'JetBrains Mono', ui-monospace, monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--oy-red); color: var(--oy-ink); font-family: var(--oy-font-body);
         -webkit-font-smoothing: antialiased; padding: 24px; min-height: 100vh; display: flex; justify-content: center; }
  :focus-visible { outline: 2px solid var(--oy-red); outline-offset: 2px; }
  .oy-frame { position: relative; width: 100%; max-width: 1320px; background: var(--oy-cream); border-radius: 10px;
              padding: 32px 52px 28px; display: flex; flex-direction: column; box-shadow: 0 30px 60px -30px rgba(0,0,0,0.35); }
  .oy-frame::before { content: ""; position: absolute; inset: 10px; border: 1.5px solid var(--oy-red); border-radius: 6px; pointer-events: none; }
  .logo img { display: block; height: clamp(28px, 2.8vw, 40px); width: auto; }
  .gate { position: relative; z-index: 1; flex: 1; display: grid; grid-template-columns: 1.1fr 1fr; gap: 48px; align-items: center; padding: 24px 12px 16px; }
  .stamp { display: inline-block; border: 1.5px solid var(--oy-ink); padding: 4px 12px; margin-bottom: 16px;
           font-family: var(--oy-font-mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
  .kana { font-family: var(--oy-font-jp); font-weight: 900; letter-spacing: 4px; color: var(--oy-red); font-size: 38px; }
  h1 { margin-top: 16px; font-family: var(--oy-font-display); font-size: clamp(34px, 4.5vw, 48px); line-height: 1.05;
       letter-spacing: -0.5px; text-transform: uppercase; }
  h1 span { color: var(--oy-red); display: block; }
  .lede { margin-top: 20px; max-width: 440px; font-size: 17px; line-height: 1.55; color: var(--oy-ink-soft); }
  form { margin-top: 28px; max-width: 420px; }
  label { display: block; margin-bottom: 6px; font-family: var(--oy-font-mono); font-weight: 600; font-size: 10px;
          letter-spacing: 2px; text-transform: uppercase; color: var(--oy-mute); }
  input[type=password] { width: 100%; padding: 10px 0 8px; border: none; border-bottom: 1.5px solid var(--oy-ink); background: transparent;
                         font-family: var(--oy-font-body); font-size: 16px; color: var(--oy-ink); outline: none; }
  input[type=password]:focus, .has-err input[type=password] { border-color: var(--oy-red); }
  .err { margin-top: 6px; font-family: var(--oy-font-mono); font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--oy-red); }
  .oy-btn { position: relative; margin-top: 28px; display: inline-flex; padding: 14px 34px; background: var(--oy-red); color: var(--oy-cream);
            border: none; border-radius: 2px; font-family: var(--oy-font-body); font-weight: 600; font-size: 14px; cursor: pointer;
            top: 0; left: 0; transition: top 120ms, left 120ms, background 200ms; }
  .oy-btn::before { content: ""; position: absolute; inset: -6px -6px 6px 6px; border: 1.5px solid var(--oy-ink); border-radius: 2px; z-index: -1; }
  .oy-btn:hover { background: var(--oy-red-deep); top: -1px; left: -1px; }
  .art { width: 100%; max-width: 480px; height: auto; margin-left: auto; display: block; }
  footer { position: relative; z-index: 1; margin-top: 28px; padding: 0 12px 4px; display: flex; align-items: center; gap: 30px;
           font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--oy-mute); }
  footer::before { content: ""; flex: 1; height: 1px; background: var(--oy-red); opacity: .8; }
  @media (max-width: 1024px) { .gate { grid-template-columns: 1fr; gap: 32px; } .art { margin: 0 auto; max-width: 420px; } }
  @media (max-width: 640px) { body { padding: 12px; } .oy-frame { padding: 20px 24px; } h1 { font-size: 36px; } .stamp { font-size: 9px; letter-spacing: 1px; } }
</style>
</head>
<body>
<main class="oy-frame">
  <a class="logo" href="/" aria-label="Tramokyo"><img src="/assets/logo.png" alt="Tramokyo" width="270" height="40"></a>
  <section class="gate">
    <div>
      <span class="stamp">Tramokyo 2026 · Invitation only</span>
      <div class="kana" lang="ja">合言葉</div>
      <h1>Say the <span>word.</span></h1>
      <p class="lede">The survey, the playlists and the recordings. Invitation only, like the rest of it.</p>
      <form method="post" action="/api/unlock" autocomplete="off"${error ? ' class="has-err"' : ''}>
        <input type="hidden" name="next" value="${esc(next)}">
        <label for="word">Password</label>
        <input id="word" name="word" type="password" required autofocus autocomplete="off" autocapitalize="off"
               autocorrect="off" spellcheck="false" data-1p-ignore data-lpignore="true">
        ${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
        <button class="oy-btn" type="submit">Unlock</button>
      </form>
    </div>
    <img class="art" src="/assets/hero-bg-480.webp" alt="Joshua tree at dusk" width="480" height="360">
  </section>
  <footer>EST · 2026 · <span lang="ja">山中湖</span></footer>
</main>
</body>
</html>`;
}
