import { existsSync, readFileSync, realpathSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// Sibling checkout names, probed in order. Both capitalisations of the current
// repository name are listed on purpose: `git clone .../Octane-Renderer.git`
// creates `Octane-Renderer`, which Windows matches either way but a
// case-sensitive Linux filesystem does not. `Octance-Renderer` is the monorepo
// sibling and `Nitro-Renderer` the legacy checkout name.
const RENDERER_DIRECTORY_NAMES = [
    'Octane-Renderer',
    'octane-renderer',
    'Octance-Renderer',
    'Nitro-Renderer',
    'renderer'
];

const resolveRenderer = () => {
    if (process.env.NITRO_RENDERER_PATH) return resolve(process.env.NITRO_RENDERER_PATH);

    const linked = resolve(import.meta.dirname, 'node_modules', '@nitrots', 'nitro-renderer');

    if (existsSync(linked)) {
        try {
            return realpathSync(linked);
        } catch {
        }
    }

    const candidates = RENDERER_DIRECTORY_NAMES.map((name) => resolve(import.meta.dirname, '..', name));

    return candidates.find((candidate) => existsSync(resolve(candidate, 'index.ts'))) ?? candidates[0];
};

const RENDERER = resolveRenderer();

if (!existsSync(resolve(RENDERER, 'index.ts'))) {
    throw new Error(
        `[avatar-imaging-pixinode] Nitro renderer not found at ${RENDERER}.\n` +
        `  Place the renderer checkout next to this service (${RENDERER_DIRECTORY_NAMES.join(', ')}),\n` +
        '  or set NITRO_RENDERER_PATH to the renderer directory (e.g. in .env).'
    );
}

const PIXI = resolve(RENDERER, 'node_modules', 'pixi.js');

if (!existsSync(resolve(PIXI, 'package.json'))) {
    throw new Error(
        `[avatar-imaging-pixinode] pixi.js not found at ${PIXI}.\n` +
        '  Run `yarn install` inside the renderer checkout once so its dependencies exist.'
    );
}

// `pixi.js` is aliased to the renderer's copy so the renderer, @pixi/node and the
// harness all share one instance. That alias also captures subpath imports such
// as `pixi.js/advanced-blend-modes`, which are *export map* entries with no
// matching directory on disk — rewriting them by path yields
// `<renderer>/node_modules/pixi.js/advanced-blend-modes` and the build dies with
// UNLOADABLE_DEPENDENCY. Map every subpath to the ESM file its export map names,
// so subpaths keep resolving against the same single pixi copy. (Letting them
// fall through to normal resolution instead pulls in a *second* pixi from this
// service's own node_modules, silently registering onto the wrong instance.)
const pixiSubpathAlias = () => {
    const { exports: exportMap = {} } = JSON.parse(readFileSync(resolve(PIXI, 'package.json'), 'utf8'));
    const entries = {};

    for (const [subpath, target] of Object.entries(exportMap)) {
        if (subpath === '.' || subpath.includes('*')) continue;

        const file = target?.import?.default ?? target?.import ?? target?.default;

        if (typeof file === 'string') entries[`pixi.js${subpath.slice(1)}`] = resolve(PIXI, file);
    }

    return entries;
};

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
    // The subpath entries must stay ahead of the bare 'pixi.js' alias: the first
    // matching key wins, and the bare one would otherwise swallow them.
    ...pixiSubpathAlias(),
    'pixi.js': PIXI,
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
