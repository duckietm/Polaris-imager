import express from 'express';
import { renderGeneratePage } from './generate-page.mjs';
import { createAuth, renderLoginPage, safeEqual } from './generate-auth.mjs';
import { makeClientIp } from './security.mjs';
import { findUserByName, searchUsers } from './db.mjs';

const FIGURE_RE = /^[A-Za-z0-9._-]+$/;

const USERNAME_RE = /^[A-Za-z0-9 ._:@-]{1,64}$/;

const PRESET_KEYS = [
    'figure', 'action', 'gesture', 'direction', 'head_direction', 'headonly',
    'dance', 'effect', 'size', 'frame_num', 'img_format', 'text', 'text_color', 'bubble_color'
];

const first = (value) => (Array.isArray(value) ? value[0] : value);

const cleanFigure = (value) => {
    const figure = String(value ?? '').trim();

    return FIGURE_RE.test(figure) && figure.includes('-') ? figure : null;
};

const extractFigure = (payload, depth = 0) => {
    if (typeof payload === 'string') return cleanFigure(payload);

    if (!payload || typeof payload !== 'object' || depth > 3) return null;

    for (const key of ['figure', 'look', 'figureString', 'avatar', 'data', 'user', 'result', 'player', 'habbo']) {
        const found = extractFigure(payload[key], depth + 1);

        if (found) return found;
    }

    return null;
};

const extractUsername = (payload) => {
    if (!payload || typeof payload !== 'object') return null;

    for (const key of ['username', 'name', 'user_name']) {
        if (typeof payload[key] === 'string' && payload[key].trim()) return payload[key].trim();
    }

    for (const key of ['data', 'user', 'result', 'player', 'habbo']) {
        if (payload[key] && typeof payload[key] === 'object') {
            const found = extractUsername(payload[key]);

            if (found) return found;
        }
    }

    return null;
};

