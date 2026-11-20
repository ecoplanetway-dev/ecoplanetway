/* Reparaciones del taller · utilidades comunes */
(function () {
  'use strict';

  function readJson(id) {
    var el = document.getElementById(id);
    if (!el) return {};
    try { return JSON.parse(el.textContent || '{}'); } catch (e) { return {}; }
  }

  var boot = {};
  var data = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ICONS_EXTRA = {
    mic: '<svg class="er-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    bolt: '<svg class="er-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>'
  };
  function icon(name, small) {
    var svg = ((boot.icons && boot.icons[name]) || ICONS_EXTRA[name] || '').replace('class="er-i"', 'class="er-i" data-ic="' + name + '"');
    return small ? svg.replace('class="er-i"', 'class="er-i er-s"') : svg;
  }

  function qs(params) {
    var parts = [];
    Object.keys(params || {}).forEach(function (k) {
      if (params[k] === undefined || params[k] === null) return;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    });
    return parts.join('&');
  }

  function ajaxUrl(action, params) {
    var q = qs(params);
    return boot.links.ajax + '&action=' + encodeURIComponent(action) + (q ? '&' + q : '');
  }

  /**
   * Llamada AJAX. POST si se pasa body (objeto o FormData).
   * Siempre resuelve con un objeto {ok, ...}; nunca lanza.
   */
  function api(action, params, body, onProgress) {
    return new Promise(function (resolve) {
      var xhr = new XMLHttpRequest();
      var isPost = body !== undefined && body !== null;
      xhr.open(isPost ? 'POST' : 'GET', ajaxUrl(action, params));
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.setRequestHeader('Accept', 'application/json');
      if (boot.csrf) xhr.setRequestHeader('X-Ecor-Csrf', boot.csrf);
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      }
      xhr.onload = function () {
        var res;
        try { res = JSON.parse(xhr.responseText); } catch (e) {
          var expired = /security token|AdminLogin|login/i.test(xhr.responseText || '');
          res = { ok: false, error: expired || xhr.status === 403 || xhr.status === 401
            ? 'La sesión ha caducado. Recarga la página.'
            : 'El servidor no respondió bien (' + xhr.status + '). Recarga la página.' };
        }
        resolve(res || { ok: false, error: 'Respuesta vacía.' });
      };
      xhr.onerror = function () { resolve({ ok: false, error: 'Sin conexión con la tienda. Revisa internet e inténtalo de nuevo.' }); };
      if (!isPost) { xhr.send(); return; }
      var fd = body;
      if (!(body instanceof FormData)) {
        fd = new FormData();
        Object.keys(body).forEach(function (k) {
          var v = body[k];
          if (v === undefined || v === null) return;
          if (typeof v === 'boolean') v = v ? '1' : '0';
          fd.append(k, v);
        });
      }
      xhr.send(fd);
    });
  }

  var toastTimer;
  function toast(msg, bad) {
    var t = document.getElementById('er-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'er-toast';
      t.className = 'er-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.toggle('er-toast-bad', !!bad);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, bad ? 5000 : 2800);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseDate(s) {
    if (!s) return null;
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (!m || m[1] === '0000') return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  }
  function fmtDate(s) {
    var d = parseDate(s);
    return d ? pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() : '';
  }
  function fmtDateTime(s) {
    var d = parseDate(s);
    return d ? fmtDate(s) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : '';
  }
  function fmtMoney(n) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
  }

  function initials(name) {
    name = String(name || '').trim();
    if (!name) return '—';
    return name.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
  }

  var avatarColors = ['#0B6E4B', '#1F6FD1', '#B5477A', '#7A4BC2', '#B26A00', '#2F7F8A', '#5B6170'];
  function avatarColor(id) {
    return id ? avatarColors[id % avatarColors.length] : '#8B93A3';
  }

  function statusChip(statuses, status) {
    var s = statuses[status] || { name: status, color: '#8B93A3' };
    return '<span class="er-st-chip"><span class="er-dot" style="background:' + esc(s.color) + '"></span>' + esc(s.name) + '</span>';
  }

  function root() { return document.getElementById('ecor-app'); }

  /** Foto del modelo: URL https externa o archivo propio servido por el panel. */
  function modelImg(image) {
    if (!image) return '';
    if (/^https:\/\//i.test(image)) return image;
    return (boot.links && boot.links.modelImage ? boot.links.modelImage : '') + '&f=' + encodeURIComponent(image);
  }

  /**
   * Diálogo propio (confirm/prompt no se usan). Devuelve promesa con el texto o true, o null si cancela.
   */
  function dialog(opts) {
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.className = 'er-modal';
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      var input = opts.input
        ? '<label class="er-field">' + esc(opts.inputLabel || '') +
          (opts.multiline ? '<textarea class="er-input" id="er-dlg-in" maxlength="' + (opts.maxlength || 255) + '"></textarea>'
                          : '<input class="er-input" id="er-dlg-in" maxlength="' + (opts.maxlength || 255) + '">') + '</label>'
        : '';
      wrap.innerHTML = '<div class="er-dlg"><h2>' + esc(opts.title) + '</h2>' +
        (opts.text ? '<p class="er-muted" style="margin:0">' + esc(opts.text) + '</p>' : '') + input +
        '<div class="er-err" id="er-dlg-err" hidden></div>' +
        '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button>' +
        '<button type="button" class="er-btn ' + (opts.danger ? 'er-btn-danger' : 'er-btn-pri') + '" data-ok>' + esc(opts.ok || 'Aceptar') + '</button></div></div>';
      (root() || document.body).appendChild(wrap);
      var inEl = wrap.querySelector('#er-dlg-in');
      (inEl || wrap.querySelector('[data-ok]')).focus();
      function close(v) { wrap.remove(); document.removeEventListener('keydown', onKey); resolve(v); }
      function ok() {
        if (inEl) {
          var v = inEl.value.trim();
          if (opts.required && !v) {
            var err = wrap.querySelector('#er-dlg-err');
            err.textContent = opts.requiredMsg || 'Este campo es obligatorio.';
            err.hidden = false;
            inEl.focus();
            return;
          }
          close(v);
        } else close(true);
      }
      function onKey(e) {
        if (e.key === 'Escape') close(null);
        if (e.key === 'Enter' && (!inEl || inEl.tagName !== 'TEXTAREA')) { e.preventDefault(); ok(); }
      }
      document.addEventListener('keydown', onKey);
      wrap.addEventListener('click', function (e) {
        if (e.target === wrap || e.target.closest('[data-x]')) close(null);
        if (e.target.closest('[data-ok]')) ok();
      });
    });
  }

  /** Reduce una foto en el navegador antes de subirla (menos datos y orientación correcta). */
  function shrinkImage(file, maxSide) {
    // Las fotos del móvil pesan 3-10 MB (y en iPhone pueden ser HEIC): se reducen siempre a JPEG de ~1600 px
    // para que el servidor las acepte (muchos hostings limitan la subida a 2 MB).
    return new Promise(function (resolve) {
      if (file.type && !/^image\//.test(file.type)) { resolve(file); return; }
      function encode(src, w, h) {
        var scale = Math.min(1, maxSide / Math.max(w, h));
        if (scale === 1 && file.size < 1000000 && /^image\/(jpeg|png|webp)$/.test(file.type)) { resolve(file); return; }
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * scale));
        c.height = Math.max(1, Math.round(h * scale));
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(src, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          if (!blob) { resolve(file); return; }
          try { resolve(new File([blob], 'foto.jpg', { type: 'image/jpeg' })); } catch (e) { blob.name = 'foto.jpg'; resolve(blob); }
        }, 'image/jpeg', 0.82);
      }
      function viaImg() {
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = function () { encode(img, img.naturalWidth, img.naturalHeight); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); };
        img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
      }
      if (typeof createImageBitmap === 'function') {
        var p;
        try { p = createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { p = null; }
        if (!p) { viaImg(); return; }
        p.then(function (bmp) { encode(bmp, bmp.width, bmp.height); }).catch(viaImg);
      } else viaImg();
    });
  }

  /** Lienzo de firma con el dedo o el ratón. */
  function signaturePad(canvas) {
    var ctx, drawing = false, dirty = false, last = null;
    function setup() {
      var r = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#14161A';
    }
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (!ctx) setup();
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      last = pos(e);
      ctx.beginPath();
      ctx.arc(last.x, last.y, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#14161A';
      ctx.fill();
      dirty = true;
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var p = pos(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    });
    function end() { drawing = false; }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    return {
      clear: function () { if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; },
      isEmpty: function () { return !dirty; },
      toDataURL: function () { return canvas.toDataURL('image/png'); },
      reset: function () { ctx = null; dirty = false; }
    };
  }

  /**
   * Ejecuta fn cuando la página está cargada. PrestaShop carga los scripts en la cabecera,
   * antes de que exista el contenido.
   */
  var readyQueue = [];
  var isReady = false;
  function onReady() {
    if (isReady) return;
    isReady = true;
    boot = readJson('ecor-boot');
    data = readJson('ecor-data');
    window.ECOR.boot = boot;
    window.ECOR.data = data;
    readyQueue.forEach(function (fn) { fn(); });
    readyQueue = [];
  }
  function ready(fn) {
    if (isReady) fn(); else readyQueue.push(fn);
  }
  /**
   * Visor de fotos a pantalla completa: flechas o deslizar para pasar, doble toque o rueda para ampliar,
   * arrastrar para moverse por la foto ampliada. items: [{src, caption}]
   */
  function viewer(items, index) {
    items = (items || []).filter(function (i) { return i && i.src; });
    if (!items.length) return;
    var i = Math.max(0, Math.min(items.length - 1, index || 0)), zoom = 1, tx = 0, ty = 0;
    var w = document.createElement('div');
    w.className = 'er-viewer';
    w.setAttribute('role', 'dialog');
    w.setAttribute('aria-modal', 'true');
    w.innerHTML = '<div class="er-v-stage"><img alt="" draggable="false"></div>' +
      '<div class="er-v-cap"></div>' +
      '<button type="button" class="er-v-btn er-v-x" aria-label="Cerrar">' + icon('x') + '</button>' +
      (items.length > 1 ? '<button type="button" class="er-v-btn er-v-prev" aria-label="Anterior">' + icon('back') + '</button>' +
        '<button type="button" class="er-v-btn er-v-next" aria-label="Siguiente">' + icon('back') + '</button>' : '');
    document.body.appendChild(w);
    var img = w.querySelector('img'), stage = w.querySelector('.er-v-stage');
    function apply() { img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + zoom + ')'; w.classList.toggle('er-zoomed', zoom > 1); }
    function show(n) {
      i = (n + items.length) % items.length; zoom = 1; tx = ty = 0; apply();
      img.classList.remove('er-v-in'); void img.offsetWidth; img.classList.add('er-v-in');
      img.src = items[i].src;
      w.querySelector('.er-v-cap').textContent = (items[i].caption || '') + (items.length > 1 ? '  ·  ' + (i + 1) + ' / ' + items.length : '');
    }
    function close() { document.removeEventListener('keydown', onKey); w.classList.add('er-v-out'); setTimeout(function () { w.remove(); }, 160); }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(i + 1);
      if (e.key === 'ArrowLeft') show(i - 1);
    }
    document.addEventListener('keydown', onKey);
    w.addEventListener('click', function (e) {
      if (e.target.closest('.er-v-x') || (e.target === stage && zoom === 1) || e.target === w) { close(); return; }
      if (e.target.closest('.er-v-next')) show(i + 1);
      if (e.target.closest('.er-v-prev')) show(i - 1);
    });
    img.addEventListener('dblclick', function (e) {
      if (zoom > 1) { zoom = 1; tx = ty = 0; } else {
        zoom = 2.5;
        var r = img.getBoundingClientRect();
        tx = (r.left + r.width / 2 - e.clientX) * 1.5; ty = (r.top + r.height / 2 - e.clientY) * 1.5;
      }
      apply();
    });
    w.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoom = Math.max(1, Math.min(5, zoom * (e.deltaY < 0 ? 1.15 : 0.87)));
      if (zoom === 1) { tx = ty = 0; }
      apply();
    }, { passive: false });
    // Arrastrar (mover la foto ampliada) o deslizar (cambiar de foto); dos dedos = pellizcar
    var pts = {}, start = null, pinch = null, lastTap = 0;
    stage.addEventListener('pointerdown', function (e) {
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      stage.setPointerCapture(e.pointerId);
      var ids = Object.keys(pts);
      if (ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
      } else {
        start = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, t: Date.now() };
        if (Date.now() - lastTap < 280 && e.pointerType === 'touch') { img.dispatchEvent(new MouseEvent('dblclick', { clientX: e.clientX, clientY: e.clientY })); }
        lastTap = Date.now();
      }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (pinch && ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        zoom = Math.max(1, Math.min(5, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
        apply();
        return;
      }
      if (start && zoom > 1) { tx = start.tx + e.clientX - start.x; ty = start.ty + e.clientY - start.y; apply(); }
    });
    function up(e) {
      if (start && zoom === 1 && !pinch && items.length > 1) {
        var dx = e.clientX - start.x;
        if (Math.abs(dx) > 60 && Date.now() - start.t < 600) show(i + (dx < 0 ? 1 : -1));
      }
      delete pts[e.pointerId];
      if (Object.keys(pts).length < 2) pinch = null;
      if (!Object.keys(pts).length) start = null;
    }
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    show(i);
  }

  /**
   * Abre la cámara del móvil (o la galería si fromGallery). En el ordenador abre el selector de archivos.
   * El campo no puede estar oculto con display:none: algunos móviles no lo abren.
   */
  function pickPhoto(input, fromGallery) {
    if (!input) return;
    input.hidden = false;
    input.classList.add('er-vh');
    if (fromGallery) input.removeAttribute('capture');
    else input.setAttribute('capture', 'environment');
    input.value = '';
    input.click();
  }


  /* ---------- Buscar parecido: sin tildes, sin espacios y con alguna falta ---------- */
  function fold(s) {
    s = String(s == null ? '' : s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s;
  }
  function compact(s) { return fold(s).replace(/[^a-z0-9]+/g, ''); }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  /** Puntuación de «q» contra un texto (0 = nada). Acepta «mi pro2», «xiaomi pro 2», «kukirn g2». */
  function fuzzyScore(q, text) {
    var cq = compact(q), ct = compact(text);
    if (!cq) return 0;
    if (ct === cq) return 100;
    if (ct.indexOf(cq) === 0) return 90;
    if (ct.indexOf(cq) > -1) return 80;
    var words = fold(text).split(/[^a-z0-9]+/).filter(Boolean), score = 0, ok = true;
    fold(q).split(/[^a-z0-9]+/).filter(Boolean).forEach(function (t) {
      if (ct.indexOf(t) > -1) { score += 10; return; }
      var best = 9;
      words.forEach(function (w) { best = Math.min(best, lev(t, w), t.length >= 4 && w.length > t.length ? lev(t, w.slice(0, t.length)) : 9); });
      if (t.length >= 4 && best <= 1) score += 6; else if (t.length >= 6 && best <= 2) score += 4; else ok = false;
    });
    return ok ? Math.min(70, score) : 0;
  }
  /** models: [{brand, model, ...}] → los mejores para q */
  function findModels(models, q, limit) {
    return models.map(function (m) { var sc = fuzzyScore(q, m.brand + ' ' + m.model); return { m: m, s: sc ? sc + (m.id_model ? 1 : 0) : 0 }; })
      .filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, limit || 8).map(function (x) { return x.m; });
  }

  /** Buscador rápido de modelos. opts: models, link(m) o onPick(m), placeholder */
  function ModelSearch(el, opts) {
    opts.models = (opts.models || []).filter(function (m) { return m.id_model && m.icon !== 'battery'; });
    el.innerHTML = '<label class="er-search er-ms">' + icon('search') + '<input class="er-input" type="search" autocomplete="off" placeholder="' + esc(opts.placeholder || 'Buscar modelo: «pro 2», «max g2»…') + '" aria-label="Buscar modelo"></label><div class="er-ms-res" hidden></div>';
    var inp = el.querySelector('input'), res = el.querySelector('.er-ms-res'), found = [];
    function draw() {
      var q = inp.value.trim();
      found = q.length < 2 ? [] : findModels(opts.models || [], q, 8);
      res.hidden = q.length < 2;
      res.innerHTML = found.length ? found.map(function (m, i) {
        var src = m.image || '';
        return '<a href="' + esc(opts.link ? opts.link(m) : '#') + '" data-msi="' + i + '">' + (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '<span class="er-ms-ph">' + icon(m.icon || 'other', true) + '</span>') +
          '<span><b>' + esc(m.brand + ' ' + m.model) + '</b><small>' + esc(m.category) + '</small></span></a>';
      }).join('') : '<div class="er-muted er-small" style="padding:10px">Ningún modelo con «' + esc(q) + '».</div>';
    }
    inp.addEventListener('input', draw);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && found.length) { e.preventDefault(); var a = res.querySelector('a'); if (opts.onPick) opts.onPick(found[0]); else window.location.href = a.href; }
      if (e.key === 'Escape') { inp.value = ''; draw(); }
    });
    res.addEventListener('click', function (e) {
      var a = e.target.closest('[data-msi]');
      if (a && opts.onPick) { e.preventDefault(); opts.onPick(found[+a.getAttribute('data-msi')]); inp.value = ''; draw(); }
    });
    document.addEventListener('click', function (e) { if (!el.contains(e.target)) res.hidden = true; });
    inp.addEventListener('focus', function () { if (inp.value.trim().length >= 2) draw(); });
  }

  /* ---------- Voz ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  /** Escucha una frase. Devuelve promesa con el texto ('' si no entiende). onPartial(texto) mientras habla. */
  function listen(onPartial) {
    return new Promise(function (resolve) {
      if (!SR) { resolve(''); return; }
      var r = new SR(), final = '', done = false;
      r.lang = 'es-ES'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      r.onresult = function (e) {
        var interim = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
        }
        if (onPartial) onPartial((final + ' ' + interim).trim());
      };
      function end() { if (!done) { done = true; resolve(final.trim()); } }
      r.onerror = function (e) { if (e.error === 'not-allowed') toast('Permite el micrófono en el navegador para dictar.', true); end(); };
      r.onend = end;
      try { r.start(); } catch (e) { end(); }
      listen.stop = function () { try { r.stop(); } catch (e) {} };
    });
  }
  function speak(text) {
    return new Promise(function (resolve) {
      if (!window.speechSynthesis) { resolve(); return; }
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'es-ES'; u.rate = 1.05;
        u.onend = function () { resolve(); }; u.onerror = function () { resolve(); };
        window.speechSynthesis.speak(u);
        setTimeout(resolve, 6000);
      } catch (e) { resolve(); }
    });
  }

  /* Botón 🎤 flotante: aparece al lado del campo de texto que tiene el foco y dicta dentro */
  var micBtn = null, micField = null, micOn = false;
  function micTarget(el) {
    if (!el || !el.closest || !el.closest('.ecor') || el.hasAttribute('data-novoice') || el.readOnly || el.disabled) return false;
    // Solo en campos para escribir texto largo (notas, avería, diagnóstico, pasos) o marcados con data-voice
    return el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.hasAttribute('data-voice'));
  }
  function placeMic() {
    if (!micBtn || !micField) return;
    var r = micField.getBoundingClientRect();
    if (!micField.isConnected || !r.width || r.bottom < 0 || r.top > window.innerHeight || (document.activeElement !== micField && !micOn)) { micBtn.hidden = true; return; }
    micBtn.hidden = false;
    // Va dentro del mismo bloque que el campo (posición absoluta), así no se descoloca con el desplazamiento ni con la plantilla
    var host = micField.parentElement;
    if (window.getComputedStyle(host).position === 'static') host.style.position = 'relative';
    if (micBtn.parentNode !== host) host.appendChild(micBtn);
    var hr = host.getBoundingClientRect();
    micBtn.style.top = (r.top - hr.top + (micField.tagName === 'TEXTAREA' ? r.height - 40 : (r.height - 34) / 2)) + 'px';
    micBtn.style.left = (r.right - hr.left - 40) + 'px';
  }
  /** Para avería y diagnóstico: cada frase en su línea con «•» delante. */
  function insertBullets(field, text) {
    var parts = String(text || '').split(/[.;]\s+|,?\s+(?:y\s+)?(?:ademas|además|tambien|también|aparte)\s+/i).map(function (x) { return x.trim().replace(/[.,;]+$/, '').replace(/^(y\s+)?(ademas|además|tambien|también|aparte)\s+/i, ''); }).filter(Boolean);
    if (!parts.length) return;
    var v = field.value.replace(/\s+$/, '');
    parts.forEach(function (ph) { v += (v ? '\n' : '') + '• ' + ph.charAt(0).toUpperCase() + ph.slice(1); });
    field.value = v;
    try { field.setSelectionRange(v.length, v.length); } catch (e) {}
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function insertText(field, text) {
    if (!text) return;
    var v = field.value, a = field.selectionStart == null ? v.length : field.selectionStart, b = field.selectionEnd == null ? v.length : field.selectionEnd;
    var pre = v.slice(0, a), add = (pre && !/\s$/.test(pre) ? ' ' : '') + text;
    if (!pre) add = add.charAt(0).toUpperCase() + add.slice(1);
    field.value = pre + add + v.slice(b);
    var pos = (pre + add).length;
    try { field.setSelectionRange(pos, pos); } catch (e) {}
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (SR) {
    document.addEventListener('focusin', function (e) {
      if (!micTarget(e.target)) return;
      micField = e.target;
      if (!micBtn) {
        micBtn = document.createElement('button');
        micBtn.type = 'button';
        micBtn.className = 'er-mic';
        micBtn.setAttribute('aria-label', 'Dictar por voz');
        micBtn.innerHTML = ICONS_EXTRA.mic;
        micBtn.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        micBtn.addEventListener('click', function () {
          if (micOn) { micOn = false; micBtn.classList.remove('on'); if (listen.stop) listen.stop(); return; }
          var f = micField;
          micOn = true; micBtn.classList.add('on');
          if (f && f.hasAttribute('data-voice-list')) {
            // Escucha seguida: cada frase en una línea nueva, hasta que se vuelva a pulsar
            (function loop() {
              listen().then(function (t) {
                if (t && f) insertBullets(f, t);
                if (micOn) loop(); else micBtn.classList.remove('on');
              });
            })();
            return;
          }
          listen().then(function (t) { micOn = false; micBtn.classList.remove('on'); if (f) { f.focus(); insertText(f, t); } });
        });
        micBtn.hidden = true;
      }
      micBtn.hidden = false;
      placeMic();
    });
    document.addEventListener('focusout', function () {
      setTimeout(function () { if (micBtn && !micOn && !micTarget(document.activeElement)) micBtn.hidden = true; }, 150);
    });
    window.addEventListener('scroll', placeMic, true);
    setInterval(function () { if (micBtn && !micBtn.hidden) placeMic(); }, 400);
    window.addEventListener('resize', placeMic);
  }

  /**
   * Entrada guiada por voz: pregunta en voz alta, escucha la respuesta y pasa a la siguiente.
   * «No» o «nada» deja la respuesta vacía. steps: [{key, q, hint}] → promesa {key: texto} o null si se cancela.
   */
  function voiceEntry(steps, title) {
    return new Promise(function (resolve) {
      var i = 0, answers = {}, busy = false, closed = false;
      var wrap = document.createElement('div');
      wrap.className = 'er-modal';
      wrap.innerHTML = '<div class="er-dlg er-voice"><div class="er-row" style="flex-wrap:nowrap"><h2 style="margin-right:auto">' + icon('mic') + esc(title || 'Entrada por voz') + '</h2>' +
        '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-x aria-label="Cerrar">' + icon('x') + '</button></div>' +
        '<div class="er-voice-prog" id="er-v-prog"></div><div class="er-voice-q" id="er-v-q"></div><div class="er-muted er-small" id="er-v-hint"></div>' +
        '<button type="button" class="er-voice-mic" id="er-v-mic" aria-label="Hablar">' + ICONS_EXTRA.mic + '</button>' +
        '<div class="er-voice-a" id="er-v-a"></div>' +
        '<input class="er-input" id="er-v-txt" placeholder="O escríbelo aquí" data-novoice>' +
        '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-back>Atrás</button><button type="button" class="er-btn er-btn-ghost" data-skip>No / saltar</button>' +
          '<button type="button" class="er-btn er-btn-pri" data-next>Siguiente</button></div></div>';
      (root() || document.body).appendChild(wrap);
      var $q = function (s) { return wrap.querySelector(s); };
      function isNo(t) { return /^(no|nada|ninguno|ninguna|no tiene|no trae|sin|no hay|siguiente|paso)\.?$/i.test(fold(t).trim()); }
      function show() {
        var st = steps[i];
        $q('#er-v-prog').innerHTML = steps.map(function (x, j) { return '<span class="' + (j < i ? 'done' : j === i ? 'cur' : '') + '"></span>'; }).join('');
        $q('#er-v-q').textContent = st.q;
        $q('#er-v-hint').textContent = st.hint || 'Di «no» si no hay nada que apuntar.';
        $q('#er-v-a').textContent = answers[st.key] || '';
        $q('#er-v-txt').value = answers[st.key] || '';
        $q('[data-next]').textContent = i === steps.length - 1 ? 'Terminar' : 'Siguiente';
        ask();
      }
      function ask() {
        if (busy || closed || !SR) return;
        busy = true;
        speak(steps[i].q).then(function () {
          if (closed) return;
          $q('#er-v-mic').classList.add('on');
          return listen(function (t) { $q('#er-v-a').textContent = t; });
        }).then(function (t) {
          busy = false;
          if (closed) return;
          $q('#er-v-mic').classList.remove('on');
          if (t === undefined) return;
          if (t && isNo(t)) { answers[steps[i].key] = ''; next(); return; }
          if (t) { answers[steps[i].key] = t; $q('#er-v-txt').value = t; setTimeout(function () { if (!busy && !closed && $q('#er-v-txt').value === t) next(); }, 1200); }
        });
      }
      function next() {
        answers[steps[i].key] = isNo($q('#er-v-txt').value) ? '' : $q('#er-v-txt').value.trim();
        if (i === steps.length - 1) { finish(answers); return; }
        i++; show();
      }
      function finish(v) { closed = true; if (listen.stop) listen.stop(); if (window.speechSynthesis) window.speechSynthesis.cancel(); wrap.remove(); resolve(v); }
      wrap.addEventListener('click', function (e) {
        if (e.target.closest('[data-x]')) { finish(null); return; }
        if (e.target.closest('[data-next]')) { if (listen.stop) listen.stop(); busy = false; next(); return; }
        if (e.target.closest('[data-skip]')) { if (listen.stop) listen.stop(); busy = false; $q('#er-v-txt').value = ''; next(); return; }
        if (e.target.closest('[data-back]') && i > 0) { if (listen.stop) listen.stop(); busy = false; i--; show(); return; }
        if (e.target.closest('#er-v-mic')) { if (busy) { if (listen.stop) listen.stop(); } else ask(); }
      });
      $q('#er-v-txt').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); next(); } });
      if (!SR) $q('#er-v-hint').textContent = 'Este navegador no reconoce la voz (usa Chrome, Edge o Safari). Puedes escribir las respuestas.';
      show();
    });
  }

  /** Busca en una lista de opciones las que se nombran en el texto («trae cargador y llave» → [Cargador, Llave]). */
  function pickFromText(text, options) {
    var t = ' ' + fold(text).replace(/[^a-z0-9]+/g, ' ') + ' ';
    return options.filter(function (o) {
      var w = fold(o).replace(/[^a-z0-9]+/g, ' ').trim();
      if (!w) return false;
      if (t.indexOf(' ' + w + ' ') > -1) return true;
      var first = w.split(' ')[0];
      return first.length >= 4 && t.indexOf(' ' + first.slice(0, Math.max(4, first.length - 2))) > -1;
    });
  }
  /** Teléfono dicho en voz: «seis uno dos…» o «612 34 56 78» → 612345678 */
  function phoneFromText(text) {
    var map = { cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9 };
    return fold(text).split(/\s+/).map(function (w) { return map[w] !== undefined ? String(map[w]) : w.replace(/\D/g, ''); }).join('');
  }

  /** Quita el fondo blanco sobrante alrededor de la foto del modelo (para que todas queden parecidas). */
  function trimImage(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var max = 1600, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          var w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc);
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
          var d = x.getImageData(0, 0, w, h).data, minX = w, minY = h, maxX = -1, maxY = -1;
          for (var yy = 0; yy < h; yy += 2) {
            for (var xx = 0; xx < w; xx += 2) {
              var k = (yy * w + xx) * 4;
              if (d[k] < 235 || d[k + 1] < 235 || d[k + 2] < 235) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (yy < minY) minY = yy; if (yy > maxY) maxY = yy; }
            }
          }
          URL.revokeObjectURL(url);
          if (maxX < 0 || (maxX - minX) < w * 0.2) { resolve(file); return; }
          var pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.03);
          minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(w, maxX + pad); maxY = Math.min(h, maxY + pad);
          var o = document.createElement('canvas'); o.width = maxX - minX; o.height = maxY - minY;
          o.getContext('2d').drawImage(c, minX, minY, o.width, o.height, 0, 0, o.width, o.height);
          o.toBlob(function (blob) {
            if (!blob) { resolve(file); return; }
            try { resolve(new File([blob], 'modelo.jpg', { type: 'image/jpeg' })); } catch (e) { blob.name = 'modelo.jpg'; resolve(blob); }
          }, 'image/jpeg', 0.88);
        } catch (e) { URL.revokeObjectURL(url); resolve(file); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  /**
   * Arrastrar fotos desde el ordenador. zone: donde se sueltan. getInput(e): el campo de archivo que las recibe
   * (se le pasan los archivos y se lanza su «change», así funciona igual que al elegirlas).
   */
  function dropZone(zone, getInput) {
    var n = 0;
    function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') > -1; }
    zone.addEventListener('dragenter', function (e) { if (!hasFiles(e)) return; e.preventDefault(); n++; zone.classList.add('er-drop-on'); });
    zone.addEventListener('dragover', function (e) { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    zone.addEventListener('dragleave', function () { n = Math.max(0, n - 1); if (!n) zone.classList.remove('er-drop-on'); });
    zone.addEventListener('drop', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault(); n = 0; zone.classList.remove('er-drop-on');
      var input = getInput(e);
      if (!input) return;
      var dt = new DataTransfer();
      Array.prototype.forEach.call(e.dataTransfer.files, function (f) { if (!f.type || /^image\//.test(f.type)) dt.items.add(f); });
      if (!dt.files.length) { toast('Arrastra fotos (JPG, PNG o WEBP).', true); return; }
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }


  /* ---------- Entrada por voz con confirmaciones (nueva reparación) ---------- */
  var NUMW = { cero: '0', uno: '1', una: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10', once: '11', doce: '12',
    trece: '13', catorce: '14', quince: '15', dieciseis: '16', diecisiete: '17', dieciocho: '18', diecinueve: '19', veinte: '20', treinta: '30', cuarenta: '40', cincuenta: '50',
    sesenta: '60', setenta: '70', ochenta: '80', noventa: '90', cien: '100', trescientos: '300', trescientossesentaycinco: '365' };
  var LETW = { be: 'b', ce: 'c', de: 'd', efe: 'f', ge: 'g', hache: 'h', jota: 'j', ka: 'k', ele: 'l', eme: 'm', ene: 'n', pe: 'p', cu: 'q', erre: 'r', ese: 's', te: 't', uve: 'v', equis: 'x', zeta: 'z', igriega: 'y' };
  /** «eme tres seis cinco» → «m 3 6 5», «cuatro pro» → «4 pro», «ge dos» → «g 2» (el buscador junta los espacios) */
  function speechToModel(t) {
    t = fold(t).replace(/i griega/g, 'igriega').replace(/uve doble/g, 'w').replace(/trescientos sesenta y cinco/g, '365');
    return t.split(/\s+/).map(function (w) { return NUMW[w] || LETW[w] || w; }).join(' ').replace(/\b(\d+) y (\d)\b/g, function (m, a, b) { return String(+a + +b); });
  }
  function isYes(t) { return /^(si|sí|claro|vale|correcto|eso es|exacto|afirmativo|ok|okay|es ese|ese)\b/.test(fold(t).trim()); }
  function isNo(t) { return /^(no|nada|ninguno|ninguna|incorrecto|negativo|no es|otro)\b/.test(fold(t).trim()); }
  var ORD = { primero: 0, primera: 0, uno: 0, '1': 0, segundo: 1, segunda: 1, dos: 1, '2': 1, tercero: 2, tercera: 2, tres: 2, '3': 2, cuarto: 3, cuatro: 3, '4': 3 };

  /** Ventana de voz: pregunta, escucha y entiende sí/no, «el segundo» o el nombre de una opción. */
  function VoiceDialog(title) {
    var wrap = document.createElement('div'), closed = false, cur = null;
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg er-voice"><div class="er-row" style="flex-wrap:nowrap"><h2 style="margin-right:auto">' + ICONS_EXTRA.mic + esc(title) + '</h2>' +
      '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-vx aria-label="Cerrar">' + icon('x') + '</button></div><div id="er-vd"></div></div>';
    (root() || document.body).appendChild(wrap);
    var body = wrap.querySelector('#er-vd');
    function stop() { if (listen.stop) listen.stop(); if (window.speechSynthesis) window.speechSynthesis.cancel(); }
    var api = {
      cancelled: false,
      /** opts: { hint, choices: [texto], yesno, optional } → promesa { text, index } ({} si «no / saltar») */
      ask: function (q, opts) {
        opts = opts || {};
        var choices = opts.yesno ? ['Sí', 'No'] : (opts.choices || []);
        return new Promise(function (resolve) {
          if (closed) { resolve(null); return; }
          var tries = 0, done = false, auto = null, editing = false;
          function finish(v) { if (done) return; done = true; clearTimeout(auto); stop(); resolve(v); }
          body.innerHTML = '<div class="er-voice-q">' + esc(q) + '</div><div class="er-muted er-small">' + esc(opts.hint || (opts.optional !== false && !choices.length ? 'Di «no» si no hay nada que apuntar.' : '')) + '</div>' +
            '<button type="button" class="er-voice-mic" data-vm aria-label="Hablar">' + ICONS_EXTRA.mic + '</button><div class="er-voice-a" data-va></div>' +
            (choices.length ? '<div class="er-voice-ch">' + choices.map(function (c, i) { return '<button type="button" class="er-btn' + (opts.yesno && i === 0 ? ' er-btn-pri' : '') + '" data-vc="' + i + '">' + (choices.length > 2 || !opts.yesno ? '<b>' + (i + 1) + '</b> ' : '') + esc(c) + '</button>'; }).join('') + '</div>' : '') +
            '<div class="er-row" style="flex-wrap:nowrap;margin-top:10px"><input class="er-input" data-vt placeholder="O escríbelo aquí" value="' + esc(opts.value || '') + '" data-novoice><button type="button" class="er-btn er-btn-pri" data-vok>Siguiente</button></div>' +
            '<div class="er-muted er-small" data-vedit hidden>Corrige el texto y pulsa «Siguiente».</div>' +
            '<div class="er-dlg-act" style="justify-content:space-between">' + (opts.canBack ? '<button type="button" class="er-btn er-btn-ghost" data-vback>' + icon('back', true) + 'Atrás</button>' : '<span></span>') +
              '<button type="button" class="er-btn er-btn-ghost" data-vskip>No / saltar</button></div>';
          var a = body.querySelector('[data-va]'), mic = body.querySelector('[data-vm]');
          function interpret(t) {
            if (!t) return false;
            if (opts.canBack && /^(atras|volver|anterior|vuelve|para atras)\b/.test(fold(t).trim())) { finish({ back: true }); return true; }
            if (choices.length) {
              if (opts.yesno) { if (isYes(t)) { finish({ text: 'Sí', index: 0 }); return true; } if (isNo(t)) { finish({ text: 'No', index: 1 }); return true; } return false; }
              var f = fold(t).replace(/^(el|la|es el|es la|opcion|numero)\s+/, '').trim(), w = f.split(/\s+/)[0];
              if (ORD[w] !== undefined && ORD[w] < choices.length) { finish({ text: choices[ORD[w]], index: ORD[w] }); return true; }
              if (isNo(t) && opts.noIndex !== undefined) { finish({ text: choices[opts.noIndex], index: opts.noIndex }); return true; }
              var best = -1, bs = 0;
              choices.forEach(function (c, i) { var sc = fuzzyScore(speechToModel(t), c); if (sc > bs) { bs = sc; best = i; } });
              if (best > -1 && bs >= 60) { finish({ text: choices[best], index: best }); return true; }
              return false;
            }
            // Solo «no», «nada», «no tiene»… cuentan como vacío: «no carga» o «no enciende» son averías
            if (/^(no|nada|ninguno|ninguna|no tiene|no trae|no hay|sin nada|no tiene nada|no trae nada)\.?$/.test(fold(t).trim())) { finish({}); return true; }
            // Lo entendido va al campo: si no lo tocas sigue solo; si lo tocas, lo corriges y pulsas «Siguiente»
            var vt = body.querySelector('[data-vt]');
            vt.value = t;
            clearTimeout(auto);
            auto = setTimeout(function () { if (!editing) finish({ text: vt.value.trim() }); }, 1600);
            return true;
          }
          function go() {
            if (done || closed || !SR) return;
            speak(tries ? 'No te he entendido. ' + q : q).then(function () {
              if (done || closed) return '';
              mic.classList.add('on');
              return listen(function (t) { a.textContent = t; });
            }).then(function (t) {
              mic.classList.remove('on');
              if (done || closed) return;
              a.textContent = t || '';
              if (!interpret(t) && t && tries < 1) { tries++; go(); }
            });
          }
          cur = { go: go };
          body.onclick = function (e) {
            var t;
            if ((t = e.target.closest('[data-vc]'))) { var i = +t.getAttribute('data-vc'); finish({ text: choices[i], index: i }); return; }
            if (e.target.closest('[data-vback]')) { finish({ back: true }); return; }
            if (e.target.closest('[data-vskip]')) { finish(choices.length && opts.noIndex !== undefined ? { text: choices[opts.noIndex], index: opts.noIndex } : {}); return; }
            if (e.target.closest('[data-vok]')) {
              var v = body.querySelector('[data-vt]').value.trim();
              if (!v) { finish({}); return; }
              if (choices.length) { if (!interpret(v)) finish({ text: v }); } else finish({ text: v });
              return;
            }
            if (e.target.closest('[data-vm]')) { if (mic.classList.contains('on')) stop(); else { tries = 0; go(); } }
          };
          var vtEl = body.querySelector('[data-vt]');
          vtEl.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); body.querySelector('[data-vok]').click(); } };
          // Al tocar el campo, la voz espera a que termines de corregir
          vtEl.onfocus = vtEl.oninput = function () { editing = true; clearTimeout(auto); stop(); mic.classList.remove('on'); body.querySelector('[data-vedit]').hidden = false; };
          if (!SR) a.textContent = 'Este navegador no reconoce la voz: toca una opción o escríbelo.';
          go();
        });
      },
      summary: function (rows) {
        return new Promise(function (resolve) {
          body.innerHTML = '<div class="er-voice-q">¿Está todo bien?</div><div class="er-mini er-voice-sum">' + rows.map(function (r) {
            return '<div><span class="er-muted" style="min-width:110px">' + esc(r[0]) + '</span><b class="er-grow" style="white-space:normal">' + esc(r[1] || '—') + '</b></div>';
          }).join('') + '</div><div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-vno>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-vyes>Sí, rellenar</button></div>';
          body.onclick = function (e) {
            if (e.target.closest('[data-vyes]')) { stop(); resolve(true); }
            if (e.target.closest('[data-vno]')) { stop(); resolve(false); }
          };
          speak('¿Está todo bien?').then(function () { return closed ? '' : listen(); }).then(function (t) { if (closed) return; if (isYes(t || '')) resolve(true); else if (isNo(t || '')) resolve(false); });
        });
      },
      close: function () { closed = true; stop(); wrap.remove(); }
    };
    wrap.addEventListener('click', function (e) { if (e.target.closest('[data-vx]')) { api.cancelled = true; api.close(); } });
    return api;
  }

  /**
   * Nueva reparación por voz. ctx: { catalog, accessories, damages, askCustomer, askDevice, preset: {cat} }
   * Devuelve promesa con el resultado (o null si se cancela).
   */
  function voiceRepair(ctx) {
    var V = VoiceDialog('Nueva reparación por voz'), R = { faults: [], acc: [], accNew: [], dmg: [], dmgNew: [], notes: [], cat: ctx.presetCat || null };
    function cap(t) { t = String(t || '').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }
    function chain() {
      var steps = [];
      function st(fn) { steps.push(fn); }
      function q(text, opts) { opts = opts || {}; opts.canBack = steps.length > 0 && cur > 0; return V.ask(text, opts).then(function (a) { if (!a) throw 0; return a; }); }
      var cur = 0;
      if (ctx.askCustomer) {
        st(function () { return q('¿Nombre del cliente?', { optional: false, value: R.firstname }).then(function (a) { if (a.back) return 'back'; R.firstname = cap(a.text); }); });
        st(function () { return q('¿Y sus apellidos?', { value: R.lastname }).then(function (a) { if (a.back) return 'back'; R.lastname = cap(a.text); }); });
        st(function () {
          return q('¿Su teléfono?', { hint: 'Dilo número a número o seguido. Di «atrás» para volver.', value: R.phone }).then(function (a) {
            if (a.back) return 'back';
            var ph = phoneFromText(a.text || '');
            if (!ph) { R.phone = ''; return; }
            return q('He entendido ' + ph.split('').join(' ') + '. ¿Es correcto?', { yesno: true }).then(function (c) {
              if (c.back) return 'again';
              if (c.index === 0) { R.phone = ph; return; }
              return 'again';
            });
          });
        });
      }
      if (ctx.askDevice) {
        var cats = ctx.catalog.filter(function (c) { return c.icon !== 'moto'; });
        st(function () {
          return q('¿Es patinete, bicicleta o batería?', { choices: cats.map(function (c) { return c.name; }).concat(['Otro']) }).then(function (a) {
            if (a.back) return 'back';
            R.cat = a.index !== undefined && a.index < cats.length ? cats[a.index] : (ctx.catalog.filter(function (c) { return fuzzyScore(a.text || '', c.name) >= 60; })[0] || null);
          });
        });
        st(function () { return R.cat ? deviceStep() : null; });
      }
      st(function () { return q('¿Número de serie?', { value: R.serial }).then(function (a) { if (a.back) return 'back'; R.serial = a.text ? a.text.replace(/\s+/g, '').toUpperCase() : ''; }); });
      st(function () { return q('¿Cuántos kilómetros tiene?', { value: R.km }).then(function (a) { if (a.back) return 'back'; R.km = a.text ? phoneFromText(speechToModel(a.text)).slice(0, 9) : ''; }); });
      st(faultStep);
      st(function () { return listStep('¿Qué trae con el equipo?', ctx.accessories, 'acc', 'accNew', 'Por ejemplo: cargador y llave.'); });
      st(function () { return listStep('¿Tiene algún daño previo?', ctx.damages, 'dmg', 'dmgNew'); });
      st(function () { return q('¿Es urgente?', { yesno: true }).then(function (a) { if (a.back) return 'back'; R.urgent = a.index === 0; }); });
      function run() {
        if (cur >= steps.length) {
          return V.summary([['Cliente', [R.firstname, R.lastname].filter(Boolean).join(' ')], ['Teléfono', R.phone], ['Equipo', R.label || (R.cat ? R.cat.name : '')],
            ['Nº de serie', R.serial], ['Kilómetros', R.km], ['Avería', [R.faults.join(', '), R.fault].filter(Boolean).join(' · ')],
            ['Trae', R.acc.join(', ')], ['Daños', R.dmg.join(', ')], ['Urgente', R.urgent ? 'Sí' : 'No'], ['Notas', R.notes.join(' · ')]]);
        }
        return Promise.resolve(steps[cur]()).then(function (r) {
          if (r === 'back') cur = Math.max(0, cur - 1);
          else if (r !== 'again') cur++;
          return run();
        });
      }
      ask = q;
      return run();
    }
    var ask = null;
    function deviceStep() {
      var idx = [];
      R.cat.brands.forEach(function (b) { b.models.forEach(function (m) { idx.push({ b: b, m: m, brand: b.name, model: m.name, id_model: m.id }); }); });
      function setModel(x) { R.brand = x.b; R.model = x.m; R.label = x.b.name + (x.m ? ' ' + x.m.name : ''); }
      return ask('¿Qué marca y modelo es?', { optional: false, hint: 'Di «atrás» para volver.' }).then(function (a) {
        if (a.back) return 'back';
        if (!a.text) return;
        var cand = findModels(idx, speechToModel(a.text), 4);
        if (!cand.length) return brandStep();
        return V.ask('¿Es ' + cand[0].brand + ' ' + cand[0].model + '?', { yesno: true }).then(function (c) {
          if (!c) throw 0;
          if (c.index === 0) { setModel(cand[0]); return; }
          var rest = cand.slice(1);
          if (!rest.length) return brandStep();
          return V.ask('¿Cuál de estos es?', { choices: rest.map(function (x) { return x.brand + ' ' + x.model; }).concat(['Ninguno']), noIndex: rest.length }).then(function (d) {
            if (!d) throw 0;
            if (d.index < rest.length) { setModel(rest[d.index]); return; }
            return brandStep();
          });
        });
      });
      function brandStep() {
        var brands = R.cat.brands;
        return V.ask('¿Qué marca es?').then(function (a) {
          if (!a) throw 0;
          if (!a.text) return;
          var bs = brands.map(function (b) { return { b: b, s: fuzzyScore(a.text, b.name) }; }).filter(function (x) { return x.s > 0; }).sort(function (x, y) { return y.s - x.s; }).slice(0, 3);
          if (!bs.length) { R.notes.push('Marca dicha: ' + a.text); return; }
          var pick = bs.length === 1 ? Promise.resolve({ index: 0 }) : V.ask('¿Cuál de estas marcas?', { choices: bs.map(function (x) { return x.b.name; }).concat(['Ninguna']), noIndex: bs.length });
          return pick.then(function (c) {
            if (!c) throw 0;
            if (c.index >= bs.length) return;
            var b = bs[c.index].b;
            R.brand = b; R.label = b.name;
            if (!b.models.length) return;
            return V.ask('¿Qué modelo de ' + b.name + '?').then(function (m) {
              if (!m) throw 0;
              if (!m.text) return;
              var mc = findModels(b.models.map(function (x) { return { b: b, m: x, brand: b.name, model: x.name, id_model: x.id }; }), speechToModel(m.text), 3);
              if (!mc.length) { R.notes.push('Modelo dicho: ' + m.text); return; }
              return V.ask('¿Cuál es?', { choices: mc.map(function (x) { return x.brand + ' ' + x.model; }).concat(['Ninguno']), noIndex: mc.length }).then(function (d) {
                if (!d) throw 0;
                if (d.index < mc.length) setModel(mc[d.index]); else R.notes.push('Modelo dicho: ' + m.text);
              });
            });
          });
        });
      }
    }
    function faultStep() {
      return ask('¿Qué le pasa?', { optional: false, value: R.fault }).then(function (a) {
        if (a.back) return 'back';
        R.faults = [];
        if (!a.text) { R.fault = ''; return; }
        R.fault = cap(a.text);
        var list = R.cat ? R.cat.faults.map(function (f) { return f.name; }) : [];
        var found = pickFromText(a.text, list);
        if (found.length) { R.faults = found; return; }
        var best = list.map(function (n) { return { n: n, s: fuzzyScore(a.text, n) }; }).sort(function (x, y) { return y.s - x.s; })[0];
        if (!best || best.s < 40) return;
        return V.ask('¿Lo marco como «' + best.n + '»?', { yesno: true }).then(function (c) { if (!c) throw 0; if (c.index === 0) R.faults = [best.n]; });
      });
    }
    /** Lo que se nombra de la lista se marca; lo que no está se pregunta si se añade a la lista. */
    function listStep(q, options, key, newKey, hint) {
      return ask(q, { hint: hint }).then(function (a) {
        if (a.back) return 'back';
        R[key] = []; R[newKey] = [];
        if (!a.text) return;
        var found = pickFromText(a.text, options);
        R[key] = found.slice();
        var rest = fold(a.text);
        found.forEach(function (f) { fold(f).split(/\s+/).forEach(function (w) { rest = rest.replace(new RegExp('\\b' + w.slice(0, Math.max(4, w.length - 2)) + '[a-z]*', 'g'), ' '); }); });
        var parts = rest.split(/,|\by\b|\bcon\b|\btrae\b|\btiene\b|\bun\b|\buna\b|\bel\b|\bla\b|\blos\b|\blas\b|\bde\b/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length >= 3; });
        var pc = Promise.resolve();
        parts.slice(0, 3).forEach(function (pt) {
          pc = pc.then(function () {
            return V.ask('No tengo «' + pt + '» en la lista. ¿Lo añado?', { yesno: true }).then(function (c) {
              if (!c) throw 0;
              if (c.index === 0) { R[key].push(cap(pt)); R[newKey].push(cap(pt)); } else R.notes.push(cap(pt));
            });
          });
        });
        return pc;
      });
    }
    return chain().then(function (ok) { V.close(); return ok ? R : null; }, function () { V.close(); return null; });
  }

  /* Efecto al pulsar: el brillo sale desde donde se toca */
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.ecor .er-btn, .ecor .er-chip, .ecor .er-opt, .ecor .er-tile');
    if (!b) return;
    var r = b.getBoundingClientRect();
    b.style.setProperty('--er-x', (e.clientX - r.left) + 'px');
    b.style.setProperty('--er-y', (e.clientY - r.top) + 'px');
    b.classList.add('er-press');
    setTimeout(function () { b.classList.remove('er-press'); }, 120);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else setTimeout(onReady, 0);

  window.ECOR = {
    ready: ready,
    boot: boot,
    data: data,
    esc: esc,
    icon: icon,
    api: api,
    ajaxUrl: ajaxUrl,
    toast: toast,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    fmtMoney: fmtMoney,
    initials: initials,
    avatarColor: avatarColor,
    statusChip: statusChip,
    dialog: dialog,
    shrinkImage: shrinkImage,
    signaturePad: signaturePad,
    root: root,
    modelImg: modelImg,
    viewer: viewer,
    pickPhoto: pickPhoto,
    fold: fold,
    fuzzyScore: fuzzyScore,
    findModels: findModels,
    ModelSearch: ModelSearch,
    voiceEntry: voiceEntry,
    hasVoice: !!SR,
    listen: listen,
    pickFromText: pickFromText,
    phoneFromText: phoneFromText,
    trimImage: trimImage,
    dropZone: dropZone,
    voiceRepair: voiceRepair,
    speechToModel: speechToModel
  };
})();
