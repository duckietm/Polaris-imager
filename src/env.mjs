import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env');

if (existsSync(envPath)) {
    if (typeof process.loadEnvFile === 'function') {
        try {
            process.loadEnvFile(envPath);
        } catch {

        }
    } else {
        try {
            for (const rawLine of readFileSync(envPath, 'utf8').split('\n')) {
                const line = rawLine.trim();

                if (!line || line.startsWith('#')) continue;

                const eq = line.indexOf('=');

                if (eq === -1) continue;

                const key = line.slice(0, eq).trim();
                let value = line.slice(eq + 1).trim();

                if (
                    (value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))
                ) {
                    value = value.slice(1, -1);
                }

                if (key && !(key in process.env)) process.env[key] = value;
            }
        } catch {

        }
    }
}
