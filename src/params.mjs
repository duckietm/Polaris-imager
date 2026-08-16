const POSTURES = {
    std: 'std', stand: 'std',
    wlk: 'mv', walk: 'mv', mv: 'mv', move: 'mv',
    sit: 'sit',
    lay: 'lay',
    float: 'float',
    swim: 'swim'
};

const EXPRESSIONS = {
    wav: 'wave', wave: 'wave',
    blow: 'blow', kiss: 'blow',
    laugh: 'laugh', lgh: 'laugh',
    respect: 'respect', rsp: 'respect',
    cry: 'cry'
};

const GESTURES = {
    std: null,
    agr: 'agr',
    sad: 'sad',
    sml: 'sml',
    srp: 'srp'
};

const CARRY_TOKENS = new Set(['crr', 'cri', 'carry']);
const DRINK_TOKENS = new Set(['drk', 'usei', 'drink', 'use']);

export class ParamError extends Error {}

const FIGURE_RE = /^[A-Za-z0-9._-]+$/;
const ACTION_RE = /^[A-Za-z0-9._,=-]*$/;
const MAX_ACTION_TOKENS = 24;

const HEX_COLOR_RE = /^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const parseHexColor = (value, fallback) => {
    let hex = (value ?? '').toString().trim().replace(/^#/, '');

    if (!HEX_COLOR_RE.test(hex)) return fallback;

    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');

    return parseInt(hex, 16);
};

const clampDirection = (value, fallback) => {
    const n = parseInt(value, 10);

    if (!Number.isFinite(n)) return fallback;

    return ((n % 8) + 8) % 8;
};

const clampInt = (value, fallback, min, max) => {
    const n = parseInt(value, 10);

    if (!Number.isFinite(n)) return fallback;

    if (min !== undefined && n < min) return min;

    if (max !== undefined && n > max) return max;

    return n;
};

const first = (value) => (Array.isArray(value) ? value[0] : value);

export const parseAvatarParams = (query, { defaultFigure = null, maxFigureLength = 512, maxActionLength = 256, maxTextLength = 100 } = {}) => {
    const figure = (first(query.figure) ?? '').trim() || defaultFigure;

    if (!figure) throw new ParamError('Missing required "figure" parameter.');
    if (figure.length > maxFigureLength) throw new ParamError('"figure" is too long.');
    if (!FIGURE_RE.test(figure)) throw new ParamError('"figure" contains invalid characters.');

    const genderRaw = (first(query.gender) ?? '').trim().toUpperCase();
    const gender = ['M', 'F', 'U'].includes(genderRaw) ? genderRaw : null;

    const sizeRaw = (first(query.size) ?? 'n').trim().toLowerCase();

    const scale = sizeRaw === 's' ? 'sh' : 'h';
    const postScale = sizeRaw === 'l' ? 2 : 1;

    const headonly = clampInt(first(query.headonly), 0, 0, 1) === 1;
    const setType = headonly ? 'head' : 'full';

    const direction = clampDirection(first(query.direction), 2);
    const headDirection = clampDirection(first(query.head_direction), 2);
    const frameNum = clampInt(first(query.frame_num), 0, 0, 10000);
    const dance = clampInt(first(query.dance), 0, 0, 4);
    const effect = clampInt(first(query.effect), 0, 0, 100000);

    const gestureRaw = (first(query.gesture) ?? 'std').trim().toLowerCase();
    let gesture = GESTURES[gestureRaw] ?? null;

    const formatRaw = (first(query.img_format) ?? first(query.format) ?? 'auto').trim().toLowerCase();
    const format = ['png', 'apng', 'auto'].includes(formatRaw) ? formatRaw : 'auto';

    let posture = 'std';
    const expressions = [];
    let handItem = null;

    const actionRaw = (first(query.action) ?? '').trim();

    if (actionRaw.length > maxActionLength) throw new ParamError('"action" is too long.');
    if (!ACTION_RE.test(actionRaw)) throw new ParamError('"action" contains invalid characters.');

    if (actionRaw.length) {
        const tokens = actionRaw.split(',');

        if (tokens.length > MAX_ACTION_TOKENS) throw new ParamError('too many action tokens.');

        for (const token of tokens) {
            const [rawKey, rawValue] = token.split('=');
            const key = (rawKey ?? '').trim().toLowerCase();

            if (!key.length) continue;

            const value = (rawValue ?? '').trim();

            if (POSTURES[key]) {
                posture = POSTURES[key];
            } else if (EXPRESSIONS[key]) {
                const expression = EXPRESSIONS[key];

                if (!expressions.includes(expression)) expressions.push(expression);
            } else if (CARRY_TOKENS.has(key)) {
                handItem = { action: 'cri', id: value.length ? value : '1' };
            } else if (DRINK_TOKENS.has(key)) {
                handItem = { action: 'usei', id: value.length ? value : '1' };
            } else if (key === 'gest' && GESTURES[value]) {
                gesture = GESTURES[value];
            } else if (key === 'wav' || key === 'wave') {
                if (!expressions.includes('wave')) expressions.push('wave');
            }

        }
    }

    const text = (first(query.text) ?? '')
        .toString()
        .replace(/\\n/g, '\n')
        .replace(/\r\n?/g, '\n')
        .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
        .slice(0, maxTextLength)
        .trim() || null;
    const textColor = parseHexColor(first(query.text_color), 0x000000);
    const bubbleColor = parseHexColor(first(query.bubble_color), 0xffffff);

    return {
        figure,
        gender,
        scale,
        postScale,
        setType,
        direction,
        headDirection,
        frameNum,
        posture,
        gesture,
        dance,
        effect,
        expressions,
        handItem,
        format,
        text,
        textColor,
        bubbleColor
    };
};
