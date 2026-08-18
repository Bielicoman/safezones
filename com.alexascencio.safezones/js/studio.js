/* Safe Zones — Zone Studio Pro (Estúdio de Desenho Vetorial & Formas Interativas) */
(function (root) {
  'use strict';

  var D = root.SZ_DATA;
  var DRAW = root.SZ_DRAW;

  var USER_PRESETS_KEY = 'safezones.userpresets.v2';

  var state = {
    isOpen: false,
    isFullscreen: false,
    zoom: 1.0,
    bgMode: 'check', /* 'check' | 'black' | 'grey' */
    tool: 'select',  /* 'select' | 'rect' | 'ellipse' | 'line' | 'brush' | 'eraser' | 'text' */
    strokeColor: '#2f7bff',
    strokeWidth: 2,
    strokeStyle: 'solid', /* 'solid' | 'dashed' | 'dotted' */
    fillColor: '#2f7bff',
    fillAlpha: 0.25,      /* 0..1 */
    fontSize: 18,
    selectedId: null,
    transformHandle: null, /* 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'move' */
    isMouseDown: false,
    startPt: null,
    curPt: null,
    drawingElement: null,
    preset: createBlankPreset(),
    presetsList: loadUserPresets(),
    undoStack: [],
    redoStack: [],
    canvasScale: 1
  };

  function createBlankPreset(name) {
    return {
      id: 'custom_' + Date.now(),
      name: name || 'Custom Safe Zone',
      color: '#2f7bff',
      elements: [
        {
          id: 'def_margin',
          type: 'rect',
          x: 0.10, y: 0.10, w: 0.80, h: 0.80,
          fillColor: '#2f7bff', fillAlpha: 0.0,
          strokeColor: '#2f7bff', strokeWidth: 2, strokeStyle: 'solid',
          name: 'Action Safe (80%)'
        },
        {
          id: 'def_sub',
          type: 'rect',
          x: 0.10, y: 0.78, w: 0.80, h: 0.12,
          fillColor: '#ff2d75', fillAlpha: 0.30,
          strokeColor: '#ff2d75', strokeWidth: 1.5, strokeStyle: 'dashed',
          name: 'Subtitle Zone'
        }
      ]
    };
  }

  function loadUserPresets() {
    try {
      var raw = localStorage.getItem(USER_PRESETS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'preset_podcast',
        name: 'Podcast Layout 9:16',
        color: '#ffe600',
        elements: [
          { id: 'e1', type: 'rect', x: 0.08, y: 0.10, w: 0.84, h: 0.78, fillColor: '#ffe600', fillAlpha: 0, strokeColor: '#ffe600', strokeWidth: 2, strokeStyle: 'solid', name: 'Safe Area' },
          { id: 'e2', type: 'ellipse', x: 0.25, y: 0.18, w: 0.50, h: 0.28, fillColor: '#2f7bff', fillAlpha: 0.20, strokeColor: '#2f7bff', strokeWidth: 1.5, strokeStyle: 'dashed', name: 'Host Face Cam' },
          { id: 'e3', type: 'rect', x: 0.08, y: 0.74, w: 0.84, h: 0.14, fillColor: '#ff2d75', fillAlpha: 0.35, strokeColor: '#ff2d75', strokeWidth: 1.5, strokeStyle: 'solid', name: 'Lower Third / GC' }
        ]
      },
      {
        id: 'preset_story',
        name: 'Clean Stories & Shorts',
        color: '#2f7bff',
        elements: [
          { id: 'e4', type: 'rect', x: 0.08, y: 0.14, w: 0.84, h: 0.68, fillColor: '#2f7bff', fillAlpha: 0, strokeColor: '#2f7bff', strokeWidth: 2, strokeStyle: 'solid', name: 'Title Safe' },
          { id: 'e5', type: 'line', x1: 0, y1: 0.333, x2: 1, y2: 0.333, strokeColor: '#ffffff', strokeWidth: 1, strokeStyle: 'dotted', name: 'Upper Third' },
          { id: 'e6', type: 'line', x1: 0, y1: 0.666, x2: 1, y2: 0.666, strokeColor: '#ffffff', strokeWidth: 1, strokeStyle: 'dotted', name: 'Lower Third' }
        ]
      }
    ];
  }

  function savePresetsList() {
    try {
      localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(state.presetsList));
    } catch (e) {}
    if (window.SZ_MAIN && window.SZ_MAIN.updateCustomPresets) {
      window.SZ_MAIN.updateCustomPresets();
    }
  }

  function getSnapshot() {
    return JSON.stringify(state.preset.elements || []);
  }

  function pushHistory() {
    var snap = getSnapshot();
    if (state.undoStack.length && state.undoStack[state.undoStack.length - 1] === snap) {
      return;
    }
    state.undoStack.push(snap);
    if (state.undoStack.length > 50) state.undoStack.shift();
    state.redoStack = [];
    updateUndoRedoButtons();
  }

  function undo() {
    if (!state.undoStack.length) return;
    var current = getSnapshot();
    state.redoStack.push(current);
    var prev = state.undoStack.pop();
    state.preset.elements = JSON.parse(prev);
    state.selectedId = null;
    updateUndoRedoButtons();
    syncInspectorWithSelection();
    renderLayersList();
    renderStudioCanvas();
  }

  function redo() {
    if (!state.redoStack.length) return;
    var current = getSnapshot();
    state.undoStack.push(current);
    var next = state.redoStack.pop();
    state.preset.elements = JSON.parse(next);
    state.selectedId = null;
    updateUndoRedoButtons();
    syncInspectorWithSelection();
    renderLayersList();
    renderStudioCanvas();
  }

  function updateUndoRedoButtons() {
    var btnUndo = document.getElementById('btn-studio-undo');
    var btnRedo = document.getElementById('btn-studio-redo');
    if (btnUndo) {
      btnUndo.disabled = (state.undoStack.length === 0);
      btnUndo.style.opacity = (state.undoStack.length === 0) ? '0.35' : '1.0';
      btnUndo.style.cursor = (state.undoStack.length === 0) ? 'not-allowed' : 'pointer';
    }
    if (btnRedo) {
      btnRedo.disabled = (state.redoStack.length === 0);
      btnRedo.style.opacity = (state.redoStack.length === 0) ? '0.35' : '1.0';
      btnRedo.style.cursor = (state.redoStack.length === 0) ? 'not-allowed' : 'pointer';
    }
  }

  /* ---------- helpers de geometria e hit testing ---------- */

  function getSelectedElement() {
    if (!state.selectedId) return null;
    for (var i = 0; i < state.preset.elements.length; i++) {
      if (state.preset.elements[i].id === state.selectedId) return state.preset.elements[i];
    }
    return null;
  }

  function getElementBounds(el) {
    if (el.type === 'rect' || el.type === 'rounded-rect' || el.type === 'ellipse' || el.type === 'crosshair' || el.type === 'polygon' || el.type === 'grid' || el.type === 'image') {
      return { x: el.x, y: el.y, w: el.w, h: el.h };
    }
    if (el.type === 'line' || el.type === 'ruler') {
      var minX = Math.min(el.x1, el.x2), maxX = Math.max(el.x1, el.x2);
      var minY = Math.min(el.y1, el.y2), maxY = Math.max(el.y1, el.y2);
      return { x: minX, y: minY, w: Math.max(0.02, maxX - minX), h: Math.max(0.02, maxY - minY) };
    }
    if ((el.type === 'freehand' || el.type === 'path') && el.points && el.points.length) {
      var xs = el.points.map(function(p){return p.x;});
      var ys = el.points.map(function(p){return p.y;});
      var fMinX = Math.min.apply(null, xs), fMaxX = Math.max.apply(null, xs);
      var fMinY = Math.min.apply(null, ys), fMaxY = Math.max.apply(null, ys);
      return { x: fMinX, y: fMinY, w: Math.max(0.02, fMaxX - fMinX), h: Math.max(0.02, fMaxY - fMinY) };
    }
    if (el.type === 'text') {
      return { x: el.x, y: el.y, w: 0.25, h: 0.05 };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  function hitTestElement(el, nx, ny) {
    var b = getElementBounds(el);
    var pad = 0.025; /* margem de clique */
    return (nx >= b.x - pad && nx <= b.x + b.w + pad && ny >= b.y - pad && ny <= b.y + b.h + pad);
  }

  function getHandles(b, W, H) {
    var x = b.x * W, y = b.y * H, w = b.w * W, h = b.h * H;
    return {
      nw: { x: x, y: y },
      n:  { x: x + w / 2, y: y },
      ne: { x: x + w, y: y },
      e:  { x: x + w, y: y + h / 2 },
      se: { x: x + w, y: y + h },
      s:  { x: x + w / 2, y: y + h },
      sw: { x: x, y: y + h },
      w:  { x: x, y: y + h / 2 }
    };
  }

  function hitTestHandles(b, pxX, pxY, W, H) {
    var handles = getHandles(b, W, H);
    var radius = 7;
    for (var key in handles) {
      var h = handles[key];
      var dist = Math.sqrt((pxX - h.x) * (pxX - h.x) + (pxY - h.y) * (pxY - h.y));
      if (dist <= radius) return key;
    }
    if (pxX >= b.x * W && pxX <= (b.x + b.w) * W && pxY >= b.y * H && pxY <= (b.y + b.h) * H) {
      return 'move';
    }
    return null;
  }

  /* ---------- renderização do canvas do studio pro ---------- */

  function renderStudioCanvas() {
    var cv = document.getElementById('studio-canvas');
    if (!cv) return;

    var container = document.getElementById('studio-canvas-container');
    var maxW = container ? Math.max(140, container.clientWidth - 20) : (window.innerWidth - 220);
    var maxH = container ? Math.max(140, container.clientHeight - 20) : (window.innerHeight - 80);

    var seq = (window.SZ_MAIN && window.SZ_MAIN.getSeq) ? window.SZ_MAIN.getSeq() : null;
    var seqW = seq ? seq.w : 1080;
    var seqH = seq ? seq.h : 1920;

    var baseSc = Math.min(maxW / seqW, maxH / seqH);
    var sc = baseSc * (state.zoom || 1.0);
    cv.width = Math.max(1, Math.round(seqW * sc));
    cv.height = Math.max(1, Math.round(seqH * sc));
    state.canvasScale = sc;

    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;

    /* 1. Fundo */
    if (state.bgMode === 'check') {
      ctx.fillStyle = '#16181c';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#20242b';
      var sz = 12;
      for (var y = 0; y < H; y += sz) {
        for (var x = 0; x < W; x += sz) {
          if (((x / sz) + (y / sz)) % 2 === 0) ctx.fillRect(x, y, sz, sz);
        }
      }
    } else if (state.bgMode === 'black') {
      ctx.fillStyle = '#0a0b0d';
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = '#2a2e37';
      ctx.fillRect(0, 0, W, H);
    }

    var s = Math.min(W, H) / 1080;

    /* 2. Desenhar todos os elementos da lista */
    var elements = state.preset.elements || [];
    for (var i = 0; i < elements.length; i++) {
      DRAW.drawStudioElement(ctx, W, H, elements[i], s, 1.0);
    }

    /* 3. Desenhar o elemento que está sendo arrastado agora em tempo real */
    if (state.drawingElement) {
      DRAW.drawStudioElement(ctx, W, H, state.drawingElement, s, 0.8);
    }

    /* 3.1 Desenhar o caminho da Caneta (Pen Tool) em construção */
    if (state.penDrawingPath && state.penDrawingPath.points && state.penDrawingPath.points.length > 0) {
      DRAW.drawStudioElement(ctx, W, H, state.penDrawingPath, s, 0.9);

      var ppts = state.penDrawingPath.points;
      var lastPt = ppts[ppts.length - 1];

      if (state.penCursor) {
        /* Linha guia elástica até o cursor */
        ctx.save();
        ctx.strokeStyle = state.strokeColor || '#2f7bff';
        ctx.lineWidth = Math.max(1, (state.strokeWidth || 2) * s);
        ctx.setLineDash([4 * s, 3 * s]);
        ctx.beginPath();
        ctx.moveTo(lastPt.x * W, lastPt.y * H);
        ctx.lineTo(state.penCursor.nx * W, state.penCursor.ny * H);
        ctx.stroke();
        ctx.restore();

        /* Destacar primeiro nó ao aproximar para fechar o polígono */
        var distToFirst = Math.hypot(state.penCursor.pxX - ppts[0].x * W, state.penCursor.pxY - ppts[0].y * H);
        if (distToFirst < 16 && ppts.length > 2) {
          ctx.save();
          ctx.strokeStyle = '#ffe600';
          ctx.lineWidth = 2.5 * s;
          ctx.beginPath();
          ctx.arc(ppts[0].x * W, ppts[0].y * H, 8 * s, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    /* 4. Desenhar Bounding Box de Seleção com alças estilo Photoshop */
    var sel = getSelectedElement();
    if (sel && state.tool === 'select') {
      var b = getElementBounds(sel);
      var bx = b.x * W, by = b.y * H, bw = b.w * W, bh = b.h * H;

      ctx.save();
      ctx.strokeStyle = '#2f7bff';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(bx, by, bw, bh);

      /* Alças nos cantos e lados */
      var handles = getHandles(b, W, H);
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2f7bff';
      ctx.lineWidth = 1.5;
      var hSize = 6;
      for (var k in handles) {
        var hp = handles[k];
        ctx.fillRect(hp.x - hSize / 2, hp.y - hSize / 2, hSize, hSize);
        ctx.strokeRect(hp.x - hSize / 2, hp.y - hSize / 2, hSize, hSize);
      }
      ctx.restore();
    }
  }

  /* ---------- manipulação do mouse (direct manipulation) ---------- */

  function wireCanvasMouse() {
    var cv = document.getElementById('studio-canvas');
    if (!cv) return;

    function getNormalizedCoords(e) {
      var rect = cv.getBoundingClientRect();
      var pxX = e.clientX - rect.left;
      var pxY = e.clientY - rect.top;
      var nx = Math.max(0, Math.min(1, pxX / rect.width));
      var ny = Math.max(0, Math.min(1, pxY / rect.height));
      return { nx: nx, ny: ny, pxX: pxX, pxY: pxY, W: rect.width, H: rect.height };
    }

    cv.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var pos = getNormalizedCoords(e);
      state.isMouseDown = true;
      state.startPt = pos;
      state.curPt = pos;

      if (state.tool === 'select') {
        var sel = getSelectedElement();
        if (sel) {
          var b = getElementBounds(sel);
          var handle = hitTestHandles(b, pos.pxX, pos.pxY, pos.W, pos.H);
          if (handle) {
            state.dragSnapshot = getSnapshot();
            state.transformHandle = handle;
            state.origElementState = JSON.parse(JSON.stringify(sel));
            return;
          }
        }

        /* Procurar elemento clicado */
        var foundId = null;
        for (var i = state.preset.elements.length - 1; i >= 0; i--) {
          if (hitTestElement(state.preset.elements[i], pos.nx, pos.ny)) {
            foundId = state.preset.elements[i].id;
            break;
          }
        }
        state.selectedId = foundId;
        if (foundId) {
          state.dragSnapshot = getSnapshot();
          state.transformHandle = 'move';
          state.origElementState = JSON.parse(JSON.stringify(getSelectedElement()));
        }
        syncInspectorWithSelection();
        renderStudioCanvas();
      } else if (state.tool === 'eraser') {
        for (var er = state.preset.elements.length - 1; er >= 0; er--) {
          if (hitTestElement(state.preset.elements[er], pos.nx, pos.ny)) {
            pushHistory();
            state.preset.elements.splice(er, 1);
            state.selectedId = null;
            renderStudioCanvas();
            renderLayersList();
            break;
          }
        }
      } else if (state.tool === 'text') {
        var textContent = prompt('Enter text for this Safe Zone label:', 'Title Safe Area');
        if (textContent && textContent.trim()) {
          pushHistory();
          var newText = {
            id: 'text_' + Date.now(),
            type: 'text',
            x: pos.nx, y: pos.ny,
            text: textContent.trim(),
            fillColor: state.strokeColor,
            fontSize: state.fontSize,
            name: textContent.trim()
          };
          state.preset.elements.push(newText);
          state.selectedId = newText.id;
          state.tool = 'select';
          updateToolButtons();
          syncInspectorWithSelection();
          renderStudioCanvas();
          renderLayersList();
        }
      } else if (state.tool === 'pen') {
        if (state.penDrawingPath && state.penDrawingPath.points && state.penDrawingPath.points.length > 0) {
          var ppts = state.penDrawingPath.points;
          var distToFirst = Math.hypot(pos.pxX - ppts[0].x * pos.W, pos.pxY - ppts[0].y * pos.H);

          if (distToFirst < 16 && ppts.length > 2) {
            /* Fechar polígono/caminho */
            pushHistory();
            state.penDrawingPath.closed = true;
            state.preset.elements.push(state.penDrawingPath);
            state.selectedId = state.penDrawingPath.id;
            state.penDrawingPath = null;
            state.penCursor = null;
            state.tool = 'select';
            updateToolButtons();
            syncInspectorWithSelection();
            renderLayersList();
            renderStudioCanvas();
            return;
          } else {
            /* Adicionar próximo vértice */
            pushHistory();
            ppts.push({ x: pos.nx, y: pos.ny });
            renderStudioCanvas();
            return;
          }
        } else {
          /* Iniciar novo caminho */
          state.penDrawingPath = {
            id: 'path_' + Date.now(),
            type: 'path',
            points: [{ x: pos.nx, y: pos.ny }],
            closed: false,
            fillColor: state.fillColor,
            fillAlpha: state.fillAlpha,
            strokeColor: state.strokeColor,
            strokeWidth: state.strokeWidth,
            strokeStyle: state.strokeStyle,
            name: 'Pen Path ' + (state.preset.elements.length + 1),
            showNodes: true,
            visible: true,
            locked: false
          };
          renderStudioCanvas();
          return;
        }
      } else if (state.tool === 'rect' || state.tool === 'rounded-rect' || state.tool === 'ellipse' || state.tool === 'crosshair' || state.tool === 'polygon' || state.tool === 'grid') {
        state.drawingElement = {
          type: state.tool,
          x: pos.nx, y: pos.ny, w: 0, h: 0,
          fillColor: state.fillColor,
          fillAlpha: state.fillAlpha,
          strokeColor: state.strokeColor,
          strokeWidth: state.strokeWidth,
          strokeStyle: state.strokeStyle,
          radiusRatio: state.tool === 'rounded-rect' ? 0.25 : undefined,
          polyType: 'triangle',
          name: (state.tool.charAt(0).toUpperCase() + state.tool.slice(1)) + ' ' + (state.preset.elements.length + 1)
        };
      } else if (state.tool === 'line' || state.tool === 'ruler') {
        state.drawingElement = {
          type: state.tool,
          x1: pos.nx, y1: pos.ny, x2: pos.nx, y2: pos.ny,
          strokeColor: state.strokeColor,
          strokeWidth: state.strokeWidth,
          strokeStyle: state.strokeStyle,
          name: (state.tool === 'ruler' ? 'Ruler ' : 'Guide Line ') + (state.preset.elements.length + 1)
        };
      } else if (state.tool === 'brush') {
        state.drawingElement = {
          type: 'freehand',
          points: [{ x: pos.nx, y: pos.ny }],
          strokeColor: state.strokeColor,
          strokeWidth: state.strokeWidth,
          strokeStyle: state.strokeStyle,
          name: 'Freehand ' + (state.preset.elements.length + 1)
        };
      }
    });

    window.addEventListener('mousemove', function (e) {
      var pos = getNormalizedCoords(e);

      if (state.tool === 'pen') {
        state.penCursor = { nx: pos.nx, ny: pos.ny, pxX: pos.pxX, pxY: pos.pxY };
        if (state.penDrawingPath) {
          renderStudioCanvas();
        }
        return;
      }

      /* Atualizar cursor no hover da seleção */
      if (state.tool === 'select' && !state.isMouseDown) {
        var sel = getSelectedElement();
        if (sel && !sel.locked) {
          var b = getElementBounds(sel);
          var handle = hitTestHandles(b, pos.pxX, pos.pxY, pos.W, pos.H);
          if (handle === 'nw' || handle === 'se') cv.style.cursor = 'nwse-resize';
          else if (handle === 'ne' || handle === 'sw') cv.style.cursor = 'nesw-resize';
          else if (handle === 'n' || handle === 's') cv.style.cursor = 'ns-resize';
          else if (handle === 'e' || handle === 'w') cv.style.cursor = 'ew-resize';
          else if (handle === 'move') cv.style.cursor = 'move';
          else cv.style.cursor = 'default';
        } else {
          cv.style.cursor = 'default';
        }
      }

      if (!state.isMouseDown) return;

      var dx = pos.nx - state.startPt.nx;
      var dy = pos.ny - state.startPt.ny;

      if (state.tool === 'select' && state.transformHandle && state.origElementState) {
        var target = getSelectedElement();
        var orig = state.origElementState;
        if (!target || target.locked) return;

        if (state.transformHandle === 'move') {
          if (target.type === 'line' || target.type === 'ruler') {
            target.x1 = Math.max(0, Math.min(1, orig.x1 + dx));
            target.y1 = Math.max(0, Math.min(1, orig.y1 + dy));
            target.x2 = Math.max(0, Math.min(1, orig.x2 + dx));
            target.y2 = Math.max(0, Math.min(1, orig.y2 + dy));
          } else if ((target.type === 'freehand' || target.type === 'path') && target.points) {
            for (var p = 0; p < target.points.length; p++) {
              target.points[p].x = orig.points[p].x + dx;
              target.points[p].y = orig.points[p].y + dy;
            }
          } else {
            target.x = Math.max(0, Math.min(1 - target.w, orig.x + dx));
            target.y = Math.max(0, Math.min(1 - target.h, orig.y + dy));
          }
        } else if (state.transformHandle === 'se') {
          target.w = Math.max(0.02, orig.w + dx);
          target.h = Math.max(0.02, orig.h + dy);
        } else if (state.transformHandle === 'e') {
          target.w = Math.max(0.02, orig.w + dx);
        } else if (state.transformHandle === 's') {
          target.h = Math.max(0.02, orig.h + dy);
        } else if (state.transformHandle === 'nw') {
          target.x = orig.x + dx; target.w = Math.max(0.02, orig.w - dx);
          target.y = orig.y + dy; target.h = Math.max(0.02, orig.h - dy);
        } else if (state.transformHandle === 'ne') {
          target.w = Math.max(0.02, orig.w + dx);
          target.y = orig.y + dy; target.h = Math.max(0.02, orig.h - dy);
        } else if (state.transformHandle === 'sw') {
          target.x = orig.x + dx; target.w = Math.max(0.02, orig.w - dx);
          target.h = Math.max(0.02, orig.h + dy);
        }
        renderStudioCanvas();
      } else if (state.drawingElement) {
        var el = state.drawingElement;
        if (el.type === 'rect' || el.type === 'rounded-rect' || el.type === 'ellipse' || el.type === 'crosshair' || el.type === 'polygon' || el.type === 'grid') {
          var x0 = state.startPt.nx, y0 = state.startPt.ny;
          var x1 = pos.nx, y1 = pos.ny;
          var minX = Math.min(x0, x1), minY = Math.min(y0, y1);
          var w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);

          if (e.shiftKey || el.type === 'crosshair') {
            var minDim = Math.min(w, h);
            w = minDim; h = minDim;
          }

          el.x = minX; el.y = minY; el.w = w; el.h = h;
        } else if (el.type === 'line' || el.type === 'ruler') {
          el.x2 = pos.nx;
          el.y2 = pos.ny;
          if (e.shiftKey) {
            /* Trava horizontal ou vertical */
            if (Math.abs(pos.nx - el.x1) > Math.abs(pos.ny - el.y1)) el.y2 = el.y1;
            else el.x2 = el.x1;
          }
        } else if (el.type === 'freehand') {
          el.points.push({ x: pos.nx, y: pos.ny });
        }
        renderStudioCanvas();
      }
    });

    cv.addEventListener('dblclick', function () {
      if (state.tool === 'pen' && state.penDrawingPath && state.penDrawingPath.points.length > 1) {
        pushHistory();
        state.preset.elements.push(state.penDrawingPath);
        state.selectedId = state.penDrawingPath.id;
        state.penDrawingPath = null;
        state.penCursor = null;
        state.tool = 'select';
        updateToolButtons();
        syncInspectorWithSelection();
        renderLayersList();
        renderStudioCanvas();
      }
    });

    window.addEventListener('mouseup', function () {
      if (!state.isMouseDown) return;
      state.isMouseDown = false;

      if (state.drawingElement) {
        var el = state.drawingElement;
        el.id = 'el_' + Date.now();
        el.visible = true;
        el.locked = false;

        var valid = true;
        if ((el.type === 'rect' || el.type === 'rounded-rect' || el.type === 'ellipse' || el.type === 'crosshair' || el.type === 'polygon' || el.type === 'grid') && (el.w < 0.01 || el.h < 0.01)) valid = false;
        if (el.type === 'freehand' && el.points.length < 2) valid = false;

        if (valid) {
          pushHistory();
          state.preset.elements.push(el);
          state.selectedId = el.id;
          state.tool = 'select';
          updateToolButtons();
          syncInspectorWithSelection();
          renderLayersList();
        }
        state.drawingElement = null;
        renderStudioCanvas();
      } else if (state.transformHandle) {
        if (state.dragSnapshot) {
          var nowSnap = getSnapshot();
          if (state.dragSnapshot !== nowSnap) {
            state.undoStack.push(state.dragSnapshot);
            if (state.undoStack.length > 50) state.undoStack.shift();
            state.redoStack = [];
            updateUndoRedoButtons();
          }
          state.dragSnapshot = null;
        }
        state.transformHandle = null;
        state.origElementState = null;
      }
    });
  }

  /* ---------- inspector de propriedades & layers ---------- */

  function updateToolButtons() {
    var btns = document.querySelectorAll('.tool-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-tool') === state.tool);
    }
  }

  function setTool(toolName) {
    if (state.tool === 'pen' && toolName !== 'pen' && state.penDrawingPath && state.penDrawingPath.points.length > 1) {
      pushHistory();
      state.preset.elements.push(state.penDrawingPath);
      state.selectedId = state.penDrawingPath.id;
      state.penDrawingPath = null;
      state.penCursor = null;
    }
    state.tool = toolName;
    updateToolButtons();
    if (toolName !== 'select') state.selectedId = null;
    renderStudioCanvas();
  }

  function syncInspectorWithSelection() {
    var sel = getSelectedElement();
    var panel = document.getElementById('prop-inspector-body');
    if (!panel) return;

    var curStroke = sel ? sel.strokeColor : state.strokeColor;
    var curFill = sel ? sel.fillColor : state.fillColor;
    var curFillAlpha = Math.round((sel ? sel.fillAlpha : state.fillAlpha) * 100);
    var curStrokeWidth = sel ? (sel.strokeWidth || 2) : state.strokeWidth;
    var curStrokeStyle = sel ? (sel.strokeStyle || 'solid') : state.strokeStyle;

    var inStroke = document.getElementById('prop-stroke-color');
    var inFill = document.getElementById('prop-fill-color');
    var inFillAlpha = document.getElementById('prop-fill-alpha');
    var inFillAlphaVal = document.getElementById('prop-fill-alpha-val');
    var curSmooth = sel ? (sel.smoothness !== undefined ? Math.round(sel.smoothness * 100) : 50) : 50;
    var inSmooth = document.getElementById('prop-smoothness');
    var inSmoothVal = document.getElementById('prop-smoothness-val');
    var rowSmooth = document.getElementById('prop-smoothness-row');

    if (inStroke) inStroke.value = curStroke || '#2f7bff';
    if (inFill) inFill.value = curFill || '#2f7bff';
    if (inFillAlpha) inFillAlpha.value = curFillAlpha;
    if (inFillAlphaVal) inFillAlphaVal.textContent = curFillAlpha + '%';
    if (inStrokeWidth) inStrokeWidth.value = curStrokeWidth;
    if (inStrokeWidthVal) inStrokeWidthVal.textContent = curStrokeWidth + 'px';
    if (inSmooth) inSmooth.value = curSmooth;
    if (inSmoothVal) inSmoothVal.textContent = curSmooth + '%';

    var styleBtns = document.querySelectorAll('.line-style-btn');
    for (var s = 0; s < styleBtns.length; s++) {
      styleBtns[s].classList.toggle('active', styleBtns[s].getAttribute('data-style') === curStrokeStyle);
    }

    renderLayersList();
  }

  function renderLayersList() {
    var list = document.getElementById('studio-layers-stack');
    if (!list) return;
    list.innerHTML = '';

    var elements = state.preset.elements || [];
    for (var i = elements.length - 1; i >= 0; i--) {
      (function (el, idx) {
        var row = document.createElement('div');
        row.className = 'layer-item-row' + (el.id === state.selectedId ? ' active' : '') + (el.locked ? ' is-locked' : '');
        var iconTag = el.type === 'rect' ? '⬛' : (el.type === 'rounded-rect' ? '🔲' : (el.type === 'ellipse' ? '⭕' : (el.type === 'crosshair' ? '🎯' : (el.type === 'polygon' ? '📐' : (el.type === 'path' ? '✒️' : (el.type === 'grid' ? '🪟' : (el.type === 'ruler' ? '📏' : (el.type === 'line' ? '➖' : (el.type === 'freehand' ? '🖌️' : '🔤')))))))));
        var isVisible = el.visible !== false;
        var isLocked = !!el.locked;

        row.innerHTML =
          '<div class="layer-left">' +
            '<button type="button" class="btn-layer-vis" title="' + (isVisible ? 'Hide' : 'Show') + '">' + (isVisible ? '👁️' : '🙈') + '</button>' +
            '<button type="button" class="btn-layer-lock" title="' + (isLocked ? 'Unlock' : 'Lock') + '">' + (isLocked ? '🔒' : '🔓') + '</button>' +
            '<span class="layer-icon">' + iconTag + '</span>' +
            '<input type="text" class="layer-name-input" value="' + (el.name || el.type) + '">' +
          '</div>' +
          '<div class="layer-right">' +
            '<button type="button" class="btn-layer-order btn-move-up" title="Move Up">▲</button>' +
            '<button type="button" class="btn-layer-order btn-move-down" title="Move Down">▼</button>' +
            '<button type="button" class="btn-del-layer" title="Delete Layer">🗑️</button>' +
          '</div>';

        row.addEventListener('click', function (e) {
          if (e.target.tagName === 'BUTTON' || e.target.classList.contains('layer-name-input')) return;
          state.selectedId = el.id;
          state.tool = 'select';
          updateToolButtons();
          syncInspectorWithSelection();
          renderStudioCanvas();
        });

        row.querySelector('.btn-layer-vis').addEventListener('click', function (e) {
          e.stopPropagation();
          el.visible = (el.visible === false) ? true : false;
          renderLayersList();
          renderStudioCanvas();
        });

        row.querySelector('.btn-layer-lock').addEventListener('click', function (e) {
          e.stopPropagation();
          el.locked = !el.locked;
          renderLayersList();
          renderStudioCanvas();
        });

        row.querySelector('.btn-move-up').addEventListener('click', function (e) {
          e.stopPropagation();
          if (idx < elements.length - 1) {
            pushHistory();
            var tmp = elements[idx];
            elements[idx] = elements[idx + 1];
            elements[idx + 1] = tmp;
            renderLayersList();
            renderStudioCanvas();
          }
        });

        row.querySelector('.btn-move-down').addEventListener('click', function (e) {
          e.stopPropagation();
          if (idx > 0) {
            pushHistory();
            var tmp = elements[idx];
            elements[idx] = elements[idx - 1];
            elements[idx - 1] = tmp;
            renderLayersList();
            renderStudioCanvas();
          }
        });

        row.querySelector('.layer-name-input').addEventListener('input', function () {
          el.name = this.value;
          renderStudioCanvas();
        });

        row.querySelector('.btn-del-layer').addEventListener('click', function (e) {
          e.stopPropagation();
          pushHistory();
          state.preset.elements.splice(idx, 1);
          if (state.selectedId === el.id) state.selectedId = null;
          syncInspectorWithSelection();
          renderStudioCanvas();
        });

        list.appendChild(row);
      })(elements[i], i);
    }
  }

  function renderPresetsTable() {
    var list = document.getElementById('studio-presets-table');
    if (!list) return;
    list.innerHTML = '';

    state.presetsList.forEach(function (presetItem, idx) {
      var card = document.createElement('div');
      card.className = 'preset-card-item' + (presetItem.id === state.preset.id ? ' active' : '');
      card.innerHTML =
        '<div class="card-left">' +
          '<i class="preset-color-dot" style="background:' + (presetItem.color || '#2f7bff') + '"></i>' +
          '<b class="preset-card-name">' + presetItem.name + '</b>' +
        '</div>' +
        '<div class="card-actions">' +
          '<button type="button" class="btn-load-preset" title="Edit in Studio">Edit</button>' +
          '<button type="button" class="btn-export-preset" title="Export .JSON">Export</button>' +
          '<button type="button" class="btn-del-preset" title="Delete">🗑️</button>' +
        '</div>';

      card.querySelector('.btn-load-preset').addEventListener('click', function () {
        pushHistory();
        state.preset = JSON.parse(JSON.stringify(presetItem));
        var inName = document.getElementById('studio-preset-name');
        if (inName) inName.value = state.preset.name;
        state.selectedId = null;
        syncInspectorWithSelection();
        renderPresetsTable();
        renderStudioCanvas();
      });

      card.querySelector('.btn-export-preset').addEventListener('click', function () {
        exportPresetAsJson(presetItem);
      });

      card.querySelector('.btn-del-preset').addEventListener('click', function () {
        if (confirm('Delete preset "' + presetItem.name + '"?')) {
          state.presetsList.splice(idx, 1);
          savePresetsList();
          renderPresetsTable();
        }
      });

      list.appendChild(card);
    });
  }

  function exportPresetAsJson(preset) {
    var jsonStr = JSON.stringify(preset, null, 2);
    var fileName = (preset.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'safezone') + '.szone.json';

    if (typeof require !== 'undefined') {
      try {
        var fs = require('fs');
        var path = require('path');
        var os = require('os');
        var desktopPath = path.join(os.homedir(), 'Desktop', fileName);
        fs.writeFileSync(desktopPath, jsonStr, 'utf8');
        alert('Preset exported to Desktop:\n' + desktopPath);
        return;
      } catch (e) {}
    }

    var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonStr);
    var dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', fileName);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  }

  function importPresetFromJsonFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var imported = JSON.parse(e.target.result);
        if (!imported.name || !imported.elements) throw new Error('Invalid Safe Zone JSON preset');
        imported.id = 'custom_' + Date.now();
        state.presetsList.unshift(imported);
        state.preset = imported;
        savePresetsList();
        renderPresetsTable();
        syncInspectorWithSelection();
        renderStudioCanvas();
        alert('Preset "' + imported.name + '" imported successfully!');
      } catch (err) {
        alert('Error importing JSON preset: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function handleImageDrop(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        pushHistory();
        var newImg = {
          id: 'img_' + Date.now(),
          type: 'image',
          x: 0, y: 0, w: 1, h: 1,
          imgElement: img,
          dataUrl: e.target.result,
          fillAlpha: 1.0,
          name: file.name || 'Imported Image'
        };
        state.preset.elements.unshift(newImg);
        state.selectedId = newImg.id;
        state.tool = 'select';
        updateToolButtons();
        syncInspectorWithSelection();
        renderStudioCanvas();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------- controle de abertura / fechamento / fullscreen ---------- */

  function openStudio() {
    var modal = document.getElementById('zone-studio-modal');
    if (!modal) return;
    state.isOpen = true;
    modal.hidden = false;
    var inName = document.getElementById('studio-preset-name');
    if (inName) inName.value = state.preset.name || 'Custom Safe Zone';
    updateToolButtons();
    syncInspectorWithSelection();
    renderPresetsTable();
    updateUndoRedoButtons();
    renderStudioCanvas();
  }

  function closeStudio() {
    var modal = document.getElementById('zone-studio-modal');
    if (modal) {
      state.isOpen = false;
      modal.hidden = true;
    }
    if (state.isFullscreen) {
      toggleFullscreen();
    }
  }

  function setZoom(newZoom) {
    state.zoom = Math.min(4.0, Math.max(0.25, Math.round(newZoom * 100) / 100));
    var lbl = document.getElementById('zoom-level-val');
    if (lbl) lbl.textContent = Math.round(state.zoom * 100) + '%';
    renderStudioCanvas();
  }

  function toggleFullscreen() {
    state.isFullscreen = !state.isFullscreen;
    var modal = document.getElementById('zone-studio-modal');
    var btnFull = document.getElementById('btn-studio-fullscreen');
    if (modal) modal.classList.toggle('fullscreen', state.isFullscreen);
    if (btnFull) {
      btnFull.innerHTML = state.isFullscreen ? '⤡' : '⤢';
      btnFull.title = state.isFullscreen ? 'Restore Window' : 'Maximize Screen';
    }

    try {
      var screenW = (window.screen && window.screen.availWidth) ? window.screen.availWidth : 1440;
      var screenH = (window.screen && window.screen.availHeight) ? window.screen.availHeight : 900;
      var targetW = state.isFullscreen ? Math.min(1600, screenW - 60) : 320;
      var targetH = state.isFullscreen ? Math.min(960, screenH - 60) : 560;

      if (window.__adobe_cep__ && window.__adobe_cep__.resizeContent) {
        window.__adobe_cep__.resizeContent(targetW, targetH);
      } else if (window.resizeTo) {
        window.resizeTo(targetW, targetH);
      }
    } catch (e) {}

    try {
      if (state.isFullscreen) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(function () {});
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(function () {});
        } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
          document.webkitExitFullscreen();
        }
      }
    } catch (e) {}

    setTimeout(function () {
      renderStudioCanvas();
    }, 100);
  }

  function wireControls() {
    var btnOpen = document.getElementById('btn-open-studio');
    if (btnOpen) btnOpen.addEventListener('click', openStudio);

    var btnClose = document.getElementById('btn-close-studio');
    if (btnClose) btnClose.addEventListener('click', closeStudio);

    var btnFull = document.getElementById('btn-studio-fullscreen');
    if (btnFull) btnFull.addEventListener('click', toggleFullscreen);

    var btnZoomIn = document.getElementById('btn-zoom-in');
    if (btnZoomIn) btnZoomIn.addEventListener('click', function () { setZoom(state.zoom + 0.25); });

    var btnZoomOut = document.getElementById('btn-zoom-out');
    if (btnZoomOut) btnZoomOut.addEventListener('click', function () { setZoom(state.zoom - 0.25); });

    var btnZoomReset = document.getElementById('btn-zoom-reset');
    if (btnZoomReset) btnZoomReset.addEventListener('click', function () { setZoom(1.0); });

    var canvasContainer = document.getElementById('studio-canvas-container');
    if (canvasContainer) {
      canvasContainer.addEventListener('wheel', function (e) {
        if (state.isOpen) {
          e.preventDefault();
          if (e.deltaY < 0) setZoom(state.zoom + 0.15);
          else setZoom(state.zoom - 0.15);
        }
      }, { passive: false });
    }

    var btnUndo = document.getElementById('btn-studio-undo');
    if (btnUndo) btnUndo.addEventListener('click', undo);

    var btnRedo = document.getElementById('btn-studio-redo');
    if (btnRedo) btnRedo.addEventListener('click', redo);

    var btnApply = document.getElementById('btn-studio-apply');
    if (btnApply) {
      btnApply.addEventListener('click', function () {
        var foundIdx = -1;
        for (var i = 0; i < state.presetsList.length; i++) {
          if (state.presetsList[i].id === state.preset.id) {
            foundIdx = i; break;
          }
        }
        if (foundIdx >= 0) {
          state.presetsList[foundIdx] = JSON.parse(JSON.stringify(state.preset));
        } else {
          state.presetsList.unshift(JSON.parse(JSON.stringify(state.preset)));
        }
        savePresetsList();

        try {
          localStorage.setItem('safezones.activecustom', JSON.stringify(state.preset));
        } catch (e) {}

        if (window.opener && window.opener.SZ_MAIN && window.opener.SZ_MAIN.applyCustomPreset) {
          window.opener.SZ_MAIN.applyCustomPreset(state.preset);
        } else if (window.SZ_MAIN && window.SZ_MAIN.applyCustomPreset) {
          window.SZ_MAIN.applyCustomPreset(state.preset);
        }

        closeStudio();
      });
    }

    /* Tools */
    var toolBtns = document.querySelectorAll('.tool-btn');
    for (var t = 0; t < toolBtns.length; t++) {
      toolBtns[t].addEventListener('click', function () {
        setTool(this.getAttribute('data-tool'));
      });
    }

    /* Geradores Rápidos de Zonas Inteligentes (Quick Smart Zones) */
    var genChips = document.querySelectorAll('.btn-gen-chip');
    for (var g = 0; g < genChips.length; g++) {
      genChips[g].addEventListener('click', function () {
        var genType = this.getAttribute('data-gen');
        pushHistory();
        if (genType === 'subtitles') {
          var subEl = {
            id: 'sub_' + Date.now(),
            type: 'rounded-rect',
            x: 0.10, y: 0.82, w: 0.80, h: 0.14,
            radiusRatio: 0.25,
            fillColor: '#ff2d75',
            fillAlpha: 0.25,
            strokeColor: '#ff2d75',
            strokeWidth: 2,
            strokeStyle: 'dashed',
            name: 'Subtitle Safe (15%)',
            visible: true,
            locked: false
          };
          state.preset.elements.push(subEl);
          state.selectedId = subEl.id;
        } else if (genType === 'facecam') {
          var camEl = {
            id: 'cam_' + Date.now(),
            type: 'rounded-rect',
            x: 0.68, y: 0.75, w: 0.28, h: 0.20,
            radiusRatio: 0.15,
            fillColor: '#2f7bff',
            fillAlpha: 0.15,
            strokeColor: '#2f7bff',
            strokeWidth: 2,
            strokeStyle: 'solid',
            name: 'FaceCam (16:9)',
            visible: true,
            locked: false
          };
          state.preset.elements.push(camEl);
          state.selectedId = camEl.id;
        } else if (genType === 'reticle') {
          var retEl = {
            id: 'ret_' + Date.now(),
            type: 'crosshair',
            x: 0.42, y: 0.42, w: 0.16, h: 0.16,
            fillColor: '#ffe600',
            fillAlpha: 0.05,
            strokeColor: '#ffe600',
            strokeWidth: 2,
            strokeStyle: 'solid',
            name: 'Center Reticle',
            visible: true,
            locked: false
          };
          state.preset.elements.push(retEl);
          state.selectedId = retEl.id;
        } else if (genType === 'thirds') {
          var gridEl = {
            id: 'grid_' + Date.now(),
            type: 'grid',
            x: 0.0, y: 0.0, w: 1.0, h: 1.0,
            fillColor: '#ffffff',
            fillAlpha: 0.0,
            strokeColor: '#ffffff',
            strokeWidth: 1.5,
            strokeStyle: 'dashed',
            name: '3x3 Thirds Grid',
            visible: true,
            locked: false
          };
          state.preset.elements.push(gridEl);
          state.selectedId = gridEl.id;
        }
        state.tool = 'select';
        updateToolButtons();
        syncInspectorWithSelection();
        renderStudioCanvas();
      });
    }

    /* Toggle Snap Magnético */
    var btnSnap = document.getElementById('btn-toggle-snap');
    if (btnSnap) {
      btnSnap.addEventListener('click', function () {
        state.snapEnabled = !state.snapEnabled;
        btnSnap.classList.toggle('on', state.snapEnabled);
      });
    }

    /* Background Modes */
    var bgBtns = document.querySelectorAll('.bg-toggle-btn');
    for (var b = 0; b < bgBtns.length; b++) {
      bgBtns[b].addEventListener('click', function () {
        state.bgMode = this.getAttribute('data-bg');
        for (var k = 0; k < bgBtns.length; k++) bgBtns[k].classList.remove('active');
        this.classList.add('active');
        renderStudioCanvas();
      });
    }

    /* Swatches de cores rápidas */
    var swatches = document.querySelectorAll('.studio-swatch');
    for (var s = 0; s < swatches.length; s++) {
      swatches[s].addEventListener('click', function () {
        var color = this.getAttribute('data-color');
        state.strokeColor = color;
        state.fillColor = color;
        var sel = getSelectedElement();
        if (sel) {
          pushHistory();
          sel.strokeColor = color;
          sel.fillColor = color;
        }
        syncInspectorWithSelection();
        renderStudioCanvas();
      });
    }

    /* Propriedades da forma selecionada */
    var inStroke = document.getElementById('prop-stroke-color');
    if (inStroke) {
      inStroke.addEventListener('input', function () {
        state.strokeColor = this.value;
        var sel = getSelectedElement();
        if (sel) { sel.strokeColor = this.value; renderStudioCanvas(); }
      });
    }

    var inFill = document.getElementById('prop-fill-color');
    if (inFill) {
      inFill.addEventListener('input', function () {
        state.fillColor = this.value;
        var sel = getSelectedElement();
        if (sel) { sel.fillColor = this.value; renderStudioCanvas(); }
      });
    }

    var inFillAlpha = document.getElementById('prop-fill-alpha');
    if (inFillAlpha) {
      inFillAlpha.addEventListener('input', function () {
        var alpha = parseInt(this.value, 10) / 100;
        state.fillAlpha = alpha;
        document.getElementById('prop-fill-alpha-val').textContent = this.value + '%';
        var sel = getSelectedElement();
        if (sel) { sel.fillAlpha = alpha; renderStudioCanvas(); }
      });
    }

    var inStrokeWidth = document.getElementById('prop-stroke-width');
    if (inStrokeWidth) {
      inStrokeWidth.addEventListener('input', function () {
        var w = parseInt(this.value, 10);
        state.strokeWidth = w;
        document.getElementById('prop-stroke-width-val').textContent = w + 'px';
        var sel = getSelectedElement();
        if (sel) { sel.strokeWidth = w; renderStudioCanvas(); }
      });
    }

    var inSmooth = document.getElementById('prop-smoothness');
    if (inSmooth) {
      inSmooth.addEventListener('input', function () {
        var sm = parseInt(this.value, 10) / 100;
        document.getElementById('prop-smoothness-val').textContent = this.value + '%';
        var sel = getSelectedElement();
        if (sel) {
          pushHistory();
          sel.smoothness = sm;
        }
        if (state.penDrawingPath) {
          state.penDrawingPath.smoothness = sm;
        }
        renderStudioCanvas();
      });
    }

    var styleBtns = document.querySelectorAll('.line-style-btn');
    for (var sb = 0; sb < styleBtns.length; sb++) {
      styleBtns[sb].addEventListener('click', function () {
        var st = this.getAttribute('data-style');
        state.strokeStyle = st;
        var sel = getSelectedElement();
        if (sel) {
          pushHistory();
          sel.strokeStyle = st;
        }
        syncInspectorWithSelection();
        renderStudioCanvas();
      });
    }

    /* Botão de Novo Preset */
    var btnNew = document.getElementById('btn-new-preset');
    if (btnNew) {
      btnNew.addEventListener('click', function () {
        pushHistory();
        state.preset = createBlankPreset('New Preset ' + (state.presetsList.length + 1));
        var inName = document.getElementById('studio-preset-name');
        if (inName) inName.value = state.preset.name;
        state.selectedId = null;
        syncInspectorWithSelection();
        renderStudioCanvas();
      });
    }

    /* Preset Name */
    var inPresetName = document.getElementById('studio-preset-name');
    if (inPresetName) {
      inPresetName.addEventListener('input', function () {
        state.preset.name = this.value || 'Custom Safe Zone';
      });
    }

    /* Importação de Arquivos */
    var fileInput = document.getElementById('studio-file-input');
    var btnImportImg = document.getElementById('btn-import-img-tool');
    if (btnImportImg && fileInput) {
      btnImportImg.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        if (this.files && this.files[0]) handleImageDrop(this.files[0]);
      });
    }

    var jsonInput = document.getElementById('studio-json-input');
    var btnImportJson = document.getElementById('btn-import-json');
    if (btnImportJson && jsonInput) {
      btnImportJson.addEventListener('click', function () { jsonInput.click(); });
      jsonInput.addEventListener('change', function () {
        if (this.files && this.files[0]) importPresetFromJsonFile(this.files[0]);
      });
    }

    /* Drag and Drop no Canvas */
    var canvasContainer = document.getElementById('studio-canvas-container');
    if (canvasContainer) {
      canvasContainer.addEventListener('dragover', function (e) {
        e.preventDefault();
        canvasContainer.classList.add('drag-over');
      });
      canvasContainer.addEventListener('dragleave', function () {
        canvasContainer.classList.remove('drag-over');
      });
      canvasContainer.addEventListener('drop', function (e) {
        e.preventDefault();
        canvasContainer.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleImageDrop(e.dataTransfer.files[0]);
        }
      });
    }

    /* Atalhos de Teclado */
    window.addEventListener('keydown', function (e) {
      if (!state.isOpen) return;

      /* Ignorar atalhos quando digitando em input */
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      var key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === 'd') {
        e.preventDefault();
        var sel = getSelectedElement();
        if (sel) {
          pushHistory();
          var dup = JSON.parse(JSON.stringify(sel));
          dup.id = 'el_' + Date.now();
          dup.name = (dup.name || 'Layer') + ' Copy';
          if (dup.x !== undefined) { dup.x += 0.03; dup.y += 0.03; }
          state.preset.elements.push(dup);
          state.selectedId = dup.id;
          syncInspectorWithSelection();
          renderStudioCanvas();
        }
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        if (state.selectedId) {
          e.preventDefault();
          pushHistory();
          for (var i = 0; i < state.preset.elements.length; i++) {
            if (state.preset.elements[i].id === state.selectedId) {
              state.preset.elements.splice(i, 1);
              break;
            }
          }
          state.selectedId = null;
          syncInspectorWithSelection();
          renderStudioCanvas();
        }
        return;
      }

      if (key === 'enter') {
        if (state.tool === 'pen' && state.penDrawingPath && state.penDrawingPath.points.length > 1) {
          e.preventDefault();
          pushHistory();
          state.preset.elements.push(state.penDrawingPath);
          state.selectedId = state.penDrawingPath.id;
          state.penDrawingPath = null;
          state.penCursor = null;
          state.tool = 'select';
          updateToolButtons();
          syncInspectorWithSelection();
          renderLayersList();
          renderStudioCanvas();
        }
        return;
      }

      if (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
        var sel = getSelectedElement();
        if (sel) {
          e.preventDefault();
          pushHistory();
          var step = e.shiftKey ? 0.02 : 0.004;
          if (key === 'arrowup') sel.y = Math.max(0, (sel.y !== undefined ? sel.y : 0) - step);
          else if (key === 'arrowdown') sel.y = Math.min(1 - (sel.h || 0), (sel.y !== undefined ? sel.y : 0) + step);
          else if (key === 'arrowleft') sel.x = Math.max(0, (sel.x !== undefined ? sel.x : 0) - step);
          else if (key === 'arrowright') sel.x = Math.min(1 - (sel.w || 0), (sel.x !== undefined ? sel.x : 0) + step);
          renderStudioCanvas();
        }
        return;
      }

      if (key === 'v') setTool('select');
      else if (key === 'p') setTool('pen');
      else if (key === 'r') setTool('rect');
      else if (key === 'u') setTool('rounded-rect');
      else if (key === 'o') setTool('ellipse');
      else if (key === 'c') setTool('crosshair');
      else if (key === 'y') setTool('polygon');
      else if (key === 'g') setTool('grid');
      else if (key === 'm') setTool('ruler');
      else if (key === 'l') setTool('line');
      else if (key === 'b') setTool('brush');
      else if (key === 'e') setTool('eraser');
      else if (key === 't') setTool('text');
      else if (key === 'escape') closeStudio();
    });

    wireCanvasMouse();
  }

  function editPreset(preset) {
    if (!preset) return;
    pushHistory();
    state.preset = JSON.parse(JSON.stringify(preset));
    var inName = document.getElementById('studio-preset-name');
    if (inName) inName.value = state.preset.name || 'Custom Safe Zone';
    state.selectedId = null;
    openStudio();
    syncInspectorWithSelection();
    renderPresetsTable();
    renderStudioCanvas();
  }

  function deletePreset(presetId) {
    for (var i = 0; i < state.presetsList.length; i++) {
      if (state.presetsList[i].id === presetId) {
        state.presetsList.splice(i, 1);
        savePresetsList();
        renderPresetsTable();
        return true;
      }
    }
    return false;
  }

  function duplicatePreset(presetId) {
    for (var i = 0; i < state.presetsList.length; i++) {
      if (state.presetsList[i].id === presetId) {
        var clone = JSON.parse(JSON.stringify(state.presetsList[i]));
        clone.id = 'custom_' + Date.now();
        clone.name = (clone.name || 'Preset') + ' (Copy)';
        state.presetsList.splice(i + 1, 0, clone);
        savePresetsList();
        renderPresetsTable();
        return clone;
      }
    }
    return null;
  }

  root.SZ_STUDIO = {
    open: openStudio,
    close: closeStudio,
    editPreset: editPreset,
    deletePreset: deletePreset,
    duplicatePreset: duplicatePreset,
    exportPreset: exportPresetAsJson,
    getUserPresets: function () { return state.presetsList; },
    init: wireControls
  };
})(window);
