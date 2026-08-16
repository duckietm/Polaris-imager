const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const js = (value) => JSON.stringify(value ?? null).replace(/</g, '\\u003c');

export const renderGeneratePage = ({
    imagerUrl = '/avatarimage',
    base = '/Generate',
    lookupEnabled = false,
    searchEnabled = false,
    logoutEnabled = false,
    apiKey = '',
    token = '',
    title = 'Avatar Studio',
    figure = '',
    query = {}
} = {}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style>
:root{
  --bg:#f4f8fc; --panel:#ffffff; --panel2:#f7fafd; --line:#e2ebf4;
  --text:#16212f; --muted:#69798e; --sky:#2f9bf0; --sky-dark:#1a7fd0;
  --sky-soft:#e8f4fe; --ok:#0f9b5c; --err:#d63b46;
  --mono:ui-monospace,"SFMono-Regular","JetBrains Mono",Menlo,Consolas,monospace;
  --body:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --r:12px;
  --shadow:0 1px 2px rgba(20,40,70,.05), 0 10px 26px -18px rgba(20,40,70,.35);
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  background:var(--bg); color:var(--text); font-family:var(--body); font-size:14px;
  line-height:1.5; -webkit-font-smoothing:antialiased;
  background-image:radial-gradient(circle at 12% -8%,rgba(47,155,240,.10),transparent 42%),
                   radial-gradient(circle at 95% 2%,rgba(47,155,240,.07),transparent 38%);
  background-attachment:fixed;
}
a{color:var(--sky-dark)}

.top{border-bottom:1px solid var(--line); background:rgba(255,255,255,.88); backdrop-filter:blur(8px);
     position:sticky; top:0; z-index:20}
.topIn{max-width:1240px; margin:0 auto; padding:14px 22px; display:flex; align-items:center; gap:14px}
.brand{font-family:var(--mono); font-size:13px; font-weight:700; letter-spacing:.18em; text-transform:uppercase}
.brand b{color:var(--sky)}
.tagline{color:var(--muted); font-size:12px; margin-left:auto; font-family:var(--mono); letter-spacing:.05em}
@media(max-width:700px){.tagline{display:none}}

.langSel{width:auto; flex:0 0 auto; background:#fff; color:var(--text); border:1px solid #d9e4ef;
  border-radius:9px; padding:5px 24px 5px 9px; font-size:11.5px; font-weight:600;
  font-family:var(--body); cursor:pointer;
  appearance:none; background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),
  linear-gradient(135deg,var(--muted) 50%,transparent 50%);
  background-position:calc(100% - 13px) 50%,calc(100% - 9px) 50%;
  background-size:4px 4px,4px 4px; background-repeat:no-repeat}
.langSel:hover{border-color:var(--sky)}

.wrap{max-width:1240px; margin:0 auto; padding:22px}
.grid{display:grid; grid-template-columns:352px 1fr; gap:22px; align-items:start}
@media(max-width:980px){.grid{grid-template-columns:1fr}}
.col-left{position:sticky; top:76px}
@media(max-width:980px){.col-left{position:static}}
.card{background:var(--panel); border:1px solid var(--line); border-radius:var(--r); padding:18px;
      margin-bottom:18px; box-shadow:var(--shadow)}
.card h2{font-family:var(--mono); font-size:11px; letter-spacing:.16em; text-transform:uppercase;
         color:var(--muted); margin:0 0 14px; font-weight:700}

