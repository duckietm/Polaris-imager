import './browser-globals.mjs';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { CONFIG, buildRendererConfig } from './config.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(HERE, '..', 'dist-node', 'boot-node.mjs');

const BUNDLE_URL = pathToFileURL(BUNDLE).href;

export const preflightGl = async () => {
    let createContext;

    try {
        createContext = (await import('gl')).default;
    } catch (error) {
        console.error('[pixinode] the native "gl" module failed to load:', error?.message || error);
        console.error('  Reinstall the dependencies on this machine and Node version:  yarn install');

        return false;
    }

    const probe = createContext(2, 2);

    if (probe) {
        const destroyer = probe.getExtension('STACKGL_destroy_context');

        if (destroyer) destroyer.destroy();

        return true;
    }

    console.error('[pixinode] WebGL context creation failed: headless-gl returned null.');
    console.error(`  DISPLAY=${ process.env.DISPLAY || '(unset)' }  LIBGL_ALWAYS_SOFTWARE=${ process.env.LIBGL_ALWAYS_SOFTWARE || '(unset)' }  GALLIUM_DRIVER=${ process.env.GALLIUM_DRIVER || '(unset)' }`);

    const displayNum = (process.env.DISPLAY || '').match(/^:(\d+)/);

    if (displayNum) {
        const socket = `/tmp/.X11-unix/X${ displayNum[1] }`;

        if (!existsSync(socket)) {
            console.error(`  ${ socket } does not exist: the X/Xvfb server behind DISPLAY=${ process.env.DISPLAY } is NOT running.`);
            console.error('  In the Docker image, check /tmp/xvfb.log inside the container for why Xvfb exited.');
        } else {
            console.error(`  ${ socket } exists: the X server is up, but GLX context creation still failed.`);
            console.error('  Check that the Mesa userland is present (libgl1, libglx-mesa0, libgl1-mesa-dri, libglu1-mesa).');
        }
    }

    console.error('  On a headless Linux host the renderer needs a virtual display and software GL:');
    console.error('    xvfb-run -a yarn start');
    console.error('  and without a GPU also:');
    console.error('    LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe xvfb-run -a yarn start');
    console.error('  The Docker image handles all of this automatically (Xvfb in the entrypoint).');

    return false;
};

const fetchDefaultActions = async (actionsUrl) => {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(actionsUrl, { signal: controller.signal });

        clearTimeout(timer);

        if (response.status === 200) return await response.json();

        console.warn(`[pixinode] actions fetch returned HTTP ${ response.status } for ${ actionsUrl }`);
    } catch (error) {
        console.warn(`[pixinode] could not pre-fetch avatar actions (${ error?.message || error })`);
    }

    return null;
};

export class RendererPool {
    #renderAvatar = null;
    #initRenderer = null;
    #ready = false;
    #busy = false;
    #needsReinit = false;
    #queue = [];

    get ready() {
        return this.#ready;
    }

    async init() {
        if (!existsSync(BUNDLE)) {
            throw new Error(`Renderer bundle not found at ${ BUNDLE } — run:  npm run build`);
        }

        const config = buildRendererConfig();

        config['avatar.default.actions'] = await fetchDefaultActions(config['avatar.actions.url']);

        globalThis.NitroConfig = config;
        globalThis.__IMAGING_OPTS__ = { fps: CONFIG.animationFps, maxFrames: CONFIG.maxFrames, debug: CONFIG.debug };

        const module = await import(BUNDLE_URL);

        this.#initRenderer = module.initRenderer;
        this.#renderAvatar = module.renderAvatar;

        await this.#bootRenderer();

        this.#ready = true;
    }

    async #bootRenderer() {
        await Promise.race([
            this.#initRenderer(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('renderer boot timed out')), CONFIG.bootTimeoutMs))
        ]);
    }

    render(descriptor) {
        return new Promise((resolve, reject) => {
            if (this.#queue.length >= CONFIG.maxQueue) {
                const error = new Error('overloaded');

                error.code = 'OVERLOADED';

                return reject(error);
            }

            this.#queue.push({ descriptor, resolve, reject });
            this.#drain();
        });
    }

    async #drain() {
        if (this.#busy) return;

        const job = this.#queue.shift();

        if (!job) return;

        this.#busy = true;

        try {
            if (this.#needsReinit) {
                await this.#bootRenderer();
                this.#needsReinit = false;
            }

            job.resolve(await Promise.race([
                this.#renderAvatar(job.descriptor),
                new Promise((_, reject) => setTimeout(() => reject(new Error('render timed out')), CONFIG.renderTimeoutMs))
            ]));
        } catch (error) {
            if (error?.message === 'render timed out') this.#needsReinit = true;

            job.reject(error);
        } finally {
            this.#busy = false;
            this.#drain();
        }
    }

    async close() {
        this.#ready = false;
    }
}
