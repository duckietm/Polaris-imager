const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const js = (value) => JSON.stringify(value ?? null).replace(/</g, '\\u003c');

export const renderLandingPage = ({
    title = 'Avatar Studio',
    hotelUrl = '',
    hotelName = '',
    mascot = '',
    generatePath = '',
    scenePath = '',
    apiText = ''
} = {}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${ esc(title) }</title>
<style>
:root{
  --bg:#ffffff; --panel:#ffffff; --line:#e2ebf4; --text:#16212f; --muted:#69798e;
  --sky:#2f9bf0; --sky-dark:#1a7fd0; --sky-soft:#e8f4fe;
  --mono:ui-monospace,"SFMono-Regular","JetBrains Mono",Menlo,Consolas,monospace;
  --body:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%}
body{background:var(--bg); color:var(--text); font-family:var(--body); font-size:15px; line-height:1.55;
  -webkit-font-smoothing:antialiased; display:flex; flex-direction:column; min-height:100%}
a{color:var(--sky-dark)}
.top{display:flex; justify-content:flex-end; padding:16px 22px}
.langSel{background:#fff; color:var(--text); border:1px solid #d9e4ef; border-radius:9px;
  padding:7px 30px 7px 11px; font-size:12.5px; font-family:var(--body); appearance:none; cursor:pointer;
  background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),
    linear-gradient(135deg,var(--muted) 50%,transparent 50%);
  background-position:calc(100% - 16px) 50%,calc(100% - 11px) 50%;
  background-size:5px 5px,5px 5px; background-repeat:no-repeat}
.langSel:hover{border-color:var(--sky)}
main{flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center; padding:10px 22px 50px}
.mascot{width:292px; max-width:80%; height:auto; image-rendering:pixelated; margin-bottom:10px}
h1{font-size:20px; margin:0 0 10px; font-weight:700}
p.say{max-width:560px; margin:0 auto 28px; color:var(--muted); font-size:15.5px}
.btn{display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;
  border:1px solid #d9e4ef; background:#fff; color:var(--text); border-radius:10px; padding:11px 18px;
  font-size:14px; font-weight:600; font-family:var(--body); text-decoration:none;
  transition:border-color .15s, background .15s, color .15s}
.btn:hover{border-color:var(--sky); color:var(--sky-dark); background:var(--sky-soft)}
.btn-primary{background:var(--sky); border-color:var(--sky); color:#fff; font-weight:700;
  padding:14px 26px; font-size:15.5px; border-radius:12px}