.preview{position:relative; border:1px solid var(--line); border-radius:var(--r); min-height:288px;
  display:flex; align-items:center; justify-content:center; padding:26px; overflow:hidden;
  background-color:#ffffff;
  background-image:linear-gradient(45deg,#eef4fa 25%,transparent 25%,transparent 75%,#eef4fa 75%),
                   linear-gradient(45deg,#eef4fa 25%,transparent 25%,transparent 75%,#eef4fa 75%);
  background-size:18px 18px; background-position:0 0,9px 9px;
}
.preview img{max-width:100%; image-rendering:pixelated; display:block}

.preview img:not([src]){display:none}
.preview::before,.preview::after{content:""; position:absolute; width:16px; height:16px; pointer-events:none}
.preview::before{top:9px; left:9px; border-top:2px solid var(--sky); border-left:2px solid var(--sky)}
.preview::after{bottom:9px; right:9px; border-bottom:2px solid var(--sky); border-right:2px solid var(--sky)}
.load{position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      background:rgba(255,255,255,.66)}
.spin{width:24px; height:24px; border-radius:50%;
      border:3px solid #d7e5f3; border-top-color:var(--sky); animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}

.term{margin-top:14px; background:var(--panel2); border:1px solid var(--line); border-radius:9px;
      padding:11px 12px; font-family:var(--mono); font-size:11px; line-height:1.65;
      color:#3d5a78; word-break:break-all; max-height:132px; overflow:auto}
.term .k{color:var(--sky-dark); font-weight:600}

.field{margin-bottom:15px}
.field>label{display:block; font-family:var(--mono); font-size:10.5px; letter-spacing:.13em;
  text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:6px}
.field small{display:block; color:#8494a8; font-size:11.5px; margin-top:5px}
.row{display:grid; grid-template-columns:1fr 1fr; gap:14px}
@media(max-width:600px){.row{grid-template-columns:1fr}}
input[type=text],input[type=number],select{
  width:100%; background:#fff; color:var(--text); border:1px solid #d9e4ef;
  border-radius:9px; padding:10px 12px; font-size:13.5px; font-family:var(--body); outline:none;
  transition:border-color .15s, box-shadow .15s}
input[type=text]{font-family:var(--mono); font-size:12.5px}
input[type=text]:hover,input[type=number]:hover,select:hover{border-color:#bed3e7}
input:focus-visible,select:focus-visible,button:focus-visible,a:focus-visible{
  outline:none; border-color:var(--sky); box-shadow:0 0 0 3px rgba(47,155,240,.22)}
a:focus-visible,button:focus-visible{outline:2px solid var(--sky); outline-offset:2px}
input::placeholder{color:#a9b8c9}
select{appearance:none; background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),
  linear-gradient(135deg,var(--muted) 50%,transparent 50%);
  background-position:calc(100% - 17px) 50%,calc(100% - 12px) 50%;
  background-size:5px 5px,5px 5px; background-repeat:no-repeat; padding-right:34px}
input[type=color]{width:100%; height:42px; padding:3px; background:#fff;
  border:1px solid #d9e4ef; border-radius:9px; cursor:pointer}

.btn{display:inline-flex; align-items:center; justify-content:center; gap:7px; cursor:pointer;
  border:1px solid #d9e4ef; background:#fff; color:var(--text); border-radius:9px;
  padding:10px 14px; font-size:12.5px; font-weight:600; font-family:var(--body); text-decoration:none;
  transition:border-color .15s, background .15s, color .15s}
.btn:hover{border-color:var(--sky); color:var(--sky-dark); background:var(--sky-soft)}
.btn-primary{background:var(--sky); border-color:var(--sky); color:#fff; font-weight:700}
.btn-primary:hover{background:var(--sky-dark); border-color:var(--sky-dark); color:#fff}
.btn-block{display:flex; width:100%}
.btnRow{display:flex; gap:8px; flex-wrap:wrap}
.btnRow .btn{flex:1; min-width:120px}

.dirs{display:grid; grid-template-columns:repeat(8,1fr); gap:6px}
@media(max-width:1200px){.dirs{grid-template-columns:repeat(4,1fr)}}
.dir{position:relative; border:1px solid #dde8f2; border-radius:9px; background:#fff;
  cursor:pointer; padding:2px; overflow:hidden; transition:border-color .15s, background .15s, box-shadow .15s}
.dir:hover{border-color:#b6d3ee; background:var(--panel2)}
.dir.on{border-color:var(--sky); background:var(--sky-soft); box-shadow:0 0 0 2px rgba(47,155,240,.18)}
.dir img{width:100%; display:block; image-rendering:pixelated; min-height:34px}
.dir img:not([src]){display:none}
.dir:has(img:not([src])){min-height:44px}
.dir i{position:absolute; top:3px; left:4px; font-style:normal; font-family:var(--mono);
  font-size:9px; color:#a3b3c6}
.dir.on i{color:var(--sky-dark)}

.chips{display:flex; flex-wrap:wrap; gap:8px}
.chip{border:1px solid #d9e4ef; background:#fff; color:var(--text); border-radius:999px;
  padding:7px 14px; font-size:12.5px; font-weight:600; cursor:pointer; font-family:var(--body);
  transition:border-color .15s, background .15s, color .15s}
.chip:hover{border-color:#b6d3ee; background:var(--panel2)}
.chip.on{border-color:var(--sky); background:var(--sky-soft); color:var(--sky-dark)}

.msg{margin-top:12px; font-size:13px; min-height:19px}
.msg .ok{color:var(--ok); font-weight:600}
.msg .err{color:var(--err)}
.msg .wait{color:var(--muted)}
.note{border:1px solid #cfe6fb; background:var(--sky-soft); color:#155a8a; border-radius:9px;
  padding:11px 13px; font-size:12.5px; margin-bottom:16px}
.inline{display:flex; gap:8px}
.inline input{flex:1}

.sugList{margin-top:6px; border:1px solid var(--line); border-radius:9px; background:#fff;
  overflow:hidden; max-height:262px; overflow-y:auto; box-shadow:var(--shadow)}
.sug{display:flex; align-items:center; gap:10px; width:100%; text-align:left; cursor:pointer;
  background:none; border:0; border-bottom:1px solid var(--line); padding:6px 10px;
  color:var(--text); font-family:var(--body); font-size:13px}
.sug:last-child{border-bottom:0}
.sug:hover{background:var(--sky-soft)}
.sug img{width:28px; height:28px; object-fit:contain; image-rendering:pixelated; flex:none}
.foot{max-width:1240px; margin:0 auto; padding:6px 22px 34px; color:#93a3b6; font-size:11.5px;
  font-family:var(--mono); letter-spacing:.04em}
@media (prefers-reduced-motion:reduce){*{animation:none!important; transition:none!important}}
</style>
</head>
<body>

<header class="top">
  <div class="topIn">
    <div class="brand"><b>&#9632;</b> ${esc(title)}</div>
    <div class="tagline">nitro render &middot; @pixi/node &middot; /avatarimage</div>
    ${ logoutEnabled

        ? `<a class="btn" style="padding:6px 12px;font-size:12px" href="${ esc(base) }/logout" data-i18n="logout">Sign out</a>`
        : '' }
    <select id="langSel" class="langSel" aria-label="Language">
      <option value="en">English</option>
      <option value="nl">Nederlands</option>
      <option value="es">Espa&ntilde;ol</option>
      <option value="fr">Fran&ccedil;ais</option>
      <option value="de">Deutsch</option>
    </select>
  </div>
</header>

<div class="wrap">
<div class="grid">

    <div class="col-left">
    <div class="card">
      <h2 data-i18n="preview">Preview</h2>
      <div class="preview" id="pv">
        <img id="pvImg" alt="Avatar preview" data-i18n-alt="previewAlt">
        <div class="load" id="pvLoad" style="display:none"><div class="spin"></div></div>
      </div>
      <div class="term" id="urlBox">—</div>
      <div class="btnRow" style="margin-top:12px">
        <button type="button" class="btn" id="copyUrl" data-i18n="copyUrl">Copy URL</button>
        <a class="btn" id="dl" download="avatar.png" data-i18n="download">Download</a>
      </div>
      <button type="button" class="btn btn-block" id="copyImg" style="margin-top:8px" data-i18n="copyImg">Copy &lt;img&gt; tag</button>
      <button type="button" class="btn btn-block" id="copyPage" style="margin-top:8px" data-i18n="copyPage">Copy link to this setup</button>
      <div class="msg" id="msg"></div>
    </div>
  </div>

    <div>
    <div class="card">
      <h2 data-i18n="character">Character</h2>
            <div class="${ lookupEnabled ? 'row' : '' }">
        ${ lookupEnabled ? `<div class="field" id="userField">
          <label for="fUser" data-i18n="playerName">Player name</label>
          <div class="inline">
            <input type="text" id="fUser" placeholder="Username…" data-i18n-ph="usernamePh" autocomplete="off" spellcheck="false">
            <button type="button" class="btn" id="fetchLook" style="white-space:nowrap" data-i18n="load">Load</button>
          </div>
                    <div class="sugList" id="sugList" style="display:none"></div>
          <small data-i18n="${ searchEnabled ? 'suggestHint' : 'lookupHint' }">${ searchEnabled ? 'Type 2 letters to see suggestions.' : 'Loads the player&#39;s current outfit.' }</small>
        </div>` : '' }
        <div class="field" style="margin-bottom:0">
          <label for="fFigure" data-i18n="figure">Figure</label>
          <input type="text" id="fFigure" value="${esc(figure)}" spellcheck="false" autocomplete="off"
                 placeholder="hd-180-1.ch-255-66.lg-280-110">
          <small data-i18n="figureHint">Editable directly.</small>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 data-i18n="orientation">Orientation</h2>
      <div class="field">
        <label data-i18n="bodyDir">Body direction</label>
        <div class="dirs" id="bodyDirs"></div>
      </div>
      <div class="field" style="margin-bottom:0">
        <label data-i18n="headDir">Head direction</label>
        <div class="dirs" id="headDirs"></div>
      </div>
    </div>

    <div class="card">
      <h2 data-i18n="pose">Pose</h2>
      <div class="row">
        <div class="field">
          <label data-i18n="action">Action</label>
          <div class="chips" id="actChips">
            <button type="button" class="chip on" data-act="" data-i18n="none">None</button>
            <button type="button" class="chip" data-act="wlk" data-i18n="walk">Walk</button>
            <button type="button" class="chip" data-act="sit" data-i18n="sit">Sit</button>
            <button type="button" class="chip" data-act="lay" data-i18n="lay">Lie down</button>
            <button type="button" class="chip" data-act="wav" data-i18n="wave">Wave</button>
            <button type="button" class="chip" data-act="drk=1" data-i18n="drink">Drink</button>
            <button type="button" class="chip" data-act="crr=1" data-i18n="carry">Carry</button>
          </div>
        </div>
        <div class="field">
          <label for="fGesture" data-i18n="expression">Expression</label>
          <select id="fGesture">
            <option value="std" data-i18n="gestureNormal">Normal</option>
            <option value="sml" data-i18n="gestureSmile">Smile</option>
            <option value="sad" data-i18n="gestureSad">Sad</option>
            <option value="agr" data-i18n="gestureAngry">Angry</option>
            <option value="srp" data-i18n="gestureSurprised">Surprised</option>
          </select>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label for="fSize" data-i18n="size">Size</label>
          <select id="fSize">
            <option value="s" data-i18n="sizeSmall">Small</option>
            <option value="n" selected data-i18n="sizeNormal">Normal</option>
            <option value="l" data-i18n="sizeLarge">Large</option>
          </select>
        </div>
        <div class="field">
          <label for="fHeadonly" data-i18n="crop">Crop</label>
          <select id="fHeadonly">
            <option value="0" data-i18n="fullBody">Full body</option>
            <option value="1" data-i18n="headOnly">Head only</option>
          </select>
        </div>
      </div>
      <div class="row" style="margin-bottom:0">
        <div class="field" style="margin-bottom:0">
          <label for="fEffect" data-i18n="effect">Effect</label>
          <input type="number" id="fEffect" value="0" min="0" max="500">
          <small data-i18n="effectHint">0 = none.</small>
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="fDance" data-i18n="dance">Dance</label>
          <select id="fDance">
            <option value="0" data-i18n="none">None</option>
            <option value="1" data-i18n="dance1">Dance 1</option>
            <option value="2" data-i18n="dance2">Dance 2</option>
            <option value="3" data-i18n="dance3">Dance 3</option>
            <option value="4" data-i18n="dance4">Dance 4</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 data-i18n="bubble">Speech bubble</h2>
      <div class="field">
        <label for="fText" data-i18n="message">Message</label>
        <input type="text" id="fText" maxlength="100" placeholder="Leave empty for no bubble" data-i18n-ph="msgPh">
      </div>
      <div class="row" style="margin-bottom:0">
        <div class="field" style="margin-bottom:0">
          <label for="fTextColor" data-i18n="textColor">Text colour</label>
          <input type="color" id="fTextColor" value="#000000">
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="fBubbleColor" data-i18n="bubbleColor">Bubble colour</label>
          <input type="color" id="fBubbleColor" value="#ffffff">
        </div>
      </div>
    </div>

    <div class="card">
      <h2 data-i18n="output">Output</h2>
      <div class="row" style="margin-bottom:0">
        <div class="field" style="margin-bottom:0">
          <label for="fFormat" data-i18n="format">Format</label>
          <select id="fFormat">
            <option value="auto" data-i18n="formatAuto">Automatic</option>
            <option value="png" data-i18n="formatPng">Static PNG</option>
            <option value="apng" data-i18n="formatApng">Animated APNG</option>
          </select>
          <small data-i18n="formatHint">Dances and effects need APNG.</small>
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="fFrame" data-i18n="frame">Animation frame</label>
          <input type="number" id="fFrame" value="0" min="0" max="60">
          <small data-i18n="frameHint">Useful with static PNG.</small>
        </div>
      </div>
      <div class="btnRow" style="margin-top:16px">
        <button type="button" class="btn" id="reset" data-i18n="reset">Reset</button>
        <button type="button" class="btn btn-primary" id="refresh" data-i18n="refresh">Refresh preview</button>
      </div>
    </div>
  </div>

</div>
</div>
<div class="foot">GET /avatarimage &middot; figure · action · gesture · direction · head_direction · headonly · dance · effect · size · frame_num · img_format · text · text_color · bubble_color</div>

<script>
(function () {
  'use strict';

  var IMAGER   = ${js(imagerUrl)};
  var BASE     = ${js(base)};
  var LOOKUP   = ${js(lookupEnabled)};
  var SEARCH   = ${js(searchEnabled)};
  var API_KEY  = ${js(apiKey)};
  var TOKEN    = ${js(token)};
  var PRESET   = ${js(query)};

  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var e = $(id); return e ? e.value : ''; };
  var hex = function (id) { return (val(id) || '').replace('#', ''); };

  var I18N = {
    en: {
      preview: 'Preview', copyUrl: 'Copy URL', download: 'Download',
      copyImg: 'Copy <img> tag', copyPage: 'Copy link to this setup',
      character: 'Character', playerName: 'Player name', load: 'Load',
      usernamePh: 'Username…', suggestHint: 'Type 2 letters to see suggestions.',
      lookupHint: "Loads the player's current outfit.",
      figure: 'Figure', figureHint: 'Editable directly.',
      orientation: 'Orientation', bodyDir: 'Body direction', headDir: 'Head direction',
      pose: 'Pose', action: 'Action', none: 'None', walk: 'Walk', sit: 'Sit',
      lay: 'Lie down', wave: 'Wave', drink: 'Drink', carry: 'Carry',
      expression: 'Expression', gestureNormal: 'Normal', gestureSmile: 'Smile',
      gestureSad: 'Sad', gestureAngry: 'Angry', gestureSurprised: 'Surprised',
      size: 'Size', sizeSmall: 'Small', sizeNormal: 'Normal', sizeLarge: 'Large',
      crop: 'Crop', fullBody: 'Full body', headOnly: 'Head only',
      effect: 'Effect', effectHint: '0 = none.', dance: 'Dance',
      dance1: 'Dance 1', dance2: 'Dance 2', dance3: 'Dance 3', dance4: 'Dance 4',
      bubble: 'Speech bubble', message: 'Message', msgPh: 'Leave empty for no bubble',
      textColor: 'Text colour', bubbleColor: 'Bubble colour',
      output: 'Output', format: 'Format', formatAuto: 'Automatic',
      formatPng: 'Static PNG', formatApng: 'Animated APNG',
      formatHint: 'Dances and effects need APNG.',
      frame: 'Animation frame', frameHint: 'Useful with static PNG.',
      reset: 'Reset', refresh: 'Refresh preview', logout: 'Sign out',
      noFigure: 'Enter a figure to start rendering.',
      searching: 'Looking up {name}…', loaded: "Loaded {name}'s outfit.",
      notFound: 'Player not found.', lookupDown: 'Lookup unavailable.',
      copied: 'Copied!', tagCopied: 'Tag copied!', linkCopied: 'Link copied!',
      copyDenied: 'Copy blocked by the browser (HTTPS required).',
      direction: 'Direction', previewAlt: 'Avatar preview'
    },
    nl: {
      preview: 'Voorbeeld', copyUrl: 'Adres kopiëren', download: 'Downloaden',
      copyImg: '<img>-tag kopiëren', copyPage: 'Link naar deze instelling kopiëren',
      character: 'Personage', playerName: 'Spelersnaam', load: 'Laden',
      usernamePh: 'Spelersnaam…', suggestHint: 'Typ 2 letters voor suggesties.',
      lookupHint: 'Haalt de huidige outfit van de speler op.',
      figure: 'Figuur', figureHint: 'Direct aanpasbaar.',
      orientation: 'Oriëntatie', bodyDir: 'Richting lichaam', headDir: 'Richting hoofd',
      pose: 'Pose', action: 'Actie', none: 'Geen', walk: 'Lopen', sit: 'Zitten',
      lay: 'Liggen', wave: 'Zwaaien', drink: 'Drinken', carry: 'Vasthouden',
      expression: 'Expressie', gestureNormal: 'Normaal', gestureSmile: 'Lachen',
      gestureSad: 'Verdrietig', gestureAngry: 'Boos', gestureSurprised: 'Verrast',
      size: 'Grootte', sizeSmall: 'Klein', sizeNormal: 'Normaal', sizeLarge: 'Groot',
      crop: 'Kader', fullBody: 'Volledig lichaam', headOnly: 'Alleen hoofd',
      effect: 'Effect', effectHint: '0 = geen.', dance: 'Dans',
      dance1: 'Dans 1', dance2: 'Dans 2', dance3: 'Dans 3', dance4: 'Dans 4',
      bubble: 'Tekstballon', message: 'Bericht', msgPh: 'Laat leeg voor geen ballon',
      textColor: 'Tekstkleur', bubbleColor: 'Ballonkleur',
      output: 'Uitvoer', format: 'Formaat', formatAuto: 'Automatisch',
      formatPng: 'Statische PNG', formatApng: 'Geanimeerde APNG',
      formatHint: 'Dansen en effecten vereisen APNG.',
      frame: 'Animatieframe', frameHint: 'Handig bij statische PNG.',
      reset: 'Herstellen', refresh: 'Voorbeeld vernieuwen', logout: 'Uitloggen',
      noFigure: 'Voer een figuur in om te renderen.',
      searching: 'Zoeken naar {name}…', loaded: 'Outfit van {name} geladen.',
      notFound: 'Speler niet gevonden.', lookupDown: 'Zoeken niet beschikbaar.',
      copied: 'Gekopieerd!', tagCopied: 'Tag gekopieerd!', linkCopied: 'Link gekopieerd!',
      copyDenied: 'Kopiëren geblokkeerd door de browser (HTTPS vereist).',
      direction: 'Richting', previewAlt: 'Avatarvoorbeeld'
    },
    es: {
      preview: 'Vista previa', copyUrl: 'Copiar URL', download: 'Descargar',
      copyImg: 'Copiar etiqueta <img>', copyPage: 'Copiar enlace a esta configuración',
      character: 'Personaje', playerName: 'Nombre del jugador', load: 'Cargar',
      usernamePh: 'Nombre…', suggestHint: 'Escribe 2 letras para ver sugerencias.',
      lookupHint: 'Carga el atuendo actual del jugador.',
      figure: 'Figura', figureHint: 'Editable directamente.',
      orientation: 'Orientación', bodyDir: 'Dirección del cuerpo', headDir: 'Dirección de la cabeza',
      pose: 'Pose', action: 'Acción', none: 'Ninguna', walk: 'Caminar', sit: 'Sentarse',
      lay: 'Tumbarse', wave: 'Saludar', drink: 'Beber', carry: 'Sujetar',
      expression: 'Expresión', gestureNormal: 'Normal', gestureSmile: 'Sonrisa',
      gestureSad: 'Triste', gestureAngry: 'Enfadado', gestureSurprised: 'Sorprendido',
      size: 'Tamaño', sizeSmall: 'Pequeño', sizeNormal: 'Normal', sizeLarge: 'Grande',
      crop: 'Encuadre', fullBody: 'Cuerpo entero', headOnly: 'Solo cabeza',
      effect: 'Efecto', effectHint: '0 = ninguno.', dance: 'Baile',
      dance1: 'Baile 1', dance2: 'Baile 2', dance3: 'Baile 3', dance4: 'Baile 4',
      bubble: 'Bocadillo de texto', message: 'Mensaje', msgPh: 'Déjalo vacío para no mostrar bocadillo',
      textColor: 'Color del texto', bubbleColor: 'Color del bocadillo',
      output: 'Salida', format: 'Formato', formatAuto: 'Automático',
      formatPng: 'PNG estático', formatApng: 'APNG animado',
      formatHint: 'Los bailes y efectos requieren APNG.',
      frame: 'Fotograma de la animación', frameHint: 'Útil con PNG estático.',
      reset: 'Restablecer', refresh: 'Regenerar vista previa', logout: 'Cerrar sesión',
      noFigure: 'Introduce una figura para renderizar.',
      searching: 'Buscando a {name}…', loaded: 'Atuendo de {name} cargado.',
      notFound: 'Jugador no encontrado.', lookupDown: 'Búsqueda no disponible.',
      copied: '¡Copiado!', tagCopied: '¡Etiqueta copiada!', linkCopied: '¡Enlace copiado!',
      copyDenied: 'Copia bloqueada por el navegador (se requiere HTTPS).',
      direction: 'Dirección', previewAlt: 'Vista previa del avatar'
    },
    fr: {
      preview: 'Aperçu', copyUrl: "Copier l'adresse", download: 'Télécharger',
      copyImg: 'Copier la balise <img>', copyPage: 'Copier le lien de ce réglage',
      character: 'Personnage', playerName: 'Pseudo du joueur', load: 'Charger',
      usernamePh: 'Pseudo…', suggestHint: 'Tape 2 lettres pour voir les suggestions.',
      lookupHint: 'Récupère la tenue actuelle du joueur.',
      figure: 'Figure', figureHint: 'Modifiable directement.',
      orientation: 'Orientation', bodyDir: 'Direction du corps', headDir: 'Direction de la tête',
      pose: 'Pose', action: 'Action', none: 'Aucune', walk: 'Marche', sit: 'Assis',
      lay: 'Allongé', wave: 'Salue', drink: 'Boit', carry: 'Tient',
      expression: 'Expression', gestureNormal: 'Normale', gestureSmile: 'Sourire',
      gestureSad: 'Triste', gestureAngry: 'En colère', gestureSurprised: 'Surprise',
      size: 'Taille', sizeSmall: 'Petite', sizeNormal: 'Normale', sizeLarge: 'Grande',
      crop: 'Cadrage', fullBody: 'Corps entier', headOnly: 'Tête seule',
      effect: 'Effet', effectHint: '0 = aucun.', dance: 'Danse',
      dance1: 'Danse 1', dance2: 'Danse 2', dance3: 'Danse 3', dance4: 'Danse 4',
      bubble: 'Bulle de texte', message: 'Message', msgPh: 'Laisse vide pour ne pas afficher de bulle',
      textColor: 'Couleur du texte', bubbleColor: 'Couleur de la bulle',
      output: 'Sortie', format: 'Format', formatAuto: 'Automatique',
      formatPng: 'PNG fixe', formatApng: 'APNG animé',
      formatHint: "Les danses et effets nécessitent l'APNG.",
      frame: "Image de l'animation", frameHint: 'Utile en PNG fixe.',
      reset: 'Réinitialiser', refresh: "Régénérer l'aperçu", logout: 'Se déconnecter',
      noFigure: 'Indique une figure pour lancer le rendu.',
      searching: 'Recherche de {name}…', loaded: 'Tenue de {name} chargée.',
      notFound: 'Joueur introuvable.', lookupDown: 'Recherche indisponible.',
      copied: 'Copié !', tagCopied: 'Balise copiée !', linkCopied: 'Lien copié !',
      copyDenied: 'Copie refusée par le navigateur (HTTPS requis).',
      direction: 'Direction', previewAlt: "Aperçu de l'avatar"
    },
    de: {
      preview: 'Vorschau', copyUrl: 'Adresse kopieren', download: 'Herunterladen',
      copyImg: '<img>-Tag kopieren', copyPage: 'Link zu dieser Einstellung kopieren',
      character: 'Charakter', playerName: 'Spielername', load: 'Laden',
      usernamePh: 'Spielername…', suggestHint: 'Tippe 2 Buchstaben für Vorschläge.',
      lookupHint: 'Lädt das aktuelle Outfit des Spielers.',
      figure: 'Figur', figureHint: 'Direkt bearbeitbar.',
      orientation: 'Ausrichtung', bodyDir: 'Körperrichtung', headDir: 'Kopfrichtung',
      pose: 'Pose', action: 'Aktion', none: 'Keine', walk: 'Gehen', sit: 'Sitzen',
      lay: 'Liegen', wave: 'Winken', drink: 'Trinken', carry: 'Halten',
      expression: 'Ausdruck', gestureNormal: 'Normal', gestureSmile: 'Lächeln',
      gestureSad: 'Traurig', gestureAngry: 'Wütend', gestureSurprised: 'Überrascht',
      size: 'Größe', sizeSmall: 'Klein', sizeNormal: 'Normal', sizeLarge: 'Groß',
      crop: 'Ausschnitt', fullBody: 'Ganzer Körper', headOnly: 'Nur Kopf',
      effect: 'Effekt', effectHint: '0 = keiner.', dance: 'Tanz',
      dance1: 'Tanz 1', dance2: 'Tanz 2', dance3: 'Tanz 3', dance4: 'Tanz 4',
      bubble: 'Sprechblase', message: 'Nachricht', msgPh: 'Leer lassen für keine Sprechblase',
      textColor: 'Textfarbe', bubbleColor: 'Blasenfarbe',
      output: 'Ausgabe', format: 'Format', formatAuto: 'Automatisch',
      formatPng: 'Statisches PNG', formatApng: 'Animiertes APNG',
      formatHint: 'Tänze und Effekte benötigen APNG.',
      frame: 'Animationsbild', frameHint: 'Nützlich bei statischem PNG.',
      reset: 'Zurücksetzen', refresh: 'Vorschau aktualisieren', logout: 'Abmelden',
      noFigure: 'Gib eine Figur ein, um zu rendern.',
      searching: 'Suche nach {name}…', loaded: 'Outfit von {name} geladen.',
      notFound: 'Spieler nicht gefunden.', lookupDown: 'Suche nicht verfügbar.',
      copied: 'Kopiert!', tagCopied: 'Tag kopiert!', linkCopied: 'Link kopiert!',
      copyDenied: 'Kopieren vom Browser blockiert (HTTPS erforderlich).',
      direction: 'Richtung', previewAlt: 'Avatar-Vorschau'
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

  function t(key, vars) {
    var dict = I18N[LANG] || I18N.en;
    var text = dict[key] !== undefined ? dict[key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
    if (vars) {
      Object.keys(vars).forEach(function (k) { text = text.split('{' + k + '}').join(vars[k]); });
    }
    return text;
  }

  function setMsg(cls, text) {
    $msg.textContent = '';
    if (!text) { return; }
    var span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    $msg.appendChild(span);
  }

  function applyLang() {
    document.documentElement.lang = LANG;
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) { nodes[i].textContent = t(nodes[i].getAttribute('data-i18n')); }
    nodes = document.querySelectorAll('[data-i18n-ph]');
    for (var j = 0; j < nodes.length; j++) { nodes[j].setAttribute('placeholder', t(nodes[j].getAttribute('data-i18n-ph'))); }
    nodes = document.querySelectorAll('[data-i18n-alt]');
    for (var k = 0; k < nodes.length; k++) { nodes[k].setAttribute('alt', t(nodes[k].getAttribute('data-i18n-alt'))); }
    nodes = document.querySelectorAll('.dir');
    for (var m = 0; m < nodes.length; m++) { nodes[m].title = t('direction') + ' ' + nodes[m].dataset.dir; }
    var sel = $('langSel');
    if (sel) { sel.value = LANG; }
  }

  var state = { direction: 2, head_direction: 2, action: '' };

  var $fig = $('fFigure');
  var $img = $('pvImg');
  var $load = $('pvLoad');
  var $urlBox = $('urlBox');
  var $dl = $('dl');
  var $msg = $('msg');
  var timer = null;

  function buildParams(extra) {
    var p = {};
    p.figure = ($fig.value || '').trim();
    p.direction = state.direction;
    p.head_direction = state.head_direction;
    p.gesture = val('fGesture') || 'std';
    p.size = val('fSize') || 'n';

    if (state.action) { p.action = state.action; }
    if (val('fHeadonly') === '1') { p.headonly = 1; }
    if (parseInt(val('fEffect'), 10) > 0) { p.effect = parseInt(val('fEffect'), 10); }
    if (parseInt(val('fDance'), 10) > 0) { p.dance = parseInt(val('fDance'), 10); }
    if (parseInt(val('fFrame'), 10) > 0) { p.frame_num = parseInt(val('fFrame'), 10); }
    if (val('fFormat') !== 'auto') { p.img_format = val('fFormat'); }

    var txt = (val('fText') || '').trim();
    if (txt) {
      p.text = txt;
      p.text_color = hex('fTextColor') || '000000';
      p.bubble_color = hex('fBubbleColor') || 'ffffff';
    }
    Object.keys(extra || {}).forEach(function (k) { p[k] = extra[k]; });
    return p;
  }

  function qs(p) {
    return Object.keys(p).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
    }).join('&');
  }

  function imageUrl(p) {
    var q = qs(p);
    if (API_KEY) { q += '&key=' + encodeURIComponent(API_KEY); }
    return IMAGER + '?' + q;
  }

  function paintUrl(url) {
    var cut = url.indexOf('?');
    var head = cut === -1 ? url : url.slice(0, cut + 1);
    var tail = cut === -1 ? '' : url.slice(cut + 1);
    var html = head.replace(/[<>&]/g, '') +
      tail.split('&').map(function (pair) {
        var i = pair.indexOf('=');
        var k = i === -1 ? pair : pair.slice(0, i);
        var v = i === -1 ? '' : pair.slice(i + 1);
        return '<span class="k">' + k.replace(/[<>&]/g, '') + '</span>=' + v.replace(/[<>&]/g, '');
      }).join('&amp;');
    $urlBox.innerHTML = html;
  }

  function refresh() {
    var params = buildParams();
    if (!params.figure) {
      $urlBox.textContent = t('noFigure');
      $img.removeAttribute('src');
      return;
    }
    var url = imageUrl(params);
    paintUrl(url);
    $dl.href = url;
    $dl.setAttribute('download', 'avatar-' + params.figure.slice(0, 24) + '.png');
    $load.style.display = 'flex';
    $img.onload = $img.onerror = function () { $load.style.display = 'none'; };
    $img.src = url;

    try {
      var pageQs = qs(params) + (TOKEN ? '&token=' + encodeURIComponent(TOKEN) : '');
      history.replaceState(null, '', location.pathname + '?' + pageQs);
    } catch (e) {}
    drawDirs();
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(refresh, 350); }

  function buildDirGrids() {
    var host = { direction: $('bodyDirs'), head_direction: $('headDirs') };
    for (var d = 0; d < 8; d++) {
      ['direction', 'head_direction'].forEach(function (kind) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dir';
        b.dataset.kind = kind;
        b.dataset.dir = d;
        b.title = t('direction') + ' ' + d;
        b.innerHTML = '<i>' + d + '</i><img alt="">';
        b.addEventListener('click', function () {
          state[this.dataset.kind] = parseInt(this.dataset.dir, 10);
          refresh();
        });
        host[kind].appendChild(b);
      });
    }
  }

  function drawDirs() {
    var f = ($fig.value || '').trim();
    if (!f) { return; }
    var list = document.querySelectorAll('.dir');
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var kind = b.dataset.kind;
      var d = parseInt(b.dataset.dir, 10);
      b.classList.toggle('on', state[kind] === d);

      var p = { figure: f, size: 's', gesture: val('fGesture') || 'std' };
      if (kind === 'direction') {
        p.direction = d; p.head_direction = d;
      } else {
        p.direction = state.direction; p.head_direction = d; p.headonly = 1;
      }
      var u = imageUrl(p);
      var im = b.querySelector('img');

      if (im.getAttribute('src') !== u) { im.src = u; }
    }
  }

  var chips = document.querySelectorAll('#actChips .chip');
  for (var c = 0; c < chips.length; c++) {
    chips[c].addEventListener('click', function () {
      for (var k = 0; k < chips.length; k++) { chips[k].classList.remove('on'); }
      this.classList.add('on');
      state.action = this.dataset.act;
      refresh();
    });
  }

  ['fGesture', 'fSize', 'fHeadonly', 'fEffect', 'fDance', 'fFormat', 'fFrame',
   'fText', 'fTextColor', 'fBubbleColor'].forEach(function (id) {
    var e = $(id);
    if (!e) { return; }
    e.addEventListener('change', refresh);
    e.addEventListener('input', schedule);
  });
  $fig.addEventListener('input', schedule);
  $('refresh').addEventListener('click', refresh);

  $('reset').addEventListener('click', function () {
    state = { direction: 2, head_direction: 2, action: '' };
    $('fGesture').value = 'std'; $('fSize').value = 'n'; $('fHeadonly').value = '0';
    $('fEffect').value = '0'; $('fDance').value = '0'; $('fFormat').value = 'auto';
    $('fFrame').value = '0'; $('fText').value = '';
    $('fTextColor').value = '#000000'; $('fBubbleColor').value = '#ffffff';
    for (var k = 0; k < chips.length; k++) { chips[k].classList.toggle('on', chips[k].dataset.act === ''); }
    refresh();
  });

  var tokenQs = TOKEN ? '&token=' + encodeURIComponent(TOKEN) : '';

  if (LOOKUP && $('fUser')) {
    var $sug = $('sugList');
    var sugTimer = null;

    var doLookup = function (name) {
      var u = (name || val('fUser') || '').trim();
      if (!u) { return; }
      hideSug();
      setMsg('wait', t('searching', { name: u }));
      fetch(BASE + '/look?username=' + encodeURIComponent(u) + tokenQs, { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.ok && d.figure) {
            $fig.value = d.figure;
            $('fUser').value = d.username || u;
            setMsg('ok', t('loaded', { name: d.username || u }));
            refresh();
          } else {
            setMsg('err', (d && d.error) || t('notFound'));
          }
        })
        .catch(function () { setMsg('err', t('lookupDown')); });
    };

    function hideSug() { if ($sug) { $sug.style.display = 'none'; $sug.innerHTML = ''; } }

    function suggest() {
      if (!SEARCH || !$sug) { return; }
      var q = (val('fUser') || '').trim();
      if (q.length < 2) { hideSug(); return; }

      fetch(BASE + '/search?q=' + encodeURIComponent(q) + tokenQs, { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok || !d.results || !d.results.length) { hideSug(); return; }
          $sug.innerHTML = '';
          d.results.forEach(function (row) {
            var li = document.createElement('button');
            li.type = 'button';
            li.className = 'sug';
            var head = imageUrl({ figure: row.figure, headonly: 1, size: 's', direction: 2, head_direction: 2 });
            var im = document.createElement('img');
            im.alt = '';
            im.src = head;
            var name = document.createElement('span');
            name.textContent = row.username;
            li.appendChild(im);
            li.appendChild(name);
            li.addEventListener('click', function () {
              $('fUser').value = row.username;
              $fig.value = row.figure;
              hideSug();
              setMsg('ok', t('loaded', { name: row.username }));
              refresh();
            });
            $sug.appendChild(li);
          });
          $sug.style.display = 'block';
        })
        .catch(hideSug);
    }

    $('fetchLook').addEventListener('click', function () { doLookup(); });
    $('fUser').addEventListener('input', function () {
      clearTimeout(sugTimer);
      sugTimer = setTimeout(suggest, 250);
    });
    $('fUser').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); doLookup(); }
      if (e.key === 'Escape') { hideSug(); }
    });

    document.addEventListener('click', function (e) {
      if ($sug && !$('userField').contains(e.target)) { hideSug(); }
    });
  }

  function copy(text, btn, label) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = label;
      setTimeout(function () { btn.textContent = old; }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        setMsg('err', t('copyDenied'));
      });
    } else {

      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  $('copyUrl').addEventListener('click', function () {
    copy(imageUrl(buildParams()), this, t('copied'));
  });
  $('copyImg').addEventListener('click', function () {
    copy('<img src="' + imageUrl(buildParams()) + '" alt="avatar">', this, t('tagCopied'));
  });
  $('copyPage').addEventListener('click', function () {
    var link = location.origin + location.pathname + '?' + qs(buildParams()) +
               (TOKEN ? '&token=' + encodeURIComponent(TOKEN) : '');
    copy(link, this, t('linkCopied'));
  });

  $('langSel').addEventListener('change', function () {
    LANG = I18N[this.value] ? this.value : 'en';
    try { localStorage.setItem(LANG_KEY, LANG); } catch (e) {}
    applyLang();
  });

  function applyPreset(p) {
    if (!p) { return; }
    if (p.figure) { $fig.value = p.figure; }
    if (p.direction !== undefined) { state.direction = parseInt(p.direction, 10) || 0; }
    if (p.head_direction !== undefined) { state.head_direction = parseInt(p.head_direction, 10) || 0; }
    if (p.action) {
      state.action = p.action;
      for (var k = 0; k < chips.length; k++) { chips[k].classList.toggle('on', chips[k].dataset.act === p.action); }
    }
    var map = { gesture: 'fGesture', size: 'fSize', headonly: 'fHeadonly', effect: 'fEffect',
                dance: 'fDance', img_format: 'fFormat', frame_num: 'fFrame', text: 'fText' };
    Object.keys(map).forEach(function (key) {
      if (p[key] !== undefined && p[key] !== '') { var e = $(map[key]); if (e) { e.value = p[key]; } }
    });
    if (p.text_color) { $('fTextColor').value = '#' + String(p.text_color).replace('#', ''); }
    if (p.bubble_color) { $('fBubbleColor').value = '#' + String(p.bubble_color).replace('#', ''); }
  }

  buildDirGrids();
  applyLang();
  applyPreset(PRESET);
  refresh();
})();
</script>
</body>
</html>`;

export default renderGeneratePage;
