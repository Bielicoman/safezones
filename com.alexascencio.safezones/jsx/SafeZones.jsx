/* Safe Zones — lado do host (ExtendScript, ES3).
 *
 * ES3: sem let/const, sem JSON, sem forEach/map/filter/indexOf de array.
 * Um erro de sintaxe aqui derruba TODAS as funcoes de uma vez e o painel
 * so diz "EvalScript error." — por isso o build corre node --check neste ficheiro.
 *
 * Protocolo de resposta: "OK|payload" ou "ERR|mensagem".
 */

var SZ_PREFIX = 'SafeZones_';
var SZ_BIN = 'Safe Zones';

if (typeof $.global.sz_activeTrack === 'undefined') {
    $.global.sz_activeTrack = -1;
}

function sz_ok(m)  { return 'OK|' + (m === undefined ? '' : m); }
function sz_err(m) { return 'ERR|' + m; }

function sz_seq() {
    if (!app.project) return null;
    return app.project.activeSequence || null;
}

/* dimensoes da sequencia; getSettings() e o caminho fiavel nas versoes recentes */
function sz_dims(seq) {
    var w = 0, h = 0;
    try {
        var s = seq.getSettings();
        if (s) { w = parseInt(s.videoFrameWidth, 10); h = parseInt(s.videoFrameHeight, 10); }
    } catch (e) {}
    if (!w || !h) {
        try {
            w = parseInt(seq.frameSizeHorizontal, 10);
            h = parseInt(seq.frameSizeVertical, 10);
        } catch (e2) {}
    }
    return (w > 0 && h > 0) ? { w: w, h: h } : null;
}

function sz_sequenceInfo() {
    var seq = sz_seq();
    if (!seq) return sz_err('No active sequence. Open one in Premiere.');
    var d = sz_dims(seq);
    if (!d) return sz_err('Could not read the sequence resolution.');
    return sz_ok(d.w + ',' + d.h + ',' + seq.name);
}

/* ---------- bin ---------- */

function sz_findBin() {
    var root = app.project.rootItem;
    for (var i = 0; i < root.children.numItems; i++) {
        var it = root.children[i];
        if (it.type === ProjectItemType.BIN && it.name === SZ_BIN) return it;
    }
    return null;
}

function sz_getBin() {
    var b = sz_findBin();
    if (b) return b;
    return app.project.rootItem.createBin(SZ_BIN);
}

function sz_norm(p) {
    return String(p).replace(/\\/g, '/').toLowerCase();
}

/* importa o PNG (ou reaproveita se ja la esta) e devolve o projectItem */
function sz_importPNG(bin, absPath) {
    var target = sz_norm(absPath);
    var i, it;

    for (i = 0; i < bin.children.numItems; i++) {
        it = bin.children[i];
        try {
            if (it.getMediaPath && sz_norm(it.getMediaPath()) === target) return it;
        } catch (e) {}
    }

    app.project.importFiles([absPath], true, bin, false);

    for (i = 0; i < bin.children.numItems; i++) {
        it = bin.children[i];
        try {
            if (it.getMediaPath && sz_norm(it.getMediaPath()) === target) return it;
        } catch (e2) {}
    }
    return null;
}

/* limpa itens do bin "Safe Zones" que nao correspondam a exceptMediaPath.
   Se exceptMediaPath for nulo/vazio, remove todos os itens e apaga a pasta (bin). */
function sz_cleanBin(exceptMediaPath) {
    try {
        var bin = sz_findBin();
        if (!bin) return;

        var target = exceptMediaPath ? sz_norm(exceptMediaPath) : '';
        for (var i = bin.children.numItems - 1; i >= 0; i--) {
            var it = bin.children[i];
            try {
                var p = '';
                if (it.getMediaPath) {
                    p = sz_norm(it.getMediaPath());
                }
                if (!target || (p && p !== target)) {
                    it.deleteItem();
                }
            } catch (eIt) {}
        }

        if (bin.children.numItems === 0) {
            bin.deleteItem();
        }
    } catch (eBin) {}
}

/* ---------- faixas ---------- */

function sz_trackHasOverlay(track) {
    if (!track || !track.clips) return false;
    for (var i = 0; i < track.clips.numItems; i++) {
        if (String(track.clips[i].name).indexOf(SZ_PREFIX) === 0) return true;
    }
    return false;
}

function sz_setLock(idx, on) {
    try {
        app.enableQE();
        var qs = qe.project.getActiveSequence();
        var qt = qs.getVideoTrackAt(idx);
        if (qt && qt.setLock) qt.setLock(on ? 1 : 0);
    } catch (e) {}
}

/* devolve o indice de uma faixa de video vazia no topo, criando-a se preciso */
function sz_topFreeTrack(seq) {
    var n = seq.videoTracks.numTracks;

    if (n > 0 && seq.videoTracks[n - 1].clips.numItems === 0) return n - 1;

    try {
        app.enableQE();
        qe.project.getActiveSequence().addTracks(1, n, 0, 1, 0, 0, 0, 0);
    } catch (e) {}

    /* confirma pela contagem — a assinatura de addTracks nao e documentada */
    var after = seq.videoTracks.numTracks;
    if (after > n && seq.videoTracks[after - 1].clips.numItems === 0) return after - 1;

    return -1;
}

