# avatar-imaging-pixinode

Render Nitro avatars server-side with **`@pixi/node`** — a real WebGL context via
headless-gl, **no headless browser**. Same public API as the browser service in
[`../avatar-imaging`](../avatar-imaging), a fraction of the footprint.

The browser service is left completely untouched; this is a parallel engine.

It also ships a **browser panel** at `GET /Generate` — compose a figure with the
mouse, search players by username, copy the URL or download the PNG. See
[Browser panel](#browser-panel--get-generate).

## Status: working ✅

The full Nitro renderer runs in-process on `@pixi/node` with a real headless-gl
WebGL 1 context — no Chromium, no Playwright. Verified on a headless VPS:

- **Plain avatars** — pixel-correct.
- **Static effects** (e.g. `effect=110`) — correct compositing.
- **Animated effects with blend modes** (e.g. `effect=14`, the hoverboard) —
  16-frame APNG, additive glow (`ink: 33`) composited correctly.

Typical timing: ~350–470ms one-time renderer boot, then ~130–400ms per render.

## Why

`@pixi/node@8` targets pixi.js v8 (which the Nitro renderer uses) and runs the
**actual** renderer in-process. The render *logic* is the byte-for-byte browser
harness (`harness/boot-node.ts` is a copy of `../avatar-imaging/harness/boot.ts`);
only the boot/environment differs (`harness/node-env.ts`). No Chromium means RAM
drops from hundreds of MB per worker to tens, faster cold start, and a simpler
deploy — worthwhile at volume (e.g. ~10k renders/day).

## Prerequisites

- **Node 20+ (22 recommended on Linux; use Node 20 LTS on Windows — `gl`'s
  prebuilt binaries need it, see [Windows](#windows)).**
- **Native modules** — `@pixi/node@8` declares its natives as *peer* deps, so
  this package lists them explicitly: `canvas` (node-canvas `^3.2.0`) and `gl`
  (headless-gl `^8.1.6`). `yarn install` uses a prebuilt binary when one exists
  for your OS + Node version, and only compiles from source as a fallback.
  - **Debian/Ubuntu** (production target):
    ```
    sudo apt-get install -y build-essential python3 pkg-config \
      libcairo2-dev libpango1.0-dev libjpeg-dev libpng-dev libgif-dev librsvg2-dev \
      libgl1-mesa-dev libxi-dev libxext-dev libx11-dev \
      fonts-liberation xvfb
    ```
    `xvfb` gives headless-gl a virtual display — run every command under
    `xvfb-run -a` (see below). `fonts-liberation` is the speech-bubble font.
  - **Windows / macOS:** see [Windows](#windows) below (no `xvfb`; Arial is
    already installed for the bubble text). macOS: `brew install pkg-config cairo
    pango libpng jpeg giflib librsvg`.
  - (`pixi.js` comes from the linked renderer; `cross-fetch` / `@xmldom/xmldom`
    are shimmed at build time — see `harness/stubs/`.)
- **Speech-bubble font.** node-canvas has no bundled fonts, so `node-env.ts`
  registers a real `.ttf` as family "Arial" (`?text=` rendering). It auto-scans
  the standard Linux (Liberation/DejaVu), Windows (`C:\Windows\Fonts\arial.ttf`)
  and macOS Arial paths; set `AVATAR_IMAGING_FONT_FILE` for a specific file.
- The **Nitro renderer**: keep its checkout as a sibling directory
  (`../Nitro-Renderer`, picked up automatically) or set `NITRO_RENDERER_PATH`
  to the renderer directory. Run `yarn install` inside the renderer once.

## Setup

```
corepack enable                   # once per machine: provides the pinned yarn 4.18
yarn install                      # pulls @pixi/node (+ native gl/canvas), express, vite
cp .env.example .env              # point NITRO_GAMEDATA_URL / NITRO_ASSET_URL at your hotel
yarn build                        # bundles harness/boot-node.ts -> dist-node/boot-node.mjs
```

Instead of the sibling folder, you can point the build at the renderer from `.env` —
it is read by the Vite config, so there is no shell variable to re-export before
every build (which is easy to lose on Windows):

```env
NITRO_RENDERER_PATH=C:/dev/Nitro_Render_V3
```

## Docker (recommended for deployment)

Self-contained: the image compiles the native modules, fetches the Nitro renderer
from git and bundles it, then runs in a slim image with Xvfb + fonts baked in — no
host toolchain, no monorepo, no per-machine native build. This folder can live
**anywhere** on its own; the build context is the folder itself.

```
cp .env.example .env              # set NITRO_GAMEDATA_URL / NITRO_ASSET_URL etc. first
docker compose up -d --build
```

Then:

```
curl http://localhost:8082/health
curl 'http://localhost:8082/avatarimage?figure=hd-180-1.ch-255-66.lg-280-110.sh-305-62&effect=14&img_format=apng' -o out.png
```

Notes:
- **`.env` is required** — compose reads it via `env_file`. Copy `.env.example`
  first. It's gitignored, so hotel URLs / API keys stay out of the image and repo.
- The service listens on `AVATAR_IMAGING_PORT` (default 8082), published to the
  same host port.
- **Renderer source.** The build clones the renderer from its public repo
  `github.com/duckietm/Nitro_Render_V3` (branch `main`) and bundles it — you do NOT
  need the renderer checked out next to this folder. To build against a different
  fork/branch, set `RENDERER_REPO` / `RENDERER_REF`, e.g.
  `RENDERER_REF=Dev docker compose up -d --build`, or add them to `.env`.
- **Reaching your hotel gamedata:** the container uses the default bridge network,
  which can normally reach LAN hosts like `http://192.168.0.8`. If your gamedata
  host is only reachable from the host's own network namespace, add
  `network_mode: host` to the service (the `ports:` mapping is then ignored).
- **First build is slow** (clones + installs the renderer's deps, compiles
  `canvas`/`gl`); it's layer-cached afterwards. Rebuild with
  `docker compose up -d --build`.
- `docker compose logs -f` for output; `docker compose ps` shows `healthy` once
  the renderer has booted (the healthcheck polls `/health`).
- **Editing `src/` without rebuilding:** the server sources are not bundled —
  only the renderer engine in `dist-node/` is baked at build time. Start with
  the dev overlay and every save of a `src/` file (e.g. the `/Generate` page)
  restarts the server in-place, no image rebuild:
  ```
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
  ```
  Rebuild only when `package.json`/`yarn.lock` change (new dependencies) or the
  bundled renderer must change (`harness/`, the Vite config, `RENDERER_REF`).

## Windows

Windows works for development/testing (production is Linux). headless-gl uses the
GPU / ANGLE directly, so there is **no `xvfb`** — drop `xvfb-run` from every
command below.

1. **Use Node 20 LTS.** This matters: `gl` (headless-gl) only ships prebuilt
   Windows binaries for LTS lines, and Node 20 has the widest coverage, so
   `yarn install` downloads a ready `.node` and **compiles nothing**. Do NOT use
   Current/nightly (24, 26, …) — no prebuild exists for them, so the install falls back to
   a source build that needs Python + Visual Studio and usually fails. Install the
   "20.x LTS" build from [nodejs.org](https://nodejs.org), or with nvm-windows:
   ```
   nvm install 20
   nvm use 20
   node -v          :: must print v20.x
   ```
2. **Prepare the renderer** (Developer PowerShell, in the repo root):
   ```
   cd ..\Nitro-Renderer ; yarn install
   ```
   The build finds it as the sibling folder automatically (or set
   `NITRO_RENDERER_PATH` to the renderer folder).
3. **Install, configure, build:**
   ```
   corepack enable
   yarn install
   copy .env.example .env      :: then edit NITRO_GAMEDATA_URL / NITRO_ASSET_URL
   yarn build
   ```
   On Node 20 this pulls prebuilt `canvas` + `gl` binaries — no compiler needed.
4. **Run** (no `xvfb`):
   ```
   yarn start
   :: or a one-shot render:
   node render.mjs --figure=hd-180-1.ch-255-66.lg-280-110.sh-305-62 --out=out\plain.png
   ```
5. **Fonts:** Windows ships Arial, so bubble text (`?text=`) works out of the box
   in real Arial — nothing to install.

### Windows troubleshooting

- **`prebuild-install ... No prebuilt binaries found (target=26.x ... platform=win32)`
  then `gyp ERR! find Python ... Could not find any Python`.** You're on a Node
  version with no `gl`/`canvas` prebuild, so it tried to compile from source.
  **Fix: switch to Node 20 LTS**, delete `node_modules`, reinstall:
  ```
  nvm use 20
  rmdir /s /q node_modules
  yarn install
  ```
- **Only if you must build from source** (staying on a non-LTS Node): install
  **Python 3.12 from python.org** (tick *"Add python.exe to PATH"* — a Microsoft
  Store Python or a broken install shows up as `find Python ... version is ""`),
  and **Visual Studio Build Tools** with *"Desktop development with C++"*, then
  set the `npm_config_python` environment variable to your python.exe and reinstall. node-canvas from
  source may also want the GTK bundle — see the
  [node-canvas Windows wiki](https://github.com/Automattic/node-canvas/wiki/Installation:-Windows).
  Node 20 + prebuilds avoids all of this.
- **`Nitro renderer not found at …\Nitro-Renderer`.** `NITRO_RENDERER_PATH` is
  unset or wrong. Put it in `.env` (uncommented, absolute) pointing at the folder
  that contains the renderer's `index.ts` — note that a GitHub ZIP extracts to
  `Nitro_Render_V3-main`, and sometimes nests that folder twice.
- **`failed to start renderer: Only URLs with a scheme in: file, data, and node
  are supported … Received protocol 'c:'`.** Fixed: the bundle is now loaded
  through `pathToFileURL()`. If you still see it, `src/renderer.mjs` is an older
  copy.

## Run — HTTP service

Same contract as the browser service (`GET /avatarimage`, `/health`, `/`):

```
xvfb-run -a yarn start            # boots the renderer once, listens on :8082 (AVATAR_IMAGING_PORT)
# then:
curl 'http://localhost:8082/avatarimage?figure=hd-180-1.ch-255-66.lg-280-110.sh-305-62&effect=14&img_format=apng' -o out.png
```

`yarn serve` does `build` + `start`. The renderer is initialized **once** and
reused across requests. Because there is a single WebGL context, renders are
**serialized** (one at a time) with a bounded queue that sheds load with `503`
past `AVATAR_IMAGING_MAX_QUEUE`. A per-request response cache + ETags mean repeat
requests never reach the renderer. All `AVATAR_IMAGING_*` knobs (port, cache,
rate limit, API keys, CORS, proxy/real-IP, access log) are in `.env.example` and
match the browser service's names.

### Browser panel — `GET /Generate`

A self-contained page to compose a figure and copy or download the resulting
image. Served by the same process — no PHP, no CMS, no external asset, no web
font — so it also works on a LAN with no internet access. Enabled by default;
Express routing is case-insensitive, so `/generate` reaches it too.

```
http://localhost:8082/Generate
```

What it does:

- Live preview that updates as you tweak
- 8-way body and head direction pickers, each cell rendering the actual avatar
- Actions (walk, sit, lay, wave, drink, carry), gestures, size, head-only
- Effects, dances, speech bubble with colours, PNG/APNG, animation frame
- Copy the image URL · copy a ready `<img>` tag · copy a link to this exact
  setup · download the PNG
- Optional username search with live suggestions
- `/Generate?figure=…&effect=14` opens pre-configured, and the address bar keeps
  the current settings so a link is shareable

There is no "save to media library": this service has no library. Copy the URL
or download the file, then add it wherever you like.

```env
AVATAR_IMAGING_GENERATE_UI=1                 # 0 => serve only the raw API
AVATAR_IMAGING_GENERATE_PATH=/Generate
AVATAR_IMAGING_GENERATE_TITLE=Avatar Studio
AVATAR_IMAGING_PUBLIC_URL=                   # empty => same-origin relative URLs
AVATAR_IMAGING_DEFAULT_FIGURE=               # empty => a built-in default outfit
AVATAR_IMAGING_RATELIMIT_MAX=600             # see below
```

**Rate limit.** One preview refresh requests ~17 images (the avatar plus 16
direction thumbnails), so the default of 120/min runs out within seconds. Set
`AVATAR_IMAGING_RATELIMIT_MAX=600`; the service warns at startup when it is too
low. The panel itself has a separate bucket, so browsing it cannot starve the
image API.

**Behind a proxy.** `AVATAR_IMAGING_PUBLIC_URL` only affects which host is
written into the URLs the panel shows and copies. Left empty, the panel requests
images relatively (never a CORS or mixed-content problem) and displays them
against the address you are browsing from, so a copied URL is always complete
and usable. Set it to the public address — `https://avatar.your-hotel.example` —
when the panel runs somewhere other than where the images are served from, or
when you want copied URLs to carry the production domain regardless of where you
opened the panel.

#### Username search — three modes

| Mode | Settings | Panel behaviour |
| --- | --- | --- |
| **Off** (default) | `AVATAR_IMAGING_DB_ENABLED=false`, no lookup URL | No database connection is ever opened. The username field is not rendered at all; the panel is a pure creation tool. |
| **Database** | `AVATAR_IMAGING_DB_ENABLED=true` + credentials | Load button **and** live suggestions: type two letters and matching players appear with their real heads. |
| **HTTP link** | `AVATAR_IMAGING_LOOKUP_URL=…` | Load button only (suggestions need the database). |

```env
AVATAR_IMAGING_DB_ENABLED=false
AVATAR_IMAGING_DB_HOST=127.0.0.1
AVATAR_IMAGING_DB_PORT=3306
AVATAR_IMAGING_DB_NAME=habbo
AVATAR_IMAGING_DB_USER=
AVATAR_IMAGING_DB_PASSWORD=
# only if your emulator's schema differs (Polaris/Arcturus: users.look)
# AVATAR_IMAGING_DB_TABLE=users
# AVATAR_IMAGING_DB_USERNAME_COLUMN=username
# AVATAR_IMAGING_DB_LOOK_COLUMN=look
```

The switch must be `true` **and** the user/database name filled in; credentials
present with the switch off are reported at startup. Only `SELECT` is ever
issued, so a read-only account is enough:

```sql
CREATE USER 'avatar_reader'@'127.0.0.1' IDENTIFIED BY 'secret';
GRANT SELECT (username, look) ON habbo.users TO 'avatar_reader'@'127.0.0.1';
```

If you would rather not give the imager a MySQL account, keep the database off
and point it at any URL of yours that answers with the figure as JSON —
`{"figure":"…"}`, `{"look":"…"}` and `{"data":{"look":"…"}}` are all accepted:

```env
AVATAR_IMAGING_LOOKUP_URL=https://your-hotel.example/api/look?username=%username%
AVATAR_IMAGING_LOOKUP_HEADER=X-API-Key
AVATAR_IMAGING_LOOKUP_KEY=
```

#### Access control — three modes

The panel is public by default, like the rest of the service.

**Shared-secret URL.** Simplest for one operator: the panel answers only on
`/Generate?token=…` and 404s everywhere else.

```env
AVATAR_IMAGING_GENERATE_TOKEN=a-long-secret
```

**Login form, shared account.** No database involved, no player account exposed,
works even if MySQL is down. Leave the user empty for a password-only form.

```env
AVATAR_IMAGING_GENERATE_AUTH=true
AVATAR_IMAGING_GENERATE_AUTH_MODE=password
AVATAR_IMAGING_GENERATE_USER=admin
AVATAR_IMAGING_GENERATE_PASSWORD=a-solid-password
AVATAR_IMAGING_GENERATE_SECRET=a-long-random-string
```

**Login form, hotel account.** Sign in with a real hotel account above a minimum
rank. Requires the database, and reads two more columns. The stored hash format
is auto-detected: bcrypt (`$2y$`/`$2a$`/`$2b$`, what modern CMSes write) or a
bare MD5/SHA1/SHA256/SHA512 digest from older ones.

```env
AVATAR_IMAGING_GENERATE_AUTH=true
AVATAR_IMAGING_GENERATE_AUTH_MODE=hotel
AVATAR_IMAGING_GENERATE_MIN_RANK=6
AVATAR_IMAGING_GENERATE_SECRET=a-long-random-string
AVATAR_IMAGING_DB_ENABLED=true               # mandatory in this mode
# AVATAR_IMAGING_DB_PASSWORD_COLUMN=password
# AVATAR_IMAGING_DB_RANK_COLUMN=rank
```

```sql
GRANT SELECT (username, look, password, `rank`) ON habbo.users TO 'avatar_reader'@'127.0.0.1';
```

Those two columns are never selected in any other mode.

Notes on both login modes: the session is a signed cookie (HMAC, `HttpOnly`,
`SameSite=Lax`, `Secure` behind HTTPS) with a 12h lifetime. Without
`AVATAR_IMAGING_GENERATE_SECRET` a random secret is drawn at boot, which logs
everyone out on restart. After 8 failed attempts an IP is locked out for 15
minutes (`_MAX_ATTEMPTS` / `_LOCK_MS`). A missing account and a wrong password
return the same message, so the form never reveals which usernames exist. And a
login gate that cannot possibly work — mode `hotel` without a database, or mode
`password` with no password — **fails closed**: the panel answers `503` with the
reason instead of silently reverting to public.

If you only set `AVATAR_IMAGING_API_KEYS`, the panel's own image requests need a
key too; give it a dedicated one via `AVATAR_IMAGING_GENERATE_KEY` (it is
visible in the page's HTML, so never an admin key).

### Scene composer — `GET /Generate/scene`

A layer-based composer opened from the **Create a scene** button in the panel
header. A layer is an avatar, an image or a line of text; a single avatar on a
transparent background is simply a one-layer scene.

Drag layers on the canvas, reorder them front/back, scale, set opacity, and give
each character its own direction, action, gesture, effect and speech bubble —
bubbles are the emulator's own, rendered by `/avatarimage`. Facing left is a
matter of body/head direction rather than a mirror, so the bubble text always
stays readable. The background is transparent, a solid colour or an image, with cover / contain /
stretch / tile plus an X-Y offset and a zoom — drag it straight on the canvas, or
type the values. **Smooth imported images** (on by default) is what keeps a large
background from turning into moiré once it is scaled down; avatars are always
drawn nearest-neighbour regardless, so pixel art never blurs. The panel has the same idea in miniature: `bg_color` flattens a
single avatar onto a colour rather than leaving it transparent.

Two ways out:

- **Download PNG** — composed in the browser, nothing hits the server.
- **Scene URL** — `GET /scene?s=<encoded scene>` renders the whole thing
  server-side and returns one PNG, so it can be embedded in an article with a
  plain `<img>` tag. Cached and ETagged like `/avatarimage`.

**Animate the scene** composes an APNG instead: every avatar layer is rendered
with all its frames, and the timeline runs for the lowest common multiple of the
layer frame counts (capped at `AVATAR_IMAGING_MAX_FRAMES`), so a three-frame wave
and a four-frame dance stay in step instead of drifting apart. Animated scenes
are produced by the server, so the download comes from `/scene` rather than from
the browser canvas — locally imported images are left out of it.

```env
AVATAR_IMAGING_SCENE=1
AVATAR_IMAGING_SCENE_MAX_LAYERS=24
AVATAR_IMAGING_SCENE_MAX_SIZE=2000
AVATAR_IMAGING_SCENE_IMAGE_HOSTS=cdn.your-hotel.example,your-hotel.example
```

Image layers and backgrounds go through an allow-list, because the **server**
fetches those URLs when rendering `/scene` — without one it would be an open
proxy into your network. The hosts of `NITRO_GAMEDATA_URL`, `NITRO_ASSET_URL`
and `AVATAR_IMAGING_PUBLIC_URL` are trusted automatically, so your own CDN
generally works with nothing set; `AVATAR_IMAGING_SCENE_IMAGE_HOSTS` adds more.
Subdomains of a listed host are allowed.

Set `AVATAR_IMAGING_SCENE_IMAGE_HOSTS=*` to lift the restriction entirely — only
sensible on a trusted network, since the server then fetches any URL a scene
asks for. The allowed hosts are printed at startup.

For a one-off background there is also **Import from my computer**: the file
becomes a data URL, so it shows in the preview and in the PNG download without
touching the allow-list. It cannot ride along in the scene URL — the server never
receives it — and the editor says so.

The browser side loads remote images through `GET /Generate/image?u=…`, a proxy
guarded by the same allow-list. That keeps the editor's canvas same-origin, so
the **PNG export includes the background** instead of silently dropping it to a
CORS taint. A blocked host is reported in the editor as soon as the URL is typed,
rather than at export time.

### Chat bubble styles

`bubble=<id>` swaps the engine's speech bubble for one of the Habbo sprites in
`bubbles/`, in the panel and on scene avatars alike:

```
/avatarimage?figure=hd-180-1.ch-255-66&text=Hello!&bubble=23
```

The sprite is a fixed template, so it is three-sliced: everything left of the
message area is kept, the message column is repeated to fit the text, and the
rounded end is drawn last. Where the message area starts is detected once per
sprite by walking in from the right until the flat fill colour changes, which is
also where the text is placed. Pointers and end decorations are matched from the
filenames (`bubble_2_31_pointer.png` serves both 2 and 31).

With a style selected the avatar is rendered *without* a bubble and the sprite is
composited above it, frame by frame, so an animated avatar keeps its animation.
The bubble colour picker is replaced by the style picker plus a live preview
rendered by `GET /Generate/bubble.png?id=…&text=…`. Set
`AVATAR_IMAGING_CHAT_BUBBLES=0` to hide the feature and keep the engine bubble.

### Habbo typefaces (scene only)

Text layers can be set to a pixel typeface instead of a plain system font. The
sheets live in `fonts/` with a `fonts.json` manifest listing name and file — drop
a new sheet in and it is picked up on the next start.

Each sheet is a single horizontal strip of a–z. On first use the service scans it
column by column to find the glyphs, glues back one-pixel slivers, and discards
runs whose width is wildly off the median (border strips, a logo tacked on after
the alphabet). Sheets whose letters physically touch cannot be sliced apart and
are skipped with a warning at startup rather than rendered as garbage — five of
the sixteen shipped sheets fall in that group. Sheets with an opaque backdrop are
colour-keyed once and served transparent, so the same pixels reach the browser
and the server.

The layout routine is written once in `src/font-layout.mjs` and injected into the
editor page, so the live preview, the browser PNG export and the `/scene` render
place every glyph identically. Typefaces are their own colours, so the colour
picker is replaced by letter spacing when one is selected.

Set `AVATAR_IMAGING_HABBO_FONTS=0` to hide the feature. It exists only in the
scene composer, never in the plain panel.

### Wardrobe

Both the panel and the scene composer have a **Change clothes** button that opens
a visual catalogue built from your own `FigureData.json`: categories down the
side, one rendered thumbnail per item, gender and HC filters, and the palette of
the selected piece as clickable swatches. Thumbnails load lazily as you scroll.

Since browsing renders one image per item, keep `AVATAR_IMAGING_RATELIMIT_MAX`
generous (600+). Set `AVATAR_IMAGING_WARDROBE=0` to hide the feature.

### Query parameters

`figure` (required) · `action=wlk,wav,drk=1` · `gesture=std|agr|sad|sml|srp` ·
`direction=0-7` · `head_direction=0-7` · `headonly=0|1` · `dance=0-4` ·
`effect=N` · `size=s|n|l` · `frame_num=N` · `img_format=png|apng|auto` ·
`text=` `text_color=` `bubble_color=` · `bg_color=` (hex, flattens the avatar onto
a solid colour instead of leaving it transparent; works on APNG too)

## Run — one-shot CLI

```
xvfb-run -a node render.mjs --figure=hd-180-1.ch-255-66.lg-280-110.sh-305-62 --out=out/plain.png
xvfb-run -a node render.mjs --figure=<fig> --effect=14 --format=apng --out=out/effect.png
```

CLI flags: `--figure=` (required) · `--effect=N` · `--direction=0-7` ·
`--head_direction=` · `--action=std|wlk|sit|lay|wav` · `--gesture=sml|sad|agr|srp` ·
`--dance=1-4` · `--headonly` · `--scale=h|sh` · `--format=auto|png|apng` ·
`--post-scale=N` · `--text=` `--text-color=` `--bubble-color=` · `--debug` ·
`--out=path.png`

## Comparing against the browser service

Render the **same** figure from both and diff:

```
# browser service (in ../avatar-imaging, running on :8081):
curl 'http://localhost:8081/avatarimage?figure=<fig>&effect=14&img_format=apng' -o browser.png
# this service (:8082):
curl 'http://localhost:8082/avatarimage?figure=<fig>&effect=14&img_format=apng' -o pixinode.png
```

The one known subtlety is **premultiplied alpha**: this engine decodes `.nitro`
PNGs by drawing them onto a node-canvas 2D context (`node-env.ts`'s
`createImageBitmap` shim), which doesn't premultiply the way a browser's
`createImageBitmap` does. Plain avatars are unaffected; if a heavy-alpha effect
shows edge differences, that's the place to look.

## How the headless boot works (`harness/node-env.ts`)

Loaded first by `boot-node.ts`. It:

1. Imports `@pixi/node` (registers the Node adapter) and **asserts + locks** it
   onto the renderer's `DOMAdapter` — pixi's `browserAll` otherwise installs the
   BrowserAdapter at import and the renderer would build its canvas from the fake
   `document` (null WebGL context).
2. Primes pixi's memoized `isWebGLSupported()` under the Node adapter.
3. Shims minimal `window`/`document`/`navigator`/`location`, and
   `createImageBitmap` (node-canvas `loadImage`) so Nitro's `StaticImageDecoder`
   can decode the `.nitro` PNGs.

Plus, in `boot-node.ts`/`vite.node.config.mjs`: `preferWebGLVersion: 1` (headless
canvas only serves WebGL 1), `skipExtensionImports: true`, and
`inlineDynamicImports` so the SSR bundle is a single file with exactly one pixi
instance.

## Redistributing a prebuilt copy

The expensive part of this project is the build: cloning the Nitro renderer and
bundling it with Vite. Do it once, then ship the result.

```
yarn build        # -> dist-node/boot-node.mjs
yarn run pack     # -> release/<name>-<version>.tar.gz  (run, not bare: yarn's own pack would shadow it)
```

The archive holds `dist-node/`, `src/`, a `package.json` cut down to the runtime
dependencies, a simplified `Dockerfile` + `docker-compose.yml` that skip the git
clone and Vite entirely, `.env.example` and an `INSTALL.md`. Recipients run:

```
cp .env.example .env
docker compose up -d --build      # or: yarn workspaces focus --all --production && xvfb-run -a yarn start
```

No renderer checkout, no Vite, no `yarn link` on their side. Only `canvas` and
`gl` still install (prebuilt binaries on Node 20 LTS) — unavoidable, they are
native modules; publishing the Docker image removes even that. Your `.env` is
never included, so gamedata URLs, database credentials and panel passwords do
not travel with the archive.

## Scaling

This service runs **one** renderer and serializes renders — ample for ~10k/day
(one render ≈ 130–400ms → hundreds of thousands/day of headroom). For higher
burst concurrency, the natural next step is a `worker_threads` / process pool
(each worker its own renderer + GL context, like the browser service's page
pool), fronted by the same queue. Not needed yet, so not built.

## Further documentation

- **[DEMARRAGE.md](DEMARRAGE.md)** — start-to-finish setup guide (French, with an
  English summary): the three username-search modes, the three access modes,
  Nginx, systemd, redistribution.
- **[TUTO-WINDOWS-XAMPP.md](TUTO-WINDOWS-XAMPP.md)** — step-by-step Windows +
  XAMPP localhost walkthrough (French), including a Windows troubleshooting
  table.
