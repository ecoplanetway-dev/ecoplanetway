/* Reparaciones del taller · ajustes */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'settings') return;

  var catalog = D.catalog || [];
  var cfg = D.config || {};
  var canEdit = !!D.canEdit;
  var dis = canEdit ? '' : ' disabled';
  var sel = { cat: catalog[0] ? catalog[0].id : 0, brand: 0 };

  function sg(title, help, controls, wide) {
    return '<div class="er-sg' + (wide ? ' er-sg-wide' : '') + '"><div class="er-sg-t"><b>' + title + '</b>' + (help ? '<p>' + help + '</p>' : '') + '</div><div class="er-sg-c">' + controls + '</div></div>';
  }
  function ta(key, rows) { return '<textarea class="er-input" data-c="' + key + '" rows="' + (rows || 5) + '"' + dis + '></textarea>'; }
  function num(key, max) { return '<input class="er-input" data-c="' + key + '" inputmode="numeric" maxlength="' + (max || 3) + '"' + dis + ' style="max-width:160px">'; }
  var SECS = [
    { k: 'catalog', i: 'device', t: 'Catálogo', s: 'Categorías, marcas, modelos y fotos', w: 'marca modelo foto categoria averia frecuente importar',
      h: '<p class="er-sg-intro">Lo que se oculta deja de salir al crear reparaciones, pero no se borra. Con <b>📖</b> abres la ficha del modelo (piezas, deslimitar, precios, códigos).</p>' +
        '<div id="er-cat-grid"></div><input type="file" id="er-img-file" accept="image/jpeg,image/png,image/webp" hidden>' +
        (canEdit ? '<div class="er-row" style="margin-top:12px"><button type="button" class="er-btn er-btn-pri" id="er-shopimg">' + icon('camera') + 'Buscar fotos en mi tienda</button><span class="er-muted er-small" id="er-nophoto"></span></div>' +
          '<div class="er-row"><button type="button" class="er-btn" id="er-import">' + icon('download') + 'Cargar marcas y modelos habituales</button><span class="er-muted er-small">Añade solo los que falten.</span></div>' : '') },
    { k: 'reception', i: 'plus', t: 'Recepción', s: 'Datos del cliente, accesorios y daños', w: 'telefono email obligatorio accesorios cargador daños condiciones resguardo firma',
      h: sg('Averías frecuentes', 'Salen como botones al elegir el equipo. Cada categoría tiene las suyas.', '<div id="er-flt"></div>') +
        sg('Datos del cliente', 'Qué es obligatorio al crear un cliente nuevo. Nombre y apellidos siempre lo son.', '<div class="er-fg">' + fieldRule('ECOREPAIRS_FIELD_PHONE', 'Teléfono') + fieldRule('ECOREPAIRS_FIELD_EMAIL', 'Email') + '</div>') +
        sg('Entregado con el equipo', 'Salen como botones en «Nueva reparación». Uno por línea.', ta('ECOREPAIRS_ACCESSORIES')) +
        sg('Daños previos', 'Para dejar constancia de cómo llega el equipo. Uno por línea.', ta('ECOREPAIRS_DAMAGES')) +
        sg('Condiciones del resguardo', 'Salen impresas y el cliente las acepta al firmar. Revísalas con tu gestor.', ta('ECOREPAIRS_CONDITIONS', 6)) },
    { k: 'check', i: 'check', t: 'Revisión de salida', s: 'Puntos a revisar al terminar', w: 'revision checklist frenos presion tornillos plegado',
      h: sg('Puntos de la revisión', 'Botones que el técnico marca al terminar. No son obligatorios. Uno por línea.', ta('ECOREPAIRS_CHECKLIST', 7)) },
    { k: 'quote', i: 'doc', t: 'Presupuestos y cobro', s: 'Mano de obra, validez y condiciones', w: 'mano de obra hora precio validez enlace condiciones presupuesto transportista cobro pedido',
      h: sg('Mano de obra', 'Precio por hora con IVA incluido.', '<input class="er-input" data-c="ECOREPAIRS_LABOUR_RATE" inputmode="decimal" maxlength="8"' + dis + ' style="max-width:160px">') +
        sg('Validez del presupuesto', 'Días que el cliente tiene para aceptarlo desde el enlace.', num('ECOREPAIRS_QUOTE_DAYS')) +
        sg('Condiciones del presupuesto', 'Salen al final del presupuesto.', ta('ECOREPAIRS_QUOTE_CONDITIONS')) +
        sg('Transportista de los pedidos', 'Solo para pedidos con piezas. Tiene que ser gratuito.', '<select class="er-input" data-c="ECOREPAIRS_CARRIER"' + dis + '><option value="0">Automático (el primero gratuito, «Recogida en tienda» si existe)</option>' +
          (D.carriers || []).map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + (c.free ? ' · gratuito' : ' · ¡cobra envío!') + '</option>'; }).join('') + '</select>') },
    { k: 'notify', i: 'whatsapp', t: 'Avisos al cliente', s: 'WhatsApp, emails y reseñas', w: 'whatsapp plantilla email aviso recordatorio reseña google',
      h: sg('Email automático al pasar a…', 'Solo a clientes con email. Queda en los mensajes del cliente.', '<div class="er-opts" id="er-mail-st">' + Object.keys(D.statuses || {}).map(function (k) {
          return '<button type="button" class="er-opt" data-mst="' + k + '" aria-pressed="false"' + dis + '>' + esc(D.statuses[k].name) + '</button>'; }).join('') + '</div>') +
        sg('Presupuesto por email', '', '<label class="er-toggle">Enviar el enlace del presupuesto al pulsar «Enviar al cliente»<input type="checkbox" class="er-sw" data-cb="ECOREPAIRS_EMAIL_QUOTE"' + dis + '></label>') +
        sg('Recordatorio de «sin recoger»', 'Email automático, una vez al día.', '<label class="er-toggle">Activado<input type="checkbox" class="er-sw" data-cb="ECOREPAIRS_REMINDER_AUTO"' + dis + '></label>') +
        sg('Enlace de reseñas', 'Se usa en {resena} de las plantillas.', '<input class="er-input" data-c="ECOREPAIRS_REVIEW_URL" maxlength="255" placeholder="https://g.page/r/…/review"' + dis + '>') +
        sg('Plantillas de WhatsApp', 'Variables: ' + esc((D.variables || []).join(' ')), '<div class="er-tpls">' + Object.keys(D.templates || {}).map(function (k) {
          return '<label class="er-field">' + esc(D.templates[k].name) + '<textarea class="er-input" data-tpl="' + k + '" rows="5"' + dis + '>' + esc(D.templates[k].text) + '</textarea></label>'; }).join('') + '</div>', true) },
    { k: 'times', i: 'clock', t: 'Plazos', s: 'Retrasos, sin recoger y garantía', w: 'dias retraso rojo sin recoger llamar garantia meses seguimiento repetida',
      h: sg('Retraso en el taller', 'Se marca en rojo si lleva más de estos días.', num('ECOREPAIRS_LATE_DAYS')) +
        sg('«Sin recoger»', 'Se marca si está listo desde hace estos días.', num('ECOREPAIRS_PICKUP_DAYS')) +
        sg('Volver a avisar', 'Sale arriba del tablero para llamar otra vez al cliente.', num('ECOREPAIRS_RECALL_DAYS')) +
        sg('Reparación repetida', 'Se marca si vuelve antes de estos días.', num('ECOREPAIRS_REPEAT_DAYS')) +
        sg('Garantía de la reparación', 'Meses desde la entrega.', num('ECOREPAIRS_WARRANTY_MONTHS', 2)) +
        sg('Seguimiento online', 'Días que se puede consultar tras cerrar.', num('ECOREPAIRS_TRACKING_DAYS', 4)) },
    { k: 'print', i: 'print', t: 'Impresión', s: 'Resguardo, etiquetas y pegatina', w: 'imprimir resguardo ticket 80mm a4 etiqueta pegatina tamaño',
      h: sg('Resguardo', '', '<select class="er-input" data-c="ECOREPAIRS_PRINT_FORMAT"' + dis + ' style="max-width:260px"><option value="80mm">Ticket de 80 mm</option><option value="a4">A4</option></select>') +
        sg('Etiqueta y pegatina', 'Tamaño del rollo de la impresora de etiquetas. La pegatina también se puede imprimir en hoja A4.', '<select class="er-input" data-c="ECOREPAIRS_LABEL_SIZE"' + dis + ' style="max-width:260px"><option value="62x29">62 × 29 mm</option><option value="50x25">50 × 25 mm</option><option value="62x100">62 × 100 mm</option></select>') },
    { k: 'staff', i: 'user', t: 'Personal y app', s: 'PIN, roles y QR del taller', w: 'personal tecnico recepcion pin app movil qr empleado',
      h: '<div class="er-staff-top"><div class="er-qr" id="er-app-qr"></div><div class="er-stack" style="gap:6px;min-width:0">' +
          '<b>Página del taller: <a href="' + esc(D.appUrl) + '" target="_blank" rel="noopener">' + esc(D.appUrl) + '</a></b>' +
          '<span class="er-muted er-small">Escanea este QR con el móvil del técnico o de recepción, entra con su PIN y añádela a la pantalla de inicio.</span>' +
          '<div class="er-row">' + (canEdit ? '<button type="button" class="er-btn er-btn-pri" id="er-staff-add">' + icon('plus') + 'Añadir persona</button>' : '') +
          '<button type="button" class="er-btn" id="er-qr-print">' + icon('print') + 'Imprimir QR</button></div></div></div><div class="er-mini" id="er-staff-list" style="margin-top:12px"></div>' },
    { k: 'unlock', i: 'bolt', t: 'Deslimitación', s: 'Aviso legal', w: 'deslimitar velocidad aviso legal',
      h: sg('Aviso legal', 'Sale en las observaciones del presupuesto al añadir una deslimitación.', ta('ECOREPAIRS_UNLOCK_NOTICE', 6)) }
  ];
  if (D.isAdmin) SECS.push({ k: 'perm', i: 'pin', t: 'Permisos', s: 'Quién ve el informe de técnicos', w: 'permisos tecnicos informe ver',
    h: sg('Informe de técnicos', 'Tú siempre lo ves. Marca a quién más le sale el botón «Técnicos».', '<div class="er-opts" id="er-tv">' + (D.activeEmployees || D.employees || []).map(function (e) {
      return '<button type="button" class="er-opt" data-tv="' + e.id + '" aria-pressed="' + (String(cfg.ECOREPAIRS_TECHS_VIEWERS || '').split(',').indexOf(String(e.id)) > -1) + '">' + esc(e.name) + '</button>';
    }).join('') + '</div>') });
  var curSec = 'catalog';
  try { curSec = localStorage.getItem('ecor-settings-sec') || 'catalog'; } catch (e) {}
  if (!SECS.filter(function (s) { return s.k === curSec; }).length) curSec = 'catalog';

  app.innerHTML =
    '<header class="er-head"><div class="er-brand"><div class="er-ico">' + icon('settings') + '</div><div><h1>Ajustes del taller</h1>' +
      '<p>Elige una sección a la izquierda o busca un ajuste</p></div></div>' +
      '<a class="er-btn" href="' + esc(E.boot.links.board) + '">' + icon('back') + 'Volver al tablero</a></header>' +
    (canEdit ? '' : '<div class="er-banner er-bad">Tu perfil solo puede ver los ajustes.</div>') +
    '<div class="er-set">' +
      '<nav class="er-set-nav"><label class="er-search">' + icon('search') + '<input class="er-input" id="er-set-q" type="search" placeholder="Buscar un ajuste…" autocomplete="off" data-novoice></label>' +
        SECS.map(function (s) { return '<button type="button" class="er-set-l" data-sec="' + s.k + '"><span class="er-set-i">' + icon(s.i, true) + '</span><span><b>' + esc(s.t) + '</b><small>' + esc(s.s) + '</small></span></button>'; }).join('') + '</nav>' +
      '<div class="er-set-main">' + SECS.map(function (s) {
        return '<section class="er-set-sec" data-secc="' + s.k + '"><h2>' + esc(s.t) + '</h2><p class="er-muted" style="margin:2px 0 14px">' + esc(s.s) + '</p>' + s.h + '</section>';
      }).join('') +
      (canEdit ? '<div class="er-set-bar"><span class="er-err" id="er-cfg-err" hidden></span><button type="button" class="er-btn er-btn-pri er-btn-lg" id="er-save-cfg">' + icon('check') + 'Guardar ajustes</button></div>' : '') +
      '</div></div>';

  function showSec(k) {
    curSec = k;
    try { localStorage.setItem('ecor-settings-sec', k); } catch (e) {}
    app.querySelectorAll('[data-sec]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-sec') === k); });
    app.querySelectorAll('[data-secc]').forEach(function (s) { s.hidden = s.getAttribute('data-secc') !== k; });
    var bar = app.querySelector('.er-set-bar'); if (bar) bar.hidden = k === 'catalog' || k === 'staff';
  }
  app.querySelector('.er-set-nav').addEventListener('click', function (e) { var b = e.target.closest('[data-sec]'); if (b) showSec(b.getAttribute('data-sec')); });
  app.querySelector('#er-set-q').addEventListener('input', function (e) {
    var q = E.fold(e.target.value.trim());
    app.querySelectorAll('[data-sec]').forEach(function (b) {
      var s = SECS.filter(function (x) { return x.k === b.getAttribute('data-sec'); })[0];
      var hay = E.fold(s.t + ' ' + s.s + ' ' + s.w + ' ' + app.querySelector('[data-secc="' + s.k + '"]').textContent);
      b.hidden = !!q && hay.indexOf(q) < 0;
    });
    var first = app.querySelector('[data-sec]:not([hidden])');
    if (q && first) showSec(first.getAttribute('data-sec'));
  });
  showSec(curSec);

  var $ = function (s) { return app.querySelector(s); };

  function fieldRule(key, label) {
    return '<label class="er-field">' + esc(label) + '<select class="er-input" data-c="' + key + '"' + dis + '><option value="req">Obligatorio</option><option value="opt">Opcional</option></select></label>';
  }

  function fillConfig() {
    app.querySelectorAll('[data-c]').forEach(function (el) {
      var k = el.getAttribute('data-c');
      if (cfg[k] !== undefined) el.value = cfg[k];
    });
    var mst = String(cfg.ECOREPAIRS_EMAIL_STATUSES || '').split(',');
    app.querySelectorAll('[data-mst]').forEach(function (b) { b.setAttribute('aria-pressed', String(mst.indexOf(b.getAttribute('data-mst')) > -1)); });
    app.querySelectorAll('[data-cb]').forEach(function (el) { el.checked = cfg[el.getAttribute('data-cb')] === '1'; });
  }

  /* ---------- Catálogo ---------- */
  function cat() { return catalog.filter(function (c) { return c.id === sel.cat; })[0] || null; }
  function brand() { var c = cat(); return c ? c.brands.filter(function (b) { return b.id === sel.brand; })[0] || null : null; }

  function row(type, item, selectable, selected, extra) {
    return '<div class="er-pick-row er-pr-' + type + '" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-top:1px solid var(--er-line2);' + (selected ? 'background:var(--er-pri-soft);' : '') + (item.active ? '' : 'opacity:.55;') + '">' +
      (selectable ? '<button type="button" class="er-btn er-btn-ghost er-btn-sm" style="flex:1;justify-content:flex-start;min-width:0" data-sel="' + type + '" data-id="' + item.id + '">' + (extra || '') + '<span style="overflow:hidden;text-overflow:ellipsis">' + esc(item.name) + '</span></button>'
                  : '<span class="er-pr-name" style="flex:1;min-width:0;padding-left:12px;display:flex;align-items:center;gap:8px">' + (extra || '') + '<span style="overflow:hidden;text-overflow:ellipsis">' + esc(item.name) + '</span></span>') +
      (type === 'model' || type === 'brand' ? '<a class="er-btn er-btn-ghost er-btn-sm er-icon-btn" title="Ficha: códigos de error, menú y soluciones" aria-label="Ficha técnica" href="' +
        esc(E.boot.links.model + '&id_brand=' + (type === 'brand' ? item.id : ((brand() || {}).id || 0)) + '&id_model=' + (type === 'model' ? item.id : 0)) + '">' + icon('book', true) + '</a>' : '') +
      (canEdit && type === 'model' ? '<button type="button" class="er-btn er-btn-ghost er-btn-sm er-icon-btn" title="Subir foto" aria-label="Subir foto de ' + esc(item.name) + '" data-imgup="' + item.id + '">' + icon('camera', true) + '</button>' +
        '<button type="button" class="er-btn er-btn-ghost er-btn-sm er-icon-btn" title="Foto desde una dirección web" aria-label="Foto desde una dirección web" data-imgurl="' + item.id + '">' + icon('link', true) + '</button>' +
        '<a class="er-btn er-btn-ghost er-btn-sm er-icon-btn" title="Buscar imagen en Google" aria-label="Buscar imagen en Google" target="_blank" rel="noopener" href="https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(((brand() || {}).name || '') + ' ' + item.name) + '">' + icon('search', true) + '</a>' +
        (item.image ? '<button type="button" class="er-btn er-btn-ghost er-btn-sm er-icon-btn" title="Quitar foto" aria-label="Quitar foto" data-imgdel="' + item.id + '">' + icon('x', true) + '</button>' : '') : '') +
      (canEdit ? '<button type="button" class="er-btn er-btn-ghost er-btn-sm er-icon-btn" title="Cambiar nombre" aria-label="Cambiar nombre de ' + esc(item.name) + '" data-ren="' + type + '" data-id="' + item.id + '" data-name="' + esc(item.name) + '">' + icon('pen', true) + '</button>' +
        '<button type="button" class="er-btn er-btn-sm" data-act="' + type + '" data-id="' + item.id + '" data-v="' + (item.active ? 0 : 1) + '">' + (item.active ? 'Ocultar' : 'Mostrar') + '</button>' : '') +
      '</div>';
  }
  function column(title, type, items, parentId, selectable, selectedId, extraFn, note) {
    return '<div><div class="er-sub">' + esc(title) + '</div><div style="border:1px solid var(--er-line2);border-radius:10px;overflow:hidden">' +
      (items.length ? items.map(function (it) { return row(type, it, selectable, it.id === selectedId, extraFn ? extraFn(it) : ''); }).join('').replace('border-top:1px solid var(--er-line2);', '')
                    : '<div class="er-muted er-small" style="padding:12px">' + esc(note || 'Vacío') + '</div>') +
      '</div>' + (canEdit && parentId !== null ? '<div class="er-row" style="margin-top:8px;flex-wrap:nowrap"><input class="er-input" data-newname="' + type + '" maxlength="64" placeholder="Añadir…" aria-label="Añadir ' + esc(title) + '">' +
        '<button type="button" class="er-btn er-icon-btn" data-add="' + type + '" data-parent="' + parentId + '" aria-label="Añadir">' + icon('plus') + '</button></div>' : '') + '</div>';
  }

  var catQ = '', azSel = '', mFilter = 'all', fltCat = 0;
  function modelCard(it, b) {
    var src = E.modelImg(it.image);
    return '<div class="er-mcard' + (it.active ? '' : ' off') + '">' +
      '<div class="er-mcard-ph">' + (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '<span>Sin foto' + (canEdit ? ' · arrástrala aquí' : '') + '</span>') + '</div>' +
      '<div class="er-mcard-t"><b>' + esc(it.name) + '</b>' + (it.active ? '' : '<span class="er-tag er-t-warn">Oculto</span>') +
      '<details class="er-mmenu"><summary aria-label="Opciones">⋯</summary><div>' +
        '<a href="' + esc(E.boot.links.model + '&id_brand=' + b.id + '&id_model=' + it.id) + '">' + icon('book', true) + 'Abrir ficha (piezas, códigos…)</a>' +
        (canEdit ? '<button type="button" data-imgup="' + it.id + '">' + icon('camera', true) + 'Subir foto</button>' +
          '<button type="button" data-imgurl="' + it.id + '">' + icon('link', true) + 'Foto desde enlace</button>' +
          '<a target="_blank" rel="noopener" href="https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(b.name + ' ' + it.name) + '">' + icon('search', true) + 'Buscar imagen</a>' +
          (it.image ? '<button type="button" data-imgdel="' + it.id + '">' + icon('x', true) + 'Quitar foto</button>' : '') +
          '<button type="button" data-ren="model" data-id="' + it.id + '" data-name="' + esc(it.name) + '">' + icon('pen', true) + 'Renombrar</button>' +
          '<button type="button" data-act="model" data-id="' + it.id + '" data-v="' + (it.active ? 0 : 1) + '">' + (it.active ? 'Ocultar' : 'Mostrar') + '</button>' : '') +
      '</div></details></div></div>';
  }
  function renderCatalog() {
    var c = cat(), b = brand();
    var html = '<div class="er-cat-top"><div class="er-cat-cats">' + catalog.map(function (x) {
      return '<button type="button" class="er-cchip' + (x.id === sel.cat ? ' on' : '') + (x.active ? '' : ' off') + '" data-sel="category" data-id="' + x.id + '">' + icon(x.icon || 'other', true) + esc(x.name) + ' <b>' + x.brands.length + '</b></button>';
    }).join('') + (canEdit ? '<span class="er-inl"><input class="er-input" data-newname="category" maxlength="64" placeholder="Nueva categoría" style="width:150px"><button type="button" class="er-btn er-icon-btn" data-add="category" data-parent="0" aria-label="Añadir">' + icon('plus') + '</button></span>' : '') + '</div>' +
      '<label class="er-search er-cat-q">' + icon('search') + '<input class="er-input" id="er-catq" type="search" placeholder="Buscar marca o modelo en todo el catálogo" autocomplete="off" value="' + esc(catQ) + '" data-novoice></label></div>';
    if (catQ.length >= 2) {
      var hits = [];
      catalog.forEach(function (cc) { cc.brands.forEach(function (bb) {
        var sb = E.fuzzyScore(catQ, bb.name);
        if (sb) hits.push({ s: sb + 1, c: cc, b: bb, m: null });
        bb.models.forEach(function (mm) { var sm = E.fuzzyScore(catQ, bb.name + ' ' + mm.name); if (sm) hits.push({ s: sm, c: cc, b: bb, m: mm }); });
      }); });
      hits.sort(function (x, y) { return y.s - x.s; });
      html += '<div class="er-cat-hits">' + (hits.length ? hits.slice(0, 16).map(function (h) {
        return '<button type="button" data-hit="' + h.c.id + ':' + h.b.id + '">' + icon(h.c.icon || 'other', true) + '<b>' + esc(h.b.name + (h.m ? ' ' + h.m.name : '')) + '</b><span class="er-muted er-small">' + esc(h.c.name + (h.m ? '' : ' · marca')) + '</span></button>';
      }).join('') : '<div class="er-empty">Nada con «' + esc(catQ) + '».</div>') + '</div>';
    }
    if (c) {
      var brands = c.brands.slice().sort(function (x, y) { return x.name.localeCompare(y.name); });
      var letters = {};
      brands.forEach(function (x) { letters[x.name.charAt(0).toUpperCase()] = true; });
      var list = '', last = '';
      brands.forEach(function (x) {
        var L = x.name.charAt(0).toUpperCase();
        if (L !== last) { list += '<div class="er-bl-l" data-letter="' + esc(L) + '">' + esc(L) + '</div>'; last = L; }
        list += '<button type="button" class="er-bl-b' + (x.id === sel.brand ? ' on' : '') + (x.active ? '' : ' off') + '" data-sel="brand" data-id="' + x.id + '"><span>' + esc(x.name) + '</span><small>' + x.models.length + '</small></button>';
      });
      html += '<div class="er-cat-grid2"><div class="er-bl"><div class="er-az">' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(function (L) {
          return '<button type="button" data-az="' + L + '"' + (letters[L] ? '' : ' disabled') + '>' + L + '</button>';
        }).join('') + '</div><div class="er-bl-list" id="er-bl-list">' + (list || '<div class="er-empty">Sin marcas</div>') + '</div>' +
        (canEdit ? '<div class="er-row" style="flex-wrap:nowrap;padding:8px"><input class="er-input" data-newname="brand" maxlength="64" placeholder="Nueva marca"><button type="button" class="er-btn er-icon-btn" data-add="brand" data-parent="' + c.id + '" aria-label="Añadir">' + icon('plus') + '</button></div>' : '') +
        (canEdit ? '<label class="er-field" style="padding:0 8px 8px">Icono de ' + esc(c.name) + '<select class="er-input" id="er-cat-icon">' + Object.keys(D.icons).map(function (k) {
          return '<option value="' + k + '"' + (c.icon === k ? ' selected' : '') + '>' + esc(D.icons[k]) + '</option>'; }).join('') + '</select></label>' : '') + '</div>';
      if (b) {
        var models = b.models.filter(function (m) { return mFilter === 'all' ? m.active : mFilter === 'nophoto' ? m.active && !m.image : !m.active; });
        var nNo = b.models.filter(function (m) { return m.active && !m.image; }).length, nOff = b.models.filter(function (m) { return !m.active; }).length;
        html += '<div class="er-ml"><div class="er-ml-h"><b>' + esc(b.name) + '</b><span class="er-muted er-small">' + b.models.length + ' modelos · ' + (b.models.length - nNo - nOff) + ' con foto</span><span class="er-grow"></span>' +
          '<a class="er-btn er-btn-sm er-btn-ghost" href="' + esc(E.boot.links.model + '&id_brand=' + b.id + '&id_model=0') + '">' + icon('book', true) + 'Ficha de la marca</a>' +
          (canEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost" data-ren="brand" data-id="' + b.id + '" data-name="' + esc(b.name) + '">' + icon('pen', true) + 'Renombrar</button>' +
            '<button type="button" class="er-btn er-btn-sm" data-act="brand" data-id="' + b.id + '" data-v="' + (b.active ? 0 : 1) + '">' + (b.active ? 'Ocultar marca' : 'Mostrar marca') + '</button>' : '') + '</div>' +
          '<div class="er-row er-ml-f">' + [['all', 'Todos'], ['nophoto', 'Sin foto ' + nNo], ['off', 'Ocultos ' + nOff]].map(function (f) {
            return '<button type="button" class="er-c2' + (mFilter === f[0] ? ' on' : '') + '" data-mf="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
          '<div class="er-mgrid">' + models.map(function (m) { return modelCard(m, b); }).join('') +
          (canEdit && mFilter === 'all' ? '<div class="er-mcard er-mcard-add"><input class="er-input" data-newname="model" maxlength="64" placeholder="Nuevo modelo"><button type="button" class="er-btn er-btn-sm er-btn-pri" data-add="model" data-parent="' + b.id + '">' + icon('plus', true) + 'Añadir modelo</button></div>' : '') +
          (!models.length && mFilter !== 'all' ? '<div class="er-empty">Ninguno.</div>' : '') + '</div></div>';
      } else {
        html += '<div class="er-ml"><div class="er-empty">Elige una marca a la izquierda o búscala arriba.</div></div>';
      }
      html += '</div>';
    }
    $('#er-cat-grid').innerHTML = html;
    var qi = $('#er-catq');
    if (qi && document.activeElement && document.activeElement.id === 'er-catq-was') { qi.focus(); }
    renderFaults();
  }
  /* Averías frecuentes (en Recepción) */
  function renderFaults() {
    var el = $('#er-flt');
    if (!el) return;
    if (!fltCat || !catalog.filter(function (x) { return x.id === fltCat; })[0]) fltCat = catalog[0] ? catalog[0].id : 0;
    var c = catalog.filter(function (x) { return x.id === fltCat; })[0];
    el.innerHTML = '<div class="er-cat-cats" style="margin-bottom:8px">' + catalog.map(function (x) {
      return '<button type="button" class="er-cchip' + (x.id === fltCat ? ' on' : '') + '" data-fcat="' + x.id + '">' + icon(x.icon || 'other', true) + esc(x.name) + '</button>'; }).join('') + '</div>' +
      (c ? column('Averías de ' + c.name, 'fault', c.faults, c.id, false, 0, null, 'Sin averías') : '');
  }
  function catalogCall(action, body) {
    return E.api(action, {}, body).then(function (res) {
      if (!res.ok) { E.toast(res.error || 'No se pudo guardar.', true); return false; }
      catalog = res.catalog;
      if (!cat()) sel.cat = catalog[0] ? catalog[0].id : 0;
      renderCatalog();
      countNoPhoto();
      return res;
    });
  }

  function catClick(e) {
    var t;
    if ((t = e.target.closest('[data-hit]'))) { var hp = t.getAttribute('data-hit').split(':'); sel.cat = +hp[0]; sel.brand = +hp[1]; catQ = ''; mFilter = 'all'; renderCatalog(); return; }
    if ((t = e.target.closest('[data-az]'))) { var el = $('#er-bl-list'), h = el && el.querySelector('[data-letter="' + t.getAttribute('data-az') + '"]'); if (h) el.scrollTop = h.offsetTop - el.offsetTop; return; }
    if ((t = e.target.closest('[data-mf]'))) { mFilter = t.getAttribute('data-mf'); renderCatalog(); return; }
    if ((t = e.target.closest('[data-fcat]'))) { fltCat = +t.getAttribute('data-fcat'); renderFaults(); return; }
    if ((t = e.target.closest('[data-sel]'))) {
      var type = t.getAttribute('data-sel'), id = +t.getAttribute('data-id');
      if (type === 'category') { sel.cat = id; sel.brand = 0; } else { sel.brand = id; }
      mFilter = 'all';
      renderCatalog();
      return;
    }
    if ((t = e.target.closest('[data-act]'))) {
      catalogCall('active', { type: t.getAttribute('data-act'), id: t.getAttribute('data-id'), active: t.getAttribute('data-v') });
      return;
    }
    if ((t = e.target.closest('[data-ren]'))) {
      var rtype = t.getAttribute('data-ren'), rid = t.getAttribute('data-id');
      E.dialog({ title: 'Cambiar nombre', input: true, inputLabel: 'Nombre', required: true, ok: 'Guardar', maxlength: 64 }).then(function (v) {
        if (v) catalogCall('rename', { type: rtype, id: rid, name: v }).then(function (res) { if (res) E.toast('Nombre cambiado'); });
      });
      var inp = app.querySelector('#er-dlg-in');
      if (inp) { inp.value = t.getAttribute('data-name'); inp.select(); }
      return;
    }
    if ((t = e.target.closest('[data-add]'))) { addItem(t.getAttribute('data-add'), +t.getAttribute('data-parent')); return; }
    if ((t = e.target.closest('[data-imgup]'))) { imgTarget = t.getAttribute('data-imgup'); $('#er-img-file').click(); return; }
    if ((t = e.target.closest('[data-imgdel]'))) { catalogCall('modelImage', { id: t.getAttribute('data-imgdel'), url: '' }).then(function (res) { if (res) E.toast('Foto quitada'); }); return; }
    if ((t = e.target.closest('[data-imgurl]'))) {
      var mid = t.getAttribute('data-imgurl');
      E.dialog({ title: 'Foto desde una dirección web', text: 'Pega la dirección (https://…) de una imagen del modelo.', input: true, inputLabel: 'Dirección de la imagen', required: true, ok: 'Guardar', maxlength: 255 }).then(function (url) {
        if (url) catalogCall('modelImage', { id: mid, url: url }).then(function (res) { if (res) E.toast('Foto guardada'); });
      });
    }
  }
  $('#er-cat-grid').addEventListener('click', catClick);
  if ($('#er-flt')) {
    $('#er-flt').addEventListener('click', catClick);
    $('#er-flt').addEventListener('keydown', function (e) {
      var inp = e.target.closest('[data-newname]');
      if (inp && e.key === 'Enter') { e.preventDefault(); var btn = inp.parentNode.querySelector('[data-add]'); addItem(btn.getAttribute('data-add'), +btn.getAttribute('data-parent')); }
    });
  }
  $('#er-cat-grid').addEventListener('input', function (e) {
    if (e.target.id !== 'er-catq') return;
    catQ = e.target.value.trim();
    var pos = e.target.selectionStart;
    renderCatalog();
    var qi = $('#er-catq'); qi.focus(); try { qi.setSelectionRange(pos, pos); } catch (er) {}
  });
  var imgTarget = 0;
  // Arrastrar la foto encima de la línea del modelo
  E.dropZone($('#er-cat-grid'), function (e) {
    var row = e.target.closest && e.target.closest('.er-mcard');
    var up = row ? row.querySelector('[data-imgup]') : null;
    if (!up || !canEdit) { E.toast('Suelta la foto encima de la tarjeta del modelo.', true); return null; }
    imgTarget = up.getAttribute('data-imgup');
    return $('#er-img-file');
  });
  app.addEventListener('change', function (e) {
    if (e.target.id !== 'er-img-file' || !e.target.files.length) return;
    var f = e.target.files[0];
    e.target.value = '';
    E.trimImage(f).then(function (t) { return E.shrinkImage(t, 800); }).then(function (small) {
      var fd = new FormData();
      fd.append('id', imgTarget);
      fd.append('image', small, small.name || 'foto.jpg');
      catalogCall('modelImage', fd).then(function (res) { if (res) E.toast('Foto guardada'); });
    });
  });
  $('#er-cat-grid').addEventListener('keydown', function (e) {
    var inp = e.target.closest('[data-newname]');
    if (inp && e.key === 'Enter') { e.preventDefault(); var btn = inp.parentNode.querySelector('[data-add]'); addItem(btn.getAttribute('data-add'), +btn.getAttribute('data-parent')); }
  });
  $('#er-cat-grid').addEventListener('change', function (e) {
    if (e.target.id === 'er-cat-icon') catalogCall('icon', { id: sel.cat, icon: e.target.value });
  });
  function addItem(type, parent) {
    var inp = app.querySelector('[data-newname="' + type + '"]');
    var name = inp ? inp.value.trim() : '';
    if (!name) { if (inp) inp.focus(); return; }
    catalogCall('add', { type: type, id_parent: parent, name: name, icon: 'other' }).then(function (res) {
      if (!res) return;
      if (type === 'category') sel.cat = res.id;
      if (type === 'brand') sel.brand = res.id;
      renderCatalog();
      var again = app.querySelector('[data-newname="' + type + '"]');
      if (again) again.focus();
      E.toast(res.existed ? '"' + res.name + '" ya existía: se ha vuelto a mostrar' : '"' + res.name + '" añadido');
    });
  }

  /* ---------- Personal del taller ---------- */
  var staff = D.staff || [];
  function renderStaff() {
    var el = $('#er-staff-list');
    if (!el) return;
    el.innerHTML = staff.length ? staff.map(function (p) {
      return '<div><span class="er-av" style="background:' + (p.active ? 'var(--er-pri)' : '#B7BDC8') + '">' + esc(E.initials(p.name)) + '</span>' +
        '<span class="er-grow"><b>' + esc(p.name) + '</b>' + (p.active ? '' : ' <span class="er-tag er-t-neu">Desactivado</span>') +
        '<span class="er-muted er-small" style="display:block">' + esc([p.role_tech ? 'Técnico' : '', p.role_reception ? 'Recepción' : ''].filter(Boolean).join(' y ') +
          ' · empleado: ' + (p.employee || '—') + (p.date_last ? ' · último acceso ' + E.fmtDateTime(p.date_last) : '')) + '</span></span>' +
        (canEdit ? '<button type="button" class="er-btn er-btn-sm" data-sedit="' + p.id + '">' + icon('pen', true) + 'Editar</button>' +
          '<button type="button" class="er-btn er-btn-sm er-btn-ghost" data-srevoke="' + p.id + '" title="Cierra la sesión en todos sus móviles">Cerrar sesiones</button>' +
          '<button type="button" class="er-btn er-btn-sm er-btn-ghost er-btn-danger er-icon-btn" data-sdel2="' + p.id + '" title="Borrar" aria-label="Borrar a ' + esc(p.name) + '">' + icon('x', true) + '</button>' : '') + '</div>';
    }).join('') : '<div class="er-muted" style="padding:12px">Aún no hay nadie. Añade a los técnicos y a recepción.</div>';
  }
  function staffDialog(p) {
    p = p || { active: 1, role_tech: 1 };
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg"><h2>' + (p.id ? 'Editar persona' : 'Añadir persona') + '</h2>' +
      '<label class="er-field">Nombre<input class="er-input" id="er-s-name" maxlength="64" value="' + esc(p.name || '') + '"></label>' +
      '<label class="er-field">Su empleado de PrestaShop (para asignaciones e informes)<select class="er-input" id="er-s-emp"><option value="0">Elige…</option>' +
        (p.id ? '' : '<option value="-1">+ Crear empleado nuevo para esta persona (no podrá entrar en PrestaShop)</option>') +
        (D.employees || []).map(function (e) { return '<option value="' + e.id + '"' + (e.id === p.id_employee ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="er-field">' + (p.id ? 'PIN nuevo (déjalo vacío para no cambiarlo)' : 'PIN (4 a 6 números)') + '<input class="er-input er-num" id="er-s-pin" inputmode="numeric" maxlength="6" autocomplete="new-password"></label>' +
      '<label class="er-toggle">Técnico<input type="checkbox" class="er-sw" id="er-s-tech"' + (p.role_tech ? ' checked' : '') + '></label>' +
      '<label class="er-toggle">Recepción<input type="checkbox" class="er-sw" id="er-s-rec"' + (p.role_reception ? ' checked' : '') + '></label>' +
      '<label class="er-toggle">Activo<input type="checkbox" class="er-sw" id="er-s-act"' + (p.active ? ' checked' : '') + '></label>' +
      '<div class="er-err" id="er-s-err" hidden></div>' +
      '<div class="er-dlg-act">' + (p.id ? '<button type="button" class="er-btn er-btn-ghost er-btn-danger" data-sdel>Borrar</button>' : '') +
        '<button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar</button></div></div>';
    app.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if (e.target.closest('[data-sdel]')) {
        E.dialog({ title: 'Borrar a ' + p.name, text: 'Ya no podrá entrar en la app. Su historial se conserva.', ok: 'Borrar', danger: true }).then(function (y) {
          if (y) E.api('staffDelete', {}, { id: p.id }).then(function (res) { staff = res.staff; renderStaff(); wrap.remove(); });
        });
        return;
      }
      var okBtn = e.target.closest('[data-ok]');
      if (!okBtn || okBtn.disabled) return;
      okBtn.disabled = true;
      okBtn.textContent = 'Guardando…';
      E.api('staffSave', {}, { id: p.id || 0, name: wrap.querySelector('#er-s-name').value, id_employee: wrap.querySelector('#er-s-emp').value,
        pin: wrap.querySelector('#er-s-pin').value, role_tech: wrap.querySelector('#er-s-tech').checked, role_reception: wrap.querySelector('#er-s-rec').checked,
        active: wrap.querySelector('#er-s-act').checked }).then(function (res) {
        okBtn.disabled = false;
        okBtn.textContent = 'Guardar';
        if (res.staff) { staff = res.staff; renderStaff(); }
        if (!res.ok) { var er = wrap.querySelector('#er-s-err'); er.textContent = res.error; er.hidden = false; E.toast(res.error, true); return; }
        wrap.remove(); E.toast('Guardado');
      });
    });
  }
  app.addEventListener('click', function (e) {
    var t;
    if (e.target.closest('#er-staff-add')) { staffDialog(); return; }
    if ((t = e.target.closest('[data-sedit]'))) { staffDialog(staff.filter(function (p) { return p.id === +t.getAttribute('data-sedit'); })[0]); return; }
    if ((t = e.target.closest('[data-sdel2]'))) {
      var sp = staff.filter(function (x) { return x.id === +t.getAttribute('data-sdel2'); })[0];
      E.dialog({ title: 'Borrar a ' + sp.name, text: 'Ya no podrá entrar en la app. Su historial se conserva.', ok: 'Borrar', danger: true }).then(function (y) {
        if (y) E.api('staffDelete', {}, { id: sp.id }).then(function (res) { if (res.staff) { staff = res.staff; renderStaff(); } E.toast('Borrado'); });
      });
      return;
    }
    if ((t = e.target.closest('[data-srevoke]'))) {
      E.api('staffRevoke', {}, { id: t.getAttribute('data-srevoke') }).then(function () { E.toast('Sesiones cerradas: tendrá que volver a poner su PIN'); });
    }
  });
  /* Hoja para imprimir y pegar en el taller */
  app.addEventListener('click', function (e) {
    if (!e.target.closest('#er-qr-print')) return;
    var svg = '';
    try { var q = window.qrcode(0, 'H'); q.addData(D.appUrl); q.make(); svg = q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); } catch (er) { }
    var w = window.open('', '_blank');
    if (!w) { E.toast('El navegador ha bloqueado la ventana. Permite las ventanas emergentes.', true); return; }
    w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>QR del taller</title><style>' +
      '@page{size:A4;margin:16mm}body{font-family:Arial,Helvetica,sans-serif;color:#14161A;text-align:center;margin:0}' +
      '.box{border:3px solid #0B6E4B;border-radius:24px;padding:14mm 12mm;max-width:150mm;margin:0 auto}' +
      'h1{font-size:30px;margin:0 0 4mm}h2{font-size:18px;font-weight:normal;color:#5B6170;margin:0 0 8mm}' +
      '.qr{width:110mm;height:110mm;margin:0 auto 8mm}.qr svg{width:100%;height:100%}' +
      'ol{text-align:left;font-size:16px;line-height:1.6;margin:0 auto;max-width:120mm}.url{font-size:13px;color:#5B6170;margin-top:6mm;word-break:break-all}' +
      '.np{margin:12px}.np button{font:600 16px Arial;padding:10px 20px;border-radius:10px;border:0;background:#0B6E4B;color:#fff;cursor:pointer}@media print{.np{display:none}}' +
      '</style></head><body><div class="np"><button onclick="window.print()">Imprimir</button></div><div class="box">' +
      '<h1>Taller · Acceso del personal</h1><h2>Escanéalo con tu móvil</h2><div class="qr">' + svg + '</div>' +
      '<ol><li>Escanea el código con la cámara del móvil.</li><li>Elige tu nombre y pon tu PIN.</li><li>Añade la página a la pantalla de inicio.</li>' +
      '<li>Después, escanea el QR de cada patinete para abrir su reparación.</li></ol>' +
      '<div class="url">' + esc(D.appUrl) + '</div></div><script>setTimeout(function(){window.print()},400)<\/script></body></html>');
    w.document.close();
  });
  (function () {
    var box = $('#er-app-qr');
    if (!box || !window.qrcode) return;
    try { var q = window.qrcode(0, 'M'); q.addData(D.appUrl); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (er) { }
  })();
  renderStaff();

  /* ---------- Fotos de los modelos ---------- */
  function countNoPhoto() {
    var n = 0, t = 0;
    catalog.forEach(function (c) { c.brands.forEach(function (b) { if (!b.active) return; b.models.forEach(function (m) { if (m.active) { t++; if (!m.image) n++; } }); }); });
    var el = $('#er-nophoto');
    if (el) el.innerHTML = n ? '<b>' + n + '</b> de ' + t + ' modelos sin foto. Busca en tu tienda o usa la lupa de cada modelo para buscar en Google.' : 'Todos los modelos tienen foto.';
  }
  var shopBtn = $('#er-shopimg');
  if (shopBtn) {
    shopBtn.addEventListener('click', function () {
      shopBtn.disabled = true;
      E.toast('Buscando en los productos de la tienda…');
      E.api('shopImages', {}, {}).then(function (res) {
        shopBtn.disabled = false;
        if (!res.ok) { E.toast(res.error, true); return; }
        var list = res.proposals || [];
        if (!list.length) { E.dialog({ title: 'Sin coincidencias', text: 'No he encontrado productos de la tienda con el nombre de los modelos que no tienen foto.' }); return; }
        var wrap = document.createElement('div');
        wrap.className = 'er-modal';
        wrap.innerHTML = '<div class="er-dlg" style="max-width:760px"><h2>Fotos encontradas en tu tienda (' + list.length + ')</h2>' +
          '<p class="er-muted" style="margin:0">Quita la marca de las que no cuadren y guarda.</p>' +
          '<div class="er-mini er-shopimg">' + list.map(function (p, i) {
            return '<label><input type="checkbox" data-i="' + i + '" checked><img src="' + esc(p.image) + '" alt="" loading="lazy">' +
              '<span class="er-grow" style="white-space:normal"><b>' + esc(p.model) + '</b><span class="er-muted er-small" style="display:block">Producto: ' + esc(p.product) + '</span></span></label>';
          }).join('') + '</div>' +
          '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar las marcadas</button></div></div>';
        app.appendChild(wrap);
        wrap.addEventListener('click', function (e) {
          if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
          if (!e.target.closest('[data-ok]')) return;
          var items = [];
          wrap.querySelectorAll('[data-i]:checked').forEach(function (c) { var p = list[+c.getAttribute('data-i')]; items.push({ id_model: p.id_model, image: p.image }); });
          catalogCall('applyShopImages', { items: JSON.stringify(items) }).then(function (r2) {
            if (!r2) return;
            wrap.remove();
            countNoPhoto();
            E.toast(r2.saved + ' fotos guardadas');
          });
        });
      });
    });
  }

  var importBtn = $('#er-import');
  if (importBtn) {
    importBtn.addEventListener('click', function () {
      importBtn.disabled = true;
      catalogCall('importCatalog', {}).then(function (res) {
        importBtn.disabled = false;
        if (res) E.toast('Añadidas ' + res.added.brands + ' marcas y ' + res.added.models + ' modelos');
      });
    });
  }

  /* ---------- Guardar ajustes ---------- */
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-mst],[data-tv]');
    if (b && canEdit) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
  });
  var saveBtn = $('#er-save-cfg');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      var out = {};
      app.querySelectorAll('[data-c]').forEach(function (el) { out[el.getAttribute('data-c')] = el.value; });
      app.querySelectorAll('[data-cb]').forEach(function (el) { out[el.getAttribute('data-cb')] = el.checked ? '1' : '0'; });
      if (D.isAdmin) out.ECOREPAIRS_TECHS_VIEWERS = Array.prototype.slice.call(app.querySelectorAll('[data-tv][aria-pressed="true"]')).map(function (b) { return b.getAttribute('data-tv'); }).join(',');
      out.ECOREPAIRS_EMAIL_STATUSES = Array.prototype.slice.call(app.querySelectorAll('[data-mst][aria-pressed="true"]')).map(function (b) { return b.getAttribute('data-mst'); }).join(',');
      var tpls = {};
      app.querySelectorAll('[data-tpl]').forEach(function (el) { tpls[el.getAttribute('data-tpl')] = el.value; });
      saveBtn.disabled = true;
      E.api('saveConfig', {}, { config: JSON.stringify(out), templates: JSON.stringify(tpls) }).then(function (res) {
        saveBtn.disabled = false;
        var err = $('#er-cfg-err');
        app.querySelectorAll('[data-c]').forEach(function (el) { el.classList.toggle('er-invalid', !!(res.errors && res.errors[el.getAttribute('data-c')])); });
        if (!res.ok) {
          err.textContent = res.error || Object.keys(res.errors || {}).map(function (k) { return res.errors[k]; }).join(' ');
          err.hidden = false;
          return;
        }
        err.hidden = true;
        cfg = res.config;
        fillConfig();
        E.toast('Ajustes guardados');
      });
    });
  }

  renderCatalog();
  fillConfig();
  countNoPhoto();
});
