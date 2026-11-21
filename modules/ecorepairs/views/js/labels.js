/* Reparaciones del taller · pegatinas como imagen (50 × 30 mm) para imprimir con la app de Niimbot */
(function () {
  'use strict';
  var E = window.ECOR;
  var W = 400, H = 240; // 50 × 30 mm a 8 puntos/mm (203 ppp)

  function qrDraw(ctx, text, x, y, size) {
    if (!window.qrcode) return;
    var q = window.qrcode(0, 'M');
    q.addData(text);
    q.make();
    var n = q.getModuleCount(), cell = Math.floor(size / n), off = Math.floor((size - cell * n) / 2);
    ctx.fillStyle = '#000';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (q.isDark(r, c)) ctx.fillRect(x + off + c * cell, y + off + r * cell, cell, cell);
      }
    }
  }
  // Texto que se encoge hasta caber en el ancho
  function fit(ctx, text, x, y, maxW, size, weight) {
    var s = size;
    do { ctx.font = (weight || 700) + ' ' + s + 'px Arial, Helvetica, sans-serif'; s--; } while (s > 9 && ctx.measureText(text).width > maxW);
    ctx.fillText(text, x, y);
  }
  function wrapLines(ctx, text, maxW, maxLines) {
    var words = String(text || '').split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
    return lines;
  }
  function loadImg(src) {
    return new Promise(function (ok) {
      if (!src) { ok(null); return; }
      var im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = function () { ok(im); };
      im.onerror = function () { ok(null); };
      im.src = src;
    });
  }
  function base() {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000'; ctx.textBaseline = 'alphabetic';
    return { c: c, ctx: ctx };
  }

  /* Pegatina del patín (opción A): QR a la izquierda; «TALLER», REP, modelo y cliente a la derecha */
  function tagCanvas(d) {
    var b = base(), ctx = b.ctx;
    qrDraw(ctx, d.url, 10, 20, 200);
    var x = 222, w = W - x - 10;
    ctx.fillRect(x, 18, 96, 30);
    ctx.fillStyle = '#fff'; ctx.font = '800 20px Arial, Helvetica, sans-serif'; ctx.fillText('TALLER', x + 8, 41);
    ctx.fillStyle = '#000';
    fit(ctx, d.ref || '', x, 92, w, 40, 900);
    var lines = (ctx.font = '700 22px Arial, Helvetica, sans-serif', wrapLines(ctx, d.device || '', w, 2));
    lines.forEach(function (l, i) { ctx.fillText(l, x, 128 + i * 26); });
    fit(ctx, (d.customer || '') + (d.date ? ' · ' + d.date : ''), x, 214, w, 19, 700);
    return Promise.resolve(b.c);
  }

  /* Pegatina de la batería: logo o marca arriba, voltios y Ah grandes, datos y QR de la garantía */
  function batteryCanvas(d) {
    return loadImg(d.logo).then(function (logo) {
      var b = base(), ctx = b.ctx;
      var qs = 120;
      qrDraw(ctx, d.url, W - qs - 8, 8, qs);
      // Cabecera: logo (si carga) o la marca en letra gruesa
      if (logo) {
        var lh = 40, lw = Math.min(W - qs - 30, logo.width * lh / logo.height);
        ctx.drawImage(logo, 10, 10, lw, lh);
      } else {
        fit(ctx, (d.brand || 'ECOPLANET WAY').toUpperCase(), 10, 42, W - qs - 30, 32, 900);
      }
      fit(ctx, (d.volts ? d.volts + ' V' : ''), 10, 112, W - qs - 30, 60, 900);
      fit(ctx, [d.ah ? d.ah + ' Ah' : '', d.wh ? d.wh + ' Wh' : ''].filter(Boolean).join(' · '), 10, 146, W - qs - 30, 30, 800);
      ctx.font = '700 18px Arial, Helvetica, sans-serif';
      var info = [d.config, d.chem, d.conn_ctrl, d.conn_charge ? 'carga ' + d.conn_charge : ''].filter(Boolean).join(' · ');
      wrapLines(ctx, info, W - 20, 2).forEach(function (l, i) { ctx.fillText(l, 10, 176 + i * 21); });
      if (d.for_model) fit(ctx, 'Para ' + d.for_model, W - qs - 8, qs + 30, qs + 2, 15, 700);
      ctx.fillRect(10, H - 30, W - 20, 2);
      fit(ctx, d.serial || '', 10, H - 8, 200, 18, 800);
      ctx.font = '700 18px Arial, Helvetica, sans-serif';
      var dt = d.date || '';
      ctx.fillText(dt, W - 10 - ctx.measureText(dt).width, H - 8);
      return b.c;
    });
  }

  /* Comparte la imagen (móvil → app de Niimbot) o la descarga (ordenador) */
  function shareCanvas(canvas, name) {
    return new Promise(function (ok) {
      canvas.toBlob(function (blob) {
        var file = null;
        try { file = new File([blob], name + '.png', { type: 'image/png' }); } catch (e) { file = null; }
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).then(function () { ok(true); }, function () { ok(false); });
          return;
        }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        E.toast('Imagen descargada: ábrela en la app de Niimbot (Imagen) e imprímela a 50 × 30 mm.');
        ok(true);
      }, 'image/png');
    });
  }
  /* Ventana con la vista previa y el botón para mandarla a Niimbot */
  function labelDialog(title, canvasPromise, name) {
    canvasPromise.then(function (canvas) {
      var wrap = document.createElement('div');
      wrap.className = 'er-modal';
      wrap.innerHTML = '<div class="er-dlg" style="max-width:460px"><div class="er-row" style="flex-wrap:nowrap"><h2 style="margin-right:auto">' + E.esc(title) + '</h2>' +
        '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-x aria-label="Cerrar">✕</button></div>' +
        '<div class="er-lbl-prev"></div>' +
        '<p class="er-muted er-small" style="margin:0">Pulsa el botón, elige la app <b>Niimbot</b> (o guárdala en fotos y ábrela desde Niimbot → Imagen) e imprime en la etiqueta de 50 × 30 mm.</p>' +
        '<button type="button" class="er-btn er-btn-pri er-btn-lg er-btn-block" data-share>Enviar a Niimbot</button></div>';
      (E.root() || document.body).appendChild(wrap);
      canvas.className = 'er-lbl-canvas';
      wrap.querySelector('.er-lbl-prev').appendChild(canvas);
      wrap.addEventListener('click', function (e) {
        if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
        if (e.target.closest('[data-share]')) shareCanvas(canvas, name);
      });
    });
  }

  E.tagLabel = function (d) { labelDialog('Etiqueta del patín · ' + (d.ref || ''), tagCanvas(d), 'etiqueta-' + (d.ref || 'patin')); };
  E.batteryLabel = function (d) { labelDialog('Pegatina de batería · ' + (d.serial || ''), batteryCanvas(d), 'bateria-' + (d.serial || '')); };
})();
