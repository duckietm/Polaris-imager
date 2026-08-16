import './env.mjs';
import { buildRendererConfig, FPS, MAX_FRAMES } from './renderer-config.mjs';

export { buildRendererConfig, FPS, MAX_FRAMES };

const env = process.env;

const int = (value, fallback) => {
    const parsed = parseInt(value, 10);

    return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value) => ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase());

const trustProxy = (value) => {
    if (value === undefined || value === '') return false;
    if (value === 'true') return true;
    if (value === 'false') return false;

    const n = parseInt(value, 10);

    return Number.isFinite(n) && String(n) === value.trim() ? n : value;
};

const list = (value, fallback) => {
    if (!value || !value.trim().length) return fallback;

    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
};

export const CONFIG = {
    host: env.AVATAR_IMAGING_HOST || '0.0.0.0',
    port: int(env.AVATAR_IMAGING_PORT, 8082),

    concurrency: 1,

    renderTimeoutMs: int(env.AVATAR_IMAGING_RENDER_TIMEOUT_MS, 30000),

    bootTimeoutMs: int(env.AVATAR_IMAGING_BOOT_TIMEOUT_MS, 60000),

    animationFps: FPS,
    maxFrames: MAX_FRAMES,

    cacheEntries: int(env.AVATAR_IMAGING_CACHE_ENTRIES, 512),
    cacheMaxBytes: int(env.AVATAR_IMAGING_CACHE_MAX_BYTES, 256 * 1024 * 1024),
    cacheTtlMs: int(env.AVATAR_IMAGING_CACHE_TTL_MS, 5 * 60 * 1000),

    assetVersion: (env.AVATAR_IMAGING_ASSET_VERSION || '').trim(),

    debug: bool(env.AVATAR_IMAGING_DEBUG),

    trustProxy: trustProxy(env.AVATAR_IMAGING_TRUST_PROXY),

    clientIpHeader: (env.AVATAR_IMAGING_CLIENT_IP_HEADER || '').toLowerCase().trim(),

    accessLog: env.AVATAR_IMAGING_ACCESS_LOG === undefined ? true : bool(env.AVATAR_IMAGING_ACCESS_LOG),

    logFile: env.AVATAR_IMAGING_LOG_FILE || null,
    logMaxBytes: int(env.AVATAR_IMAGING_LOG_MAX_BYTES, 10 * 1024 * 1024),
    logMaxFiles: int(env.AVATAR_IMAGING_LOG_MAX_FILES, 5),

    rateLimitWindowMs: int(env.AVATAR_IMAGING_RATELIMIT_WINDOW_MS, 60000),
    rateLimitMax: int(env.AVATAR_IMAGING_RATELIMIT_MAX, 120),

    maxQueue: int(env.AVATAR_IMAGING_MAX_QUEUE, 16),

    apiKeys: list(env.AVATAR_IMAGING_API_KEYS, []),

    corsOrigin: (env.AVATAR_IMAGING_CORS_ORIGIN || '').trim(),

    maxFigureLength: int(env.AVATAR_IMAGING_MAX_FIGURE_LEN, 512),
    maxActionLength: int(env.AVATAR_IMAGING_MAX_ACTION_LEN, 256),
    maxTextLength: int(env.AVATAR_IMAGING_MAX_TEXT_LEN, 100),

    generate: {

        enabled: env.AVATAR_IMAGING_GENERATE_UI === undefined ? true : bool(env.AVATAR_IMAGING_GENERATE_UI),

        path: (env.AVATAR_IMAGING_GENERATE_PATH || '/Generate').trim(),

        title: (env.AVATAR_IMAGING_GENERATE_TITLE || 'Avatar Studio').trim(),

        publicUrl: (env.AVATAR_IMAGING_PUBLIC_URL || '').trim().replace(/\/+$/, ''),

        token: (env.AVATAR_IMAGING_GENERATE_TOKEN || '').trim(),

        uiApiKey: (env.AVATAR_IMAGING_GENERATE_KEY || '').trim(),

        defaultFigure: (env.AVATAR_IMAGING_DEFAULT_FIGURE || '').trim()
            || 'hd-180-1.ch-255-66.lg-280-110.sh-305-62',

        authEnabled: bool(env.AVATAR_IMAGING_GENERATE_AUTH),

        authMode: ['password', 'hotel'].includes((env.AVATAR_IMAGING_GENERATE_AUTH_MODE || 'password').trim().toLowerCase())
            ? (env.AVATAR_IMAGING_GENERATE_AUTH_MODE || 'password').trim().toLowerCase()
            : 'password',

        authUser: (env.AVATAR_IMAGING_GENERATE_USER || '').trim(),
        authPassword: (env.AVATAR_IMAGING_GENERATE_PASSWORD || '').trim(),

        authMinRank: int(env.AVATAR_IMAGING_GENERATE_MIN_RANK, 6),

        authMaxAttempts: int(env.AVATAR_IMAGING_GENERATE_MAX_ATTEMPTS, 8),
        authLockMs: int(env.AVATAR_IMAGING_GENERATE_LOCK_MS, 15 * 60 * 1000),

        authSecret: (env.AVATAR_IMAGING_GENERATE_SECRET || '').trim(),
        authTtlMs: int(env.AVATAR_IMAGING_GENERATE_SESSION_MS, 12 * 60 * 60 * 1000),

        lookupUrl: (env.AVATAR_IMAGING_LOOKUP_URL || '').trim(),
        lookupHeader: (env.AVATAR_IMAGING_LOOKUP_HEADER || 'X-API-Key').trim(),
        lookupKey: (env.AVATAR_IMAGING_LOOKUP_KEY || '').trim(),
        lookupTimeoutMs: int(env.AVATAR_IMAGING_LOOKUP_TIMEOUT_MS, 8000)
    },

    db: {

        enabled: bool(env.AVATAR_IMAGING_DB_ENABLED)
            && Boolean((env.AVATAR_IMAGING_DB_USER || '').trim() && (env.AVATAR_IMAGING_DB_NAME || '').trim()),

        configuredButOff: !bool(env.AVATAR_IMAGING_DB_ENABLED)
            && Boolean((env.AVATAR_IMAGING_DB_USER || '').trim()),

        host: (env.AVATAR_IMAGING_DB_HOST || '127.0.0.1').trim(),
        port: int(env.AVATAR_IMAGING_DB_PORT, 3306),
        user: (env.AVATAR_IMAGING_DB_USER || '').trim(),
        password: env.AVATAR_IMAGING_DB_PASSWORD || '',
        database: (env.AVATAR_IMAGING_DB_NAME || '').trim(),
        timeoutMs: int(env.AVATAR_IMAGING_DB_TIMEOUT_MS, 8000),

        table: (env.AVATAR_IMAGING_DB_TABLE || 'users').trim(),
        usernameColumn: (env.AVATAR_IMAGING_DB_USERNAME_COLUMN || 'username').trim(),
        lookColumn: (env.AVATAR_IMAGING_DB_LOOK_COLUMN || 'look').trim(),

        passwordColumn: (env.AVATAR_IMAGING_DB_PASSWORD_COLUMN || 'password').trim(),
        rankColumn: (env.AVATAR_IMAGING_DB_RANK_COLUMN || 'rank').trim()
    }
};
