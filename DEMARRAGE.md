# DÉMARRAGE — Avatar Studio

*(English version at the bottom / version anglaise en bas)*

Tu obtiens **deux choses** avec ce service :

| Adresse | À quoi ça sert |
| --- | --- |
| `https://avatar.mon-hotel.fr/avatarimage?figure=…` | L'image de l'avatar. C'est ce que tu mets dans un `<img>`, dans ton CMS, sur ton forum. Ça marchait déjà, rien n'a changé. |
| `https://avatar.mon-hotel.fr/Generate` | **Nouveau.** Le mini-panel : tu composes un avatar à la souris, tu cherches un joueur par pseudo, tu copies l'URL ou tu télécharges le PNG. |

---

## 1. Installer (une seule fois)

```bash
# Debian / Ubuntu — les bibliothèques dont ont besoin canvas + gl
sudo apt-get install -y build-essential python3 pkg-config \
  libcairo2-dev libpango1.0-dev libjpeg-dev libpng-dev libgif-dev librsvg2-dev \
  libgl1-mesa-dev libxi-dev libxext-dev libx11-dev fonts-liberation xvfb

cd /chemin/vers/polaris-imager
corepack enable
yarn install
```

## 2. Configurer

```bash
cp .env.example .env
nano .env
```

**Le strict minimum** (le reste peut rester tel quel) :

```env
# Où ton hôtel sert le gamedata et les .nitro
NITRO_GAMEDATA_URL=https://bobba-hotel.fr/client/gamedata
NITRO_ASSET_URL=https://bobba-hotel.fr/client/nitro/bundled

# Le panel charge ~17 images par aperçu : sans ça tu prends des erreurs 429
AVATAR_IMAGING_RATELIMIT_MAX=600
```

### La recherche par pseudo — 3 modes au choix

**Mode 1 — rien (défaut).** Le service ne se connecte à aucune base, le champ pseudo n'apparaît pas du tout, et le panel sert uniquement à **créer** des avatars à la main. C'est le comportement par défaut, tu n'as rien à faire.

```env
AVATAR_IMAGING_DB_ENABLED=false
```

**Mode 2 — base de données.** Bouton « Charger » **+ suggestions pendant la frappe** (tu tapes 2 lettres, tu vois les pseudos avec leur vraie tête).

```env
AVATAR_IMAGING_DB_ENABLED=true
AVATAR_IMAGING_DB_HOST=127.0.0.1
AVATAR_IMAGING_DB_PORT=3306
AVATAR_IMAGING_DB_NAME=habbo
AVATAR_IMAGING_DB_USER=avatar_reader
AVATAR_IMAGING_DB_PASSWORD=ton-mot-de-passe
```

> `AVATAR_IMAGING_DB_ENABLED` doit être à `true` **et** l'utilisateur/la base renseignés. Si tu remplis les identifiants en oubliant l'interrupteur, le service te le dit au démarrage.
>
> Le service ne fait **que des SELECT** sur `users.username` et `users.look`. Crée-lui un compte MySQL en lecture seule :
> ```sql
> CREATE USER 'avatar_reader'@'127.0.0.1' IDENTIFIED BY 'ton-mot-de-passe';
> GRANT SELECT (username, look) ON habbo.users TO 'avatar_reader'@'127.0.0.1';
> ```

**Mode 3 — lien vers un serveur.** Si tu préfères ne pas donner d'accès MySQL à l'imager, laisse la base à `false` et donne-lui une URL de ton site :

```env
AVATAR_IMAGING_DB_ENABLED=false
AVATAR_IMAGING_LOOKUP_URL=https://bobba-hotel.fr/api/look?username=%username%
AVATAR_IMAGING_LOOKUP_HEADER=X-API-Key
AVATAR_IMAGING_LOOKUP_KEY=un-secret
```

Ton URL doit juste répondre du JSON contenant la figure. Toutes ces formes sont acceptées :

```json
{"figure": "hd-180-1.ch-255-66.lg-280-110"}
{"look": "hd-180-1.ch-255-66.lg-280-110"}
{"data": {"look": "hd-180-1.ch-255-66.lg-280-110"}}
```

Tu l'écris dans le langage que tu veux — c'est un simple `SELECT look FROM users WHERE username = ?` renvoyé en JSON. Ce mode donne le bouton « Charger » mais pas les suggestions en direct (elles nécessitent la base).

### Protéger le panel — 3 modes au choix

Par défaut le panel est public, comme l'API. Deux façons de le fermer :

**Mode A — mot de passe dans le `.env`** (indépendant de la base) :

