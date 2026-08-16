import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { findAccountForLogin } from './db.mjs';

const COOKIE = 'avstudio';

export const safeEqual = (a, b) => {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));

    if (bufA.length !== bufB.length) return false;

    return timingSafeEqual(bufA, bufB);
};

const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('base64url');

const readCookie = (req, name) => {
    const header = req.headers.cookie;

    if (!header) return null;

    for (const part of header.split(';')) {
        const eq = part.indexOf('=');

        if (eq === -1) continue;

        if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
    }

    return null;
};

const HEX_ALGOS = { 32: 'md5', 40: 'sha1', 64: 'sha256', 128: 'sha512' };

export const verifyPasswordHash = async (plain, stored) => {
    const hash = String(stored ?? '').trim();

    if (!hash || !plain) return false;

    if (/^\$2[aby]\$/.test(hash)) {
        try {

            const bcrypt = (await import('bcryptjs')).default;

            return await bcrypt.compare(plain, hash.replace(/^\$2y\$/, '$2a$'));
        } catch (error) {
            console.error('[pixinode] bcrypt check failed:', error?.message || error);

            return false;
        }
    }

    const algo = HEX_ALGOS[hash.length];

    if (algo && /^[0-9a-fA-F]+$/.test(hash)) {
        return safeEqual(createHash(algo).update(plain).digest('hex'), hash.toLowerCase());
    }

    console.warn('[pixinode] unsupported password hash format in the users table.');

    return false;
};

export const createAuth = (gen, db) => {

    const secret = gen.authSecret || randomBytes(32).toString('hex');

    const failures = new Map();

    const issue = (res, username, secure) => {
        const expires = Date.now() + gen.authTtlMs;
        const payload = Buffer.from(JSON.stringify({ u: username, e: expires })).toString('base64url');

        res.cookie(COOKIE, `${ payload }.${ sign(payload, secret) }`, {
            httpOnly: true,
            sameSite: 'lax',
            secure,
            maxAge: gen.authTtlMs,
            path: gen.path
        });
    };

    const clear = (res) => res.clearCookie(COOKIE, { path: gen.path });

    const session = (req) => {
        const raw = readCookie(req, COOKIE);

        if (!raw) return null;

        const dot = raw.lastIndexOf('.');

        if (dot === -1) return null;

        const payload = raw.slice(0, dot);

        if (!safeEqual(raw.slice(dot + 1), sign(payload, secret))) return null;

        try {
            const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

            if (!data?.e || data.e < Date.now()) return null;

            return String(data.u || 'admin');
        } catch {
            return null;
        }
    };

    const locked = (ip) => {
        const entry = failures.get(ip);

        if (!entry) return 0;

        if (entry.until <= Date.now()) {
            failures.delete(ip);

            return 0;
        }

        return entry.count >= gen.authMaxAttempts ? Math.ceil((entry.until - Date.now()) / 60000) : 0;
    };

    const noteFailure = (ip) => {
        const entry = failures.get(ip) || { count: 0, until: 0 };

        entry.count += 1;
        entry.until = Date.now() + gen.authLockMs;
        failures.set(ip, entry);

        if (failures.size > 5000) {
            const now = Date.now();

            for (const [key, value] of failures) {
                if (value.until <= now) failures.delete(key);
            }
        }
    };

    const authenticate = async (username, password, ip) => {
        const minutes = locked(ip);

        if (minutes) {
            return { ok: false, error: `Trop de tentatives. Réessaie dans ${ minutes } min.` };
        }

        const fail = (error = 'Identifiant ou mot de passe incorrect.') => {
            noteFailure(ip);

            return { ok: false, error };
        };

        if (gen.authMode !== 'hotel') {
            if (!gen.authPassword) return { ok: false, error: 'Aucun mot de passe configuré côté serveur.' };
            if (gen.authUser && !safeEqual(username || '', gen.authUser)) return fail();
            if (!safeEqual(password || '', gen.authPassword)) return fail();

            failures.delete(ip);

            return { ok: true, username: username || 'admin' };
        }

        if (!db.enabled) return { ok: false, error: 'Base de données indisponible.' };
        if (!username || !password) return fail();

        let account;

        try {
            account = await findAccountForLogin(db, username);
        } catch (error) {
            console.error('[pixinode] login query failed:', error?.message || error);

            return { ok: false, error: 'Base de données injoignable.' };
        }

        if (!account) return fail();

        if (!await verifyPasswordHash(password, account.password)) return fail();

        const rank = parseInt(account.rank, 10) || 0;

        if (rank < gen.authMinRank) {
            return fail(`Ton rang (${ rank }) ne permet pas d'accéder à ce panel.`);
        }

        failures.delete(ip);

        return { ok: true, username: account.username || username };
    };

    return { issue, clear, session, authenticate };
};

