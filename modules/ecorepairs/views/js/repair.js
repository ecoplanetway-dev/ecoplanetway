/* Reparaciones del taller · ficha de reparación */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'repair') return;

  var r = D.repair, c = D.customer || {};
  var log = D.log || [];
  var photos = D.photos || [];
  var signature = D.signature;
  var locked = r.status === 'delivered' && !D.isAdmin;
  var canEdit = !!D.canEdit && !locked;
  var devicePhoto = D.devicePhoto, modelImage = D.modelImage || '';
  var pay = D.payment || {};
  var dis = canEdit ? '' : ' disabled';
  var printUrl = E.ajaxUrl('printReceipt', { id_ecorepair: r.id });
  var labelUrl = E.ajaxUrl('printLabel', { id_ecorepair: r.id });

  app.innerHTML =
    '<div class="er-f-head">' +
      '<a class="er-btn er-btn-ghost er-icon-btn" href="' + esc(E.boot.links.board) + '" aria-label="Volver al tablero">' + icon('back') + '</a>' +
      '<button type="button" class="er-f-cover" id="er-cover" aria-label="Ver la foto del equipo en grande"></button>' +
      '<div class="er-f-title"><h1>' + esc(r.reference) + '</h1><span id="er-st"></span><span id="er-tags" class="er-row"></span></div>' +
      '<div class="er-f-actions">' +
        (D.canEdit ? '<button type="button" class="er-btn er-btn-wa" id="er-wa">' + icon('whatsapp') + 'WhatsApp</button>' : '') +
        '<button type="button" class="er-btn er-btn-hist" id="er-hist">' + icon('clock') + 'Historial<span class="er-hist-n" id="er-hist-n"></span></button>' +
        '<a class="er-btn" href="' + esc(printUrl) + '" target="_blank" rel="noopener">' + icon('print') + 'Imprimir resguardo</a>' +
        '<a class="er-btn" href="' + esc(labelUrl) + '" target="_blank" rel="noopener">' + icon('tag') + 'Etiqueta</a>' +
        (D.stickerUrl ? '<a class="er-btn" href="' + esc(D.stickerUrl) + '" target="_blank" rel="noopener" title="Pegatina QR fija para el patín: historial, garantía y entrada rápida">' + icon('qr') + 'Pegatina</a>' : '') +
        '<a class="er-btn er-btn-pri" href="' + esc(E.boot.links['new']) + '&id_customer=' + r.id_customer + '">' + icon('plus') + 'Otra reparación del cliente</a>' +
      '</div>' +
    '</div>' +
    '<div id="er-banners"></div>' +
    '<div class="er-steps" id="er-steps"></div>' +
    (r.id_brand ? '<div class="er-panel er-p-parts" id="er-p-parts"></div>' : '') +
    '<div class="er-grid2">' +
      '<div class="er-stack er-rgrid">' +
        '<div class="er-panel" id="er-p-cust"></div>' +
        '<div class="er-panel" id="er-p-dev"></div>' +
        '<div class="er-panel" id="er-p-photos"></div>' +
        '<div class="er-panel" id="er-p-log"></div>' +
      '</div>' +
      '<div class="er-stack">' +
        '<div class="er-panel" id="er-p-quote"></div>' +
        '<div class="er-panel er-p-pay" id="er-p-pay"></div>' +
        '<div class="er-panel" id="er-p-assign"></div>' +
        '<div class="er-panel" id="er-p-move"></div>' +
        ((D.checklistItems || []).length ? '<div class="er-panel" id="er-p-check"></div>' : '') +
        '<div class="er-panel" id="er-p-sig"></div>' +
        '<div class="er-panel" id="er-p-track"></div>' +
      '</div>' +
    '</div>';

  var $ = function (s) { return app.querySelector(s); };

  /* ---------- Cabecera, aviso y pasos ---------- */
  function coverSrc() { return devicePhoto ? devicePhoto.full : modelImage; }
  function renderCover() {
    var src = coverSrc(), el = $('#er-cover');
    el.innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : icon(r.category_icon || 'device');
    el.classList.toggle('er-f-cover-empty', !src);
  }
  function allPhotos() {
    var list = [];
    if (coverSrc()) list.push({ src: coverSrc(), caption: devicePhoto ? 'Foto del equipo' : 'Foto del modelo (catálogo)' });
    photos.forEach(function (p) { list.push({ src: p.full, caption: 'Foto de entrada · ' + E.fmtDateTime(p.date) }); });
    return list;
  }
  $('#er-cover').addEventListener('click', function () {
    if (coverSrc()) E.viewer(allPhotos(), 0);
    else if (canEdit) E.pickPhoto($('#er-dev-file'), false);
  });

  function renderHead() {
    renderCover();
    var hn = $('#er-hist-n'); if (hn) hn.textContent = log.length;
    $('#er-st').innerHTML = E.statusChip(D.statuses, r.status);
    $('#er-tags').innerHTML = (r.warranty ? '<span class="er-tag er-t-gar">En garantía</span>' : '') +
      (r.urgent ? '<span class="er-tag er-t-urg">Urgente</span>' : '') +
      (r.waiting_part ? '<span class="er-tag er-t-wait">Esperando pieza</span>' : '');
    var idx = D.flow.indexOf(r.status);
    var curColor = (D.statuses[r.status] || {}).color;
    $('#er-steps').hidden = r.status === 'cancelled';
    $('#er-steps').innerHTML = D.flow.map(function (s, i) {
      var cls = i < idx ? ' er-done' : i === idx ? ' er-cur' : '';
      return '<div class="er-step' + cls + '"><div class="er-bar"' + (i === idx ? ' style="background:' + esc(curColor) + '"' : '') + '></div><span>' + esc(D.statuses[s].name) + '</span></div>';
    }).join('');
    var b = '';
    if (r.status === 'ready' && r.days_in_status >= (D.pickupDays || 10)) {
      b += '<div class="er-banner er-warn">' + icon('clock') + '<div style="flex:1"><b>Lleva ' + r.days_in_status + ' días sin recoger.</b> Envía un recordatorio al cliente.</div>' +
        (D.canEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-wa" data-wa>' + icon('whatsapp', true) + 'Recordatorio</button>' : '') + '</div>';
    }
    if (D.repeat) {
      b += '<div class="er-banner ' + (D.repeat.same ? 'er-bad' : 'er-warn') + '">' + icon('refresh') + '<div><b>Repetida:</b> vuelve ' + D.repeat.days + ' días después de <a href="' + esc(E.boot.links.repair + D.repeat.id) + '"><b>' + esc(D.repeat.reference) + '</b></a>' +
        (D.repeat.same ? ' por la misma avería' : ' (otra avería)') + (D.repeat.tech ? ' · técnico ' + esc(D.repeat.tech) : '') + '.</div></div>';
    }
    if (r.status === 'delivered' && D.canEdit && D.reviewUrl) {
      b += '<div class="er-banner er-info">' + icon('star') + '<div style="flex:1">¿Le ha gustado? Pídele una reseña en Google.</div><button type="button" class="er-btn er-btn-sm er-btn-wa" data-wa>' + icon('whatsapp', true) + 'Pedir reseña</button></div>';
    }
    if (D.parent) {
      b += '<div class="er-banner er-info">' + icon('refresh') + '<div>Reapertura de <a href="' + esc(E.boot.links.repair + D.parent.id_ecorepair) + '"><b>' + esc(D.parent.reference) + '</b></a>' +
        (r.warranty ? ' · en garantía' : '') + '</div></div>';
    }
    if ((D.children || []).length) {
      b += '<div class="er-banner er-info">' + icon('refresh') + '<div>Se reabrió como ' + D.children.map(function (c) {
        return '<a href="' + esc(E.boot.links.repair + c.id_ecorepair) + '"><b>' + esc(c.reference) + '</b></a>';
      }).join(', ') + '</div></div>';
    }
    if (r.status === 'delivered' && D.warrantyUntil) {
      var inW = D.warrantyUntil >= new Date().toISOString().slice(0, 10);
      b += '<div class="er-banner ' + (inW ? 'er-ok' : 'er-lock') + '">' + icon('shield') + '<div style="flex:1"><b>Garantía de la reparación ' + (inW ? 'hasta el ' : 'terminada el ') + esc(E.fmtDate(D.warrantyUntil)) + '.</b></div>' +
        (D.canEdit ? '<button type="button" class="er-btn er-btn-sm" id="er-reopen">' + icon('refresh', true) + 'Reabrir' + (inW ? ' en garantía' : '') + '</button>' : '') + '</div>';
    }
    if (r.status === 'delivered') {
      b += '<div class="er-banner ' + (D.isAdmin ? 'er-warn' : 'er-lock') + '">' + icon('lock') + '<div><b>Reparación entregada' + (D.isAdmin ? ': estás editando como administrador.' : ' y bloqueada.') + '</b> ' +
        (D.isAdmin ? 'Todo lo que cambies queda en el historial con tu nombre.' : 'Solo el administrador puede cambiarla. Puedes añadir notas.') + '</div></div>';
    }
    if (r.status === 'cancelled') {
      b += '<div class="er-banner er-bad">' + icon('x') + '<div><b>Reparación cancelada.</b> ' + esc(r.cancel_reason) + '</div></div>';
    }
    var problems = null;
    try { problems = JSON.parse(sessionStorage.getItem('ecor-problems') || 'null'); sessionStorage.removeItem('ecor-problems'); } catch (e) {}
    if (problems && problems.length) {
      b += '<div class="er-banner er-bad">' + icon('alert') + '<div><b>La reparación se creó, pero falló algo al subir:</b><br>' + problems.map(esc).join('<br>') + '<br>Puedes volver a añadirlo aquí abajo.</div></div>';
    } else if (D.justCreated && !renderHead.shown) {
      b += '<div class="er-banner er-ok">' + icon('check') + '<div><b>' + esc(r.reference) + ' creada.</b> Si no se abrió el resguardo, usa «Imprimir resguardo».</div></div>';
    }
    renderHead.shown = true;
    if (b || r.status !== 'cancelled') $('#er-banners').innerHTML = b;
  }

  /* ---------- Guardado automático ---------- */
  function saved(el) {
    var s = el && el.closest('.er-panel') && el.closest('.er-panel').querySelector('.er-saved');
    if (!s) return;
    s.classList.add('er-on');
    clearTimeout(s._t);
    s._t = setTimeout(function () { s.classList.remove('er-on'); }, 1800);
  }
  function save(field, value, el) {
    var body = { field: field, value: Array.isArray(value) ? JSON.stringify(value) : value };
    return E.api('updateField', { id_ecorepair: r.id }, body).then(function (res) {
      if (!res.ok) { E.toast(res.error || 'No se pudo guardar.', true); if (el) el.classList.add('er-invalid'); return false; }
      if (el) el.classList.remove('er-invalid');
      r[field] = Array.isArray(value) ? value : (typeof value === 'boolean' ? (value ? 1 : 0) : value);
      if (res.log) { log = res.log; renderLog(); }
      saved(el);
      return true;
    });
  }

  /* ---------- Cliente ---------- */
  function renderCustomer() {
    var inv = c.invoice
      ? '<div><span class="er-k">Datos de factura</span><span class="er-v">' + esc([c.invoice.company, c.invoice.nif].filter(Boolean).join(' · ')) + '</span></div>'
      : '<div><span class="er-k">Datos de factura</span><span class="er-v">' + (canEdit ? '<button type="button" class="er-link" id="er-inv">Añadir</button>' : 'No') + '</span></div>';
    var hist = (D.history || []).map(function (h) {
      return '<a href="' + esc(E.boot.links.repair + h.id) + '"><b class="er-num">' + esc(h.reference) + '</b><span class="er-grow er-muted">' +
        esc(E.fmtDate(h.date_add) + ' · ' + h.device_name + (h.fault_customer ? ' · ' + h.fault_customer : '')) + '</span>' + E.statusChip(D.statuses, h.status) + '</a>';
    }).join('');
    $('#er-p-cust').innerHTML = '<h3>' + icon('user') + 'Cliente<span class="er-r">' +
        (D.canEdit ? '<button type="button" class="er-btn er-btn-sm" id="er-cust-edit">' + icon('pen', true) + 'Editar</button> ' : '') +
        '<a class="er-btn er-btn-sm er-btn-ghost" href="' + esc(D.customerUrl) + '">' + icon('user', true) + 'Ficha</a></span></h3>' +
      '<div class="er-person"><span class="er-av">' + esc(E.initials(c.name)) + '</span><div><b>' + esc(c.name || r.customer_name) + '</b>' +
      '<div class="er-muted er-num">' + esc([c.phone, c.email].filter(Boolean).join(' · ') || 'Sin teléfono ni email') + '</div></div></div>' +
      '<div class="er-kv">' +
        '<div><span class="er-k">Nº cliente PrestaShop</span><span class="er-v er-num">' + (c.id_customer || r.id_customer) + '</span></div>' + inv +
        '<div><span class="er-k">Compras en la tienda</span><span class="er-v er-num">' + (c.orders_count || 0) + ' pedidos · ' + E.fmtMoney(c.orders_total) + '</span></div>' +
        '<div><span class="er-k">Avisos por WhatsApp</span><span class="er-v">' + (c.consent_whatsapp ? 'Acepta' : 'No consta') + '</span></div>' +
      '</div>' +
      (hist ? '<div><div class="er-sub">Otras reparaciones</div><div class="er-mini">' + hist + '</div></div>' : '');
  }

  function invoiceDialog() {
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg"><h2>Datos de factura</h2><div class="er-fg" id="er-invf">' +
      '<label class="er-field">NIF / CIF <span class="er-req">*</span><input class="er-input" data-k="nif" maxlength="16"></label>' +
      '<label class="er-field">Razón social<input class="er-input" data-k="company" maxlength="64"></label>' +
      '<label class="er-field">Dirección <span class="er-req">*</span><input class="er-input" data-k="address" maxlength="128"></label>' +
      '<label class="er-field">Código postal <span class="er-req">*</span><input class="er-input" data-k="postcode" inputmode="numeric" maxlength="5"></label>' +
      '<label class="er-field">Ciudad <span class="er-req">*</span><input class="er-input" data-k="city" maxlength="64"></label></div>' +
      '<div class="er-err" id="er-inv-err" hidden></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar</button></div></div>';
    app.appendChild(wrap);
    wrap.querySelector('[data-k]').focus();
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if (!e.target.closest('[data-ok]')) return;
      var body = { id_customer: r.id_customer };
      wrap.querySelectorAll('[data-k]').forEach(function (i) { body[i.getAttribute('data-k')] = i.value.trim(); });
      E.api('addInvoiceAddress', { id_ecorepair: r.id }, body).then(function (res) {
        if (!res.ok) {
          wrap.querySelectorAll('[data-k]').forEach(function (i) { i.classList.toggle('er-invalid', !!(res.errors && res.errors[i.getAttribute('data-k')])); });
          var er = wrap.querySelector('#er-inv-err');
          er.textContent = Object.keys(res.errors || {}).map(function (k) { return res.errors[k]; }).join(' ') || res.error;
          er.hidden = false;
          return;
        }
        c = res.customer;
        wrap.remove();
        renderCustomer();
        E.toast('Datos de factura guardados');
      });
    });
  }
  $('#er-p-cust').addEventListener('click', function (e) {
    if (e.target.closest('#er-inv')) invoiceDialog();
    if (e.target.closest('#er-cust-edit')) E.customerDialog(c, { id_ecorepair: r.id }).then(function (res) {
      if (!res) return;
      c = res.customer; r.customer_name = c.name;
      renderCustomer();
      if (res.log) { log = res.log; renderLog(); renderHead(); }
      E.toast('Datos del cliente guardados');
    });
  });

  /* ---------- Equipo y avería ---------- */
  function renderDevice() {
    $('#er-p-dev').innerHTML = '<h3>' + icon(r.category_icon || 'device') + 'Equipo y avería<span class="er-saved">Guardado</span>' +
      (canEdit ? '<button type="button" class="er-btn er-btn-sm er-r" id="er-dev-edit" style="margin-left:auto">Cambiar equipo</button>' : '') + '</h3>' +
      (D.modelUrl ? '<div class="er-kbbar"><label class="er-search er-find" style="margin:0;flex:1">' + icon('code', true) + '<input class="er-input" id="er-errcode" placeholder="Código de error (ej. 21)" autocomplete="off"></label>' +
        '<button type="button" class="er-kbbtn" id="er-kbbtn"><span class="er-kbbtn-i">' + icon('book', true) + '</span><span>Códigos y manual</span>' +
        (D.kbCount && (D.kbCount.codes + D.kbCount.params + D.kbCount.faults) ? '<b>' + (D.kbCount.codes + D.kbCount.params + D.kbCount.faults) + '</b>' : '') + '</button></div><div id="er-errres"></div>' : '') +
      '<div class="er-kv"><div><span class="er-k">Categoría</span><span class="er-v">' + esc(r.category_name || '—') + '</span></div>' +
        '<div><span class="er-k">Equipo</span><span class="er-v">' + esc(r.device_name) + '</span></div>' +
        '<div><span class="er-k">Entrada</span><span class="er-v er-num">' + esc(E.fmtDateTime(r.date_add)) + '</span></div></div>' +
      '<div class="er-fg">' +
        '<label class="er-field">Nº de serie<input class="er-input" data-f="serial" maxlength="64" value="' + esc(r.serial) + '"' + dis + '></label>' +
        '<label class="er-field">Kilómetros<input class="er-input" data-f="km" inputmode="numeric" maxlength="9" value="' + esc(r.km) + '"' + dis + '></label>' +
        '<label class="er-field">Color<input class="er-input" data-f="color" maxlength="64" value="' + esc(r.color) + '"' + dis + '></label>' +
      '</div>' +
      ((r.faults || []).length ? '<div><div class="er-sub">Averías marcadas</div><div class="er-row">' + r.faults.map(function (f) { return '<span class="er-tag er-t-neu">' + esc(f) + '</span>'; }).join('') + '</div></div>' : '') +
      '<div><div class="er-sub">Entregado con el equipo</div><div id="er-acc"></div></div>' +
      '<div><div class="er-sub">Daños previos</div><div id="er-dmg"></div></div>' +
      '<label class="er-field">Avería que indica el cliente<textarea class="er-input" data-voice-list data-f="fault_customer" maxlength="5000"' + dis + '>' + esc(r.fault_customer) + '</textarea></label>' +
      '<label class="er-field">Diagnóstico del técnico<textarea class="er-input" data-voice-list data-f="diagnosis" maxlength="5000" placeholder="Qué le pasa y qué hay que hacer"' + dis + '>' + esc(r.diagnosis) + '</textarea></label>';
    if (canEdit) {
      E.ChipSet($('#er-acc'), { options: D.accessories, selected: r.accessories, allowOther: true, list: 'accessories', canManage: true, onChange: function (v) { save('accessories', v, $('#er-acc')); } });
      E.ChipSet($('#er-dmg'), { options: D.damages, selected: r.damages, warn: true, allowOther: true, list: 'damages', canManage: true, onChange: function (v) { save('damages', v, $('#er-dmg')); } });
    } else {
      $('#er-acc').innerHTML = (r.accessories || []).map(function (a) { return '<span class="er-tag er-t-ok">' + esc(a) + '</span> '; }).join('') || '<span class="er-muted">Nada</span>';
      $('#er-dmg').innerHTML = (r.damages || []).map(function (a) { return '<span class="er-tag er-t-warn">' + esc(a) + '</span> '; }).join('') || '<span class="er-muted">Ninguno</span>';
    }
  }
  var kbCache = null, kbTimer;
  $('#er-p-dev').addEventListener('input', function (e) {
    if (e.target.id !== 'er-errcode') return;
    var q = e.target.value.trim().toUpperCase().replace(/^E[-\s]?/, ''), box = $('#er-errres');
    clearTimeout(kbTimer);
    if (!q) { box.innerHTML = ''; return; }
    kbTimer = setTimeout(function () {
      var go = kbCache ? Promise.resolve(kbCache) : E.api('kbLookup', { id_brand: r.id_brand, id_model: r.id_model }).then(function (res) { kbCache = res.kb; return kbCache; });
      go.then(function (kb) {
        var list = (kb.codes || []).filter(function (c) { return c.code.toUpperCase().replace(/^E[-\s]?/, '').indexOf(q) === 0; }).slice(0, 3);
        box.innerHTML = list.length ? list.map(function (c) {
          return '<div class="er-errhit"><span class="er-code-n">' + esc(c.code) + '</span><div><b>' + esc(c.title) + '</b>' + (c.causes ? '<div class="er-small">' + esc(c.causes) + '</div>' : '') +
            (c.parts ? '<div class="er-small er-muted">Piezas: ' + esc(c.parts) + '</div>' : '') + (!c.verified ? '<div class="er-small er-muted">Por revisar</div>' : '') + '</div></div>';
        }).join('') : '<div class="er-muted er-small" style="padding:6px 2px">No hay código «' + esc(q) + '» para este modelo. <a href="' + esc(D.modelUrl + '&from=' + r.id + '&code=' + encodeURIComponent(q)) + '">Añadirlo</a></div>';
      });
    }, 250);
  });
  $('#er-p-dev').addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f');
    if (f && r[f] !== e.target.value.trim()) save(f, e.target.value.trim(), e.target);
  });
  /* Ventana de códigos de error, manual y soluciones del modelo (sin salir de la reparación) */
  function kbDialog() {
    var tab = 'codes', q = '';
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg er-kbd"><div class="er-kbd-h">' + icon('book', true) + '<b>' + esc(r.device_name) + '</b>' +
      '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-x aria-label="Cerrar">' + icon('x') + '</button></div><div id="er-kbd-b"><div class="er-empty" style="margin:16px">Cargando…</div></div></div>';
    app.appendChild(wrap);
    var load = kbCache ? Promise.resolve(kbCache) : E.api('kbLookup', { id_brand: r.id_brand, id_model: r.id_model }).then(function (res) { kbCache = res.kb || { codes: [], params: [], menu: [], faults: [] }; return kbCache; });
    function item(head, body) { return '<details class="er-kb-item"><summary>' + head + '</summary>' + body + '</details>'; }
    function draw(kb) {
      var n = { codes: kb.codes.length, manual: kb.menu.length + kb.params.length, faults: kb.faults.length };
      // Solo salen las pestañas que tienen algo
      var tabs = [['codes', 'Códigos de error'], ['manual', 'Manual y menú'], ['faults', 'Soluciones']].filter(function (t) { return n[t[0]] > 0; });
      if (!tabs.length) {
        wrap.querySelector('#er-kbd-b').innerHTML = '<div class="er-kbd-list"><div class="er-empty">Este modelo todavía no tiene códigos, manual ni soluciones apuntados.</div></div>' +
          '<div class="er-kbd-f"><a href="' + esc(D.modelUrl + '&from=' + r.id + '&tab=codes') + '">' + icon('pen', true) + 'Añadir en la ficha del modelo</a></div>';
        return;
      }
      if (!n[tab]) tab = tabs[0][0];
      var html = '<div class="er-seg2" style="margin:12px 14px">' + tabs.map(function (t) {
        return '<button type="button" data-kt="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + ' <b>' + n[t[0]] + '</b></button>';
      }).join('') + '</div><div class="er-kbd-list">';
      if (tab === 'codes') {
        var nq = q.toUpperCase().replace(/^E[-\s]?/, '');
        var list = kb.codes.filter(function (c) { return !nq || c.code.toUpperCase().replace(/^E[-\s]?/, '').indexOf(nq) === 0; });
        html += '<label class="er-search" style="margin-bottom:8px">' + icon('search') + '<input class="er-input" id="er-kbd-q" placeholder="Código que sale en la pantalla" value="' + esc(q) + '" data-novoice></label>' +
          (list.length ? list.map(function (c) {
            return item('<span class="er-code-n">' + esc(c.code) + '</span><b>' + esc(c.title) + '</b>', (c.causes ? '<div class="er-kb-body">' + esc(c.causes) + '</div>' : '') + (c.parts ? '<div class="er-small"><b>Piezas:</b> ' + esc(c.parts) + '</div>' : ''));
          }).join('') : '<div class="er-empty">' + (kb.codes.length ? 'No hay ningún código «' + esc(q) + '».' : 'Este modelo no tiene códigos de error apuntados.') + '</div>');
      } else if (tab === 'manual') {
        html += (kb.menu.length ? kb.menu.map(function (m) { return '<details class="er-kb-item" open><summary><b>' + esc(m.title) + '</b></summary><div class="er-kb-body">' + esc(m.body) + '</div></details>'; }).join('') : '') +
          (kb.params.length ? '<div class="er-ptable"><div class="er-ptr er-pth"><span>Parámetro</span><span>Para qué sirve</span><span>De fábrica</span><span></span></div>' + kb.params.map(function (p) {
            return '<div class="er-ptr"><b class="er-num">' + esc(p.code) + '</b><span>' + esc(p.name) + '</span><span class="er-num">' + esc(p.default_value || '—') + '</span><span></span></div>';
          }).join('') + '</div>' : '') +
          (!kb.menu.length && !kb.params.length ? '<div class="er-empty">Este modelo no tiene manual ni parámetros apuntados.</div>' : '');
      } else {
        html += kb.faults.length ? kb.faults.map(function (f) { return item('<b>' + esc(f.title) + '</b>', '<div class="er-kb-body">' + esc(f.body) + '</div>'); }).join('') : '<div class="er-empty">Sin soluciones apuntadas para este modelo.</div>';
      }
      html += '</div><div class="er-kbd-f"><a href="' + esc(D.modelUrl + '&from=' + r.id + '&tab=' + (tab === 'manual' ? 'params' : tab)) + '">' + icon('pen', true) + 'Añadir o cambiar en la ficha del modelo</a></div>';
      wrap.querySelector('#er-kbd-b').innerHTML = html;
      var qi = wrap.querySelector('#er-kbd-q');
      if (qi && q) { qi.focus(); qi.setSelectionRange(q.length, q.length); }
    }
    load.then(function (kb) {
      if (!kb.codes.length && (kb.menu.length || kb.params.length)) tab = 'manual';
      draw(kb);
    });
    wrap.addEventListener('click', function (e) {
      var t;
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if ((t = e.target.closest('[data-kt]'))) { tab = t.getAttribute('data-kt'); load.then(draw); }
    });
    wrap.addEventListener('input', function (e) { if (e.target.id === 'er-kbd-q') { q = e.target.value; load.then(draw); } });
  }

  $('#er-p-dev').addEventListener('click', function (e) {
    if (e.target.closest('#er-kbbtn')) { kbDialog(); return; }
    if (!e.target.closest('#er-dev-edit')) return;
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg" style="max-width:720px"><h2>Cambiar equipo</h2><div id="er-dp" class="er-stack" style="gap:14px"></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar</button></div></div>';
    app.appendChild(wrap);
    var dp = E.DevicePicker(wrap.querySelector('#er-dp'), { catalog: D.catalog, canAdd: true, canManage: true, value: { cat: r.id_category, brand: r.id_brand, model: r.id_model } });
    wrap.addEventListener('click', function (ev) {
      if (ev.target === wrap || ev.target.closest('[data-x]')) { wrap.remove(); return; }
      if (!ev.target.closest('[data-ok]')) return;
      var v = dp.get();
      if (!v.id_category) { E.toast('Elige la categoría.', true); return; }
      E.api('updateDevice', { id_ecorepair: r.id }, { id_category: v.id_category, id_brand: v.id_brand, id_model: v.id_model }).then(function (res) {
        if (!res.ok) { E.toast(res.error, true); return; }
        r = res.repair; log = res.log;
        wrap.remove();
        renderDevice(); renderLog();
        E.toast('Equipo actualizado');
      });
    });
  });

  /* ---------- Fotos ---------- */
  function renderPhotos() {
    var src = coverSrc();
    $('#er-p-photos').innerHTML = '<h3>' + icon('camera') + 'Fotos<span class="er-r">' + photos.length + ' de entrada</span></h3>' +
      '<div class="er-devph">' +
        '<button type="button" class="er-devph-img" data-view="0" aria-label="Ver en grande">' + (src ? '<img src="' + esc(src) + '" alt="">' : icon(r.category_icon || 'device')) + '</button>' +
        '<div class="er-stack" style="gap:8px;min-width:0">' +
          '<div><b>Foto del equipo</b><div class="er-muted er-small">' + (devicePhoto ? 'Foto de este equipo. Sale en el tablero.' : modelImage ? 'Foto del modelo del catálogo. Haz una foto para usar la de este equipo.' : 'Sin foto: haz una al equipo o añade la del modelo en Ajustes.') + '</div></div>' +
          (canEdit ? '<div class="er-row"><button type="button" class="er-btn er-btn-sm" id="er-dev-shot">' + icon('camera', true) + (devicePhoto ? 'Repetir foto' : 'Hacer foto de este equipo') + '</button>' +
            (devicePhoto ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost" id="er-dev-reset">Volver a la del modelo</button>' : '') +
            (devicePhoto && r.id_model ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost" id="er-dev-model">' + icon('layers', true) + 'Usar como foto del modelo</button>' : '') + '</div>' : '') +
        '</div>' +
        '<input type="file" id="er-dev-file" accept="image/*" hidden>' +
      '</div>' +
      '<div class="er-sub" style="margin:4px 0 0">Fotos de entrada (estado y daños)</div>' +
      '<div class="er-photos" id="er-ph">' + photos.map(function (p) {
        return '<div class="er-ph"><a href="' + esc(p.full) + '" data-ph="' + p.id + '"><img src="' + esc(p.thumb) + '" alt="Foto de la reparación" loading="lazy"></a>' +
          (D.canDelete ? '<button type="button" class="er-del" data-del="' + p.id + '" aria-label="Borrar foto">' + icon('trash', true) + '</button>' : '') +
          (canEdit ? '<button type="button" class="er-pub' + (p.public ? ' on' : '') + '" data-pub="' + p.id + '" title="' + (p.public ? 'El cliente la ve en el seguimiento' : 'Mostrar al cliente en el seguimiento') + '">' + icon('eye', true) + '</button>' : (p.public ? '<span class="er-pub on">' + icon('eye', true) + '</span>' : '')) + '</div>';
      }).join('') +
      (canEdit ? '<button type="button" class="er-ph er-add" id="er-ph-add">' + icon('camera') + 'Hacer foto</button>' +
        '<button type="button" class="er-ph er-add" id="er-ph-gal">' + icon('plus') + 'Desde galería o archivo</button>' : '') +
      (!photos.length && !canEdit ? '<div class="er-muted">Sin fotos</div>' : '') + '</div>' +
      '<input type="file" id="er-file" accept="image/*" multiple hidden>';
  }
  $('#er-p-photos').addEventListener('click', function (e) {
    var t;
    if (e.target.closest('#er-ph-add')) { E.pickPhoto($('#er-file'), false); return; }
    if (e.target.closest('#er-ph-gal')) { E.pickPhoto($('#er-file'), true); return; }
    if ((t = e.target.closest('[data-ph]'))) {
      e.preventDefault();
      var idx = 0, list = allPhotos(), id = t.getAttribute('data-ph');
      photos.forEach(function (p, k) { if (String(p.id) === id) idx = k + (coverSrc() ? 1 : 0); });
      E.viewer(list, idx);
      return;
    }
    if (e.target.closest('[data-view]')) { if (coverSrc()) E.viewer(allPhotos(), 0); else if (canEdit) E.pickPhoto($('#er-dev-file'), false); return; }
    if (e.target.closest('#er-dev-shot')) { E.pickPhoto($('#er-dev-file'), false); return; }
    var pub = e.target.closest('[data-pub]');
    if (pub) {
      var ph = photos.filter(function (x) { return String(x.id) === pub.getAttribute('data-pub'); })[0];
      E.api('photoPublic', { id_photo: ph.id }, { public: ph.public ? 0 : 1 }).then(function (res) {
        if (!res.ok) { E.toast(res.error, true); return; }
        ph.public = res.public; log = res.log; renderPhotos(); renderLog(); renderHead();
        E.toast(ph.public ? 'El cliente verá esta foto en el seguimiento' : 'Foto oculta al cliente');
      });
      return;
    }
    if (e.target.closest('#er-dev-reset')) {
      E.api('deviceReset', { id_ecorepair: r.id }, {}).then(function (res) {
        if (!res.ok) { E.toast(res.error, true); return; }
        devicePhoto = null; log = res.log; renderPhotos(); renderHead(); renderLog();
      });
      return;
    }
    if (e.target.closest('#er-dev-model')) {
      E.dialog({ title: 'Usar como foto del modelo', text: 'Todas las reparaciones de ' + r.device_name + ' sin foto propia mostrarán esta foto.', ok: 'Usar esta foto' }).then(function (yes) {
        if (yes) useAsModel();
      });
      return;
    }
    var d = e.target.closest('[data-del]');
    if (!d) return;
    E.dialog({ title: 'Borrar foto', text: 'La foto se borrará definitivamente.', ok: 'Borrar', danger: true }).then(function (yes) {
      if (!yes) return;
      E.api('deletePhoto', { id_photo: d.getAttribute('data-del') }, {}).then(function (res) {
        if (!res.ok) { E.toast(res.error, true); return; }
        photos = photos.filter(function (p) { return String(p.id) !== d.getAttribute('data-del'); });
        log = res.log; renderPhotos(); renderLog();
      });
    });
  });
  $('#er-p-photos').addEventListener('change', function (e) {
    if (e.target.id === 'er-dev-file' && e.target.files.length) {
      var f = e.target.files[0];
      e.target.value = '';
      E.toast('Subiendo foto del equipo…');
      E.shrinkImage(f, 1600).then(function (small) {
        var fd = new FormData();
        fd.append('photo', small, small.name || 'foto.jpg');
        E.api('devicePhoto', { id_ecorepair: r.id }, fd).then(function (res) {
          if (!res.ok) { E.toast(res.error, true); return; }
          devicePhoto = res.devicePhoto; log = res.log;
          renderPhotos(); renderHead(); renderLog();
          if (!res.modelHasImage && r.id_model) {
            E.dialog({ title: 'El modelo no tiene foto', text: '¿Usar esta foto también como foto de ' + r.device_name + ' para las próximas reparaciones?', ok: 'Sí, usarla' }).then(function (yes) {
              if (yes) useAsModel();
            });
          } else E.toast('Foto del equipo guardada');
        });
      });
      return;
    }
    if (e.target.id !== 'er-file') return;
    var files = Array.prototype.slice.call(e.target.files);
    e.target.value = '';
    var chain = Promise.resolve();
    files.forEach(function (f, i) {
      chain = chain.then(function () {
        var tile = document.createElement('div');
        tile.className = 'er-ph er-uploading';
        tile.innerHTML = '<img alt="" src="' + URL.createObjectURL(f) + '"><div class="er-bar-up" style="width:0"></div>';
        $('#er-ph').insertBefore(tile, $('#er-ph-add'));
        return E.shrinkImage(f, 1600).then(function (small) {
          var fd = new FormData();
          fd.append('photo', small, small.name || 'foto.jpg');
          return E.api('uploadPhoto', { id_ecorepair: r.id }, fd, function (p) {
            tile.querySelector('.er-bar-up').style.width = Math.round(p * 100) + '%';
          }).then(function (res) {
            if (!res.ok) { E.toast('Foto ' + (i + 1) + ': ' + res.error, true); tile.remove(); return; }
            photos.push(res.photo);
            log = res.log;
          });
        });
      });
    });
    chain.then(function () { renderPhotos(); renderLog(); });
  });

  E.dropZone($('#er-p-photos'), function () { return $('#er-file'); });

  function useAsModel() {
    E.api('deviceToModel', { id_ecorepair: r.id }, {}).then(function (res) {
      if (!res.ok) { E.toast(res.error, true); return; }
      modelImage = res.modelImage; log = res.log; renderLog(); renderHead();
      E.toast('Guardada como foto del modelo');
    });
  }

  /* ---------- Historial ---------- */
  var LOGCOL = { note: '#5B6170', create: '#8B93A3', photo: '#B7BDC8', field: '#B7BDC8', customer: '#0A4F7A', quote: '#D2601A', payment: '#0B6E4B' };
  function logColor(l) {
    var color = LOGCOL[l.action] || '#B7BDC8';
    if (l.action === 'status') {
      var to = String(l.detail).split('→').pop().split('·')[0].trim();
      Object.keys(D.statuses).forEach(function (k) { if (D.statuses[k].name === to) color = D.statuses[k].color; });
    }
    return color;
  }
  function timeline(list) {
    return '<ul class="er-timeline">' + list.map(function (l) {
      var text = l.action === 'note' ? '<div class="er-note">' + esc(l.detail) + '</div>' : esc(l.action === 'status' ? 'Estado: ' + l.detail : l.detail);
      return '<li><span class="er-tdot" style="background:' + esc(logColor(l)) + '"></span><div>' + text +
        '<div class="er-when er-num">' + esc(E.fmtDateTime(l.date)) + ' · ' + esc(l.employee || 'Cliente / sistema') + '</div></div></li>';
    }).join('') + '</ul>';
  }
  /** Bloque de notas internas (el historial completo va en el botón de arriba). */
  function renderLog() {
    var notes = log.filter(function (l) { return l.action === 'note'; });
    $('#er-p-log').innerHTML = '<h3>' + icon('pen') + 'Notas internas<span class="er-r">' + notes.length + '</span></h3>' +
      (D.canEdit ? '<div class="er-row" style="flex-wrap:nowrap"><input class="er-input" id="er-note" data-voice maxlength="2000" placeholder="Escribe una nota interna para el equipo" aria-label="Nota interna"><button type="button" class="er-btn" id="er-note-add">Añadir</button></div>' : '') +
      (notes.length ? timeline(notes) : '<p class="er-muted" style="margin:0">Sin notas.</p>');
    var hn = $('#er-hist-n'); if (hn) hn.textContent = log.length;
  }

  var HFILTERS = [['all', 'Todo'], ['status', 'Estados'], ['quote', 'Presupuestos'], ['payment', 'Cobros'], ['note', 'Notas'], ['field', 'Cambios'], ['photo', 'Fotos']];
  function historyDialog() {
    var wrap = document.createElement('div'), f = 'all';
    wrap.className = 'er-modal er-drawer';
    function body() {
      var list = log.filter(function (l) { return f === 'all' || l.action === f || (f === 'field' && (l.action === 'customer' || l.action === 'create')); });
      return '<div class="er-dlg"><div class="er-row"><h2 style="margin-right:auto">' + icon('clock') + ' Historial de ' + esc(r.reference) + '</h2>' +
        '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-x aria-label="Cerrar">' + icon('x') + '</button></div>' +
        '<div class="er-filters" style="margin:0">' + HFILTERS.map(function (h) {
          var n = h[0] === 'all' ? log.length : log.filter(function (l) { return l.action === h[0] || (h[0] === 'field' && (l.action === 'customer' || l.action === 'create')); }).length;
          return '<button type="button" class="er-chip er-btn-sm" data-hf="' + h[0] + '" aria-pressed="' + (f === h[0]) + '">' + h[1] + ' <span class="er-n">' + n + '</span></button>';
        }).join('') + '</div>' +
        (list.length ? timeline(list) : '<div class="er-empty">Nada en este apartado.</div>') + '</div>';
    }
    wrap.innerHTML = body();
    app.appendChild(wrap);
    function onKey(e) { if (e.key === 'Escape') close(); }
    function close() { document.removeEventListener('keydown', onKey); wrap.classList.add('er-out'); setTimeout(function () { wrap.remove(); }, 180); }
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', function (e) {
      var b;
      if (e.target === wrap || e.target.closest('[data-x]')) { close(); return; }
      if ((b = e.target.closest('[data-hf]'))) { f = b.getAttribute('data-hf'); wrap.innerHTML = body(); }
    });
  }
  $('#er-hist').addEventListener('click', historyDialog);
  function openWa() {
    E.notify({ id_ecorepair: r.id }).then(function (res) { if (res && res.log) { log = res.log; renderLog(); renderHead(); } });
  }
  if ($('#er-wa')) $('#er-wa').addEventListener('click', openWa);
  app.addEventListener('click', function (e) {
    if (e.target.closest('[data-wa]')) openWa();
    var ro = e.target.closest('#er-reopen');
    if (ro) {
      E.dialog({ title: 'Reabrir la reparación', text: D.warrantyUntil && D.warrantyUntil >= new Date().toISOString().slice(0, 10)
        ? 'Está en garantía hasta el ' + E.fmtDate(D.warrantyUntil) + '. Se crea una reparación nueva en garantía enlazada a esta.'
        : 'La garantía ya terminó. Se crea una reparación nueva (sin garantía) enlazada a esta.', input: true, multiline: true, inputLabel: '¿Qué le pasa ahora?', required: true, ok: 'Reabrir' }).then(function (reason) {
        if (!reason) return;
        E.api('reopen', { id_ecorepair: r.id }, { reason: reason }).then(function (res) {
          if (!res.ok) { E.toast(res.error, true); return; }
          window.location.href = res.url + '&created=1';
        });
      });
    }
  });
  $('#er-p-log').addEventListener('click', function (e) {
    if (!e.target.closest('#er-note-add')) return;
    addNote();
  });
  $('#er-p-log').addEventListener('keydown', function (e) {
    if (e.target.id === 'er-note' && e.key === 'Enter') { e.preventDefault(); addNote(); }
  });
  function addNote() {
    var inp = $('#er-note'), v = inp.value.trim();
    if (!v) { inp.focus(); return; }
    E.api('addNote', { id_ecorepair: r.id }, { note: v }).then(function (res) {
      if (!res.ok) { E.toast(res.error, true); return; }
      log = res.log; renderLog();
      E.toast('Nota añadida');
    });
  }

  /* ---------- Piezas de este modelo ---------- */
  var partsTab = 'parts';
  function afterQuote(res, msg) {
    if (!res.ok) { E.toast(res.error, true); return; }
    D.quotes = res.quotes; log = res.log; renderQuote(); renderLog(); renderHead();
    E.toast(msg);
  }
  var partsOpen = false;
  function renderParts() {
    var box = $('#er-p-parts');
    if (!box) return;
    var nParts = (D.modelParts || []).length, nFix = (D.fixed || []).length, sz = D.suggestedZones || [];
    box.classList.toggle('er-open', partsOpen);
    box.innerHTML = '<div class="er-fold">' +
      '<span class="er-fold-ico">' + icon('box') + '</span>' +
      '<div class="er-fold-t"><b>Piezas de ' + esc(r.device_name) + '</b><div class="er-fold-meta">' +
        '<span>' + nParts + ' pieza' + (nParts === 1 ? '' : 's') + '</span>' +
        (nFix ? '<span>' + nFix + ' precio' + (nFix === 1 ? '' : 's') + ' cerrado' + (nFix === 1 ? '' : 's') + '</span>' : '') +
        (sz.length ? '<span class="er-fm-sug">Avería: ' + esc(sz.slice(0, 2).map(function (z) { return D.zones[z]; }).join(', ')) + '</span>' : '') +
        (r.id_model ? '<button type="button" class="er-fm-bat" data-batt>' + icon('battery', true) + (E.batterySummary(D.battery) ? 'Batería: ' + esc(E.batterySummary(D.battery)) : 'Batería: sin datos') + '</button>' : '') +
        (D.modelUrl ? '<a href="' + esc(D.modelUrl + '&tab=parts&from=' + r.id) + '">Ficha del modelo</a>' : '') +
      '</div></div>' +
      E.unlockButton(D.unlock, 'data-unl') +
      '<button type="button" class="er-fold-btn" data-fold aria-expanded="' + partsOpen + '"><span>' + (partsOpen ? 'Ocultar piezas' : 'Ver piezas del modelo') + '</span><span class="er-fold-chev">' + icon('back', true) + '</span></button>' +
      E.incompatButton(D.incompat, canEdit) +
      '</div>' +
      (partsOpen ? '<div class="er-fold-body"><div class="er-seg2">' + [['parts', 'Piezas', nParts], ['fixed', 'Precio cerrado', nFix]].map(function (t) {
          return '<button type="button" data-ptab="' + t[0] + '" aria-pressed="' + (partsTab === t[0]) + '">' + t[1] + ' <b>' + t[2] + '</b></button>';
        }).join('') + (partsTab === 'unlock' ? '<button type="button" aria-pressed="true">' + icon('bolt', true) + ' Deslimitar</button>' : '') +
        '</div>' + (partsTab === 'parts' && D.spcp ? E.spcpBar(D.spcp, canEdit) : '') + '<div id="er-dwr"></div></div>' : '');
    if (!partsOpen) return;
    var host = box.querySelector('#er-dwr');
    if (partsTab !== 'parts') host.classList.add('er-plain');
    if (partsTab === 'fixed') {
      E.FixedPanel(host, { list: D.fixed || [], onAdd: canEdit ? function (f, btn) {
        btn.disabled = true;
        E.api('fixedAdd', { id_ecorepair: r.id }, { id: f.id }).then(function (res) { btn.disabled = false; afterQuote(res, '«' + f.name + '» añadido al presupuesto por ' + E.fmtMoney(f.price)); });
      } : null });
      return;
    }
    if (partsTab === 'unlock') {
      var up = E.UnlockPanel(host, { list: D.unlock || [], admin: !!D.isAdmin,
        onEdit: canEdit && r.id_brand ? function (u) {
          E.unlockDialog(u, { title: r.device_name, methods: D.unlockMethods || {}, admin: !!D.isAdmin, canBrand: !!r.id_model, onSave: function (d, allBrand) {
            return E.api('unlockSave', {}, { id: u ? u.id : 0, id_brand: r.id_brand, id_model: u ? (u.scope === 'brand' ? 0 : r.id_model) : (allBrand ? 0 : r.id_model), view_model: r.id_model, data: JSON.stringify(d) }).then(function (res) {
              if (res.ok) { D.unlock = res.unlock; renderParts(); }
              return res;
            });
          } });
        } : null,
        onDelete: canEdit && D.canDelete ? function (id) {
          E.api('unlockDelete', {}, { id: id, id_brand: r.id_brand, view_model: r.id_model }).then(function (res) { D.unlock = res.unlock || []; renderParts(); });
        } : null,
        onAdd: canEdit ? function (u, btn) {
        btn.disabled = true;
        E.api('unlockAdd', { id_ecorepair: r.id }, { id: u.id }).then(function (res) { btn.disabled = false; afterQuote(res, 'Deslimitación añadida al presupuesto con el aviso legal'); });
      } : null });
      return;
    }
    var dg = E.PartsDiagram(host, { published: D.spcp ? D.spcp.published : null, parts: D.modelParts || [], zones: D.zones, sections: D.sections, map: D.modelMap, photo: D.modelPhoto, zonesUrl: D.modelUrl && r.id_model ? D.modelUrl + '&tab=parts&from=' + r.id : '', suggested: D.suggestedZones || [], admin: !!D.isAdmin,
      incompat: D.incompat || [],
      onIncompat: canEdit ? function () {
        E.incompatDialog({ title: r.device_name, canBrand: !!r.id_model, onSave: function (d) {
          return E.api('incompatSave', {}, { id_brand: r.id_brand, id_model: d.all_brand ? 0 : r.id_model, view_model: r.id_model, id_ecorepair: r.id, data: JSON.stringify(d) }).then(function (res) {
            if (res.ok) { D.incompat = res.incompat; dg.setIncompat(res.incompat); }
            return res;
          });
        } });
      } : null,
      onIncompatDelete: D.canDelete && canEdit ? function (id) {
        E.api('incompatDelete', {}, { id: id, id_brand: r.id_brand, id_model: r.id_model }).then(function (res) { D.incompat = res.incompat || []; dg.setIncompat(D.incompat); });
      } : null,
      onAdd: canEdit ? function (p, btn) {
        var w = (D.incompat || []).filter(function (x) { return x.id_product === p.id_product && (!x.id_product_attribute || x.id_product_attribute === p.id_product_attribute); })[0];
        E.confirmIncompat(p.product.name, w, r.device_name).then(function (go) {
        if (!go) return;
        btn.disabled = true;
        E.api('quoteAddParts', { id_ecorepair: r.id }, { lines: JSON.stringify([{ id_product: p.id_product, id_product_attribute: p.id_product_attribute, name: p.product.name,
          reference: p.product.reference, qty: 1, price: p.product.price, tax_rate: p.product.tax_rate }]) }).then(function (res) {
          btn.disabled = false;
          if (!res.ok) { E.toast(res.error, true); return; }
          D.quotes = res.quotes; log = res.log; renderQuote(); renderLog(); renderHead();
          E.toast('«' + p.product.name + '» añadido al presupuesto (borrador)');
          if (p.product.stock <= 0) E.toast('Ojo: no hay stock en la tienda. Ábrelo en el presupuesto para encargarla.', true);
        });
        });
      } : null,
      onEdit: canEdit ? function (p, zone) {
        E.partDialog(p, zone, { zones: D.zones, sections: D.sections, admin: !!D.isAdmin, canDelete: !!D.canDelete, id_brand: r.id_brand, id_model: r.id_model, title: r.device_name,
          onSaved: function (list) { D.modelParts = list; renderParts(); } });
      } : null });
  }

  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-ptab]');
    if (t) { partsTab = t.getAttribute('data-ptab'); renderParts(); return; }
    if (e.target.closest('[data-fold]')) { partsOpen = !partsOpen; if (!partsOpen && partsTab === 'unlock') partsTab = 'parts'; renderParts(); return; }
    if (e.target.closest('[data-bell]')) { openBell(); return; }
    if (e.target.closest('[data-batt]')) { openBattery(); return; }
    if (e.target.closest('[data-spcppub]')) { E.spcpDialog({ title: r.device_name, id_model: r.id_model, spcp: D.spcp, parts: D.modelParts || [], zones: D.zones, onDone: function (b) { D.spcp = b; renderParts(); } }); return; }
    if (e.target.closest('[data-spcplink]')) { E.spcpLinkDialog({ title: r.device_name, id_model: r.id_model, spcp: D.spcp, onDone: function (b) { D.spcp = b; renderParts(); } }); return; }
    if (e.target.closest('[data-unl]')) { partsOpen = true; partsTab = 'unlock'; renderParts(); var b = $('#er-p-parts'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });

  function openBattery() {
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg" style="max-width:640px"><div class="er-row" style="flex-wrap:nowrap"><h2 style="margin-right:auto">' + icon('battery') + ' Batería · ' + esc(r.device_name) + '</h2>' +
      '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-x aria-label="Cerrar">' + icon('x') + '</button></div><div id="er-batd"></div></div>';
    app.appendChild(wrap);
    wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); renderParts(); } });
    E.BatteryPanel(wrap.querySelector('#er-batd'), { data: D.battery || {}, canEdit: canEdit, onSave: function (d) {
      return E.api('batterySave', {}, { id_model: r.id_model, data: JSON.stringify(d) }).then(function (res) { if (res.ok) D.battery = res.battery; return res; });
    } });
  }

  function openBell() {
    E.incompatPanel({ title: r.device_name, list: D.incompat || [],
      onAdd: canEdit ? function () {
        E.incompatDialog({ title: r.device_name, canBrand: !!r.id_model, onSave: function (d) {
          return E.api('incompatSave', {}, { id_brand: r.id_brand, id_model: d.all_brand ? 0 : r.id_model, view_model: r.id_model, id_ecorepair: r.id, data: JSON.stringify(d) }).then(function (res) {
            if (res.ok) { D.incompat = res.incompat; renderParts(); }
            return res;
          });
        } });
      } : null,
      onDelete: D.canDelete && canEdit ? function (id) {
        return E.api('incompatDelete', {}, { id: id, id_brand: r.id_brand, id_model: r.id_model }).then(function (res) { D.incompat = res.incompat || []; renderParts(); return D.incompat; });
      } : null });
  }

  /* ---------- Revisión de salida ---------- */
  function renderCheck() {
    var box = $('#er-p-check');
    if (!box) return;
    box.innerHTML = '<h3>' + icon('check') + 'Revisión<span class="er-r">Opcional</span></h3><div id="er-chk"></div>';
    E.Checklist(box.querySelector('#er-chk'), { items: D.checklistItems, done: D.checklist || {}, canEdit: canEdit, onToggle: function (item) {
      return E.api('checkToggle', { id_ecorepair: r.id }, { item: item }).then(function (res) {
        if (!res.ok) { E.toast(res.error, true); return res; }
        D.checklist = res.checklist; if (res.log) { log = res.log; renderLog(); }
        return res;
      });
    } });
  }

  /* ---------- Presupuesto ---------- */
  function renderQuote() {
    var qs = D.quotes || [];
    var cls = { draft: 'er-t-neu', sent: 'er-t-warn', accepted: 'er-t-ok', rejected: 'er-t-bad', superseded: 'er-t-neu' };
    var pri = !qs.length && (r.status === 'diagnosis' || r.status === 'quote');
    $('#er-p-quote').innerHTML = '<h3>' + icon('doc') + 'Presupuesto</h3>' +
      (qs.length ? '<div class="er-mini">' + qs.map(function (q) {
        return '<a href="' + esc(D.quoteUrl) + '"><span class="er-grow">' + esc(q.label) + '</span><span class="er-tag ' + (cls[q.status] || 'er-t-neu') + '">' + esc(q.status_name) + '</span>' +
          '<b class="er-num">' + esc(E.fmtMoney(q.total)) + '</b></a>';
      }).join('') + '</div>' : '<p class="er-muted" style="margin:0">Sin presupuesto.</p>') +
      '<a class="er-btn er-btn-block' + (pri ? ' er-btn-pri' : '') + '" href="' + esc(D.quoteUrl + (!qs.length && canEdit ? '&create=1' : '')) + '">' + icon(qs.length ? 'doc' : 'plus') + (qs.length ? 'Abrir presupuesto' : (canEdit ? 'Crear presupuesto' : 'Ver presupuesto')) + '</a>';
  }

  /* ---------- Cobro ---------- */
  function renderPay() {
    var el = $('#er-p-pay'), rows = '', btns = '';
    var accepted = r.quotes_accepted > 0, cancelled = r.status === 'cancelled';
    (pay.payments || []).forEach(function (p) {
      rows += '<div><span class="er-grow">' + esc(p.type_name + ' · ' + p.method_name) + '<span class="er-muted er-small" style="display:block">' + esc(E.fmtDateTime(p.date) + (p.employee ? ' · ' + p.employee : '')) + '</span></span><b class="er-num">' + esc(E.fmtMoney(p.amount)) + '</b></div>';
    });
    var head;
    if (pay.id_order) {
      head = '<div class="er-banner er-ok" style="margin:0">' + icon('check') + '<div><b>Cobrada.</b> Pedido de PrestaShop creado con su factura.</div></div>' +
        '<div class="er-row"><a class="er-btn er-btn-sm" href="' + esc(pay.invoiceUrl) + '" target="_blank" rel="noopener">' + icon('doc', true) + 'Factura PDF</a>' +
        '<a class="er-btn er-btn-sm er-btn-ghost" href="' + esc(pay.orderUrl) + '" target="_blank" rel="noopener">Ver pedido</a></div>';
    } else if (!accepted && !cancelled) {
      head = '<p class="er-muted" style="margin:0">' + (r.warranty ? 'En garantía y sin presupuesto: se entrega sin cargo.' : 'Se podrá cobrar cuando el cliente acepte el presupuesto.') + '</p>';
    } else {
      head = '<div class="er-qt"><span class="er-muted">Total aceptado</span><b class="er-num">' + esc(E.fmtMoney(pay.due)) + '</b></div>' +
        (pay.paid > 0 ? '<div class="er-qt"><span class="er-muted">Ya pagado</span><b class="er-num">' + esc(E.fmtMoney(pay.paid)) + '</b></div>' : '') +
        '<div class="er-qt er-qt-big"><span>Pendiente</span><span class="er-num">' + esc(E.fmtMoney(cancelled && !accepted ? 0 : pay.pending)) + '</span></div>';
    }
    if (canEdit && !pay.id_order) {
      if (cancelled) btns += '<button type="button" class="er-btn er-btn-lg" data-pay="diagnosis">' + icon('doc') + 'Cobrar diagnóstico</button>';
      else if (accepted) {
        btns += '<button type="button" class="er-btn er-btn-pri er-btn-lg" data-pay="checkout">' + icon('check') + 'Cobrar ' + esc(E.fmtMoney(pay.pending)) + '</button>';
        if (pay.pending > 0) btns += '<button type="button" class="er-btn er-btn-lg" data-pay="deposit">Cobrar señal</button>';
      }
    }
    el.innerHTML = '<h3>' + icon('tag') + 'Cobro</h3>' + head + (rows ? '<div class="er-mini">' + rows + '</div>' : '') + (btns ? '<div class="er-move">' + btns + '</div>' : '');
  }
  $('#er-p-pay').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pay]');
    if (!b) return;
    var k = b.getAttribute('data-pay');
    if (k === 'checkout') checkoutDialog(r.status === 'ready');
    if (k === 'deposit') depositDialog();
    if (k === 'diagnosis') checkoutDialog(false, true);
  });

  function methodTiles() {
    return '<div class="er-paym">' + Object.keys(D.methods).map(function (k, i) {
      return '<button type="button" class="er-tile" data-m="' + k + '" aria-pressed="' + (i === 0) + '">' + icon(k === 'cash' ? 'tag' : k === 'card' ? 'layers' : 'send') + esc(D.methods[k].replace('Taller · ', '')) + '</button>';
    }).join('') + '</div>';
  }
  function bindTiles(wrap, onPick) {
    wrap.addEventListener('click', function (e) {
      var t = e.target.closest('[data-m]');
      if (!t) return;
      wrap.querySelectorAll('[data-m]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === t)); });
      if (onPick) onPick(t.getAttribute('data-m'));
    });
  }
  function picked(wrap) { var t = wrap.querySelector('[data-m][aria-pressed="true"]'); return t ? t.getAttribute('data-m') : ''; }
  function num(v) { var n = parseFloat(String(v || '').replace(',', '.')); return isFinite(n) ? n : 0; }

  function checkoutDialog(deliver, diagnosis) {
    var amount = diagnosis ? 0 : pay.pending;
    var free = !diagnosis && pay.due <= 0;
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg"><h2>' + (diagnosis ? 'Cobrar diagnóstico' : free ? 'Entregar sin cargo (garantía)' : 'Cobrar la reparación') + '</h2>' +
      (diagnosis ? '<label class="er-field">Importe del diagnóstico (IVA incluido)<input class="er-input er-num" id="er-co-diag" inputmode="decimal" placeholder="0,00"></label>'
        : '<div class="er-co-total"><span class="er-muted">' + (free ? 'Todo en garantía' : 'A cobrar ahora') + '</span><b class="er-num">' + esc(E.fmtMoney(amount)) + '</b>' +
          (pay.paid > 0 ? '<span class="er-muted er-small">Total ' + esc(E.fmtMoney(pay.due)) + ' · señal ' + esc(E.fmtMoney(pay.paid)) + '</span>' : '') + '</div>') +
      (free ? '<p class="er-muted" style="margin:0">Se crea un pedido a 0 € para descontar del stock las piezas usadas.</p>' : methodTiles() +
        '<div id="er-co-cash" class="er-fg"><label class="er-field">Entrega el cliente<input class="er-input er-num" id="er-co-given" inputmode="decimal" placeholder="0,00"></label>' +
        '<div class="er-field">Cambio<div class="er-co-change er-num" id="er-co-change">—</div></div></div>') +
      (diagnosis ? '' : '<label class="er-toggle">Marcar como entregado<input type="checkbox" class="er-sw" id="er-co-deliver"' + (deliver ? ' checked' : '') + '></label>') +
      '<p class="er-muted er-small" style="margin:0">Se crea un pedido de PrestaShop con su factura y se descuentan las piezas del stock.</p>' +
      '<div class="er-err" id="er-co-err" hidden></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri er-btn-lg" data-ok>' + icon('check') + (free ? 'Confirmar' : 'Cobrar') + '</button></div></div>';
    app.appendChild(wrap);
    function due() { return diagnosis ? num((wrap.querySelector('#er-co-diag') || {}).value) : amount; }
    function change() {
      var g = wrap.querySelector('#er-co-given'), out = wrap.querySelector('#er-co-change');
      if (!g) return;
      var v = num(g.value);
      out.textContent = g.value ? E.fmtMoney(Math.max(0, v - due())) : '—';
      out.classList.toggle('er-err', !!g.value && v < due());
    }
    bindTiles(wrap, function (m) { var cash = wrap.querySelector('#er-co-cash'); if (cash) cash.hidden = m !== 'cash'; });
    wrap.addEventListener('input', change);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      var ok = e.target.closest('[data-ok]');
      if (!ok) return;
      var err = wrap.querySelector('#er-co-err');
      if (diagnosis && due() <= 0) { err.textContent = 'Escribe el importe.'; err.hidden = false; return; }
      ok.disabled = true;
      var dl = wrap.querySelector('#er-co-deliver');
      E.api('checkout', { id_ecorepair: r.id }, { method: picked(wrap) || 'cash', deliver: dl && dl.checked ? 1 : 0, diagnosis: diagnosis ? due() : '' }).then(function (res) {
        ok.disabled = false;
        if (!res.ok) { err.textContent = res.error; err.hidden = false; return; }
        pay = res.payment; if (res.repair) r = res.repair; if (res.log) log = res.log;
        wrap.remove();
        renderPay(); renderHead(); renderMove(); renderLog();
        if (res.warning) E.toast(res.warning, true);
        if (res.id_order) {
          E.dialog({ title: 'Cobrado · pedido ' + res.reference, text: 'Total ' + E.fmtMoney(res.total) + '. La factura ya está creada.', ok: 'Abrir factura' }).then(function (yes) {
            if (yes) window.open(pay.invoiceUrl, '_blank', 'noopener');
          });
        } else E.toast('Entregada sin cargo');
        if (res.delivered) setTimeout(function () { location.reload(); }, 1500);
      });
    });
  }

  function depositDialog() {
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg"><h2>Cobrar señal</h2>' +
      '<p class="er-muted" style="margin:0">Pendiente: <b class="er-num">' + esc(E.fmtMoney(pay.pending)) + '</b>. La señal se descuenta al cobrar el resto.</p>' +
      methodTiles() +
      '<label class="er-field">Importe de la señal<input class="er-input er-num" id="er-dep" inputmode="decimal" placeholder="0,00"></label>' +
      '<div class="er-err" id="er-dep-err" hidden></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Cobrar señal</button></div></div>';
    app.appendChild(wrap);
    wrap.querySelector('#er-dep').focus();
    bindTiles(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if (!e.target.closest('[data-ok]')) return;
      E.api('deposit', { id_ecorepair: r.id }, { method: picked(wrap), amount: wrap.querySelector('#er-dep').value }).then(function (res) {
        if (!res.ok) { var er = wrap.querySelector('#er-dep-err'); er.textContent = res.error; er.hidden = false; return; }
        pay = res.payment; log = res.log;
        wrap.remove(); renderPay(); renderLog(); renderHead();
        E.toast('Señal cobrada');
      });
    });
  }

  /* ---------- Asignación ---------- */
  function renderAssign() {
    $('#er-p-assign').innerHTML = '<h3>' + icon('assign') + 'Asignación<span class="er-saved">Guardado</span></h3>' +
      '<label class="er-field">Técnico' + (r.id_employee_tech && !D.isAdmin ? ' <span class="er-muted er-small">(solo el administrador puede cambiarlo)</span>' : '') +
        '<select class="er-input" data-f="id_employee_tech"' + (r.id_employee_tech && !D.isAdmin ? ' disabled' : dis) + '><option value="0">Sin asignar</option>' +
        D.technicians.map(function (t) { return '<option value="' + t.id + '"' + (t.id === r.id_employee_tech ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="er-field">Fecha prevista de entrega<input class="er-input" type="date" data-f="eta_date" value="' + esc(r.eta_date && r.eta_date !== '0000-00-00' ? r.eta_date : '') + '"' + dis + '></label>' +
      '<label class="er-toggle">Urgente<input type="checkbox" class="er-sw er-sw-urg" data-b="urgent"' + (r.urgent ? ' checked' : '') + dis + '></label>' +
      '<label class="er-toggle">En garantía<input type="checkbox" class="er-sw er-sw-gar" data-b="warranty"' + (r.warranty ? ' checked' : '') + dis + '></label>';
  }
  $('#er-p-assign').addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f'), b = e.target.getAttribute('data-b');
    if (f && String(r[f] || '') === String(e.target.value || '')) return;
    if (f === 'eta_date' && !r[f] && !e.target.value) return;
    if (f) save(f, e.target.value, e.target).then(function (ok) { if (ok && f === 'id_employee_tech') r.id_employee_tech = +e.target.value; });
    if (b) save(b, e.target.checked, e.target).then(function (ok) { if (ok) { renderHead(); renderMove(); renderPay(); } });
  });

  /* ---------- Mover a ---------- */
  /** Mismas reglas que el servidor: Listo/Entregado necesitan presupuesto aceptado (o garantía) y Entregado, estar cobrada. */
  function blockReason(to) {
    if (to !== 'ready' && to !== 'delivered') return '';
    var accepted = r.quotes_accepted > 0;
    if (!accepted && !r.warranty) return 'Falta un presupuesto aceptado';
    if (to === 'delivered' && accepted && !pay.id_order && (pay.due > 0 || pay.lines_count > 0)) return 'cobrar';
    return '';
  }
  function renderMove() {
    var idx = D.flow.indexOf(r.status);
    var next = idx > -1 && idx < D.flow.length - 1 ? D.flow[idx + 1] : null;
    var btns = '';
    if (canEdit) {
      btns = Object.keys(D.statuses).filter(function (s) { return s !== r.status && s !== 'cancelled'; }).map(function (s) {
        var st = D.statuses[s], isNext = s === next, why = blockReason(s);
        if (why === 'cobrar') {
          return '<button type="button" class="er-btn er-btn-lg' + (isNext ? ' er-btn-pri' : '') + '" data-pay="checkout">' + icon('check') + 'Cobrar y entregar</button>';
        }
        return '<button type="button" class="er-btn er-btn-lg' + (isNext && !why ? ' er-btn-pri' : '') + '" data-mv="' + s + '"' + (why ? ' disabled title="' + esc(why) + '"' : '') + '>' +
          '<span class="er-dot" style="background:' + (isNext && !why ? 'currentColor' : esc(st.color)) + '"></span>' + esc(st.name) +
          (why ? '<span class="er-why">' + icon('lock', true) + esc(why) + '</span>' : '') + '</button>';
      }).join('');
      if (r.status === 'repair' || r.status === 'quote' || r.status === 'diagnosis') {
        btns += '<button type="button" class="er-btn er-btn-lg" data-mv="wait"><span class="er-dot" style="background:#E0A100"></span>' + (r.waiting_part ? 'Pieza recibida' : 'Esperando pieza') + '</button>';
      }
      if (r.status !== 'cancelled' && r.status !== 'delivered') {
        btns += '<button type="button" class="er-btn er-btn-lg er-btn-ghost er-btn-danger" data-mv="cancelled">' + icon('x') + 'Cancelar · no reparada</button>';
      }
    } else {
      btns = '<p class="er-muted" style="margin:0">Tu perfil solo puede consultar.</p>';
    }
    $('#er-p-move').innerHTML = '<h3>Mover a…</h3><div class="er-move">' + btns + '</div>';
  }
  $('#er-p-move').addEventListener('click', function (e) {
    if (e.target.closest('[data-pay]')) { checkoutDialog(true); return; }
    var b = e.target.closest('[data-mv]');
    if (!b) return;
    var to = b.getAttribute('data-mv');
    if (to === 'wait') {
      save('waiting_part', !r.waiting_part, null).then(function (ok) {
        if (ok) { renderHead(); renderMove(); E.toast(r.waiting_part ? 'Marcada como esperando pieza' : 'Pieza recibida'); }
      });
      return;
    }
    var ask = Promise.resolve('');
    if (to === 'cancelled') {
      ask = E.dialog({ title: 'Cancelar la reparación', text: 'No se descontará stock ni se cobrará nada.', input: true, multiline: true, inputLabel: 'Motivo', required: true, requiredMsg: 'Escribe el motivo.', ok: 'Cancelar reparación', danger: true, maxlength: 255 });
    } else if (to === 'delivered') {
      ask = E.dialog({ title: 'Marcar como entregado', text: 'La reparación saldrá del tablero. Seguirá apareciendo al buscarla.', ok: 'Entregado' });
    }
    ask.then(function (reason) {
      if (reason === null) return;
      b.disabled = true;
      E.api('setStatus', { id_ecorepair: r.id }, { status: to, reason: typeof reason === 'string' ? reason : '' }).then(function (res) {
        b.disabled = false;
        if (!res.ok) { E.toast(res.error || 'No se pudo cambiar el estado.', true); return; }
        if (res.repair) r = res.repair;
        if (res.log) log = res.log;
        renderHead(); renderMove(); renderLog();
        E.toast('Estado: ' + D.statuses[r.status].name);
      });
    });
  });

  /* ---------- Firma ---------- */
  function renderSig() {
    $('#er-p-sig').innerHTML = '<h3>' + icon('pen') + 'Firma de entrada</h3>' +
      (signature ? '<img class="er-sig-img" src="' + esc(signature.full) + '" alt="Firma del cliente">' : '<p class="er-muted" style="margin:0">El cliente no ha firmado.</p>') +
      (canEdit ? '<button type="button" class="er-btn" id="er-sig-open">' + icon('pen') + (signature ? 'Volver a firmar' : 'Firmar ahora') + '</button>' : '');
  }
  $('#er-p-sig').addEventListener('click', function (e) {
    if (!e.target.closest('#er-sig-open')) return;
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg"><h2>Firma del cliente</h2><canvas class="er-sig" id="er-sig2" aria-label="Firma"></canvas>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-clear>Borrar</button><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar firma</button></div></div>';
    app.appendChild(wrap);
    var pad = E.signaturePad(wrap.querySelector('#er-sig2'));
    wrap.addEventListener('click', function (ev) {
      if (ev.target === wrap || ev.target.closest('[data-x]')) { wrap.remove(); return; }
      if (ev.target.closest('[data-clear]')) { pad.clear(); return; }
      if (!ev.target.closest('[data-ok]')) return;
      if (pad.isEmpty()) { E.toast('Falta la firma.', true); return; }
      E.api('saveSignature', { id_ecorepair: r.id }, { signature: pad.toDataURL() }).then(function (res) {
        if (!res.ok) { E.toast(res.error, true); return; }
        signature = res.signature; log = res.log;
        wrap.remove();
        renderSig(); renderLog();
        E.toast('Firma guardada');
      });
    });
  });

  /* ---------- Seguimiento ---------- */
  function renderTrack() {
    var qr = '';
    try {
      var q = window.qrcode(0, 'M');
      q.addData(D.trackingUrl);
      q.make();
      qr = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: 'Código QR de seguimiento' });
    } catch (e) { qr = ''; }
    $('#er-p-track').innerHTML = '<h3>' + icon('qr') + 'Seguimiento online</h3>' +
      '<div class="er-track"><div class="er-qr">' + qr + '</div><div><div class="er-muted er-small">Código del cliente</div><div class="er-code">' + esc(r.tracking_code) + '</div>' +
      '<div class="er-muted er-small" style="margin-top:4px">El cliente ve el estado, las fechas y el total. Nunca sus datos ni las notas.</div></div></div>' +
      '<div class="er-row"><button type="button" class="er-btn" id="er-copy" style="flex:1">' + icon('copy') + 'Copiar enlace</button>' +
      '<a class="er-btn er-icon-btn" href="' + esc(D.trackingUrl) + '" target="_blank" rel="noopener" title="Abrir la página" aria-label="Abrir la página de seguimiento">' + icon('link') + '</a>' +
      (canEdit ? '<button type="button" class="er-btn er-btn-ghost er-icon-btn" id="er-newcode" title="Cambiar el código (el anterior deja de funcionar)" aria-label="Cambiar el código">' + icon('refresh') + '</button>' : '') + '</div>';
  }
  $('#er-p-track').addEventListener('click', function (e) {
    if (e.target.closest('#er-newcode')) {
      E.dialog({ title: 'Cambiar el código de seguimiento', text: 'El código y el QR impresos dejarán de funcionar. Tendrás que imprimir la etiqueta y el resguardo otra vez.', ok: 'Cambiar código', danger: true }).then(function (yes) {
        if (!yes) return;
        E.api('newTrackingCode', { id_ecorepair: r.id }, {}).then(function (res) {
          if (!res.ok) { E.toast(res.error, true); return; }
          r.tracking_code = res.code; D.trackingUrl = res.url; log = res.log;
          renderTrack(); renderLog(); renderHead();
          E.toast('Código cambiado');
        });
      });
      return;
    }
    if (!e.target.closest('#er-copy')) return;
    var url = D.trackingUrl;
    var done = function () { E.toast('Enlace copiado'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(done, function () { E.dialog({ title: 'Enlace de seguimiento', text: url }); });
    } else {
      E.dialog({ title: 'Enlace de seguimiento', text: url });
    }
  });

  renderHead();
  renderCustomer();
  renderDevice();
  renderPhotos();
  renderLog();
  renderParts();
  renderCheck();
  renderQuote();
  renderPay();
  renderAssign();
  renderMove();
  renderSig();
  renderTrack();
});