```env
AVATAR_IMAGING_GENERATE_AUTH=true
AVATAR_IMAGING_GENERATE_AUTH_MODE=password
AVATAR_IMAGING_GENERATE_USER=valou
AVATAR_IMAGING_GENERATE_PASSWORD=un-mot-de-passe-solide
AVATAR_IMAGING_GENERATE_SECRET=une-longue-chaine-aleatoire
```

Aucun compte joueur n'est en jeu, et ça marche même si MySQL est à l'arrêt. Laisse `_USER` vide pour un formulaire mot de passe seul.

**Mode B — compte de l'hôtel + rang minimum** (comme `media.php` qui vérifiait `rank >= 6`) :

```env
AVATAR_IMAGING_GENERATE_AUTH=true
AVATAR_IMAGING_GENERATE_AUTH_MODE=hotel
AVATAR_IMAGING_GENERATE_MIN_RANK=6
AVATAR_IMAGING_GENERATE_SECRET=une-longue-chaine-aleatoire

AVATAR_IMAGING_DB_ENABLED=true      # obligatoire dans ce mode
```

Tu te connectes avec ton pseudo et ton mot de passe de l'hôtel. Le service détecte tout seul le format du hash stocké : bcrypt (`$2y$`/`$2a$`/`$2b$`, ce qu'utilisent les CMS modernes) ou un condensé MD5/SHA1/SHA256/SHA512 des vieux CMS.

> Ce mode a besoin de lire deux colonnes de plus. Le droit MySQL devient :
> ```sql
> GRANT SELECT (username, look, password, `rank`) ON habbo.users TO 'avatar_reader'@'127.0.0.1';
> ```
> Après 8 échecs depuis la même IP, elle est bloquée 15 min (réglable). Un compte au rang insuffisant reçoit un message clair ; un pseudo inexistant et un mauvais mot de passe donnent le même message, pour ne pas révéler quels pseudos existent.

**Mode C — lien secret**, si tu es seul et que tu veux le plus simple : laisse `AUTH=false` et mets `AVATAR_IMAGING_GENERATE_TOKEN=un-secret`. Le panel ne répond alors que sur `/Generate?token=un-secret` et renvoie 404 partout ailleurs.

> Si tu actives le portail avec une configuration impossible (mode `hotel` sans base, ou mode `password` sans mot de passe), le panel se **ferme** et répond 503 avec la raison — il ne redevient jamais public en silence. Le service te le dit aussi au démarrage.

## 3. Lancer

```bash
xvfb-run -a yarn start     # Linux
yarn start                 # Windows / macOS (pas de xvfb)
```

Au démarrage tu dois lire :

```
[pixinode] gamedata OK  200       avatar.figuredata.url -> …
[pixinode] assets   OK  200       avatar.asset.url      -> …
[pixinode] database OK  avatar_reader@127.0.0.1:3306/habbo
[pixinode] listening on http://0.0.0.0:8082
[pixinode] generator panel on http://0.0.0.0:8082/Generate
[pixinode] panel access: login form (hotel, rank >= 6)
[pixinode] ready (headless WebGL, serialized renders).
```

Si une ligne dit `ERR`, elle te dit quoi corriger dans le `.env`.

## 4. Vérifier

- Image : `http://TON-IP:8082/avatarimage?figure=hd-180-1.ch-255-66.lg-280-110`
- Panel : `http://TON-IP:8082/Generate`
- Santé : `http://TON-IP:8082/health`

