import express from 'express';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { CONFIG, buildRendererConfig } from './config.mjs';
import { parseAvatarParams, ParamError } from './params.mjs';
import { encodeFrames, flattenFrames, upscaleNearest } from './apng.mjs';
import { RendererPool, preflightGl } from './renderer.mjs';
import { createApiKeyGuard, createCors, createRateLimiter, makeClientIp, securityHeaders } from './security.mjs';
import { createAccessLogger } from './logger.mjs';

import { createGenerateRouter } from './generate-route.mjs';

import { checkDatabase, closeDatabase } from './db.mjs';
import { decodeScene, renderScene, SceneError } from './scene.mjs';
import { composeWithBubble, getBubble } from './chat-bubbles.mjs';
import { renderLandingPage } from './landing-page.mjs';

class ResponseCache {
    #map = new Map();
    #bytes = 0;

    #drop(key) {
        const entry = this.#map.get(key);

        if (entry) {
            this.#bytes -= entry.size;
            this.#map.delete(key);
        }
    }

    get(key) {
        if (CONFIG.cacheEntries <= 0) return null;

        const entry = this.#map.get(key);

        if (!entry) return null;

        if (entry.expires < Date.now()) {
            this.#drop(key);

            return null;
        }

        this.#map.delete(key);
        this.#map.set(key, entry);

        return entry.value;
    }

    set(key, value) {
        if (CONFIG.cacheEntries <= 0) return;

        const size = value.buffer?.length || 0;

        if (CONFIG.cacheMaxBytes > 0 && size > CONFIG.cacheMaxBytes) return;

        this.#drop(key);
        this.#map.set(key, { value, size, expires: Date.now() + CONFIG.cacheTtlMs });
        this.#bytes += size;

        while (this.#map.size > CONFIG.cacheEntries || (CONFIG.cacheMaxBytes > 0 && this.#bytes > CONFIG.cacheMaxBytes)) {
            const oldest = this.#map.keys().next().value;

            if (oldest === undefined) break;

            this.#drop(oldest);
        }
    }
}

const cache = new ResponseCache();
const renderer = new RendererPool();

const app = express();

app.disable('x-powered-by');
app.disable('etag');
app.set('trust proxy', CONFIG.trustProxy);

const clientIp = makeClientIp(CONFIG.clientIpHeader);
const rateLimiter = createRateLimiter({ windowMs: CONFIG.rateLimitWindowMs, max: CONFIG.rateLimitMax, clientIp });
const cors = createCors(CONFIG.corsOrigin);
const apiKeyGuard = createApiKeyGuard(CONFIG.apiKeys);

app.use(securityHeaders);

const accessLogger = createAccessLogger(CONFIG);

if (CONFIG.accessLog) {
    app.use((req, res, next) => {
        if (req.path === '/health' || req.path === '/favicon.ico') return next();

        const start = Date.now();

        res.on('finish', () => {
            const url = req.originalUrl.replace(/([?&]key=)[^&]*/i, '$1***');
            const bytes = res.get('content-length') || 0;
            const cacheState = res.get('X-Cache') || '-';
            const stamp = new Date().toISOString();

            accessLogger.write(`${ stamp } [access] ${ clientIp(req) } ${ req.method } ${ url } -> ${ res.statusCode } ${ bytes }b ${ cacheState } ${ Date.now() - start }ms`);
        });

        next();
    });
}

if (CONFIG.generate.enabled) {
    const generateLimiter = createRateLimiter({
        windowMs: CONFIG.rateLimitWindowMs,
        max: CONFIG.rateLimitMax > 0 ? Math.max(30, Math.ceil(CONFIG.rateLimitMax / 4)) : 0,
        clientIp
    });

    app.use(CONFIG.generate.path, generateLimiter, createGenerateRouter(CONFIG));
}

