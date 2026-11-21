/* Reparaciones del taller · app del móvil (/taller) para técnicos y recepción */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'app') return;

  var me = D.me;
  var view = document.createElement('div');
  var stopCamera = null;

  /* ---------- Entrar con PIN ---------- */
  if (!me) { renderLogin(); return; }

  app.innerHTML = '<div class="er-app-main" id="er-main"></div><nav class="er-tabbar" id="er-tabbar"></nav>';
  var main = app.querySelector('#er-main');

  function renderLogin() {
    var who = null, pin = '';
    function draw() {
      app.innerHTML = '<div class="er-login">' +
        (app.getAttribute('data-logo') ? '<img class="er-login-logo" src="' + esc(app.getAttribute('data-logo')) + '" alt="">' : '') +
        '<h1>Taller</h1>' +
        (!who ? '<p class="er-muted">¿Quién eres?</p><div class="er-people">' + (D.people || []).map(function (p) {
            return '<button type="button" class="er-person-btn" data-who="' + p.id + '">' + (p.emp && E.boot.avatars && E.boot.avatars[p.emp] ? E.avatar(p.emp, p.name, 'er-av-xl') : '<span class="er-av er-av-xl">' + esc(E.initials(p.name)) + '</span>') + esc(p.name) + '</button>';
          }).join('') + '</div>' + (!(D.people || []).length ? '<div class="er-empty">Aún no hay personal. El administrador lo da de alta en Ajustes del taller.</div>' : '')
          : '<p class="er-muted">Hola, <b>' + esc(who.name) + '</b>. Escribe tu PIN</p>' +
            '<div class="er-pin-dots">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<span class="' + (i < pin.length ? 'on' : '') + (i >= 4 ? ' opt' : '') + '"></span>'; }).join('') + '</div>' +
            '<div class="er-err" id="er-pin-err" hidden></div>' +
            '<div class="er-pinpad">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0', 'ok'].map(function (k) {
              return '<button type="button" data-k="' + k + '" class="' + (k === 'ok' ? 'er-pin-ok' : '') + '">' + (k === 'x' ? icon('back') : k === 'ok' ? icon('check') : k) + '</button>';
            }).join('') + '</div><button type="button" class="er-link" data-who="">Cambiar de persona</button>') +
        '</div>';
    }
    draw();
    app.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-who]'))) {
        var id = +t.getAttribute('data-who');
        who = id ? (D.people || []).filter(function (p) { return p.id === id; })[0] : null;
        pin = ''; draw(); return;
      }
      if (!(t = e.target.closest('[data-k]'))) return;
      var k = t.getAttribute('data-k');
      if (k === 'x') pin = pin.slice(0, -1);
      else if (k === 'ok') { if (pin.length >= 4) send(); return; }
      else if (pin.length < 6) pin += k;
      draw();
      if (pin.length === 6) send();
    });
    function send() {
      E.api('login', {}, { id: who.id, pin: pin }).then(function (res) {
        if (res.ok) { location.reload(); return; }
        pin = ''; draw();
        var er = app.querySelector('#er-pin-err'); er.textContent = res.error; er.hidden = false;
        app.querySelector('.er-pin-dots').classList.add('er-shake');
      });
    }
  }

  /* ---------- Utilidades ---------- */
  function api(action, params, body) {
    // Siempre POST (la app exige POST y la clave de sesión en todas las peticiones)
    return E.api(action, params || {}, body == null ? {} : body).then(function (res) {
      if (res && res.login) { E.toast(res.error, true); setTimeout(function () { location.reload(); }, 1500); }
      return res;
    });
  }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function statusChip(statuses, s) { return E.statusChip(statuses, s); }
  function tabbar(active) {
    var items = [['home', 'Inicio', 'wrench']];
    if (me.tech) items.push(['scan', 'Escanear', 'qr']);
    if (me.reception) items.push(['new', 'Nueva', 'plus']);
    items.push(['models', 'Manuales', 'book']);
    app.querySelector('#er-tabbar').innerHTML = items.map(function (it) {
      return '<a href="#' + it[0] + '" class="' + (active === it[0] ? 'on' : '') + (it[0] === 'scan' ? ' er-tab-scan' : '') + '">' + icon(it[2]) + '<span>' + it[1] + '</span></a>';
    }).join('');
  }
  function header(title, back) {
    return '<header class="er-app-h">' + (back ? '<a class="er-btn er-btn-ghost er-icon-btn" href="' + back + '" aria-label="Volver">' + icon('back') + '</a>' : '') +
      '<h1>' + title + '</h1>' + (!back ? '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-logout aria-label="Salir">' + icon('logout') + '</button>' : '') + '</header>';
  }
  app.addEventListener('click', function (e) {
    if (e.target.closest('[data-logout]')) {
      E.dialog({ title: 'Salir', text: 'Tendrás que volver a poner tu PIN.', ok: 'Salir' }).then(function (y) {
        if (y) api('logout').then(function () { location.reload(); });
      });
    }
  });

  /* ---------- Rutas ---------- */
  function route() {
    if (stopCamera) { stopCamera(); stopCamera = null; }
    var h = (location.hash || '#home').slice(1).split('/');
    window.scrollTo(0, 0);
    if (h[0] === 'scan') return scanView();
    if (h[0] === 'rep') return repairView({ code: decodeURIComponent(h[1] || '') }, h[2] || 'work');
    if (h[0] === 'id') return repairView({ id: h[1] }, h[2] || 'work');
    if (h[0] === 'all') return allView();
    if (h[0] === 'models') return modelsView();
    if (h[0] === 'psearch') return partSearchView();
    if (h[0] === 'model') return modelView(+h[1], +h[2], h[3] || '', h[4] || 'parts');
    if (h[0] === 'new' && me.reception) return newView();
    if (h[0] === 'tag') return tagView(decodeURIComponent(h[1] || ''));
    return homeView();
  }
  window.addEventListener('hashchange', route);

  /* ---------- Inicio ---------- */
  var homeTab = 'mine';
  function card(r, statuses) {
    return '<a class="er-card er-app-card" href="#id/' + r.id + '"><div class="er-c-dev"><div class="er-c-img">' + (r.cover ? '<img src="' + esc(r.cover) + '" alt="">' : icon(r.category_icon || 'device')) + '</div>' +
      '<div class="er-c-devtxt"><div class="er-c-top"><span class="er-ref">' + esc(r.reference) + '</span>' + (r.urgent ? '<span class="er-tag er-t-urg">Urgente</span>' : '') +
      (r.waiting_part ? '<span class="er-tag er-t-wait">Pieza</span>' : '') + '</div><div class="er-model">' + esc(r.device_name) + '</div>' +
      '<div class="er-fault">' + esc(r.fault || '') + '</div></div></div>' +
      '<div class="er-c-foot">' + statusChip(statuses, r.status) + '<span class="er-days">' + icon('clock', true) + (r.days_in_shop ? r.days_in_shop + ' d' : 'Hoy') + '</span></div></a>';
  }
  function homeView() {
    tabbar('home');
    main.innerHTML = header('Hola, ' + esc(me.name.split(' ')[0])) +
      '<div class="er-app-big">' + (me.tech ? '<a class="er-bigbtn er-bigbtn-pri" href="#scan">' + icon('qr') + '<span><b>Escanear QR</b><small>Del patinete o del resguardo</small></span></a>' : '') +
      (me.reception ? '<a class="er-bigbtn" href="#new">' + icon('plus') + '<span><b>Nueva reparación</b><small>Entra un equipo al taller</small></span></a>' : '') +
      '<a class="er-bigbtn er-bigbtn-all" href="#all">' + icon('layers') + '<span><b>Todas las reparaciones</b><small>Buscar por cliente, teléfono, modelo o REP-</small></span></a></div>' +
      (me.tech ? '<div class="er-seg" id="er-seg"><button type="button" data-ht="mine">Mis reparaciones</button><button type="button" data-ht="free">Sin asignar</button></div><div id="er-home-list" class="er-stack" style="gap:10px"><div class="er-empty">Cargando…</div></div>' : '');
    if (!me.tech) return;
    api('home').then(function (res) {
      if (!res.ok) return;
      function draw() {
        main.querySelectorAll('[data-ht]').forEach(function (b) {
          var n = res[b.getAttribute('data-ht')].length;
          b.setAttribute('aria-pressed', String(b.getAttribute('data-ht') === homeTab));
          b.innerHTML = (b.getAttribute('data-ht') === 'mine' ? 'Mis reparaciones' : 'Sin asignar') + ' <span class="er-n">' + n + '</span>';
        });
        var list = res[homeTab];
        main.querySelector('#er-home-list').innerHTML = list.length ? list.map(function (r) { return card(r, res.statuses); }).join('')
          : '<div class="er-empty">' + (homeTab === 'mine' ? 'No tienes reparaciones abiertas. Escanea un QR o mira «Sin asignar».' : 'No hay reparaciones sin técnico.') + '</div>';
      }
      draw();
      main.querySelector('#er-seg').addEventListener('click', function (e) {
        var b = e.target.closest('[data-ht]'); if (!b) return;
        homeTab = b.getAttribute('data-ht'); draw();
      });
    });
  }

  /* ---------- Todas las reparaciones ---------- */
  var allState = { q: '', st: 'open' };
  function allView() {
    tabbar('home');
    var FL = [['open', 'Abiertas'], ['mine', 'Mías'], ['free', 'Sin asignar'], ['urgent', 'Urgentes'], ['ready', 'Listas'], ['delivered', 'Entregadas'], ['cancelled', 'Canceladas'], ['all', 'Todas']];
    main.innerHTML = header('Todas las reparaciones', '#home') +
      '<label class="er-search er-all-q">' + icon('search') + '<input class="er-input" id="er-all-q" type="search" autocomplete="off" placeholder="Cliente, teléfono, modelo, nº de serie o REP-" value="' + esc(allState.q) + '"></label>' +
      '<div class="er-all-f" id="er-all-f">' + FL.map(function (f) { return '<button type="button" data-af="' + f[0] + '" aria-pressed="' + (allState.st === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      '<div id="er-all-l" class="er-stack" style="gap:10px"><div class="er-empty">Cargando…</div></div>';
    var timer = null, seq = 0;
    function load() {
      var my = ++seq, box = main.querySelector('#er-all-l');
      if (!box) return;
      api('all', { q: allState.q, st: allState.st }).then(function (res) {
        if (my !== seq || !main.querySelector('#er-all-l')) return;
        if (!res.ok) { box.innerHTML = '<div class="er-err">' + esc(res.error || 'No se pudo cargar.') + '</div>'; return; }
        res.list = res.list || [];
        box.innerHTML = res.list.length ? res.list.map(function (r) {
          return card(r, res.statuses).replace('</a>', '') + '<div class="er-all-who">' + (r.customer ? icon('user', true) + esc(r.customer) : '') +
            (r.tech_name ? '<span>' + E.avatar(r.id_employee_tech, r.tech_name) + esc(String(r.tech_name).split(' ')[0]) + '</span>' : '<span class="er-muted">Sin técnico</span>') + '</div></a>';
        }).join('') + (res.more ? '<div class="er-empty">Salen las 150 más recientes. Escribe en el buscador para encontrar otras.</div>' : '')
          : '<div class="er-empty">No hay reparaciones' + (allState.q ? ' con «' + esc(allState.q) + '»' : '') + '.</div>';
      });
    }
    main.querySelector('#er-all-q').addEventListener('input', function (e) {
      allState.q = e.target.value.trim();
      clearTimeout(timer); timer = setTimeout(load, 300);
    });
    main.querySelector('#er-all-f').addEventListener('click', function (e) {
      var b = e.target.closest('[data-af]'); if (!b) return;
      allState.st = b.getAttribute('data-af');
      main.querySelectorAll('[data-af]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      load();
    });
    load();
  }

  /* ---------- Escanear ---------- */
  function scanView() {
    tabbar('scan');
    main.innerHTML = header('Escanear QR', '#home') +
      '<div class="er-scan"><video id="er-video" playsinline muted></video><div class="er-scan-frame"></div><canvas id="er-canvas" hidden></canvas></div>' +
      '<p class="er-muted" style="text-align:center">Apunta al QR de la etiqueta o del resguardo.</p>' +
      '<div class="er-row" style="flex-wrap:nowrap"><input class="er-input" id="er-code" placeholder="O escribe el código: ABCD-1234" maxlength="9" autocapitalize="characters"><button type="button" class="er-btn er-btn-pri" id="er-code-go">Abrir</button></div>' +
      '<div class="er-err" id="er-scan-err" hidden></div>';
    main.querySelector('#er-code-go').addEventListener('click', function () {
      var v = main.querySelector('#er-code').value.trim(); if (v) go('#rep/' + encodeURIComponent(v));
    });
    var video = main.querySelector('#er-video'), canvas = main.querySelector('#er-canvas'), ctx = canvas.getContext('2d'), stream = null, alive = true, detector = null;
    stopCamera = function () { alive = false; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      var er = main.querySelector('#er-scan-err'); er.textContent = 'Este navegador no deja usar la cámara. Usa la cámara del móvil directamente o escribe el código.'; er.hidden = false; return;
    }
    try { if ('BarcodeDetector' in window) detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (s) {
      stream = s; video.srcObject = s; video.play(); tick();
    }).catch(function () {
      var er = main.querySelector('#er-scan-err'); er.textContent = 'No hay permiso para usar la cámara. Actívalo en el navegador o escribe el código.'; er.hidden = false;
    });
    function found(text) {
      var d = /[?&]d=([A-Za-z0-9]+)/.exec(text);
      if (d) { if (navigator.vibrate) navigator.vibrate(60); stopCamera(); stopCamera = null; go('#tag/' + encodeURIComponent(d[1])); return true; }
      var m = /[?&]c=([A-Za-z0-9-]+)/.exec(text), code = m ? m[1] : text;
      if (!/^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(code)) return false;
      if (navigator.vibrate) navigator.vibrate(60);
      stopCamera(); stopCamera = null;
      go('#rep/' + encodeURIComponent(code));
      return true;
    }
    function tick() {
      if (!alive) return;
      if (video.readyState >= 2) {
        if (detector) {
          detector.detect(video).then(function (codes) { if (!(codes.length && found(codes[0].rawValue))) setTimeout(tick, 200); }).catch(function () { detector = null; setTimeout(tick, 200); });
          return;
        }
        var w = video.videoWidth, h = video.videoHeight, sc = Math.min(1, 640 / Math.max(w, h));
        canvas.width = Math.round(w * sc); canvas.height = Math.round(h * sc);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var qr = window.jsQR ? window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' }) : null;
        if (qr && found(qr.data)) return;
      }
      setTimeout(tick, 180);
    }
  }

  /* ---------- Reparación ---------- */
  var R = null; // datos de la reparación abierta
  var nextSub = null;
  function repairView(key, tab) {
    tabbar(me.tech ? 'scan' : 'home');
    main.innerHTML = header('Cargando…', '#home') + '<div class="er-empty">Cargando…</div>';
    api('repair', key).then(function (res) {
      if (!res.ok) { main.innerHTML = header('Reparación', '#home') + '<div class="er-banner er-bad">' + icon('alert') + '<div>' + esc(res.error) + '</div></div>'; return; }
      R = res;
      if (nextSub) { R._sub = nextSub; nextSub = null; }
      drawRepair(tab);
    });
  }
  function drawRepair(tab) {
    var r = R.repair, st = R.statuses;
    var closed = r.status === 'delivered' || r.status === 'cancelled';
    var mine = r.id_employee_tech && r.id_employee_tech === me.id_employee;
    var canWork = me.tech && R.mineOrFree && !closed;
    var canQuote = !closed; // presupuesto: cualquiera que entre (técnico o recepción)
    var base = '#id/' + r.id;
    main.innerHTML = header(esc(r.reference), '#home') +
      '<div class="er-app-rep">' +
        '<div class="er-app-rephead er-app-rephead-c"><button type="button" class="er-c-img er-app-cover" data-zoom>' + (r.cover ? '<img src="' + esc(r.cover) + '" alt="">' : icon(r.category_icon || 'device')) + '</button>' +
          '<div style="min-width:0"><div class="er-model">' + esc(r.device_name) + '</div><div class="er-muted er-small">' + esc(r.category_name + (r.serial ? ' · ' + r.serial : '')) + '</div>' +
          '<div class="er-row" style="margin-top:6px">' + statusChip(st, r.status) + (r.urgent ? '<span class="er-tag er-t-urg">Urgente</span>' : '') + (r.waiting_part ? '<span class="er-tag er-t-wait">Esperando pieza</span>' : '') + (r.warranty ? '<span class="er-tag er-t-gar">Garantía</span>' : '') + '</div></div></div>' +
        (r.id_employee_tech ? '<div class="er-app-tech">' + icon('user', true) + 'Técnico: <b>' + esc(r.tech_name) + '</b>' + (mine ? ' (tú)' : '') + '</div>'
          : me.tech && !closed ? '<button type="button" class="er-btn er-btn-pri er-btn-lg er-btn-block" data-claim>' + icon('check') + 'Asignármela</button>' : '') +
        quoteBanner(closed) +
        customerBox(r, closed) +
        (R.repeat ? '<div class="er-banner ' + (R.repeat.same ? 'er-bad' : 'er-warn') + '">' + icon('refresh') + '<div><b>Repetida:</b> vuelve ' + R.repeat.days + ' días después de ' + esc(R.repeat.reference) +
          (R.repeat.same ? ' por la misma avería' : ' (otra avería)') + (R.repeat.tech ? ' · técnico ' + esc(R.repeat.tech) : '') + '.</div></div>' : '') +
        (R.kbCount && R.kbCount.faults ? '<a class="er-banner er-info" href="' + base + '/manual">' + icon('book') + '<div>Este modelo tiene <b>' + R.kbCount.faults + ' fallo' + (R.kbCount.faults === 1 ? '' : 's') + ' conocido' + (R.kbCount.faults === 1 ? '' : 's') + '</b> con solución.</div></a>' : '') +
        '<div class="er-app-sect">' + (tab !== 'work' ? '<a class="er-app-sback" href="' + base + '/work">' + icon('back', true) + 'Trabajo</a>' : '') +
          '<h2>' + ({ work: 'Trabajo', parts: R._sub === 'unlock' ? 'Deslimitar' : 'Presupuesto', codes: 'Códigos de error', manual: 'Manual' }[tab] || 'Trabajo') + '</h2></div>' +
        '<div id="er-tab"></div>' +
      '</div>';
    main.querySelector('[data-zoom]').addEventListener('click', function () {
      var list = R.photos.map(function (p) { return { src: p.full, caption: p.type === 'device' ? 'Foto del equipo' : 'Foto' }; });
      if (r.cover && !list.length) list.push({ src: r.cover });
      E.viewer(list, 0);
    });
    main.querySelector('.er-app-rep').addEventListener('click', function (e) {
      if (e.target.closest('[data-wa]')) {
        E.notify({ id_ecorepair: r.id }).then(function (res) { if (res) E.toast('Mensaje guardado en el historial'); });
        return;
      }
      if (e.target.closest('[data-batt]')) { openBattery(); return; }
      if (e.target.closest('[data-gounl]')) { nextSub = 'unlock'; if (location.hash === base + '/parts') { R._sub = 'unlock'; nextSub = null; drawRepair('parts'); } return; }
      if (e.target.closest('a[href$="/parts"]')) { nextSub = 'parts'; if (location.hash === base + '/parts') { R._sub = 'parts'; nextSub = null; drawRepair('parts'); } }
      if (e.target.closest('[data-print]')) { printAsk(); return; }
      if (e.target.closest('[data-qdetail]') && !e.target.closest('[data-qnew]')) { quoteDetail(); return; }
      var qn = e.target.closest('[data-qnew]');
      if (qn) {
        E.dialog({ title: 'Presupuesto nuevo', text: 'Se copia el anterior en borrador para que lo cambies y lo vuelvas a enviar.', ok: 'Hacerlo' }).then(function (y) {
          if (!y) return;
          qn.disabled = true;
          api('quoteNew', { id: r.id }).then(function (res) {
            if (!res.ok) { qn.disabled = false; E.toast(res.error, true); return; }
            R = res; location.hash = '#id/' + r.id + '/parts'; E.toast('Presupuesto nuevo en borrador');
          });
        });
      }
    });
    var claim = main.querySelector('[data-claim]');
    if (claim) claim.addEventListener('click', function () {
      claim.disabled = true;
      api('claim', { id: r.id }).then(function (res) {
        claim.disabled = false;
        if (!res.ok) { E.toast(res.error, true); return; }
        R = res; drawRepair(tab); E.toast('Asignada a ti');
      });
    });
    var el = main.querySelector('#er-tab');
    if (tab === 'parts') {
      var sub = R._sub || 'parts';
      el.innerHTML = '<div class="er-app-ub">' + E.incompatButton(R.incompat || [], false) + '</div>' +
        (R.battery && E.batterySummary(R.battery) ? '<div class="er-banner">' + icon('battery') + '<div><b>Batería:</b> ' + esc(E.batterySummary(R.battery)) +
          ((R.battery.ctrl || []).length ? ' · ' + esc(R.battery.ctrl.map(function (k) { return (R.battery.connectors.controller || {})[k] || k; }).join(', ')) : '') + '</div></div>' : '') +
        '<div class="er-seg">' + [['parts', 'Piezas'], ['fixed', 'Precio cerrado' + ((R.fixed || []).length ? ' ' + R.fixed.length : '')]].map(function (t) {
        return '<button type="button" data-sub="' + t[0] + '" aria-pressed="' + (sub === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div><div id="er-sub"></div>';
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-bell]')) { E.incompatPanel({ title: r.device_name, list: R.incompat || [] }); return; }
        var b = e.target.closest('[data-sub]'); if (b && !e.target.closest('#er-sub')) { R._sub = b.getAttribute('data-sub'); drawRepair('parts'); } });
      var host = el.querySelector('#er-sub');
      function quoteAdd(action, id, btn, msg) {
        btn.disabled = true;
        api(action, { id: r.id }, { item: id }).then(function (res) {
          btn.disabled = false;
          if (!res.ok) { E.toast(res.error, true); return; }
          var keep = R._sub; R = res; R._sub = keep; drawRepair('parts'); E.toast(msg);
        });
      }
      if (sub === 'fixed') {
        host.className = 'er-panel';
        E.FixedPanel(host, { list: R.fixed || [], onAdd: canQuote ? function (f, btn) { quoteAdd('fixedAdd', f.id, btn, '«' + f.name + '» añadido al presupuesto'); } : null });
      } else if (sub === 'unlock') {
        host.className = 'er-panel';
        E.UnlockPanel(host, { list: R.unlock || [], admin: false, onAdd: canQuote ? function (u, btn) { quoteAdd('unlockAdd', u.id, btn, 'Deslimitación añadida al presupuesto'); } : null });
      } else {
        host.innerHTML = '<div class="er-panel"><h3>' + icon('box') + 'Piezas de este modelo</h3><div id="er-mp"></div></div><div id="er-pt"></div>';
        var pt = partsTab(host.querySelector('#er-pt'), canQuote);
        E.PartsDiagram(host.querySelector('#er-mp'), { parts: R.modelParts, zones: R.zones, sections: R.sections, map: R.modelMap, photo: R.modelPhoto, suggested: R.suggestedZones, admin: false, incompat: R.incompat || [],
          onAdd: canQuote ? function (p) { pt.add({ id_product: p.id_product, id_product_attribute: p.id_product_attribute, name: p.product.name, reference: p.product.reference, price: p.product.price, tax_rate: p.product.tax_rate }); } : null });
      }
    }
    else if (tab === 'codes' || tab === 'manual') kbTab(el, r.id_brand, r.id_model, r.device_name, tab, r.id);
    else workTab(el, canWork);
  }

  /* Aviso del presupuesto: aceptado, rechazado (con el motivo) o esperando respuesta */
  function quoteBanner(closed) {
    var q = R.quoteInfo;
    if (!q) return '';
    var t = { accepted: ['er-ok', 'check', 'Presupuesto aceptado'], rejected: ['er-bad', 'x', 'Presupuesto rechazado'], sent: ['er-warn', 'clock', 'Presupuesto enviado · esperando respuesta'] }[q.status];
    if (!t) return '';
    var who = q.channel === 'link' ? ' por el cliente' : q.channel === 'store' ? ' en la tienda' : '';
    var partial = q.status === 'accepted' && /^Acepta solo una parte/i.test(q.note || '');
    if (partial) t[2] = 'Presupuesto aceptado en parte';
    return '<div class="er-banner ' + t[0] + ' er-app-qban" data-qdetail role="button" tabindex="0">' + icon(t[1]) + '<div class="er-grow"><b>' + t[2] + who + '</b> · ' + esc(q.label) + ' · ' + esc(E.fmtMoney(q.total)) +
      (q.date ? '<div class="er-small">' + esc(E.fmtDateTime(q.date)) + '</div>' : '') +
      (partial ? '<div class="er-app-qout">' + icon('x', true) + '<span><b>No quiere:</b> ' + esc(q.note.replace(/^Acepta solo una parte\.\s*No quiere:\s*/i, '')) + '</span></div>'
        : q.note ? '<div class="er-small"><b>' + (q.status === 'rejected' ? 'Motivo' : 'Nota') + ':</b> ' + esc(q.note) + '</div>' : '') +
      '<div class="er-small er-app-qmore">Toca para ver todo lo que hay que hacer ›</div>' +
      (!closed && !q.hasDraft && (q.status === 'rejected' || q.status === 'sent') ? '<button type="button" class="er-btn er-btn-sm" data-qnew>' + icon('refresh', true) + 'Hacer presupuesto nuevo</button>' : '') +
      (q.hasDraft ? '<div class="er-small">Hay un presupuesto nuevo en borrador (pestaña Presupuesto).</div>' : '') + '</div></div>';
  }
  /* Ventana con el presupuesto respondido: qué hay que hacer, lo que no quiere y el total */
  function quoteDetail() {
    var q = R.quoteInfo;
    if (!q) return;
    var partial = q.status === 'accepted' && /^Acepta solo una parte/i.test(q.note || '');
    var lines = q.lines || [], tot = lines.reduce(function (a, l) { return a + (l.warranty ? 0 : +l.total || 0); }, 0);
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg er-app-qdlg"><div class="er-row" style="flex-wrap:nowrap"><h2 style="margin-right:auto">' +
      (q.status === 'accepted' ? 'Hay que hacer' : q.status === 'rejected' ? 'Presupuesto rechazado' : 'Presupuesto enviado') + '</h2>' +
      '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-x aria-label="Cerrar">' + icon('x') + '</button></div>' +
      '<div class="er-muted er-small">' + esc(q.label + ' · ' + R.repair.reference + ' · ' + R.repair.device_name) + '</div>' +
      '<div class="er-app-qd">' + (lines.length ? lines.map(function (l) {
        return '<div class="er-app-qdrow">' + (q.status === 'accepted' ? '<span class="er-app-qdok">' + icon('check', true) + '</span>' : '') +
          '<span class="er-grow"><b>' + esc(l.qty_text + ' × ' + l.name) + '</b>' + (l.type === 'labour' ? ' <span class="er-tag er-t-neu">Mano de obra</span>' : '') +
          (l.warranty ? ' <span class="er-tag er-t-gar">Garantía</span>' : '') + '</span><b class="er-num">' + esc(E.fmtMoney(l.warranty ? 0 : l.total)) + '</b></div>';
      }).join('') : '<p class="er-muted">Sin líneas.</p>') + '</div>' +
      '<div class="er-app-qtot"><span>Total con IVA</span><b class="er-num">' + esc(E.fmtMoney(tot)) + '</b></div>' +
      (partial ? '<div class="er-app-qout">' + icon('x', true) + '<span><b>No quiere hacer:</b> ' + esc(q.note.replace(/^Acepta solo una parte\.\s*No quiere:\s*/i, '')) + '</span></div>'
        : q.note ? '<div class="er-banner er-warn" style="margin:0">' + icon('alert') + '<div>' + esc(q.note) + '</div></div>' : '') +
      (q.notes ? '<div class="er-sub" style="margin:0">Observaciones</div><div class="er-small" style="white-space:pre-wrap">' + esc(q.notes) + '</div>' : '') +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-pri" data-x>Entendido</button></div></div>';
    app.appendChild(wrap);
    wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.closest('[data-x]')) wrap.remove(); });
  }
  /* Cliente: datos completos y accesos rápidos (llamar, WhatsApp, batería) */
  function customerBox(r, closed) {
    var c = R.customer, bt = R.battery || {}, tag = bt.volt ? bt.volt + ' V' + (bt.maxAh ? ' · ' + bt.maxAh + ' Ah' : '') : '';
    var tel = c && c.phone ? String(c.phone).replace(/[^\d+]/g, '') : '';
    var base = '#id/' + r.id;
    return '<div class="er-panel er-app-cust">' +
      '<div class="er-app-chead"><div class="er-app-cinfo"><div class="er-small er-muted">' + icon('user', true) + 'Cliente</div>' +
      (c ? '<div class="er-app-cname">' + esc(c.name) + (c.company ? ' <span class="er-muted er-small">· ' + esc(c.company) + '</span>' : '') + '</div>' +
        '<div class="er-app-cdata">' +
          (c.phone ? '<a href="tel:' + esc(tel) + '">' + icon('phone', true) + esc(c.phone) + '</a>' : '<span class="er-muted">Sin teléfono</span>') +
          (c.email ? '<a href="mailto:' + esc(c.email) + '">' + icon('mail', true) + esc(c.email) + '</a>' : '') +
          '<span class="er-muted er-small">' + c.repairs + ' reparaci' + (c.repairs === 1 ? 'ón' : 'ones') + (c.whatsapp ? ' · acepta WhatsApp' : '') + '</span></div>' : '<p class="er-muted" style="margin:0">Sin datos del cliente.</p>') +
      '</div>' + (c && c.phone ? '<button type="button" class="er-app-waround" data-wa aria-label="Enviar WhatsApp">' + icon('whatsapp') + '</button>' : '') + '</div>' +
      '<div class="er-app-grid">' +
        '<a class="er-app-gb" href="' + base + '/parts">' + icon('box') + '<span>Presupuesto</span></a>' +
        '<a class="er-app-gb er-app-gb-unl" href="' + base + '/parts" data-gounl>' + icon('bolt') + '<span>Deslimitar</span></a>' +
        (r.id_model ? '<button type="button" class="er-app-gb er-app-gb-bat" data-batt>' + icon('battery') + '<span>Batería</span><em class="' + (tag ? 'ok' : '') + '">' + esc(tag || 'Sin datos') + '</em></button>'
          : '<span class="er-app-gb er-app-gb-off">' + icon('battery') + '<span>Batería</span><em>Sin modelo</em></span>') +
        '<a class="er-app-gb" href="' + base + '/codes">' + icon('code') + '<span>Códigos</span></a>' +
        '<a class="er-app-gb" href="' + base + '/manual">' + icon('book') + '<span>Manual</span></a>' +
        '<button type="button" class="er-app-gb" data-print>' + icon('print') + '<span>Imprimir</span></button>' +
      '</div></div>';
  }
  /* Imprimir desde el móvil: se manda al ordenador de la tienda, que abre la ventana de imprimir */
  function printAsk() {
    var r = R.repair;
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg" style="max-width:420px"><div class="er-row" style="flex-wrap:nowrap"><h2 style="margin-right:auto">' + icon('print') + ' Imprimir ' + esc(r.reference) + '</h2>' +
      '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-x aria-label="Cerrar">' + icon('x') + '</button></div>' +
      '<p class="er-muted er-small" style="margin:0">Se abre la ventana de imprimir en el ordenador de la tienda (con el panel del taller abierto).</p>' +
      '<button type="button" class="er-btn er-btn-lg er-app-pbtn" data-pt="receipt">' + icon('user') + '<span><b>Resguardo del cliente</b><small>Con los datos, el QR de seguimiento y las condiciones</small></span></button>' +
      '<button type="button" class="er-btn er-btn-lg er-app-pbtn" data-pt="tag">' + icon('qr') + '<span><b>Etiqueta del patín</b><small>Para pegar al equipo, con el QR del taller</small></span></button></div>';
    app.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      var b = e.target.closest('[data-pt]');
      if (!b) return;
      b.disabled = true;
      api('printAsk', { id: r.id }, { type: b.getAttribute('data-pt') }).then(function (res) {
        b.disabled = false;
        if (!res.ok) { E.toast(res.error, true); return; }
        wrap.remove();
        E.toast('Enviado al ordenador de la tienda para imprimir');
      });
    });
  }
  function openBattery() {
    var r = R.repair;
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg er-b2-dlg"><div id="er-batd"></div></div>';
    app.appendChild(wrap);
    function close() { wrap.remove(); drawRepair(location.hash.split('/')[2] || 'work'); }
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    E.BatteryPanel(wrap.querySelector('#er-batd'), { data: R.battery || {}, canEdit: true, noNewConnector: true, id_model: r.id_model, title: r.device_name, onClose: close,
      catalogCall: function () { return api('batteryCatalog', { id: r.id }); },
      onSave: function (d) { return api('batterySave', { id: r.id }, { data: JSON.stringify(d) }).then(function (res) { if (res.ok) R.battery = res.battery; return res; }); } });
  }

  function workTab(el, canWork) {
    var r = R.repair;
    var canDiag = !(r.status === 'delivered' || r.status === 'cancelled') && (canWork || me.reception);
    var btn = function (s, label) {
      return '<button type="button" class="er-btn er-btn-lg' + (r.status === s ? ' er-btn-pri' : '') + '" data-st="' + s + '"' + (canWork ? '' : ' disabled') + '><span class="er-dot" style="background:' + esc(R.statuses[s].color) + '"></span>' + label + '</button>';
    };
    el.innerHTML =
      '<div class="er-panel"><h3>' + icon('alert') + 'Avería</h3><div>' + esc(r.fault || 'Sin indicar') + '</div>' +
        '<div class="er-sub" style="margin:8px 0 0">Diagnóstico del técnico</div>' +
        (canDiag ? '<textarea class="er-input" id="er-app-diag" rows="4" maxlength="5000" data-voice-list placeholder="Qué le pasa y qué hay que hacer">' + esc(r.diagnosis || '') + '</textarea>' +
          '<div class="er-row" style="justify-content:flex-end"><button type="button" class="er-btn er-btn-pri" id="er-app-diag-save">' + icon('check', true) + 'Guardar diagnóstico</button></div>'
          : '<div>' + (r.diagnosis ? esc(r.diagnosis) : '<span class="er-muted">Sin diagnóstico todavía.</span>') + '</div>') +
        ((r.accessories || []).length ? '<div class="er-muted er-small">Entregado con: ' + esc(r.accessories.join(', ')) + '</div>' : '') +
        ((r.damages || []).length ? '<div class="er-muted er-small">Daños previos: ' + esc(r.damages.join(', ')) + '</div>' : '') + '</div>' +
      (me.tech ? '<div class="er-panel"><h3>Estado</h3><div class="er-app-states">' + btn('diagnosis', 'Diagnóstico') + btn('repair', 'En reparación') +
        '<button type="button" class="er-btn er-btn-lg' + (r.waiting_part ? ' er-btn-warn' : '') + '" data-st="wait"' + (canWork && r.status !== 'ready' ? '' : ' disabled') + '><span class="er-dot" style="background:#E0A100"></span>' + (r.waiting_part ? 'Pieza recibida' : 'Esperando pieza') + '</button>' +
        btn('ready', 'Listo') + '</div>' + (!canWork && R.mineOrFree === false ? '<p class="er-muted er-small" style="margin:0">Es de otro técnico: solo puedes consultarla.</p>' : '') + '</div>' : '') +
      '<div class="er-panel"><h3>' + icon('pen') + 'Nota interna</h3><div class="er-row" style="flex-wrap:nowrap"><input class="er-input" id="er-app-note" data-voice maxlength="2000" placeholder="Qué has visto o hecho"><button type="button" class="er-btn er-btn-pri" id="er-app-note-add">' + icon('check') + '</button></div></div>' +
      '<div class="er-panel"><h3>' + icon('camera') + 'Fotos<span class="er-r">' + R.photos.length + '</span></h3>' +
        '<div class="er-photos">' + R.photos.map(function (p, i) { return '<button type="button" class="er-ph" data-ph="' + i + '"><img src="' + esc(p.thumb) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' +
        '<div class="er-row"><button type="button" class="er-btn" data-shot="work">' + icon('camera', true) + 'Foto del trabajo</button><button type="button" class="er-btn er-btn-ghost" data-shot="gallery">' + icon('box', true) + 'Galería</button><button type="button" class="er-btn er-btn-ghost" data-shot="device">' + icon('camera', true) + 'Foto del equipo</button></div>' +
        '<input type="file" id="er-app-file" accept="image/*" hidden></div>' +
      ((R.checklistItems || []).length ? '<div class="er-panel"><h3>' + icon('check') + 'Revisión<span class="er-r">Opcional</span></h3><div id="er-chk"></div></div>' : '') +
      '<div class="er-panel"><h3>' + icon('clock') + 'Últimos movimientos</h3><ul class="er-timeline">' + R.log.slice(0, 8).map(function (l) {
        return '<li><span class="er-tdot"></span><div>' + esc(l.detail) + '<div class="er-when">' + esc(E.fmtDateTime(l.date) + (l.employee ? ' · ' + l.employee : '')) + '</div></div></li>';
      }).join('') + '</ul></div>';
    if (el.querySelector('#er-chk')) {
      E.Checklist(el.querySelector('#er-chk'), { items: R.checklistItems, done: R.checklist || {}, canEdit: canWork, onToggle: function (item) {
        return api('checkToggle', { id: r.id }, { item: item }).then(function (res) { if (res.ok) R = res; else E.toast(res.error, true); return res; });
      } });
    }
    var shotType = 'work';
    el.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-st]'))) {
        t.disabled = true;
        api('status', { id: r.id, status: t.getAttribute('data-st') }).then(function (res) {
          t.disabled = false;
          if (!res.ok) { E.toast(res.error, true); return; }
          R = res; drawRepair('work'); E.toast('Guardado');
        });
        return;
      }
      if ((t = e.target.closest('[data-ph]'))) { E.viewer(R.photos.map(function (p) { return { src: p.full }; }), +t.getAttribute('data-ph')); return; }
      if ((t = e.target.closest('[data-shot]'))) {
        var k = t.getAttribute('data-shot');
        shotType = k === 'gallery' ? 'work' : k;
        E.pickPhoto(el.querySelector('#er-app-file'), k === 'gallery');
        return;
      }
      if (e.target.closest('#er-app-diag-save')) {
        var dg = el.querySelector('#er-app-diag');
        api('diagnosis', { id: r.id }, { value: dg.value }).then(function (res) {
          if (!res.ok) { E.toast(res.error, true); return; }
          R = res; drawRepair('work'); E.toast('Diagnóstico guardado');
        });
        return;
      }
      if (e.target.closest('#er-app-note-add')) {
        var inp = el.querySelector('#er-app-note'), v = inp.value.trim();
        if (!v) { inp.focus(); return; }
        api('note', { id: r.id }, { note: v }).then(function (res) {
          if (!res.ok) { E.toast(res.error, true); return; }
          R = res; drawRepair('work'); E.toast('Nota guardada');
        });
      }
    });
    el.addEventListener('change', function (e) {
      if (e.target.id !== 'er-app-file' || !e.target.files.length) return;
      var f = e.target.files[0]; e.target.value = '';
      E.toast('Subiendo foto…');
      E.shrinkImage(f, 1600).then(function (small) {
        var fd = new FormData(); fd.append('photo', small, 'foto.jpg'); fd.append('type', shotType);
        api('photo', { id: r.id }, fd).then(function (res) {
          if (!res.ok) { E.toast(res.error, true); return; }
          R = res; drawRepair('work'); E.toast('Foto guardada');
        });
      });
    });
  }

  function partsTab(el, canWork) {
    var r = R.repair, cart = [];
    function stockTag(s) { return s <= 0 ? '<span class="er-tag er-t-bad">Sin stock</span>' : '<span class="er-tag er-t-ok">' + s + ' en stock</span>'; }
    function quoteBox() {
      if (!canWork) return '';
      var d = R.draft || { label: '', lines: [] };
      return '<div class="er-panel er-app-quote"><h3>' + icon('box') + (R.draft ? 'Presupuesto ' + esc(d.label || '') + '<span class="er-r">Borrador</span>' : (R.lines.length ? 'Presupuesto adicional' : 'Presupuesto')) + '</h3>' +
        (d.lines.length ? '<div class="er-app-ql">' + d.lines.map(function (l, i) {
          return '<div class="er-app-qrow"><span class="er-grow"><b>' + esc(l.name) + '</b>' + (l.type === 'labour' ? ' <span class="er-tag er-t-neu">Mano de obra</span>' : '') +
            (l.warranty ? ' <span class="er-tag er-t-gar">Garantía</span>' : '') + '<small class="er-num">' + esc(E.fmtMoney(l.price)) + ' / ud.</small></span>' +
            '<span class="er-app-qty"><button type="button" class="er-btn er-btn-sm er-icon-btn" data-qdec="' + i + '" aria-label="Menos">−</button><b class="er-num">' + esc(l.qty_text) + '</b>' +
            '<button type="button" class="er-btn er-btn-sm er-icon-btn" data-qinc="' + i + '" aria-label="Más">+</button></span>' +
            '<b class="er-num er-app-qt">' + esc(E.fmtMoney(l.total)) + '</b>' +
            '<button type="button" class="er-btn er-btn-sm er-btn-ghost er-icon-btn er-danger" data-qdel="' + i + '" aria-label="Quitar">' + icon('trash', true) + '</button></div>';
        }).join('') + '</div><div class="er-app-qtot"><span>Total con IVA</span><b class="er-num">' + esc(E.fmtMoney(d.lines.reduce(function (a, l) { return a + (+l.total || 0); }, 0))) + '</b></div>'
          : '<p class="er-muted" style="margin:0">Añade piezas abajo o mano de obra.</p>') +
        '<div class="er-app-addrow"><button type="button" class="er-btn" data-qlab20>' + icon('wrench', true) + '<span>Mano de obra</span><small>20 €</small></button>' +
          '<button type="button" class="er-btn" data-qform="part">' + icon('plus', true) + '<span>Producto suelto</span><small>Nombre y precio</small></button></div>' +
        '<div class="er-app-qform" id="er-app-qform" hidden></div>' +
        (R.draft && d.lines.length ? '<button type="button" class="er-btn er-btn-pri er-btn-lg er-btn-block" id="er-app-qsend">' + icon('check') + 'Enviar presupuesto al cliente</button>' +
          '<p class="er-muted er-small" style="margin:0">Le llega el enlace por email (si tiene) para aceptarlo. Después puedes avisarle por WhatsApp.</p>' : '') + '</div>';
    }
    function saveLines(lines, msg) {
      api('quoteLines', { id: r.id }, { lines: JSON.stringify(lines) }).then(function (res) {
        if (!res.ok) { E.toast(res.error, true); return; }
        R = res; drawRepair('parts'); if (msg) E.toast(msg);
      });
    }
    function draw(results) {
      el.innerHTML = quoteBox() +
        (canWork ? '<div class="er-panel"><h3>' + icon('search') + 'Añadir piezas</h3>' +
          '<label class="er-search">' + icon('search') + '<input class="er-input" id="er-app-q" type="search" placeholder="Nombre, referencia o EAN" autocomplete="off"></label>' +
          '<div class="er-app-res" id="er-app-res">' + (results || []).map(function (p, i) {
            return '<div class="er-app-prod" data-add="' + i + '" role="button" tabindex="0">' + (p.image ? '<img class="er-pimg" src="' + esc(p.image) + '" alt="">' : '<span class="er-pimg er-pimg-empty">' + icon('box', true) + '</span>') +
              '<span class="er-grow"><b>' + esc(p.name) + '</b>' + (p.incompat ? '<span class="er-tag ' + (p.incompat.level === 'block' ? 'er-t-bad' : 'er-t-warn') + '">' + (p.incompat.level === 'block' ? 'No vale para este modelo' : 'Precaución') + '</span><span class="er-small er-muted" style="display:block">' + esc(p.incompat.reason) + '</span>' : '') +
              '<span class="er-row er-small">' + stockTag(p.stock) + '<b class="er-num">' + esc(E.fmtMoney(p.price)) + '</b></span></span>' +
              '<span class="er-stack" style="gap:6px"><button type="button" class="er-btn er-btn-sm er-btn-pri" data-add="' + i + '">' + icon('plus', true) + '</button>' +
              (p.stock <= 0 ? '<button type="button" class="er-btn er-btn-sm" data-req="' + i + '">Encargar</button>' : '') +
              (r.id_brand && !p.incompat ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost" data-inc-mark="' + i + '" title="No vale para este modelo">' + icon('alert', true) + '</button>' : '') + '</span></div>';
          }).join('') + '</div>' +
          (cart.length ? '<div class="er-app-cart"><div class="er-sub">Vas a añadir</div>' + cart.map(function (c, i) {
            return (r.id_brand && c.id_product ? '<div class="er-app-linkrow"><label><input type="checkbox" data-link="' + i + '"' + (c.link ? ' checked' : '') + '> Guardar como pieza de este patín</label>' +
              (c.link ? '<select class="er-input" data-zone="' + i + '">' + Object.keys(R.zones || {}).map(function (z) { return '<option value="' + z + '"' + (c.zone === z ? ' selected' : '') + '>' + esc(R.zones[z]) + '</option>'; }).join('') + '</select>' : '') + '</div>' : '') +
              '<div class="er-row" style="flex-wrap:nowrap"><span class="er-grow">' + esc(c.name) + '</span><button type="button" class="er-btn er-btn-sm er-icon-btn" data-dec="' + i + '">−</button><b class="er-num">' + c.qty + '</b><button type="button" class="er-btn er-btn-sm er-icon-btn" data-inc="' + i + '">+</button></div>';
          }).join('') + '<button type="button" class="er-btn er-btn-pri er-btn-lg er-btn-block" id="er-app-addparts">' + icon('check') + 'Añadir al presupuesto</button>' +
          '<p class="er-muted er-small" style="margin:0">Van al borrador del presupuesto. En la tienda lo revisan y lo envían al cliente.</p></div>' : '') +
          '</div>' : '<p class="er-muted">Asígnate la reparación para añadir piezas.</p>') +
        (R.draft && canWork && R.quoteState === 'draft' ? '' : '<div class="er-panel"><h3>' + icon('box') + 'En el presupuesto<span class="er-r">' + esc({ none: 'Sin presupuesto', draft: 'Borrador', sent: 'Enviado al cliente', accepted: 'Aceptado' }[R.quoteState] || '') + '</span></h3>' +
          (R.lines.length ? '<div class="er-mini">' + R.lines.map(function (l) {
            return '<div><span class="er-grow" style="white-space:normal">' + esc(l.qty_text + ' × ' + l.name) + (l.warranty ? ' <span class="er-tag er-t-gar">Garantía</span>' : '') + '</span><b class="er-num">' + esc(E.fmtMoney(l.total)) + '</b></div>';
          }).join('') + '</div><div class="er-app-qtot"><span>Total con IVA</span><b class="er-num">' + esc(E.fmtMoney(R.lines.reduce(function (a, l) { return a + (l.warranty ? 0 : +l.total || 0); }, 0))) + '</b></div>'
            : '<p class="er-muted" style="margin:0">Todavía no hay piezas.</p>') + '</div>');
      var q = el.querySelector('#er-app-q');
      if (q && last) { q.value = last; }
    }
    var results = [], last = '', timer, seq = 0;
    draw();
    el.addEventListener('change', function (e) {
      var a = e.target.getAttribute('data-link'), z = e.target.getAttribute('data-zone');
      if (a !== null) { cart[+a].link = e.target.checked; if (!cart[+a].zone) cart[+a].zone = (R.suggestedZones || [])[0] || 'other'; draw(results); }
      else if (z !== null) cart[+z].zone = e.target.value;
    });
    var api2 = {
      add: function (p) {
        var ex = cart.filter(function (c) { return c.id_product === p.id_product && c.id_product_attribute === p.id_product_attribute; })[0];
        if (ex) ex.qty++; else cart.push({ id_product: p.id_product, id_product_attribute: p.id_product_attribute, name: p.name, reference: p.reference, qty: 1, price: p.price, tax_rate: p.tax_rate });
        if (navigator.vibrate) navigator.vibrate(30);
        draw(results);
        var c = el.querySelector('.er-app-cart'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    el.addEventListener('input', function (e) {
      if (e.target.id !== 'er-app-q') return;
      last = e.target.value.trim(); clearTimeout(timer);
      if (last.length < 2) return;
      timer = setTimeout(function () {
        var my = ++seq;
        api('search', { id: r.id, q: last }, null).then(function (res) {
          if (my !== seq || !res.ok) return;
          results = res.products;
          var keep = document.activeElement && document.activeElement.id === 'er-app-q';
          draw(results);
          if (keep) { var qq = el.querySelector('#er-app-q'); qq.focus(); qq.setSelectionRange(qq.value.length, qq.value.length); }
        });
      }, 300);
    });
    el.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-add]')) && !e.target.closest('[data-req],[data-inc-mark]')) {
        var p = results[+t.getAttribute('data-add')];
        E.confirmIncompat(p.name, p.incompat, r.device_name).then(function (go) {
          if (!go) return;
          var ex = cart.filter(function (c) { return c.id_product === p.id_product && c.id_product_attribute === p.id_product_attribute; })[0];
          if (ex) ex.qty++; else cart.push({ id_product: p.id_product, id_product_attribute: p.id_product_attribute, name: p.name, reference: p.reference, qty: 1, price: p.price, tax_rate: p.tax_rate });
          if (navigator.vibrate) navigator.vibrate(30);
          draw(results);
        });
        return;
      }
      if ((t = e.target.closest('[data-inc-mark]'))) {
        var pm = results[+t.getAttribute('data-inc-mark')];
        E.dialog({ title: 'No vale para ' + r.device_name, text: pm.name, input: true, multiline: true, inputLabel: 'Por qué no vale', required: true, requiredMsg: 'Escribe el motivo', maxlength: 500, ok: 'Guardar aviso', danger: true }).then(function (why) {
          if (!why) return;
          api('incompatSave', { id: r.id }, { data: JSON.stringify({ id_product: pm.id_product, id_product_attribute: pm.id_product_attribute, label: pm.name, reason: why, level: 'block' }) }).then(function (res) {
            if (!res.ok) { E.toast(res.error, true); return; }
            R = res; pm.incompat = { level: 'block', reason: why }; draw(results); E.toast('Aviso guardado en ' + r.device_name);
          });
        });
      }
      if ((t = e.target.closest('[data-inc]'))) { cart[+t.getAttribute('data-inc')].qty++; draw(results); return; }
      if ((t = e.target.closest('[data-dec]'))) { var c = cart[+t.getAttribute('data-dec')]; c.qty--; if (c.qty <= 0) cart.splice(cart.indexOf(c), 1); draw(results); return; }
      if ((t = e.target.closest('[data-req]'))) {
        var pr = results[+t.getAttribute('data-req')];
        api('request', { id: r.id }, { name: pr.name, qty: 1, price: pr.price, id_product: pr.id_product, id_product_attribute: pr.id_product_attribute }).then(function (res) {
          E.toast(res.ok ? 'Encargo creado: ' + pr.name : res.error, !res.ok);
        });
        return;
      }
      var d = R.draft;
      if (d && (t = e.target.closest('[data-qinc],[data-qdec],[data-qdel]'))) {
        var lines = d.lines.map(function (l) { return Object.assign({}, l); }), k;
        if ((k = t.getAttribute('data-qinc')) !== null) lines[+k].qty = (+lines[+k].qty || 0) + 1;
        else if ((k = t.getAttribute('data-qdec')) !== null) { lines[+k].qty = (+lines[+k].qty || 0) - 1; if (lines[+k].qty <= 0) lines.splice(+k, 1); }
        else { k = t.getAttribute('data-qdel'); lines.splice(+k, 1); }
        saveLines(lines);
        return;
      }
      if ((t = e.target.closest('[data-qlab20]'))) {
        // Mano de obra directa de 20 €; para otro importe: «Producto suelto»
        t.disabled = true;
        api('quoteLabour', { id: r.id }, { name: 'Mano de obra', price: '20', qty: 1, kind: 'labour' }).then(function (res) {
          t.disabled = false;
          if (!res.ok) { E.toast(res.error, true); return; }
          R = res; drawRepair('parts'); E.toast('Mano de obra de 20 € añadida');
        });
        return;
      }
      if ((t = e.target.closest('[data-qform]'))) {
        // Formulario corto: mano de obra (ya con «Mano de obra» y 20 €) o producto suelto que no está en la tienda
        var kind = t.getAttribute('data-qform'), box = el.querySelector('#er-app-qform');
        box.hidden = false;
        box.setAttribute('data-kind', kind);
        box.innerHTML = '<div class="er-sub">' + (kind === 'labour' ? 'Mano de obra' : 'Producto que no está en la tienda') + '</div>' +
          '<input class="er-input" id="er-app-labn" maxlength="128" value="' + (kind === 'labour' ? 'Mano de obra' : '') + '" placeholder="' + (kind === 'labour' ? 'Mano de obra' : 'Nombre (por ejemplo: Mano de obra)') + '">' +
          '<div class="er-row" style="flex-wrap:nowrap;gap:8px">' +
            (kind === 'part' ? '<label class="er-app-qf"><span>Cant.</span><input class="er-input er-num" id="er-app-labq" inputmode="numeric" value="1"></label>' : '') +
            '<label class="er-app-qf er-grow"><span>Precio con IVA</span><input class="er-input er-num" id="er-app-labp" inputmode="decimal" value="' + (kind === 'labour' ? '20' : '') + '" placeholder="0,00"><em>€</em></label></div>' +
          '<div class="er-row" style="gap:8px;flex-wrap:nowrap"><button type="button" class="er-btn er-btn-ghost" data-qcancel>Cancelar</button><button type="button" class="er-btn er-btn-pri er-grow" id="er-app-labadd">' + icon('plus', true) + 'Añadir al presupuesto</button></div>';
        var fi = box.querySelector(kind === 'labour' ? '#er-app-labp' : '#er-app-labn');
        fi.focus(); if (fi.select) fi.select();
        return;
      }
      if (e.target.closest('[data-qcancel]')) { var bx = el.querySelector('#er-app-qform'); bx.hidden = true; bx.innerHTML = ''; return; }
      if (e.target.closest('#er-app-labadd')) {
        var fb = el.querySelector('#er-app-qform'), knd = fb.getAttribute('data-kind') || 'labour';
        var ln = el.querySelector('#er-app-labn').value.trim() || (knd === 'labour' ? 'Mano de obra' : ''), lp = el.querySelector('#er-app-labp').value.trim();
        var lq = el.querySelector('#er-app-labq') ? el.querySelector('#er-app-labq').value : 1;
        if (!ln || lp === '') { E.toast(knd === 'labour' ? 'Escribe el precio.' : 'Escribe el nombre y el precio.', true); return; }
        api('quoteLabour', { id: r.id }, { name: ln, price: lp, qty: lq, kind: knd }).then(function (res) {
          if (!res.ok) { E.toast(res.error, true); return; }
          R = res; drawRepair('parts'); E.toast(knd === 'labour' ? 'Mano de obra añadida' : 'Producto añadido');
        });
        return;
      }
      if ((t = e.target.closest('#er-app-qsend'))) {
        E.dialog({ title: 'Enviar presupuesto', text: 'Ya no se podrá cambiar. Si hace falta, se hace una versión nueva desde la tienda.', ok: 'Enviar' }).then(function (y) {
          if (!y) return;
          t.disabled = true;
          api('quoteSend', { id: r.id }).then(function (res) {
            t.disabled = false;
            if (!res.ok) { E.toast(res.error, true); return; }
            R = res; drawRepair('parts');
            E.toast(res.emailed ? 'Presupuesto enviado por email' : 'Presupuesto enviado. Avísale por WhatsApp con la plantilla «Presupuesto».');
            if (R.customer && R.customer.phone) setTimeout(function () { E.notify({ id_ecorepair: r.id }); }, 400);
          });
        });
        return;
      }
      if (e.target.closest('#er-app-addparts')) {
        var toLink = cart.filter(function (c) { return c.link && c.id_product; });
        api('addParts', { id: r.id }, { lines: JSON.stringify(cart) }).then(function (res) {
          if (!res.ok) { E.toast(res.error, true); return; }
          R = res; cart = []; results = []; last = '';
          // Las marcadas «Guardar como pieza de este patín» quedan en la ficha del modelo, en su parte
          var chain = Promise.resolve(), linked = 0;
          toLink.forEach(function (c) {
            chain = chain.then(function () {
              return api('partLink', { id: r.id }, { zone: c.zone || 'other', name: c.name, id_product: c.id_product, id_product_attribute: c.id_product_attribute || 0 }).then(function (x) { if (x.ok) { R = x; linked++; } });
            });
          });
          chain.then(function () {
            drawRepair('parts');
            E.toast(res.added + ' pieza(s) añadidas al presupuesto' + (linked ? ' · ' + linked + ' guardada(s) en el patín' : ''));
          });
        });
      }
    });
    return api2;
  }

  /* ---------- Códigos y manual ---------- */
  function kbTab(el, idBrand, idModel, name, tab, idRepair) {
    if (!idBrand) { el.innerHTML = '<div class="er-empty">Esta reparación no tiene marca elegida. Mira «Manuales» para buscar el modelo.</div>'; return; }
    el.innerHTML = '<div class="er-empty">Cargando…</div>';
    api('knowledge', { id_brand: idBrand, id_model: idModel }, null).then(function (res) {
      if (!res.ok) return;
      var kb = res.kb;
      function draw() {
        if (tab === 'codes') {
          el.innerHTML = '<div class="er-panel"><label class="er-search">' + icon('search') + '<input class="er-input er-code-in" id="er-kb-q" inputmode="text" placeholder="Código que sale en la pantalla (ej. 21)" autocomplete="off"></label>' +
            '<div id="er-kb-codes" class="er-stack" style="gap:8px"></div>' +
            '<button type="button" class="er-btn er-btn-ghost" data-addkb="code">' + icon('plus', true) + 'Añadir un código que no está</button></div>';
          drawCodes('');
        } else {
          el.innerHTML =
            (kb.menu.length ? kb.menu.map(function (m) { return '<div class="er-panel"><h3>' + icon('book') + esc(m.title) + '</h3><div class="er-kb-body">' + esc(m.body) + '</div></div>'; }).join('') : '') +
            '<div class="er-panel"><h3>' + icon('code') + 'Menú y parámetros<span class="er-r">' + kb.params.length + '</span></h3>' +
              (kb.params.length ? '<div class="er-params">' + kb.params.map(function (p) {
                return '<div><b class="er-num">' + esc(p.code) + '</b><span class="er-grow">' + esc(p.name) + (p.notes ? '<span class="er-muted er-small" style="display:block">' + esc(p.notes) + '</span>' : '') + '</span>' +
                  (p.default_value !== '' ? '<span class="er-tag er-t-neu">' + esc(p.default_value) + '</span>' : '') + '</div>';
              }).join('') + '</div>' : '<p class="er-muted" style="margin:0">Sin parámetros apuntados. Se añaden desde el PC en la ficha del modelo.</p>') + '</div>' +
            '<div class="er-panel"><h3>' + icon('wrench') + 'Fallos y soluciones<span class="er-r">' + kb.faults.length + '</span></h3>' +
              (kb.faults.length ? kb.faults.map(function (f) {
                return '<details class="er-kb-item"><summary><b>' + esc(f.title) + '</b>' + (f.scope === 'brand' ? ' <span class="er-tag er-t-neu">Toda la marca</span>' : '') + '</summary><div class="er-kb-body">' + esc(f.body) +
                  '</div><div class="er-muted er-small">' + esc((f.author ? f.author + ' · ' : '') + E.fmtDate(f.date)) + '</div></details>';
              }).join('') : '<p class="er-muted" style="margin:0">Aún no hay soluciones apuntadas.</p>') +
              '<button type="button" class="er-btn er-btn-pri" data-addkb="fault">' + icon('plus', true) + 'Añadir solución</button></div>';
        }
      }
      function drawCodes(q) {
        var norm = q.trim();
        var list = E.findCodes(kb.codes, norm);
        el.querySelector('#er-kb-codes').innerHTML = list.length ? list.map(function (c) {
          return '<details class="er-kb-item er-code-item"' + (norm && list.length <= 2 ? ' open' : '') + '><summary><span class="er-code-n">' + esc(c.code) + '</span><b>' + esc(c.title) + '</b></summary>' +
            (c.causes ? '<div class="er-kb-body">' + esc(c.causes) + '</div>' : '') + (c.parts ? '<div class="er-small"><b>Piezas:</b> ' + esc(c.parts) + '</div>' : '') +
            (!c.verified ? '<div class="er-muted er-small">Por revisar en el taller</div>' : '') + '</details>';
        }).join('') : '<div class="er-empty">' + (kb.codes.length ? 'No hay ningún código «' + esc(q) + '».' : 'Este modelo no tiene códigos apuntados.') + '</div>';
      }
      draw();
      el.addEventListener('input', function (e) { if (e.target.id === 'er-kb-q') drawCodes(e.target.value); });
      el.addEventListener('click', function (e) {
        var t = e.target.closest('[data-addkb]');
        if (!t) return;
        var type = t.getAttribute('data-addkb');
        var wrap = document.createElement('div');
        wrap.className = 'er-modal';
        wrap.innerHTML = '<div class="er-dlg"><h2>' + (type === 'code' ? 'Añadir código de error' : 'Añadir fallo y solución') + '</h2>' +
          '<p class="er-muted er-small" style="margin:0">Para ' + esc(name) + '. Lo verá todo el equipo.</p>' +
          (type === 'code' ? '<label class="er-field">Código<input class="er-input" data-k="code" maxlength="16"></label><label class="er-field">Qué significa<input class="er-input" data-k="title" maxlength="160"></label>' +
            '<label class="er-field">Qué revisar<textarea class="er-input" data-k="causes" rows="3"></textarea></label><label class="er-field">Piezas habituales<input class="er-input" data-k="parts" maxlength="255"></label>'
            : '<label class="er-field">Fallo<input class="er-input" data-k="title" maxlength="160" placeholder="Ej.: se apaga al frenar"></label><label class="er-field">Solución<textarea class="er-input" data-k="body" rows="5" placeholder="Qué era y cómo se arregló"></textarea></label>') +
          '<label class="er-toggle">Solo para este modelo (no para toda la marca)<input type="checkbox" class="er-sw" id="er-kb-model"' + (idModel ? ' checked' : ' disabled') + '></label>' +
          '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar</button></div></div>';
        app.appendChild(wrap);
        wrap.addEventListener('click', function (ev) {
          if (ev.target === wrap || ev.target.closest('[data-x]')) { wrap.remove(); return; }
          if (!ev.target.closest('[data-ok]')) return;
          var data = { id_ecorepair: idRepair || 0 };
          wrap.querySelectorAll('[data-k]').forEach(function (i) { data[i.getAttribute('data-k')] = i.value.trim(); });
          api('kbSave', {}, { type: type, id_brand: idBrand, id_model: wrap.querySelector('#er-kb-model').checked ? idModel : 0, data: JSON.stringify(data) }).then(function (r2) {
            if (!r2.ok) { E.toast(r2.error, true); return; }
            kb = r2.kb; wrap.remove(); draw(); E.toast('Guardado. Gracias.');
          });
        });
      });
    });
  }

  /* ---------- Manuales (sin reparación) ---------- */
  var catalog = null;
  function loadCatalog() { return catalog ? Promise.resolve(catalog) : api('catalog', {}, null).then(function (res) { catalog = res.catalog || []; return catalog; }); }
  function modelsView() {
    tabbar('models');
    main.innerHTML = header('Códigos, manuales y piezas', '#home') + ''+
      '<label class="er-search">' + icon('search') + '<input class="er-input" id="er-m-q" type="search" placeholder="Buscar marca o modelo"></label><div id="er-m-list" class="er-mini" style="margin-top:12px"></div>';
    loadCatalog().then(function (cat) {
      var all = [];
      cat.forEach(function (c) { c.brands.forEach(function (b) { all.push({ brand: b, cat: c, model: null }); b.models.forEach(function (m) { all.push({ brand: b, cat: c, model: m }); }); }); });
      function draw(q) {
        q = q.trim();
        var list = !q ? all.filter(function (x) { return !x.model; }).slice(0, 80)
          : all.map(function (x) { return { x: x, s: E.fuzzyScore(q, x.brand.name + ' ' + (x.model ? x.model.name : '')) }; }).filter(function (o) { return o.s > 0; })
            .sort(function (a, b) { return b.s - a.s; }).slice(0, 40).map(function (o) { return o.x; });
        main.querySelector('#er-m-list').innerHTML = list.map(function (x) {
          var label = x.brand.name + (x.model ? ' ' + x.model.name : '');
          return '<a href="#model/' + x.brand.id + '/' + (x.model ? x.model.id : 0) + '/' + encodeURIComponent(label) + '">' +
            (x.model && x.model.image ? '<img class="er-mthumb" src="' + esc(E.modelImg(x.model.image)) + '" alt="">' : icon(x.cat.icon || 'other', true)) +
            '<span class="er-grow">' + esc(label) + (x.model ? '' : ' <span class="er-muted er-small">(toda la marca)</span>') + '</span><span class="er-muted er-small">' + esc(x.cat.name) + '</span></a>';
        }).join('') || '<div class="er-muted" style="padding:12px">Nada encontrado.</div>';
      }
      draw('');
      main.querySelector('#er-m-q').addEventListener('input', function (e) { draw(e.target.value); });
    });
  }
  function modelView(idBrand, idModel, name, tab) {
    tabbar('models');
    name = decodeURIComponent(name || '');
    var base = '#model/' + idBrand + '/' + idModel + '/' + encodeURIComponent(name);
    main.innerHTML = header(esc(name), '#models') + '<div class="er-seg er-seg-4">' + [['parts', 'Piezas'], ['unlock', 'Deslimitar'], ['codes', 'Códigos'], ['manual', 'Manual']].map(function (t) {
      return '<a href="' + base + '/' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</a>';
    }).join('') + '</div><div id="er-tab"></div>';
    if (tab === 'parts' || tab === 'unlock') {
      var box = main.querySelector('#er-tab');
      box.innerHTML = '<div class="er-empty">Cargando…</div>';
      api('modelParts', { id_brand: idBrand, id_model: idModel }).then(function (res) {
        box.innerHTML = '<div class="er-panel" id="er-mp"></div>' + (tab === 'parts' && (res.fixed || []).length ? '<div class="er-panel"><h3>' + icon('tag') + 'Precios cerrados</h3><div id="er-mfx"></div></div>' : '');
        if (tab === 'unlock') { E.UnlockPanel(box.querySelector('#er-mp'), { list: res.unlock || [], admin: false }); return; }
        E.PartsDiagram(box.querySelector('#er-mp'), { parts: res.parts || [], zones: res.zones || {}, sections: res.sections, map: res.modelMap, photo: res.modelPhoto, incompat: res.incompat || [], admin: false });
        if (box.querySelector('#er-mfx')) E.FixedPanel(box.querySelector('#er-mfx'), { list: res.fixed });
      });
      return;
    }
    kbTab(main.querySelector('#er-tab'), idBrand, idModel, name, tab, 0);
  }
  function partSearchView() {
    tabbar('models');
    main.innerHTML = header('Buscar piezas', '#models') + '<div class="er-panel" id="er-ps"></div>';
    E.PartsSearch(main.querySelector('#er-ps'), { admin: false, post: true, modelLink: function (m) { return '#model/' + m.id_brand + '/' + m.id_model + '/' + encodeURIComponent(m.label) + '/parts'; } });
  }

  /* ---------- Pegatina QR del patín ---------- */
  function tagView(tag) {
    tabbar('home');
    main.innerHTML = header('Pegatina ' + esc(tag), '#home') + '<div class="er-empty">Buscando el patín…</div>';
    if (!me.reception) {
      main.innerHTML = header('Pegatina ' + esc(tag), '#home') + '<div class="er-banner">' + icon('alert') + '<div>Esta es la pegatina del patín. Para la reparación escanea el QR del resguardo o de la etiqueta.</div></div>';
      return;
    }
    api('tag', { tag: tag }, null).then(function (res) {
      if (!res.ok) { main.innerHTML = header('Pegatina', '#home') + '<div class="er-banner er-bad">' + icon('alert') + '<div>' + esc(res.error) + '</div></div>'; return; }
      main.innerHTML = header(esc(res.device_name), '#home') +
        '<div class="er-panel"><b>' + esc(res.customer ? res.customer.name : '') + '</b><div class="er-muted er-small">' + esc((res.customer && res.customer.phone) || '') + ' · Última: ' + esc(res.reference) + '</div></div>' +
        (res.open ? '<a class="er-btn er-btn-lg er-btn-block" href="#id/' + res.open + '">' + icon('wrench') + 'Ya está en el taller: abrirla</a>' : '') +
        '<button type="button" class="er-btn er-btn-pri er-btn-lg er-btn-block" data-tnew>' + icon('plus') + 'Nueva entrada de este patín</button>';
      main.querySelector('[data-tnew]').addEventListener('click', function () { newView(res); });
    });
  }

  /* ---------- Nueva reparación (recepción) ---------- */
  function newView(pre) {
    tabbar('new');
    var nv = document.createElement('div');
    main.innerHTML = '';
    main.appendChild(nv);
    var st = { step: 1, customer: null, device: null, photos: [] };
    if (pre && pre.tag) {
      st.tag = pre.tag; st.customer = pre.customer; st.serial = pre.serial; st.color = pre.color;
      st.device = { id_category: pre.id_category, id_brand: pre.id_brand, id_model: pre.id_model, faults: [], label: pre.device_name };
      st.step = 3;
    }
    var picker = null, acc = null, dmg = null, pad = null;
    function stepper() {
      return '<div class="er-steps-m">' + ['Cliente', 'Equipo', 'Avería', 'Firma'].map(function (s, i) {
        return '<span class="' + (i + 1 < st.step ? 'done' : i + 1 === st.step ? 'cur' : '') + '">' + (i + 1) + '. ' + s + '</span>';
      }).join('') + '</div>';
    }
    function draw() {
      nv.innerHTML = header('Nueva reparación', '#home') + stepper() +
        (st.step === 1 ? '<button type="button" class="er-btn er-btn-pri er-btn-lg er-btn-block" data-voice style="margin-bottom:12px">' + icon('mic') + 'Rellenar todo por voz</button>' : '') +
        (st.tag ? '<div class="er-banner">' + icon('qr') + '<div>Pegatina ' + esc(st.tag) + ': cliente y patín ya rellenos.</div></div>' : '') +
        '<div id="er-step" class="er-stack"></div>' +
        '<div class="er-app-next">' + (st.step > 1 ? '<button type="button" class="er-btn er-btn-lg" data-prev>' + icon('back') + 'Atrás</button>' : '') +
        '<button type="button" class="er-btn er-btn-pri er-btn-lg" data-next>' + (st.step === 4 ? icon('check') + 'Crear reparación' : 'Siguiente') + '</button></div>';
      var el = nv.querySelector('#er-step');
      if (st.step === 1) stepCustomer(el);
      if (st.step === 2) {
        el.innerHTML = '<div class="er-panel"><h3>' + icon('device') + 'Equipo</h3><div id="er-dev" class="er-stack" style="gap:14px"><div class="er-empty">Cargando…</div></div>' +
          '<div class="er-fg"><label class="er-field">Nº de serie<input class="er-input" data-f="serial" maxlength="64" value="' + esc(st.serial || '') + '"></label>' +
          '<label class="er-field">Kilómetros<input class="er-input" data-f="km" inputmode="numeric" maxlength="9" value="' + esc(st.km || '') + '"></label>' +
          '<label class="er-field">Color<input class="er-input" data-f="color" maxlength="64" value="' + esc(st.color || '') + '"></label></div></div>';
        loadCatalog().then(function (cat) {
          picker = E.DevicePicker(el.querySelector('#er-dev'), { catalog: cat, canAdd: true, canManage: false, showFaults: true, smart: true, value: st.device ? { cat: st.device.id_category, brand: st.device.id_brand, model: st.device.id_model, faults: st.device.faults } : null });
        });
      }
      if (st.step === 3) {
        el.innerHTML = '<div class="er-panel"><h3>' + icon('alert') + 'Avería</h3><label class="er-field">Lo que cuenta el cliente<textarea class="er-input" id="er-fault" data-voice-list rows="4">' + esc(st.fault || '') + '</textarea></label>' +
          '<div><div class="er-sub">Entregado con el equipo</div><div id="er-acc"></div></div><div><div class="er-sub">Daños previos</div><div id="er-dmg"></div></div>' +
          '<label class="er-toggle">Urgente<input type="checkbox" class="er-sw er-sw-urg" id="er-urg"' + (st.urgent ? ' checked' : '') + '></label></div>' +
          '<div class="er-panel"><h3>' + icon('camera') + 'Fotos de entrada<span class="er-r">' + st.photos.length + '</span></h3><div class="er-photos">' +
          st.photos.map(function (p, i) { return '<div class="er-ph"><img src="' + esc(p.url) + '" alt=""><button type="button" class="er-del" data-rmph="' + i + '">' + icon('x', true) + '</button></div>'; }).join('') +
          '<button type="button" class="er-ph er-add" id="er-ph-add">' + icon('camera') + 'Hacer foto</button>' +
          '<button type="button" class="er-ph er-add" id="er-ph-gal">' + icon('box') + 'Galería</button></div><input type="file" id="er-ph-file" accept="image/*" multiple hidden></div>';
        acc = E.ChipSet(el.querySelector('#er-acc'), { options: D.accessories, selected: st.accessories || [], allowOther: true });
        dmg = E.ChipSet(el.querySelector('#er-dmg'), { options: D.damages, selected: st.damages || [], warn: true, allowOther: true });
      }
      if (st.step === 4) {
        el.innerHTML = '<div class="er-panel"><h3>' + icon('pen') + 'Firma del cliente<button type="button" class="er-btn er-btn-ghost er-btn-sm" id="er-sigclr" style="margin-left:auto">Borrar</button></h3>' +
          '<canvas class="er-sig" id="er-sig"></canvas>' +
          '<label class="er-toggle" style="font-size:14px">Acepta las condiciones y la protección de datos <span class="er-req">*</span><input type="checkbox" class="er-sw" id="er-rgpd"></label>' +
          '<label class="er-toggle" style="font-size:14px">Acepta avisos por WhatsApp<input type="checkbox" class="er-sw" id="er-wa"' + (st.customer && st.customer.consent_whatsapp ? ' checked' : '') + '></label></div>' +
          '<div class="er-panel er-small"><b>' + esc(st.customer.name) + '</b> · ' + esc(st.device.label) + '<br>' + esc(st.fault || (st.device.faults || []).join(', ')) + '</div>';
        pad = E.signaturePad(el.querySelector('#er-sig'));
        el.querySelector('#er-sigclr').addEventListener('click', function () { pad.clear(); });
      }
    }
    function keep() {
      if (st.step === 2) {
        if (picker) st.device = picker.get();
        nv.querySelectorAll('[data-f]').forEach(function (i) { st[i.getAttribute('data-f')] = i.value.trim(); });
      }
      if (st.step === 3) {
        st.fault = nv.querySelector('#er-fault').value.trim();
        st.accessories = acc.get(); st.damages = dmg.get(); st.urgent = nv.querySelector('#er-urg').checked;
      }
    }
    function stepCustomer(el) {
      var results = [], timer;
      function drawC() {
        if (st.customer) {
          el.innerHTML = '<div class="er-panel"><h3>' + icon('user') + 'Cliente</h3><div class="er-chosen"><span class="er-av" style="background:#5B6170">' + esc(E.initials(st.customer.name)) + '</span>' +
            '<div class="er-grow"><b>' + esc(st.customer.name) + '</b><div class="er-muted er-small">' + esc(st.customer.phone || '') + '</div></div><button type="button" class="er-btn er-btn-sm" data-cchg>Cambiar</button></div></div>';
          return;
        }
        el.innerHTML = '<div class="er-panel"><h3>' + icon('user') + 'Cliente</h3><label class="er-search">' + icon('search') + '<input class="er-input" id="er-cq" type="search" placeholder="Nombre o teléfono" autocomplete="off"></label>' +
          '<div class="er-pick" id="er-cres"></div><button type="button" class="er-btn" data-cnew>' + icon('plus') + 'Cliente nuevo</button>' +
          '<div id="er-cform" hidden class="er-stack" style="gap:10px"><div class="er-fg">' +
            '<label class="er-field">Nombre <span class="er-req">*</span><input class="er-input" data-c="firstname" maxlength="64"></label>' +
            '<label class="er-field">Apellidos <span class="er-req">*</span><input class="er-input" data-c="lastname" maxlength="64"></label>' +
            '<label class="er-field">Teléfono<input class="er-input" data-c="phone" inputmode="tel" maxlength="32"></label>' +
            '<label class="er-field">Email<input class="er-input" data-c="email" type="email" maxlength="128"></label></div>' +
            '<div class="er-err" id="er-cerr" hidden></div><button type="button" class="er-btn er-btn-pri" data-csave>' + icon('check') + 'Guardar cliente</button></div></div>';
        el.querySelector('#er-cq').focus();
      }
      drawC();
      el.addEventListener('input', function (e) {
        if (e.target.id !== 'er-cq') return;
        var v = e.target.value.trim(); clearTimeout(timer);
        timer = setTimeout(function () {
          if (v.length < 2) { el.querySelector('#er-cres').innerHTML = ''; return; }
          api('customers', { q: v }, null).then(function (res) {
            results = res.customers || [];
            var box = el.querySelector('#er-cres');
            if (box) box.innerHTML = results.map(function (c, i) { return '<button type="button" data-ci="' + i + '"><span class="er-grow"><b>' + esc(c.name) + '</b><br><span class="er-muted er-small">' + esc([c.phone, c.email].filter(Boolean).join(' · ')) + '</span></span></button>'; }).join('') ||
              '<div class="er-muted er-small" style="padding:10px">No está. Pulsa «Cliente nuevo».</div>';
          });
        }, 300);
      });
      el.addEventListener('click', function (e) {
        var t;
        if ((t = e.target.closest('[data-ci]'))) { st.customer = results[+t.getAttribute('data-ci')]; drawC(); return; }
        if (e.target.closest('[data-cchg]')) { st.customer = null; drawC(); return; }
        if (e.target.closest('[data-cnew]')) { el.querySelector('#er-cform').hidden = false; el.querySelector('[data-c="firstname"]').focus(); return; }
        if (e.target.closest('[data-csave]')) {
          var body = {};
          el.querySelectorAll('[data-c]').forEach(function (i) { body[i.getAttribute('data-c')] = i.value.trim(); });
          api('customerCreate', {}, body).then(function (res) {
            if (!res.ok) {
              var er = el.querySelector('#er-cerr');
              er.textContent = res.error || Object.keys(res.errors || {}).map(function (k) { return res.errors[k]; }).join(' ');
              er.hidden = false;
              if (res.existingCustomer) { st.customer = res.existingCustomer; E.toast('Ya existía: se ha elegido ' + res.existingCustomer.name); drawC(); }
              return;
            }
            st.customer = res.customer; drawC(); E.toast('Cliente creado');
          });
        }
      });
    }
    function voice() {
      loadCatalog().then(function (cat) {
        return E.voiceRepair({ catalog: cat, accessories: D.accessories || [], damages: D.damages || [], askCustomer: !st.customer, askDevice: !st.tag,
          presetCat: st.tag && st.device ? cat.filter(function (c) { return c.id === st.device.id_category; })[0] : null });
      }).then(function (R) {
        if (!R) return;
        if (R.serial) st.serial = R.serial;
        if (R.km) st.km = R.km;
        st.fault = [R.fault, R.notes.length ? 'Notas: ' + R.notes.join(', ') : ''].filter(Boolean).join('\n');
        if (R.acc.length) st.accessories = R.acc;
        if (R.dmg.length) st.damages = R.dmg;
        (R.accNew || []).forEach(function (v) { if ((D.accessories || []).indexOf(v) < 0) D.accessories.push(v); });
        (R.dmgNew || []).forEach(function (v) { if ((D.damages || []).indexOf(v) < 0) D.damages.push(v); });
        st.urgent = !!R.urgent;
        if (R.cat && !st.tag) st.device = { id_category: R.cat.id, id_brand: R.brand ? R.brand.id : 0, id_model: R.model ? R.model.id : 0, faults: R.faults, label: R.label || R.cat.name };
        else if (st.device) st.device.faults = R.faults;
        var phone = R.phone || '', name = [R.firstname, R.lastname].filter(Boolean).join(' ');
        var q = phone.length >= 6 ? phone : name;
        if (!q || st.customer) { st.step = st.customer ? 3 : 1; draw(); return; }
        api('customers', { q: q }, null).then(function (res) {
          var list = (res.customers || []).filter(function (c) {
            return phone.length >= 6 ? String(c.phone || '').replace(/\D/g, '').indexOf(phone.slice(-9)) > -1 : E.fuzzyScore(name, c.name) >= 80;
          });
          if (list.length === 1) { st.customer = list[0]; st.step = 3; E.toast('Cliente: ' + list[0].name + '. Revisa y sigue.'); draw(); return; }
          st.step = 1; draw();
          var form = nv.querySelector('#er-cform');
          if (form) {
            form.hidden = false;
            form.querySelector('[data-c="firstname"]').value = R.firstname || '';
            form.querySelector('[data-c="lastname"]').value = R.lastname || '';
            form.querySelector('[data-c="phone"]').value = phone;
          }
          E.toast(list.length > 1 ? 'Hay varios clientes parecidos: elígelo o crea uno nuevo.' : 'Cliente nuevo: revisa y pulsa «Guardar cliente».');
        });
      });
    }
    nv.addEventListener('click', function (e) {
      var t;
      if (e.target.closest('[data-voice]')) { voice(); return; }
      if (e.target.closest('[data-prev]')) { keep(); st.step--; draw(); return; }
      if ((t = e.target.closest('[data-rmph]'))) { st.photos.splice(+t.getAttribute('data-rmph'), 1); keep(); draw(); return; }
      if (e.target.closest('#er-ph-add')) { E.pickPhoto(nv.querySelector('#er-ph-file'), false); return; }
      if (e.target.closest('#er-ph-gal')) { E.pickPhoto(nv.querySelector('#er-ph-file'), true); return; }
      if (!e.target.closest('[data-next]')) return;
      keep();
      if (st.step === 1 && !st.customer) { E.toast('Elige o crea el cliente.', true); return; }
      if (st.step === 2 && (!st.device || !st.device.id_category)) { E.toast('Elige al menos la categoría.', true); return; }
      if (st.step === 3 && !st.fault && !(st.device.faults || []).length) { E.toast('Indica la avería.', true); return; }
      if (st.step < 4) { st.step++; draw(); return; }
      if (!nv.querySelector('#er-rgpd').checked) { E.toast('Falta aceptar las condiciones y la protección de datos.', true); return; }
      submit(e.target.closest('[data-next]'));
    });
    nv.addEventListener('change', function (e) {
      if (e.target.id !== 'er-ph-file') return;
      Array.prototype.slice.call(e.target.files).forEach(function (f) { st.photos.push({ file: f, url: URL.createObjectURL(f) }); });
      e.target.value = ''; keep(); draw();
    });
    function submit(btn) {
      btn.disabled = true;
      var p = { id_customer: st.customer.id_customer, id_category: st.device.id_category, id_brand: st.device.id_brand, id_model: st.device.id_model, faults: st.device.faults,
        serial: st.serial || '', km: st.km || '', color: st.color || '', fault_customer: st.fault || '', accessories: st.accessories || [], damages: st.damages || [],
        urgent: !!st.urgent, consent_rgpd: true, consent_whatsapp: nv.querySelector('#er-wa').checked, device_tag: st.tag || '' };
      var sig = pad && !pad.isEmpty() ? pad.toDataURL() : '';
      api('create', {}, { payload: JSON.stringify(p) }).then(function (res) {
        if (!res.ok) { btn.disabled = false; E.toast(res.error, true); return; }
        var chain = Promise.resolve();
        if (sig) chain = chain.then(function () { return api('signature', { id: res.id }, { signature: sig }); });
        st.photos.forEach(function (ph) {
          chain = chain.then(function () {
            return E.shrinkImage(ph.file, 1600).then(function (small) {
              var fd = new FormData(); fd.append('photo', small, 'foto.jpg'); fd.append('type', 'entry');
              return api('photo', { id: res.id }, fd);
            });
          });
        });
        chain.then(function () { done(res); });
      });
    }
    function done(res) {
      var waText = encodeURIComponent(res.message || '');
      nv.innerHTML = header('Reparación creada', '#home') +
        '<div class="er-panel er-done"><div class="er-done-ico">' + icon('check') + '</div><h2 class="er-code">' + esc(res.reference) + '</h2>' +
        '<p class="er-muted" style="margin:0">Se ha avisado por email si el cliente lo tiene.</p>' +
        (res.phone ? '<a class="er-btn er-btn-wa er-btn-lg er-btn-block" href="whatsapp://send?phone=' + esc(res.phone) + '&text=' + waText + '">' + icon('whatsapp') + 'Enviar resguardo por WhatsApp</a>' : '') +
        '<a class="er-btn er-btn-lg er-btn-block" href="#id/' + res.id + '">' + icon('wrench') + 'Abrir la reparación</a>' +
        '<button type="button" class="er-btn er-btn-ghost er-btn-block" data-again>' + icon('plus') + 'Otra reparación</button></div>';
      nv.querySelector('[data-again]').addEventListener('click', function () { newView(); });
    }
    draw();
  }

  route();
});
