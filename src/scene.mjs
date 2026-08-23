import { deflateRawSync, inflateRawSync } from 'zlib';
import { createCanvas, loadImage } from 'canvas';
import { encodeFrames, upscaleNearest } from './apng.mjs';
import { parseAvatarParams } from './params.mjs';
import { CONFIG } from './config.mjs';
import { getFont, getFontImage } from './habbo-fonts.mjs';
import { layoutHabboText } from './font-layout.mjs';
import { composeWithBubble, getBubble } from './chat-bubbles.mjs';

export class SceneError extends Error {}

const num = (value, fallback, min, max) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return fallback;

    return Math.min(Math.max(parsed, min), max);
};

const hex = (value, fallback) => {
    const clean = String(value ?? '').trim().replace(/^#/, '');

    return /^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean) ? `#${ clean }` : fallback;
};

const text = (value, max) => String(value ?? '')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .slice(0, max);

export const encodeScene = (scene) => deflateRawSync(Buffer.from(JSON.stringify(scene), 'utf8'), { level: 9 })
    .toString('base64url');

export const decodeScene = (encoded) => {
    const raw = String(encoded || '');

    if (!raw) throw new SceneError('Missing scene data.');
    if (raw.length > CONFIG.scene.maxPayload) throw new SceneError('Scene data too large.');

    let json;

    try {
        json = inflateRawSync(Buffer.from(raw, 'base64url')).toString('utf8');
    } catch {
        try {
            json = Buffer.from(raw, 'base64url').toString('utf8');
        } catch {
            throw new SceneError('Scene data is not readable.');
        }
    }

    let parsed;

    try {
        parsed = JSON.parse(json);
    } catch {
        throw new SceneError('Scene data is not valid JSON.');
    }

    return normalizeScene(parsed);
};