app.get('/health', (req, res) => {
    res.json({ status: renderer.ready ? 'ok' : 'starting', ready: renderer.ready, engine: '@pixi/node', concurrency: CONFIG.concurrency });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

const apiReference = () => [
    'Nitro avatar-imaging service (@pixi/node, headless — no browser)',
    '',
    'GET /avatarimage',
    '  figure          figure string (required)',
    '  action          comma-separated, e.g. wlk,wav,drk=1',
    '  gesture         std | agr | sad | sml | srp   (default std)',
    '  direction       0-7                           (default 2)',
    '  head_direction  0-7                           (default 2)',
    '  headonly        0 | 1                          (default 0)',
    '  dance           0-4                            (default 0)',
    '  effect          effect id                      (default 0)',
    '  size            s | n | l                      (default n)',
    '  frame_num       still-frame index              (default 0)',
    '  img_format      png | apng | auto              (default auto)',
    '  text            speech-bubble text above the avatar',
    '  text_color      bubble text colour, hex        (default 000000)',
    '  bubble_color    bubble background colour, hex  (default ffffff)',
    '  bg_color        flatten onto this colour, hex  (default transparent)',
    '  bubble          chat bubble style id, with text (default: engine bubble)',
    '',
    'Example:',
    '  /avatarimage?figure=hd-180-1.ch-255-66.lg-280-110.sh-305-62&action=wlk,wav&direction=2&size=l',
    '  /avatarimage?figure=hd-180-1.ch-255-66&text=Hello!&bubble_color=2266cc&text_color=ffffff',
    '',
    ...(CONFIG.generate.enabled
        ? [`GET ${ CONFIG.generate.path }`, '  Browser UI to build a figure and copy/download the image.', '']
        : []),
    ...(CONFIG.scene.enabled
        ? [
            `GET ${ CONFIG.scene.path }?s=<encoded scene>`,
            '  Renders several avatars, images and text into one PNG.',
            `  Built visually in ${ CONFIG.generate.path }/scene`,
            ''
        ]
        : [])
].join('\n');

const MASCOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'franck.png');

app.get('/mascot.png', (req, res) => {
    if (!existsSync(MASCOT)) return res.status(404).end();

    res.set('Cache-Control', 'public, max-age=86400');

    return res.type('image/png').send(readFileSync(MASCOT));
});

app.get('/', (req, res) => {
    // Browsers ask for text/html explicitly; curl, monitoring and scripts send
    // */* and keep the plain-text listing they have always had.
    if (!String(req.headers.accept || '').includes('text/html')) {
        return res.type('text/plain').send(apiReference());
    }

    const html = renderLandingPage({
        title: CONFIG.generate.title,
        hotelUrl: CONFIG.hotel.url,
        hotelName: CONFIG.hotel.name,
        mascot: existsSync(MASCOT) ? '/mascot.png' : '',
        generatePath: CONFIG.generate.enabled && !CONFIG.generate.token ? CONFIG.generate.path : '',
        scenePath: CONFIG.generate.enabled && CONFIG.scene.enabled && !CONFIG.generate.token
            ? `${ CONFIG.generate.path }/scene`
            : '',
        apiText: apiReference()
    });

    res.set('Cache-Control', 'no-store');

    return res.type('text/html; charset=utf-8').send(html);
});

const sendImage = (res, buffer, animated, cacheState) => {
    res.set('X-Animated', String(animated));
    res.set('X-Cache', cacheState);
    res.type('image/png');

    return res.send(buffer);
};

app.get('/avatarimage', cors, rateLimiter, apiKeyGuard, async (req, res) => {
    let descriptor;

    try {
        descriptor = parseAvatarParams(req.query, {
            defaultFigure: process.env.AVATAR_IMAGING_DEFAULT_FIGURE || null,
            maxFigureLength: CONFIG.maxFigureLength,
            maxActionLength: CONFIG.maxActionLength,
            maxTextLength: CONFIG.maxTextLength
        });
    } catch (error) {
        if (error instanceof ParamError) return res.status(400).type('text/plain').send(error.message);

        return res.status(400).type('text/plain').send('Bad request');
    }

    const cacheKey = JSON.stringify(descriptor);

    const etag = `"${ createHash('sha1').update(`${ cacheKey }|${ CONFIG.assetVersion }`).digest('base64') }"`;

    res.set('ETag', etag);
    res.set('Cache-Control', `public, max-age=${ Math.floor(CONFIG.cacheTtlMs / 1000) }`);

    if (req.headers['if-none-match'] === etag) {
        res.set('X-Cache', 'REVALIDATED');

        return res.status(304).end();
    }

    const cached = cache.get(cacheKey);

    if (cached) return sendImage(res, cached.buffer, cached.animated, 'HIT');

    if (!renderer.ready) return res.status(503).type('text/plain').send('Renderer still starting, try again shortly.');

    // A sprite bubble is composited here instead of being drawn by the renderer,
    // so the avatar itself is rendered without any speech bubble.
    let bubble = null;

    if (descriptor.bubble && descriptor.text && CONFIG.bubbles.enabled) {
        try {
            bubble = await getBubble(descriptor.bubble);
        } catch (error) {
            console.warn('[pixinode] bubble catalog failed:', error?.message || error);
        }
    }

    try {
        const rendered = await renderer.render(bubble ? { ...descriptor, text: null } : descriptor);

        if (rendered?._diag) console.log('[pixinode] effect diag:', JSON.stringify(rendered._diag));

        if (!rendered || !rendered.frames?.length) throw new Error('renderer produced no frames');

        let frames = rendered.frames.map((frame) => Buffer.from(frame, 'base64'));
        let width = rendered.width;
        let height = rendered.height;

        let postScale = descriptor.postScale;

        // The avatar is enlarged first, then the bubble is composited at that same
        // factor: its text is drawn at the final size instead of being magnified
        // pixel by pixel afterwards.
        if (bubble) {
            if (postScale !== 1) {
                frames = frames.map((frame) => upscaleNearest(frame, width, height, postScale));
                width *= postScale;
                height *= postScale;
            }

            const composed = composeWithBubble(
                { frames, width, height },
                bubble,
                descriptor.text,
                `#${ descriptor.textColor.toString(16).padStart(6, '0') }`,
                postScale
            );

            frames = composed.frames;
            width = composed.width;
            height = composed.height;
            postScale = 1;
        }

        if (descriptor.background !== null) frames = flattenFrames(frames, descriptor.background);

        const buffer = encodeFrames({
            frames,
            width,
            height,
            delays: rendered.delays,
            postScale
        });

        cache.set(cacheKey, { buffer, animated: rendered.animated });

        return sendImage(res, buffer, rendered.animated, 'MISS');
    } catch (error) {
        if (error?.code === 'OVERLOADED') {
            res.set('Retry-After', '2');

            return res.status(503).type('text/plain').send('Server busy, try again shortly.');
        }

        console.error('[pixinode] render failed:', error?.message || error);

        return res.status(500).type('text/plain').send('Render failed.');
    }
});

if (CONFIG.scene.enabled) {
    app.get(CONFIG.scene.path, cors, rateLimiter, apiKeyGuard, async (req, res) => {
        let scene;

        try {
            scene = decodeScene(Array.isArray(req.query.s) ? req.query.s[0] : req.query.s);
        } catch (error) {
            const message = error instanceof SceneError ? error.message : 'Bad scene.';

            return res.status(400).type('text/plain').send(message);
        }

        const cacheKey = `scene:${ JSON.stringify(scene) }`;
        const etag = `"${ createHash('sha1').update(`${ cacheKey }|${ CONFIG.assetVersion }`).digest('base64') }"`;

        res.set('ETag', etag);
        res.set('Cache-Control', `public, max-age=${ Math.floor(CONFIG.cacheTtlMs / 1000) }`);

        if (req.headers['if-none-match'] === etag) {
            res.set('X-Cache', 'REVALIDATED');

            return res.status(304).end();
        }

        const cached = cache.get(cacheKey);

        if (cached) return sendImage(res, cached.buffer, cached.animated, 'HIT');

        if (!renderer.ready) return res.status(503).type('text/plain').send('Renderer still starting, try again shortly.');

        try {
            const { buffer, animated } = await renderScene(scene, renderer);

            cache.set(cacheKey, { buffer, animated });

            return sendImage(res, buffer, animated, 'MISS');
        } catch (error) {
            if (error instanceof SceneError) return res.status(400).type('text/plain').send(error.message);

            if (error?.code === 'OVERLOADED') {
                res.set('Retry-After', '2');

                return res.status(503).type('text/plain').send('Server busy, try again shortly.');
            }

            console.error('[pixinode] scene render failed:', error?.message || error);

            return res.status(500).type('text/plain').send('Scene render failed.');
        }
    });
}

const preflightGamedata = async () => {
    const cfg = buildRendererConfig();
    const checks = [
        ['avatar.actions.url', cfg['avatar.actions.url']],
        ['avatar.figuredata.url', cfg['avatar.figuredata.url']],
        ['avatar.figuremap.url', cfg['avatar.figuremap.url']],
        ['avatar.effectmap.url', cfg['avatar.effectmap.url']]
    ];

    let anyFail = false;

    for (const [key, url] of checks) {
        let status;

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(url, { method: 'GET', signal: controller.signal });

            clearTimeout(timer);
            status = res.status;
        } catch (error) {
            status = error.name === 'AbortError' ? 'timeout' : (error.cause?.code || error.message);
        }

        const ok = status === 200;

        if (!ok) anyFail = true;

        console.log(`[pixinode] gamedata ${ ok ? 'OK ' : 'ERR' } ${ String(status).padEnd(9) } ${ key } -> ${ url }`);
    }

    if (anyFail) {
        console.warn(
            '[pixinode] One or more gamedata files did not return HTTP 200.\n' +
            '  Point NITRO_GAMEDATA_URL at the directory that actually contains them, or set the\n' +
            '  per-file overrides in .env (NITRO_AVATAR_ACTIONS_URL / _FIGUREDATA_URL /\n' +
            '  _FIGUREMAP_URL / _EFFECTMAP_URL). Check the host is reachable and the path/casing.'
        );
    }

    const probeUrl = cfg['avatar.asset.url'].replace('%libname%', 'hh_human_body');
    let assetStatus;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(probeUrl, { method: 'GET', signal: controller.signal });

        clearTimeout(timer);
        assetStatus = res.status;
    } catch (error) {
        assetStatus = error.name === 'AbortError' ? 'timeout' : (error.cause?.code || error.message);
    }

    if (assetStatus === 200) {
        console.log(`[pixinode] assets   OK  200       avatar.asset.url  -> ${ probeUrl }`);
    } else {
        console.warn(`[pixinode] assets   ERR ${ String(assetStatus).padEnd(9) } avatar.asset.url  -> ${ probeUrl }`);
        console.warn(
            '  The figure .nitro base looks wrong. Set NITRO_AVATAR_ASSET_URL to the directory\n' +
            '  that directly holds the libraries, e.g. http://host/gamedata/clothes/%libname%.nitro\n' +
            '  (canary library: hh_human_body), then restart.'
        );
    }

    return !anyFail;
};

