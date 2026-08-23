export const WARDROBE_CSS = `
.wdOverlay{position:fixed; inset:0; z-index:80; display:none; align-items:center; justify-content:center;
  background:rgba(16,32,54,.42); padding:22px}
.wdOverlay.open{display:flex}
.wdBox{background:var(--panel); border:1px solid var(--line); border-radius:14px; width:100%;
  max-width:1000px; max-height:88vh; display:flex; flex-direction:column; overflow:hidden;
  box-shadow:0 24px 60px -30px rgba(20,40,70,.6)}
.wdHead{display:flex; align-items:center; gap:12px; padding:14px 18px; border-bottom:1px solid var(--line)}
.wdHead h3{margin:0; font-family:var(--mono); font-size:12px; letter-spacing:.14em; text-transform:uppercase;
  color:var(--muted); font-weight:700}
.wdClose{margin-left:auto}
.wdBody{display:grid; grid-template-columns:210px 1fr; gap:0; min-height:0; flex:1}
@media(max-width:760px){.wdBody{grid-template-columns:1fr}}
.wdSide{border-right:1px solid var(--line); padding:14px; overflow:auto; background:var(--panel2)}
@media(max-width:760px){.wdSide{border-right:0; border-bottom:1px solid var(--line); max-height:180px}}
.wdCat{display:block; width:100%; text-align:left; border:1px solid transparent; background:none;
  border-radius:8px; padding:8px 10px; font-size:13px; color:var(--text); cursor:pointer; font-family:var(--body)}
.wdCat:hover{background:#fff; border-color:var(--line)}
.wdCat.on{background:var(--sky-soft); border-color:var(--sky); color:var(--sky-dark); font-weight:600}
.wdMain{display:flex; flex-direction:column; min-height:0}
.wdBar{display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:12px 16px; border-bottom:1px solid var(--line)}
.wdGrid{display:grid; grid-template-columns:repeat(auto-fill,minmax(74px,1fr)); gap:8px; padding:16px; overflow:auto}
.wdItem{position:relative; border:1px solid #dde8f2; border-radius:9px; background:#fff; cursor:pointer;
  padding:2px; height:88px; overflow:hidden; display:flex; align-items:center; justify-content:center}
.wdItem:hover{border-color:#b6d3ee}
.wdItem.on{border-color:var(--sky); background:var(--sky-soft); box-shadow:0 0 0 2px rgba(47,155,240,.18)}
.wdItem img{max-width:100%; max-height:100%; image-rendering:pixelated; display:block}
.wdItem img:not([src]){display:none}
.wdItem .hc{position:absolute; top:3px; right:4px; font-size:9px; font-weight:700; color:#c98a00}
.wdColors{display:flex; flex-wrap:wrap; gap:5px; padding:0 16px 14px}
.wdSwatch{width:22px; height:22px; border-radius:5px; border:1px solid rgba(20,40,70,.18); cursor:pointer; padding:0}
.wdSwatch.on{outline:2px solid var(--sky); outline-offset:1px}
.wdEmpty{padding:26px 16px; color:var(--muted); font-size:13px}
`;

