/* Reparaciones del taller · ficha técnica de marca o modelo: códigos de error, menú y parámetros, fallos y soluciones */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'model') return;

  var kb = D.kb, tab = D.tab === 'parts' ? 'parts' : 'codes', q = D.code || '', canEdit = !!D.canEdit, canDelete = !!D.canDelete;
  var parts = D.parts || [], incompat = D.incompat || [];
  var title = D.brand + (D.model ? ' ' + D.model : '');

  function base() { return E.boot.links.model + '&id_brand=' + D.id_brand; }

  function render() {
    app.innerHTML =
      '<div class="er-f-head">' +
        '<a class="er-btn er-btn-ghost er-icon-btn" href="javascript:history.back()" aria-label="Volver">' + icon('back') + '</a>' +
        (D.image ? '<span class="er-f-cover"><img src="' + esc(D.image) + '" alt=""></span>' : '') +
        '<div class="er-f-title"><h1>' + esc(title) + '</h1><span class="er-st-chip">' + (D.model ? 'Ficha del modelo' : 'Ficha de la marca · vale para todos sus modelos') + '</span></div>' +
        '<label class="er-field" style="min-width:220px">Ver otro modelo<select class="er-input" id="er-m-sel"><option value="0">Toda la marca ' + esc(D.brand) + '</option>' +
          D.models.map(function (m) { return '<option value="' + m.id + '"' + (m.id === D.id_model ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></label>' +
      '</div>' +
      '<div class="er-filters">' + [['parts', 'Piezas', parts.length], ['codes', 'Códigos de error', kb.codes.length], ['params', 'Menú y parámetros', kb.params.length + kb.menu.length], ['faults', 'Fallos y soluciones', kb.faults.length]].map(function (t) {
        return '<button type="button" class="er-chip" data-tab="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '<span class="er-n">' + t[2] + '</span></button>';
      }).join('') + '</div>' +
      '<div class="er-panel" id="er-kb"></div>';
    var el = app.querySelector('#er-kb');
    if (tab === 'parts') {
      el.innerHTML = '<h3>' + icon('box') + 'Piezas de ' + esc(title) + '<span class="er-r">Pulsa una zona del dibujo</span></h3><div id="er-dwp"></div>';
      E.PartsDiagram(el.querySelector('#er-dwp'), { parts: parts, zones: D.zones, shape: D.shape, admin: !!D.isAdmin, incompat: incompat,
        onIncompat: canEdit ? function () {
          E.incompatDialog({ title: title, canBrand: !!D.id_model, onSave: function (d) {
            return E.api('incompatSave', {}, { id_brand: D.id_brand, id_model: d.all_brand ? 0 : D.id_model, view_model: D.id_model, data: JSON.stringify(d) }).then(function (res) {
              if (res.ok) { incompat = res.incompat; render(); }
              return res;
            });
          } });
        } : null,
        onIncompatDelete: canDelete ? function (id) {
          E.api('incompatDelete', {}, { id: id, id_brand: D.id_brand, id_model: D.id_model }).then(function (res) { incompat = res.incompat || []; render(); });
        } : null,
        onEdit: canEdit ? function (p, zone) {
          E.partDialog(p, zone, { zones: D.zones, admin: !!D.isAdmin, canDelete: canDelete, id_brand: D.id_brand, id_model: D.id_model, title: title,
            onSaved: function (list) { parts = list; render(); } });
        } : null });
      return;
    }
    if (tab === 'codes') {
      el.innerHTML = '<h3>' + icon('code') + 'Códigos de error' + (canEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-pri er-r" data-new="code" style="margin-left:auto">' + icon('plus', true) + 'Añadir código</button>' : '') + '</h3>' +
        '<label class="er-search">' + icon('search') + '<input class="er-input" id="er-kq" placeholder="Busca el código que sale en la pantalla" value="' + esc(q) + '"></label><div id="er-kl" class="er-stack" style="gap:8px"></div>';
      drawCodes();
    } else if (tab === 'params') {
      el.innerHTML = '<h3>' + icon('book') + 'Cómo entrar al menú' + (canEdit ? '<button type="button" class="er-btn er-btn-sm er-r" data-new="menu" style="margin-left:auto">' + icon('plus', true) + 'Añadir instrucciones</button>' : '') + '</h3>' +
        (kb.menu.length ? kb.menu.map(function (m) { return item('menu', m, '<b>' + esc(m.title) + '</b>', '<div class="er-kb-body">' + esc(m.body) + '</div>'); }).join('') : empty('Sin instrucciones todavía.')) +
        '<h3 style="margin-top:8px">' + icon('code') + 'Parámetros' + (canEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-pri er-r" data-new="param" style="margin-left:auto">' + icon('plus', true) + 'Añadir parámetro</button>' : '') + '</h3>' +
        (kb.params.length ? '<div class="er-ptable"><div class="er-ptr er-pth"><span>Parámetro</span><span>Para qué sirve</span><span>De fábrica</span><span></span></div>' + kb.params.map(function (p) {
          return '<div class="er-ptr"><b class="er-num">' + esc(p.code) + '</b><span>' + esc(p.name) + (p.notes ? '<span class="er-muted er-small" style="display:block">' + esc(p.notes) + '</span>' : '') +
            (p.scope === 'brand' && D.model ? ' <span class="er-tag er-t-neu">De la marca</span>' : '') + '</span><span class="er-num">' + esc(p.default_value || '—') + '</span>' + tools('param', p) + '</div>';
        }).join('') + '</div>' : empty('Sin parámetros todavía.'));
    } else {
      el.innerHTML = '<h3>' + icon('wrench') + 'Fallos poco comunes y soluciones' + (canEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-pri er-r" data-new="fault" style="margin-left:auto">' + icon('plus', true) + 'Añadir solución</button>' : '') + '</h3>' +
        (kb.faults.length ? kb.faults.map(function (f) {
          return item('fault', f, '<b>' + esc(f.title) + '</b>' + (f.scope === 'brand' && D.model ? ' <span class="er-tag er-t-neu">Toda la marca</span>' : ''),
            '<div class="er-kb-body">' + esc(f.body) + '</div><div class="er-muted er-small">' + esc((f.author ? f.author + ' · ' : '') + E.fmtDate(f.date)) +
            (f.id_ecorepair ? ' · <a href="' + esc(E.boot.links.repair + f.id_ecorepair) + '">ver reparación</a>' : '') + '</div>');
        }).join('') : empty('Cuando encontréis un fallo raro, apuntad aquí cómo se arregló.'));
    }
  }
  function empty(t) { return '<p class="er-muted" style="margin:0">' + esc(t) + '</p>'; }
  function tools(type, it) {
    return '<span class="er-row" style="flex-wrap:nowrap">' + (canEdit ? '<button type="button" class="er-btn er-btn-ghost er-btn-sm er-icon-btn" data-edit="' + type + ':' + it.id + '" aria-label="Editar">' + icon('pen', true) + '</button>' : '') +
      (canDelete ? '<button type="button" class="er-btn er-btn-ghost er-btn-sm er-icon-btn er-btn-danger" data-del="' + type + ':' + it.id + '" aria-label="Borrar">' + icon('trash', true) + '</button>' : '') + '</span>';
  }
  function item(type, it, head, body) {
    return '<details class="er-kb-item"' + (type === 'menu' ? ' open' : '') + '><summary>' + head + '<span style="margin-left:auto">' + tools(type, it) + '</span></summary>' + body + '</details>';
  }
  function drawCodes() {
    var n = q.trim().toUpperCase().replace(/^E[-\s]?/, '');
    var list = kb.codes.filter(function (c) { return !n || c.code.toUpperCase().replace(/^E[-\s]?/, '').indexOf(n) === 0; });
    app.querySelector('#er-kl').innerHTML = list.length ? list.map(function (c) {
      return item('code', c, '<span class="er-code-n">' + esc(c.code) + '</span><b>' + esc(c.title) + '</b>' + (c.verified ? ' <span class="er-tag er-t-ok">Revisado</span>' : ' <span class="er-tag er-t-warn">Por revisar</span>') +
        (c.scope === 'brand' && D.model ? ' <span class="er-tag er-t-neu">De la marca</span>' : ''),
        (c.causes ? '<div class="er-kb-body">' + esc(c.causes) + '</div>' : '') + (c.parts ? '<div class="er-small"><b>Piezas habituales:</b> ' + esc(c.parts) + '</div>' : ''));
    }).join('') : empty(kb.codes.length ? 'No hay ningún código «' + q + '».' : 'Aún no hay códigos. Añádelos con el botón de arriba.');
    if (n && list.length === 1) { var d = app.querySelector('#er-kl details'); if (d) d.open = true; }
  }

  var FORMS = {
    code: [['code', 'Código', 'input', 16], ['title', 'Qué significa', 'input', 160], ['causes', 'Qué revisar / causas', 'textarea', 3000], ['parts', 'Piezas habituales', 'input', 255], ['verified', 'Revisado en el taller', 'check']],
    param: [['code', 'Parámetro (P01…)', 'input', 16], ['name', 'Para qué sirve', 'input', 160], ['default_value', 'Valor de fábrica', 'input', 64], ['notes', 'Notas', 'textarea', 3000]],
    menu: [['title', 'Título', 'input', 160], ['body', 'Cómo se entra y se usa', 'textarea', 8000]],
    fault: [['title', 'Fallo', 'input', 160], ['body', 'Solución', 'textarea', 8000]]
  };
  function find(type, id) {
    var list = type === 'code' ? kb.codes : type === 'param' ? kb.params : type === 'menu' ? kb.menu : kb.faults;
    return list.filter(function (x) { return x.id === id; })[0] || {};
  }
  function form(type, it) {
    it = it || {};
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg" style="max-width:640px"><h2>' + (it.id ? 'Editar' : 'Añadir') + ' · ' + esc(title) + '</h2>' +
      FORMS[type].map(function (f) {
        var v = it[f[0]] == null ? '' : it[f[0]];
        if (f[2] === 'check') return '<label class="er-toggle">' + f[1] + '<input type="checkbox" class="er-sw" data-k="' + f[0] + '"' + (v ? ' checked' : '') + '></label>';
        return '<label class="er-field">' + f[1] + (f[2] === 'textarea' ? '<textarea class="er-input" data-k="' + f[0] + '" rows="5" maxlength="' + f[3] + '">' + esc(v) + '</textarea>'
          : '<input class="er-input" data-k="' + f[0] + '" maxlength="' + f[3] + '" value="' + esc(v) + '">') + '</label>';
      }).join('') +
      (D.model && !it.id ? '<label class="er-toggle">Vale para toda la marca ' + esc(D.brand) + '<input type="checkbox" class="er-sw" id="er-k-brand"' + (type === 'code' || type === 'param' || type === 'menu' ? ' checked' : '') + '></label>' : '') +
      '<div class="er-err" id="er-k-err" hidden></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar</button></div></div>';
    app.appendChild(wrap);
    wrap.querySelector('[data-k]').focus();
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if (!e.target.closest('[data-ok]')) return;
      var data = {};
      wrap.querySelectorAll('[data-k]').forEach(function (i) { data[i.getAttribute('data-k')] = i.type === 'checkbox' ? (i.checked ? 1 : 0) : i.value; });
      var allBrand = wrap.querySelector('#er-k-brand');
      var idModel = it.id ? (it.scope === 'brand' ? 0 : D.id_model) : (allBrand && allBrand.checked ? 0 : D.id_model);
      E.api('kbSave', {}, { type: type, id: it.id || 0, id_brand: D.id_brand, id_model: idModel, data: JSON.stringify(data) }).then(function (res) {
        if (!res.ok) { var er = wrap.querySelector('#er-k-err'); er.textContent = res.error; er.hidden = false; return; }
        reload().then(function () { wrap.remove(); render(); E.toast('Guardado'); });
      });
    });
  }
  function reload() {
    return E.api('kbLookup', { id_brand: D.id_brand, id_model: D.id_model }).then(function (res) { if (res.ok) kb = res.kb; });
  }

  app.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-tab]'))) { tab = t.getAttribute('data-tab'); render(); return; }
    if ((t = e.target.closest('[data-new]'))) { form(t.getAttribute('data-new')); return; }
    if ((t = e.target.closest('[data-edit]'))) { e.preventDefault(); var a = t.getAttribute('data-edit').split(':'); form(a[0], find(a[0], +a[1])); return; }
    if ((t = e.target.closest('[data-del]'))) {
      e.preventDefault();
      var b = t.getAttribute('data-del').split(':');
      E.dialog({ title: 'Borrar', text: 'Se borra para todos.', ok: 'Borrar', danger: true }).then(function (y) {
        if (!y) return;
        E.api('kbDelete', {}, { type: b[0], id: b[1], id_brand: D.id_brand, id_model: D.id_model }).then(function () { reload().then(render); });
      });
    }
  });
  app.addEventListener('input', function (e) { if (e.target.id === 'er-kq') { q = e.target.value; drawCodes(); } });
  app.addEventListener('change', function (e) {
    if (e.target.id === 'er-m-sel') window.location.href = base() + '&id_model=' + e.target.value;
  });

  render();
});
