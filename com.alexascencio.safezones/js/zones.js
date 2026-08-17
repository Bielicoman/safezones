/* Safe Zones — dados das zonas e proporções.
 *
 * Cada preset define a sua própria proporção e resolução base. As cotas são
 * dadas em pixels sobre essa base e normalizadas para frações, por isso
 * funcionam em qualquer resolução de sequência.
 *
 * Duas formas de descrever a área segura:
 *   1. rect + notch  — top/left/right/bottom + rail{w,h}   (o caso comum)
 *   2. poly          — polígono arbitrário em frações 0..1 (YouTube Ads)
 *
 * origem: "ref" -> cota rotulada nas folhas de referência do utilizador.
 *                   As larguras do rail (rail.w) não vêm cotadas em lado
 *                   nenhum: foram medidas ao pixel nas máscaras *Safe Zone.png
 *                   e batem com a forma desenhada nas folhas.
 *         "est"  -> estimativa nossa, ainda por confirmar
 *         "meta" -> especificação oficial da Meta, em percentagem do frame
 *                   (Business Help 980593475366490): vertical = topo 14%,
 *                   lados 6%, rodapé 20% em Stories e 35% em Reels.
 *         "web"  -> fonte secundária, não oficial
 *
 * VERIFICADO EM CAMPO — Instagram Reels, 16/08/2026
 *   Poco X7 Pro · Instagram 443.0.0.0.67 · vídeo exportado a 1080x1920.
 *   Alinhando o print do telemóvel ao design (escala 1.216, corte lateral de
 *   39 px por lado) e isolando a UI da app, mediu-se onde a interface começa:
 *     topo    UI acaba em y=90     -> a cota de 250 tem folga de 160 px
 *     rail    UI começa em x=928   -> o recorte em x=845 tem folga de 83 px
 *     rail    UI começa em y=845   -> o recorte em y=1152 fica 307 px ABAIXO
 *     rodapé  UI começa em y=1510  -> a cota de 320 (y=1600) invade 90 px
 *   Ou seja: as cotas rotuladas são menos exigentes que o observado neste
 *   aparelho no rodapé e no topo do rail. Ficam assim por decisão do autor.
 */
