/* Safe Zones — motor de desenho do overlay e zone studio pro. */
(function (root) {
  'use strict';

  var D = root.SZ_DATA;

  function defaults() {
    return {
      social: 'tiktok',
      style: 2,          /* 1..6 — variante de arte do preset */
      artAlpha: 1.0,
      guideAlpha: 1.0,   /* 0..1 — opacidade das linhas de guia */
      guideColor: '#ffffff', /* cor das linhas de guia (#ffffff, #2f7bff, #ffe600, etc) */
      labels: true,
      ratios: [],
      letterbox: false,  /* barras fora da proporcao em vez de so contornar */
      matteAlpha: 1.0,   /* 1 = barras pretas opacas */
      thirds: false,
      phi: false,        /* grelha da secao aurea, 1:1.618 */
      diagonals: false,  /* simetria dinamica: diagonais e reciprocas */
      center: false,
      broadcast: false,
      line: 1.0,         /* espessura das guias de proporcao */
      elements: [],      /* elementos do Zone Studio Pro (rects, ellipses, lines, freehand, texts) */
      customMargins: null,
      customLines: [],
      customBlocks: [],
      customArtImage: null,
      customArtAlpha: 1.0
    };
  }

  /* ---------- geometria ---------- */

  function containBox(W, H, ar) {
    var w = W, h = W / ar;
    if (h > H) { h = H; w = H * ar; }
    return { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h };
  }

  function safePoints(box, z) {
    if (z.poly && z.poly.length > 2) {
      var out = [];
      for (var k = 0; k < z.poly.length; k++) {
        out.push([box.x + box.w * z.poly[k][0], box.y + box.h * z.poly[k][1]]);
      }
      return out;
    }
    var f = z.f;
    var x0 = box.x + box.w * f.left;
    var x1 = box.x + box.w * (1 - f.right);
    var y0 = box.y + box.h * f.top;
    var y1 = box.y + box.h * (1 - f.bottom);
    var rw = box.w * f.railW;
    var rh = box.h * f.railH;
    var notchTop = box.y + box.h - rh;

    if (rw <= 0 || rh <= 0 || notchTop >= y1 || notchTop <= y0) {
      return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    }
    return [
      [x0, y0], [x1, y0],
      [x1, notchTop],
      [x1 - rw, notchTop],
      [x1 - rw, y1],
      [x0, y1]
    ];
  }

  function addPoly(ctx, pts) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  function hexToRgb(hex) {
    var h = (hex || '#ffffff').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  var FONT = '"Bahnschrift", "Segoe UI Semibold", "Segoe UI", Arial, sans-serif';

  function drawMask(ctx, W, H, o, zone, box, pts) {
    if (o.art && o.art.width) {
      ctx.save();
      ctx.globalAlpha = o.artAlpha;
      ctx.drawImage(o.art, box.x, box.y, box.w, box.h);
      ctx.restore();
      return;
    }

    var lw = Math.max(1, box.w * 0.003);
    ctx.save();
    ctx.setLineDash([box.w * 0.02, box.w * 0.016]);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = lw * 3;
    ctx.beginPath(); addPoly(ctx, pts); ctx.stroke();
    ctx.strokeStyle = rgba(zone.color, 0.95);
    ctx.lineWidth = lw;
    ctx.beginPath(); addPoly(ctx, pts); ctx.stroke();
    ctx.restore();

    var fs = Math.max(11, box.w * 0.030);
    ctx.save();
    ctx.font = '600 ' + Math.round(fs) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = fs * 0.28;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    var msg = zone.name.toUpperCase() + '  —  no artwork for this style';
    ctx.strokeText(msg, box.x + box.w / 2, box.y + box.h * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(msg, box.x + box.w / 2, box.y + box.h * 0.5);
    ctx.restore();
  }

  /* ---------- primitivas de traço com drop shadow para contraste ---------- */

  function strokeNative(ctx, lw, alpha, drawPath, guideAlpha, guideColor, dash) {
    var ga = (guideAlpha !== undefined && guideAlpha !== null) ? guideAlpha : 1.0;
    var effAlpha = alpha * ga;
    if (effAlpha <= 0.002) return;

    var rgb = hexToRgb(guideColor || '#ffffff');

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (dash && dash.length) ctx.setLineDash(dash);

    /* Sombra escura por baixo */
    ctx.strokeStyle = 'rgba(0,0,0,' + (effAlpha * 0.50) + ')';
    ctx.lineWidth = lw * 2.5;
    drawPath();
    ctx.stroke();

    /* Traço colorido no topo */
    ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + effAlpha + ')';
    ctx.lineWidth = lw;
    drawPath();
    ctx.stroke();
    ctx.restore();
  }

  function midTicks(ctx, b, lw, alpha, len, guideAlpha, guideColor) {
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    strokeNative(ctx, lw, alpha, function () {
      ctx.beginPath();
      ctx.moveTo(cx, b.y);        ctx.lineTo(cx, b.y + len);
      ctx.moveTo(cx, b.y + b.h);  ctx.lineTo(cx, b.y + b.h - len);
      ctx.moveTo(b.x, cy);        ctx.lineTo(b.x + len, cy);
      ctx.moveTo(b.x + b.w, cy);  ctx.lineTo(b.x + b.w - len, cy);
    }, guideAlpha, guideColor);
  }

  function label(ctx, x, y, text, s, alpha, guideAlpha, guideColor) {
    var ga = (guideAlpha !== undefined && guideAlpha !== null) ? guideAlpha : 1.0;
    var effAlpha = alpha * ga;
    if (effAlpha <= 0.002) return;

    var rgb = hexToRgb(guideColor || '#ffffff');
    var fs = Math.max(10, Math.round(15 * s));
    ctx.save();
    ctx.font = '500 ' + fs + 'px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, fs * 0.20);
    ctx.strokeStyle = 'rgba(0,0,0,' + (effAlpha * 0.55) + ')';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + effAlpha + ')';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- renderização de elementos vetoriais do studio pro ---------- */

  function drawSplinePath(ctx, W, H, pts, closed, smoothness) {
    if (!pts || pts.length === 0) return;
    if (pts.length === 1) {
      ctx.moveTo(W * pts[0].x, H * pts[0].y);
      return;
    }
    var sm = (smoothness !== undefined ? smoothness : 0.5);
    if (pts.length === 2 || sm <= 0.01) {
      ctx.moveTo(W * pts[0].x, H * pts[0].y);
      for (var i = 1; i < pts.length; i++) {
        ctx.lineTo(W * pts[i].x, H * pts[i].y);
      }
      if (closed) ctx.closePath();
      return;
    }

    /* Catmull-Rom Spline convertida em Curvas Cúbicas de Bézier com suavidade */
    var tension = sm * 0.85;
    ctx.moveTo(W * pts[0].x, H * pts[0].y);

    var len = pts.length;
    var count = closed ? len : len - 1;

    for (var i = 0; i < count; i++) {
      var p0 = pts[(i - 1 + len) % len];
      var p1 = pts[i];
      var p2 = pts[(i + 1) % len];
      var p3 = pts[(i + 2) % len];

      if (!closed) {
        if (i === 0) p0 = p1;
        if (i === len - 2) p3 = p2;
      }

      var cp1x = W * (p1.x + (p2.x - p0.x) * tension / 3);
      var cp1y = H * (p1.y + (p2.y - p0.y) * tension / 3);
      var cp2x = W * (p2.x - (p3.x - p1.x) * tension / 3);
      var cp2y = H * (p2.y - (p3.y - p1.y) * tension / 3);

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, W * p2.x, H * p2.y);
    }
    if (closed) ctx.closePath();
  }

  function drawStudioElement(ctx, W, H, el, s, ga) {
    if (el.visible === false) return;

    var strokeColor = el.strokeColor || '#2f7bff';
    var strokeWidth = Math.max(1, (el.strokeWidth || 2) * s);
    var strokeAlpha = (el.strokeAlpha !== undefined ? el.strokeAlpha : 0.9) * ga;
    var fillAlpha = (el.fillAlpha !== undefined ? el.fillAlpha : 0.0) * ga;
    var fillColor = el.fillColor || strokeColor;

    var dash = [];
    if (el.strokeStyle === 'dashed') dash = [strokeWidth * 4, strokeWidth * 3];
    else if (el.strokeStyle === 'dotted') dash = [strokeWidth * 1.5, strokeWidth * 2];

    if (el.type === 'rect') {
      var rx = W * el.x, ry = H * el.y, rw = W * el.w, rh = H * el.h;
      if (fillAlpha > 0.001) {
        ctx.save();
        ctx.fillStyle = rgba(fillColor, fillAlpha);
        ctx.fillRect(rx, ry, rw, rh);
        ctx.restore();
      }
      strokeNative(ctx, strokeWidth, strokeAlpha, function () {
        ctx.beginPath();
        ctx.rect(rx, ry, rw, rh);
      }, ga, strokeColor, dash);

      if (el.name) {
        label(ctx, rx + 6 * s, ry + 6 * s, el.name, s * 0.75, 0.85, ga, strokeColor);
      }
    } else if (el.type === 'rounded-rect') {
      var rrx = W * el.x, rry = H * el.y, rrw = W * el.w, rrh = H * el.h;
      var rad = Math.min(rrw, rrh) * (el.radiusRatio !== undefined ? el.radiusRatio : 0.25);
      if (fillAlpha > 0.001) {
        ctx.save();
        ctx.fillStyle = rgba(fillColor, fillAlpha);
        roundRectPath(ctx, rrx, rry, rrw, rrh, rad);
        ctx.fill();
        ctx.restore();
      }
      strokeNative(ctx, strokeWidth, strokeAlpha, function () {
        roundRectPath(ctx, rrx, rry, rrw, rrh, rad);
      }, ga, strokeColor, dash);

      if (el.name) {
        label(ctx, rrx + 8 * s, rry + 6 * s, el.name, s * 0.75, 0.85, ga, strokeColor);
      }
    } else if (el.type === 'crosshair') {
      var chx = W * (el.x + el.w / 2);
      var chy = H * (el.y + el.h / 2);
      var chRad = Math.abs(W * el.w / 2);
      if (fillAlpha > 0.001) {
        ctx.save();
        ctx.fillStyle = rgba(fillColor, fillAlpha);
        ctx.beginPath(); ctx.arc(chx, chy, chRad, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      strokeNative(ctx, strokeWidth, strokeAlpha, function () {
        ctx.beginPath();
        ctx.arc(chx, chy, chRad, 0, Math.PI * 2);
        ctx.arc(chx, chy, Math.max(3, chRad * 0.35), 0, Math.PI * 2);
        var ext = chRad * 1.35;
        ctx.moveTo(chx - ext, chy); ctx.lineTo(chx + ext, chy);
        ctx.moveTo(chx, chy - ext); ctx.lineTo(chx, chy + ext);
      }, ga, strokeColor, dash);

      ctx.save();
      ctx.fillStyle = rgba(strokeColor, strokeAlpha);
      ctx.beginPath(); ctx.arc(chx, chy, Math.max(2, 3 * s), 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      if (el.name) {
        label(ctx, chx - chRad + 6 * s, chy - chRad + 6 * s, el.name, s * 0.75, 0.85, ga, strokeColor);
      }
    } else if (el.type === 'polygon') {
      var px = W * el.x, py = H * el.y, pw = W * el.w, ph = H * el.h;
      var subType = el.polyType || 'triangle';
      if (fillAlpha > 0.001) {
        ctx.save();
        ctx.fillStyle = rgba(fillColor, fillAlpha);
        ctx.beginPath();
        if (subType === 'diamond') {
          ctx.moveTo(px + pw / 2, py);
          ctx.lineTo(px + pw, py + ph / 2);
          ctx.lineTo(px + pw / 2, py + ph);
          ctx.lineTo(px, py + ph / 2);
        } else {
          ctx.moveTo(px + pw / 2, py);
          ctx.lineTo(px + pw, py + ph);
          ctx.lineTo(px, py + ph);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      strokeNative(ctx, strokeWidth, strokeAlpha, function () {
        ctx.beginPath();
        if (subType === 'diamond') {
          ctx.moveTo(px + pw / 2, py);
          ctx.lineTo(px + pw, py + ph / 2);
          ctx.lineTo(px + pw / 2, py + ph);
          ctx.lineTo(px, py + ph / 2);
        } else {
          ctx.moveTo(px + pw / 2, py);
          ctx.lineTo(px + pw, py + ph);
          ctx.lineTo(px, py + ph);
        }
        ctx.closePath();
      }, ga, strokeColor, dash);

      if (el.name) {
        label(ctx, px + 6 * s, py + 6 * s, el.name, s * 0.75, 0.85, ga, strokeColor);
      }
    } else if (el.type === 'grid') {
      var gx = W * el.x, gy = H * el.y, gw = W * el.w, gh = H * el.h;
      if (fillAlpha > 0.001) {
        ctx.save();
        ctx.fillStyle = rgba(fillColor, fillAlpha);
        ctx.fillRect(gx, gy, gw, gh);
        ctx.restore();
      }
      strokeNative(ctx, strokeWidth, strokeAlpha, function () {
        ctx.beginPath();
        ctx.rect(gx, gy, gw, gh);
        ctx.moveTo(gx + gw / 3, gy); ctx.lineTo(gx + gw / 3, gy + gh);
        ctx.moveTo(gx + gw * 2 / 3, gy); ctx.lineTo(gx + gw * 2 / 3, gy + gh);
        ctx.moveTo(gx, gy + gh / 3); ctx.lineTo(gx + gw, gy + gh / 3);
        ctx.moveTo(gx, gy + gh * 2 / 3); ctx.lineTo(gx + gw, gy + gh * 2 / 3);
      }, ga, strokeColor, dash);

      if (el.name) {
        label(ctx, gx + 6 * s, gy + 6 * s, el.name, s * 0.75, 0.85, ga, strokeColor);
      }
    } else if (el.type === 'ruler') {
      var rx1 = W * el.x1, ry1 = H * el.y1, rx2 = W * el.x2, ry2 = H * el.y2;
      var distPx = Math.round(Math.hypot(rx2 - rx1, ry2 - ry1));
      var distPercent = Math.round(Math.hypot(el.x2 - el.x1, el.y2 - el.y1) * 100);
      strokeNative(ctx, strokeWidth, strokeAlpha, function () {
        ctx.beginPath();
        ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2);
        var tLen = 6 * s;
        var ang = Math.atan2(ry2 - ry1, rx2 - rx1) + Math.PI / 2;
        ctx.moveTo(rx1 - Math.cos(ang) * tLen, ry1 - Math.sin(ang) * tLen);
        ctx.lineTo(rx1 + Math.cos(ang) * tLen, ry1 + Math.sin(ang) * tLen);
        ctx.moveTo(rx2 - Math.cos(ang) * tLen, ry2 - Math.sin(ang) * tLen);
        ctx.lineTo(rx2 + Math.cos(ang) * tLen, ry2 + Math.sin(ang) * tLen);
      }, ga, strokeColor, dash);
      var midX = (rx1 + rx2) / 2, midY = (ry1 + ry2) / 2;
      label(ctx, midX + 6 * s, midY - 14 * s, distPx + 'px (' + distPercent + '%)', s * 0.85, 0.95, ga, strokeColor);
    } else if (el.type === 'ellipse') {
      var cx = W * (el.x + el.w / 2);
      var cy = H * (el.y + el.h / 2);
      var radX = Math.abs(W * el.w / 2);
      var radY = Math.abs(H * el.h / 2);

      if (fillAlpha > 0.001) {
        ctx.save();
        ctx.fillStyle = rgba(fillColor, fillAlpha);
        ctx.beginPath();
        ctx.ellipse(cx, cy, radX, radY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      strokeNative(ctx, strokeWidth, strokeAlpha, function () {
        ctx.beginPath();
        ctx.ellipse(cx, cy, radX, radY, 0, 0, Math.PI * 2);
      }, ga, strokeColor, dash);

      if (el.name) {
        label(ctx, cx - radX + 6 * s, cy - radY + 6 * s, el.name, s * 0.75, 0.85, ga, strokeColor);
      }
    } else if (el.type === 'line') {
      var lx1 = W * el.x1, ly1 = H * el.y1, lx2 = W * el.x2, ly2 = H * el.y2;
      strokeNative(ctx, strokeWidth, strokeAlpha, function () {
        ctx.beginPath();
        ctx.moveTo(lx1, ly1);
        ctx.lineTo(lx2, ly2);
      }, ga, strokeColor, dash);
    } else if (el.type === 'path' && el.points && el.points.length > 0) {
      var pts = el.points;
      var isClosed = (el.closed !== false);
      var sm = (el.smoothness !== undefined ? el.smoothness : (el.smooth !== undefined ? (el.smooth ? 0.5 : 0) : 0.5));

      if (fillAlpha > 0.001 && pts.length > 2) {
        ctx.save();
        ctx.fillStyle = rgba(fillColor, fillAlpha);
        ctx.beginPath();
        drawSplinePath(ctx, W, H, pts, isClosed, sm);
        ctx.fill();
        ctx.restore();
      }
      strokeNative(ctx, strokeWidth, strokeAlpha, function () {
        ctx.beginPath();
        drawSplinePath(ctx, W, H, pts, isClosed, sm);
      }, ga, strokeColor, dash);

      /* Desenho de Nódulos / Anchor Points e Tangentes */
      if (el.showNodes || el.isSelected) {
        ctx.save();
        for (var ni = 0; ni < pts.length; ni++) {
          var nx = W * pts[ni].x, ny = H * pts[ni].y;
          ctx.fillStyle = (ni === 0 && isClosed) ? '#ffe600' : '#0a0d14';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = Math.max(1, 1.5 * s);
          ctx.fillRect(nx - 3.5 * s, ny - 3.5 * s, 7 * s, 7 * s);
          ctx.strokeRect(nx - 3.5 * s, ny - 3.5 * s, 7 * s, 7 * s);
        }
        ctx.restore();
      }

      if (el.name && pts[0]) {
        label(ctx, W * pts[0].x + 6 * s, H * pts[0].y + 6 * s, el.name, s * 0.75, 0.85, ga, strokeColor);
      }
    } else if (el.type === 'freehand' && el.points && el.points.length > 1) {
      var smFree = (el.smoothness !== undefined ? el.smoothness : 0.6);
      strokeNative(ctx, strokeWidth, strokeAlpha, function () {
        ctx.beginPath();
        drawSplinePath(ctx, W, H, el.points, false, smFree);
      }, ga, strokeColor, dash);
    } else if (el.type === 'text') {
      var tx = W * el.x, ty = H * el.y;
      var fSize = Math.max(12, Math.round((el.fontSize || 18) * s));
      ctx.save();
      ctx.font = '600 ' + fSize + 'px "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, fSize * 0.22);
      ctx.strokeStyle = 'rgba(0,0,0,' + (0.55 * ga) + ')';
      ctx.strokeText(el.text || 'Text', tx, ty);
      ctx.fillStyle = rgba(el.fillColor || '#ffffff', ga);
      ctx.fillText(el.text || 'Text', tx, ty);
      ctx.restore();
    } else if (el.type === 'image' && el.imgElement && el.imgElement.width) {
      var ix = W * (el.x || 0), iy = H * (el.y || 0);
      var iw = W * (el.w || 1.0), ih = H * (el.h || 1.0);
      ctx.save();
      ctx.globalAlpha = (el.fillAlpha !== undefined ? el.fillAlpha : 1.0) * ga;
      ctx.drawImage(el.imgElement, ix, iy, iw, ih);
      ctx.restore();
    }
  }

  /* ---------- desenho principal ---------- */

  function draw(ctx, W, H, o) {
    var s = Math.min(W, H) / 1080;
    var lwMultiplier = (o.line !== undefined && o.line !== null) ? o.line : 1.0;
    var lw = Math.max(1, Math.round(2 * s)) * lwMultiplier;
    var tick = Math.min(W, H) * 0.018;
    var ga = (o.guideAlpha !== undefined && o.guideAlpha !== null) ? o.guideAlpha : 1.0;
    var gc = o.guideColor || '#ffffff';

    ctx.clearRect(0, 0, W, H);

    var zone = (o.social && o.social !== 'none' && o.social.indexOf('custom') < 0) ? D.socialById(o.social) : null;
    var frameAR = W / H;

    if (zone) {
      var box = containBox(W, H, zone.ar);
      var pts = safePoints(box, zone);
      drawMask(ctx, W, H, o, zone, box, pts);
    }

    /* letterbox: matte real fora da primeira proporcao escolhida */
    if (o.letterbox && o.ratios && o.ratios.length) {
      var lb = D.ratioById(o.ratios[0]);
      if (lb) {
        var lbb = containBox(W, H, lb.r);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,' + (o.matteAlpha !== undefined ? o.matteAlpha : 1.0) + ')';
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.moveTo(lbb.x, lbb.y);
        ctx.lineTo(lbb.x + lbb.w, lbb.y);
        ctx.lineTo(lbb.x + lbb.w, lbb.y + lbb.h);
        ctx.lineTo(lbb.x, lbb.y + lbb.h);
        ctx.closePath();
        ctx.fill('evenodd');
        ctx.restore();
      }
    }

    /* seccao aurea: divisoes a 1/phi */
    if (o.phi) {
      var PHI = 0.6180339887;
      strokeNative(ctx, Math.max(1, lw * 0.7), 0.34, function () {
        ctx.beginPath();
        ctx.moveTo(W * (1 - PHI), 0); ctx.lineTo(W * (1 - PHI), H);
        ctx.moveTo(W * PHI, 0);       ctx.lineTo(W * PHI, H);
        ctx.moveTo(0, H * (1 - PHI)); ctx.lineTo(W, H * (1 - PHI));
        ctx.moveTo(0, H * PHI);       ctx.lineTo(W, H * PHI);
      }, ga, gc);
    }

    /* simetria dinamica */
    if (o.diagonals) {
      strokeNative(ctx, Math.max(1, lw * 0.7), 0.30, function () {
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(W, H);
        ctx.moveTo(W, 0); ctx.lineTo(0, H);
      }, ga, gc);
      var k = (W * H) / (W * W + H * H);
      strokeNative(ctx, Math.max(1, lw * 0.6), 0.22, function () {
        ctx.beginPath();
        ctx.moveTo(0, H); ctx.lineTo(W * k * (W / H), H - H * k);
        ctx.moveTo(W, H); ctx.lineTo(W - W * k * (W / H), H - H * k);
        ctx.moveTo(0, 0); ctx.lineTo(W * k * (W / H), H * k);
        ctx.moveTo(W, 0); ctx.lineTo(W - W * k * (W / H), H * k);
      }, ga, gc);
    }

    /* guias de proporcao */
    if (o.ratios && o.ratios.length) {
      var showRatioLabels = o.labels || o.ratios.length > 1;
      for (var i = 0; i < o.ratios.length; i++) {
        var rt = D.ratioById(o.ratios[i]);
        if (!rt) continue;
        var rb = containBox(W, H, rt.r);
        var isFull = Math.abs(rt.r - frameAR) < 0.002;
        var rx = isFull ? Math.max(1, lw) : rb.x;
        var ry = isFull ? Math.max(1, lw) : rb.y;
        var rw = isFull ? (W - rx * 2) : rb.w;
        var rh = isFull ? (H - ry * 2) : rb.h;
        var drawBox = { x: rx, y: ry, w: rw, h: rh };

        (function (box) {
          strokeNative(ctx, lw, 0.62, function () {
            ctx.beginPath();
            ctx.rect(box.x, box.y, box.w, box.h);
          }, ga, gc);
        })(drawBox);

        midTicks(ctx, drawBox, lw, 0.62, tick * 0.7, ga, gc);
        if (showRatioLabels) {
          label(ctx, drawBox.x + 12 * s, drawBox.y + 12 * s,
                rt.name + (rt.tag ? '  ' + rt.tag : ''), s * 0.88, 0.72, ga, gc);
        }
      }
    }

    /* margens broadcast action / title */
    if (o.broadcast) {
      var mk = [0.90, 0.80];
      for (var b = 0; b < mk.length; b++) {
        (function (p) {
          var bw = W * p, bh = H * p;
          strokeNative(ctx, lw, 0.55, function () {
            ctx.beginPath();
            ctx.rect((W - bw) / 2, (H - bh) / 2, bw, bh);
          }, ga, gc);
        })(mk[b]);
      }
    }

    /* tercos */
    if (o.thirds) {
      strokeNative(ctx, Math.max(1, lw * 0.6), 0.28, function () {
        ctx.beginPath();
        for (var t = 1; t <= 2; t++) {
          ctx.moveTo(W * t / 3, 0); ctx.lineTo(W * t / 3, H);
          ctx.moveTo(0, H * t / 3); ctx.lineTo(W, H * t / 3);
        }
      }, ga, gc);
    }

    /* cruz de centro */
    if (o.center) {
      var cl = Math.min(W, H) * 0.02;
      strokeNative(ctx, lw, 0.6, function () {
        ctx.beginPath();
        ctx.moveTo(W / 2 - cl, H / 2); ctx.lineTo(W / 2 + cl, H / 2);
        ctx.moveTo(W / 2, H / 2 - cl); ctx.lineTo(W / 2, H / 2 + cl);
      }, ga, gc);
    }

    /* ── Elementos do Zone Studio Pro (Formas, Vetores, Pincel, Textos) ── */

    if (o.elements && o.elements.length) {
      for (var eIdx = 0; eIdx < o.elements.length; eIdx++) {
        drawStudioElement(ctx, W, H, o.elements[eIdx], s, ga);
      }
    }

    /* Margens personalizadas do utilizador */
    if (o.customMargins) {
      var cm = o.customMargins;
      var cmLeft = cm.left !== undefined ? cm.left : 0.10;
      var cmRight = cm.right !== undefined ? cm.right : 0.10;
      var cmTop = cm.top !== undefined ? cm.top : 0.10;
      var cmBottom = cm.bottom !== undefined ? cm.bottom : 0.10;
      var x0 = W * cmLeft;
      var x1 = W * (1 - cmRight);
      var y0 = H * cmTop;
      var y1 = H * (1 - cmBottom);
      var cColor = cm.color || gc;
      var cAlpha = cm.alpha !== undefined ? cm.alpha : 0.85;

      strokeNative(ctx, lw * (cm.line || 1.0), cAlpha, function () {
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
      }, ga, cColor);

      if (cm.fillAlpha && cm.fillAlpha > 0.001) {
        ctx.save();
        ctx.fillStyle = rgba(cColor, cm.fillAlpha);
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.restore();
      }
    }

    /* Linhas de guia livres */
    if (o.customLines && o.customLines.length) {
      for (var lIdx = 0; lIdx < o.customLines.length; lIdx++) {
        (function (line) {
          var lColor = line.color || gc;
          var lAlpha = line.alpha !== undefined ? line.alpha : 0.80;
          strokeNative(ctx, Math.max(1, lw * (line.line || 1.0)), lAlpha, function () {
            ctx.beginPath();
            if (line.type === 'h') {
              var y = H * line.pos;
              ctx.moveTo(0, y); ctx.lineTo(W, y);
            } else {
              var x = W * line.pos;
              ctx.moveTo(x, 0); ctx.lineTo(x, H);
            }
          }, ga, lColor);
        })(o.customLines[lIdx]);
      }
    }

    /* Sólidos coloridos (Safe Blocks / Mattes) */
    if (o.customBlocks && o.customBlocks.length) {
      for (var bIdx = 0; bIdx < o.customBlocks.length; bIdx++) {
        var blk = o.customBlocks[bIdx];
        var bx = W * blk.x, by = H * blk.y, bw = W * blk.w, bh = H * blk.h;
        ctx.save();
        ctx.fillStyle = rgba(blk.color || '#ff0055', blk.alpha !== undefined ? blk.alpha : 0.35);
        ctx.fillRect(bx, by, bw, bh);
        ctx.restore();

        strokeNative(ctx, Math.max(1, lw * 0.8), 0.65, function () {
          ctx.beginPath();
          ctx.rect(bx, by, bw, bh);
        }, ga, blk.color || '#ff0055');

        if (blk.name) {
          label(ctx, bx + 6 * s, by + 6 * s, blk.name, s * 0.75, 0.85, ga, blk.color || '#ffffff');
        }
      }
    }

    /* Imagem customizada importada */
    if (o.customArtImage && o.customArtImage.width) {
      ctx.save();
      ctx.globalAlpha = o.customArtAlpha !== undefined ? o.customArtAlpha : 1.0;
      ctx.drawImage(o.customArtImage, 0, 0, W, H);
      ctx.restore();
    }

    /* assinatura de resolucao */
    if (o.labels) {
      var g = gcd(W, H) || 1;
      var fs = Math.max(10, Math.round(15 * s * 0.88));
      label(ctx, 14 * s, H - 14 * s - fs * 1.25,
            W + '×' + H + '   ' + Math.round(W / g) + ':' + Math.round(H / g),
            s * 0.88, 0.6, 1.0, gc);
    }
  }

  root.SZ_DRAW = {
    draw: draw,
    drawStudioElement: drawStudioElement,
    defaults: defaults,
    containBox: containBox,
    safePoints: safePoints,
    hexToRgb: hexToRgb,
    rgba: rgba
  };
})(window);