## 5. Mettre en ligne (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name avatar.bobba-hotel.fr;

    location / {
        proxy_pass         http://127.0.0.1:8082;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

```env
AVATAR_IMAGING_TRUST_PROXY=true
AVATAR_IMAGING_CLIENT_IP_HEADER=cf-connecting-ip   # ou x-forwarded-for sans Cloudflare
```

Laisse `AVATAR_IMAGING_PUBLIC_URL` vide : le panel utilise des URLs relatives, donc tout reste sur le même domaine — jamais de souci de CORS ni de contenu mixte.

### Service systemd (facultatif)

```ini
[Unit]
Description=Avatar imager
After=network.target mariadb.service

[Service]
WorkingDirectory=/var/www/polaris-imager
ExecStart=/usr/bin/xvfb-run -a /usr/bin/node src/server.mjs
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

---

## Redistribuer sans que les gens aient à builder

Le coût de ce projet, c'est la compilation : cloner `duckietm/Nitro_Render_V3` et le bundler avec Vite. Tu le fais **une fois**, puis tu livres le résultat.

```bash
yarn build        # -> dist-node/boot-node.mjs (le moteur Nitro bundlé)
yarn run pack     # -> release/avatar-imaging-pixinode-0.1.0.tar.gz
```

L'archive contient `dist-node/` déjà compilé, `src/`, un `package.json` réduit aux dépendances d'exécution, un `Dockerfile` + `docker-compose.yml` simplifiés, `.env.example` et un `INSTALL.md`. Celui qui la reçoit fait juste :

```bash
cp .env.example .env
docker compose up -d --build      # ou : yarn workspaces focus --all --production && xvfb-run -a yarn start
```

Pas de clone du moteur, pas de Vite, pas de `yarn link`. Seuls `canvas` et `gl` s'installent encore (binaires précompilés sur Node 20 LTS) — incontournable, ce sont des modules natifs. Pour supprimer même ça, pousse l'image Docker : ils n'auront plus qu'un `docker run`.

⚠️ Ton `.env` n'est **pas** inclus dans l'archive : tes URLs de gamedata, ton mot de passe MySQL et ton mot de passe de panel ne partent pas avec.

---

## Ce que fait le panel

- Aperçu en direct pendant que tu règles
- Directions du corps et de la tête (8 positions, chacune montre le vrai avatar)
- Actions (marche, assis, allongé, salue, boit, tient), expressions, taille, tête seule
- Effets, danses, bulle de texte avec couleurs, format PNG/APNG, image d'animation
- Recherche par pseudo avec suggestions (si la base est configurée)
- Copier l'URL · copier la balise `<img>` · copier le lien du réglage · télécharger le PNG
- `/Generate?figure=…&effect=14` s'ouvre directement pré-réglé

Le bouton « enregistrer dans la médiathèque » de `media.php` n'existe pas ici : ce service n'a pas de médiathèque. Tu copies l'URL ou tu télécharges le PNG, puis tu l'ajoutes où tu veux depuis ton CMS.

Le projet est **100 % Node.js** : aucun fichier PHP, aucune dépendance à un CMS. Le `media.php` que tu m'as donné n'a servi que de modèle.

---

## Fichiers ajoutés

| Fichier | Rôle |
| --- | --- |
| `src/generate-page.mjs` | Le panel (HTML + CSS + JS en une seule réponse, aucune ressource externe) |
| `src/generate-route.mjs` | Les routes `/Generate`, `/look`, `/search`, `/login`, `/logout` |
| `src/generate-auth.mjs` | Le portail de connexion optionnel : modes `password` et `hotel`, cookie signé, anti-force brute |
| `src/db.mjs` | L'accès MySQL optionnel en lecture seule |
| `src/config.mjs` | Blocs `CONFIG.generate` et `CONFIG.db` |
| `src/server.mjs` | Montage du panel, vérification de la base au démarrage, logs |
| `.env.example` | Toutes les variables ci-dessus |
| `scripts/pack-release.mjs` | L'empaquetage `yarn run pack` |

Tout ce qui a été ajouté est commenté en anglais **et** en français, préfixé `[EN]` / `[FR]`. Aucun fichier existant n'a été supprimé : `/avatarimage`, `/health`, `/` et le CLI `render.mjs` se comportent exactement comme avant.

---

# ENGLISH — quick start

Same service, two entry points: `GET /avatarimage?figure=…` returns the image (unchanged), `GET /Generate` is the new panel.

1. **Install** — `apt-get install` the cairo/GL/xvfb packages listed above, then `corepack enable && yarn install`.
2. **Configure** — `cp .env.example .env`, set `NITRO_GAMEDATA_URL` / `NITRO_ASSET_URL` and `AVATAR_IMAGING_RATELIMIT_MAX=600`.
   - Username search, three modes: **off** (`AVATAR_IMAGING_DB_ENABLED=false`, the default — no database connection at all, the panel only creates avatars); **database** (`=true` plus a **read-only** MySQL account — the service only ever runs `SELECT` on `users.username` / `users.look`; gives the load button *and* live suggestions); **HTTP link** (`AVATAR_IMAGING_LOOKUP_URL` pointing at any URL of yours returning `{"figure":"…"}` — gives the load button only).
   - Private panel, three modes: `AUTH_MODE=password` (a shared account in `.env`, no database involved); `AUTH_MODE=hotel` (sign in with a real hotel account above a minimum rank — needs `DB_ENABLED=true`, and reads the password/rank columns; bcrypt and MD5/SHA hashes are both detected); or `AVATAR_IMAGING_GENERATE_TOKEN=…` for a shared-secret URL. A login gate that cannot work fails closed with a 503 rather than falling back to public.
3. **Run** — `xvfb-run -a yarn start` (no `xvfb` on Windows/macOS). The startup log tells you whether gamedata, assets and the database are reachable.
4. **Check** — `/avatarimage?figure=hd-180-1.ch-255-66.lg-280-110`, `/Generate`, `/health`.
5. **Redistribute** — `yarn build` once, then `yarn run pack` produces a tarball whose recipients only need `docker compose up -d --build` (or `yarn workspaces focus --all --production && yarn start`). No renderer clone, no Vite. Your `.env` is never included.