export const createGenerateRouter = (CONFIG) => {
    const router = express.Router();
    const gen = CONFIG.generate;
    const db = CONFIG.db;
    const auth = createAuth(gen, db);

    const clientIp = makeClientIp(CONFIG.clientIpHeader);

    const imagerUrl = gen.publicUrl ? `${ gen.publicUrl }/avatarimage` : '/avatarimage';

    const lookupAvailable = db.enabled || Boolean(gen.lookupUrl);

    const searchAvailable = db.enabled;

    const isSecure = (req) => req.secure || req.get('x-forwarded-proto') === 'https';

    const hotelMode = gen.authMode === 'hotel';
    const withUser = hotelMode || Boolean(gen.authUser);

    const loginPage = (req, error = '') => renderLoginPage({
        title: gen.title,
        action: `${ req.baseUrl }/login`,
        withUser,
        hotelMode,
        error
    });

    const authProblem = (() => {
        if (!gen.authEnabled) return null;
        if (hotelMode && !db.enabled) {
            return 'AVATAR_IMAGING_GENERATE_AUTH_MODE=hotel requires AVATAR_IMAGING_DB_ENABLED=true.';
        }
        if (!hotelMode && !gen.authPassword) {
            return 'AVATAR_IMAGING_GENERATE_PASSWORD is empty.';
        }

        return null;
    })();

    const guard = (req, res, next) => {

        if (gen.token && !safeEqual(first(req.query.token) ?? '', gen.token)) return res.status(404).end();

        if (authProblem) {
            return res.status(503).type('text/plain')
                .send(`Panel disabled: broken login configuration.\n${ authProblem }`);
        }

        if (!gen.authEnabled) return next();

        if (auth.session(req)) return next();

        if (req.path !== '/') {
            return res.status(401).json({ ok: false, error: 'Session expirée, reconnecte-toi.' });
        }

        return res.status(401).type('text/html; charset=utf-8').send(loginPage(req));
    };

    if (gen.authEnabled) {
        router.get('/login', (req, res) => {
            res.set('Cache-Control', 'no-store');

            if (auth.session(req)) return res.redirect(req.baseUrl || '/Generate');

            return res.type('text/html; charset=utf-8').send(loginPage(req));
        });

        router.post('/login', express.urlencoded({ extended: false, limit: '2kb' }), async (req, res) => {
            res.set('Cache-Control', 'no-store');

            if (authProblem) {
                return res.status(503).type('text/plain').send(`Panel disabled: ${ authProblem }`);
            }

            const username = String(req.body?.username ?? '').trim();
            const password = String(req.body?.password ?? '');
            const ip = clientIp(req);

            const result = await auth.authenticate(username, password, ip);

            if (!result.ok) {
                console.warn(`[pixinode] failed panel login (${ gen.authMode }) from ${ ip }`);

                return res.status(401).type('text/html; charset=utf-8').send(loginPage(req, result.error));
            }

            auth.issue(res, result.username, isSecure(req));

            return res.redirect(req.baseUrl || '/Generate');
        });

        router.get('/logout', (req, res) => {
            auth.clear(res);

            return res.redirect(`${ req.baseUrl }/login`);
        });
    }

    router.use(guard);

    router.get('/', (req, res) => {

        const preset = {};

        for (const key of PRESET_KEYS) {
            const value = first(req.query[key]);

            if (value !== undefined && value !== '') preset[key] = String(value).slice(0, 512);
        }

        const html = renderGeneratePage({
            imagerUrl,
            base: req.baseUrl,
            lookupEnabled: lookupAvailable,
            searchEnabled: searchAvailable,
            logoutEnabled: gen.authEnabled,
            apiKey: gen.uiApiKey,
            token: gen.token,
            title: gen.title,
            figure: preset.figure || gen.defaultFigure || '',
            query: preset
        });

        res.set('Cache-Control', 'no-store');
        res.set(
            'Content-Security-Policy',
            "default-src 'none'; img-src 'self' data: https: http:; style-src 'unsafe-inline'; " +
            "script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'"
        );

        return res.type('text/html; charset=utf-8').send(html);
    });

    router.get('/look', async (req, res) => {
        res.set('Cache-Control', 'no-store');

        if (!lookupAvailable) {
            return res.status(501).json({ ok: false, error: 'La recherche par pseudo n\'est pas configurée.' });
        }

        const username = (first(req.query.username) ?? '').trim();

        if (!username) return res.status(400).json({ ok: false, error: 'Indique un pseudo.' });
        if (!USERNAME_RE.test(username)) return res.status(400).json({ ok: false, error: 'Pseudo invalide.' });

        if (db.enabled) {
            try {
                const row = await findUserByName(db, username);

                if (!row) return res.status(404).json({ ok: false, error: 'Joueur introuvable.' });

                const figure = cleanFigure(row.figure);

                if (!figure) return res.status(422).json({ ok: false, error: 'Ce joueur n\'a pas de tenue valide.' });

                return res.json({ ok: true, username: row.username || username, figure });
            } catch (error) {
                console.error('[pixinode] DB lookup failed:', error?.message || error);

                return res.status(502).json({ ok: false, error: 'Base de données injoignable.' });
            }
        }

        const target = gen.lookupUrl.includes('%username%')
            ? gen.lookupUrl.replace('%username%', encodeURIComponent(username))
            : `${ gen.lookupUrl }${ gen.lookupUrl.includes('?') ? '&' : '?' }username=${ encodeURIComponent(username) }`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), gen.lookupTimeoutMs);

        try {
            const headers = { Accept: 'application/json' };

            if (gen.lookupKey) headers[gen.lookupHeader] = gen.lookupKey;

            const upstream = await fetch(target, { headers, signal: controller.signal });

            if (!upstream.ok) return res.status(502).json({ ok: false, error: `Le site a répondu ${ upstream.status }.` });

            const MAX_LOOKUP_BYTES = 256 * 1024;
            const declared = parseInt(upstream.headers.get('content-length') || '0', 10);

            if (declared > MAX_LOOKUP_BYTES) {
                return res.status(502).json({ ok: false, error: 'Réponse du site trop volumineuse.' });
            }

            const raw = await upstream.text();

            if (raw.length > MAX_LOOKUP_BYTES) {
                return res.status(502).json({ ok: false, error: 'Réponse du site trop volumineuse.' });
            }
            let payload;

            try {
                payload = JSON.parse(raw);
            } catch {
                payload = raw;
            }

            const figure = extractFigure(payload);

            if (!figure) return res.status(404).json({ ok: false, error: 'Joueur introuvable.' });

            return res.json({ ok: true, username: extractUsername(payload) || username, figure });
        } catch (error) {
            const reason = error?.name === 'AbortError' ? 'Délai dépassé.' : 'Site injoignable.';

            console.warn('[pixinode] lookup failed:', error?.message || error);

            return res.status(502).json({ ok: false, error: reason });
        } finally {
            clearTimeout(timer);
        }
    });

    router.get('/search', async (req, res) => {
        res.set('Cache-Control', 'no-store');

        if (!searchAvailable) return res.json({ ok: true, results: [] });

        const query = (first(req.query.q) ?? '').trim();

        if (query.length < 2 || !USERNAME_RE.test(query)) return res.json({ ok: true, results: [] });

        try {
            const rows = await searchUsers(db, query, 8);

            return res.json({
                ok: true,
                results: rows
                    .map((row) => ({ username: row.username, figure: cleanFigure(row.figure) }))
                    .filter((row) => row.username && row.figure)
            });
        } catch (error) {
            console.error('[pixinode] DB search failed:', error?.message || error);

            return res.status(502).json({ ok: false, error: 'Base de données injoignable.' });
        }
    });

    return router;
};

export default createGenerateRouter;
