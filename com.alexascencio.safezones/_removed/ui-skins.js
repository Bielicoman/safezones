/* Safe Zones — mockups da interface de cada app.
 *
 * REGRA CENTRAL: nada aqui usa coordenadas inventadas. Todo o layout deriva
 * das cotas em zones.js (top / left / right / bottom / rail), por isso a UI
 * desenhada e o contorno da zona segura coincidem sempre.
 *
 * Espaco virtual = resolucao base do preset, mapeado para a caixa do frame.
 * Icones desenhados a partir da geometria real, nao aproximacoes.
 * Cor de marca opcional: com ela desligada fica tudo branco, registo nativo.
 */
(function (root) {
  'use strict';

  var VW = 1080, VH = 1920;   /* redefinido por preset em draw() */

  /* paleta de marca — so onde a app realmente usa cor */
  var C = {
    igBlue: '#3797F0',
    igPink: '#E1306C',
    tkRed:  '#FE2C55',
    tkCyan: '#25F4EE',
    ytRed:  '#FF0033',
    xBlue:  '#1D9BF0',
    fbBlue: '#0866FF',
    white:  '#FFFFFF'
  };

  /* ---------- layout derivado das cotas ---------- */

  function layout(z) {
    var L = z.left || 0, R = z.right || 0, T = z.top || 0, B = z.bottom || 0;
    var rw = z.rail.w, rh = z.rail.h;

    var lay = {
      L: L, R: R, T: T, B: B,
      topCy: T * 0.52,
      bodyX: L * 0.5,
      bottomTop: VH - B,
      hasRail: rw > 0 && rh > 0,
      hasTop: T > 0,
      hasBottom: B > 0
    };

    if (lay.hasRail) {
      lay.rail = {
        x0: VW - R - rw,
        cx: VW - (R + rw) / 2,
        y0: VH - rh,
        y1: VH - B,
        w: R + rw
      };
    }

    lay.navCy = VH - B * 0.17;
    lay.textTop = lay.bottomTop + B * 0.10;
    lay.textRight = lay.hasRail ? lay.rail.x0 - 24 : VW - R;
    return lay;
  }

  function railSlots(lay, n) {
    var span = lay.rail.y1 - lay.rail.y0;
    var step = span / n;
    var s = Math.min(lay.rail.w * 0.19, step * 0.29);
    var ys = [];
    for (var i = 0; i < n; i++) ys.push(lay.rail.y0 + step * (i + 0.5));
    return { ys: ys, s: s, step: step };
  }

  /* ---------- painter ---------- */

  function P(ctx, alpha, useColor) {
    this.c = ctx;
    this.a = alpha;
    this.col = !!useColor;
  }

  P.prototype.k = function (hex) {
    return (this.col && hex) ? hex : C.white;
  };

  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  P.prototype.stroke = function (path, w, a, hex) {
    var c = this.c;
    a = (a === undefined ? 1 : a) * this.a;
    c.save();
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(0,0,0,' + (a * 0.45) + ')';
    c.lineWidth = w + 6;
    path(); c.stroke();
    c.strokeStyle = rgba(this.k(hex), a);
    c.lineWidth = w;
    path(); c.stroke();
    c.restore();
  };

  P.prototype.fill = function (path, a, hex) {
    var c = this.c;
    a = (a === undefined ? 0.22 : a) * this.a;
    c.save();
    c.fillStyle = rgba(this.k(hex), a);
    path(); c.fill();
    c.restore();
  };

  P.prototype.text = function (x, y, str, size, weight, align, a, hex) {
    var c = this.c;
    a = (a === undefined ? 1 : a) * this.a;
    c.save();
    c.font = (weight || 500) + ' ' + size + 'px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    c.textAlign = align || 'left';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = Math.max(3, size * 0.24);
    c.strokeStyle = 'rgba(0,0,0,' + (a * 0.6) + ')';
    c.strokeText(str, x, y);
    c.fillStyle = rgba(this.k(hex), a);
    c.fillText(str, x, y);
    c.restore();
  };

  P.prototype.width = function (str, size, weight) {
    var c = this.c;
    c.save();
    c.font = (weight || 500) + ' ' + size + 'px "Segoe UI", Arial, sans-serif';
    var w = c.measureText(str).width;
    c.restore();
    return w;
  };

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ---------- icones do rail ---------- */

  P.prototype.heart = function (cx, cy, s, hex) {
    var c = this.c;
    this.stroke(function () {
      c.beginPath();
      c.moveTo(cx, cy + s * 0.70);
      c.bezierCurveTo(cx - s * 1.30, cy - s * 0.18, cx - s * 0.62, cy - s * 1.00, cx, cy - s * 0.32);
      c.bezierCurveTo(cx + s * 0.62, cy - s * 1.00, cx + s * 1.30, cy - s * 0.18, cx, cy + s * 0.70);
      c.closePath();
    }, Math.max(3, s * 0.16), 0.95, hex);
  };

  P.prototype.bubble = function (cx, cy, s, round) {
    var c = this.c;
    this.stroke(function () {
      if (round) {
        c.beginPath();
        c.arc(cx, cy - s * 0.06, s * 0.92, 0, Math.PI * 2);
        c.moveTo(cx - s * 0.34, cy + s * 0.70);
        c.lineTo(cx - s * 0.62, cy + s * 1.14);
        c.lineTo(cx - s * 0.02, cy + s * 0.80);
      } else {
        rr(c, cx - s * 0.95, cy - s * 0.88, s * 1.9, s * 1.48, s * 0.40);
        c.moveTo(cx - s * 0.34, cy + s * 0.58);
        c.lineTo(cx - s * 0.58, cy + s * 1.10);
        c.lineTo(cx + s * 0.02, cy + s * 0.62);
      }
    }, Math.max(3, s * 0.16), 0.95);
  };

  /* aviao de papel do Instagram: contorno + dobra interior */
  P.prototype.plane = function (cx, cy, s) {
    var c = this.c;
    this.stroke(function () {
      c.beginPath();
      c.moveTo(cx - s * 0.95, cy - s * 0.30);
      c.lineTo(cx + s * 0.95, cy - s * 0.95);
      c.lineTo(cx + s * 0.30, cy + s * 0.95);
      c.lineTo(cx - s * 0.02, cy + s * 0.14);
      c.closePath();
      c.moveTo(cx - s * 0.02, cy + s * 0.14);
      c.lineTo(cx + s * 0.95, cy - s * 0.95);
    }, Math.max(3, s * 0.15), 0.95);
  };

  P.prototype.arrowShare = function (cx, cy, s) {
    var c = this.c;
    this.stroke(function () {
      c.beginPath();
      c.moveTo(cx - s * 0.90, cy + s * 0.72);
      c.quadraticCurveTo(cx - s * 0.70, cy - s * 0.40, cx + s * 0.34, cy - s * 0.44);
      c.moveTo(cx + s * 0.34, cy - s * 0.44);
      c.lineTo(cx + s * 0.34, cy - s * 0.90);
      c.lineTo(cx + s * 0.96, cy - s * 0.20);
      c.lineTo(cx + s * 0.34, cy + s * 0.44);
      c.lineTo(cx + s * 0.34, cy - s * 0.02);
    }, Math.max(3, s * 0.15), 0.95);
  };

  P.prototype.bookmark = function (cx, cy, s) {
    var c = this.c;
    this.stroke(function () {
      c.beginPath();
      c.moveTo(cx - s * 0.66, cy - s * 0.92);
      c.lineTo(cx + s * 0.66, cy - s * 0.92);
      c.lineTo(cx + s * 0.66, cy + s * 0.92);
      c.lineTo(cx, cy + s * 0.34);
      c.lineTo(cx - s * 0.66, cy + s * 0.92);
      c.closePath();
    }, Math.max(3, s * 0.15), 0.95);
  };

  P.prototype.thumb = function (cx, cy, s, down) {
    var c = this.c, d = down ? -1 : 1;
    this.stroke(function () {
      c.beginPath();
      c.moveTo(cx - s * 0.92, cy + d * s * 0.16);
      c.lineTo(cx - s * 0.42, cy + d * s * 0.16);
      c.lineTo(cx - s * 0.42, cy + d * s * 0.92);
      c.lineTo(cx - s * 0.92, cy + d * s * 0.92);
      c.closePath();
      c.moveTo(cx - s * 0.26, cy + d * s * 0.90);
      c.lineTo(cx + s * 0.54, cy + d * s * 0.90);
      c.quadraticCurveTo(cx + s * 0.92, cy + d * s * 0.86, cx + s * 0.86, cy + d * s * 0.44);
      c.lineTo(cx + s * 0.72, cy - d * s * 0.06);
      c.lineTo(cx + s * 0.16, cy - d * s * 0.06);
      c.lineTo(cx + s * 0.30, cy - d * s * 0.72);
      c.quadraticCurveTo(cx + s * 0.24, cy - d * s * 1.00, cx - s * 0.02, cy - d * s * 0.90);
      c.lineTo(cx - s * 0.26, cy - d * s * 0.02);
      c.closePath();
    }, Math.max(3, s * 0.15), 0.95);
  };

  P.prototype.dots = function (cx, cy, s, horiz) {
    var c = this.c, self = this;
    for (var i = -1; i <= 1; i++) {
      (function (i) {
        self.fill(function () {
          c.beginPath();
          c.arc(cx + (horiz ? i * s * 0.66 : 0), cy + (horiz ? 0 : i * s * 0.66), s * 0.19, 0, Math.PI * 2);
        }, 0.95);
      })(i);
    }
  };

  P.prototype.note = function (cx, cy, s) {
    var c = this.c;
    this.stroke(function () {
      c.beginPath();
      c.moveTo(cx - s * 0.26, cy + s * 0.52);
      c.lineTo(cx - s * 0.26, cy - s * 0.80);
      c.lineTo(cx + s * 0.68, cy - s * 1.00);
      c.lineTo(cx + s * 0.68, cy + s * 0.32);
      c.moveTo(cx - s * 0.26, cy + s * 0.52);
      c.arc(cx - s * 0.50, cy + s * 0.52, s * 0.24, 0, Math.PI * 2);
      c.moveTo(cx + s * 0.68, cy + s * 0.32);
      c.arc(cx + s * 0.44, cy + s * 0.32, s * 0.24, 0, Math.PI * 2);
    }, Math.max(3, s * 0.15), 0.95);
  };

  /* miniatura de audio: quadrado arredondado com nota dentro */
  P.prototype.audioTile = function (cx, cy, s) {
    var c = this.c;
    this.stroke(function () { rr(c, cx - s * 0.82, cy - s * 0.82, s * 1.64, s * 1.64, s * 0.36); },
                Math.max(3, s * 0.15), 0.9);
    this.note(cx, cy, s * 0.50);
  };

  P.prototype.avatar = function (cx, cy, r, plus, square, ringHex) {
    var c = this.c;
    this.stroke(function () {
      if (square) rr(c, cx - r, cy - r, r * 2, r * 2, r * 0.34);
      else { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); }
    }, Math.max(3, r * 0.13), 0.95, ringHex);
    this.stroke(function () {
      c.beginPath();
      c.arc(cx, cy - r * 0.20, r * 0.30, 0, Math.PI * 2);
      c.moveTo(cx - r * 0.48, cy + r * 0.60);
      c.arc(cx, cy + r * 0.60, r * 0.48, Math.PI, 0);
    }, Math.max(2, r * 0.10), 0.6);
    if (plus) {
      this.fill(function () {
        c.beginPath(); c.arc(cx, cy + r * 1.02, r * 0.34, 0, Math.PI * 2);
      }, 0.95, C.tkRed);
      this.stroke(function () {
        c.beginPath();
        c.moveTo(cx - r * 0.17, cy + r * 1.02); c.lineTo(cx + r * 0.17, cy + r * 1.02);
        c.moveTo(cx, cy + r * 0.85); c.lineTo(cx, cy + r * 1.19);
      }, Math.max(2, r * 0.10), 0.95);
    }
  };

  P.prototype.disc = function (cx, cy, r) {
    var c = this.c;
    this.fill(function () { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); }, 0.20);
    this.stroke(function () {
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
      c.moveTo(cx + r * 0.34, cy); c.arc(cx, cy, r * 0.34, 0, Math.PI * 2);
    }, Math.max(3, r * 0.13), 0.9);
  };

  P.prototype.search = function (cx, cy, s) {
    var c = this.c;
    this.stroke(function () {
      c.beginPath();
      c.arc(cx - s * 0.16, cy - s * 0.16, s * 0.60, 0, Math.PI * 2);
      c.moveTo(cx + s * 0.28, cy + s * 0.28);
      c.lineTo(cx + s * 0.84, cy + s * 0.84);
    }, Math.max(3, s * 0.15), 0.9);
  };

  P.prototype.camera = function (cx, cy, s) {
    var c = this.c;
    this.stroke(function () {
      rr(c, cx - s * 0.95, cy - s * 0.52, s * 1.9, s * 1.20, s * 0.26);
      c.moveTo(cx + s * 0.30, cy + s * 0.08);
      c.arc(cx, cy + s * 0.08, s * 0.30, 0, Math.PI * 2);
      c.moveTo(cx - s * 0.44, cy - s * 0.52);
      c.lineTo(cx - s * 0.26, cy - s * 0.86);
      c.lineTo(cx + s * 0.26, cy - s * 0.86);
      c.lineTo(cx + s * 0.44, cy - s * 0.52);
    }, Math.max(3, s * 0.14), 0.9);
  };

  /* selo verificado: disco de marca com visto recortado */
  P.prototype.verified = function (cx, cy, s) {
    var c = this.c, a = this.a, hex = this.k(C.igBlue);
    c.save();
    c.fillStyle = 'rgba(0,0,0,' + (a * 0.45) + ')';
    c.beginPath(); c.arc(cx, cy, s * 1.18, 0, Math.PI * 2); c.fill();
    c.fillStyle = rgba(hex, a * 0.95);
    c.beginPath(); c.arc(cx, cy, s, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,' + (a * 0.95) + ')';
    c.lineWidth = Math.max(2, s * 0.28);
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(cx - s * 0.44, cy + s * 0.02);
    c.lineTo(cx - s * 0.12, cy + s * 0.36);
    c.lineTo(cx + s * 0.46, cy - s * 0.36);
    c.stroke();
    c.restore();
    return s * 1.18;
  };

  /* botao: contorno (IG) ou preenchido de marca (YouTube, Facebook) */
  P.prototype.button = function (x, cy, label, size, h, fillHex) {
    var c = this.c;
    var w = this.width(label, size, 700) + size * 1.6;
    if (fillHex) {
      this.fill(function () { rr(c, x, cy - h / 2, w, h, h * 0.24); }, 0.95, fillHex);
      this.text(x + w / 2, cy, label, size, 700, 'center', 0.98, this.col ? '#FFFFFF' : null);
    } else {
      this.stroke(function () { rr(c, x, cy - h / 2, w, h, h * 0.24); }, Math.max(2, h * 0.07), 0.95);
      this.text(x + w / 2, cy, label, size, 700, 'center', 0.98);
    }
    return w;
  };

  P.prototype.pill = function (x, cy, label, size, h) {
    var c = this.c;
    var w = this.width(label, size, 600) + size * 1.7;
    this.fill(function () { rr(c, x, cy - h / 2, w, h, h / 2); }, 0.22);
    this.stroke(function () { rr(c, x, cy - h / 2, w, h, h / 2); }, Math.max(2, h * 0.06), 0.8);
    this.text(x + w / 2, cy, label, size, 600, 'center', 0.98);
    return w;
  };

  P.prototype.bars = function (x, y, widths, h, gap) {
    var c = this.c, self = this;
    for (var i = 0; i < widths.length; i++) {
      (function (i) {
        self.fill(function () { rr(c, x, y + i * gap - h / 2, widths[i], h, h / 2); }, 0.34);
      })(i);
    }
  };

  P.prototype.count = function (cx, y, str, s) {
    this.text(cx, y, str, Math.max(20, s * 0.60), 600, 'center', 0.92);
  };


  /* balao do TikTok: bolha arredondada com tres pontos dentro */
  P.prototype.bubbleDots = function (cx, cy, s) {
    var c = this.c, self = this;
    this.stroke(function () {
      rr(c, cx - s * 0.95, cy - s * 0.86, s * 1.9, s * 1.52, s * 0.52);
      c.moveTo(cx - s * 0.38, cy + s * 0.62);
      c.lineTo(cx - s * 0.66, cy + s * 1.16);
      c.lineTo(cx - s * 0.04, cy + s * 0.66);
    }, Math.max(3, s * 0.16), 0.95);
    for (var i = -1; i <= 1; i++) {
      (function (i) {
        self.fill(function () {
          c.beginPath();
          c.arc(cx + i * s * 0.42, cy - s * 0.10, s * 0.15, 0, Math.PI * 2);
        }, 0.95);
      })(i);
    }
  };

  /* seta curva de partilha do TikTok */
  P.prototype.tkShare = function (cx, cy, s) {
    var c = this.c;
    this.stroke(function () {
      c.beginPath();
      c.moveTo(cx - s * 0.95, cy + s * 0.86);
      c.quadraticCurveTo(cx - s * 0.86, cy - s * 0.34, cx + s * 0.16, cy - s * 0.42);
      c.moveTo(cx + s * 0.16, cy - s * 0.92);
      c.lineTo(cx + s * 0.96, cy - s * 0.14);
      c.lineTo(cx + s * 0.16, cy + s * 0.56);
      c.lineTo(cx + s * 0.16, cy - s * 0.92);
    }, Math.max(3, s * 0.16), 0.95);
  };

  /* botao + do TikTok, com a franja cromatica ciano/vermelho */
  P.prototype.tkPlus = function (cx, cy, s) {
    var c = this.c, self = this;
    var w = s * 2.2, h = s * 1.5, r = s * 0.42, off = s * 0.26;
    if (this.col) {
      this.fill(function () { rr(c, cx - w / 2 - off, cy - h / 2, w, h, r); }, 0.95, C.tkCyan);
      this.fill(function () { rr(c, cx - w / 2 + off, cy - h / 2, w, h, r); }, 0.95, C.tkRed);
    }
    this.fill(function () { rr(c, cx - w / 2, cy - h / 2, w, h, r); }, 0.95, C.white);
    c.save();
    c.strokeStyle = 'rgba(20,20,24,' + (this.a * 0.92) + ')';
    c.lineWidth = Math.max(3, s * 0.20);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx - s * 0.36, cy); c.lineTo(cx + s * 0.36, cy);
    c.moveTo(cx, cy - s * 0.36); c.lineTo(cx, cy + s * 0.36);
    c.stroke();
    c.restore();
  };

  /* caixa de entrada: balao quadrado com um traco */
  P.prototype.inboxBox = function (cx, cy, s) {
    var c = this.c;
    this.stroke(function () {
      rr(c, cx - s * 0.88, cy - s * 0.80, s * 1.76, s * 1.42, s * 0.26);
      c.moveTo(cx - s * 0.30, cy + s * 0.62);
      c.lineTo(cx - s * 0.52, cy + s * 1.10);
      c.lineTo(cx + s * 0.02, cy + s * 0.66);
      c.moveTo(cx - s * 0.36, cy - s * 0.10);
      c.lineTo(cx + s * 0.36, cy - s * 0.10);
    }, Math.max(3, s * 0.16), 0.9);
  };

  /* etiqueta LIVE do canto superior esquerdo */
  P.prototype.liveBadge = function (cx, cy, s) {
    var c = this.c;
    this.stroke(function () {
      rr(c, cx - s * 0.95, cy - s * 0.70, s * 1.9, s * 1.30, s * 0.28);
      c.moveTo(cx - s * 0.55, cy - s * 0.70);
      c.lineTo(cx - s * 0.30, cy - s * 1.05);
      c.moveTo(cx + s * 0.55, cy - s * 0.70);
      c.lineTo(cx + s * 0.30, cy - s * 1.05);
    }, Math.max(3, s * 0.15), 0.9);
    this.text(cx, cy, 'LIVE', s * 0.62, 700, 'center', 0.95);
  };

  /* ---------- glifos da barra de navegacao ---------- */

  var GLYPH = {
    home: function (p, c, cx, cy, s, hex) {
      p.stroke(function () {
        c.beginPath();
        c.moveTo(cx - s, cy - s * 0.02);
        c.lineTo(cx, cy - s * 0.95);
        c.lineTo(cx + s, cy - s * 0.02);
        c.moveTo(cx - s * 0.74, cy - s * 0.22);
        c.lineTo(cx - s * 0.74, cy + s * 0.90);
        c.lineTo(cx + s * 0.74, cy + s * 0.90);
        c.lineTo(cx + s * 0.74, cy - s * 0.22);
      }, Math.max(3, s * 0.17), 0.9, hex);
    },
    person: function (p, c, cx, cy, s) {
      p.stroke(function () {
        c.beginPath();
        c.arc(cx, cy - s * 0.36, s * 0.42, 0, Math.PI * 2);
        c.moveTo(cx - s * 0.82, cy + s * 0.92);
        c.arc(cx, cy + s * 0.92, s * 0.82, Math.PI, 0);
      }, Math.max(3, s * 0.17), 0.9);
    },
    search: function (p, c, cx, cy, s) { p.search(cx, cy, s * 1.15); },
    plane: function (p, c, cx, cy, s) { p.plane(cx, cy, s * 0.92); },
    plus: function (p, c, cx, cy, s, hex) {
      p.stroke(function () {
        rr(c, cx - s * 1.05, cy - s * 0.78, s * 2.1, s * 1.56, s * 0.40);
        c.moveTo(cx - s * 0.40, cy); c.lineTo(cx + s * 0.40, cy);
        c.moveTo(cx, cy - s * 0.40); c.lineTo(cx, cy + s * 0.40);
      }, Math.max(3, s * 0.17), 0.9, hex);
    },
    reels: function (p, c, cx, cy, s) {
      p.stroke(function () {
        rr(c, cx - s * 0.95, cy - s * 0.95, s * 1.9, s * 1.9, s * 0.52);
        c.moveTo(cx - s * 0.30, cy - s * 0.95); c.lineTo(cx - s * 0.95, cy - s * 0.18);
        c.moveTo(cx + s * 0.42, cy - s * 0.95); c.lineTo(cx - s * 0.24, cy - s * 0.18);
        c.moveTo(cx - s * 0.18, cy - s * 0.20);
        c.lineTo(cx + s * 0.40, cy + s * 0.14);
        c.lineTo(cx - s * 0.18, cy + s * 0.48);
        c.closePath();
      }, Math.max(3, s * 0.16), 0.9);
    },
    shorts: function (p, c, cx, cy, s, hex) {
      p.stroke(function () {
        rr(c, cx - s * 0.62, cy - s * 0.98, s * 1.24, s * 1.96, s * 0.56);
        c.moveTo(cx - s * 0.20, cy - s * 0.34);
        c.lineTo(cx + s * 0.36, cy);
        c.lineTo(cx - s * 0.20, cy + s * 0.34);
        c.closePath();
      }, Math.max(3, s * 0.16), 0.9, hex);
    },
    video: function (p, c, cx, cy, s) {
      p.stroke(function () {
        rr(c, cx - s, cy - s * 0.72, s * 2, s * 1.44, s * 0.30);
        c.moveTo(cx - s * 0.22, cy - s * 0.36);
        c.lineTo(cx + s * 0.36, cy);
        c.lineTo(cx - s * 0.22, cy + s * 0.36);
        c.closePath();
      }, Math.max(3, s * 0.16), 0.9);
    },
    bell: function (p, c, cx, cy, s) {
      p.stroke(function () {
        c.beginPath();
        c.moveTo(cx - s * 0.80, cy + s * 0.50);
        c.lineTo(cx - s * 0.66, cy + s * 0.28);
        c.lineTo(cx - s * 0.66, cy - s * 0.18);
        c.arc(cx, cy - s * 0.18, s * 0.66, Math.PI, 0);
        c.lineTo(cx + s * 0.66, cy + s * 0.28);
        c.lineTo(cx + s * 0.80, cy + s * 0.50);
        c.closePath();
        c.moveTo(cx - s * 0.22, cy + s * 0.72);
        c.arc(cx, cy + s * 0.72, s * 0.22, Math.PI, 0);
      }, Math.max(3, s * 0.16), 0.9);
    },
    menu: function (p, c, cx, cy, s) {
      p.stroke(function () {
        c.beginPath();
        for (var i = -1; i <= 1; i++) {
          c.moveTo(cx - s * 0.82, cy + i * s * 0.52);
          c.lineTo(cx + s * 0.82, cy + i * s * 0.52);
        }
      }, Math.max(3, s * 0.17), 0.9);
    },
    people: function (p, c, cx, cy, s) {
      p.stroke(function () {
        c.beginPath();
        c.arc(cx - s * 0.30, cy - s * 0.34, s * 0.38, 0, Math.PI * 2);
        c.moveTo(cx - s * 1.04, cy + s * 0.86);
        c.arc(cx - s * 0.30, cy + s * 0.86, s * 0.74, Math.PI, 0);
        c.moveTo(cx + s * 0.92, cy - s * 0.40);
        c.arc(cx + s * 0.62, cy - s * 0.40, s * 0.30, 0, Math.PI * 2);
        c.moveTo(cx + s * 0.10, cy + s * 0.86);
        c.arc(cx + s * 0.62, cy + s * 0.86, s * 0.52, Math.PI, 0);
      }, Math.max(3, s * 0.16), 0.9);
    },
    market: function (p, c, cx, cy, s) {
      p.stroke(function () {
        rr(c, cx - s * 0.78, cy - s * 0.34, s * 1.56, s * 1.28, s * 0.16);
        c.moveTo(cx - s * 0.40, cy - s * 0.34);
        c.arc(cx, cy - s * 0.34, s * 0.40, Math.PI, 0);
      }, Math.max(3, s * 0.16), 0.9);
    },
    spark: function (p, c, cx, cy, s) {
      p.stroke(function () {
        c.beginPath();
        c.moveTo(cx, cy - s * 0.95);
        c.quadraticCurveTo(cx + s * 0.20, cy - s * 0.20, cx + s * 0.95, cy);
        c.quadraticCurveTo(cx + s * 0.20, cy + s * 0.20, cx, cy + s * 0.95);
        c.quadraticCurveTo(cx - s * 0.20, cy + s * 0.20, cx - s * 0.95, cy);
        c.quadraticCurveTo(cx - s * 0.20, cy - s * 0.20, cx, cy - s * 0.95);
        c.closePath();
      }, Math.max(3, s * 0.16), 0.9);
    },
    tkplus: function (p, c, cx, cy, s) { p.tkPlus(cx, cy, s); },
    inbox: function (p, c, cx, cy, s) { p.inboxBox(cx, cy, s); },
    dot: function (p, c, cx, cy, s) {
      p.stroke(function () { c.beginPath(); c.arc(cx, cy, s * 0.72, 0, Math.PI * 2); },
               Math.max(3, s * 0.16), 0.7);
    }
  };

  /* barra de navegacao inferior — e o que justifica as margens de baixo
     serem tao generosas. labels so onde a app realmente os mostra. */
  P.prototype.nav = function (lay, glyphs, labels, activeHex) {
    var c = this.c, self = this;
    var n = glyphs.length;
    var step = VW / n;
    var s = Math.min(step * 0.15, lay.B * 0.095);
    var cy = lay.navCy;

    for (var i = 0; i < n; i++) {
      (function (i) {
        var cx = step * (i + 0.5);
        (GLYPH[glyphs[i]] || GLYPH.dot)(self, c, cx, cy, s, i === 1 ? activeHex : null);
        if (labels && labels[i]) {
          self.text(cx, cy + s * 1.66, labels[i], Math.max(17, s * 0.56), 500, 'center', 0.7);
        }
      })(i);
    }
  };

  /* ---------- skins ---------- */

  var SKINS = {};

  /* TikTok — segue o kit oficial: LIVE + separadores + lupa no topo,
     rail avatar / coracao / balao de pontos / marcador / seta curva / disco,
     rodape @username + descricao + traducao + musica, nav com etiquetas. */
  SKINS.tiktok = function (p, lay) {
    if (lay.hasTop) {
      var fsTop = Math.max(28, lay.T * 0.24);
      p.liveBadge(lay.bodyX + fsTop * 0.95, lay.topCy, fsTop * 0.72);

      var wFol = p.width('Following', fsTop, 600);
      var wFor = p.width('For You', fsTop, 700);
      var xFor = VW / 2 + wFol / 2 + 16;
      var xFol = xFor - wFor / 2 - wFol / 2 - 44;
      p.text(xFol, lay.topCy, 'Following', fsTop, 600, 'center', 0.70);
      p.fill(function () {
        p.c.beginPath();
        p.c.arc(xFol + wFol / 2 + fsTop * 0.22, lay.topCy - fsTop * 0.42, fsTop * 0.13, 0, Math.PI * 2);
      }, 0.95, C.tkRed);
      p.text(xFor, lay.topCy, 'For You', fsTop, 700, 'center', 1);
      p.stroke(function () {
        p.c.beginPath();
        p.c.moveTo(xFor - wFor / 2, lay.topCy + fsTop * 0.80);
        p.c.lineTo(xFor + wFor / 2, lay.topCy + fsTop * 0.80);
      }, Math.max(4, fsTop * 0.11), 0.95);

      p.search(VW - lay.R * 0.55, lay.topCy, fsTop * 0.92);
    }

    if (lay.hasRail) {
      var k = railSlots(lay, 6), cx = lay.rail.cx, s = k.s, off = s * 1.48;
      p.avatar(cx, k.ys[0], s * 0.95, true);
      p.heart(cx, k.ys[1], s, C.tkRed);   p.count(cx, k.ys[1] + off, '3.5k', s);
      p.bubbleDots(cx, k.ys[2], s);       p.count(cx, k.ys[2] + off, '250', s);
      p.bookmark(cx, k.ys[3], s);         p.count(cx, k.ys[3] + off, '9531', s);
      p.tkShare(cx, k.ys[4], s);          p.count(cx, k.ys[4] + off, '520', s);
      p.disc(cx, k.ys[5], s * 0.98);
      p.note(cx - s * 1.35, k.ys[5] - s * 0.75, s * 0.30);
      p.note(cx - s * 1.70, k.ys[5] + s * 0.30, s * 0.26);
    }

    var x = lay.bodyX, y = lay.textTop, fs = Math.max(26, lay.B * 0.072);
    p.text(x, y + fs * 0.6, '@username', fs, 700, 'left', 1);
    p.text(x, y + fs * 2.0, 'Description #hashtag', fs * 0.92, 500, 'left', 0.95);
    p.text(x, y + fs * 3.3, 'See Translation', fs * 0.92, 600, 'left', 0.95);
    p.note(x + fs * 0.42, y + fs * 4.6, fs * 0.55);
    p.text(x + fs * 1.15, y + fs * 4.6, 'Original Song', fs * 0.92, 500, 'left', 0.95);

    p.nav(lay, ['home', 'search', 'tkplus', 'inbox', 'person'],
          ['Home', 'Discover', '', 'Inbox', 'Me'], C.tkCyan);
  };

  /* Reels — segue a referencia do kit: camera no topo direito, rail com
     heart / bubble / plane / dots / audio, rodape com avatar + nome +
     verificado + botao Follow de contorno, hashtags e linha de audio. */
  SKINS.reels = function (p, lay) {
    if (lay.hasTop) {
      p.camera(VW - lay.R * 0.55, lay.topCy, Math.max(30, lay.T * 0.20) * 0.95);
    }

    if (lay.hasRail) {
      var k = railSlots(lay, 5), cx = lay.rail.cx, s = k.s, off = s * 1.46;
      p.heart(cx, k.ys[0], s);         p.count(cx, k.ys[0] + off, '35 K', s);
      p.bubble(cx, k.ys[1], s, true);  p.count(cx, k.ys[1] + off, '1 724', s);
      p.plane(cx, k.ys[2], s);         p.count(cx, k.ys[2] + off, '17 K', s);
      p.dots(cx, k.ys[3], s, false);
      p.audioTile(cx, k.ys[4], s);
    }

    var x = lay.bodyX, y = lay.textTop, fs = Math.max(26, lay.B * 0.105);
    var cy1 = y + fs * 0.7;

    p.avatar(x + fs * 0.85, cy1, fs * 0.85);
    var nx = x + fs * 2.1;
    p.text(nx, cy1, 'username', fs, 700, 'left', 1);
    var vx = nx + p.width('username', fs, 700) + fs * 0.44;
    p.verified(vx, cy1, fs * 0.34);
    p.button(vx + fs * 0.80, cy1, 'Follow', fs * 0.76, fs * 1.45, null);

    p.text(x, cy1 + fs * 1.55, '#Lorem #ilsum #dolor', fs * 0.84, 500, 'left', 0.92);
    p.note(x + fs * 0.36, cy1 + fs * 2.60, fs * 0.50);
    p.text(x + fs * 1.05, cy1 + fs * 2.60, 'Lorem ilsum • Original audio', fs * 0.80, 500, 'left', 0.92);

    p.nav(lay, ['home', 'reels', 'plane', 'search', 'person'], null);
  };

  SKINS.shorts = function (p, lay) {
    if (lay.hasTop) {
      var fsTop = Math.max(26, lay.T * 0.16);
      var hPill = lay.T * 0.34;
      var xt = lay.bodyX;
      xt += p.pill(xt, lay.topCy, 'Subscriptions', fsTop, hPill) + 18;
      xt += p.pill(xt, lay.topCy, 'Live', fsTop, hPill) + 18;
      p.pill(xt, lay.topCy, 'Trends', fsTop, hPill);
      p.search(VW - lay.R * 0.55, lay.topCy, fsTop * 1.05);
    }

    if (lay.hasRail) {
      var k = railSlots(lay, 6), cx = lay.rail.cx, s = k.s, off = s * 1.46;
      p.thumb(cx, k.ys[0], s, false); p.count(cx, k.ys[0] + off, '56 K', s);
      p.thumb(cx, k.ys[1], s, true);  p.count(cx, k.ys[1] + off, 'Dislike', s);
      p.bubble(cx, k.ys[2], s);       p.count(cx, k.ys[2] + off, '123', s);
      p.arrowShare(cx, k.ys[3], s);   p.count(cx, k.ys[3] + off, 'Share', s);
      p.stroke(function () {
        p.c.beginPath();
        p.c.arc(cx, k.ys[4], s * 0.86, 0, Math.PI * 2);
        p.c.moveTo(cx - s * 0.42, k.ys[4]); p.c.lineTo(cx + s * 0.42, k.ys[4]);
        p.c.moveTo(cx, k.ys[4] - s * 0.42); p.c.lineTo(cx, k.ys[4] + s * 0.42);
      }, Math.max(3, s * 0.15), 0.92);
      p.count(cx, k.ys[4] + off, 'Remix', s);
      p.avatar(cx, k.ys[5], s * 0.86, false, true);
    }

    var bx = lay.bodyX, by = lay.textTop, f2 = Math.max(26, lay.B * 0.095);
    var cy2 = by + f2 * 0.6;
    p.avatar(bx + f2 * 0.85, cy2, f2 * 0.85);
    p.text(bx + f2 * 2.1, cy2, '@channelname', f2, 700, 'left', 1);
    p.button(bx + f2 * 2.1 + p.width('@channelname', f2, 700) + f2 * 0.6,
             cy2, 'Subscribe', f2 * 0.76, f2 * 1.45, C.ytRed);
    p.bars(bx, by + f2 * 2.3, [(lay.textRight - bx) * 0.94, (lay.textRight - bx) * 0.66], f2 * 0.5, f2);
    p.note(bx + f2 * 0.42, by + f2 * 4.0, f2 * 0.55);
    p.text(bx + f2 * 1.25, by + f2 * 4.0, 'Storm Boy · Xavier', f2 * 0.78, 500, 'left', 0.92);

    p.nav(lay, ['home', 'shorts', 'plus', 'bell', 'person'], null, C.ytRed);
  };

  SKINS.stories = function (p, lay) {
    var c = p.c;
    var segs = 5, gap = 10;
    var x0 = lay.L * 0.5, x1 = VW - lay.R * 0.5;
    var w = (x1 - x0 - gap * (segs - 1)) / segs;
    var barY = lay.T * 0.26;
    for (var i = 0; i < segs; i++) {
      (function (i) {
        p.fill(function () { rr(c, x0 + i * (w + gap), barY, w, 8, 4); }, i === 1 ? 0.98 : 0.35);
      })(i);
    }
    var fs = Math.max(28, lay.T * 0.15);
    var cy = lay.T * 0.68;
    p.avatar(x0 + fs * 0.95, cy, fs * 0.95, false, false, C.igPink);
    p.text(x0 + fs * 2.3, cy, 'username', fs, 700, 'left', 1);
    p.text(x0 + fs * 2.3 + p.width('username', fs, 700) + fs * 0.7, cy, '2 h', fs * 0.86, 500, 'left', 0.7);
    p.dots(VW - lay.R * 1.30, cy, fs * 0.9, true);
    p.stroke(function () {
      c.beginPath();
      c.moveTo(VW - lay.R * 0.75, cy - fs * 0.5); c.lineTo(VW - lay.R * 0.25, cy + fs * 0.5);
      c.moveTo(VW - lay.R * 0.25, cy - fs * 0.5); c.lineTo(VW - lay.R * 0.75, cy + fs * 0.5);
    }, 5, 0.9);

    var by = lay.bottomTop + lay.B * 0.38, bh = lay.B * 0.38;
    var bw = (VW - lay.L * 0.5 - lay.R * 0.5) * 0.68;
    p.stroke(function () { rr(c, lay.L * 0.5, by - bh / 2, bw, bh, bh / 2); }, 5, 0.85);
    p.text(lay.L * 0.5 + bh * 0.55, by, 'Send message…', bh * 0.36, 500, 'left', 0.78);
    p.heart(lay.L * 0.5 + bw + bh * 0.75, by, bh * 0.40);
    p.plane(lay.L * 0.5 + bw + bh * 1.85, by, bh * 0.40);
  };

  SKINS.x = function (p, lay) {
    var c = p.c, fs = Math.max(28, lay.T * 0.22);
    if (lay.hasTop) {
      p.stroke(function () {
        c.beginPath();
        c.moveTo(lay.bodyX + fs * 1.1, lay.topCy); c.lineTo(lay.bodyX, lay.topCy);
        c.moveTo(lay.bodyX + fs * 0.55, lay.topCy - fs * 0.55);
        c.lineTo(lay.bodyX, lay.topCy);
        c.lineTo(lay.bodyX + fs * 0.55, lay.topCy + fs * 0.55);
      }, 5, 0.9);
      p.search(VW - lay.R * 0.55, lay.topCy, fs * 0.9);
    }

    if (lay.hasRail) {
      var k = railSlots(lay, 5), cx = lay.rail.cx, s = k.s, off = s * 1.46;
      p.bubble(cx, k.ys[0], s);  p.count(cx, k.ys[0] + off, '312', s);
      p.stroke(function () {
        c.beginPath();
        c.moveTo(cx - s * 0.62, k.ys[1] - s * 0.18); c.lineTo(cx + s * 0.34, k.ys[1] - s * 0.18);
        c.lineTo(cx + s * 0.34, k.ys[1] + s * 0.46);
        c.moveTo(cx + s * 0.10, k.ys[1] - s * 0.46); c.lineTo(cx + s * 0.34, k.ys[1] - s * 0.18);
        c.moveTo(cx + s * 0.62, k.ys[1] + s * 0.18); c.lineTo(cx - s * 0.34, k.ys[1] + s * 0.18);
        c.lineTo(cx - s * 0.34, k.ys[1] - s * 0.46);
        c.moveTo(cx - s * 0.10, k.ys[1] + s * 0.46); c.lineTo(cx - s * 0.34, k.ys[1] + s * 0.18);
      }, Math.max(3, s * 0.15), 0.92);
      p.count(cx, k.ys[1] + off, '1,2 K', s);
      p.heart(cx, k.ys[2], s);   p.count(cx, k.ys[2] + off, '18 K', s);
      p.stroke(function () {
        c.beginPath();
        c.moveTo(cx - s * 0.62, k.ys[3] + s * 0.52); c.lineTo(cx - s * 0.62, k.ys[3] + s * 0.02);
        c.moveTo(cx - s * 0.20, k.ys[3] + s * 0.52); c.lineTo(cx - s * 0.20, k.ys[3] - s * 0.34);
        c.moveTo(cx + s * 0.22, k.ys[3] + s * 0.52); c.lineTo(cx + s * 0.22, k.ys[3] + s * 0.18);
        c.moveTo(cx + s * 0.64, k.ys[3] + s * 0.52); c.lineTo(cx + s * 0.64, k.ys[3] - s * 0.62);
      }, Math.max(3, s * 0.15), 0.92);
      p.count(cx, k.ys[3] + off, '904 K', s);
      p.bookmark(cx, k.ys[4], s * 0.9);
    }

    var x = lay.bodyX, y = lay.textTop, f3 = Math.max(26, lay.B * 0.085);
    if (!lay.hasRail) {
      /* X vertical: barra de reproducao + nav, sem rail lateral */
      var pyy = lay.bottomTop + lay.B * 0.30, ph = lay.B * 0.10;
      p.avatar(lay.B * 0.24, pyy, ph * 0.75);
      p.fill(function () { rr(c, lay.B * 0.50, pyy - 3, VW - lay.B * 1.55, 6, 3); }, 0.5);
      p.fill(function () { rr(c, VW - lay.B * 0.95, pyy - 7, lay.B * 0.26, 14, 7); }, 0.4);
      p.fill(function () { rr(c, VW - lay.B * 0.62, pyy - 7, lay.B * 0.26, 14, 7); }, 0.4);
      p.nav(lay, ['home', 'search', 'spark', 'people', 'person'], null, C.xBlue);
      return;
    }
    p.avatar(x + f3 * 0.85, y + f3 * 0.6, f3 * 0.85);
    p.text(x + f3 * 2.1, y + f3 * 0.6, 'Name', f3, 700, 'left', 1);
    var vx2 = x + f3 * 2.1 + p.width('Name', f3, 700) + f3 * 0.42;
    p.verified(vx2, y + f3 * 0.6, f3 * 0.32);
    p.text(vx2 + f3 * 0.72, y + f3 * 0.6, '@username', f3 * 0.86, 500, 'left', 0.7);
    p.bars(x, y + f3 * 2.2, [(lay.textRight - x) * 0.94, (lay.textRight - x) * 0.70], f3 * 0.5, f3);
    p.note(x + f3 * 0.42, y + f3 * 3.9, f3 * 0.55);
    p.text(x + f3 * 1.25, y + f3 * 3.9, 'original audio', f3 * 0.78, 500, 'left', 0.92);

    p.nav(lay, ['home', 'search', 'spark', 'people', 'person'], null, C.xBlue);
  };

  SKINS.fbreels = function (p, lay) {
    if (lay.hasTop) {
      var fsTop = Math.max(30, lay.T * 0.20);
      p.text(lay.bodyX, lay.topCy, 'Reels', fsTop * 1.15, 700, 'left', 1);
      p.camera(VW - lay.R * 0.55, lay.topCy, fsTop * 0.92);
    }

    if (lay.hasRail) {
      var k = railSlots(lay, 5), cx = lay.rail.cx, s = k.s, off = s * 1.46;
      p.heart(cx, k.ys[0], s);   p.count(cx, k.ys[0] + off, '24 K', s);
      p.bubble(cx, k.ys[1], s);  p.count(cx, k.ys[1] + off, '1,1 K', s);
      p.plane(cx, k.ys[2], s);   p.count(cx, k.ys[2] + off, '380', s);
      p.dots(cx, k.ys[3], s, false);
      p.avatar(cx, k.ys[4], s * 0.86, false, true);
    }

    var x4 = lay.bodyX, y4 = lay.textTop, f4 = Math.max(26, lay.B * 0.085);
    p.avatar(x4 + f4 * 0.85, y4 + f4 * 0.6, f4 * 0.85);
    p.text(x4 + f4 * 2.1, y4 + f4 * 0.6, 'Page name', f4, 700, 'left', 1);
    p.button(x4 + f4 * 2.1 + p.width('Page name', f4, 700) + f4 * 0.6,
             y4 + f4 * 0.6, 'Follow', f4 * 0.76, f4 * 1.45, null);
    p.bars(x4, y4 + f4 * 2.2, [(lay.textRight - x4) * 0.88], f4 * 0.5, f4);
    p.button(x4, y4 + f4 * 3.9, 'Learn more', f4 * 0.80, f4 * 1.7, C.fbBlue);

    p.nav(lay, ['home', 'video', 'market', 'bell', 'menu'], null, C.fbBlue);
  };

  /* ---------- API ---------- */

  function draw(ctx, box, z, alpha, useColor) {
    if (!z || !z.skin) return false;
    var fn = SKINS[z.skin];
    if (!fn) return false;
    VW = z.baseW; VH = z.baseH;

    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    ctx.translate(box.x, box.y);
    ctx.scale(box.w / VW, box.h / VH);
    fn(new P(ctx, alpha === undefined ? 0.85 : alpha, useColor), layout(z));
    ctx.restore();
    return true;
  }

  root.SZ_SKINS = { draw: draw, has: function (id) { return !!SKINS[id]; }, COLORS: C };
})(window);
