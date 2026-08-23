import { buildRendererConfig } from './config.mjs';

const HEAD_TYPES = new Set(['hd', 'hr', 'ha', 'he', 'ea', 'fa']);

const ORDER = ['hd', 'hr', 'ha', 'he', 'ea', 'fa', 'ch', 'cc', 'cp', 'ca', 'wa', 'lg', 'sh'];

let cache = null;
let pending = null;

const trimPalette = (palette) => ({
    id: palette.id,
    colors: (palette.colors || [])
        .filter((color) => color.selectable !== false)
        .map((color) => ({
            id: color.id,
            hex: `#${ String(color.hexCode || 'ffffff').replace('#', '') }`,
            club: Number(color.club) > 0 ? 1 : 0
        }))
});

const trimSet = (set) => ({
    id: set.id,
    gender: set.gender || 'U',
    club: Number(set.club) > 0 ? 1 : 0,
    colorable: set.colorable ? 1 : 0,
    colors: set.colorable ? Math.max(1, (set.parts || []).filter((part) => part.colorable).length ? 2 : 1) : 0
});

const build = (raw) => {
    const palettes = {};

    for (const palette of raw.palettes || []) palettes[palette.id] = trimPalette(palette);

    const types = (raw.setTypes || [])
        .map((setType) => ({
            type: setType.type,
            paletteId: setType.paletteId,
            head: HEAD_TYPES.has(setType.type) ? 1 : 0,
            sets: (setType.sets || [])
                .filter((set) => set.selectable !== false)
                .map(trimSet)
                .sort((a, b) => a.id - b.id)
        }))
        .filter((setType) => setType.sets.length);

    types.sort((a, b) => {
        const ia = ORDER.indexOf(a.type);
        const ib = ORDER.indexOf(b.type);

        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    return { palettes, types };
};

export const getFigureData = async ({ force = false, timeoutMs = 15000 } = {}) => {
    if (cache && !force) return cache;
    if (pending) return pending;

    const url = buildRendererConfig()['avatar.figuredata.url'];

    pending = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, { signal: controller.signal });

            if (!response.ok) throw new Error(`figuredata returned HTTP ${ response.status }`);

            const catalog = build(await response.json());

            if (!catalog.types.length) throw new Error('figuredata contains no selectable sets');

            cache = catalog;

            return catalog;
        } finally {
            clearTimeout(timer);
            pending = null;
        }
    })();

    return pending;
};
