import { readdirSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(HERE, '..', 'bubbles');

// Right-hand slice kept intact so the rounded end survives the stretch.
const RIGHT_CAP = 10;

let catalog = null;
let pending = null;

const idsFrom = (name) => name
    .replace(/^bubble_/, '')
    .replace(/_(pointer|extra|transparent)$/, '')
    .split('_')
    .filter((part) => /^\d+$/.test(part));

const scanFiles = () => {
    const bodies = new Map();
    const pointers = new Map();
    const extras = new Map();

    for (const file of readdirSync(DIR)) {
        if (!file.endsWith('.png')) continue;

        const base = file.slice(0, -4);
        const ids = idsFrom(base);

        if (!ids.length) continue;

        const target = base.endsWith('_pointer') ? pointers : (base.endsWith('_extra') ? extras : null);

        if (target) {
            for (const id of ids) if (!target.has(id)) target.set(id, file);

            continue;
        }

        if (base.endsWith('_transparent')) continue;

        for (const id of ids) if (!bodies.has(id)) bodies.set(id, file);
    }

    return { bodies, pointers, extras };
};

// The message area is the flat run of colour on the right of the sprite. Walking
// left from just inside the rounded end until the colour changes gives the point
// where the bubble may be stretched, and where the text may start.
const measure = (image) => {
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(0, 0, image.width, image.height).data;
    const mid = Math.floor(image.height / 2);
    const at = (x) => {
        const i = (mid * image.width + x) * 4;

        return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };

    const probe = Math.max(0, image.width - RIGHT_CAP - 2);
    const fill = at(probe);
    let start = probe;

    while (start > 0) {
        const pixel = at(start - 1);

        if (pixel[3] < 200) break;
        if (Math.abs(pixel[0] - fill[0]) > 12) break;
        if (Math.abs(pixel[1] - fill[1]) > 12) break;
        if (Math.abs(pixel[2] - fill[2]) > 12) break;

        start--;
    }

    // A couple of pixels of breathing room so the text does not sit against the
    // edge of the message area.
    return { textStart: Math.min(start + 6, image.width - RIGHT_CAP - 1), stretchAt: probe };
};

export const getBubbleCatalog = async () => {
    if (catalog) return catalog;
    if (pending) return pending;

    pending = (async () => {
        if (!existsSync(DIR)) throw new Error(`No bubble folder at ${ DIR }`);

        const { bodies, pointers, extras } = scanFiles();
        const list = [];

        for (const [id, file] of [...bodies].sort((a, b) => Number(a[0]) - Number(b[0]))) {
            try {
                const image = await loadImage(join(DIR, file));
                const pointerFile = pointers.get(id);
                const extraFile = extras.get(id);

                list.push({
                    id,
                    file,
                    image,
                    width: image.width,
                    height: image.height,
                    ...measure(image),
                    pointer: pointerFile ? await loadImage(join(DIR, pointerFile)) : null,
                    pointerFile: pointerFile || null,
                    extra: extraFile ? await loadImage(join(DIR, extraFile)) : null,
                    extraFile: extraFile || null
                });
            } catch (error) {
                console.warn(`[pixinode] bubble ${ id } failed: ${ error?.message || error }`);
            }
        }

        if (!list.length) throw new Error('No usable chat bubble found');

        catalog = list;
        pending = null;

        return list;
    })();

    return pending;
};

export const getBubble = async (id) => (await getBubbleCatalog()).find((bubble) => bubble.id === String(id)) || null;

export const getBubbleManifest = async () => (await getBubbleCatalog()).map((bubble) => ({
    id: bubble.id,
    width: bubble.width,
    height: bubble.height,
    textStart: bubble.textStart,
    stretchAt: bubble.stretchAt,
    pointerWidth: bubble.pointer ? bubble.pointer.width : 0,
    pointerHeight: bubble.pointer ? bubble.pointer.height : 0,
    extraWidth: bubble.extra ? bubble.extra.width : 0,
    extraHeight: bubble.extra ? bubble.extra.height : 0
}));

export const BUBBLE_FONT = '400 12px "Liberation Sans", Arial, sans-serif';

const fontAt = (scale) => `400 ${ 12 * scale }px "Liberation Sans", Arial, sans-serif`;

export const measureBubble = (bubble, text, ctx, scale = 1) => {
    ctx.font = fontAt(scale);

    const line = String(text || '').split('\n')[0].slice(0, 120);
    const textWidth = Math.ceil(ctx.measureText(line).width / scale);
    const width = Math.max(bubble.width, bubble.textStart + textWidth + 8 + RIGHT_CAP);

    return {
        line,
        textWidth,
        width: Math.round(width * scale),
        height: Math.round((bubble.height + (bubble.pointer ? bubble.pointer.height : 0)) * scale),
        unscaledWidth: width
    };
};

// The sprite is nearest-scaled so its pixel art stays crisp, while the text is
// drawn at the matching font size instead of being magnified afterwards — that is
// what keeps it readable at size=l.
export const drawBubble = (ctx, bubble, text, textColour, x, y, scale = 1) => {
    const measured = measureBubble(bubble, text, ctx, scale);
    const body = Math.round(bubble.height * scale);
    const stretchAt = Math.round(bubble.stretchAt * scale);
    const capWidth = Math.round((bubble.width - bubble.stretchAt) * scale);
    const extra = measured.width - Math.round(bubble.width * scale);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(bubble.image, 0, 0, bubble.stretchAt, bubble.height, x, y, stretchAt, body);

    if (extra > 0) {
        ctx.drawImage(bubble.image, bubble.stretchAt, 0, 1, bubble.height, x + stretchAt, y, extra, body);
    }

    ctx.drawImage(
        bubble.image,
        bubble.stretchAt, 0, bubble.width - bubble.stretchAt, bubble.height,
        x + stretchAt + Math.max(0, extra), y, capWidth, body
    );

    if (bubble.extra) {
        ctx.drawImage(
            bubble.extra, 0, 0, bubble.extra.width, bubble.extra.height,
            x + measured.width - Math.round(bubble.extra.width * scale), y,
            Math.round(bubble.extra.width * scale), Math.round(bubble.extra.height * scale)
        );
    }

    if (bubble.pointer) {
        ctx.drawImage(
            bubble.pointer, 0, 0, bubble.pointer.width, bubble.pointer.height,
            x + Math.round((bubble.textStart / 2) * scale), y + body,
            Math.round(bubble.pointer.width * scale), Math.round(bubble.pointer.height * scale)
        );
    }

    ctx.imageSmoothingEnabled = true;
    ctx.font = fontAt(scale);
    ctx.fillStyle = textColour;
    ctx.textBaseline = 'middle';
    ctx.fillText(measured.line, x + Math.round(bubble.textStart * scale), y + Math.round(body / 2));
    ctx.restore();

    return { width: measured.width, height: measured.height };
};

// Renders the bubble on its own, for the picker preview.
export const renderBubblePng = (bubble, text, textColour, scale = 1) => {
    const probe = createCanvas(1, 1).getContext('2d');
    const size = measureBubble(bubble, text, probe, scale);
    const canvas = createCanvas(size.width, size.height);

    drawBubble(canvas.getContext('2d'), bubble, text, textColour, 0, 0, scale);

    return canvas.toBuffer('image/png');
};

// Puts the bubble above an already rendered avatar, frame by frame so an
// animated avatar keeps its animation.
export const composeWithBubble = ({ frames, width, height }, bubble, text, textColour, scale = 1) => {
    const probe = createCanvas(1, 1).getContext('2d');
    const size = measureBubble(bubble, text, probe, scale);
    const gap = 2 * scale;
    const outWidth = Math.max(width, size.width);
    const outHeight = height + size.height + gap;
    const avatarX = Math.round((outWidth - width) / 2);
    const bubbleX = Math.max(0, Math.min(
        outWidth - size.width,
        avatarX + Math.round(width / 2) - Math.round(bubble.textStart * scale)
    ));

    const canvas = createCanvas(outWidth, outHeight);
    const ctx = canvas.getContext('2d');

    const out = frames.map((frame) => {
        ctx.clearRect(0, 0, outWidth, outHeight);

        const image = ctx.createImageData(width, height);

        image.data.set(frame);
        ctx.putImageData(image, avatarX, size.height + gap);

        drawBubble(ctx, bubble, text, textColour, bubbleX, 0, scale);

        return Buffer.from(ctx.getImageData(0, 0, outWidth, outHeight).data);
    });

    return { frames: out, width: outWidth, height: outHeight };
};
