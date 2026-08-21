import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const HERE = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = resolve(HERE, '..', 'fonts');
const MANIFEST = join(FONT_DIR, 'fonts.json');

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let catalog = null;
let pending = null;

const columnRuns = (data, width, height, isBackground) => {
    const runs = [];
    let start = -1;

    for (let x = 0; x < width; x++) {
        let filled = false;

        for (let y = 0; y < height; y++) {
            const i = (y * width + x) * 4;

            if (!isBackground(data[i], data[i + 1], data[i + 2], data[i + 3])) {
                filled = true;
                break;
            }
        }

        if (filled) {
            if (start === -1) start = x;
        } else if (start !== -1) {
            runs.push([start, x - 1]);
            start = -1;
        }
    }

    if (start !== -1) runs.push([start, width - 1]);

    return runs;
};

const mergeRuns = (runs, gap) => {
    const out = [];

    for (const run of runs) {
        const last = out[out.length - 1];

        if (last && run[0] - last[1] - 1 <= gap) last[1] = run[1];
        else out.push([run[0], run[1]]);
    }

    return out;
};

// Some sheets are GIFs with an opaque backdrop instead of alpha. Anything that
// matches the top-left pixel closely enough is treated as background, both for
// glyph detection and for the transparent sheet handed to the browser.
const backgroundTest = (data) => {
    const [r, g, b, a] = [data[0], data[1], data[2], data[3]];

    if (a <= 16) return (_r, _g, _b, alpha) => alpha <= 16;

    return (pr, pg, pb, pa) => pa <= 16
        || (Math.abs(pr - r) < 14 && Math.abs(pg - g) < 14 && Math.abs(pb - b) < 14);
};

const analyse = async (file) => {
    const image = await loadImage(join(FONT_DIR, file));
    const width = image.width;
    const height = image.height;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(0, 0, width, height).data;
    const isBackground = backgroundTest(data);

    let runs = columnRuns(data, width, height, isBackground);

    // Stray one-pixel slivers sitting right next to a glyph (a dotted i, a broken
    // serif) get glued back on, but never so aggressively that two letters merge:
    // a wider gap is only accepted while at least 26 runs survive.
    for (const gap of [1, 2, 3]) {
        const merged = mergeRuns(runs, gap);

        if (merged.length < LETTERS.length) break;

        runs = merged;

        if (runs.length === LETTERS.length) break;
    }

    // Several sheets carry decoration: a border strip at each end, a logo after
    // the alphabet. Those runs are far off the typical glyph width, so the most
    // deviant one is dropped until exactly 26 remain.
    while (runs.length > LETTERS.length) {
        const widths = runs.map(([start, end]) => end - start + 1);
        const median = [...widths].sort((a, b) => a - b)[Math.floor(widths.length / 2)];

        let worst = 0;

        for (let i = 1; i < widths.length; i++) {
            if (Math.abs(widths[i] - median) > Math.abs(widths[worst] - median)) worst = i;
        }

        runs.splice(worst, 1);
    }

    const detected = runs.length === LETTERS.length;
    const glyphs = {};

    if (detected) {
        LETTERS.forEach((letter, index) => {
            const [start, end] = runs[index];

            glyphs[letter] = { x: start, w: end - start + 1 };
        });
    } else {
        const step = width / LETTERS.length;

        LETTERS.forEach((letter, index) => {
            glyphs[letter] = { x: Math.round(index * step), w: Math.max(1, Math.round(step)) };
        });
    }

    const average = LETTERS.reduce((sum, letter) => sum + glyphs[letter].w, 0) / LETTERS.length;

    // Transparent copy of the sheet, so a keyed GIF does not paste a coloured box
    // over the scene. Browser and server then work from the exact same pixels.
    const keyed = ctx.getImageData(0, 0, width, height);

    for (let i = 0; i < keyed.data.length; i += 4) {
        if (isBackground(keyed.data[i], keyed.data[i + 1], keyed.data[i + 2], keyed.data[i + 3])) {
            keyed.data[i + 3] = 0;
        }
    }

    ctx.putImageData(keyed, 0, 0);

    return {
        width,
        height,
        glyphs,
        space: Math.max(6, Math.round(average * 0.55)),
        detected,
        sheet: canvas.toBuffer('image/png')
    };
};

export const getFontCatalog = async () => {
    if (catalog) return catalog;
    if (pending) return pending;

    pending = (async () => {
        if (!existsSync(MANIFEST)) throw new Error(`No font manifest at ${ MANIFEST }`);

        const entries = JSON.parse(readFileSync(MANIFEST, 'utf8'));
        const fonts = [];

        for (const entry of entries) {
            const file = basename(String(entry.src || ''));

            if (!file || !existsSync(join(FONT_DIR, file))) {
                console.warn(`[pixinode] font asset missing: ${ entry.src }`);

                continue;
            }

            try {
                const built = await analyse(file);

                if (!built.detected) {
                    console.warn(`[pixinode] font "${ entry.name }" skipped: its letters touch, they cannot be sliced apart.`);

                    continue;
                }

                fonts.push({ id: slug(entry.name || file), name: entry.name || file, file, ...built });
            } catch (error) {
                console.warn(`[pixinode] font ${ entry.name } failed: ${ error?.message || error }`);
            }
        }

        if (!fonts.length) throw new Error('No usable font sheet found');

        catalog = fonts;
        pending = null;

        return fonts;
    })();

    return pending;
};

export const getFont = async (id) => (await getFontCatalog()).find((font) => font.id === id) || null;

export const getFontSheet = async (id) => (await getFont(id))?.sheet || null;

// What the page needs: no pixel data, just the metrics.
export const getFontManifest = async () => (await getFontCatalog()).map((font) => ({
    id: font.id,
    name: font.name,
    width: font.width,
    height: font.height,
    space: font.space,
    glyphs: font.glyphs
}));

const images = new Map();

export const getFontImage = async (id) => {
    if (images.has(id)) return images.get(id);

    const sheet = await getFontSheet(id);

    if (!sheet) return null;

    const image = await loadImage(sheet);

    images.set(id, image);

    return image;
};