export const hostAllowed = (url) => {
    if (!CONFIG.scene.imageHosts.length) return false;

    let parsed;

    try {
        parsed = new URL(url);
    } catch {
        return false;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    if (CONFIG.scene.imageHosts.includes('*')) return true;

    return CONFIG.scene.imageHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${ host }`));
};

const allowedHostsMessage = (what) => (CONFIG.scene.imageHosts.length
    ? `${ what } host not allowed. Allowed: ${ CONFIG.scene.imageHosts.join(', ') }. Add it to AVATAR_IMAGING_SCENE_IMAGE_HOSTS.`
    : `${ what } host not allowed: no host is configured. Set AVATAR_IMAGING_SCENE_IMAGE_HOSTS.`);

const normalizeLayer = (layer) => {
    const base = {
        x: num(layer.x, 0, -4000, 4000),
        y: num(layer.y, 0, -4000, 4000),
        s: num(layer.s, 100, 10, 800),
        o: num(layer.o, 100, 0, 100)
    };

    if (layer.t === 'i') {
        const url = String(layer.u || '');

        if (!hostAllowed(url)) throw new SceneError(allowedHostsMessage('Image layer'));

        return { ...base, t: 'i', u: url };
    }

    if (layer.t === 't') {
        const font = String(layer.font || '').trim();

        return {
            ...base,
            t: 't',
            v: text(layer.v, 200),
            c: hex(layer.c, '#000000'),
            fs: num(layer.fs, 20, 8, 160),
            b: layer.b ? 1 : 0,
            font: /^[a-z0-9-]{1,40}$/.test(font) ? font : '',
            sp: num(layer.sp, 0, -20, 60)
        };
    }

    const figure = String(layer.figure || '');

    if (!/^[A-Za-z0-9._-]+$/.test(figure) || figure.length > CONFIG.maxFigureLength) {
        throw new SceneError('Invalid figure in a layer.');
    }

    return {
        ...base,
        t: 'a',
        figure,
        action: String(layer.action || '').slice(0, CONFIG.maxActionLength),
        gesture: String(layer.gesture || 'std').slice(0, 8),
        direction: num(layer.direction, 2, 0, 7),
        head_direction: num(layer.head_direction, 2, 0, 7),
        headonly: layer.headonly ? 1 : 0,
        effect: num(layer.effect, 0, 0, 5000),
        dance: num(layer.dance, 0, 0, 4),
        size: ['s', 'n', 'l'].includes(layer.size) ? layer.size : 'n',
        frame_num: num(layer.frame_num, 0, 0, 60),
        text: text(layer.text, CONFIG.maxTextLength),
        text_color: hex(layer.text_color, '#000000').slice(1),
        bubble_color: hex(layer.bubble_color, '#ffffff').slice(1),
        bubble: /^\d{1,3}$/.test(String(layer.bubble || '')) ? String(layer.bubble) : ''
    };
};

export const normalizeScene = (scene) => {
    if (!scene || typeof scene !== 'object') throw new SceneError('Scene data is not an object.');

    const layers = Array.isArray(scene.l) ? scene.l : [];

    if (!layers.length) throw new SceneError('Scene has no layers.');
    if (layers.length > CONFIG.scene.maxLayers) throw new SceneError(`Scene has more than ${ CONFIG.scene.maxLayers } layers.`);

    const background = scene.bg && typeof scene.bg === 'object' ? scene.bg : {};
    const backgroundUrl = background.i ? String(background.i) : '';

    if (backgroundUrl && !hostAllowed(backgroundUrl)) throw new SceneError(allowedHostsMessage('Background image'));

    return {
        w: num(scene.w, 600, 32, CONFIG.scene.maxSize),
        h: num(scene.h, 400, 32, CONFIG.scene.maxSize),
        a: scene.a ? 1 : 0,
        smooth: scene.smooth === 0 ? 0 : 1,
        bg: {
            c: background.c ? hex(background.c, '#ffffff') : null,
            i: backgroundUrl || null,
            m: ['cover', 'contain', 'stretch', 'tile'].includes(background.m) ? background.m : 'cover',
            x: num(background.x, 0, -4000, 4000),
            y: num(background.y, 0, -4000, 4000),
            s: num(background.s, 100, 10, 400)
        },
        l: layers.map(normalizeLayer)
    };
};

const renderAvatarLayer = async (renderer, layer, animate) => {
    const descriptor = parseAvatarParams(
        {
            figure: layer.figure,
            action: layer.action || undefined,
            gesture: layer.gesture,
            direction: layer.direction,
            head_direction: layer.head_direction,
            headonly: layer.headonly,
            effect: layer.effect || undefined,
            dance: layer.dance || undefined,
            size: layer.size,
            frame_num: layer.frame_num,
            img_format: animate ? 'auto' : 'png',
            text: layer.text || undefined,
            text_color: layer.text_color,
            bubble_color: layer.bubble_color,
            bubble: layer.bubble || undefined
        },
        {
            defaultFigure: null,
            maxFigureLength: CONFIG.maxFigureLength,
            maxActionLength: CONFIG.maxActionLength,
            maxTextLength: CONFIG.maxTextLength
        }
    );

    let bubble = null;

    if (descriptor.bubble && descriptor.text && CONFIG.bubbles.enabled) {
        try {
            bubble = await getBubble(descriptor.bubble);
        } catch {
            bubble = null;
        }
    }

    const rendered = await renderer.render(bubble ? { ...descriptor, text: null } : descriptor);

    if (!rendered?.frames?.length) throw new SceneError('The renderer produced no frames for a layer.');

    if (bubble) {
        const scale = descriptor.postScale || 1;
        let raw = (animate ? rendered.frames : [rendered.frames[0]]).map((frame) => Buffer.from(frame, 'base64'));
        let width = rendered.width;
        let height = rendered.height;

        if (scale !== 1) {
            raw = raw.map((frame) => upscaleNearest(frame, width, height, scale));
            width *= scale;
            height *= scale;
        }

        const composed = composeWithBubble(
            { frames: raw, width, height },
            bubble,
            descriptor.text,
            `#${ descriptor.textColor.toString(16).padStart(6, '0') }`,
            scale
        );

        return {
            frames: composed.frames.map((frame) => encodeFrames({
                frames: [frame],
                width: composed.width,
                height: composed.height,
                delays: [0]
            })),
            delays: rendered.delays || []
        };
    }

    const frames = (animate ? rendered.frames : [rendered.frames[0]]).map((frame) => encodeFrames({
        frames: [Buffer.from(frame, 'base64')],
        width: rendered.width,
        height: rendered.height,
        delays: [0],
        postScale: descriptor.postScale
    }));

    return { frames, delays: rendered.delays || [] };
};

export const fetchImageBuffer = async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.scene.imageTimeoutMs);

    try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) throw new SceneError(`Image returned HTTP ${ response.status }.`);

        const type = response.headers.get('content-type') || '';

        if (!type.startsWith('image/')) throw new SceneError('That URL is not an image.');

        const buffer = Buffer.from(await response.arrayBuffer());

        if (buffer.length > CONFIG.scene.maxImageBytes) throw new SceneError('Image is too large.');

        return { buffer, type };
    } finally {
        clearTimeout(timer);
    }
};

const fetchImage = async (url) => {
    try {
        const { buffer } = await fetchImageBuffer(url);

        return await loadImage(buffer);
    } catch (error) {
        if (error instanceof SceneError) throw error;

        throw new SceneError('Could not load an image layer.');
    }
};

const setSmoothing = (ctx, on) => {
    ctx.imageSmoothingEnabled = on;

    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = on ? 'high' : 'low';
    if ('quality' in ctx) ctx.quality = on ? 'best' : 'nearest';
    if ('patternQuality' in ctx) ctx.patternQuality = on ? 'best' : 'nearest';
};

