/* ==========================================================================
   Safe Zones — Interactive Website & Browser Simulator Script
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- simulador de safe zones no browser ---------- */

  var simState = {
    ratio: '9:16',
    social: 'tiktok',
    guideColor: '#ffffff',
    guideAlpha: 1.0,
    artAlpha: 0.95,
    thirds: true,
    phi: false,
    broadcast: true,
    letterbox: false
  };

  var RATIOS = {
    '9:16': { w: 1080, h: 1920, label: '1080×1920 (9:16)' },
    '16:9': { w: 1920, h: 1080, label: '1920×1080 (16:9)' },
    '1:1':  { w: 1080, h: 1080, label: '1080×1080 (1:1)' },
    '4:5':  { w: 1080, h: 1350, label: '1080×1350 (4:5)' }
  };

  function initSimulator() {
    var cv = document.getElementById('sim-canvas');
    if (!cv) return;

    /* Bind Ratio Toggles */
    var ratioBtns = document.querySelectorAll('#sim-ratio-toggles button');
    ratioBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        ratioBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        simState.ratio = btn.getAttribute('data-ratio');
        renderSim();
      });
    });

    /* Bind Social Toggles */
    var socialBtns = document.querySelectorAll('#sim-social-toggles button');
    socialBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        socialBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        simState.social = btn.getAttribute('data-social');
        renderSim();
      });
    });

    /* Bind Checkboxes */
    var chkThirds = document.getElementById('sim-chk-thirds');
    if (chkThirds) chkThirds.addEventListener('change', function () { simState.thirds = this.checked; renderSim(); });

    var chkPhi = document.getElementById('sim-chk-phi');
    if (chkPhi) chkPhi.addEventListener('change', function () { simState.phi = this.checked; renderSim(); });

    var chkBroadcast = document.getElementById('sim-chk-broadcast');
    if (chkBroadcast) chkBroadcast.addEventListener('change', function () { simState.broadcast = this.checked; renderSim(); });

    var chkLetterbox = document.getElementById('sim-chk-letterbox');
    if (chkLetterbox) chkLetterbox.addEventListener('change', function () { simState.letterbox = this.checked; renderSim(); });

    /* Bind Colors */
    var colorBtns = document.querySelectorAll('#sim-color-swatches button');
    colorBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        colorBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        simState.guideColor = btn.getAttribute('data-color');
        renderSim();
      });
    });

    /* Bind Sliders */
    var inGuideAlpha = document.getElementById('sim-guide-alpha');
    if (inGuideAlpha) {
      inGuideAlpha.addEventListener('input', function () {
        simState.guideAlpha = parseInt(this.value, 10) / 100;
        var valEl = document.getElementById('sim-guide-alpha-val');
        if (valEl) valEl.textContent = this.value + '%';
        renderSim();
      });
    }

    var inArtAlpha = document.getElementById('sim-art-alpha');
    if (inArtAlpha) {
      inArtAlpha.addEventListener('input', function () {
        simState.artAlpha = parseInt(this.value, 10) / 100;
        var valEl = document.getElementById('sim-art-alpha-val');
        if (valEl) valEl.textContent = this.value + '%';
        renderSim();
      });
    }

    renderSim();
  }

  function renderSim() {
    var cv = document.getElementById('sim-canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');

    var rInfo = RATIOS[simState.ratio] || RATIOS['9:16'];
    var W = rInfo.w;
    var H = rInfo.h;

    /* Dimensões do canvas na tela (escala proporcional) */
    var maxH = 400;
    var scale = maxH / H;
    cv.width = Math.round(W * scale);
    cv.height = Math.round(H * scale);

    var cW = cv.width;
    var cH = cv.height;

    /* Fundo da Cena Simulada (Gradiente de vídeo) */
    var grad = ctx.createLinearGradient(0, 0, cW, cH);
    grad.addColorStop(0, '#151d2f');
    grad.addColorStop(0.5, '#0b111e');
    grad.addColorStop(1, '#05070d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cW, cH);

    /* Grade quadriculada suave */
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (var x = 0; x < cW; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cH); ctx.stroke(); }
    for (var y = 0; y < cH; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cW, y); ctx.stroke(); }

    /* Silhueta simulada de modelo/pessoa central */
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(cW * 0.5, cH * 0.38, cW * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cW * 0.5, cH * 0.72, cW * 0.30, cH * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* ── Renderizar Letterbox se ativo ── */
    if (simState.letterbox) {
      ctx.fillStyle = '#000000';
      var barH = cH * 0.12;
      ctx.fillRect(0, 0, cW, barH);
      ctx.fillRect(0, cH - barH, cW, barH);
      ctx.strokeStyle = simState.guideColor;
      ctx.globalAlpha = simState.guideAlpha * 0.7;
      ctx.strokeRect(0, barH, cW, cH - barH * 2);
      ctx.globalAlpha = 1.0;
    }

    /* ── Renderizar Composição (Terços) ── */
    if (simState.thirds) {
      ctx.save();
      ctx.strokeStyle = simState.guideColor;
      ctx.globalAlpha = simState.guideAlpha * 0.5;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      /* Linhas 3x3 */
      ctx.beginPath();
      ctx.moveTo(cW / 3, 0); ctx.lineTo(cW / 3, cH);
      ctx.moveTo(cW * 2 / 3, 0); ctx.lineTo(cW * 2 / 3, cH);
      ctx.moveTo(0, cH / 3); ctx.lineTo(cW, cH / 3);
      ctx.moveTo(0, cH * 2 / 3); ctx.lineTo(cW, cH * 2 / 3);
      ctx.stroke();

      /* Pontos de interseção de ouro */
      ctx.fillStyle = simState.guideColor;
      ctx.setLineDash([]);
      [[cW/3, cH/3], [cW*2/3, cH/3], [cW/3, cH*2/3], [cW*2/3, cH*2/3]].forEach(function (pt) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    /* ── Renderizar Golden Ratio (Phi) ── */
    if (simState.phi) {
      ctx.save();
      ctx.strokeStyle = '#ffe600';
      ctx.globalAlpha = simState.guideAlpha * 0.6;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      var phiX = cW * 0.382;
      var phiY = cH * 0.382;
      ctx.strokeRect(cW * 0.618 - phiX, cH * 0.618 - phiY, phiX * 2, phiY * 2);
      ctx.restore();
    }

    /* ── Renderizar Broadcast Safe (90% Action / 80% Title) ── */
    if (simState.broadcast) {
      ctx.save();
      ctx.strokeStyle = simState.guideColor;
      ctx.globalAlpha = simState.guideAlpha * 0.8;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      /* Action Safe 90% */
      ctx.strokeRect(cW * 0.05, cH * 0.05, cW * 0.90, cH * 0.90);
      /* Title Safe 80% */
      ctx.strokeRect(cW * 0.10, cH * 0.10, cW * 0.80, cH * 0.80);
      ctx.restore();
    }

    /* ── Renderizar Overlay de Rede Social (TikTok, Reels, Shorts, Stories) ── */
    if (simState.social && simState.social !== 'none') {
      ctx.save();
      ctx.globalAlpha = simState.artAlpha;

      if (simState.social === 'tiktok' || simState.social === 'reels' || simState.social === 'shorts') {
        var socialColor = simState.social === 'tiktok' ? '#ff2d75' : (simState.social === 'reels' ? '#00e5ff' : '#ff0000');
        
        /* Top Header UI danger zone */
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, cW, cH * 0.14);
        ctx.strokeStyle = socialColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cW * 0.04, cH * 0.03, cW * 0.30, cH * 0.04);

        /* Right Actions Bar (Likes, Comments, Shares) */
        var rightW = cW * 0.18;
        ctx.fillRect(cW - rightW, cH * 0.35, rightW, cH * 0.48);
        ctx.strokeRect(cW - rightW + 4, cH * 0.35 + 4, rightW - 8, cH * 0.48 - 8);

        /* Right Action Circles */
        for (var i = 0; i < 4; i++) {
          ctx.fillStyle = socialColor;
          ctx.beginPath();
          ctx.arc(cW - rightW / 2, cH * 0.42 + i * (cH * 0.10), 8, 0, Math.PI * 2);
          ctx.fill();
        }

        /* Bottom Caption & Audio Bar */
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, cH * 0.80, cW, cH * 0.20);
        ctx.strokeStyle = socialColor;
        ctx.strokeRect(cW * 0.04, cH * 0.82, cW * 0.70, cH * 0.08);

        /* Safe Title Label */
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillText(simState.social.toUpperCase() + ' SAFE AREA', cW * 0.08, cH * 0.22);
      } else if (simState.social === 'stories') {
        /* Stories Top & Bottom UI */
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, cW, cH * 0.12);
        ctx.fillRect(0, cH * 0.86, cW, cH * 0.14);
        ctx.strokeStyle = '#00e5ff';
        ctx.strokeRect(cW * 0.05, cH * 0.14, cW * 0.90, cH * 0.70);
      }
      ctx.restore();
    }

    /* Atualizar Readout */
    var lblRes = document.getElementById('sim-readout-res');
    if (lblRes) lblRes.textContent = rInfo.label;

    var lblPlat = document.getElementById('sim-readout-platform');
    if (lblPlat) lblPlat.textContent = (simState.social === 'none' ? 'Clean Frame' : simState.social.toUpperCase() + ' SAFE AREA');
  }

  /* ---------- tabs de instalação (windows / mac / zxp) ---------- */

  function initInstallTabs() {
    var tabBtns = document.querySelectorAll('.install-tabs-row .tab-btn-3d');
    var tabPanes = document.querySelectorAll('.install-pane');

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetTab = btn.getAttribute('data-tab');

        tabBtns.forEach(function (b) { b.classList.remove('active'); });
        tabPanes.forEach(function (c) { c.classList.remove('active'); });

        btn.classList.add('active');
        var targetEl = document.getElementById('tab-' + targetTab);
        if (targetEl) targetEl.classList.add('active');
      });
    });
  }

  /* ---------- botões de cópia (clipboard) ---------- */

  function initCopyButtons() {
    var copyBtns = document.querySelectorAll('.btn-copy-3d');
    copyBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var textToCopy = btn.getAttribute('data-copy');
        if (textToCopy && navigator.clipboard) {
          navigator.clipboard.writeText(textToCopy).then(function () {
            var origText = btn.textContent;
            btn.textContent = 'Copiado! ✓';
            btn.style.background = '#4fe0a0';
            btn.style.color = '#040810';
            setTimeout(function () {
              btn.textContent = origText;
              btn.style.background = '';
              btn.style.color = '';
            }, 2000);
          });
        }
      });
    });
  }

  /* ---------- faq accordion ---------- */

  function initFAQ() {
    var faqCards = document.querySelectorAll('.faq-card-3d');
    faqCards.forEach(function (card) {
      var trigger = card.querySelector('.faq-trigger');
      if (trigger) {
        trigger.addEventListener('click', function () {
          var isOpen = card.classList.contains('is-open');
          faqCards.forEach(function (f) { f.classList.remove('is-open'); });
          if (!isOpen) card.classList.add('is-open');
        });
      }
    });
  }

  /* ---------- arranque com suporte a carregamento imediato ---------- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSimulator();
      initInstallTabs();
      initCopyButtons();
      initFAQ();
    });
  } else {
    initSimulator();
    initInstallTabs();
    initCopyButtons();
    initFAQ();
  }

})();