export const WARDROBE_JS = `
function createWardrobe(opts) {
  var host = document.createElement('div');
  host.className = 'wdOverlay';
  host.innerHTML =
    '<div class="wdBox">' +
      '<div class="wdHead"><h3 data-i18n="wardrobe">Wardrobe</h3>' +
        '<button type="button" class="btn wdClose" data-i18n="close">Close</button></div>' +
      '<div class="wdBody">' +
        '<div class="wdSide" id="wdCats"></div>' +
        '<div class="wdMain">' +
          '<div class="wdBar">' +
            '<select id="wdGender" class="wdSel"></select>' +
            '<label style="display:flex;gap:6px;align-items:center;font-size:12.5px">' +
              '<input type="checkbox" id="wdHc" checked> <span data-i18n="showHc">Show HC</span></label>' +
            '<button type="button" class="btn" id="wdClear" data-i18n="removeItem">Remove</button>' +
          '</div>' +
          '<div class="wdColors" id="wdColors"></div>' +
          '<div class="wdGrid" id="wdGrid"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(host);

  var data = null;
  var cat = null;
  var target = null;
  var observer = null;

  var $g = host.querySelector('#wdGrid');
  var $c = host.querySelector('#wdColors');
  var $cats = host.querySelector('#wdCats');
  var $gender = host.querySelector('#wdGender');
  var $hc = host.querySelector('#wdHc');

  ['U', 'M', 'F'].forEach(function (g) {
    var o = document.createElement('option');
    o.value = g;
    o.dataset.i18n = g === 'U' ? 'genderAll' : (g === 'M' ? 'genderMale' : 'genderFemale');
    o.textContent = g === 'U' ? 'All' : (g === 'M' ? 'Male' : 'Female');
    $gender.appendChild(o);
  });

  function parseFigure(figure) {
    var parts = {};
    (figure || '').split('.').forEach(function (chunk) {
      var bits = chunk.split('-');
      if (bits.length >= 2) parts[bits[0]] = { id: bits[1], colors: bits.slice(2) };
    });
    return parts;
  }

  function buildFigure(parts) {
    return Object.keys(parts).map(function (type) {
      var p = parts[type];
      return [type, p.id].concat(p.colors || []).join('-');
    }).join('.');
  }

  function currentType() {
    return data.types.filter(function (t) { return t.type === cat; })[0];
  }

  function paletteFor(type) {
    return (data.palettes[type.paletteId] || { colors: [] }).colors;
  }

  function thumbFigure(type, setId, colors) {
    var parts = {};
    if (type.head) {
      parts.hd = parseFigure(target.figure()).hd || { id: '180', colors: ['1'] };
    } else {
      parts.hd = { id: '180', colors: ['1'] };
      parts.ch = { id: '210', colors: ['66'] };
      parts.lg = { id: '270', colors: ['82'] };
    }
    parts[type.type] = { id: String(setId), colors: colors || [] };
    return buildFigure(parts);
  }

  function renderColors() {
    $c.textContent = '';
    var type = currentType();
    if (!type) return;

    var parts = parseFigure(target.figure());
    var current = parts[type.type];
    var set = current ? type.sets.filter(function (s) { return String(s.id) === String(current.id); })[0] : null;
    if (!set || !set.colorable) return;

    paletteFor(type).forEach(function (color) {
      if (color.club && !$hc.checked) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wdSwatch' + (current.colors[0] === String(color.id) ? ' on' : '');
      b.style.background = color.hex;
      b.title = '#' + color.id;
      b.addEventListener('click', function () {
        var next = parseFigure(target.figure());
        next[type.type] = { id: current.id, colors: [String(color.id)] };
        target.apply(buildFigure(next));
        renderColors();
        markSelection();
      });
      $c.appendChild(b);
    });
  }

  function markSelection() {
    var parts = parseFigure(target.figure());
    var current = parts[cat];
    var items = $g.querySelectorAll('.wdItem');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('on', !!current && items[i].dataset.set === String(current.id));
    }
  }

  function renderGrid() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var img = entry.target.querySelector('img');
        if (img && !img.getAttribute('src')) img.src = entry.target.dataset.src;
        observer.unobserve(entry.target);
      });
    }, { root: $g, rootMargin: '200px' });

    $g.textContent = '';
    var type = currentType();
    if (!type) return;

    var gender = $gender.value;
    var parts = parseFigure(target.figure());
    var currentColors = parts[type.type] ? parts[type.type].colors : [];

    var sets = type.sets.filter(function (set) {
      if (!$hc.checked && set.club) return false;
      return gender === 'U' || set.gender === 'U' || set.gender === gender;
    });

    if (!sets.length) {
      var empty = document.createElement('div');
      empty.className = 'wdEmpty';
      empty.dataset.i18n = 'noItems';
      empty.textContent = 'Nothing here with these filters.';
      $g.appendChild(empty);
      return;
    }

    sets.forEach(function (set) {
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'wdItem';
      cell.dataset.set = String(set.id);
      cell.title = type.type + '-' + set.id;
      cell.dataset.src = opts.thumbUrl(thumbFigure(type, set.id, set.colorable ? currentColors : []), !!type.head);
      cell.innerHTML = '<img alt="">' + (set.club ? '<span class="hc">HC</span>' : '');
      cell.addEventListener('click', function () {
        var next = parseFigure(target.figure());
        var colors = set.colorable ? (currentColors.length ? currentColors : [String((paletteFor(type)[0] || { id: 1 }).id)]) : [];
        next[type.type] = { id: String(set.id), colors: colors };
        target.apply(buildFigure(next));
        markSelection();
        renderColors();
      });
      $g.appendChild(cell);
      observer.observe(cell);
    });

    markSelection();
  }

  function renderCats() {
    $cats.textContent = '';
    data.types.forEach(function (type) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wdCat' + (type.type === cat ? ' on' : '');
      b.dataset.i18n = 'cat_' + type.type;
      b.textContent = type.type;
      b.addEventListener('click', function () {
        cat = type.type;
        renderCats();
        renderGrid();
        renderColors();
        if (window.applyLang) window.applyLang();
      });
      $cats.appendChild(b);
    });
  }

  function refresh() {
    renderCats();
    renderGrid();
    renderColors();
    if (window.applyLang) window.applyLang();
  }

  host.querySelector('.wdClose').addEventListener('click', close);
  host.addEventListener('click', function (e) { if (e.target === host) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  $gender.addEventListener('change', renderGrid);
  $hc.addEventListener('change', function () { renderGrid(); renderColors(); });
  host.querySelector('#wdClear').addEventListener('click', function () {
    var next = parseFigure(target.figure());
    delete next[cat];
    target.apply(buildFigure(next));
    markSelection();
    renderColors();
  });

  function close() { host.classList.remove('open'); }

  return {
    open: function (t) {
      target = t;
      host.classList.add('open');
      if (data) { refresh(); return; }
      $g.textContent = '';
      var wait = document.createElement('div');
      wait.className = 'wdEmpty';
      wait.dataset.i18n = 'loading';
      wait.textContent = 'Loading…';
      $g.appendChild(wait);
      fetch(opts.dataUrl, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok) throw new Error('bad payload');
          data = d.data;
          cat = data.types[0] && data.types[0].type;
          refresh();
        })
        .catch(function () {
          $g.textContent = '';
          var err = document.createElement('div');
          err.className = 'wdEmpty';
          err.dataset.i18n = 'wardrobeDown';
          err.textContent = 'Wardrobe unavailable.';
          $g.appendChild(err);
          if (window.applyLang) window.applyLang();
        });
    }
  };
}
`;