const drawBackground = async (ctx, scene, image) => {
    if (scene.bg.c) {
        ctx.fillStyle = scene.bg.c;
        ctx.fillRect(0, 0, scene.w, scene.h);
    }

    if (!image) return;

    const zoom = (scene.bg.s || 100) / 100;
    const offsetX = scene.bg.x || 0;
    const offsetY = scene.bg.y || 0;

    ctx.save();
    setSmoothing(ctx, scene.smooth !== 0);

    if (scene.bg.m === 'tile') {
        const width = Math.max(1, image.width * zoom);
        const height = Math.max(1, image.height * zoom);
        const startX = ((offsetX % width) + width) % width - width;
        const startY = ((offsetY % height) + height) % height - height;

        for (let y = startY; y < scene.h; y += height) {
            for (let x = startX; x < scene.w; x += width) ctx.drawImage(image, x, y, width, height);
        }

        ctx.restore();

        return;
    }

    ctx.translate(offsetX, offsetY);

    if (scene.bg.m === 'stretch') {
        ctx.drawImage(image, 0, 0, scene.w * zoom, scene.h * zoom);
        ctx.restore();

        return;
    }

    const ratio = (scene.bg.m === 'contain'
        ? Math.min(scene.w / image.width, scene.h / image.height)
        : Math.max(scene.w / image.width, scene.h / image.height)) * zoom;
    const width = image.width * ratio;
    const height = image.height * ratio;

    ctx.drawImage(image, (scene.w - width) / 2, (scene.h - height) / 2, width, height);
    ctx.restore();
};

const drawTextLayer = (ctx, layer, font, image) => {
    const laid = layoutHabboText(font, layer.v, { size: layer.fs, spacing: layer.sp });

    setSmoothing(ctx, false);

    for (const glyph of laid.glyphs) {
        ctx.drawImage(image, glyph.sx, glyph.sy, glyph.sw, glyph.sh, glyph.dx, glyph.dy, glyph.dw, glyph.dh);
    }
};

const drawLayer = (ctx, layer, drawable, smooth) => {
    ctx.save();
    ctx.globalAlpha = layer.o / 100;
    ctx.translate(layer.x, layer.y);

    const scale = layer.s / 100;

    if (layer.t === 't') {
        ctx.scale(scale, scale);

        if (drawable) {
            drawTextLayer(ctx, layer, drawable.font, drawable.image);
            ctx.restore();

            return;
        }

        ctx.font = `${ layer.b ? 'bold ' : '' }${ layer.fs }px sans-serif`;
        ctx.fillStyle = layer.c;
        ctx.textBaseline = 'top';

        layer.v.split('\n').forEach((line, index) => ctx.fillText(line, 0, index * layer.fs * 1.25));
        ctx.restore();

        return;
    }

    setSmoothing(ctx, layer.t === 'i' && smooth);
    ctx.drawImage(drawable, 0, 0, drawable.width * scale, drawable.height * scale);
    ctx.restore();
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);

export const renderScene = async (scene, renderer) => {
    const animate = Boolean(scene.a);
    const smooth = scene.smooth !== 0;
    const prepared = [];

    for (const layer of scene.l) {
        if (layer.t === 't') {
            let typeface = null;

            if (layer.font && CONFIG.fonts.enabled) {
                const font = await getFont(layer.font);
                const image = font ? await getFontImage(layer.font) : null;

                if (image) typeface = { font, image };
            }

            prepared.push({ layer, frames: null, typeface });

            continue;
        }

        if (layer.t === 'i') {
            prepared.push({ layer, frames: [await fetchImage(layer.u)] });

            continue;
        }

        const rendered = await renderAvatarLayer(renderer, layer, animate);

        prepared.push({
            layer,
            frames: await Promise.all(rendered.frames.map((frame) => loadImage(frame))),
            delays: rendered.delays
        });
    }

    let frameCount = 1;

    if (animate) {
        for (const entry of prepared) {
            if (entry.frames && entry.frames.length > 1) {
                frameCount = Math.min(CONFIG.maxFrames, lcm(frameCount, entry.frames.length));
            }
        }
    }

    const backgroundImage = scene.bg.i ? await fetchImage(scene.bg.i) : null;

    const canvas = createCanvas(scene.w, scene.h);
    const ctx = canvas.getContext('2d');

    const paint = async (index) => {
        ctx.clearRect(0, 0, scene.w, scene.h);

        await drawBackground(ctx, scene, backgroundImage);

        for (const entry of prepared) {
            if (!entry.frames) {
                drawLayer(ctx, entry.layer, entry.typeface || null, smooth);

                continue;
            }

            drawLayer(ctx, entry.layer, entry.frames[index % entry.frames.length], smooth);
        }
    };

    if (frameCount <= 1) {
        await paint(0);

        return { buffer: canvas.toBuffer('image/png'), animated: false };
    }

    const longest = prepared.reduce((best, entry) => (
        entry.frames && entry.frames.length > (best?.frames?.length || 0) ? entry : best
    ), null);
    const step = longest?.delays?.[0] || Math.round(1000 / CONFIG.animationFps);
    const frames = [];

    for (let index = 0; index < frameCount; index++) {
        await paint(index);
        frames.push(Buffer.from(ctx.getImageData(0, 0, scene.w, scene.h).data));
    }

    return {
        buffer: encodeFrames({
            frames,
            width: scene.w,
            height: scene.h,
            delays: new Array(frameCount).fill(step)
        }),
        animated: true
    };
};
