import { WARDROBE_CSS, WARDROBE_JS } from './wardrobe-widget.mjs';
import { LAYOUT_JS } from './font-layout.mjs';

const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const js = (value) => JSON.stringify(value ?? null).replace(/</g, '\\u003c');

export const renderScenePage = ({
    imagerUrl = '/avatarimage',
    sceneUrl = '/scene',
    base = '/Generate',
    lookupEnabled = false,
    searchEnabled = false,
    wardrobeEnabled = true,
    fontsEnabled = true,
    bubblesEnabled = true,
    logoutEnabled = false,
    publicUrl = '',
    imageHosts = [],
    apiKey = '',
    token = '',
    title = 'Avatar Studio',
    figure = '',
    maxLayers = 24
} = {}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${ esc(title) } — Scene</title>
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
body{background:var(--bg); color:var(--text); font-family:var(--body); font-size:14px; line-height:1.5;
  -webkit-font-smoothing:antialiased;
  background-image:radial-gradient(circle at 12% -8%,rgba(47,155,240,.10),transparent 42%),
                   radial-gradient(circle at 95% 2%,rgba(47,155,240,.07),transparent 38%);
  background-attachment:fixed}
a{color:var(--sky-dark)}
.top{border-bottom:1px solid var(--line); background:rgba(255,255,255,.88); backdrop-filter:blur(8px);
  position:sticky; top:0; z-index:20}
.topIn{max-width:1500px; margin:0 auto; padding:14px 22px; display:flex; align-items:center; gap:12px}
.brand{font-family:var(--mono); font-size:13px; font-weight:700; letter-spacing:.18em; text-transform:uppercase}
.brand b{color:var(--sky)}
.spacer{margin-left:auto}
.wrap{max-width:1500px; margin:0 auto; padding:22px}
.grid{display:grid; grid-template-columns:250px minmax(0,1fr) 320px; gap:18px; align-items:start}
@media(max-width:1240px){.grid{grid-template-columns:1fr}}
.card{background:var(--panel); border:1px solid var(--line); border-radius:var(--r); padding:16px;
  margin-bottom:16px; box-shadow:var(--shadow)}
.card h2{font-family:var(--mono); font-size:11px; letter-spacing:.16em; text-transform:uppercase;
  color:var(--muted); margin:0 0 12px; font-weight:700}
.stageWrap{background:var(--panel); border:1px solid var(--line); border-radius:var(--r); padding:16px;
  box-shadow:var(--shadow)}
.stageScroll{overflow:auto; display:flex; justify-content:center; padding:8px; border-radius:9px;
  background:repeating-conic-gradient(#eef4fa 0 25%, #ffffff 0 50%) 50%/18px 18px}
.stage{position:relative; flex:none; overflow:hidden; outline:1px solid var(--line)}
.stage .lyr{position:absolute; transform-origin:top left; cursor:grab; user-select:none; touch-action:none}
.stage .lyr.sel{outline:2px dashed var(--sky); outline-offset:2px}
.stage .lyr.dragging{cursor:grabbing}
.stage .lyr img{display:block; image-rendering:pixelated; pointer-events:none}
.stage .lyr .txt{white-space:pre; pointer-events:none}
.field{margin-bottom:12px}
.field>label{display:block; font-family:var(--mono); font-size:10.5px; letter-spacing:.13em;
  text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:6px}
.field small{display:block; color:#8494a8; font-size:11.5px; margin-top:5px}
.row{display:grid; grid-template-columns:1fr 1fr; gap:12px}
input[type=text],input[type=number],select,textarea{width:100%; background:#fff; color:var(--text);
  border:1px solid #d9e4ef; border-radius:9px; padding:9px 11px; font-size:13px; font-family:var(--body);
  outline:none; transition:border-color .15s, box-shadow .15s}
textarea{resize:vertical; min-height:64px; font-family:var(--body)}
input[type=text]{font-family:var(--mono); font-size:12px}
input:hover,select:hover,textarea:hover{border-color:#bed3e7}
input:focus-visible,select:focus-visible,textarea:focus-visible{border-color:var(--sky);
  box-shadow:0 0 0 3px rgba(47,155,240,.22)}
input::placeholder,textarea::placeholder{color:#a9b8c9}
select{appearance:none; background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),
  linear-gradient(135deg,var(--muted) 50%,transparent 50%);
  background-position:calc(100% - 16px) 50%,calc(100% - 11px) 50%;
  background-size:5px 5px,5px 5px; background-repeat:no-repeat; padding-right:32px}
input[type=color]{width:100%; height:38px; padding:3px; background:#fff; border:1px solid #d9e4ef;
  border-radius:9px; cursor:pointer}
input[type=range]{width:100%; accent-color:var(--sky)}
.btn{display:inline-flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;
  border:1px solid #d9e4ef; background:#fff; color:var(--text); border-radius:9px; padding:9px 13px;
  font-size:12.5px; font-weight:600; font-family:var(--body); text-decoration:none;
  transition:border-color .15s, background .15s, color .15s}
.btn:hover{border-color:var(--sky); color:var(--sky-dark); background:var(--sky-soft)}
.btn.sm{padding:6px 10px; font-size:12px}
.btn-primary{background:var(--sky); border-color:var(--sky); color:#fff; font-weight:700}
.btn-primary:hover{background:var(--sky-dark); border-color:var(--sky-dark); color:#fff}
.btn-block{display:flex; width:100%}
.btnRow{display:flex; gap:8px; flex-wrap:wrap}
.btnRow .btn{flex:1; min-width:110px}
.add{display:flex; width:100%; align-items:center; justify-content:center; gap:8px; cursor:pointer;
  border:1px dashed #b9d3ea; background:var(--panel2); color:var(--sky-dark); border-radius:10px;
  padding:12px; font-size:13px; font-weight:700; font-family:var(--body); transition:background .15s, border-color .15s}
.add:hover{background:var(--sky-soft); border-color:var(--sky)}
.add .plus{font-size:19px; line-height:1}
.layers{display:flex; flex-direction:column; gap:6px; margin-bottom:12px}
.lrow{display:flex; align-items:center; gap:8px; border:1px solid var(--line); border-radius:9px;
  padding:7px 9px; background:#fff; cursor:pointer}
.lrow:hover{border-color:#b6d3ee}
.lrow.on{border-color:var(--sky); background:var(--sky-soft)}
.lrow .ico{width:22px; height:22px; flex:none; border-radius:5px; background:var(--panel2);
  display:flex; align-items:center; justify-content:center; font-size:11px; color:var(--muted);
  overflow:hidden; border:1px solid var(--line)}
.lrow .ico img{width:100%; height:100%; object-fit:contain; image-rendering:pixelated}
.lrow .nm{flex:1; font-size:12.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.lrow .zz{border:0; background:none; cursor:pointer; color:var(--muted); font-size:13px; padding:2px 4px;
  border-radius:5px; line-height:1}
.lrow .zz:hover{background:#fff; color:var(--sky-dark)}
.chips{display:flex; flex-wrap:wrap; gap:6px}
.chip{border:1px solid #d9e4ef; background:#fff; color:var(--text); border-radius:999px; padding:6px 12px;
  font-size:12px; font-weight:600; cursor:pointer; font-family:var(--body)}
.chip:hover{border-color:#b6d3ee; background:var(--panel2)}
.chip.on{border-color:var(--sky); background:var(--sky-soft); color:var(--sky-dark)}
.dirs{display:grid; grid-template-columns:repeat(8,1fr); gap:4px}
.dirBtn{border:1px solid #dde8f2; background:#fff; border-radius:7px; cursor:pointer; padding:5px 0;
  font-family:var(--mono); font-size:11px; color:var(--muted)}
.dirBtn:hover{border-color:#b6d3ee}
.dirBtn.on{border-color:var(--sky); background:var(--sky-soft); color:var(--sky-dark); font-weight:700}
.msg{margin-top:10px; font-size:12.5px; min-height:18px}
.msg .ok{color:var(--ok); font-weight:600}
.msg .err{color:var(--err)}
.msg .wait{color:var(--muted)}
.hint{color:var(--muted); font-size:12px}
.inline{display:flex; gap:8px}
.inline input{flex:1}
.sugList{margin-top:6px; border:1px solid var(--line); border-radius:9px; background:#fff; overflow:hidden;
  max-height:220px; overflow-y:auto; box-shadow:var(--shadow)}
.sug{display:flex; align-items:center; gap:9px; width:100%; text-align:left; cursor:pointer; background:none;
  border:0; border-bottom:1px solid var(--line); padding:5px 9px; color:var(--text); font-family:var(--body);
  font-size:12.5px}
.sug:last-child{border-bottom:0}
.sug:hover{background:var(--sky-soft)}
.sug img{width:26px; height:26px; object-fit:contain; image-rendering:pixelated; flex:none}
.warn{margin-top:12px; border:1px solid #f2d49b; background:#fff8e8; color:#8a5c00;
  border-radius:9px; padding:10px 12px; font-size:12.5px}
.urlBox{background:var(--panel2); border:1px solid var(--line); border-radius:9px; padding:10px 11px;
  font-family:var(--mono); font-size:10.5px; line-height:1.6; color:#3d5a78; word-break:break-all;
  max-height:110px; overflow:auto; margin-top:10px}
.langSel{width:auto; padding:7px 30px 7px 11px; font-size:12.5px}
.empty{color:var(--muted); font-size:12.5px; padding:6px 0}
${ WARDROBE_CSS }
@media (prefers-reduced-motion:reduce){*{animation:none!important; transition:none!important}}
</style>
</head>
<body>

<header class="top">
  <div class="topIn">
    <div class="brand"><b>&#9632;</b> ${ esc(title) }</div>
    <a class="btn sm" href="${ esc(base) }" data-i18n="backToPanel">Back to panel</a>
    <div class="spacer"></div>
    ${ logoutEnabled
        ? `<a class="btn sm" href="${ esc(base) }/logout" data-i18n="logout">Sign out</a>`
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

  <div>
    <div class="card">
      <h2 data-i18n="layers">Layers</h2>
      <div class="layers" id="layerList"></div>
      <button type="button" class="add" id="addAvatar"><span class="plus">+</span><span data-i18n="addAvatar">Add a character</span></button>
      <div class="btnRow" style="margin-top:8px">
        <button type="button" class="btn sm" id="addImage" data-i18n="addImage">Image</button>
        <button type="button" class="btn sm" id="addText" data-i18n="addText">Text</button>
      </div>
    </div>

    <div class="card">
      <h2 data-i18n="canvas">Canvas</h2>
      <div class="row">
        <div class="field"><label for="cvW" data-i18n="width">Width</label>
          <input type="number" id="cvW" value="700" min="32" max="${ maxLayers > 0 ? 2000 : 2000 }"></div>
        <div class="field"><label for="cvH" data-i18n="height">Height</label>
          <input type="number" id="cvH" value="420" min="32" max="2000"></div>
      </div>
      <div class="field">
        <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-family:var(--body);font-size:13px;font-weight:600;color:var(--text)">
          <input type="checkbox" id="cvAnim" style="width:auto"> <span data-i18n="animateScene">Animate the scene</span>
        </label>
        <small data-i18n="animateHint">Dances, effects and gestures play. Server render only.</small>
      </div>
      <div class="field">
        <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-family:var(--body);font-size:13px;font-weight:600;color:var(--text)">
          <input type="checkbox" id="cvSmooth" checked style="width:auto"> <span data-i18n="smoothImages">Smooth imported images</span>
        </label>
        <small data-i18n="smoothHint">Avoids a pixelated background. Avatars always stay pixel-sharp.</small>
      </div>
      <div class="field">
        <label for="bgMode" data-i18n="background">Background</label>
        <select id="bgMode">
          <option value="none" data-i18n="bgNone">Transparent</option>
          <option value="color" data-i18n="bgColor">Solid colour</option>
          <option value="image" data-i18n="bgImage">Image</option>
        </select>
      </div>
      <div class="field" id="bgColorField" style="display:none">
        <label for="bgColor" data-i18n="colour">Colour</label>
        <input type="color" id="bgColor" value="#ffffff">
      </div>
      <div id="bgImageField" style="display:none">
        <div class="field">
          <label for="bgUrl" data-i18n="imageUrl">Image URL</label>
          <input type="text" id="bgUrl" placeholder="https://…">
          <button type="button" class="btn sm btn-block" id="bgPick" style="margin-top:8px" data-i18n="importFile">Import from my computer</button>
          <input type="file" id="bgFile" accept="image/*" style="display:none">
        </div>
        <div class="field">
          <label for="bgFit" data-i18n="fit">Fit</label>
          <select id="bgFit">
            <option value="cover" data-i18n="fitCover">Cover</option>
            <option value="contain" data-i18n="fitContain">Contain</option>
            <option value="stretch" data-i18n="fitStretch">Stretch</option>
            <option value="tile" data-i18n="fitTile">Tile</option>
          </select>
        </div>
        <div class="row">
          <div class="field"><label for="bgX">X</label><input type="number" id="bgX" value="0"></div>
          <div class="field"><label for="bgY">Y</label><input type="number" id="bgY" value="0"></div>
        </div>
        <div class="field">
          <label for="bgZoom"><span data-i18n="zoom">Zoom</span> <span id="bgZoomVal" class="hint">100%</span></label>
          <input type="range" id="bgZoom" min="10" max="400" value="100">
        </div>
        <div class="field" style="margin-bottom:0">
          <button type="button" class="btn sm btn-block" id="bgReset" data-i18n="resetBg">Recentre the background</button>
          <small data-i18n="bgDragHint">You can also drag the background directly on the canvas.</small>
        </div>
      </div>
    </div>
  </div>

  <div>
    <div class="stageWrap">
      <div class="stageScroll"><div class="stage" id="stage"></div></div>
      <div class="btnRow" style="margin-top:14px">
        <button type="button" class="btn btn-primary" id="dlPng" data-i18n="downloadPng">Download PNG</button>
        <button type="button" class="btn" id="copyScene" data-i18n="copySceneUrl">Copy scene URL</button>
        <a class="btn" id="openScene" target="_blank" rel="noopener" data-i18n="openServer">Server render</a>
      </div>
      <div class="warn" id="hostWarn" style="display:none"></div>
      <div class="urlBox" id="sceneUrlBox">—</div>
      <div class="msg" id="msg"></div>
    </div>
  </div>

  <div>
    <div class="card" id="props">
      <h2 data-i18n="properties">Properties</h2>
      <div class="empty" id="noSel" data-i18n="selectLayer">Select a layer, or add a character.</div>
      <div id="propBody" style="display:none">

        <div class="row">
          <div class="field"><label for="pX">X</label><input type="number" id="pX" value="0"></div>
          <div class="field"><label for="pY">Y</label><input type="number" id="pY" value="0"></div>
        </div>
        <div class="field">
          <label for="pS"><span data-i18n="scale">Scale</span> <span id="pSVal" class="hint">100%</span></label>
          <input type="range" id="pS" min="10" max="400" value="100">
        </div>
        <div class="field">
          <label for="pO"><span data-i18n="opacity">Opacity</span> <span id="pOVal" class="hint">100%</span></label>
          <input type="range" id="pO" min="0" max="100" value="100">
        </div>
        <div class="btnRow" style="margin-bottom:14px">
          <button type="button" class="btn sm" id="pDup" data-i18n="duplicate">Duplicate</button>
          <button type="button" class="btn sm" id="pDel" data-i18n="delete">Delete</button>
        </div>

        <div id="avatarProps">
          <div class="field" id="userField" style="display:none">
            <label for="fUser" data-i18n="playerName">Player name</label>
            <div class="inline">
              <input type="text" id="fUser" placeholder="Username…" data-i18n-ph="usernamePh" autocomplete="off" spellcheck="false">
              <button type="button" class="btn" id="fetchLook" data-i18n="load">Load</button>
            </div>
            <div class="sugList" id="sugList" style="display:none"></div>
          </div>
          <div class="field">
            <label for="pFigure" data-i18n="figure">Figure</label>
            <input type="text" id="pFigure" spellcheck="false" autocomplete="off">
          </div>
          ${ wardrobeEnabled
              ? '<button type="button" class="btn btn-block" id="openWardrobe" style="margin-bottom:14px" data-i18n="openWardrobe">Change clothes</button>'
              : '' }
          <div class="field">
            <label data-i18n="bodyDir">Body direction</label>
            <div class="dirs" id="pDirs"></div>
          </div>
          <div class="field">
            <label data-i18n="headDir">Head direction</label>
            <div class="dirs" id="pHeadDirs"></div>
          </div>
          <div class="field">
            <label data-i18n="action">Action</label>
            <div class="chips" id="pActs">
              <button type="button" class="chip on" data-act="" data-i18n="none">None</button>
              <button type="button" class="chip" data-act="wlk" data-i18n="walk">Walk</button>
              <button type="button" class="chip" data-act="sit" data-i18n="sit">Sit</button>
              <button type="button" class="chip" data-act="lay" data-i18n="lay">Lie down</button>
              <button type="button" class="chip" data-act="wav" data-i18n="wave">Wave</button>
              <button type="button" class="chip" data-act="drk=1" data-i18n="drink">Drink</button>
              <button type="button" class="chip" data-act="crr=1" data-i18n="carry">Carry</button>
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label for="pGesture" data-i18n="expression">Expression</label>
              <select id="pGesture">
                <option value="std" data-i18n="gestureNormal">Normal</option>
                <option value="sml" data-i18n="gestureSmile">Smile</option>
                <option value="sad" data-i18n="gestureSad">Sad</option>
                <option value="agr" data-i18n="gestureAngry">Angry</option>
                <option value="srp" data-i18n="gestureSurprised">Surprised</option>
              </select>
            </div>
            <div class="field">
              <label for="pSize" data-i18n="size">Size</label>
              <select id="pSize">
                <option value="s" data-i18n="sizeSmall">Small</option>
                <option value="n" selected data-i18n="sizeNormal">Normal</option>
                <option value="l" data-i18n="sizeLarge">Large</option>
              </select>
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label for="pEffect" data-i18n="effect">Effect</label>
              <input type="number" id="pEffect" value="0" min="0" max="5000">
            </div>
            <div class="field">
              <label for="pCrop" data-i18n="crop">Crop</label>
              <select id="pCrop">
                <option value="0" data-i18n="fullBody">Full body</option>
                <option value="1" data-i18n="headOnly">Head only</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label for="pText" data-i18n="message">Message</label>
            <input type="text" id="pText" maxlength="100" placeholder="" data-i18n-ph="msgPh">
          </div>
          <div class="field" id="pBubbleField" style="display:none">
            <label for="pBubble" data-i18n="bubbleStyle">Bubble style</label>
            <select id="pBubble"><option value="" data-i18n="bubblePlain">Colour</option></select>
            <div id="pBubblePreview" style="margin-top:8px;min-height:24px"></div>
          </div>
          <div class="row" style="margin-bottom:0">
            <div class="field" style="margin-bottom:0">
              <label for="pTextColor" data-i18n="textColor">Text colour</label>
              <input type="color" id="pTextColor" value="#000000">
            </div>
            <div class="field" id="pBubbleColorField" style="margin-bottom:0">
              <label for="pBubbleColor" data-i18n="bubbleColor">Bubble colour</label>
              <input type="color" id="pBubbleColor" value="#ffffff">
            </div>
          </div>
        </div>

        <div id="imageProps" style="display:none">
          <div class="field" style="margin-bottom:0">
            <label for="pUrl" data-i18n="imageUrl">Image URL</label>
            <input type="text" id="pUrl" placeholder="https://…">
            <button type="button" class="btn sm btn-block" id="imgPick" style="margin-top:8px" data-i18n="importFile">Import from my computer</button>
            <input type="file" id="imgFile" accept="image/*" style="display:none">
            <small id="hostHint"></small>
          </div>
        </div>

        <div id="textProps" style="display:none">
          <div class="field">
            <label for="pTxt" data-i18n="text">Text</label>
            <textarea id="pTxt"></textarea>
          </div>
          <div class="field">
            <label for="pFont" data-i18n="typeface">Typeface</label>
            <select id="pFont"><option value="" data-i18n="plainText">Plain text</option></select>
          </div>
          <div class="row" style="margin-bottom:0">
            <div class="field" style="margin-bottom:0">
              <label for="pFs" data-i18n="fontSize">Font size</label>
              <input type="number" id="pFs" value="22" min="8" max="160">
            </div>
            <div class="field" id="colourField" style="margin-bottom:0">
              <label for="pTc" data-i18n="colour">Colour</label>
              <input type="color" id="pTc" value="#16212f">
            </div>
            <div class="field" id="spacingField" style="margin-bottom:0;display:none">
              <label for="pSp" data-i18n="letterSpacing">Letter spacing</label>
              <input type="number" id="pSp" value="1" min="-20" max="60">
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

</div>
</div>

<script>
(function () {
  'use strict';

  var IMAGER = ${ js(imagerUrl) };
  var SCENE_URL = ${ js(sceneUrl) };
  var BASE = ${ js(base) };
  var LOOKUP = ${ js(lookupEnabled) };
  var SEARCH = ${ js(searchEnabled) };
  var WARDROBE = ${ js(wardrobeEnabled) };
  var FONTS_ON = ${ js(fontsEnabled) };
  var BUBBLES = ${ js(bubblesEnabled) };
  var API_KEY = ${ js(apiKey) };
  var TOKEN = ${ js(token) };
  var HOSTS = ${ js(imageHosts) };
  var MAX_LAYERS = ${ js(maxLayers) };
  var PUBLIC = ${ js(publicUrl) };
  var START_FIGURE = ${ js(figure) };

  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var e = $(id); return e ? e.value : ''; };

  var I18N = {
    en: {
      layers: 'Layers', addAvatar: 'Add a character', addImage: 'Image', addText: 'Text',
      canvas: 'Canvas', width: 'Width', height: 'Height', background: 'Background',
      bgNone: 'Transparent', bgColor: 'Solid colour', bgImage: 'Image', colour: 'Colour',
      imageUrl: 'Image URL', fit: 'Fit', fitCover: 'Cover', fitContain: 'Contain',
      fitStretch: 'Stretch', fitTile: 'Tile',
      downloadPng: 'Download PNG', copySceneUrl: 'Copy scene URL', openServer: 'Server render',
      properties: 'Properties', selectLayer: 'Select a layer, or add a character.',
      scale: 'Scale', opacity: 'Opacity', duplicate: 'Duplicate', delete: 'Delete',
      figure: 'Figure', openWardrobe: 'Change clothes', bodyDir: 'Body direction', headDir: 'Head direction',
      action: 'Action', none: 'None', walk: 'Walk', sit: 'Sit', lay: 'Lie down', wave: 'Wave',
      drink: 'Drink', carry: 'Carry', expression: 'Expression', gestureNormal: 'Normal',
      gestureSmile: 'Smile', gestureSad: 'Sad', gestureAngry: 'Angry', gestureSurprised: 'Surprised',
      size: 'Size', sizeSmall: 'Small', sizeNormal: 'Normal', sizeLarge: 'Large',
      effect: 'Effect', crop: 'Crop', fullBody: 'Full body', headOnly: 'Head only',
      message: 'Message', msgPh: 'Leave empty for no bubble', textColor: 'Text colour',
      bubbleColor: 'Bubble colour', text: 'Text', fontSize: 'Font size',
      playerName: 'Player name', usernamePh: 'Username…', load: 'Load',
      backToPanel: 'Back to panel', logout: 'Sign out',
      character: 'Character', image: 'Image',
      copied: 'Copied!', linkCopied: 'Link copied!',
      copyDenied: 'Copy blocked by the browser (HTTPS required).',
      searching: 'Looking up {name}…', loaded: "Loaded {name}'s outfit.",
      notFound: 'Player not found.', lookupDown: 'Lookup unavailable.',
      maxLayers: 'Limit reached: {n} layers maximum.',
      taintedCanvas: 'The browser blocked the export because of an external image. Use the server render instead.',
      hostsHint: 'Server render allows: {hosts}', hostsNone: 'Server render allows no external image (nothing configured).',
      hostBlocked: 'That image host is refused by the server for security. Allowed: {hosts}. It will be missing from the PNG and from the scene URL.',
      hostBlockedNone: 'No image host is allowed yet, so external images stay out of the PNG and the scene URL. Set AVATAR_IMAGING_SCENE_IMAGE_HOSTS.',
      importFile: 'Import from my computer',
      localOnly: 'The imported image is in the preview and the PNG download, but cannot travel in the scene URL — the server never receives it.',
      fileTooBig: 'That file is over 4 MB.',
      fileFailed: 'Could not read that file.',
      animateScene: 'Animate the scene',
      animateHint: 'Dances, effects and gestures play. Rendered by the server, so imported images are left out.',
      downloadApng: 'Download animation',
      rendering: 'Rendering on the server…',
      renderFailed: 'Server render failed.',
      zoom: 'Zoom',
      resetBg: 'Recentre the background',
      bgDragHint: 'You can also drag the background directly on the canvas.',
      smoothImages: 'Smooth imported images',
      smoothHint: 'Avoids a pixelated background when it is scaled down. Avatars always stay pixel-sharp.',
      typeface: 'Typeface',
      plainText: 'Plain text',
      letterSpacing: 'Letter spacing',
      bubbleStyle: 'Bubble style',
      bubblePlain: 'Colour',
      emptyScene: 'No layer yet.', exported: 'Image downloaded.',
      wardrobe: 'Wardrobe', close: 'Close', showHc: 'Show HC', removeItem: 'Remove',
      genderAll: 'All', genderMale: 'Male', genderFemale: 'Female',
      noItems: 'Nothing here with these filters.', loading: 'Loading…',
      wardrobeDown: 'Wardrobe unavailable.',
      cat_hd: 'Face', cat_hr: 'Hair', cat_ha: 'Hat', cat_he: 'Head accessory', cat_ea: 'Glasses',
      cat_fa: 'Face accessory', cat_ch: 'Shirt', cat_cc: 'Coat', cat_cp: 'Print', cat_ca: 'Chest accessory',
      cat_wa: 'Belt', cat_lg: 'Trousers', cat_sh: 'Shoes'
    },
    nl: {
      layers: 'Lagen', addAvatar: 'Personage toevoegen', addImage: 'Afbeelding', addText: 'Tekst',
      canvas: 'Canvas', width: 'Breedte', height: 'Hoogte', background: 'Achtergrond',
      bgNone: 'Transparant', bgColor: 'Effen kleur', bgImage: 'Afbeelding', colour: 'Kleur',
      imageUrl: 'Afbeeldings-URL', fit: 'Passend', fitCover: 'Vullen', fitContain: 'Passen',
      fitStretch: 'Uitrekken', fitTile: 'Herhalen',
      downloadPng: 'PNG downloaden', copySceneUrl: 'Scène-URL kopiëren', openServer: 'Serverrender',
      properties: 'Eigenschappen', selectLayer: 'Kies een laag of voeg een personage toe.',
      scale: 'Schaal', opacity: 'Dekking', duplicate: 'Dupliceren', delete: 'Verwijderen',
      figure: 'Figuur', openWardrobe: 'Kleding wijzigen', bodyDir: 'Richting lichaam', headDir: 'Richting hoofd',
      action: 'Actie', none: 'Geen', walk: 'Lopen', sit: 'Zitten', lay: 'Liggen', wave: 'Zwaaien',
      drink: 'Drinken', carry: 'Vasthouden', expression: 'Expressie', gestureNormal: 'Normaal',
      gestureSmile: 'Lachen', gestureSad: 'Verdrietig', gestureAngry: 'Boos', gestureSurprised: 'Verrast',
      size: 'Grootte', sizeSmall: 'Klein', sizeNormal: 'Normaal', sizeLarge: 'Groot',
      effect: 'Effect', crop: 'Kader', fullBody: 'Volledig lichaam', headOnly: 'Alleen hoofd',
      message: 'Bericht', msgPh: 'Leeg laten voor geen ballon', textColor: 'Tekstkleur',
      bubbleColor: 'Ballonkleur', text: 'Tekst', fontSize: 'Tekengrootte',
      playerName: 'Spelersnaam', usernamePh: 'Spelersnaam…', load: 'Laden',
      backToPanel: 'Terug naar paneel', logout: 'Uitloggen',
      character: 'Personage', image: 'Afbeelding',
      copied: 'Gekopieerd!', linkCopied: 'Link gekopieerd!',
      copyDenied: 'Kopiëren geblokkeerd door de browser (HTTPS vereist).',
      searching: 'Zoeken naar {name}…', loaded: 'Outfit van {name} geladen.',
      notFound: 'Speler niet gevonden.', lookupDown: 'Zoeken niet beschikbaar.',
      maxLayers: 'Limiet bereikt: maximaal {n} lagen.',
      taintedCanvas: 'De browser blokkeerde de export vanwege een externe afbeelding. Gebruik de serverrender.',
      hostsHint: 'Serverrender staat toe: {hosts}', hostsNone: 'Serverrender staat geen externe afbeelding toe (niets ingesteld).',
      hostBlocked: 'Die afbeeldingshost wordt door de server geweigerd om veiligheidsredenen. Toegestaan: {hosts}. Hij ontbreekt in de PNG en in de scène-URL.',
      hostBlockedNone: 'Nog geen afbeeldingshost toegestaan, dus externe afbeeldingen ontbreken in de PNG en de scène-URL. Stel AVATAR_IMAGING_SCENE_IMAGE_HOSTS in.',
      importFile: 'Vanaf mijn computer importeren',
      localOnly: 'De geïmporteerde afbeelding zit in het voorbeeld en de PNG-download, maar kan niet mee in de scène-URL — de server krijgt hem nooit.',
      fileTooBig: 'Dat bestand is groter dan 4 MB.',
      fileFailed: 'Kon dat bestand niet lezen.',
      animateScene: 'Scène animeren',
      animateHint: 'Dansjes, effecten en gebaren spelen af. De server rendert, dus geïmporteerde afbeeldingen vallen weg.',
      downloadApng: 'Animatie downloaden',
      rendering: 'Renderen op de server…',
      renderFailed: 'Serverrender mislukt.',
      zoom: 'Zoom',
      resetBg: 'Achtergrond centreren',
      bgDragHint: 'Je kunt de achtergrond ook direct op het canvas slepen.',
      smoothImages: 'Geïmporteerde afbeeldingen gladstrijken',
      smoothHint: 'Voorkomt een pixelige achtergrond bij verkleinen. Avatars blijven altijd scherp per pixel.',
      typeface: 'Lettertype',
      plainText: 'Gewone tekst',
      letterSpacing: 'Letterafstand',
      bubbleStyle: 'Ballonstijl',
      bubblePlain: 'Kleur',
      emptyScene: 'Nog geen laag.', exported: 'Afbeelding gedownload.',
      wardrobe: 'Kledingkast', close: 'Sluiten', showHc: 'HC tonen', removeItem: 'Verwijderen',
      genderAll: 'Alle', genderMale: 'Man', genderFemale: 'Vrouw',
      noItems: 'Niets met deze filters.', loading: 'Laden…',
      wardrobeDown: 'Kledingkast niet beschikbaar.',
      cat_hd: 'Gezicht', cat_hr: 'Haar', cat_ha: 'Hoed', cat_he: 'Hoofdaccessoire', cat_ea: 'Bril',
      cat_fa: 'Gezichtsaccessoire', cat_ch: 'Shirt', cat_cc: 'Jas', cat_cp: 'Print', cat_ca: 'Borstaccessoire',
      cat_wa: 'Riem', cat_lg: 'Broek', cat_sh: 'Schoenen'
    },
    es: {
      layers: 'Capas', addAvatar: 'Añadir un personaje', addImage: 'Imagen', addText: 'Texto',
      canvas: 'Lienzo', width: 'Ancho', height: 'Alto', background: 'Fondo',
      bgNone: 'Transparente', bgColor: 'Color sólido', bgImage: 'Imagen', colour: 'Color',
      imageUrl: 'URL de la imagen', fit: 'Ajuste', fitCover: 'Cubrir', fitContain: 'Contener',
      fitStretch: 'Estirar', fitTile: 'Mosaico',
      downloadPng: 'Descargar PNG', copySceneUrl: 'Copiar URL de la escena', openServer: 'Render del servidor',
      properties: 'Propiedades', selectLayer: 'Elige una capa o añade un personaje.',
      scale: 'Escala', opacity: 'Opacidad', duplicate: 'Duplicar', delete: 'Eliminar',
      figure: 'Figura', openWardrobe: 'Cambiar de ropa', bodyDir: 'Dirección del cuerpo', headDir: 'Dirección de la cabeza',
      action: 'Acción', none: 'Ninguna', walk: 'Caminar', sit: 'Sentarse', lay: 'Tumbarse', wave: 'Saludar',
      drink: 'Beber', carry: 'Sostener', expression: 'Expresión', gestureNormal: 'Normal',
      gestureSmile: 'Sonrisa', gestureSad: 'Triste', gestureAngry: 'Enfadado', gestureSurprised: 'Sorprendido',
      size: 'Tamaño', sizeSmall: 'Pequeño', sizeNormal: 'Normal', sizeLarge: 'Grande',
      effect: 'Efecto', crop: 'Encuadre', fullBody: 'Cuerpo entero', headOnly: 'Solo la cabeza',
      message: 'Mensaje', msgPh: 'Déjalo vacío para no mostrar bocadillo', textColor: 'Color del texto',
      bubbleColor: 'Color del bocadillo', text: 'Texto', fontSize: 'Tamaño de fuente',
      playerName: 'Nombre del jugador', usernamePh: 'Nombre…', load: 'Cargar',
      backToPanel: 'Volver al panel', logout: 'Cerrar sesión',
      character: 'Personaje', image: 'Imagen',
      copied: '¡Copiado!', linkCopied: '¡Enlace copiado!',
      copyDenied: 'El navegador bloqueó la copia (se requiere HTTPS).',
      searching: 'Buscando a {name}…', loaded: 'Atuendo de {name} cargado.',
      notFound: 'Jugador no encontrado.', lookupDown: 'Búsqueda no disponible.',
      maxLayers: 'Límite alcanzado: máximo {n} capas.',
      taintedCanvas: 'El navegador bloqueó la exportación por una imagen externa. Usa el render del servidor.',
      hostsHint: 'El render del servidor permite: {hosts}', hostsNone: 'El render del servidor no permite imágenes externas (nada configurado).',
      hostBlocked: 'El servidor rechaza ese host de imagen por seguridad. Permitidos: {hosts}. Faltará en el PNG y en la URL de la escena.',
      hostBlockedNone: 'Aún no hay ningún host de imagen permitido, así que las imágenes externas no saldrán en el PNG ni en la URL de la escena. Configura AVATAR_IMAGING_SCENE_IMAGE_HOSTS.',
      importFile: 'Importar desde mi ordenador',
      localOnly: 'La imagen importada aparece en la vista previa y en la descarga PNG, pero no puede viajar en la URL de la escena: el servidor nunca la recibe.',
      fileTooBig: 'Ese archivo supera los 4 MB.',
      fileFailed: 'No se pudo leer ese archivo.',
      animateScene: 'Animar la escena',
      animateHint: 'Los bailes, efectos y gestos se reproducen. Lo renderiza el servidor, así que las imágenes importadas quedan fuera.',
      downloadApng: 'Descargar la animación',
      rendering: 'Renderizando en el servidor…',
      renderFailed: 'Falló el render del servidor.',
      zoom: 'Zoom',
      resetBg: 'Recentrar el fondo',
      bgDragHint: 'También puedes arrastrar el fondo directamente en el lienzo.',
      smoothImages: 'Suavizar las imágenes importadas',
      smoothHint: 'Evita un fondo pixelado al reducirlo. Los avatares siempre quedan nítidos píxel a píxel.',
      typeface: 'Tipografía',
      plainText: 'Texto simple',
      letterSpacing: 'Espaciado',
      bubbleStyle: 'Estilo del bocadillo',
      bubblePlain: 'Color',
      emptyScene: 'Aún no hay capas.', exported: 'Imagen descargada.',
      wardrobe: 'Armario', close: 'Cerrar', showHc: 'Mostrar HC', removeItem: 'Quitar',
      genderAll: 'Todos', genderMale: 'Hombre', genderFemale: 'Mujer',
      noItems: 'Nada con estos filtros.', loading: 'Cargando…',
      wardrobeDown: 'Armario no disponible.',
      cat_hd: 'Cara', cat_hr: 'Pelo', cat_ha: 'Sombrero', cat_he: 'Accesorio de cabeza', cat_ea: 'Gafas',
      cat_fa: 'Accesorio facial', cat_ch: 'Camiseta', cat_cc: 'Abrigo', cat_cp: 'Estampado', cat_ca: 'Accesorio de pecho',
      cat_wa: 'Cinturón', cat_lg: 'Pantalón', cat_sh: 'Zapatos'
    },
    fr: {
      layers: 'Calques', addAvatar: 'Ajouter un personnage', addImage: 'Image', addText: 'Texte',
      canvas: 'Zone de travail', width: 'Largeur', height: 'Hauteur', background: 'Fond',
      bgNone: 'Transparent', bgColor: 'Couleur unie', bgImage: 'Image', colour: 'Couleur',
      imageUrl: "URL de l'image", fit: 'Cadrage', fitCover: 'Remplir', fitContain: 'Contenir',
      fitStretch: 'Étirer', fitTile: 'Répéter',
      downloadPng: 'Télécharger le PNG', copySceneUrl: 'Copier l\\'URL de la scène', openServer: 'Rendu serveur',
      properties: 'Propriétés', selectLayer: 'Choisis un calque, ou ajoute un personnage.',
      scale: 'Taille', opacity: 'Opacité', duplicate: 'Dupliquer', delete: 'Supprimer',
      figure: 'Figure', openWardrobe: 'Changer de vêtements', bodyDir: 'Direction du corps', headDir: 'Direction de la tête',
      action: 'Action', none: 'Aucune', walk: 'Marche', sit: 'Assis', lay: 'Allongé', wave: 'Salue',
      drink: 'Boit', carry: 'Tient', expression: 'Expression', gestureNormal: 'Normale',
      gestureSmile: 'Sourire', gestureSad: 'Triste', gestureAngry: 'En colère', gestureSurprised: 'Surprise',
      size: 'Taille', sizeSmall: 'Petite', sizeNormal: 'Normale', sizeLarge: 'Grande',
      effect: 'Effet', crop: 'Cadrage', fullBody: 'Corps entier', headOnly: 'Tête seule',
      message: 'Message', msgPh: 'Laisse vide pour ne pas afficher de bulle', textColor: 'Couleur du texte',
      bubbleColor: 'Couleur de la bulle', text: 'Texte', fontSize: 'Taille du texte',
      playerName: 'Pseudo du joueur', usernamePh: 'Pseudo…', load: 'Charger',
      backToPanel: 'Retour au panel', logout: 'Se déconnecter',
      character: 'Personnage', image: 'Image',
      copied: 'Copié !', linkCopied: 'Lien copié !',
      copyDenied: 'Copie refusée par le navigateur (HTTPS requis).',
      searching: 'Recherche de {name}…', loaded: 'Tenue de {name} chargée.',
      notFound: 'Joueur introuvable.', lookupDown: 'Recherche indisponible.',
      maxLayers: 'Limite atteinte : {n} calques maximum.',
      taintedCanvas: 'Le navigateur a bloqué l\\'export à cause d\\'une image externe. Utilise le rendu serveur.',
      hostsHint: 'Le rendu serveur autorise : {hosts}',
      hostsNone: "Le rendu serveur n'autorise aucune image externe (rien de configuré).",
      hostBlocked: "Cet hébergeur d'image est refusé par le serveur pour des raisons de sécurité. Autorisés : {hosts}. L'image sera absente du PNG et de l'URL de la scène.",
      hostBlockedNone: "Aucun hébergeur d'image n'est encore autorisé : les images externes resteront absentes du PNG et de l'URL de la scène. Renseigne AVATAR_IMAGING_SCENE_IMAGE_HOSTS.",
      importFile: "Importer depuis mon ordinateur",
      localOnly: "L'image importée est bien dans l'aperçu et dans le PNG téléchargé, mais elle ne peut pas voyager dans l'URL de la scène : le serveur ne la reçoit jamais.",
      fileTooBig: 'Ce fichier dépasse 4 Mo.',
      fileFailed: 'Impossible de lire ce fichier.',
      animateScene: 'Animer la scène',
      animateHint: "Les danses, effets et gestes s'animent. C'est le serveur qui rend, donc les images importées sont laissées de côté.",
      downloadApng: "Télécharger l'animation",
      rendering: 'Rendu sur le serveur…',
      renderFailed: 'Le rendu serveur a échoué.',
      zoom: 'Zoom',
      resetBg: 'Recentrer le fond',
      bgDragHint: "Tu peux aussi déplacer le fond directement à la souris sur la zone de travail.",
      smoothImages: 'Lisser les images importées',
      smoothHint: "Évite un fond pixelisé quand il est réduit. Les avatars restent toujours nets au pixel près.",
      typeface: 'Police',
      plainText: 'Texte simple',
      letterSpacing: 'Espacement',
      bubbleStyle: 'Style de bulle',
      bubblePlain: 'Couleur',
      emptyScene: 'Aucun calque pour le moment.', exported: 'Image téléchargée.',
      wardrobe: 'Vestiaire', close: 'Fermer', showHc: 'Afficher les HC', removeItem: 'Retirer',
      genderAll: 'Tous', genderMale: 'Homme', genderFemale: 'Femme',
      noItems: 'Rien avec ces filtres.', loading: 'Chargement…',
      wardrobeDown: 'Vestiaire indisponible.',
      cat_hd: 'Visage', cat_hr: 'Cheveux', cat_ha: 'Chapeau', cat_he: 'Accessoire de tête', cat_ea: 'Lunettes',
      cat_fa: 'Accessoire de visage', cat_ch: 'Haut', cat_cc: 'Manteau', cat_cp: 'Motif', cat_ca: 'Accessoire de torse',
      cat_wa: 'Ceinture', cat_lg: 'Pantalon', cat_sh: 'Chaussures'
    },
    de: {
      layers: 'Ebenen', addAvatar: 'Figur hinzufügen', addImage: 'Bild', addText: 'Text',
      canvas: 'Arbeitsfläche', width: 'Breite', height: 'Höhe', background: 'Hintergrund',
      bgNone: 'Transparent', bgColor: 'Einfarbig', bgImage: 'Bild', colour: 'Farbe',
      imageUrl: 'Bild-URL', fit: 'Anpassung', fitCover: 'Füllen', fitContain: 'Einpassen',
      fitStretch: 'Strecken', fitTile: 'Kacheln',
      downloadPng: 'PNG herunterladen', copySceneUrl: 'Szenen-URL kopieren', openServer: 'Server-Render',
      properties: 'Eigenschaften', selectLayer: 'Wähle eine Ebene oder füge eine Figur hinzu.',
      scale: 'Größe', opacity: 'Deckkraft', duplicate: 'Duplizieren', delete: 'Löschen',
      figure: 'Figur', openWardrobe: 'Kleidung ändern', bodyDir: 'Körperrichtung', headDir: 'Kopfrichtung',
      action: 'Aktion', none: 'Keine', walk: 'Gehen', sit: 'Sitzen', lay: 'Liegen', wave: 'Winken',
      drink: 'Trinken', carry: 'Halten', expression: 'Ausdruck', gestureNormal: 'Normal',
      gestureSmile: 'Lächeln', gestureSad: 'Traurig', gestureAngry: 'Wütend', gestureSurprised: 'Überrascht',
      size: 'Größe', sizeSmall: 'Klein', sizeNormal: 'Normal', sizeLarge: 'Groß',
      effect: 'Effekt', crop: 'Ausschnitt', fullBody: 'Ganzer Körper', headOnly: 'Nur Kopf',
      message: 'Nachricht', msgPh: 'Leer lassen für keine Sprechblase', textColor: 'Textfarbe',
      bubbleColor: 'Blasenfarbe', text: 'Text', fontSize: 'Schriftgröße',
      playerName: 'Spielername', usernamePh: 'Spielername…', load: 'Laden',
      backToPanel: 'Zurück zum Panel', logout: 'Abmelden',
      character: 'Figur', image: 'Bild',
      copied: 'Kopiert!', linkCopied: 'Link kopiert!',
      copyDenied: 'Kopieren vom Browser blockiert (HTTPS erforderlich).',
      searching: 'Suche nach {name}…', loaded: 'Outfit von {name} geladen.',
      notFound: 'Spieler nicht gefunden.', lookupDown: 'Suche nicht verfügbar.',
      maxLayers: 'Grenze erreicht: maximal {n} Ebenen.',
      taintedCanvas: 'Der Browser hat den Export wegen eines externen Bildes blockiert. Nutze den Server-Render.',
      hostsHint: 'Server-Render erlaubt: {hosts}', hostsNone: 'Server-Render erlaubt keine externen Bilder (nichts konfiguriert).',
      hostBlocked: 'Dieser Bild-Host wird vom Server aus Sicherheitsgründen abgelehnt. Erlaubt: {hosts}. Das Bild fehlt im PNG und in der Szenen-URL.',
      hostBlockedNone: 'Noch kein Bild-Host erlaubt, externe Bilder fehlen daher im PNG und in der Szenen-URL. Setze AVATAR_IMAGING_SCENE_IMAGE_HOSTS.',
      importFile: 'Von meinem Computer importieren',
      localOnly: 'Das importierte Bild ist in der Vorschau und im PNG-Download, kann aber nicht in der Szenen-URL mitreisen — der Server erhält es nie.',
      fileTooBig: 'Diese Datei ist größer als 4 MB.',
      fileFailed: 'Diese Datei konnte nicht gelesen werden.',
      animateScene: 'Szene animieren',
      animateHint: 'Tänze, Effekte und Gesten laufen ab. Der Server rendert, importierte Bilder bleiben daher außen vor.',
      downloadApng: 'Animation herunterladen',
      rendering: 'Wird auf dem Server gerendert…',
      renderFailed: 'Server-Render fehlgeschlagen.',
      zoom: 'Zoom',
      resetBg: 'Hintergrund zentrieren',
      bgDragHint: 'Du kannst den Hintergrund auch direkt auf der Fläche ziehen.',
      smoothImages: 'Importierte Bilder glätten',
      smoothHint: 'Verhindert einen pixeligen Hintergrund beim Verkleinern. Avatare bleiben immer pixelscharf.',
      typeface: 'Schriftart',
      plainText: 'Einfacher Text',
      letterSpacing: 'Zeichenabstand',
      bubbleStyle: 'Blasenstil',
      bubblePlain: 'Farbe',
      emptyScene: 'Noch keine Ebene.', exported: 'Bild heruntergeladen.',
      wardrobe: 'Kleiderschrank', close: 'Schließen', showHc: 'HC anzeigen', removeItem: 'Entfernen',
      genderAll: 'Alle', genderMale: 'Männlich', genderFemale: 'Weiblich',
      noItems: 'Nichts mit diesen Filtern.', loading: 'Lädt…',
      wardrobeDown: 'Kleiderschrank nicht verfügbar.',
      cat_hd: 'Gesicht', cat_hr: 'Haare', cat_ha: 'Hut', cat_he: 'Kopf-Accessoire', cat_ea: 'Brille',
      cat_fa: 'Gesichts-Accessoire', cat_ch: 'Oberteil', cat_cc: 'Mantel', cat_cp: 'Aufdruck', cat_ca: 'Brust-Accessoire',
      cat_wa: 'Gürtel', cat_lg: 'Hose', cat_sh: 'Schuhe'
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

  function applyLang() {
    document.documentElement.lang = LANG;
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) { nodes[i].textContent = t(nodes[i].getAttribute('data-i18n')); }
    nodes = document.querySelectorAll('[data-i18n-ph]');
    for (var j = 0; j < nodes.length; j++) { nodes[j].setAttribute('placeholder', t(nodes[j].getAttribute('data-i18n-ph'))); }
    var sel = $('langSel');
    if (sel) { sel.value = LANG; }
    var dl = $('dlPng');
    if (dl) { dl.textContent = t(scene.a ? 'downloadApng' : 'downloadPng'); }
    renderLayerList();
    updateHostHint();
  }

  window.applyLang = applyLang;

  var $msg = $('msg');

  function setMsg(cls, text) {
    $msg.textContent = '';
    if (!text) { return; }
    var span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    $msg.appendChild(span);
  }

  var scene = {
    w: 700,
    h: 420,
    a: 0,
    smooth: 1,
    bg: { c: null, i: null, m: 'cover', x: 0, y: 0, s: 100 },
    l: []
  };

  var selected = null;
  var seq = 0;

  function qs(p) {
    return Object.keys(p).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
    }).join('&');
  }

  function avatarUrl(layer, override) {
    var p = {
      figure: layer.figure,
      direction: layer.direction,
      head_direction: layer.head_direction,
      gesture: layer.gesture || 'std',
      size: layer.size || 'n',
      img_format: scene.a ? 'auto' : 'png'
    };
    if (layer.action) { p.action = layer.action; }
    if (layer.headonly) { p.headonly = 1; }
    if (layer.effect > 0) { p.effect = layer.effect; }
    if (layer.dance > 0) { p.dance = layer.dance; }
    if (layer.frame_num > 0) { p.frame_num = layer.frame_num; }
    if (layer.text) {
      p.text = layer.text;
      p.text_color = layer.text_color;
      if (BUBBLES && layer.bubble) { p.bubble = layer.bubble; }
      else { p.bubble_color = layer.bubble_color; }
    }
    if (override) { Object.keys(override).forEach(function (k) { p[k] = override[k]; }); }
    var q = qs(p);
    if (API_KEY) { q += '&key=' + encodeURIComponent(API_KEY); }
    return IMAGER + '?' + q;
  }

${ LAYOUT_JS }

  var FONTS = {};
  var FONT_IMG = {};

  function fontUrl(id) {
    return BASE + '/fonts/' + id + '.png' + (TOKEN ? '?token=' + encodeURIComponent(TOKEN) : '');
  }

  function fontImage(id) {
    if (FONT_IMG[id]) { return FONT_IMG[id]; }
    var img = new Image();
    img.onload = function () { draw(); };
    img.src = fontUrl(id);
    FONT_IMG[id] = img;
    return img;
  }

  function loadFonts() {
    if (!FONTS_ON) { return; }
    fetch(BASE + '/fonts' + (TOKEN ? '?token=' + encodeURIComponent(TOKEN) : ''), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !d.fonts) { return; }
        var sel = $('pFont');
        d.fonts.forEach(function (font) {
          FONTS[font.id] = font;
          var o = document.createElement('option');
          o.value = font.id;
          o.textContent = font.name;
          sel.appendChild(o);
        });
      })
      .catch(function () {});
  }

  function paintTextLayer(canvas, layer) {
    var font = FONTS[layer.font];
    if (!font) { return false; }
    var img = fontImage(layer.font);
    if (!img.complete || !img.naturalWidth) { return false; }

    var laid = layoutHabboText(font, layer.v, { size: layer.fs, spacing: layer.sp });
    canvas.width = laid.width;
    canvas.height = laid.height;
    var c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    laid.glyphs.forEach(function (g) {
      c.drawImage(img, g.sx, g.sy, g.sw, g.sh, g.dx, g.dy, g.dw, g.dh);
    });
    return true;
  }

  function toggleTextFields() {
    var habbo = selected && selected.t === 't' && !!selected.font;
    $('colourField').style.display = habbo ? 'none' : '';
    $('spacingField').style.display = habbo ? '' : 'none';
  }

  var bgSize = { url: null, w: 0, h: 0 };

  function measureBg(done) {
    if (bgSize.url === scene.bg.i) { done(bgSize.w, bgSize.h); return; }
    var probe = new Image();
    probe.onload = function () {
      bgSize = { url: scene.bg.i, w: probe.naturalWidth, h: probe.naturalHeight };
      done(bgSize.w, bgSize.h);
    };
    probe.onerror = function () { done(0, 0); };
    probe.src = proxied(scene.bg.i);
  }

  function setSmoothing(ctx, on) {
    ctx.imageSmoothingEnabled = on;
    if ('imageSmoothingQuality' in ctx) { ctx.imageSmoothingQuality = on ? 'high' : 'low'; }
  }

  function isData(url) {
    return String(url || '').slice(0, 5) === 'data:';
  }

  function hostOk(url) {
    if (!url) { return true; }
    if (isData(url)) { return true; }
    try {
      var u = new URL(url, location.href);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') { return false; }
      if (u.origin === location.origin) { return true; }
      return HOSTS.some(function (h) { return u.hostname === h || u.hostname.endsWith('.' + h); });
    } catch (e) { return false; }
  }

  function proxied(url) {
    if (!url) { return ''; }
    if (isData(url)) { return url; }
    try {
      if (new URL(url, location.href).origin === location.origin) { return url; }
    } catch (e) { return ''; }
    return BASE + '/image?u=' + encodeURIComponent(url) + (TOKEN ? '&token=' + encodeURIComponent(TOKEN) : '');
  }

  function newAvatar() {
    return {
      id: ++seq, t: 'a', x: 40 + (scene.l.length % 5) * 30, y: 40, s: 100, o: 100,
      figure: START_FIGURE, action: '', gesture: 'std', direction: 2, head_direction: 2,
      headonly: 0, effect: 0, dance: 0, size: 'n', frame_num: 0,
      text: '', text_color: '000000', bubble_color: 'ffffff', bubble: ''
    };
  }

  function newImage() {
    return { id: ++seq, t: 'i', x: 40, y: 40, s: 100, o: 100, u: '' };
  }

  function newText() {
    return { id: ++seq, t: 't', x: 40, y: 40, s: 100, o: 100, v: 'Hello', c: '#16212f', fs: 22, b: 0, font: '', sp: 1 };
  }

  function layerLabel(layer) {
    if (layer.t === 'a') { return t('character') + ' ' + (scene.l.indexOf(layer) + 1); }
    if (layer.t === 'i') { return t('image'); }
    return layer.v.split('\\n')[0].slice(0, 24) || t('text');
  }

  function renderLayerList() {
    var host = $('layerList');
    host.textContent = '';

    if (!scene.l.length) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = t('emptyScene');
      host.appendChild(empty);
      return;
    }

    scene.l.slice().reverse().forEach(function (layer) {
      var row = document.createElement('div');
      row.className = 'lrow' + (selected === layer ? ' on' : '');

      var ico = document.createElement('div');
      ico.className = 'ico';
      if (layer.t === 'a') {
        var im = document.createElement('img');
        im.alt = '';
        im.src = avatarUrl(layer, { headonly: 1, size: 's', action: '', text: '', dance: 0, effect: 0 });
        ico.appendChild(im);
      } else {
        ico.textContent = layer.t === 'i' ? '▣' : 'T';
      }

      var nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = layerLabel(layer);

      var up = document.createElement('button');
      up.type = 'button';
      up.className = 'zz';
      up.textContent = '▲';
      up.addEventListener('click', function (e) { e.stopPropagation(); move(layer, 1); });

      var down = document.createElement('button');
      down.type = 'button';
      down.className = 'zz';
      down.textContent = '▼';
      down.addEventListener('click', function (e) { e.stopPropagation(); move(layer, -1); });

      row.appendChild(ico);
      row.appendChild(nm);
      row.appendChild(up);
      row.appendChild(down);
      row.addEventListener('click', function () { select(layer); });
      host.appendChild(row);
    });
  }

  function move(layer, delta) {
    var index = scene.l.indexOf(layer);
    var next = index + delta;
    if (next < 0 || next >= scene.l.length) { return; }
    scene.l.splice(index, 1);
    scene.l.splice(next, 0, layer);
    draw();
  }

  function select(layer) {
    selected = layer;
    fillProps();
    markSelected();
    renderLayerList();
  }

  function markSelected() {
    var nodes = $stage.querySelectorAll('.lyr');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('sel', scene.l[parseInt(nodes[i].dataset.idx, 10)] === selected);
    }
  }

  function fillProps() {
    var has = !!selected;
    $('noSel').style.display = has ? 'none' : '';
    $('propBody').style.display = has ? '' : 'none';
    if (!has) { return; }

    $('pX').value = Math.round(selected.x);
    $('pY').value = Math.round(selected.y);
    $('pS').value = selected.s;
    $('pSVal').textContent = selected.s + '%';
    $('pO').value = selected.o;
    $('pOVal').textContent = selected.o + '%';

    $('avatarProps').style.display = selected.t === 'a' ? '' : 'none';
    $('imageProps').style.display = selected.t === 'i' ? '' : 'none';
    $('textProps').style.display = selected.t === 't' ? '' : 'none';

    if (selected.t === 'a') {
      $('pFigure').value = selected.figure;
      $('pGesture').value = selected.gesture;
      $('pSize').value = selected.size;
      $('pEffect').value = selected.effect;
      $('pCrop').value = String(selected.headonly);
      $('pText').value = selected.text;
      $('pTextColor').value = '#' + selected.text_color;
      $('pBubbleColor').value = '#' + selected.bubble_color;
      if (BUBBLES) { $('pBubble').value = selected.bubble || ''; paintBubbleUi(); }
      paintDirs();
      var chips = document.querySelectorAll('#pActs .chip');
      for (var i = 0; i < chips.length; i++) {
        chips[i].classList.toggle('on', chips[i].dataset.act === selected.action);
      }
    } else if (selected.t === 'i') {
      $('pUrl').value = selected.u;
    } else {
      $('pTxt').value = selected.v;
      $('pFs').value = selected.fs;
      $('pTc').value = selected.c;
      $('pFont').value = selected.font || '';
      $('pSp').value = selected.sp;
      toggleTextFields();
    }
  }

  function buildDirs() {
    [['pDirs', 'direction'], ['pHeadDirs', 'head_direction']].forEach(function (pair) {
      var host = $(pair[0]);
      for (var d = 0; d < 8; d++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dirBtn';
        b.dataset.dir = d;
        b.dataset.kind = pair[1];
        b.textContent = d;
        b.addEventListener('click', function () {
          if (!selected || selected.t !== 'a') { return; }
          selected[this.dataset.kind] = parseInt(this.dataset.dir, 10);
          paintDirs();
          draw();
        });
        host.appendChild(b);
      }
    });
  }

  function paintDirs() {
    var all = document.querySelectorAll('.dirBtn');
    for (var i = 0; i < all.length; i++) {
      var b = all[i];
      b.classList.toggle('on', selected && selected.t === 'a' &&
        selected[b.dataset.kind] === parseInt(b.dataset.dir, 10));
    }
  }

  var $stage = $('stage');

  function draw() {
    $stage.style.width = scene.w + 'px';
    $stage.style.height = scene.h + 'px';
    $stage.style.background = scene.bg.c || 'transparent';
    if (scene.bg.i) {
      var zoom = (scene.bg.s || 100) / 100;
      $stage.style.backgroundImage = 'url("' + proxied(scene.bg.i).replace(/"/g, '%22') + '")';
      $stage.style.backgroundRepeat = scene.bg.m === 'tile' ? 'repeat' : 'no-repeat';
      $stage.style.imageRendering = scene.smooth !== 0 ? 'auto' : 'pixelated';
      $stage.style.backgroundPosition = scene.bg.m === 'tile'
        ? scene.bg.x + 'px ' + scene.bg.y + 'px'
        : 'calc(50% + ' + scene.bg.x + 'px) calc(50% + ' + scene.bg.y + 'px)';

      if (scene.bg.m === 'stretch') {
        $stage.style.backgroundSize = (100 * zoom) + '% ' + (100 * zoom) + '%';
      } else if (scene.bg.m === 'tile') {
        measureBg(function (w, h) {
          $stage.style.backgroundSize = w ? Math.max(1, w * zoom) + 'px ' + Math.max(1, h * zoom) + 'px' : 'auto';
        });
      } else if (zoom === 1) {
        $stage.style.backgroundSize = scene.bg.m;
      } else {
        measureBg(function (w, h) {
          if (!w) { $stage.style.backgroundSize = scene.bg.m; return; }
          var ratio = (scene.bg.m === 'contain'
            ? Math.min(scene.w / w, scene.h / h)
            : Math.max(scene.w / w, scene.h / h)) * zoom;
          $stage.style.backgroundSize = (w * ratio) + 'px ' + (h * ratio) + 'px';
        });
      }
    } else {
      $stage.style.backgroundImage = 'none';
    }

    $stage.textContent = '';

    scene.l.forEach(function (layer, index) {
      var node = document.createElement('div');
      node.className = 'lyr' + (selected === layer ? ' sel' : '');
      node.dataset.idx = index;
      node.style.left = layer.x + 'px';
      node.style.top = layer.y + 'px';
      node.style.opacity = layer.o / 100;
      node.style.transform = 'scale(' + (layer.s / 100) + ')';

      if (layer.t === 't') {
        if (layer.font) {
          var glyphCanvas = document.createElement('canvas');
          glyphCanvas.style.display = 'block';
          glyphCanvas.style.imageRendering = 'pixelated';
          if (!paintTextLayer(glyphCanvas, layer)) {
            glyphCanvas.width = Math.max(40, layer.fs * 4);
            glyphCanvas.height = layer.fs;
          }
          node.appendChild(glyphCanvas);
        } else {
          var span = document.createElement('div');
          span.className = 'txt';
          span.style.font = (layer.b ? 'bold ' : '') + layer.fs + 'px sans-serif';
          span.style.color = layer.c;
          span.style.lineHeight = '1.25';
          span.textContent = layer.v;
          node.appendChild(span);
        }
      } else {
        var img = document.createElement('img');
        img.alt = '';
        img.crossOrigin = 'anonymous';
        if (layer.t === 'a') { img.src = avatarUrl(layer); } else if (layer.u) { img.src = proxied(layer.u); }
        img.addEventListener('load', updateUrl);
        node.appendChild(img);
      }

      node.addEventListener('pointerdown', function (e) { startDrag(e, layer, node); });
      $stage.appendChild(node);
    });

    renderLayerList();
    updateUrl();
    checkHosts();
  }

  function startDrag(e, layer, node) {
    if (e.button !== undefined && e.button !== 0) { return; }
    e.preventDefault();
    select(layer);
    var startX = e.clientX;
    var startY = e.clientY;
    var originX = layer.x;
    var originY = layer.y;
    node.classList.add('dragging');
    node.setPointerCapture(e.pointerId);

    function onMove(ev) {
      layer.x = Math.round(originX + (ev.clientX - startX));
      layer.y = Math.round(originY + (ev.clientY - startY));
      node.style.left = layer.x + 'px';
      node.style.top = layer.y + 'px';
      $('pX').value = layer.x;
      $('pY').value = layer.y;
    }

    function onUp(ev) {
      node.classList.remove('dragging');
      try { node.releasePointerCapture(ev.pointerId); } catch (err) {}
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
      updateUrl();
    }

    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', onUp);
  }

  function payload() {
    return {
      w: scene.w,
      h: scene.h,
      a: scene.a,
      smooth: scene.smooth,
      bg: {
        c: scene.bg.c,
        i: isData(scene.bg.i) ? null : scene.bg.i,
        m: scene.bg.m,
        x: scene.bg.x,
        y: scene.bg.y,
        s: scene.bg.s
      },
      l: scene.l.filter(function (layer) {
        return !(layer.t === 'i' && isData(layer.u));
      }).map(function (layer) {
        var copy = {};
        Object.keys(layer).forEach(function (k) { if (k !== 'id') { copy[k] = layer[k]; } });
        return copy;
      })
    };
  }

  function hasLocalImage() {
    if (isData(scene.bg.i)) { return true; }
    return scene.l.some(function (layer) { return layer.t === 'i' && isData(layer.u); });
  }

  function readFile(input, apply) {
    var file = input.files && input.files[0];
    if (!file) { return; }
    if (file.size > 4 * 1024 * 1024) { setMsg('err', t('fileTooBig')); return; }
    var reader = new FileReader();
    reader.onload = function () { apply(String(reader.result)); };
    reader.onerror = function () { setMsg('err', t('fileFailed')); };
    reader.readAsDataURL(file);
    input.value = '';
  }

  function encodePayload() {
    var json = JSON.stringify(payload());
    var bytes = new TextEncoder().encode(json);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
  }

  function sceneLink() {
    var q = 's=' + encodePayload();
    if (API_KEY) { q += '&key=' + encodeURIComponent(API_KEY); }
    var lower = String(SCENE_URL || '').toLowerCase();
    var isAbs = lower.indexOf('http://') === 0 || lower.indexOf('https://') === 0;
    var base = isAbs ? SCENE_URL : (PUBLIC || location.origin) + SCENE_URL;
    return base + '?' + q;
  }

  function updateUrl() {
    if (!scene.l.length) {
      $('sceneUrlBox').textContent = t('emptyScene');
      $('openScene').removeAttribute('href');
      return;
    }
    var url = sceneLink();
    $('sceneUrlBox').textContent = url;
    $('openScene').href = url;
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('image failed')); };
      img.src = src;
    });
  }

  async function exportPng() {
    if (!scene.l.length) { return; }
    var canvas = document.createElement('canvas');
    canvas.width = scene.w;
    canvas.height = scene.h;
    var ctx = canvas.getContext('2d');

    if (scene.bg.c) {
      ctx.fillStyle = scene.bg.c;
      ctx.fillRect(0, 0, scene.w, scene.h);
    }

    if (scene.bg.i) {
      try {
        var bg = await loadImage(proxied(scene.bg.i));
        var z = (scene.bg.s || 100) / 100;
        var ox = scene.bg.x || 0;
        var oy = scene.bg.y || 0;
        ctx.save();
        setSmoothing(ctx, scene.smooth !== 0);
        if (scene.bg.m === 'tile') {
          var tw = Math.max(1, bg.width * z);
          var th = Math.max(1, bg.height * z);
          var sx = ((ox % tw) + tw) % tw - tw;
          var sy = ((oy % th) + th) % th - th;
          for (var y = sy; y < scene.h; y += th) {
            for (var x = sx; x < scene.w; x += tw) { ctx.drawImage(bg, x, y, tw, th); }
          }
        } else {
          ctx.translate(ox, oy);
          if (scene.bg.m === 'stretch') {
            ctx.drawImage(bg, 0, 0, scene.w * z, scene.h * z);
          } else {
            var ratio = (scene.bg.m === 'contain'
              ? Math.min(scene.w / bg.width, scene.h / bg.height)
              : Math.max(scene.w / bg.width, scene.h / bg.height)) * z;
            ctx.drawImage(bg, (scene.w - bg.width * ratio) / 2, (scene.h - bg.height * ratio) / 2,
              bg.width * ratio, bg.height * ratio);
          }
        }
        ctx.restore();
      } catch (e) {}
    }

    for (var i = 0; i < scene.l.length; i++) {
      var layer = scene.l[i];
      ctx.save();
      ctx.globalAlpha = layer.o / 100;
      ctx.translate(layer.x, layer.y);
      var scale = layer.s / 100;

      if (layer.t === 't') {
        ctx.scale(scale, scale);

        if (layer.font && FONTS[layer.font]) {
          var glyphCanvas = document.createElement('canvas');
          if (paintTextLayer(glyphCanvas, layer)) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(glyphCanvas, 0, 0);
          }
          ctx.restore();
          continue;
        }

        ctx.font = (layer.b ? 'bold ' : '') + layer.fs + 'px sans-serif';
        ctx.fillStyle = layer.c;
        ctx.textBaseline = 'top';
        layer.v.split('\\n').forEach(function (line, index) {
          ctx.fillText(line, 0, index * layer.fs * 1.25);
        });
        ctx.restore();
        continue;
      }

      try {
        var src = layer.t === 'a' ? avatarUrl(layer) : proxied(layer.u);
        if (!src) { ctx.restore(); continue; }
        var image = await loadImage(src);
        setSmoothing(ctx, layer.t === 'i' && scene.smooth !== 0);
        ctx.drawImage(image, 0, 0, image.width * scale, image.height * scale);
      } catch (e) {}

      ctx.restore();
    }

    try {
      var link = document.createElement('a');
      link.download = 'scene.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      setMsg('ok', t('exported'));
    } catch (e) {
      setMsg('err', t('taintedCanvas'));
    }
  }

  function copy(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { setMsg('err', t('copyDenied')); });
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function updateHostHint() {
    var hint = $('hostHint');
    if (hint) {
      hint.textContent = HOSTS.length ? t('hostsHint', { hosts: HOSTS.join(', ') }) : t('hostsNone');
    }
    checkHosts();
  }

  function checkHosts() {
    var bad = [];
    if (scene.bg.i && !hostOk(scene.bg.i)) { bad.push(scene.bg.i); }
    scene.l.forEach(function (layer) {
      if (layer.t === 'i' && layer.u && !hostOk(layer.u)) { bad.push(layer.u); }
    });

    var warn = $('hostWarn');
    if (!bad.length) {
      if (hasLocalImage()) {
        warn.style.display = '';
        warn.textContent = t('localOnly');
      } else {
        warn.style.display = 'none';
      }
      return;
    }
    warn.style.display = '';
    warn.textContent = HOSTS.length
      ? t('hostBlocked', { hosts: HOSTS.join(', ') })
      : t('hostBlockedNone');
  }

  function addLayer(layer) {
    if (scene.l.length >= MAX_LAYERS) {
      setMsg('err', t('maxLayers', { n: MAX_LAYERS }));
      return;
    }
    scene.l.push(layer);
    selected = layer;
    fillProps();
    draw();
  }

  $('addAvatar').addEventListener('click', function () { addLayer(newAvatar()); });
  $('addImage').addEventListener('click', function () { addLayer(newImage()); });
  $('addText').addEventListener('click', function () { addLayer(newText()); });

  $('pDel').addEventListener('click', function () {
    if (!selected) { return; }
    scene.l.splice(scene.l.indexOf(selected), 1);
    selected = null;
    fillProps();
    draw();
  });

  $('pDup').addEventListener('click', function () {
    if (!selected) { return; }
    var copyLayer = JSON.parse(JSON.stringify(selected));
    copyLayer.id = ++seq;
    copyLayer.x += 24;
    copyLayer.y += 12;
    addLayer(copyLayer);
  });

  ['pX', 'pY'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      if (!selected) { return; }
      selected[id === 'pX' ? 'x' : 'y'] = parseInt(this.value, 10) || 0;
      draw();
    });
  });

  $('pS').addEventListener('input', function () {
    if (!selected) { return; }
    selected.s = parseInt(this.value, 10);
    $('pSVal').textContent = selected.s + '%';
    draw();
  });

  $('pO').addEventListener('input', function () {
    if (!selected) { return; }
    selected.o = parseInt(this.value, 10);
    $('pOVal').textContent = selected.o + '%';
    draw();
  });

  var figTimer = null;
  $('pFigure').addEventListener('input', function () {
    if (!selected || selected.t !== 'a') { return; }
    selected.figure = this.value.trim();
    clearTimeout(figTimer);
    figTimer = setTimeout(draw, 350);
  });

  ['pGesture', 'pSize', 'pCrop'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      if (!selected || selected.t !== 'a') { return; }
      if (id === 'pGesture') { selected.gesture = this.value; }
      if (id === 'pSize') { selected.size = this.value; }
      if (id === 'pCrop') { selected.headonly = parseInt(this.value, 10); }
      draw();
    });
  });

  $('pEffect').addEventListener('input', function () {
    if (!selected || selected.t !== 'a') { return; }
    selected.effect = parseInt(this.value, 10) || 0;
    clearTimeout(figTimer);
    figTimer = setTimeout(draw, 350);
  });

  $('pText').addEventListener('input', function () {
    if (!selected || selected.t !== 'a') { return; }
    selected.text = this.value;
    clearTimeout(figTimer);
    figTimer = setTimeout(function () { paintBubbleUi(); draw(); }, 400);
  });

  ['pTextColor', 'pBubbleColor'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      if (!selected || selected.t !== 'a') { return; }
      selected[id === 'pTextColor' ? 'text_color' : 'bubble_color'] = this.value.replace('#', '');
      paintBubbleUi();
      draw();
    });
  });

  var acts = document.querySelectorAll('#pActs .chip');
  for (var a = 0; a < acts.length; a++) {
    acts[a].addEventListener('click', function () {
      if (!selected || selected.t !== 'a') { return; }
      for (var k = 0; k < acts.length; k++) { acts[k].classList.remove('on'); }
      this.classList.add('on');
      selected.action = this.dataset.act;
      draw();
    });
  }

  var urlTimer = null;
  $('pUrl').addEventListener('input', function () {
    if (!selected || selected.t !== 'i') { return; }
    selected.u = this.value.trim();
    clearTimeout(urlTimer);
    urlTimer = setTimeout(draw, 400);
  });

  var txtTimer = null;
  $('pTxt').addEventListener('input', function () {
    if (!selected || selected.t !== 't') { return; }
    selected.v = this.value;
    clearTimeout(txtTimer);
    txtTimer = setTimeout(draw, 250);
  });

  $('pFs').addEventListener('input', function () {
    if (!selected || selected.t !== 't') { return; }
    selected.fs = parseInt(this.value, 10) || 20;
    draw();
  });

  function bubblePreviewUrl(layer) {
    return BASE + '/bubble.png?id=' + encodeURIComponent(layer.bubble) +
      '&text=' + encodeURIComponent((layer.text || 'Aa').slice(0, 60)) +
      '&text_color=' + encodeURIComponent(layer.text_color || '000000') +
      '&scale=2' +
      (TOKEN ? '&token=' + encodeURIComponent(TOKEN) : '');
  }

  function paintBubbleUi() {
    if (!BUBBLES || !selected || selected.t !== 'a') { return; }
    var chosen = !!selected.bubble;
    $('pBubbleColorField').style.display = chosen ? 'none' : '';
    var host = $('pBubblePreview');
    host.textContent = '';
    if (!chosen) { return; }
    var img = document.createElement('img');
    img.alt = '';
    img.style.imageRendering = 'pixelated';
    img.style.maxWidth = '100%';
    img.style.zoom = '0.5';
    img.src = bubblePreviewUrl(selected);
    host.appendChild(img);
  }

  function loadBubbles() {
    if (!BUBBLES) { return; }
    $('pBubbleField').style.display = '';
    fetch(BASE + '/bubbles' + (TOKEN ? '?token=' + encodeURIComponent(TOKEN) : ''), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) { return; }
        var sel = $('pBubble');
        d.bubbles.forEach(function (b) {
          var o = document.createElement('option');
          o.value = b.id;
          o.textContent = '#' + b.id;
          sel.appendChild(o);
        });
      })
      .catch(function () {});
  }

  if (BUBBLES) {
    $('pBubble').addEventListener('change', function () {
      if (!selected || selected.t !== 'a') { return; }
      selected.bubble = this.value;
      paintBubbleUi();
      draw();
    });
  }

  $('pFont').addEventListener('change', function () {
    if (!selected || selected.t !== 't') { return; }
    selected.font = this.value;
    toggleTextFields();
    draw();
  });

  $('pSp').addEventListener('input', function () {
    if (!selected || selected.t !== 't') { return; }
    selected.sp = parseInt(this.value, 10) || 0;
    draw();
  });

  $('pTc').addEventListener('change', function () {
    if (!selected || selected.t !== 't') { return; }
    selected.c = this.value;
    draw();
  });

  ['cvW', 'cvH'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      var n = parseInt(this.value, 10);
      if (!n || n < 32) { return; }
      scene[id === 'cvW' ? 'w' : 'h'] = Math.min(n, 2000);
      draw();
    });
  });

  $('bgMode').addEventListener('change', function () {
    $('bgColorField').style.display = this.value === 'color' ? '' : 'none';
    $('bgImageField').style.display = this.value === 'image' ? '' : 'none';
    scene.bg.c = this.value === 'color' ? val('bgColor') : null;
    scene.bg.i = this.value === 'image' ? val('bgUrl').trim() || null : null;
    draw();
  });

  $('bgColor').addEventListener('change', function () {
    if (val('bgMode') !== 'color') { return; }
    scene.bg.c = this.value;
    draw();
  });

  var bgTimer = null;
  $('bgUrl').addEventListener('input', function () {
    if (val('bgMode') !== 'image') { return; }
    scene.bg.i = this.value.trim() || null;
    clearTimeout(bgTimer);
    bgTimer = setTimeout(draw, 400);
  });

  $('bgPick').addEventListener('click', function () { $('bgFile').click(); });
  $('bgFile').addEventListener('change', function () {
    readFile(this, function (dataUrl) {
      scene.bg.i = dataUrl;
      $('bgUrl').value = '';
      draw();
    });
  });

  $('imgPick').addEventListener('click', function () { $('imgFile').click(); });
  $('imgFile').addEventListener('change', function () {
    if (!selected || selected.t !== 'i') { return; }
    readFile(this, function (dataUrl) {
      selected.u = dataUrl;
      $('pUrl').value = '';
      draw();
    });
  });

  $('bgFit').addEventListener('change', function () {
    scene.bg.m = this.value;
    draw();
  });

  ['bgX', 'bgY'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      scene.bg[id === 'bgX' ? 'x' : 'y'] = parseInt(this.value, 10) || 0;
      draw();
    });
  });

  $('bgZoom').addEventListener('input', function () {
    scene.bg.s = parseInt(this.value, 10) || 100;
    $('bgZoomVal').textContent = scene.bg.s + '%';
    draw();
  });

  $('bgReset').addEventListener('click', function () {
    scene.bg.x = 0;
    scene.bg.y = 0;
    scene.bg.s = 100;
    $('bgX').value = 0;
    $('bgY').value = 0;
    $('bgZoom').value = 100;
    $('bgZoomVal').textContent = '100%';
    draw();
  });

  $stage.addEventListener('pointerdown', function (e) {
    if (e.target !== $stage || !scene.bg.i) { return; }
    e.preventDefault();
    var startX = e.clientX;
    var startY = e.clientY;
    var originX = scene.bg.x;
    var originY = scene.bg.y;
    $stage.setPointerCapture(e.pointerId);

    function onMove(ev) {
      scene.bg.x = Math.round(originX + (ev.clientX - startX));
      scene.bg.y = Math.round(originY + (ev.clientY - startY));
      $('bgX').value = scene.bg.x;
      $('bgY').value = scene.bg.y;
      draw();
    }

    function onUp(ev) {
      try { $stage.releasePointerCapture(ev.pointerId); } catch (err) {}
      $stage.removeEventListener('pointermove', onMove);
      $stage.removeEventListener('pointerup', onUp);
      $stage.removeEventListener('pointercancel', onUp);
    }

    $stage.addEventListener('pointermove', onMove);
    $stage.addEventListener('pointerup', onUp);
    $stage.addEventListener('pointercancel', onUp);
  });

  $('cvSmooth').addEventListener('change', function () {
    scene.smooth = this.checked ? 1 : 0;
    draw();
  });

  $('cvAnim').addEventListener('change', function () {
    scene.a = this.checked ? 1 : 0;
    $('dlPng').textContent = t(scene.a ? 'downloadApng' : 'downloadPng');
    draw();
  });

  $('dlPng').addEventListener('click', function () {
    if (!scene.l.length) { return; }

    if (!scene.a) { exportPng(); return; }

    setMsg('wait', t('rendering'));
    fetch(sceneLink())
      .then(function (r) { if (!r.ok) { return r.text().then(function (m) { throw new Error(m); }); } return r.blob(); })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.download = 'scene.png';
        link.href = url;
        link.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        setMsg('ok', t('exported'));
      })
      .catch(function (e) { setMsg('err', e.message || t('renderFailed')); });
  });
  $('copyScene').addEventListener('click', function () {
    if (!scene.l.length) { return; }
    copy(sceneLink(), function () { setMsg('ok', t('linkCopied')); });
  });

  $('langSel').addEventListener('change', function () {
    LANG = this.value;
    try { localStorage.setItem(LANG_KEY, LANG); } catch (e) {}
    applyLang();
  });

  var tokenQs = TOKEN ? '&token=' + encodeURIComponent(TOKEN) : '';

  if (LOOKUP) {
    $('userField').style.display = '';
    var $sug = $('sugList');
    var sugTimer = null;

    function hideSug() { $sug.style.display = 'none'; $sug.textContent = ''; }

    function useFigure(name, figure) {
      if (!selected || selected.t !== 'a') { return; }
      selected.figure = figure;
      $('pFigure').value = figure;
      setMsg('ok', t('loaded', { name: name }));
      hideSug();
      draw();
    }

    function doLookup() {
      var u = val('fUser').trim();
      if (!u || !selected || selected.t !== 'a') { return; }
      setMsg('wait', t('searching', { name: u }));
      fetch(BASE + '/look?username=' + encodeURIComponent(u) + tokenQs, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.ok && d.figure) { useFigure(d.username || u, d.figure); }
          else { setMsg('err', (d && d.error) || t('notFound')); }
        })
        .catch(function () { setMsg('err', t('lookupDown')); });
    }

    function suggest() {
      if (!SEARCH) { return; }
      var q = val('fUser').trim();
      if (q.length < 2) { hideSug(); return; }
      fetch(BASE + '/search?q=' + encodeURIComponent(q) + tokenQs, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok || !d.results || !d.results.length) { hideSug(); return; }
          $sug.textContent = '';
          d.results.forEach(function (row) {
            var li = document.createElement('button');
            li.type = 'button';
            li.className = 'sug';
            var im = document.createElement('img');
            im.alt = '';
            im.src = avatarUrl({ figure: row.figure, direction: 2, head_direction: 2, size: 's' }, { headonly: 1 });
            var sp = document.createElement('span');
            sp.textContent = row.username;
            li.appendChild(im);
            li.appendChild(sp);
            li.addEventListener('click', function () {
              $('fUser').value = row.username;
              useFigure(row.username, row.figure);
            });
            $sug.appendChild(li);
          });
          $sug.style.display = 'block';
        })
        .catch(hideSug);
    }

    $('fetchLook').addEventListener('click', doLookup);
    $('fUser').addEventListener('input', function () {
      clearTimeout(sugTimer);
      sugTimer = setTimeout(suggest, 250);
    });
    $('fUser').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); doLookup(); }
      if (e.key === 'Escape') { hideSug(); }
    });
    document.addEventListener('click', function (e) {
      if (!$('userField').contains(e.target)) { hideSug(); }
    });
  }

${ WARDROBE_JS }

  if (WARDROBE) {
    var wardrobe = createWardrobe({
      dataUrl: BASE + '/figuredata' + (TOKEN ? '?token=' + encodeURIComponent(TOKEN) : ''),
      thumbUrl: function (figure, head) {
        return avatarUrl({ figure: figure, direction: 2, head_direction: 2, size: 'n' },
          head ? { headonly: 1 } : { size: 's' });
      }
    });

    var openBtn = $('openWardrobe');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        if (!selected || selected.t !== 'a') { return; }
        wardrobe.open({
          figure: function () { return selected.figure; },
          apply: function (figure) {
            selected.figure = figure;
            $('pFigure').value = figure;
            draw();
          }
        });
      });
    }
  }

  buildDirs();
  loadFonts();
  loadBubbles();
  addLayer(newAvatar());
  applyLang();
  draw();
})();
</script>
</body>
</html>`;

export default renderScenePage;
