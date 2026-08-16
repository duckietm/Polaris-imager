# Self-contained build. The build context is THIS service directory (any name, any
# location — see docker-compose.yml). The builder clones the Nitro renderer it
# bundles against from its public repo, so no monorepo checkout, no sibling folder
# and no host build are needed. Override RENDERER_REPO / RENDERER_REF to build
# against a different renderer source or branch.

FROM node:20-bookworm AS builder

ARG RENDERER_REPO=https://github.com/duckietm/Nitro_Render_V3.git
ARG RENDERER_REF=main

RUN apt-get update && apt-get install -y --no-install-recommends \
      git build-essential python3 pkg-config \
      libcairo2-dev libpango1.0-dev libjpeg-dev libpng-dev libgif-dev librsvg2-dev \
      libgl1-mesa-dev libxi-dev libxext-dev libx11-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Both the renderer and this service pin yarn@4.18.0 via the packageManager
# field; corepack (bundled with node) provides that exact version.
RUN corepack enable

RUN git clone --depth 1 --branch "${RENDERER_REF}" "${RENDERER_REPO}" renderer \
 && cd renderer && yarn install

COPY package.json yarn.lock .yarnrc.yml ./service/
RUN cd service && yarn install --immutable

COPY . ./service
WORKDIR /build/service
ENV NITRO_RENDERER_PATH=/build/renderer
# focus --production drops the devDependencies (the build-only pixi/vite stack)
# from node_modules, the yarn-4 equivalent of `npm prune --omit=dev`.
RUN yarn build && yarn workspaces focus --all --production

FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
      libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
      libpixman-1-0 libfontconfig1 libfreetype6 \
      libgl1 libglx-mesa0 libgl1-mesa-dri libglu1-mesa \
      libxi6 libxext6 libx11-6 libxfixes3 libxrandr2 libxxf86vm1 \
      xvfb fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
# No GPU in the container: force Mesa's software rasterizer (llvmpipe) so
# headless-gl gets a real, working WebGL context instead of a dead one (the
# symptom is a null gl -> "Cannot read properties of null (reading
# 'getUniformLocation')" during renderer init).
ENV LIBGL_ALWAYS_SOFTWARE=1
ENV GALLIUM_DRIVER=llvmpipe

COPY --from=builder /build/service/package.json ./package.json
COPY --from=builder /build/service/node_modules ./node_modules
COPY --from=builder /build/service/src ./src
COPY --from=builder /build/service/dist-node ./dist-node

EXPOSE 8082
# Start a virtual X display for headless-gl, wait until it is actually accepting
# connections (its socket appears), then exec node so it becomes PID 1's child and
# receives SIGTERM for a clean shutdown. Inlined (no script file) to avoid any
# shebang/CRLF/permission pitfalls.
ENTRYPOINT ["/bin/sh", "-c", "Xvfb :99 -screen 0 1280x1024x24 -nolisten tcp >/tmp/xvfb.log 2>&1 & export DISPLAY=:99; i=0; while [ $i -lt 100 ] && [ ! -S /tmp/.X11-unix/X99 ]; do i=$((i+1)); sleep 0.1; done; if [ ! -S /tmp/.X11-unix/X99 ]; then echo '[entrypoint] Xvfb did not start; its output was:'; cat /tmp/xvfb.log; fi; exec node src/server.mjs"]
