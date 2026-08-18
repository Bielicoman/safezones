/* Safe Zones — logica do painel e ponte para o Premiere. */
(function () {
  'use strict';

  var cs = new CSInterface();
  var fs = require('fs');
  var path = require('path');
  var os = require('os');

  var D = window.SZ_DATA;
  var DRAW = window.SZ_DRAW;

  var STORE_KEY = 'safezones.settings.v1';
  var PRESETS_KEY = 'safezones.quickpresets.v2';
  var SZ_HOME = path.join(
    process.env.APPDATA || path.join(os.homedir(), '.config'), 'SafeZones'
  );
  var OUT_DIR = path.join(SZ_HOME, 'overlays');
  var ART_DIR = path.join(SZ_HOME, 'art');

  var opts = loadSettings();
  var presets = loadQuickPresets();
  var activeSlot = null;
  var seq = null;      /* {w,h,name} */
  var active = false;
  var busy = false;

  /* ---------- ícones vetoriais de redes sociais ---------- */

  var ICONS = {
    'tiktok': '<svg class="social-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.38a6.34 6.34 0 0 0-.85-.06A6.34 6.34 0 0 0 3.14 15.7a6.34 6.34 0 0 0 10.82 4.48 6.27 6.27 0 0 0 1.86-4.48V8.69a8.18 8.18 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.12z"/></svg>',
    'reels': '<svg class="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1.5" fill="currentColor"/></svg>',
    'shorts': '<svg class="social-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 2c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/></svg>',
    'stories': '<svg class="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" stroke-dasharray="4 2"/><circle cx="12" cy="12" r="4"/></svg>',
    'fb-reels': '<svg class="social-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/></svg>',
    'x': '<svg class="social-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
  };

  /* ---------- rede de segurança ---------- */

  function fatal(msg) {
    var box = document.getElementById('crash');
    document.getElementById('crash-msg').textContent = String(msg && msg.stack || msg);
    box.hidden = false;
  }

  window.onerror = function (m, src, ln, col, err) { fatal(err || (m + ' @' + ln + ':' + col)); };

  document.getElementById('crash-reset').addEventListener('click', function () {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    try { localStorage.removeItem(PRESETS_KEY); } catch (e) {}
    location.reload();
  });

  /* ---------- definições e presets ---------- */

  function loadSettings() {
    var base = DRAW.defaults();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        for (var k in base) {
          if (Object.prototype.hasOwnProperty.call(saved, k) && saved[k] !== null &&
              typeof saved[k] === typeof base[k]) {
            base[k] = saved[k];
          }
        }
        if (Object.prototype.toString.call(saved.ratios) === '[object Array]') {
          base.ratios = saved.ratios;
        }
      }
    } catch (e) {}
    return base;
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(opts, function (k, v) {
        if (k === 'customArtImage') return undefined;
        return v;
      }));
    } catch (e) {}
  }

  function defaultQuickPresets() {
    return [
      {
        name: 'TikTok',
        opts: {
          social: 'tiktok',
          style: 2,
          artAlpha: 1.0,
          ratios: ['9:16'],
          guideAlpha: 1.0,
          matteAlpha: 1.0,
          line: 1.0,
          guideColor: '#ffffff',
          letterbox: false,
          thirds: false,
          phi: false,
          diagonals: false,
          center: false,
          broadcast: false,
          labels: true
        }
      },
      {
        name: 'Reels',
        opts: {
          social: 'reels',
          style: 2,
          artAlpha: 1.0,
          ratios: ['9:16'],
          guideAlpha: 1.0,
          matteAlpha: 1.0,
          line: 1.0,
          guideColor: '#ffffff',
          letterbox: false,
          thirds: false,
          phi: false,
          diagonals: false,
          center: false,
          broadcast: false,
          labels: true
        }
      },
      {
        name: 'Shorts',
        opts: {
          social: 'shorts',
          style: 2,
          artAlpha: 1.0,
          ratios: ['9:16'],
          guideAlpha: 1.0,
          matteAlpha: 1.0,
          line: 1.0,
          guideColor: '#ffffff',
          letterbox: false,
          thirds: false,
          phi: false,
          diagonals: false,
          center: false,
          broadcast: false,
          labels: true
        }
      }
    ];
  }

  function loadQuickPresets() {
    try {
      var raw = localStorage.getItem(PRESETS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.length === 3) return parsed;
      }
    } catch (e) {}
    return defaultQuickPresets();
  }

  function saveQuickPresets() {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch (e) {}
  }

  function paintQuickPresets() {
    for (var i = 1; i <= 3; i++) {
      var label = document.getElementById('slot-name-' + i);
      var btn = document.querySelector('.slot-btn[data-slot="' + i + '"]');
      if (label && presets[i - 1]) label.textContent = presets[i - 1].name;
      if (btn) {
        btn.classList.toggle('active-slot', activeSlot === i);
      }
    }
  }

  function applyPreset(slot) {
    if (activeSlot === slot) {
      activeSlot = null;
      opts.social = 'none';
      opts.customMargins = null;
      opts.customLines = [];
      opts.customBlocks = [];
      opts.customArtImage = null;
      opts.ratios = [];
      opts.letterbox = false;
      opts.thirds = false;
      opts.phi = false;
      opts.diagonals = false;
      opts.center = false;
      opts.broadcast = false;
      paintQuickPresets();
      onChange(true);
      setStatus('Standby');
      return;
    }

    var p = presets[slot - 1];
    if (!p) return;
    activeSlot = slot;
    var defs = DRAW.defaults();
    for (var k in defs) {
      if (p.opts[k] !== undefined) opts[k] = p.opts[k];
      else opts[k] = defs[k];
    }
    opts.ratios = p.opts.ratios ? p.opts.ratios.slice(0) : [];
    paintQuickPresets();
    onChange(true);
    setStatus('Loaded Preset: ' + p.name);
  }

  function saveCurrentToPreset(slot) {
    var pName = prompt('Enter a name for this Quick Preset slot P' + slot + ':', presets[slot - 1].name);
    if (!pName) return;
    presets[slot - 1] = {
      name: pName.trim() || ('Preset ' + slot),
      opts: JSON.parse(JSON.stringify(opts, function (k, v) {
        if (k === 'art' || k === 'customArtImage') return undefined;
        return v;
      }))
    };
    activeSlot = slot;
    saveQuickPresets();
    paintQuickPresets();
    setStatus('Saved current setup to P' + slot + ' (' + presets[slot - 1].name + ')');
  }

  /* ---------- integração com zone studio pro ---------- */

  function applyCustomPreset(preset) {
    if (!preset) return;
    activeSlot = null;
    opts.social = preset.id;
    opts.customName = preset.name;
    opts.guideColor = preset.color || '#2f7bff';
    opts.elements = (preset.elements || []).map(function (el) {
      return JSON.parse(JSON.stringify(el));
    });
    opts.customMargins = null;
    opts.customLines = [];
    opts.customBlocks = [];
    opts.customArtImage = null;
    buildChips();
    onChange(true);
  }

  function openStudioWindow() {
    try {
      cs.requestOpenExtension('com.alexascencio.safezones.studio');
    } catch (e) {}

    var screenW = (window.screen && window.screen.availWidth) ? window.screen.availWidth : 1440;
    var screenH = (window.screen && window.screen.availHeight) ? window.screen.availHeight : 900;
    var w = Math.min(1440, screenW - 40);
    var h = Math.min(920, screenH - 40);
    var left = Math.max(10, Math.round((screenW - w) / 2));
    var top = Math.max(10, Math.round((screenH - h) / 2));

    var studioWin = window.open('studio.html', 'ZoneStudioPro', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',resizable=yes,scrollbars=no');
    if (studioWin) {
      studioWin.focus();
    } else if (window.SZ_STUDIO && window.SZ_STUDIO.open) {
      window.SZ_STUDIO.open();
    }
  }

  window.addEventListener('storage', function (e) {
    if (e.key === 'safezones.userpresets.v2' || e.key === 'safezones.activecustom') {
      try {
        if (e.key === 'safezones.activecustom' && e.newValue) {
          var p = JSON.parse(e.newValue);
          applyCustomPreset(p);
        } else {
          buildChips();
          onChange(true);
        }
      } catch (err) {}
    }
  });

  /* ---------- ponte ExtendScript ---------- */

  function call(fn, cb) {
    cs.evalScript(fn, function (res) {
      res = String(res == null ? '' : res);
      if (res === 'EvalScript error.') return cb('ERR', 'The host script failed (EvalScript error).');
      var i = res.indexOf('|');
      if (i < 0) return cb('ERR', res || 'Empty response from host.');
      cb(res.slice(0, i), res.slice(i + 1));
    });
  }

  function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

  /* ---------- arte do overlay ---------- */

  var artCache = {};

  function artPath(id, style) { return path.join(ART_DIR, id + '-' + style + '.png'); }

  function loadArt(id, style, cb) {
    var key = id + '-' + style;
    if (!id || id === 'none' || id.indexOf('custom') >= 0 || id.indexOf('preset_') >= 0) return cb(null);
    if (Object.prototype.hasOwnProperty.call(artCache, key)) return cb(artCache[key]);
    var buf;
    try {
      var st = fs.statSync(artPath(id, style));
      if (!st.size) throw new Error('vazio');
      buf = fs.readFileSync(artPath(id, style));
    } catch (e) { artCache[key] = null; return cb(null); }
    var img = new Image();
    img.onload  = function () { artCache[key] = img; cb(img); };
    img.onerror = function () { artCache[key] = null; cb(null); };
    img.src = 'data:image/png;base64,' + buf.toString('base64');
  }

  function withArt(cb) {
    loadArt(opts.social, opts.style, function (img) { opts.art = img || null; cb(img); });
  }

  function stylesAvailable(id) {
    if (!id || id.indexOf('custom') >= 0 || id.indexOf('preset_') >= 0) return [];
    var out = [];
    for (var i = 1; i <= 6; i++) {
      try { if (fs.statSync(artPath(id, i)).size > 0) out.push(i); } catch (e) {}
    }
    return out;
  }

  /* ---------- geração do PNG ---------- */

  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function renderPNG(w, h) {
    var stamp = '';
    try { stamp = String(fs.statSync(artPath(opts.social, opts.style)).mtimeMs); } catch (e) {}
    var key = hash(JSON.stringify(opts, function (k, v) {
      return (k === 'art' || k === 'customArtImage') ? undefined : v;
    }) + '|' + w + 'x' + h + '|' + stamp);
    var file = path.join(OUT_DIR, 'SafeZones_' + key + '.png');

    try {
      var st = fs.statSync(file);
      if (st.size > 0) return file;
    } catch (e) {}

    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    DRAW.draw(cv.getContext('2d'), w, h, opts);

    var b64 = cv.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    return file;
  }

  /* ---------- limpeza de ficheiros temporários ---------- */

  function cleanDiskOverlays(keepFile) {
    try {
      if (!fs.existsSync(OUT_DIR)) return;
      var keepNorm = keepFile ? path.normalize(keepFile).toLowerCase() : null;
      var files = fs.readdirSync(OUT_DIR);
      files.forEach(function (f) {
        if (f.indexOf('SafeZones_') === 0 && f.slice(-4) === '.png') {
          var full = path.join(OUT_DIR, f);
          if (!keepNorm || path.normalize(full).toLowerCase() !== keepNorm) {
            try { fs.unlinkSync(full); } catch (eUnlink) {}
          }
        }
      });
    } catch (e) {}
  }

  /* ---------- estado / UI ---------- */

  function setStatus(msg, isErr) {
    var el = document.getElementById('status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status' + (isErr ? ' err' : '');
  }

  function paintToggle() {
    var ind = document.getElementById('live-indicator');
    var st = document.getElementById('live-state');
    if (ind) ind.className = 'live-pill' + (active ? ' is-on' : '');
    if (st) st.textContent = active ? 'ON AIR' : 'STANDBY';
    paintReadout();
  }

  function paintReadout() {
    var z = D.socialById(opts.social);
    var roPreset = document.getElementById('ro-preset');
    var roGuides = document.getElementById('ro-guides');
    var roFrame = document.getElementById('ro-frame');
    var seqInfo = document.getElementById('seq-info');

    if (roPreset) {
      if (opts.customName && ((opts.social || '').indexOf('custom') >= 0 || (opts.social || '').indexOf('preset_') >= 0)) {
        roPreset.textContent = opts.customName + ' (Studio)';
      } else if (z) {
        roPreset.textContent = z.name + ' · S' + opts.style;
      } else {
        roPreset.textContent = 'None';
      }
    }

    if (roGuides) {
      if (opts.ratios && opts.ratios.length) {
        var gAlphaPercent = Math.round((opts.guideAlpha !== undefined ? opts.guideAlpha : 1.0) * 100);
        roGuides.textContent = opts.ratios.join('/') + ' (' + gAlphaPercent + '%)';
      } else if (opts.elements && opts.elements.length) {
        roGuides.textContent = opts.elements.length + ' Studio Layers';
      } else {
        roGuides.textContent = 'Off';
      }
    }

    if (roFrame) {
      roFrame.textContent = seq ? (seq.w + '×' + seq.h) : '—';
    }

    if (seqInfo) {
      seqInfo.textContent = seq ? (seq.w + '×' + seq.h) : 'No sequence';
    }

    updateBadges();
  }

  function updateBadges() {
    var bAspect = document.getElementById('badge-aspect');
    var bSocial = document.getElementById('badge-social');
    var bFraming = document.getElementById('badge-framing');
    var bExtras = document.getElementById('badge-extras');

    if (bAspect) {
      if (opts.ratios && opts.ratios.length) {
        var ga = Math.round((opts.guideAlpha !== undefined ? opts.guideAlpha : 1.0) * 100);
        var lbText = opts.letterbox ? ' + LB' : '';
        bAspect.textContent = opts.ratios.join(', ') + ' (' + ga + '%' + lbText + ')';
      } else {
        bAspect.textContent = 'None';
      }
    }

    if (bSocial) {
      if (opts.customName && ((opts.social || '').indexOf('custom') >= 0 || (opts.social || '').indexOf('preset_') >= 0)) {
        bSocial.textContent = opts.customName;
      } else {
        var z = D.socialById(opts.social);
        bSocial.textContent = z ? z.name : 'None';
      }
    }

    if (bFraming) {
      var fList = [];
      if (opts.thirds) fList.push('Thirds');
      if (opts.phi) fList.push('Phi');
      if (opts.diagonals) fList.push('Diag');
      if (opts.center) fList.push('Center');
      if (opts.elements && opts.elements.length) fList.push('Studio');
      bFraming.textContent = fList.length ? fList.join(', ') : 'Clean';
    }

    if (bExtras) {
      var eList = [];
      if (opts.broadcast) eList.push('Broadcast');
      if (opts.labels) eList.push('Labels');
      bExtras.textContent = eList.length ? eList.join(' + ') : 'Off';
    }
  }

  function currentName() {
    if (opts.customName && ((opts.social || '').indexOf('custom') >= 0 || (opts.social || '').indexOf('preset_') >= 0)) {
      return opts.customName;
    }
    var z = D.socialById(opts.social);
    var extra = opts.ratios.length ? ' + ' + opts.ratios.length + ' guide' + (opts.ratios.length > 1 ? 's' : '') : '';
    return (z ? z.name : (opts.customName || 'No platform')) + extra;
  }

  function refreshSeq(cb) {
    call('sz_sequenceInfo()', function (ok, payload) {
      if (ok !== 'OK') { seq = null; return cb && cb(false, payload); }
      var p = payload.split(',');
      seq = { w: parseInt(p[0], 10), h: parseInt(p[1], 10), name: p.slice(2).join(',') };

      paintReadout();
      cb && cb(true);
    });
  }

  /* ---------- ações ---------- */

  function turnOn(cb) {
    if (!hasActiveFeatures()) {
      busy = false;
      if (active) turnOff(true);
      return cb && cb(false);
    }
    refreshSeq(function (ok, err) {
      if (!ok) { busy = false; return setStatus(err || 'Open a sequence first.', true); }
      withArt(function () {
        var file;
        try {
          file = renderPNG(seq.w, seq.h);
        } catch (e) {
          busy = false;
          return setStatus('Could not generate the PNG: ' + e.message, true);
        }
        call('sz_apply("' + esc(file) + '")', function (st, msg) {
          busy = false;
          if (st !== 'OK') return setStatus(msg, true);
          active = true;
          paintToggle();
          setStatus(currentName() + ' · ' + seq.w + '×' + seq.h +
                    (opts.art ? '' : ' · live'));
          cleanDiskOverlays(file);
          cb && cb(true);
        });
      });
    });
  }

  function turnOff(silent, cb) {
    clearTimeout(reapplyTimer);
    reapplyTimer = null;
    call('sz_remove()', function (st, msg) {
      busy = false;
      if (st !== 'OK') return setStatus(msg, true);
      active = false;
      paintToggle();
      if (!silent) setStatus('Overlay removed');
      cleanDiskOverlays(null);
      cb && cb(true);
    });
  }

  function toggle() {
    if (busy) return;
    busy = true;
    setStatus(active ? 'Removing…' : 'Applying…');
    if (active) turnOff(); else turnOn();
  }

  var reapplyTimer = null;
  function scheduleReapply() {
    clearTimeout(reapplyTimer);
    reapplyTimer = null;

    if (!hasActiveFeatures()) {
      if (active) turnOff(true);
      return;
    }
    if (!active) {
      turnOn();
      return;
    }

    reapplyTimer = setTimeout(function () {
      if (busy) return scheduleReapply();
      busy = true;
      turnOn();
    }, 280);
  }

  /* ---------- preview ---------- */

  var previewRAF = null;
  function drawPreview() {
    if (previewRAF) return;
    previewRAF = requestAnimationFrame(function () {
      previewRAF = null;
      var cv = document.getElementById('preview');
      if (!cv) return;
      var w = seq ? seq.w : 1080, h = seq ? seq.h : 1920;
      var containerW = document.body.clientWidth ? Math.max(120, document.body.clientWidth - 48) : 240;
      var maxH = 140;
      var sc = Math.min(maxH / h, containerW / w);
      cv.width = Math.max(1, Math.round(w * sc));
      cv.height = Math.max(1, Math.round(h * sc));
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#1c1f24';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#262a30';
      for (var y = 0; y < cv.height; y += 10) {
        for (var x = 0; x < cv.width; x += 10) {
          if (((x / 10) + (y / 10)) % 2 === 0) ctx.fillRect(x, y, 10, 10);
        }
      }
      withArt(function () { DRAW.draw(ctx, cv.width, cv.height, opts); });
    });
  }

  /* ---------- construção dos seletores ---------- */

  function buildChips() {
    var sl = document.getElementById('social-list');
    if (sl) {
      sl.innerHTML = '';

      var none = document.createElement('button');
      none.className = 'chip' + (opts.social === 'none' ? ' on' : '');
      none.textContent = 'None';
      none.addEventListener('click', function () {
        opts.social = 'none';
        opts.elements = [];
        opts.customMargins = null;
        opts.customLines = [];
        opts.customBlocks = [];
        opts.customArtImage = null;
        onChange(true);
      });
      sl.appendChild(none);

      var shown = [];
      D.SOCIAL.forEach(function (z) {
        if (!stylesAvailable(z.id).length) return;
        shown.push(z.id);
        var b = document.createElement('button');
        b.className = 'chip' + (opts.social === z.id ? ' on' : '');

        var iconSvg = ICONS[z.id] || '';
        b.innerHTML = iconSvg + '<span>' + z.name + '</span>';
        b.title = z.sub;
        b.addEventListener('click', function () {
          if (opts.social === z.id) {
            opts.social = 'none';
          } else {
            opts.social = z.id;
            opts.elements = [];
            opts.customMargins = null;
            opts.customLines = [];
            opts.customBlocks = [];
            opts.customArtImage = null;
          }
          onChange(true);
        });
        sl.appendChild(b);
      });

      /* Presets Customizados do Zone Studio Pro */
      if (window.SZ_STUDIO && window.SZ_STUDIO.getUserPresets) {
        var userPresets = window.SZ_STUDIO.getUserPresets();
        if (userPresets && userPresets.length) {
          userPresets.forEach(function (up) {
            var b = document.createElement('button');
            var isCur = (opts.social === up.id);
            b.className = 'chip custom-preset-chip' + (isCur ? ' on' : '');
            b.innerHTML = '<i style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + (up.color || '#2f7bff') + ';margin-right:4px;"></i><span>' + up.name + '</span>';
            b.title = 'Left-click: Apply | Right-click: Edit / Delete (' + up.name + ')';
            b.addEventListener('click', function () {
              if (opts.social === up.id) {
                opts.social = 'none';
                opts.elements = [];
                opts.customMargins = null;
                opts.customLines = [];
                opts.customBlocks = [];
                opts.customArtImage = null;
              } else {
                applyCustomPreset(up);
              }
              onChange(true);
            });

            /* Menu de Contexto (Clique Direito) */
            b.addEventListener('contextmenu', function (e) {
              e.preventDefault();
              e.stopPropagation();
              showPresetContextMenu(e, up);
            });

            sl.appendChild(b);
          });
        }
      }
    }

    var sl2 = document.getElementById('style-list');
    if (sl2) {
      sl2.innerHTML = '';
      var have = stylesAvailable(opts.social);
      var NAMES = ['Safe zone', 'Zone + UI', 'UI only', 'Crop bands', 'Crop + UI', 'Full'];
      if (have.indexOf(opts.style) < 0 && have.length) { opts.style = have[0]; saveSettings(); }
      have.forEach(function (st) {
        var b = document.createElement('button');
        b.className = 'chip' + (opts.style === st ? ' on' : '');
        b.textContent = st + ' · ' + NAMES[st - 1];
        b.title = artPath(opts.social, st);
        b.addEventListener('click', function () { opts.style = st; onChange(true); });
        sl2.appendChild(b);
      });
    }

    var rl = document.getElementById('ratio-list');
    if (rl) {
      rl.innerHTML = '';
      D.RATIOS.forEach(function (r) {
        var on = opts.ratios.indexOf(r.id) >= 0;
        var b = document.createElement('button');
        b.className = 'chip' + (on ? ' on' : '');
        b.textContent = r.name;
        if (r.tag) b.title = r.tag;
        b.addEventListener('click', function () {
          var i = opts.ratios.indexOf(r.id);
          if (i >= 0) opts.ratios.splice(i, 1); else opts.ratios.push(r.id);
          onChange(true);
        });
        rl.appendChild(b);
      });
    }
  }

  var BOOLS = {
    'opt-broadcast': 'broadcast', 'opt-thirds': 'thirds',
    'opt-letterbox': 'letterbox', 'opt-phi': 'phi', 'opt-diagonals': 'diagonals',
    'opt-center': 'center', 'opt-labels': 'labels'
  };

  function syncControls() {
    for (var id in BOOLS) {
      var el = document.getElementById(id);
      if (el) el.checked = !!opts[BOOLS[id]];
    }

    var mAlpha = Math.round((opts.matteAlpha !== undefined ? opts.matteAlpha : 1.0) * 100);
    var elMatte = document.getElementById('opt-mattealpha');
    var elMatteVal = document.getElementById('opt-mattealpha-val');
    if (elMatte) elMatte.value = mAlpha;
    if (elMatteVal) elMatteVal.textContent = mAlpha + '%';

    var gAlpha = Math.round((opts.guideAlpha !== undefined ? opts.guideAlpha : 1.0) * 100);
    var elGuide = document.getElementById('opt-guidealpha');
    var elGuideVal = document.getElementById('opt-guidealpha-val');
    if (elGuide) elGuide.value = gAlpha;
    if (elGuideVal) elGuideVal.textContent = gAlpha + '%';

    var lineVal = Math.round((opts.line !== undefined ? opts.line : 1.0) * 100);
    var elLine = document.getElementById('opt-line');
    var elLineVal = document.getElementById('opt-line-val');
    if (elLine) elLine.value = lineVal;
    if (elLineVal) elLineVal.textContent = (lineVal / 100).toFixed(1) + '×';

    var aAlpha = Math.round((opts.artAlpha !== undefined ? opts.artAlpha : 1.0) * 100);
    var elArt = document.getElementById('opt-artalpha');
    var elArtVal = document.getElementById('opt-artalpha-val');
    if (elArt) elArt.value = aAlpha;
    if (elArtVal) elArtVal.textContent = aAlpha + '%';

    var curColor = (opts.guideColor || '#ffffff').toLowerCase();
    var colorChips = document.querySelectorAll('#color-palette .color-chip');
    for (var c = 0; c < colorChips.length; c++) {
      var chipColor = colorChips[c].getAttribute('data-color').toLowerCase();
      colorChips[c].classList.toggle('on', chipColor === curColor);
    }
  }

  function hasActiveFeatures() {
    if (opts.social && opts.social !== 'none') return true;
    if (opts.elements && opts.elements.length > 0) return true;
    if (opts.customMargins || (opts.customLines && opts.customLines.length) || (opts.customBlocks && opts.customBlocks.length) || opts.customArtImage) return true;
    if (opts.ratios && opts.ratios.length > 0) return true;
    if (opts.thirds || opts.phi || opts.diagonals || opts.center || opts.broadcast || opts.letterbox) return true;
    return false;
  }

  function onChange(userTriggered) {
    if (!hasActiveFeatures()) {
      activeSlot = null;
    } else if (activeSlot) {
      var curP = presets[activeSlot - 1];
      if (curP && curP.opts.social && curP.opts.social !== opts.social) {
        activeSlot = null;
      }
    }
    paintQuickPresets();
    saveSettings();
    buildChips();
    syncControls();
    paintReadout();
    drawPreview();
    setStatus(currentName());

    if (userTriggered !== false) {
      if (hasActiveFeatures()) {
        if (!active) {
          turnOn();
        } else {
          scheduleReapply();
        }
      } else {
        turnOff(true);
      }
    }
  }

  /* ---------- scrubby numbers interativos ---------- */

  function setupScrubbyNumbers() {
    var scrubbers = document.querySelectorAll('.scrubby-val');
    for (var i = 0; i < scrubbers.length; i++) {
      (function (el) {
        var targetId = el.getAttribute('data-target');
        var isFloat = el.getAttribute('data-format') === 'float';
        var input = document.getElementById(targetId);
        if (!input) return;

        var startX = 0;
        var startVal = 0;
        var isScrubbing = false;

        function onMouseMove(e) {
          if (!isScrubbing) return;
          var delta = e.clientX - startX;
          var step = isFloat ? 5 : 2;
          var min = parseFloat(input.min) || 0;
          var max = parseFloat(input.max) || 100;
          var newVal = Math.min(max, Math.max(min, startVal + delta * step));

          input.value = newVal;
          input.dispatchEvent(new Event('input'));
        }

        function onMouseUp() {
          if (isScrubbing) {
            isScrubbing = false;
            el.classList.remove('is-scrubbing');
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          }
        }

        el.addEventListener('mousedown', function (e) {
          e.preventDefault();
          startX = e.clientX;
          startVal = parseFloat(input.value) || 0;
          isScrubbing = true;
          el.classList.add('is-scrubbing');
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        el.addEventListener('dblclick', function (e) {
          e.preventDefault();
          var curVal = isFloat ? (parseFloat(input.value) / 100).toFixed(1) : input.value;
          var typed = prompt('Enter exact value (' + input.min + ' - ' + input.max + '):', curVal);
          if (typed !== null) {
            var num = parseFloat(typed);
            if (!isNaN(num)) {
              if (isFloat && num <= 5.0) num = num * 100;
              var min = parseFloat(input.min) || 0;
              var max = parseFloat(input.max) || 100;
              input.value = Math.min(max, Math.max(min, num));
              input.dispatchEvent(new Event('input'));
            }
          }
        });
      })(scrubbers[i]);
    }
  }

  /* ---------- inspeção no mini scope / hover tooltip ---------- */

  function setupScopeInspection() {
    var well = document.getElementById('scope-well');
    var tip = document.getElementById('scope-tooltip');
    if (!well || !tip) return;

    well.addEventListener('mousemove', function (e) {
      var cv = document.getElementById('preview');
      if (!cv) return;
      var rect = cv.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        tip.hidden = true;
        return;
      }

      var fullW = seq ? seq.w : 1080;
      var fullH = seq ? seq.h : 1920;
      var nx = x / rect.width;
      var ny = y / rect.height;
      var pxX = Math.round(nx * fullW);
      var pxY = Math.round(ny * fullH);

      var zoneName = 'Frame Area';
      var zoneDim = fullW + '×' + fullH + 'px';

      if (opts.letterbox && opts.ratios && opts.ratios.length) {
        var lb = D.ratioById(opts.ratios[0]);
        if (lb) {
          var box = DRAW.containBox(fullW, fullH, lb.r);
          if (pxY < box.y || pxY > box.y + box.h || pxX < box.x || pxX > box.x + box.w) {
            zoneName = 'Letterbox Black Matte (' + lb.name + ')';
            zoneDim = Math.round(fullW) + '×' + Math.round(box.y) + 'px bar';
          } else {
            zoneName = lb.name + ' Active Picture';
            zoneDim = Math.round(box.w) + '×' + Math.round(box.h) + 'px';
          }
        }
      } else if (opts.customName) {
        zoneName = opts.customName + ' (Custom)';
        zoneDim = fullW + '×' + fullH + 'px (' + pxX + ', ' + pxY + ')';
      } else if (opts.social && opts.social !== 'none') {
        var z = D.socialById(opts.social);
        if (z) {
          zoneName = z.name + ' Overlay';
          zoneDim = fullW + '×' + fullH + 'px (' + pxX + ', ' + pxY + ')';
        }
      }

      tip.textContent = zoneName + ' · ' + zoneDim;
      tip.hidden = false;
    });

    well.addEventListener('mouseleave', function () {
      tip.hidden = true;
    });
  }

  /* ---------- menu de contexto para presets pessoais (clique direito) ---------- */

  var currentContextPreset = null;

  function showPresetContextMenu(e, preset) {
    var menu = document.getElementById('preset-context-menu');
    if (!menu) return;
    currentContextPreset = preset;

    var x = e.clientX;
    var y = e.clientY;

    menu.style.display = 'flex';
    menu.hidden = false;

    var menuW = 150;
    var menuH = 120;
    var winW = window.innerWidth || 300;
    var winH = window.innerHeight || 500;

    if (x + menuW > winW) x = Math.max(5, winW - menuW - 10);
    if (y + menuH > winH) y = Math.max(5, winH - menuH - 10);

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
  }

  function hidePresetContextMenu() {
    var menu = document.getElementById('preset-context-menu');
    if (menu) {
      menu.hidden = true;
      menu.style.display = 'none';
    }
    currentContextPreset = null;
  }

  /* ---------- ligações ---------- */

  function wire() {
    var liveInd = document.getElementById('live-indicator');
    if (liveInd) liveInd.addEventListener('click', toggle);

    /* Quick Presets P1, P2, P3 */
    var slotBtns = document.querySelectorAll('.slot-btn');
    for (var s = 0; s < slotBtns.length; s++) {
      slotBtns[s].addEventListener('click', function () {
        var slot = parseInt(this.getAttribute('data-slot'), 10);
        applyPreset(slot);
      });
    }

    var btnSavePreset = document.getElementById('btn-save-preset');
    if (btnSavePreset) {
      btnSavePreset.addEventListener('click', function () {
        var slot = activeSlot || 1;
        var chosenSlot = prompt('Save current setup to which slot? (1, 2, or 3):', String(slot));
        if (chosenSlot) {
          var sNum = parseInt(chosenSlot, 10);
          if (sNum >= 1 && sNum <= 3) saveCurrentToPreset(sNum);
        }
      });
    }

    /* Seletor de Cores de Guias */
    var colorChips = document.querySelectorAll('#color-palette .color-chip');
    for (var c = 0; c < colorChips.length; c++) {
      colorChips[c].addEventListener('click', function () {
        opts.guideColor = this.getAttribute('data-color');
        onChange(true);
      });
    }

    /* Gavetas retráteis (Accordions) */
    var drawerHeads = document.querySelectorAll('.drawer-head');
    for (var d = 0; d < drawerHeads.length; d++) {
      drawerHeads[d].addEventListener('click', function () {
        var drawer = this.closest('.drawer');
        if (!drawer) return;
        var isOpen = drawer.classList.contains('is-open');
        drawer.classList.toggle('is-open', !isOpen);
        this.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    }

    /* Checkboxes */
    for (var id in BOOLS) {
      (function (id) {
        var el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', function () {
            opts[BOOLS[id]] = this.checked;
            onChange(true);
          });
        }
      })(id);
    }

    /* Sliders */
    var elMatte = document.getElementById('opt-mattealpha');
    if (elMatte) {
      elMatte.addEventListener('input', function () {
        opts.matteAlpha = parseInt(this.value, 10) / 100;
        onChange(true);
      });
    }

    var elGuide = document.getElementById('opt-guidealpha');
    if (elGuide) {
      elGuide.addEventListener('input', function () {
        opts.guideAlpha = parseInt(this.value, 10) / 100;
        onChange(true);
      });
    }

    var elLine = document.getElementById('opt-line');
    if (elLine) {
      elLine.addEventListener('input', function () {
        opts.line = parseInt(this.value, 10) / 100;
        onChange(true);
      });
    }

    var elArt = document.getElementById('opt-artalpha');
    if (elArt) {
      elArt.addEventListener('input', function () {
        opts.artAlpha = parseInt(this.value, 10) / 100;
        onChange(true);
      });
    }

    var btnArt = document.getElementById('btn-art');
    if (btnArt) {
      btnArt.addEventListener('click', function () {
        try {
          fs.mkdirSync(ART_DIR, { recursive: true });
          var cp = require('child_process');
          var ch = cp.spawn('explorer.exe', [ART_DIR], { detached: true, stdio: 'ignore' });
          ch.on('error', function (e) { setStatus('Could not open folder: ' + e.message, true); });
          ch.unref();
        } catch (e) { setStatus('Could not open folder: ' + e.message, true); }
      });
    }

    var btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        opts = DRAW.defaults();
        activeSlot = null;
        paintQuickPresets();
        onChange(true);
      });
    }

    setupScrubbyNumbers();
    setupScopeInspection();

    if (window.SZ_STUDIO && window.SZ_STUDIO.init) {
      window.SZ_STUDIO.init();
    }

    /* Menu de Contexto (Clique Direito em Presets Customizados) */
    window.addEventListener('click', function (e) {
      if (!e.target.closest('#preset-context-menu')) {
        hidePresetContextMenu();
      }
    });

    window.addEventListener('contextmenu', function (e) {
      if (!e.target.closest('.custom-preset-chip')) {
        hidePresetContextMenu();
        e.preventDefault();
      }
    });

    var ctxEdit = document.getElementById('ctx-menu-edit');
    if (ctxEdit) {
      ctxEdit.addEventListener('click', function () {
        if (currentContextPreset && window.SZ_STUDIO && window.SZ_STUDIO.editPreset) {
          var p = currentContextPreset;
          hidePresetContextMenu();
          window.SZ_STUDIO.editPreset(p);
        }
      });
    }

    var ctxDup = document.getElementById('ctx-menu-dup');
    if (ctxDup) {
      ctxDup.addEventListener('click', function () {
        if (currentContextPreset && window.SZ_STUDIO && window.SZ_STUDIO.duplicatePreset) {
          window.SZ_STUDIO.duplicatePreset(currentContextPreset.id);
          hidePresetContextMenu();
          buildChips();
          setStatus('Duplicated: ' + currentContextPreset.name);
        }
      });
    }

    var ctxExport = document.getElementById('ctx-menu-export');
    if (ctxExport) {
      ctxExport.addEventListener('click', function () {
        if (currentContextPreset && window.SZ_STUDIO && window.SZ_STUDIO.exportPreset) {
          window.SZ_STUDIO.exportPreset(currentContextPreset);
          hidePresetContextMenu();
        }
      });
    }

    var ctxDel = document.getElementById('ctx-menu-del');
    if (ctxDel) {
      ctxDel.addEventListener('click', function () {
        if (currentContextPreset) {
          var pName = currentContextPreset.name;
          var pId = currentContextPreset.id;
          hidePresetContextMenu();
          if (confirm('Delete preset "' + pName + '"?')) {
            if (window.SZ_STUDIO && window.SZ_STUDIO.deletePreset) {
              window.SZ_STUDIO.deletePreset(pId);
            }
            if (opts.social === pId) {
              opts.social = 'none';
              opts.elements = [];
              onChange(true);
            } else {
              buildChips();
            }
            setStatus('Deleted preset: ' + pName);
          }
        }
      });
    }

    window.addEventListener('resize', drawPreview);
    window.addEventListener('beforeunload', function () {
      if (!active) {
        cleanDiskOverlays(null);
      }
    });
  }

  window.SZ_MAIN = {
    getSeq: function () { return seq; },
    applyCustomPreset: applyCustomPreset,
    updateCustomPresets: function () { buildChips(); }
  };

  /* ---------- arranque ---------- */

  try {
    wire();
    paintQuickPresets();
    buildChips();
    syncControls();
    paintToggle();
    paintReadout();
    drawPreview();
    setStatus(currentName());

    refreshSeq(function (ok, err) {
      if (!ok) {
        cleanDiskOverlays(null);
        return setStatus(err || 'No active sequence', true);
      }
      call('sz_isActive()', function (st, msg) {
        if (st === 'OK') {
          active = (msg === '1');
          paintToggle();
          if (!active) {
            cleanDiskOverlays(null);
          }
        }
        setStatus(currentName() + ' · ' + seq.w + '×' + seq.h);
      });
    });
  } catch (e) {
    fatal(e);
  }
})();