/* Encontra o índice da faixa ativa gerenciada.
   Se sz_activeTrack for válido, usa-o; caso contrário, pega a faixa mais alta com overlay */
function sz_findActiveTrackIndex(seq) {
    var act = $.global.sz_activeTrack;
    if (act >= 0 && act < seq.videoTracks.numTracks) {
        if (sz_trackHasOverlay(seq.videoTracks[act])) {
            return act;
        }
    }
    for (var t = seq.videoTracks.numTracks - 1; t >= 0; t--) {
        if (sz_trackHasOverlay(seq.videoTracks[t])) {
            $.global.sz_activeTrack = t;
            return t;
        }
    }
    return -1;
}

/* ---------- remover apenas da faixa ativa gerenciada (1 faixa!) ---------- */

function sz_removeActiveClip(seq) {
    var targetIdx = sz_findActiveTrackIndex(seq);
    var removed = 0;

    if (targetIdx >= 0 && targetIdx < seq.videoTracks.numTracks) {
        var track = seq.videoTracks[targetIdx];
        sz_setLock(targetIdx, false);

        for (var i = track.clips.numItems - 1; i >= 0; i--) {
            var clip = track.clips[i];
            if (String(clip.name).indexOf(SZ_PREFIX) === 0) {
                try {
                    clip.remove(false, false);
                    removed++;
                } catch (e) {}
            }
        }
    }

    $.global.sz_activeTrack = -1;
    return removed;
}

/* ---------- aplicar ---------- */

function sz_apply(pngPath) {
    try {
        var seq = sz_seq();
        if (!seq) return sz_err('No active sequence.');

        var f = new File(pngPath);
        if (!f.exists) return sz_err('PNG not found: ' + pngPath);

        var bin = sz_getBin();
        if (!bin) return sz_err('Could not create the "' + SZ_BIN + '" bin.');

        var item = sz_importPNG(bin, pngPath);
        if (!item) return sz_err('Importing the PNG failed.');

        var idx = sz_findActiveTrackIndex(seq);

        /* Se já temos uma faixa ativa gerenciada, limpa-a e reutiliza-a */
        if (idx >= 0 && idx < seq.videoTracks.numTracks) {
            var currTrack = seq.videoTracks[idx];
            sz_setLock(idx, false);
            for (var i = currTrack.clips.numItems - 1; i >= 0; i--) {
                var c = currTrack.clips[i];
                if (String(c.name).indexOf(SZ_PREFIX) === 0) {
                    try { c.remove(false, false); } catch (eRem) {}
                }
            }
        } else {
            /* Se o plugin estava desligado, busca uma faixa livre no topo */
            idx = sz_topFreeTrack(seq);
            if (idx < 0) {
                return sz_err('No free video track on top and I could not create one. ' +
                              'Add an empty video track and try again.');
            }
        }

        $.global.sz_activeTrack = idx;
        var track = seq.videoTracks[idx];

        var t0 = new Time();
        t0.seconds = 0;
        try {
            track.overwriteClip(item, t0);
        } catch (e1) {
            track.overwriteClip(item, 0);
        }

        if (track.clips.numItems === 0) return sz_err('The clip was not placed on the track.');

        /* estica ate ao fim da sequencia (um still nao tem limite de duracao) */
        var clip = track.clips[0];
        try {
            var endT = new Time();
            endT.ticks = seq.end;
            clip.end = endT;
        } catch (e2) {}

        sz_setLock(idx, true);

        /* limpa quaisquer itens residuais antigos do bin mantendo apenas o atual */
        sz_cleanBin(pngPath);

        return sz_ok('V' + (idx + 1));
    } catch (err) {
        return sz_err('sz_apply: ' + err.toString());
    }
}

/* ---------- remover ---------- */

function sz_remove() {
    try {
        var seq = sz_seq();
        if (!seq) return sz_err('No active sequence.');

        /* Remove apenas da faixa que o plugin gerencia, preservando cópias duplicadas */
        var n = sz_removeActiveClip(seq);

        /* Remove todos os itens importados no bin e apaga a pasta Safe Zones do projeto */
        sz_cleanBin(null);

        return sz_ok(String(n));
    } catch (err) {
        return sz_err('sz_remove: ' + err.toString());
    }
}

/* ---------- estado ---------- */

function sz_isActive() {
    try {
        var seq = sz_seq();
        if (!seq) return sz_ok('0');

        var idx = sz_findActiveTrackIndex(seq);
        return sz_ok(idx >= 0 ? '1' : '0');
    } catch (err) {
        return sz_err('sz_isActive: ' + err.toString());
    }
}

/* Interface para o Studio e ferramentas modulares */
$._safezones = {
    getActiveSequenceInfo: function () {
        var seq = sz_seq();
        if (!seq) return '{"hasActiveSequence": false}';
        var d = sz_dims(seq);
        if (!d) return '{"hasActiveSequence": false}';
        return '{"hasActiveSequence": true, "width": ' + d.w + ', "height": ' + d.h + ', "name": "' + String(seq.name).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"}';
    },
    sequenceInfo: sz_sequenceInfo,
    apply: sz_apply,
    remove: sz_remove,
    isActive: sz_isActive
};