(function (root) {
  'use strict';

  var SOCIAL = [

    /* ── verticais 9:16, cotas das referências ── */

    {
      id: 'universal', name: 'Universal', color: '#00B37E', sub: 'all platforms · 1080×1920',
      skin: null, origem: 'ref',
      baseW: 1080, baseH: 1920,
      top: 250, left: 120, right: 120, bottom: 380,
      rail: { w: 115, h: 1200 }
    },
    {
      id: 'tiktok', name: 'TikTok', color: '#FE2C55', sub: 'caption + action rail',
      skin: 'tiktok', origem: 'ref',
      baseW: 1080, baseH: 1920,
      top: 160, left: 120, right: 120, bottom: 480,
      rail: { w: 179, h: 1080 }
    },
    {
      id: 'reels', name: 'Instagram Reels', color: '#E1306C', sub: 'caption + audio · 30 s segments',
      skin: 'reels', origem: 'ref',
      baseW: 1080, baseH: 1920,
      top: 250, left: 120, right: 120, bottom: 320,
      rail: { w: 115, h: 768 }
    },
    {
      id: 'shorts', name: 'YouTube Shorts', color: '#FF0033', sub: 'title + rail · 1 min max',
      skin: 'shorts', origem: 'ref',
      baseW: 1080, baseH: 1920,
      top: 240, left: 60, right: 120, bottom: 380,
      rail: { w: 82, h: 1200 }
    },
    {
      id: 'fbreels', name: 'Facebook Reels', color: '#0866FF', sub: 'Meta spec · 14% / 35% / 6%',
      skin: 'fbreels', origem: 'meta',
      baseW: 1080, baseH: 1920,
      /* Meta Business Help: topo 14%, rodapé 35%, 6% de cada lado */
      top: 269, left: 65, right: 65, bottom: 672,
      rail: { w: 150, h: 1000 }
    },
    {
      id: 'stories', name: 'Instagram Stories', color: '#A855F7', sub: 'Meta spec · 14% / 20% / 6%',
      skin: 'stories', origem: 'meta',
      baseW: 1080, baseH: 1920,
      /* Meta Business Help: topo 14%, rodapé 20%, 6% de cada lado */
      top: 269, left: 65, right: 65, bottom: 384,
      rail: { w: 0, h: 0 }
    },

    /* ── X / Twitter: três formatos, cada um com o seu enquadramento ── */

    {
      id: 'x-9x16', name: 'X vertical', color: '#1D9BF0', sub: 'immersive viewer · 1080×1920',
      skin: 'x', origem: 'web',
      baseW: 1080, baseH: 1920,
      /* visualizador imersivo do X: rail de ações à direita e texto em baixo */
      top: 160, left: 65, right: 140, bottom: 400,
      rail: { w: 0, h: 0 }
    },
    {
      id: 'x-1x1', name: 'X square', color: '#1D9BF0', sub: '1080×1080 · no UI on top',
      skin: null, origem: 'ref',
      ar: 1 / 1, baseW: 1080, baseH: 1080,
      top: 0, left: 0, right: 0, bottom: 0,
      rail: { w: 0, h: 0 }
    },
    {
      id: 'x-4x5', name: 'X 4:5', color: '#1D9BF0', sub: '960×1200 · no UI on top',
      skin: null, origem: 'ref',
      ar: 4 / 5, baseW: 960, baseH: 1200,
      top: 0, left: 0, right: 0, bottom: 0,
      rail: { w: 0, h: 0 }
    },

    /* ── YouTube Ads: área segura universal para todos os ecrãs.
       Não é um retângulo — é a união das áreas seguras de cada superfície,
       por isso vem descrita como polígono. Medidas por estimativa até
       conseguirmos medir os ficheiros originais. ── */

    {
      id: 'ytads-9x16', name: 'YouTube Ads 9:16', color: '#FF6A00', sub: 'universal safe area',
      skin: null, origem: 'est',
      baseW: 1080, baseH: 1920,
      poly: [[0.045, 0.150], [0.825, 0.150], [0.825, 0.650], [0.045, 0.650]]
    },
    {
      id: 'ytads-1x1', name: 'YouTube Ads 1:1', color: '#FF6A00', sub: 'universal safe area',
      skin: null, origem: 'est',
      ar: 1 / 1, baseW: 1080, baseH: 1080,
      poly: [
        [0.045, 0.045], [0.490, 0.045], [0.490, 0.097],
        [0.900, 0.097], [0.900, 0.640], [0.045, 0.640]
      ]
    },
    {
      id: 'ytads-16x9', name: 'YouTube Ads 16:9', color: '#FF6A00', sub: 'universal safe area',
      skin: null, origem: 'est',
      ar: 16 / 9, baseW: 1920, baseH: 1080,
      poly: [
        [0.185, 0.030], [0.670, 0.030], [0.670, 0.125],
        [0.920, 0.125], [0.920, 0.680],
        [0.760, 0.680], [0.760, 0.820],
        [0.655, 0.820], [0.655, 0.860],
        [0.445, 0.860], [0.445, 0.680],
        [0.020, 0.680], [0.020, 0.125], [0.185, 0.125]
      ]
    }
  ];

  /* normalização */
  for (var i = 0; i < SOCIAL.length; i++) {
    var z = SOCIAL[i];
    if (!z.ar) z.ar = 9 / 16;
    if (!z.color) z.color = '#00B37E';
    if (!z.rail) z.rail = { w: 0, h: 0 };
    z.f = {
      top: (z.top || 0) / z.baseH,
      bottom: (z.bottom || 0) / z.baseH,
      left: (z.left || 0) / z.baseW,
      right: (z.right || 0) / z.baseW,
      railW: z.rail.w / z.baseW,
      railH: z.rail.h / z.baseH
    };
  }

  var RATIOS = [
    { id: '1x1',  name: '1:1',    r: 1 / 1 },
    { id: '4x5',  name: '4:5',    r: 4 / 5 },
    { id: '9x16', name: '9:16',   r: 9 / 16 },
    { id: '4x3',  name: '4:3',    r: 4 / 3,  tag: 'Open Gate' },
    { id: '3x2',  name: '3:2',    r: 3 / 2 },
    { id: '16x9', name: '16:9',   r: 16 / 9 },
    { id: '166',  name: '1.66:1', r: 1.66 },
    { id: '185',  name: '1.85:1', r: 1.85,   tag: 'cinema' },
    { id: '2x1',  name: '2:1',    r: 2 },
    { id: '235',  name: '2.35:1', r: 2.35,   tag: 'scope' },
    { id: '239',  name: '2.39:1', r: 2.39,   tag: '21:9' },
    { id: '276',  name: '2.76:1', r: 2.76,   tag: 'Ultra Panavision' }
  ];

  root.SZ_DATA = {
    SOCIAL: SOCIAL, RATIOS: RATIOS,
    socialById: function (id) {
      for (var i = 0; i < SOCIAL.length; i++) if (SOCIAL[i].id === id) return SOCIAL[i];
      return null;
    },
    ratioById: function (id) {
      for (var i = 0; i < RATIOS.length; i++) if (RATIOS[i].id === id) return RATIOS[i];
      return null;
    }
  };
})(window);
