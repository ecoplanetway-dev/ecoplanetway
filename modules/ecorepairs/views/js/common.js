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

  function icon(name, small) {
    var svg = (boot.icons && boot.icons[name]) || '';
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
    pickPhoto: pickPhoto
  };
})();
