import './src/browser-globals.mjs';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { encodeFrames } from './src/apng.mjs';
import { buildRendererConfig, FPS, MAX_FRAMES } from './src/renderer-config.mjs';
import { preflightGl } from './src/renderer.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const args = new Map(
    process.argv.slice(2)
        .filter((a) => a.startsWith('--'))
        .map((a) => {
            const eq = a.indexOf('=');

            return eq === -1 ? [a.slice(2), 'true'] : [a.slice(2, eq), a.slice(eq + 1)];
        })
);
const arg = (name, fallback) => (args.has(name) ? args.get(name) : fallback);
const intArg = (name, fallback) => {
    const v = parseInt(arg(name, ''), 10);

    return Number.isFinite(v) ? v : fallback;
};

const figure = arg('figure', null);

if (!figure) {
    console.error('usage: node render.mjs --figure=<figurestring> [--effect=N] [--direction=0-7]\n' +
        '       [--action=std|wlk|sit|lay|wav] [--gesture=sml|sad|agr|srp] [--dance=1-4]\n' +
        '       [--headonly] [--scale=h|sh] [--format=auto|png|apng] [--post-scale=N] [--out=path.png]');
    process.exit(1);
}

const direction = intArg('direction', 2);

const params = {
    figure,
    gender: arg('gender', null),
    scale: arg('scale', 'h'),
    setType: args.has('headonly') ? 'head' : 'full',
    direction,
    headDirection: intArg('head_direction', direction),
    frameNum: intArg('frame', 0),
    posture: arg('action', 'std'),
    gesture: arg('gesture', null),
    dance: intArg('dance', 0),
    effect: intArg('effect', 0),
    expressions: [],
    handItem: null,
    format: arg('format', 'auto'),
    text: arg('text', null),
    textColor: parseInt(arg('text-color', 'ffffff'), 16),
    bubbleColor: parseInt(arg('bubble-color', 'ffffff'), 16)
};

const postScale = intArg('post-scale', 1);
const outPath = resolve(HERE, arg('out', `out/${Date.now()}.png`));

globalThis.NitroConfig = buildRendererConfig();

try {
    const actionsUrl = globalThis.NitroConfig['avatar.actions.url'];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(actionsUrl, { signal: controller.signal });

    clearTimeout(timer);

    if (response.status === 200) globalThis.NitroConfig['avatar.default.actions'] = await response.json();
    else console.error(`[spike] warning: actions fetch returned HTTP ${ response.status } for ${ actionsUrl }`);
} catch (error) {
    console.error(`[spike] warning: could not pre-fetch avatar actions (${ error?.message || error })`);
}
const envDebug = ['1', 'true', 'yes', 'on'].includes((process.env.AVATAR_IMAGING_DEBUG || '').trim().toLowerCase());

globalThis.__IMAGING_OPTS__ = { fps: FPS, maxFrames: MAX_FRAMES, debug: args.has('debug') || envDebug };

const BUNDLE = resolve(HERE, 'dist-node', 'boot-node.mjs');

if (!existsSync(BUNDLE)) {
    console.error(`[spike] bundle not found at ${BUNDLE} — run:  npm run build`);
    process.exit(1);
}

const t0 = Date.now();

if (!await preflightGl()) {
    process.exit(1);
}

const { initRenderer, renderAvatar } = await import(pathToFileURL(BUNDLE).href);

console.log('[spike] booting renderer under @pixi/node …');
await initRenderer();
console.log(`[spike] renderer ready in ${Date.now() - t0}ms`);

console.log(`[spike] rendering figure=${figure} effect=${params.effect} dir=${direction} …`);
const tR = Date.now();
const result = await renderAvatar(params);

if (!result || !result.frames?.length) {
    console.error('[spike] renderer produced no frames');
    if (result?._diag) console.error(JSON.stringify(result._diag, null, 2));
    process.exit(2);
}

const frames = result.frames.map((f) => Buffer.from(f, 'base64'));
const png = encodeFrames({ frames, width: result.width, height: result.height, delays: result.delays, postScale });

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, png);

console.log(`[spike] done in ${Date.now() - tR}ms → ${outPath}`);
console.log(`[spike] ${result.frames.length} frame(s), ${result.width}x${result.height}${result.animated ? ' (animated APNG)' : ''}, ${png.length} bytes`);
if (result._diag) console.log('[spike] diag:', JSON.stringify(result._diag, null, 2));

process.exit(0);
