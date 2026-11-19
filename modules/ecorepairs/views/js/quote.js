/* Reparaciones del taller · presupuesto */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'quote') return;

  var r = D.repair;
  var quotes = D.quotes || [];
  var kits = D.kits || [];
  var canEdit = !!D.canEdit, canDelete = !!D.canDelete;
  var TYPES = { part: 'Pieza', labour: 'Mano de obra', other: 'Otro' };
  var QCLS = { draft: 'er-t-neu', sent: 'er-t-warn', accepted: 'er-t-ok', rejected: 'er-t-bad', superseded: 'er-t-neu' };

  var selId = quotes.length ? quotes[quotes.length - 1].id : 0;
  var work = null;            // copia editable del borrador: { lines, notes }
  var saveTimer = null, saving = null, dirty = false;

  app.innerHTML =
    '<div class="er-f-head">' +
      '<a class="er-btn er-btn-ghost er-icon-btn" href="' + esc(D.repairUrl) + '" aria-label="Volver a la ficha">' + icon('back') + '</a>' +
      '<div class="er-f-title"><h1>Presupuesto</h1><span class="er-st-chip er-num">' + esc(r.reference) + '</span><span id="er-q-rst"></span></div>' +
      '<div class="er-muted" style="flex-basis:100%;margin-top:-8px">' + esc((r.category_name ? r.category_name + ' · ' : '') + r.device_name + ' · ' + (D.customer.name || r.customer_name)) + '</div>' +
    '</div>' +
    '<div id="er-q-tabs" class="er-filters"></div>' +
    '<div id="er-q-body"></div>';

  var $ = function (s) { return app.querySelector(s); };

  /* ---------- Utilidades ---------- */
  function num(v) {
    var n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  }
  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function fmtNum(n) { return String(r2(n)).replace('.', ','); }
  function current() { return quotes.filter(function (q) { return q.id === selId; })[0] || null; }
  function isLatest(q) {
    return !quotes.some(function (o) { return o.number === q.number && o.version > q.version; });
  }
  function openQuote() {
    return quotes.filter(function (q) { return q.status === 'draft' || q.status === 'sent'; })[0] || null;
  }
  function lastQuote() { return quotes.length ? quotes[quotes.length - 1] : null; }
  function qTag(q) { return '<span class="er-tag ' + (QCLS[q.status] || 'er-t-neu') + '">' + esc(q.expired ? 'Caducado' : q.status_name) + '</span>'; }

  function totals(lines) {
    var excl = 0, incl = 0, war = 0;
    lines.forEach(function (l) {
      var li = r2(num(l.qty) * num(l.price));
      if (l.warranty) { war += li; return; }
      incl += li;
      excl += r2(num(l.qty) * num(l.price) / (1 + num(l.tax_rate) / 100));
    });
    return { total_tax_excl: r2(excl), total_tax_incl: r2(incl), tax: r2(incl - excl), warranty_amount: r2(war) };
  }

  function pimg(src) {
    return src ? '<img class="er-pimg" src="' + esc(src) + '" alt="" loading="lazy" data-zoom="' + esc(src) + '">' : '<span class="er-pimg er-pimg-empty">' + icon('box', true) + '</span>';
  }

  function stockTag(stock, qty) {
    if (stock === null || stock === undefined) return '';
    if (stock <= 0) return '<span class="er-tag er-t-bad">Sin stock</span>';
    if (qty && stock < qty) return '<span class="er-tag er-t-warn">Solo ' + stock + ' en stock</span>';
    return '<span class="er-tag er-t-ok">' + stock + ' en stock</span>';
  }

  function applyResponse(res, selectId) {
    if (res.quotes) quotes = res.quotes;
    if (res.repair) r = res.repair;
    if (selectId) selId = selectId;
    if (!current()) selId = quotes.length ? quotes[quotes.length - 1].id : 0;
    work = null;
    render();
  }

  /* ---------- Guardado del borrador ---------- */
  function savedMark(text, on) {
    var s = $('#er-q-saved');
    if (!s) return;
    s.textContent = text;
    s.classList.toggle('er-on', !!on);
  }
  function scheduleSave() {
    dirty = true;
    savedMark('Sin guardar', true);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 700);
    renderTotals();
  }
  function payloadLines() {
    return work.lines.filter(function (l) { return String(l.name || '').trim() !== ''; }).map(function (l) {
      return { type: l.type, id_product: l.id_product || 0, id_product_attribute: l.id_product_attribute || 0, name: String(l.name).trim(),
        reference: l.reference || '', qty: num(l.qty), price: num(l.price), tax_rate: num(l.tax_rate), warranty: l.warranty ? 1 : 0 };
    });
  }
  /** Guarda si hay cambios. Resuelve true si todo quedó guardado. */
  function flush() {
    clearTimeout(saveTimer);
    var q = current();
    if (!work || !q || q.status !== 'draft') return Promise.resolve(true);
    if (saving) return saving.then(function () { return dirty ? flush() : true; });
    if (!dirty) return Promise.resolve(true);
    dirty = false;
    savedMark('Guardando…', true);
    var sentLines = payloadLines();
    saving = E.api('quoteSave', { id_quote: q.id }, { lines: JSON.stringify(sentLines), notes: work.notes }).then(function (res) {
      saving = null;
      if (!res.ok) {
        dirty = true;
        savedMark('No guardado', true);
        E.toast(res.error || 'No se pudo guardar.', true);
        return false;
      }
      q.totals = res.totals;
      q.notes = work.notes;
      if (!dirty) savedMark('Guardado', true);
      setTimeout(function () { if (!dirty) savedMark('Guardado', false); }, 1800);
      return !dirty;
    });
    return saving;
  }
  window.addEventListener('beforeunload', function (e) {
    if (dirty || saving) { flush(); e.preventDefault(); e.returnValue = ''; }
  });

  /* ---------- Pestañas de versiones ---------- */
  function renderTabs() {
    var rst = $('#er-q-rst');
    rst.innerHTML = E.statusChip(D.statuses, r.status);
    if (!quotes.length) { $('#er-q-tabs').innerHTML = ''; return; }
    $('#er-q-tabs').innerHTML = quotes.map(function (q) {
      return '<button type="button" class="er-chip" data-q="' + q.id + '" aria-pressed="' + (q.id === selId) + '">' +
        esc((q.number > 1 ? 'Adicional ' + q.number : 'Presupuesto') + ' · v' + q.version) + ' ' + qTag(q) + '</button>';
    }).join('');
  }
  $('#er-q-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]');
    if (!b) return;
    flush().then(function () { selId = +b.getAttribute('data-q'); work = null; render(); });
  });

  /* ---------- Pantalla ---------- */
  function render() {
    renderTabs();
    var q = current();
    if (!q) { renderEmpty(); return; }
    var editable = canEdit && q.status === 'draft';
    if (editable && !work) {
      work = { lines: q.lines.map(function (l) { return Object.assign({}, l); }), notes: q.notes || '' };
    }
    $('#er-q-body').innerHTML =
      '<div class="er-grid2">' +
        '<div class="er-stack">' +
          '<div class="er-panel" id="er-q-lines"></div>' +
          '<div class="er-panel" id="er-q-notes"></div>' +
        '</div>' +
        '<div class="er-stack">' +
          '<div class="er-panel" id="er-q-tot"></div>' +
          '<div class="er-panel" id="er-q-act"></div>' +
        '</div>' +
      '</div>';
    if (editable) renderEditor(q); else renderReadOnly(q);
    renderNotes(q, editable);
    renderTotals();
    renderActions(q);
  }

  function renderEmpty() {
    var closed = r.status === 'delivered' || r.status === 'cancelled';
    $('#er-q-body').innerHTML = '<div class="er-panel" style="max-width:640px">' +
      '<h3>' + icon('doc') + 'Sin presupuesto</h3>' +
      '<p class="er-muted" style="margin:0">Añade piezas del catálogo, mano de obra o un kit. Se puede editar hasta que el cliente lo acepta.</p>' +
      (canEdit && !closed ? '<div><button type="button" class="er-btn er-btn-pri er-btn-lg" id="er-q-create">' + icon('plus') + 'Crear presupuesto</button></div>'
        : '<p class="er-muted" style="margin:0">' + (closed ? 'La reparación está cerrada.' : 'Tu perfil solo puede consultar.') + '</p>') + '</div>';
  }

  /* ---------- Editor ---------- */
  function renderEditor(q) {
    $('#er-q-lines').innerHTML =
      '<h3>' + icon('doc') + esc(q.label) + '<span class="er-saved" id="er-q-saved">Guardado</span></h3>' +
      '<div class="er-qs">' +
        '<label class="er-search">' + icon('search') + '<input class="er-input" id="er-q-search" type="search" autocomplete="off" placeholder="Buscar pieza del catálogo: nombre, referencia o EAN" aria-label="Buscar pieza del catálogo"></label>' +
        '<div class="er-qs-res" id="er-q-res" hidden></div>' +
      '</div>' +
      '<div class="er-row">' +
        '<button type="button" class="er-btn" data-add="labour">' + icon('wrench') + 'Mano de obra</button>' +
        '<button type="button" class="er-btn" data-add="other">' + icon('plus') + 'Línea libre</button>' +
        '<button type="button" class="er-btn" id="er-q-kits">' + icon('layers') + 'Añadir kit</button>' +
        '<button type="button" class="er-btn er-btn-ghost" id="er-q-savekit"' + (work.lines.length ? '' : ' disabled') + '>Guardar como kit</button>' +
      '</div>' +
      '<div id="er-q-rows"></div>';
    renderRows();
  }

  function renderRows() {
    var rows = $('#er-q-rows');
    if (!work.lines.length) {
      rows.innerHTML = '<div class="er-empty">Sin líneas. Busca una pieza o añade mano de obra.</div>';
      return;
    }
    rows.innerHTML = '<div class="er-ql er-ql-h" aria-hidden="true"><span>Concepto</span><span>Cant.</span><span>Precio IVA incl.</span><span>IVA</span><span>Garantía</span><span class="er-ql-t">Importe</span><span></span></div>' +
      work.lines.map(function (l, i) {
        return '<div class="er-ql' + (l.warranty ? ' er-ql-war' : '') + '" data-i="' + i + '">' +
          '<div class="er-ql-name"><span class="er-row" style="flex-wrap:nowrap">' + (l.type === 'part' ? pimg(l.image) : '') + '<span class="er-tag er-t-neu">' + esc(TYPES[l.type] || 'Otro') + '</span></span>' +
            '<input class="er-input" data-k="name" maxlength="128" value="' + esc(l.name) + '" placeholder="Descripción" aria-label="Descripción">' +
            '<div class="er-row er-small">' + (l.reference ? '<span class="er-muted">Ref. ' + esc(l.reference) + '</span>' : '') + stockTag(l.stock, num(l.qty)) + '</div></div>' +
          '<label class="er-ql-f"><span>Cant.' + (l.type === 'labour' ? ' (h)' : '') + '</span><input class="er-input er-num" data-k="qty" inputmode="decimal" value="' + esc(fmtNum(num(l.qty))) + '" aria-label="Cantidad"></label>' +
          '<label class="er-ql-f"><span>Precio IVA incl.</span><input class="er-input er-num" data-k="price" inputmode="decimal" value="' + esc(num(l.price).toFixed(2).replace('.', ',')) + '" aria-label="Precio con IVA"></label>' +
          '<label class="er-ql-f"><span>IVA</span><select class="er-input" data-k="tax_rate" aria-label="IVA">' + D.taxRates.map(function (t) {
            return '<option value="' + t + '"' + (num(l.tax_rate) === t ? ' selected' : '') + '>' + t + ' %</option>';
          }).join('') + '</select></label>' +
          '<label class="er-ql-f er-ql-w"><span>Garantía</span><input type="checkbox" class="er-sw er-sw-gar" data-k="warranty"' + (l.warranty ? ' checked' : '') + ' aria-label="Cubierto por garantía"></label>' +
          '<div class="er-ql-t er-num" data-total>' + lineTotal(l) + '</div>' +
          '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-del aria-label="Quitar línea">' + icon('trash') + '</button>' +
        '</div>';
      }).join('');
  }
  function lineTotal(l) {
    var t = r2(num(l.qty) * num(l.price));
    return l.warranty ? '<s class="er-muted">' + esc(E.fmtMoney(t)) + '</s><br><span class="er-small">Garantía</span>' : esc(E.fmtMoney(t));
  }

  function addLine(l, focusName) {
    work.lines.push(l);
    renderRows();
    var sk = $('#er-q-savekit'); if (sk) sk.disabled = false;
    if (focusName) {
      var inputs = app.querySelectorAll('.er-ql [data-k="name"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }
    scheduleSave();
  }

  app.addEventListener('input', function (e) {
    var row = e.target.closest('.er-ql[data-i]');
    if (!row || !work) return;
    var l = work.lines[+row.getAttribute('data-i')], k = e.target.getAttribute('data-k');
    if (!l || !k || k === 'warranty' || k === 'tax_rate') return;
    l[k] = e.target.value;
    row.querySelector('[data-total]').innerHTML = lineTotal(l);
    scheduleSave();
  });
  app.addEventListener('change', function (e) {
    var row = e.target.closest('.er-ql[data-i]');
    if (!row || !work) return;
    var l = work.lines[+row.getAttribute('data-i')], k = e.target.getAttribute('data-k');
    if (!l || !k) return;
    if (k === 'warranty') { l.warranty = e.target.checked ? 1 : 0; row.classList.toggle('er-ql-war', !!l.warranty); }
    else if (k === 'tax_rate') l.tax_rate = num(e.target.value);
    else if (k === 'qty' || k === 'price') {
      var v = num(e.target.value);
      if (k === 'qty' && v <= 0) { v = 1; }
      if (v < 0) v = 0;
      l[k] = v;
      e.target.value = k === 'qty' ? fmtNum(v) : v.toFixed(2).replace('.', ',');
    }
    row.querySelector('[data-total]').innerHTML = lineTotal(l);
    scheduleSave();
  });

  app.addEventListener('click', function (e) {
    var t;
    if (e.target.closest('#er-q-create')) { createQuote(); return; }
    if ((t = e.target.closest('.er-ql [data-zoom], .er-mini [data-zoom]'))) { E.viewer([{ src: t.getAttribute('data-zoom').replace(/small_default/, 'large_default') }], 0); return; }
    if (!work) return;
    if ((t = e.target.closest('[data-del]'))) {
      var i = +t.closest('.er-ql').getAttribute('data-i');
      work.lines.splice(i, 1);
      renderRows();
      scheduleSave();
      return;
    }
    if ((t = e.target.closest('[data-add]'))) {
      var type = t.getAttribute('data-add');
      if (type === 'labour') addLine({ type: 'labour', name: 'Mano de obra', qty: 1, price: D.labourRate || 0, tax_rate: 21, warranty: 0 }, false);
      else addLine({ type: 'other', name: '', qty: 1, price: 0, tax_rate: 21, warranty: 0 }, true);
      return;
    }
    if ((t = e.target.closest('[data-pick]'))) {
      var p = searchResults[+t.getAttribute('data-pick')];
      if (!p) return;
      addLine({ type: 'part', id_product: p.id_product, id_product_attribute: p.id_product_attribute, name: p.name, reference: p.reference,
        qty: 1, price: p.price, tax_rate: p.tax_rate, warranty: r.warranty ? 1 : 0, stock: p.stock, image: p.image }, false);
      if (p.stock <= 0) E.toast('Esa pieza no tiene stock: habrá que pedirla.', true);
      var s = $('#er-q-search'); s.value = ''; hideResults(); s.focus();
      return;
    }
    if (e.target.closest('#er-q-kits')) { kitsDialog(); return; }
    if (e.target.closest('#er-q-savekit')) { saveKitDialog(); return; }
    if (!e.target.closest('.er-qs')) hideResults();
  });

  /* ---------- Buscador del catálogo ---------- */
  var searchResults = [], searchTimer = null, searchSeq = 0;
  function hideResults() { var res = $('#er-q-res'); if (res) res.hidden = true; }
  app.addEventListener('input', function (e) {
    if (e.target.id !== 'er-q-search') return;
    var v = e.target.value.trim();
    clearTimeout(searchTimer);
    if (v.length < 2) { hideResults(); return; }
    searchTimer = setTimeout(function () {
      var seq = ++searchSeq;
      E.api('searchProducts', { q: v, id_ecorepair: r.id }).then(function (res) {
        if (seq !== searchSeq) return;
        var box = $('#er-q-res');
        if (!box) return;
        searchResults = res.ok ? res.products : [];
        box.hidden = false;
        if (!res.ok) { box.innerHTML = '<div class="er-muted er-small" style="padding:12px">' + esc(res.error) + '</div>'; return; }
        box.innerHTML = searchResults.length ? searchResults.map(function (p, i) {
          return '<button type="button" data-pick="' + i + '">' + pimg(p.image) + '<span class="er-grow"><b>' + esc(p.name) + '</b>' +
            '<span class="er-row er-small er-muted">' + (p.reference ? 'Ref. ' + esc(p.reference) : '') + (p.active ? '' : ' · No visible en la tienda') + '</span></span>' +
            stockTag(p.stock) + '<b class="er-num">' + esc(E.fmtMoney(p.price)) + '</b></button>';
        }).join('') : '<div class="er-muted er-small" style="padding:12px">Nada encontrado. Usa «Línea libre» si la pieza no está en el catálogo.</div>';
      });
    }, 250);
  });
  app.addEventListener('keydown', function (e) {
    if (e.target.id === 'er-q-search' && e.key === 'Enter') {
      e.preventDefault();
      var first = app.querySelector('#er-q-res:not([hidden]) [data-pick]');
      if (first) first.click();
    }
    if (e.target.id === 'er-q-search' && e.key === 'Escape') hideResults();
  });

  /* ---------- Kits ---------- */
  function kitsDialog() {
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    function body() {
      var mine = kits.filter(function (k) { return !k.id_category || k.id_category === r.id_category; });
      var other = kits.filter(function (k) { return k.id_category && k.id_category !== r.id_category; });
      function list(arr) {
        return arr.map(function (k) {
          return '<div><span class="er-grow"><b>' + esc(k.name) + '</b><span class="er-muted er-small" style="display:block">' +
            esc((k.category_name || 'Todas las categorías') + ' · ' + k.lines.map(function (l) { return l.name; }).join(', ')) + '</span></span>' +
            '<b class="er-num">' + esc(E.fmtMoney(k.total)) + '</b>' +
            (canDelete ? '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-kdel="' + k.id + '" aria-label="Quitar kit">' + icon('trash', true) + '</button>' : '') +
            '<button type="button" class="er-btn er-btn-sm er-btn-pri" data-kadd="' + k.id + '">Añadir</button></div>';
        }).join('');
      }
      return '<div class="er-dlg" style="max-width:640px"><h2>Añadir kit</h2>' +
        (kits.length ? (mine.length ? '<div class="er-sub">' + esc(r.category_name || 'Este equipo') + '</div><div class="er-mini">' + list(mine) + '</div>' : '') +
          (other.length ? '<div class="er-sub">Otras categorías</div><div class="er-mini">' + list(other) + '</div>' : '')
          : '<div class="er-empty">Aún no hay kits. Monta un presupuesto y pulsa «Guardar como kit».</div>') +
        '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cerrar</button></div></div>';
    }
    wrap.innerHTML = body();
    app.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      var t;
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if ((t = e.target.closest('[data-kadd]'))) {
        var k = kits.filter(function (x) { return x.id === +t.getAttribute('data-kadd'); })[0];
        if (!k) return;
        k.lines.forEach(function (l) {
          work.lines.push({ type: l.type, id_product: l.id_product, id_product_attribute: l.id_product_attribute, name: l.name, reference: l.reference,
            qty: l.qty, price: l.price, tax_rate: l.tax_rate, warranty: r.warranty ? 1 : 0, stock: l.stock, image: l.image });
        });
        wrap.remove();
        renderRows();
        scheduleSave();
        var noStock = k.lines.filter(function (l) { return l.stock !== null && l.stock !== undefined && l.stock < l.qty; }).length;
        E.toast('Kit «' + k.name + '» añadido' + (noStock ? ' · ' + noStock + ' pieza(s) sin stock suficiente' : ''), !!noStock);
        return;
      }
      if ((t = e.target.closest('[data-kdel]'))) {
        var id = t.getAttribute('data-kdel');
        E.dialog({ title: 'Quitar kit', text: 'Dejará de salir en la lista. Los presupuestos ya hechos no cambian.', ok: 'Quitar', danger: true }).then(function (yes) {
          if (!yes) return;
          E.api('kitDelete', { id_kit: id }, {}).then(function (res) {
            if (!res.ok) { E.toast(res.error, true); return; }
            kits = res.kits;
            wrap.innerHTML = body();
          });
        });
      }
    });
  }

  function saveKitDialog() {
    var lines = payloadLines();
    if (!lines.length) { E.toast('Añade líneas antes de guardar el kit.', true); return; }
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg"><h2>Guardar como kit</h2>' +
      '<p class="er-muted" style="margin:0">Se guardan las ' + lines.length + ' líneas actuales. Las piezas del catálogo se añadirán con su precio del momento.</p>' +
      '<label class="er-field">Nombre del kit<input class="er-input" id="er-kit-name" maxlength="96" placeholder="Ej.: Cambio de cámara trasera"></label>' +
      '<label class="er-field">Para<select class="er-input" id="er-kit-cat"><option value="0">Todas las categorías</option>' +
        D.categories.map(function (c) { return '<option value="' + c.id + '"' + (c.id === r.id_category ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
      '<div class="er-err" id="er-kit-err" hidden></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar kit</button></div></div>';
    app.appendChild(wrap);
    wrap.querySelector('#er-kit-name').focus();
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if (!e.target.closest('[data-ok]')) return;
      var name = wrap.querySelector('#er-kit-name').value.trim();
      var err = wrap.querySelector('#er-kit-err');
      if (!name) { err.textContent = 'Escribe el nombre.'; err.hidden = false; return; }
      E.api('kitSave', {}, { name: name, id_category: wrap.querySelector('#er-kit-cat').value, lines: JSON.stringify(lines) }).then(function (res) {
        if (!res.ok) { err.textContent = res.error; err.hidden = false; return; }
        kits = res.kits;
        wrap.remove();
        E.toast('Kit «' + name + '» guardado');
      });
    });
  }

  /* ---------- Solo lectura ---------- */
  function renderReadOnly(q) {
    var lock = q.status === 'accepted' ? '<span class="er-r">' + icon('lock', true) + ' Bloqueado</span>' : '<span class="er-r">' + qTag(q) + '</span>';
    $('#er-q-lines').innerHTML = '<h3>' + icon('doc') + esc(q.label) + lock + '</h3>' +
      (q.lines.length ? '<div class="er-mini">' + q.lines.map(function (l) {
        return '<div>' + (l.type === 'part' ? pimg(l.image) : '') + '<span class="er-grow" style="white-space:normal"><b>' + esc(l.name) + '</b>' + (l.warranty ? ' <span class="er-tag er-t-gar">Garantía</span>' : '') +
          '<span class="er-muted er-small" style="display:block">' + esc(TYPES[l.type] + (l.reference ? ' · Ref. ' + l.reference : '') + ' · ' + fmtNum(l.qty) + (l.type === 'labour' ? ' h' : ' ud.') + ' × ' + E.fmtMoney(l.price) + ' · IVA ' + l.tax_rate + ' %') + '</span></span>' +
          '<b class="er-num">' + (l.warranty ? '<s class="er-muted">' + esc(E.fmtMoney(l.total)) + '</s>' : esc(E.fmtMoney(l.total))) + '</b></div>';
      }).join('') + '</div>' : '<div class="er-empty">Sin líneas</div>');
  }

  function renderNotes(q, editable) {
    $('#er-q-notes').innerHTML = '<h3>Observaciones para el cliente</h3>' +
      (editable ? '<textarea class="er-input" id="er-q-notes-in" maxlength="3000" placeholder="Opcional. Sale en el presupuesto impreso y en el enlace.">' + esc(work.notes) + '</textarea>'
        : (q.notes ? '<div style="white-space:pre-wrap">' + esc(q.notes) + '</div>' : '<span class="er-muted">Sin observaciones</span>'));
  }
  app.addEventListener('input', function (e) {
    if (e.target.id !== 'er-q-notes-in' || !work) return;
    work.notes = e.target.value;
    scheduleSave();
  });

  /* ---------- Totales ---------- */
  function renderTotals() {
    var q = current(), el = $('#er-q-tot');
    if (!q || !el) return;
    var t = work && q.status === 'draft' ? totals(work.lines) : q.totals;
    el.innerHTML = '<h3>Total</h3>' +
      '<div class="er-qt"><span class="er-muted">Base imponible</span><span class="er-num">' + esc(E.fmtMoney(t.total_tax_excl)) + '</span></div>' +
      '<div class="er-qt"><span class="er-muted">IVA</span><span class="er-num">' + esc(E.fmtMoney(t.tax)) + '</span></div>' +
      (t.warranty_amount > 0 ? '<div class="er-qt"><span class="er-muted">Cubierto por garantía</span><span class="er-num" style="color:var(--er-gar-fg)">' + esc(E.fmtMoney(t.warranty_amount)) + '</span></div>' : '') +
      '<div class="er-qt er-qt-big"><span>Total cliente</span><span class="er-num">' + esc(E.fmtMoney(t.total_tax_incl)) + '</span></div>';
  }

  /* ---------- Acciones ---------- */
  function renderActions(q) {
    var printUrl = E.ajaxUrl('printQuote', { id_quote: q.id });
    var latest = isLatest(q), b = '', info = '';
    if (q.status === 'sent') {
      info = '<div class="er-banner ' + (q.expired ? 'er-bad' : 'er-warn') + '" style="margin:0">' + icon(q.expired ? 'alert' : 'send') + '<div>' +
        (q.expired ? '<b>Caducó el ' + esc(E.fmtDate(q.date_expire)) + '.</b> Haz una versión nueva para renovarlo.'
                   : '<b>Esperando respuesta del cliente.</b> Válido hasta el ' + esc(E.fmtDate(q.date_expire)) + '.') + '</div></div>' +
        '<div class="er-row" style="flex-wrap:nowrap"><input class="er-input" readonly value="' + esc(q.link) + '" aria-label="Enlace del presupuesto" id="er-q-link"><button type="button" class="er-btn er-icon-btn" id="er-q-copy" aria-label="Copiar enlace">' + icon('copy') + '</button></div>' +
        '<p class="er-muted er-small" style="margin:0">El envío por WhatsApp y email se añade en la fase 4. Mientras, copia el enlace.</p>';
    } else if (q.status === 'accepted') {
      info = '<div class="er-banner er-ok" style="margin:0">' + icon('check') + '<div><b>Aceptado el ' + esc(E.fmtDateTime(q.date_answer)) + '</b><br>' +
        esc(q.channel === 'store' ? 'En tienda' + (q.accepted_by ? ' · atendió ' + q.accepted_by : '') : 'Desde el enlace · IP ' + q.ip) + '</div></div>' +
        (q.id_photo_signature ? '<img class="er-sig-img" src="' + esc(E.ajaxUrl('photo', { id_photo: q.id_photo_signature, thumb: 0 })) + '" alt="Firma de aceptación">' : '') +
        '<p class="er-muted er-small" style="margin:0">' + icon('lock', true) + ' Bloqueado. Los trabajos nuevos van en un presupuesto adicional.</p>';
    } else if (q.status === 'rejected') {
      info = '<div class="er-banner er-bad" style="margin:0">' + icon('x') + '<div><b>Rechazado el ' + esc(E.fmtDateTime(q.date_answer)) + '</b> ' +
        esc(q.channel === 'store' ? '(en tienda)' : '(desde el enlace)') + (q.answer_note ? '<br>' + esc(q.answer_note) : '') + '</div></div>';
    } else if (q.status === 'superseded') {
      info = '<div class="er-banner" style="margin:0;background:var(--er-line2)">' + icon('layers') + '<div>Sustituido por una versión posterior. Su enlace ya no admite respuesta.</div></div>';
    }

    if (canEdit) {
      if (q.status === 'draft') {
        b += '<button type="button" class="er-btn er-btn-pri er-btn-lg" data-qa="send">' + icon('send') + 'Enviar al cliente</button>';
        b += '<button type="button" class="er-btn er-btn-lg" data-qa="accept">' + icon('pen') + 'Aprobado en tienda</button>';
        b += '<button type="button" class="er-btn er-btn-lg" data-qa="reject">' + icon('x') + 'Rechazado en tienda</button>';
      } else if (q.status === 'sent') {
        if (!q.expired) b += '<button type="button" class="er-btn er-btn-pri er-btn-lg" data-qa="accept">' + icon('pen') + 'Aprobado en tienda</button>';
        if (!q.expired) b += '<button type="button" class="er-btn er-btn-lg" data-qa="reject">' + icon('x') + 'Rechazado en tienda</button>';
        if (latest) b += '<button type="button" class="er-btn er-btn-lg" data-qa="version">' + icon('pen') + 'Modificar (versión nueva)</button>';
      } else if (q.status === 'rejected' && latest) {
        b += '<button type="button" class="er-btn er-btn-lg" data-qa="version">' + icon('pen') + 'Hacer versión nueva</button>';
      } else if (q.status === 'accepted' && !openQuote() && lastQuote() && lastQuote().status === 'accepted' && r.status !== 'delivered' && r.status !== 'cancelled') {
        b += '<button type="button" class="er-btn er-btn-lg" data-qa="additional">' + icon('plus') + 'Presupuesto adicional</button>';
      }
    }
    b += '<a class="er-btn er-btn-lg" href="' + esc(printUrl) + '" target="_blank" rel="noopener">' + icon('print') + 'Imprimir</a>';
    if (canEdit && q.status === 'draft') b += '<button type="button" class="er-btn er-btn-lg er-btn-ghost er-btn-danger" data-qa="discard">' + icon('trash') + 'Descartar borrador</button>';

    $('#er-q-act').innerHTML = '<h3>' + esc(q.status_name) + '</h3>' + info + '<div class="er-move">' + b + '</div>';
  }

  function validateLocal() {
    var empty = work && work.lines.some(function (l) { return !String(l.name || '').trim(); });
    if (empty) { E.toast('Hay líneas sin descripción: escríbela o quítalas.', true); return false; }
    if (work && !work.lines.length) { E.toast('Añade al menos una línea.', true); return false; }
    return true;
  }

  function call(action, params, body, selectNew) {
    return E.api(action, params, body).then(function (res) {
      if (!res.ok) { E.toast(res.error || 'No se pudo completar.', true); if (res.quotes) applyResponse(res); return null; }
      applyResponse(res, selectNew ? res.id : null);
      return res;
    });
  }

  function createQuote() {
    return call('quoteCreate', { id_ecorepair: r.id }, {}, true).then(function (res) {
      if (res) { var s = $('#er-q-search'); if (s) s.focus(); } else render();
      return res;
    });
  }

  app.addEventListener('click', function (e) {
    if (e.target.closest('#er-q-copy')) {
      var url = $('#er-q-link').value;
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(function () { E.toast('Enlace copiado'); });
      else { $('#er-q-link').select(); try { document.execCommand('copy'); E.toast('Enlace copiado'); } catch (er) { } }
      return;
    }
    var a = e.target.closest('[data-qa]');
    if (!a) return;
    var q = current(), act = a.getAttribute('data-qa');
    if (!q) return;

    if (act === 'additional') { call('quoteCreate', { id_ecorepair: r.id }, {}, true); return; }
    if (act === 'version') {
      E.dialog({ title: 'Versión nueva', text: q.status === 'sent' ? 'El enlace enviado dejará de admitir respuesta. Tendrás que enviar la versión nueva.' : 'Se copian las líneas para que las cambies.', ok: 'Crear versión' }).then(function (yes) {
        if (yes) call('quoteNewVersion', { id_quote: q.id }, {}, true);
      });
      return;
    }
    if (act === 'discard') {
      E.dialog({ title: 'Descartar borrador', text: q.version > 1 ? 'Se borra esta versión y vuelve a valer la anterior.' : 'Se borra el borrador.', ok: 'Descartar', danger: true }).then(function (yes) {
        if (!yes) return;
        clearTimeout(saveTimer); dirty = false;
        call('quoteDiscard', { id_quote: q.id }, {});
      });
      return;
    }
    if (act === 'reject') {
      flush().then(function () {
        return E.dialog({ title: 'Rechazado en tienda', text: 'El cliente no quiere hacer la reparación. El presupuesto queda cerrado.', input: true, multiline: true, inputLabel: 'Motivo (opcional)', ok: 'Marcar rechazado', danger: true, maxlength: 255 });
      }).then(function (reason) {
        if (reason === null || reason === undefined) return;
        call('quoteReject', { id_quote: q.id }, { reason: reason }).then(function (res) { if (res) E.toast('Presupuesto rechazado'); });
      });
      return;
    }
    if (act === 'send') {
      if (!validateLocal()) return;
      flush().then(function (ok) {
        if (!ok) return null;
        return E.dialog({ title: 'Enviar al cliente', text: 'Se crea el enlace para que acepte o rechace. Desde ahora no se puede editar: si cambia algo, se hace una versión nueva.', ok: 'Crear enlace' });
      }).then(function (yes) {
        if (!yes) return;
        call('quoteSend', { id_quote: q.id }, {}).then(function (res) {
          if (res) E.toast('Enlace creado: cópialo y envíaselo al cliente');
        });
      });
      return;
    }
    if (act === 'accept') {
      if (q.status === 'draft' && !validateLocal()) return;
      flush().then(function (ok) { if (ok) acceptDialog(current()); });
    }
  });

  function acceptDialog(q) {
    var t = q.totals;
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg"><h2>Aprobado en tienda</h2>' +
      '<p style="margin:0">El cliente acepta <b>' + esc(q.label) + '</b> por <b class="er-num">' + esc(E.fmtMoney(t.total_tax_incl)) + '</b> (IVA incluido).</p>' +
      '<p class="er-muted er-small" style="margin:0">Después queda bloqueado. Firma del cliente:</p>' +
      '<canvas class="er-sig" id="er-qsig" aria-label="Firma"></canvas>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-clear>Borrar</button><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Confirmar aceptación</button></div></div>';
    app.appendChild(wrap);
    var pad = E.signaturePad(wrap.querySelector('#er-qsig'));
    wrap.addEventListener('click', function (ev) {
      if (ev.target === wrap || ev.target.closest('[data-x]')) { wrap.remove(); return; }
      if (ev.target.closest('[data-clear]')) { pad.clear(); return; }
      var ok = ev.target.closest('[data-ok]');
      if (!ok) return;
      if (pad.isEmpty()) { E.toast('Falta la firma del cliente.', true); return; }
      ok.disabled = true;
      call('quoteAccept', { id_quote: q.id }, { signature: pad.toDataURL() }).then(function (res) {
        ok.disabled = false;
        if (!res) return;
        wrap.remove();
        E.toast('Presupuesto aceptado · reparación en marcha');
      });
    });
  }

  // Desde «Crear presupuesto» de la ficha: se crea directamente y se abre el editor
  var wantsCreate = /[?&]create=1/.test(location.search);
  if (wantsCreate) {
    try { history.replaceState(null, '', location.href.replace(/&create=1/, '')); } catch (e) {}
  }
  if (wantsCreate && !quotes.length && canEdit && r.status !== 'delivered' && r.status !== 'cancelled') {
    $('#er-q-body').innerHTML = '<div class="er-empty">Creando presupuesto…</div>';
    createQuote();
  } else {
    render();
  }
});
