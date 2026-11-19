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
  var canEdit = !!D.canEdit;
  var dis = canEdit ? '' : ' disabled';
  var printUrl = E.ajaxUrl('printReceipt', { id_ecorepair: r.id });
  var labelUrl = E.ajaxUrl('printLabel', { id_ecorepair: r.id });

  app.innerHTML =
    '<div class="er-f-head">' +
      '<a class="er-btn er-btn-ghost er-icon-btn" href="' + esc(E.boot.links.board) + '" aria-label="Volver al tablero">' + icon('back') + '</a>' +
      (r.cover ? '<a class="er-f-cover" href="#er-p-photos"><img src="' + esc(r.cover) + '" alt="Foto del equipo"></a>' : '') +
      '<div class="er-f-title"><h1>' + esc(r.reference) + '</h1><span id="er-st"></span><span id="er-tags" class="er-row"></span></div>' +
      '<div class="er-f-actions">' +
        '<a class="er-btn" href="' + esc(printUrl) + '" target="_blank" rel="noopener">' + icon('print') + 'Imprimir resguardo</a>' +
        '<a class="er-btn" href="' + esc(labelUrl) + '" target="_blank" rel="noopener">' + icon('tag') + 'Etiqueta</a>' +
        '<a class="er-btn er-btn-pri" href="' + esc(E.boot.links['new']) + '&id_customer=' + r.id_customer + '">' + icon('plus') + 'Otra reparación del cliente</a>' +
      '</div>' +
    '</div>' +
    '<div id="er-banners"></div>' +
    '<div class="er-steps" id="er-steps"></div>' +
    '<div class="er-grid2">' +
      '<div class="er-stack er-wide-2">' +
        '<div class="er-panel" id="er-p-cust"></div>' +
        '<div class="er-panel" id="er-p-dev"></div>' +
        '<div class="er-panel" id="er-p-photos"></div>' +
        '<div class="er-panel" id="er-p-log"></div>' +
      '</div>' +
      '<div class="er-stack">' +
        '<div class="er-panel" id="er-p-quote"></div>' +
        '<div class="er-panel" id="er-p-assign"></div>' +
        '<div class="er-panel" id="er-p-move"></div>' +
        '<div class="er-panel" id="er-p-sig"></div>' +
        '<div class="er-panel" id="er-p-track"></div>' +
      '</div>' +
    '</div>';

  var $ = function (s) { return app.querySelector(s); };

  /* ---------- Cabecera, aviso y pasos ---------- */
  function renderHead() {
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
    $('#er-p-cust').innerHTML = '<h3>' + icon('user') + 'Cliente<span class="er-r"><a href="' + esc(D.customerAdminUrl) + '" target="_blank" rel="noopener">Ver en PrestaShop</a></span></h3>' +
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
  $('#er-p-cust').addEventListener('click', function (e) { if (e.target.closest('#er-inv')) invoiceDialog(); });

  /* ---------- Equipo y avería ---------- */
  function renderDevice() {
    $('#er-p-dev').innerHTML = '<h3>' + icon(r.category_icon || 'device') + 'Equipo y avería<span class="er-saved">Guardado</span>' +
      (canEdit ? '<button type="button" class="er-btn er-btn-sm er-r" id="er-dev-edit" style="margin-left:auto">Cambiar equipo</button>' : '') + '</h3>' +
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
      '<label class="er-field">Avería que indica el cliente<textarea class="er-input" data-f="fault_customer" maxlength="5000"' + dis + '>' + esc(r.fault_customer) + '</textarea></label>' +
      '<label class="er-field">Diagnóstico del técnico<textarea class="er-input" data-f="diagnosis" maxlength="5000" placeholder="Qué le pasa y qué hay que hacer"' + dis + '>' + esc(r.diagnosis) + '</textarea></label>';
    if (canEdit) {
      E.ChipSet($('#er-acc'), { options: D.accessories, selected: r.accessories, allowOther: true, list: 'accessories', canManage: true, onChange: function (v) { save('accessories', v, $('#er-acc')); } });
      E.ChipSet($('#er-dmg'), { options: D.damages, selected: r.damages, warn: true, allowOther: true, list: 'damages', canManage: true, onChange: function (v) { save('damages', v, $('#er-dmg')); } });
    } else {
      $('#er-acc').innerHTML = (r.accessories || []).map(function (a) { return '<span class="er-tag er-t-ok">' + esc(a) + '</span> '; }).join('') || '<span class="er-muted">Nada</span>';
      $('#er-dmg').innerHTML = (r.damages || []).map(function (a) { return '<span class="er-tag er-t-warn">' + esc(a) + '</span> '; }).join('') || '<span class="er-muted">Ninguno</span>';
    }
  }
  $('#er-p-dev').addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f');
    if (f && r[f] !== e.target.value.trim()) save(f, e.target.value.trim(), e.target);
  });
  $('#er-p-dev').addEventListener('click', function (e) {
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
    $('#er-p-photos').innerHTML = '<h3>' + icon('camera') + 'Fotos<span class="er-r">' + photos.length + '</span></h3>' +
      '<div class="er-photos" id="er-ph">' + photos.map(function (p) {
        return '<div class="er-ph"><a href="' + esc(p.full) + '" target="_blank" rel="noopener"><img src="' + esc(p.thumb) + '" alt="Foto de la reparación" loading="lazy"></a>' +
          (D.canDelete ? '<button type="button" class="er-del" data-del="' + p.id + '" aria-label="Borrar foto">' + icon('trash', true) + '</button>' : '') + '</div>';
      }).join('') +
      (canEdit ? '<button type="button" class="er-ph er-add" id="er-ph-add">' + icon('plus') + 'Añadir foto</button>' : '') +
      (!photos.length && !canEdit ? '<div class="er-muted">Sin fotos</div>' : '') + '</div>' +
      '<input type="file" id="er-file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple hidden>';
  }
  $('#er-p-photos').addEventListener('click', function (e) {
    if (e.target.closest('#er-ph-add')) { $('#er-file').click(); return; }
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

  /* ---------- Historial ---------- */
  function renderLog() {
    var colors = { status: null, note: '#5B6170', create: '#8B93A3', photo: '#D5D8DE', field: '#D5D8DE', customer: '#0A4F7A' };
    $('#er-p-log').innerHTML = '<h3>' + icon('clock') + 'Notas internas e historial</h3>' +
      (canEdit ? '<div class="er-row" style="flex-wrap:nowrap"><input class="er-input" id="er-note" maxlength="2000" placeholder="Escribe una nota interna para el equipo" aria-label="Nota interna"><button type="button" class="er-btn" id="er-note-add">Añadir</button></div>' : '') +
      '<ul class="er-timeline">' + log.map(function (l) {
        var color = colors[l.action] || '#D5D8DE';
        if (l.action === 'status') {
          var to = String(l.detail).split('→').pop().split('·')[0].trim();
          Object.keys(D.statuses).forEach(function (k) { if (D.statuses[k].name === to) color = D.statuses[k].color; });
        }
        var text = l.action === 'note' ? '<div class="er-note">' + esc(l.detail) + '</div>' : esc(l.action === 'status' ? 'Estado: ' + l.detail : l.detail);
        return '<li><span class="er-tdot" style="background:' + esc(color) + '"></span><div>' + text +
          '<div class="er-when er-num">' + esc(E.fmtDateTime(l.date)) + (l.employee ? ' · ' + esc(l.employee) : '') + '</div></div></li>';
      }).join('') + '</ul>';
  }
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
      '<a class="er-btn er-btn-block' + (pri ? ' er-btn-pri' : '') + '" href="' + esc(D.quoteUrl) + '">' + icon(qs.length ? 'doc' : 'plus') + (qs.length ? 'Abrir presupuesto' : (canEdit ? 'Crear presupuesto' : 'Ver presupuesto')) + '</a>';
  }

  /* ---------- Asignación ---------- */
  function renderAssign() {
    $('#er-p-assign').innerHTML = '<h3>' + icon('assign') + 'Asignación<span class="er-saved">Guardado</span></h3>' +
      '<label class="er-field">Técnico<select class="er-input" data-f="id_employee_tech"' + dis + '><option value="0">Sin asignar</option>' +
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
    if (b) save(b, e.target.checked, e.target).then(function (ok) { if (ok) renderHead(); });
  });

  /* ---------- Mover a ---------- */
  function renderMove() {
    var idx = D.flow.indexOf(r.status);
    var next = idx > -1 && idx < D.flow.length - 1 ? D.flow[idx + 1] : null;
    var btns = '';
    if (canEdit) {
      btns = Object.keys(D.statuses).filter(function (s) { return s !== r.status && s !== 'cancelled'; }).map(function (s) {
        var st = D.statuses[s], isNext = s === next;
        return '<button type="button" class="er-btn er-btn-lg' + (isNext ? ' er-btn-pri' : '') + '" data-mv="' + s + '"><span class="er-dot" style="background:' + (isNext ? 'currentColor' : esc(st.color)) + '"></span>' + esc(st.name) + '</button>';
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
      '<div class="er-muted er-small" style="margin-top:4px">La página pública de seguimiento se activa en la fase 4.</div></div></div>' +
      '<button type="button" class="er-btn er-btn-block" id="er-copy">' + icon('copy') + 'Copiar enlace</button>';
  }
  $('#er-p-track').addEventListener('click', function (e) {
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
  renderQuote();
  renderAssign();
  renderMove();
  renderSig();
  renderTrack();
});