export const renderLoginPage = ({
    title = 'Avatar Studio',
    action = '/Generate/login',
    withUser = true,
    hotelMode = false,
    error = ''
} = {}) => {
    const esc = (value) => String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${ esc(title) } — Connexion</title>
<style>
:root{--bg:#f4f8fc;--panel:#ffffff;--panel2:#f7fafd;--line:#e2ebf4;--text:#16212f;
      --muted:#69798e;--sky:#2f9bf0;--sky-dark:#1a7fd0;--err:#d63b46;
      --mono:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;
      --body:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
     background:var(--bg);color:var(--text);font-family:var(--body);
     background-image:radial-gradient(circle at 50% -10%,rgba(47,155,240,.14),transparent 55%)}
.box{width:100%;max-width:360px;background:var(--panel);border:1px solid var(--line);
     border-radius:14px;padding:26px;
     box-shadow:0 1px 2px rgba(20,40,70,.05),0 14px 34px -20px rgba(20,40,70,.4)}
.brand{font-family:var(--mono);font-size:13px;font-weight:700;letter-spacing:.18em;
       text-transform:uppercase;margin:0 0 4px}
.brand b{color:var(--sky)}
p.sub{color:var(--muted);font-size:12.5px;margin:0 0 22px}
label{display:block;font-family:var(--mono);font-size:10.5px;letter-spacing:.13em;
      text-transform:uppercase;color:var(--muted);font-weight:700;margin:0 0 6px}
input{width:100%;background:#fff;color:var(--text);border:1px solid #d9e4ef;
      border-radius:9px;padding:11px 12px;font-size:14px;margin-bottom:16px;outline:none;
      transition:border-color .15s,box-shadow .15s}
input:hover{border-color:#bed3e7}
input:focus-visible{border-color:var(--sky);box-shadow:0 0 0 3px rgba(47,155,240,.22)}
button{width:100%;cursor:pointer;background:var(--sky);border:1px solid var(--sky);
       color:#fff;border-radius:9px;padding:12px;font-size:13.5px;font-weight:700;
       font-family:var(--body);transition:background .15s,border-color .15s}
button:hover{background:var(--sky-dark);border-color:var(--sky-dark)}
button:focus-visible{outline:2px solid var(--sky-dark);outline-offset:2px}
.err{color:var(--err);font-size:13px;margin:0 0 16px}
</style>
</head>
<body>
<form class="box" method="post" action="${ esc(action) }">
  <h1 class="brand"><b>&#9632;</b> ${ esc(title) }</h1>
  <p class="sub">${ hotelMode
      ? 'Connecte-toi avec ton compte de l\'hôtel.'
      : 'Panel réservé. Connecte-toi pour composer des avatars.' }</p>
  ${ error ? `<p class="err">${ esc(error) }</p>` : '' }
  ${ withUser
      ? `<label for="u">${ hotelMode ? 'Pseudo' : 'Identifiant' }</label>
  <input id="u" name="username" autocomplete="username" autofocus>`
      : '' }
  <label for="p">Mot de passe</label>
  <input id="p" name="password" type="password" autocomplete="current-password"${ withUser ? '' : ' autofocus' }>
  <button type="submit">Se connecter</button>
</form>
</body>
</html>`;
};

export default createAuth;
