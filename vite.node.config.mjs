import { existsSync, realpathSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';

const resolveRenderer = () => {
    if (process.env.NITRO_RENDERER_PATH) return resolve(process.env.NITRO_RENDERER_PATH);

    const linked = resolve(import.meta.dirname, 'node_modules', '@nitrots', 'nitro-renderer');

    if (existsSync(linked)) {
        try {
            return realpathSync(linked);
        } catch {
        }
    }

    return resolve(import.meta.dirname, '..', 'Nitro-Renderer');
};

const RENDERER = resolveRenderer();

if (!existsSync(resolve(RENDERER, 'index.ts'))) {
    throw new Error(
        `[avatar-imaging-pixinode] Nitro renderer not found at ${RENDERER}.\n` +
        '  Place the renderer checkout at ../Nitro-Renderer (sibling of this service),\n' +
        '  or set NITRO_RENDERER_PATH to the renderer directory (e.g. in .env).'
    );
}

const alias = {
    '@nitrots/nitro-renderer': resolve(RENDERER, 'index.ts'),
    '@nitrots/api': resolve(RENDERER, 'packages/api/src/index.ts'),
    '@nitrots/assets': resolve(RENDERER, 'packages/assets/src/index.ts'),
    '@nitrots/avatar': resolve(RENDERER, 'packages/avatar/src/index.ts'),
    '@nitrots/camera': resolve(RENDERER, 'packages/camera/src/index.ts'),
    '@nitrots/communication': resolve(RENDERER, 'packages/communication/src/index.ts'),
    '@nitrots/configuration': resolve(RENDERER, 'packages/configuration/src/index.ts'),
    '@nitrots/events': resolve(RENDERER, 'packages/events/src/index.ts'),
    '@nitrots/localization': resolve(RENDERER, 'packages/localization/src/index.ts'),
    '@nitrots/room': resolve(RENDERER, 'packages/room/src/index.ts'),
    '@nitrots/session': resolve(RENDERER, 'packages/session/src/index.ts'),
    '@nitrots/sound': resolve(RENDERER, 'packages/sound/src/index.ts'),
    '@nitrots/utils/src': resolve(RENDERER, 'packages/utils/src'),
    '@nitrots/utils': resolve(RENDERER, 'packages/utils/src/index.ts'),
    'pixi.js': resolve(RENDERER, 'node_modules', 'pixi.js'),
    'pixi-filters': resolve(RENDERER, 'node_modules', 'pixi-filters'),
    'howler': resolve(RENDERER, 'node_modules', 'howler'),
    'wasm-webp': resolve(import.meta.dirname, 'harness', 'stubs', 'wasm-webp.js'),
    '@jsquash/avif': resolve(import.meta.dirname, 'harness', 'stubs', 'jsquash-avif.js'),
    'cross-fetch': resolve(import.meta.dirname, 'harness', 'stubs', 'cross-fetch.js'),
    '@xmldom/xmldom': resolve(import.meta.dirname, 'harness', 'stubs', 'xmldom.js')
};

export default defineConfig({
    resolve: { alias, dedupe: ['pixi.js'] },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    ssr: {
        noExternal: true,
        external: ['gl', 'canvas', 'node-gyp-build']
    },
    build: {
        ssr: resolve(import.meta.dirname, 'harness', 'boot-node.ts'),
        outDir: resolve(import.meta.dirname, 'dist-node'),
        emptyOutDir: true,
        target: 'node20',
        sourcemap: false,
        minify: false,
        rollupOptions: {
            external: ['gl', 'canvas', 'node-gyp-build'],
            treeshake: { moduleSideEffects: true },
            output: {
                format: 'es',
                entryFileNames: 'boot-node.mjs',
                inlineDynamicImports: true
            }
        }
    }
});