const start = async () => {
    const figuredataUrl = buildRendererConfig()['avatar.figuredata.url'];

    if (figuredataUrl.includes('hotel.example.com')) {
        console.warn(
            '[pixinode] WARNING: NITRO_GAMEDATA_URL / NITRO_ASSET_URL are not set —\n' +
            '  the renderer will try to fetch the placeholder host hotel.example.com and fail.\n' +
            '  Create a .env (see .env.example) or export those variables, then restart.'
        );
    }

    await preflightGamedata();

    if (CONFIG.db.configuredButOff) {
        console.log('[pixinode] database OFF (AVATAR_IMAGING_DB_ENABLED is not true) — panel search disabled.');
    }

    if (CONFIG.db.enabled) {
        const dbCheck = await checkDatabase(CONFIG.db, CONFIG.generate.authEnabled && CONFIG.generate.authMode === 'hotel');

        if (dbCheck.ok) {
            console.log(`[pixinode] database OK  ${ CONFIG.db.user }@${ CONFIG.db.host }:${ CONFIG.db.port }/${ CONFIG.db.database }`);
        } else {
            console.warn(`[pixinode] database ERR ${ dbCheck.error }`);
            console.warn(
                '  The panel\'s username search will not work. Check AVATAR_IMAGING_DB_* in .env\n' +
                '  (host reachable from this process, user granted SELECT, table/column names).'
            );
        }
    }

    if (!await preflightGl()) {
        process.exit(1);
    }

    const server = app.listen(CONFIG.port, CONFIG.host, () => {

        server.headersTimeout = 30_000;
        server.requestTimeout = 60_000;
        console.log(`[pixinode] listening on http://${ CONFIG.host }:${ CONFIG.port }`);

        if (CONFIG.scene.enabled) {
            console.log(`[pixinode] scene image hosts: ${ CONFIG.scene.imageHosts.length ? CONFIG.scene.imageHosts.join(', ') : '(none)' }`);

            if (CONFIG.scene.imageHosts.includes('*')) {
                console.warn('[pixinode] AVATAR_IMAGING_SCENE_IMAGE_HOSTS=* lets the server fetch ANY url. Only do this on a trusted network.');
            }
        }

        if (CONFIG.generate.enabled) {
            const base = CONFIG.generate.publicUrl || `http://${ CONFIG.host }:${ CONFIG.port }`;

            console.log(`[pixinode] generator panel on ${ base }${ CONFIG.generate.path }`);
            console.log(`[pixinode] panel access: ${
                CONFIG.generate.authEnabled
                    ? `login form (${ CONFIG.generate.authMode }${
                        CONFIG.generate.authMode === 'hotel' ? `, rank >= ${ CONFIG.generate.authMinRank }` : '' })`
                    : (CONFIG.generate.token ? '?token=' : 'PUBLIC') }`);

            if (CONFIG.generate.authEnabled && CONFIG.generate.authMode === 'hotel' && !CONFIG.db.enabled) {
                console.warn(
                    '[pixinode] PANEL CLOSED: AUTH_MODE=hotel needs AVATAR_IMAGING_DB_ENABLED=true.\n' +
                    '  Enable the database, or switch to AVATAR_IMAGING_GENERATE_AUTH_MODE=password.'
                );
            }

            if (CONFIG.generate.authEnabled && CONFIG.generate.authMode !== 'hotel' && !CONFIG.generate.authPassword) {
                console.warn('[pixinode] PANEL CLOSED: AVATAR_IMAGING_GENERATE_PASSWORD is empty.');
            }

            if (CONFIG.rateLimitMax > 0 && CONFIG.rateLimitMax < 240) {
                console.warn(
                    `[pixinode] AVATAR_IMAGING_RATELIMIT_MAX=${ CONFIG.rateLimitMax } is low for the generator UI:\n` +
                    '  one preview refresh requests ~17 images. Raise it to 240+ or the page will hit 429.'
                );
            }
        }
    });

    try {
        console.log('[pixinode] booting in-process @pixi/node renderer...');

        await renderer.init();

        console.log('[pixinode] ready (headless WebGL, serialized renders).');
    } catch (error) {
        console.error('[pixinode] failed to start renderer:', error?.message || error);
        process.exitCode = 1;
    }

    const shutdown = async () => {
        console.log('[pixinode] shutting down...');
        server.close();
        accessLogger.close();

        try {
            await renderer.close();
        } catch {
        }

        await closeDatabase();

        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};

start();
