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

  app.innerHTML =
    '<header class="er-head"><div class="er-brand"><div class="er-ico">' + icon('settings') + '</div><div><h1>Ajustes del taller</h1>' +
      '<p>Catálogo de equipos, datos del cliente, recepción e impresión</p></div></div>' +
      '<a class="er-btn" href="' + esc(E.boot.links.board) + '">' + icon('back') + 'Volver al tablero</a></header>' +
    (canEdit ? '' : '<div class="er-banner er-bad">Tu perfil solo puede ver los ajustes.</div>') +
    '<div class="er-stack">' +
      '<div class="er-panel"><h3>Categorías, marcas, modelos y averías<span class="er-r">Lo que se oculta deja de salir al crear reparaciones, pero no se borra</span></h3>' +
        '<div id="er-cat-grid" class="er-wide-2" style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))"></div>' +
        '<input type="file" id="er-img-file" accept="image/jpeg,image/png,image/webp" hidden>' +
        (canEdit ? '<div class="er-row"><button type="button" class="er-btn er-btn-pri" id="er-shopimg">' + icon('camera') + 'Buscar fotos en mi tienda</button>' +
          '<span class="er-muted er-small" id="er-nophoto"></span></div>' : '') +
        (canEdit ? '<div class="er-row"><button type="button" class="er-btn" id="er-import">' + icon('download') + 'Cargar marcas y modelos habituales</button>' +
          '<span class="er-muted er-small">Añade solo los que falten. No vuelve a mostrar lo que hayas ocultado.</span></div>' : '') + '</div>' +
      '<div class="er-grid2">' +
        '<div class="er-stack">' +
          '<div class="er-panel"><h3>Datos del cliente</h3>' +
            fieldRule('ECOREPAIRS_FIELD_PHONE', 'Teléfono') + fieldRule('ECOREPAIRS_FIELD_EMAIL', 'Email') +
            '<p class="er-muted er-small" style="margin:0">Nombre y apellidos son siempre obligatorios. Si el cliente quiere factura se piden NIF, dirección, código postal y ciudad.</p></div>' +
          '<div class="er-panel"><h3>Recepción</h3>' +
            '<label class="er-field">Lo que puede entregar con el equipo (uno por línea)<textarea class="er-input" data-c="ECOREPAIRS_ACCESSORIES" rows="5"' + dis + '></textarea></label>' +
            '<label class="er-field">Daños previos habituales (uno por línea)<textarea class="er-input" data-c="ECOREPAIRS_DAMAGES" rows="5"' + dis + '></textarea></label></div>' +
        '</div>' +
        '<div class="er-stack">' +
          '<div class="er-panel"><h3>Tablero</h3>' +
            '<label class="er-field">Avisar en rojo si lleva en el taller (días)<input class="er-input" data-c="ECOREPAIRS_LATE_DAYS" inputmode="numeric" maxlength="3"' + dis + '></label>' +
            '<label class="er-field">Marcar «sin recoger» si está listo desde hace (días)<input class="er-input" data-c="ECOREPAIRS_PICKUP_DAYS" inputmode="numeric" maxlength="3"' + dis + '></label></div>' +
          '<div class="er-panel"><h3>Presupuestos</h3>' +
            '<label class="er-field">Precio de la mano de obra (€/hora, IVA incluido)<input class="er-input" data-c="ECOREPAIRS_LABOUR_RATE" inputmode="decimal" maxlength="8"' + dis + '></label>' +
            '<label class="er-field">Validez del enlace de aceptación (días)<input class="er-input" data-c="ECOREPAIRS_QUOTE_DAYS" inputmode="numeric" maxlength="3"' + dis + '></label>' +
            '<label class="er-field">Condiciones del presupuesto<textarea class="er-input" data-c="ECOREPAIRS_QUOTE_CONDITIONS" rows="5"' + dis + '></textarea></label></div>' +
          '<div class="er-panel"><h3>Cobro</h3>' +
            '<label class="er-field">Transportista de los pedidos del taller (tiene que ser gratuito)<select class="er-input" data-c="ECOREPAIRS_CARRIER"' + dis + '><option value="0">Automático (el primero gratuito, «Recogida en tienda» si existe)</option>' +
              (D.carriers || []).map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + (c.free ? ' · gratuito' : ' · ¡cobra envío!') + '</option>'; }).join('') + '</select></label>' +
            '<p class="er-muted er-small" style="margin:0">Solo se usa en los pedidos que lleven piezas. La mano de obra va en el producto oculto «Servicio de taller».</p></div>' +
          '<div class="er-panel"><h3>Impresión</h3>' +
            '<label class="er-field">Resguardo<select class="er-input" data-c="ECOREPAIRS_PRINT_FORMAT"' + dis + '><option value="80mm">Ticket de 80 mm</option><option value="a4">A4</option></select></label>' +
            '<label class="er-field">Etiqueta del equipo<select class="er-input" data-c="ECOREPAIRS_LABEL_SIZE"' + dis + '><option value="62x29">62 × 29 mm</option><option value="50x25">50 × 25 mm</option><option value="62x100">62 × 100 mm</option></select></label>' +
            '<label class="er-field">Condiciones del resguardo<textarea class="er-input" data-c="ECOREPAIRS_CONDITIONS" rows="6"' + dis + '></textarea></label>' +
            '<p class="er-muted er-small" style="margin:0">Revisa este texto con tu gestor o asesor antes de usarlo.</p></div>' +
        '</div>' +
      '</div>' +
      (canEdit ? '<div class="er-row"><button type="button" class="er-btn er-btn-pri er-btn-lg" id="er-save-cfg">' + icon('check') + 'Guardar ajustes</button><span class="er-err" id="er-cfg-err" hidden></span></div>' : '') +
    '</div>';

  var $ = function (s) { return app.querySelector(s); };

  function fieldRule(key, label) {
    return '<label class="er-field">' + esc(label) + '<select class="er-input" data-c="' + key + '"' + dis + '><option value="req">Obligatorio</option><option value="opt">Opcional</option></select></label>';
  }

  function fillConfig() {
    app.querySelectorAll('[data-c]').forEach(function (el) {
      var k = el.getAttribute('data-c');
      if (cfg[k] !== undefined) el.value = cfg[k];
    });
  }

  /* ---------- Catálogo ---------- */
  function cat() { return catalog.filter(function (c) { return c.id === sel.cat; })[0] || null; }
  function brand() { var c = cat(); return c ? c.brands.filter(function (b) { return b.id === sel.brand; })[0] || null : null; }

  function row(type, item, selectable, selected, extra) {
    return '<div class="er-pick-row" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-top:1px solid var(--er-line2);' + (selected ? 'background:var(--er-pri-soft);' : '') + (item.active ? '' : 'opacity:.55;') + '">' +
      (selectable ? '<button type="button" class="er-btn er-btn-ghost er-btn-sm" style="flex:1;justify-content:flex-start;min-width:0" data-sel="' + type + '" data-id="' + item.id + '">' + (extra || '') + '<span style="overflow:hidden;text-overflow:ellipsis">' + esc(item.name) + '</span></button>'
                  : '<span style="flex:1;min-width:0;padding-left:12px;display:flex;align-items:center;gap:8px">' + (extra || '') + '<span style="overflow:hidden;text-overflow:ellipsis">' + esc(item.name) + '</span></span>') +
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

  function renderCatalog() {
    var c = cat(), b = brand();
    var html = column('Categorías', 'category', catalog, 0, true, sel.cat, function (it) { return icon(it.icon || 'other', true) + ' '; });
    if (c) {
      html += '<div class="er-stack" style="gap:12px">' + column('Marcas de ' + c.name, 'brand', c.brands, c.id, true, sel.brand, null, 'Sin marcas') +
        (canEdit ? '<label class="er-field">Icono de ' + esc(c.name) + '<select class="er-input" id="er-cat-icon">' + Object.keys(D.icons).map(function (k) {
          return '<option value="' + k + '"' + (c.icon === k ? ' selected' : '') + '>' + esc(D.icons[k]) + '</option>';
        }).join('') + '</select></label>' : '') + '</div>';
      html += b ? column('Modelos de ' + b.name, 'model', b.models, b.id, false, 0, function (it) {
          var src = E.modelImg(it.image);
          return src ? '<img class="er-mthumb" src="' + esc(src) + '" alt="">' : '<span class="er-mthumb er-mthumb-empty">' + icon('camera', true) + '</span>';
        }, 'Sin modelos')
                : '<div><div class="er-sub">Modelos</div><div class="er-empty">Elige una marca</div></div>';
      html += column('Averías frecuentes de ' + c.name, 'fault', c.faults, c.id, false, 0, null, 'Sin averías');
    }
    $('#er-cat-grid').innerHTML = html;
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

  $('#er-cat-grid').addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-sel]'))) {
      var type = t.getAttribute('data-sel'), id = +t.getAttribute('data-id');
      if (type === 'category') { sel.cat = id; sel.brand = 0; } else { sel.brand = id; }
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
  });
  var imgTarget = 0;
  app.addEventListener('change', function (e) {
    if (e.target.id !== 'er-img-file' || !e.target.files.length) return;
    var f = e.target.files[0];
    e.target.value = '';
    E.shrinkImage(f, 800).then(function (small) {
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
  var saveBtn = $('#er-save-cfg');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      var out = {};
      app.querySelectorAll('[data-c]').forEach(function (el) { out[el.getAttribute('data-c')] = el.value; });
      saveBtn.disabled = true;
      E.api('saveConfig', {}, { config: JSON.stringify(out) }).then(function (res) {
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
