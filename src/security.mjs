const isLoopback = (ip) => {
    if (!ip) return false;

    return ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('127.');
};

export const makeClientIp = (headerName) => (req) => {
    if (headerName) {
        const raw = req.headers[headerName];

        if (raw) {
            const value = Array.isArray(raw) ? raw[0] : raw;
            const first = String(value).split(',')[0].trim();

            if (first) return first;
        }
    }

    return req.ip || req.socket?.remoteAddress || 'unknown';
};

export const loopbackOnly = (req, res, next) => {
    if (isLoopback(req.socket?.remoteAddress)) return next();

    res.status(404).end();
};

export const securityHeaders = (req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');

    next();
};

export const createCors = (origin) => {
    if (!origin) return (req, res, next) => next();

    return (req, res, next) => {
        res.set('Access-Control-Allow-Origin', origin);
        res.set('Vary', 'Origin');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');

        if (req.method === 'OPTIONS') return res.status(204).end();

        next();
    };
};

export const createApiKeyGuard = (keys) => {
    if (!keys || !keys.length) return (req, res, next) => next();

    const allowed = new Set(keys);

    return (req, res, next) => {
        const key = req.get('x-api-key') || (Array.isArray(req.query.key) ? req.query.key[0] : req.query.key);

        if (key && allowed.has(key)) return next();

        res.status(401).type('text/plain').send('Unauthorized');
    };
};

export const createRateLimiter = ({ windowMs, max, clientIp }) => {
    if (!max || max <= 0) return (req, res, next) => next();

    const resolveIp = clientIp || ((req) => req.ip || req.socket?.remoteAddress || 'unknown');
    const hits = new Map();

    const prune = (now) => {
        for (const [ip, entry] of hits) {
            if (entry.reset <= now) hits.delete(ip);
        }
    };

    return (req, res, next) => {
        const now = Date.now();

        if (hits.size > 10000) prune(now);

        const ip = resolveIp(req);
        let entry = hits.get(ip);

        if (!entry || entry.reset <= now) {
            entry = { count: 0, reset: now + windowMs };
            hits.set(ip, entry);
        }

        entry.count += 1;

        if (entry.count > max) {
            res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));

            return res.status(429).type('text/plain').send('Too many requests');
        }

        next();
    };
};