.btn-primary:hover{background:var(--sky-dark); border-color:var(--sky-dark); color:#fff}
.links{display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:18px}
.overlay{position:fixed; inset:0; z-index:50; display:none; align-items:center; justify-content:center;
  background:rgba(16,32,54,.42); padding:22px}
.overlay.open{display:flex}
.modal{background:#fff; border:1px solid var(--line); border-radius:14px; width:100%; max-width:820px;
  max-height:86vh; display:flex; flex-direction:column; overflow:hidden;
  box-shadow:0 24px 60px -30px rgba(20,40,70,.6)}
.modal header{display:flex; align-items:center; gap:12px; padding:14px 18px; border-bottom:1px solid var(--line)}
.modal header h2{margin:0; font-family:var(--mono); font-size:12px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--muted); font-weight:700}
.modal header .btn{margin-left:auto; padding:7px 12px; font-size:12.5px}
.modal pre{margin:0; padding:18px; overflow:auto; font-family:var(--mono); font-size:12.5px;
  line-height:1.65; color:#16212f; white-space:pre-wrap; word-break:break-word}
footer{padding:0 22px 26px; text-align:center; color:#93a3b6; font-size:11.5px; font-family:var(--mono);
  letter-spacing:.04em}
@media (prefers-reduced-motion:reduce){*{animation:none!important; transition:none!important}}
</style>
</head>
<body>

<div class="top">
  <select id="langSel" class="langSel" aria-label="Language">
    <option value="en">English</option>
    <option value="nl">Nederlands</option>
    <option value="es">Espa&ntilde;ol</option>
    <option value="fr">Fran&ccedil;ais</option>
    <option value="de">Deutsch</option>
  </select>
</div>

<main>
  ${ mascot ? `<img class="mascot" src="${ esc(mascot) }" alt="">` : '' }
  <h1 data-i18n="oops">Err&hellip;</h1>
  <p class="say" data-i18n="say">I am not sure what you are looking for, but it is not here. I handle avatar rendering and coordination.</p>

  ${ hotelUrl
      ? `<a class="btn btn-primary" href="${ esc(hotelUrl) }" data-i18n="backHotel">Back to ${ esc(hotelName || 'the hotel') }</a>`
      : '' }

  <div class="links">
    ${ generatePath ? `<a class="btn" href="${ esc(generatePath) }" data-i18n="openPanel">Avatar generator</a>` : '' }
    ${ scenePath ? `<a class="btn" href="${ esc(scenePath) }" data-i18n="openScene">Scene composer</a>` : '' }
    <button type="button" class="btn" id="openDoc" data-i18n="apiDoc">API reference</button>
  </div>
</main>

<footer>@pixi/node &middot; headless</footer>

<div class="overlay" id="docOverlay">
  <div class="modal">
    <header>
      <h2 data-i18n="apiDoc">API reference</h2>
      <button type="button" class="btn" id="closeDoc" data-i18n="close">Close</button>
    </header>
    <pre id="docText"></pre>
  </div>
</div>

<script>
(function () {
  'use strict';

  var API_TEXT = ${ js(apiText) };
  var HOTEL = ${ js(hotelName) };

  var I18N = {
    en: {
      oops: 'Err…',
      say: 'I am not sure what you are looking for, but it is not here. I handle avatar rendering and coordination.',
      backHotel: 'Back to {hotel}', backHome: 'Back to the hotel',
      openPanel: 'Avatar generator', openScene: 'Scene composer',
      apiDoc: 'API reference', close: 'Close'
    },
    nl: {
      oops: 'Eh…',
      say: 'Ik weet niet goed wat je zoekt, maar hier is het niet. Ik doe het renderen en coördineren van avatars.',
      backHotel: 'Terug naar {hotel}', backHome: 'Terug naar het hotel',
      openPanel: 'Avatargenerator', openScene: 'Scène-editor',
      apiDoc: 'API-documentatie', close: 'Sluiten'
    },
    es: {
      oops: 'Eh…',
      say: 'No sé muy bien qué buscas, pero no está aquí. Yo me encargo de generar y coordinar los avatares.',
      backHotel: 'Volver a {hotel}', backHome: 'Volver al hotel',
      openPanel: 'Generador de avatares', openScene: 'Editor de escenas',
      apiDoc: 'Referencia de la API', close: 'Cerrar'
    },
    fr: {
      oops: 'Euh…',
      say: "Je ne sais pas trop ce que tu cherches, mais ce n'est pas ici. Moi, je m'occupe de la coordination et de la génération des avatars.",
      backHotel: "Retour à {hotel}", backHome: "Retour à l'hôtel",
      openPanel: "Générateur d'avatars", openScene: 'Éditeur de scènes',
      apiDoc: "Documentation de l'API", close: 'Fermer'
    },
    de: {
      oops: 'Äh…',
      say: 'Ich weiß nicht recht, was du suchst, aber hier ist es nicht. Ich kümmere mich um das Rendern und Koordinieren der Avatare.',
      backHotel: 'Zurück zu {hotel}', backHome: 'Zurück zum Hotel',
      openPanel: 'Avatar-Generator', openScene: 'Szenen-Editor',
      apiDoc: 'API-Referenz', close: 'Schließen'
    }
  };

  var LANG_KEY = 'avatar-studio.lang';

  function detectLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved && I18N[saved]) { return saved; }
    } catch (e) {}
    var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return I18N[nav] ? nav : 'en';
  }

  var LANG = detectLang();

  function t(key) {
    var dict = I18N[LANG] || I18N.en;
    return dict[key] !== undefined ? dict[key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
  }

  function applyLang() {
    document.documentElement.lang = LANG;
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      if (key === 'backHotel') {
        nodes[i].textContent = HOTEL ? t('backHotel').split('{hotel}').join(HOTEL) : t('backHome');
        continue;
      }
      nodes[i].textContent = t(key);
    }
    var sel = document.getElementById('langSel');
    if (sel) { sel.value = LANG; }
  }

  document.getElementById('docText').textContent = API_TEXT;

  var overlay = document.getElementById('docOverlay');

  document.getElementById('openDoc').addEventListener('click', function () { overlay.classList.add('open'); });
  document.getElementById('closeDoc').addEventListener('click', function () { overlay.classList.remove('open'); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) { overlay.classList.remove('open'); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { overlay.classList.remove('open'); } });

  document.getElementById('langSel').addEventListener('change', function () {
    LANG = this.value;
    try { localStorage.setItem(LANG_KEY, LANG); } catch (e) {}
    applyLang();
  });

  applyLang();
})();
</script>
</body>
</html>`;

export default renderLandingPage;
