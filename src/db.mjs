const IDENT_RE = /^[A-Za-z0-9_]+$/;

const ident = (name, fallback) => (IDENT_RE.test(name || '') ? name : fallback);

let pool = null;
let poolFailed = false;

const getPool = async (db) => {
    if (!db.enabled || poolFailed) return null;
    if (pool) return pool;

    try {

        const mysql = await import('mysql2/promise');

        pool = mysql.createPool({
            host: db.host,
            port: db.port,
            user: db.user,
            password: db.password,
            database: db.database,
            waitForConnections: true,
            connectionLimit: 4,
            connectTimeout: db.timeoutMs,
            charset: 'utf8mb4_general_ci'
        });

        return pool;
    } catch (error) {
        poolFailed = true;

        console.error('[pixinode] MySQL unavailable:', error?.message || error);
        console.error('[pixinode] Run `npm install` (the mysql2 driver is required for the username search).');

        return null;
    }
};

export const findUserByName = async (db, username) => {
    const connection = await getPool(db);

    if (!connection) return null;

    const table = ident(db.table, 'users');
    const nameCol = ident(db.usernameColumn, 'username');
    const lookCol = ident(db.lookColumn, 'look');

    const [rows] = await connection.execute(
        `SELECT \`${ nameCol }\` AS username, \`${ lookCol }\` AS figure FROM \`${ table }\` WHERE \`${ nameCol }\` = ? LIMIT 1`,
        [username]
    );

    return rows?.[0] || null;
};

export const searchUsers = async (db, query, limit = 8) => {
    const connection = await getPool(db);

    if (!connection) return [];

    const table = ident(db.table, 'users');
    const nameCol = ident(db.usernameColumn, 'username');
    const lookCol = ident(db.lookColumn, 'look');

    const needle = `${ query.replace(/[\\%_]/g, (c) => `\\${ c }`) }%`;
    const size = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 20);

    const [rows] = await connection.execute(
        `SELECT \`${ nameCol }\` AS username, \`${ lookCol }\` AS figure FROM \`${ table }\` ` +
        `WHERE \`${ nameCol }\` LIKE ? ORDER BY \`${ nameCol }\` ASC LIMIT ${ size }`,
        [needle]
    );

    return rows || [];
};

export const findAccountForLogin = async (db, username) => {
    const connection = await getPool(db);

    if (!connection) return null;

    const table = ident(db.table, 'users');
    const nameCol = ident(db.usernameColumn, 'username');
    const passCol = ident(db.passwordColumn, 'password');
    const rankCol = ident(db.rankColumn, 'rank');

    const [rows] = await connection.execute(
        `SELECT \`${ nameCol }\` AS username, \`${ passCol }\` AS password, \`${ rankCol }\` AS rank ` +
        `FROM \`${ table }\` WHERE \`${ nameCol }\` = ? LIMIT 1`,
        [username]
    );

    return rows?.[0] || null;
};

export const checkDatabase = async (db, withAuthColumns = false) => {
    if (!db.enabled) return { ok: false, skipped: true };

    try {
        const connection = await getPool(db);

        if (!connection) return { ok: false, error: 'driver mysql2 absent' };

        const table = ident(db.table, 'users');
        const nameCol = ident(db.usernameColumn, 'username');
        const lookCol = ident(db.lookColumn, 'look');

        await connection.execute(`SELECT \`${ nameCol }\`, \`${ lookCol }\` FROM \`${ table }\` LIMIT 1`);

        if (withAuthColumns) {
            const passCol = ident(db.passwordColumn, 'password');
            const rankCol = ident(db.rankColumn, 'rank');

            await connection.execute(`SELECT \`${ passCol }\`, \`${ rankCol }\` FROM \`${ table }\` LIMIT 1`);
        }

        return { ok: true };
    } catch (error) {
        return { ok: false, error: error?.message || String(error) };
    }
};

export const closeDatabase = async () => {
    if (pool) {
        try {
            await pool.end();
        } catch {

        }

        pool = null;
    }
};
