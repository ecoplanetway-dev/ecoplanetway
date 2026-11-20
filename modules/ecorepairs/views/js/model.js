/* Reparaciones del taller · ficha técnica de marca o modelo: códigos de error, menú y parámetros, fallos y soluciones */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'model') return;

  var TABS = ['parts', 'unlock', 'fixed', 'battery', 'codes', 'params', 'faults'];
  var kb = D.kb, tab = TABS.indexOf(D.tab) > -1 ? D.tab : 'codes', q = D.code || '', canEdit = !!D.canEdit, canDelete = !!D.canDelete;
  var parts = D.parts || [], incompat = D.incompat || [], B = D.bundle || {};
  var title = D.brand + (D.model ? ' ' + D.model : '');

  function base() { return E.boot.links.model + '&id_brand=' + D.id_brand + (D.from ? '&from=' + D.from : ''); }

  function render() {
    app.innerHTML =
      '<div class="er-f-head">' +
        '<a class="er-btn er-btn-ghost er-icon-btn" href="' + esc(D.from ? E.boot.links.repair + D.from : E.boot.links.board) + '" aria-label="' + (D.from ? 'Volver a la reparación' : 'Volver al tablero') + '" title="' + (D.from ? 'Volver a la reparación' : 'Volver al tablero') + '">' + icon('back') + '</a>' +
        (D.image ? '<span class="er-f-cover"><img src="' + esc(D.image) + '" alt=""></span>' : '') +
        '<div class="er-f-title"><h1>' + esc(title) + '</h1><span class="er-st-chip">' + (D.model ? 'Ficha del modelo' : 'Ficha de la marca · vale para todos sus modelos') + '</span></div>' +
        E.unlockButton(B.unlock || [], 'data-tab="unlock"' + (tab === 'unlock' ? ' aria-pressed="true"' : '')) +
        E.incompatButton(incompat, canEdit) +
      '</div>' +
      '<div class="er-f-tools">' +
        '<div class="er-msearch" id="er-ms"></div>' +
        '<label class="er-f-other"><span>Otro modelo de ' + esc(D.brand) + '</span><select class="er-input" id="er-m-sel" aria-label="Ver otro modelo"><option value="0">Toda la marca ' + esc(D.brand) + '</option>' +
          D.models.map(function (m) { return '<option value="' + m.id + '"' + (m.id === D.id_model ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></label>' +
      '</div>' +
      '<div class="er-filters er-tabsq">' + [['parts', 'Piezas', parts.length]].concat(D.id_model ? [['battery', 'Batería', B.battery && (B.battery.volt || B.battery.len) ? '✓' : '']] : []).concat([['fixed', 'Precio cerrado', (B.fixed || []).length], ['codes', 'Códigos de error', kb.codes.length], ['params', 'Menú y parámetros', kb.params.length + kb.menu.length], ['faults', 'Fallos y soluciones', kb.faults.length]]).map(function (t) {
        return '<button type="button" class="er-chip" data-tab="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '<span class="er-n">' + t[2] + '</span></button>';
      }).join('') + '</div>' +
      '<div class="er-panel" id="er-kb"></div>';
    E.ModelSearch(app.querySelector('#er-ms'), { models: D.modelIndex || [], link: function (m) { return E.boot.links.model + '&id_brand=' + m.id_brand + '&id_model=' + m.id_model + '&tab=' + tab; } });
    var el = app.querySelector('#er-kb');
    if (tab === 'unlock') {
      el.innerHTML = '<h3>' + icon('bolt') + 'Deslimitar ' + esc(title) + '<span class="er-r">Pasos, piezas y dónde comprarlo</span></h3><div id="er-unl"></div>';
      E.UnlockPanel(el.querySelector('#er-unl'), { list: B.unlock || [], admin: !!D.isAdmin,
        onEdit: canEdit ? function (u) {
          E.unlockDialog(u, { title: title, methods: B.unlockMethods || {}, admin: !!D.isAdmin, canBrand: !!D.id_model, onSave: function (d, allBrand) {
            return E.api('unlockSave', {}, { id: u ? u.id : 0, id_brand: D.id_brand, id_model: u ? (u.scope === 'brand' ? 0 : D.id_model) : (allBrand ? 0 : D.id_model), view_model: D.id_model, data: JSON.stringify(d) }).then(function (res) {
              if (res.ok) { B.unlock = res.unlock; render(); }
              return res;
            });
          } });
        } : null,
        onDelete: canDelete ? function (id) { E.api('unlockDelete', {}, { id: id, id_brand: D.id_brand, view_model: D.id_model }).then(function (res) { B.unlock = res.unlock || []; render(); }); } : null });
      return;
    }
    if (tab === 'battery') {
      el.innerHTML = '<h3>' + icon('battery') + 'Batería de ' + esc(title) + '<span class="er-r">' + esc(E.batterySummary(B.battery)) + '</span></h3><div id="er-bat"></div>';
      E.BatteryPanel(el.querySelector('#er-bat'), { data: B.battery, canEdit: canEdit, id_model: D.id_model, onSave: function (d) {
        return E.api('batterySave', {}, { id_model: D.id_model, data: JSON.stringify(d) }).then(function (res) { if (res.ok) B.battery = res.battery; return res; });
      } });
      return;
    }
    if (tab === 'fixed') {
      el.innerHTML = '<h3>' + icon('tag') + 'Precios cerrados de ' + esc(title) + '<span class="er-r">Se aplican desde la reparación con un toque</span></h3><div id="er-fx"></div>';
      E.FixedPanel(el.querySelector('#er-fx'), { list: B.fixed || [],
        onEdit: canEdit ? function (f) {
          E.fixedDialog(f, { title: title, canBrand: !!D.id_model, onSave: function (d, allBrand) {
            return E.api('fixedSave', {}, { id: f ? f.id : 0, id_brand: D.id_brand, id_model: f ? (f.scope === 'brand' ? 0 : D.id_model) : (allBrand ? 0 : D.id_model), view_model: D.id_model, data: JSON.stringify(d) }).then(function (res) {
              if (res.ok) { B.fixed = res.fixed; render(); }
              return res;
            });
          } });
        } : null,
        onDelete: canDelete ? function (id) { E.api('fixedDelete', {}, { id: id, id_brand: D.id_brand, view_model: D.id_model }).then(function (res) { B.fixed = res.fixed || []; render(); }); } : null });
      return;
    }
    if (tab === 'parts') {
      el.innerHTML = '<h3>' + icon('box') + 'Piezas de ' + esc(title) + '<span class="er-r">' +
        (canEdit && D.id_model && B.modelPhoto ? '<button type="button" class="er-btn er-btn-sm" id="er-zedit">' + icon('pen', true) + (B.modelMap ? 'Ajustar partes en la foto' : 'Marcar partes en la foto') + '</button>'
          : D.id_model && !B.modelPhoto ? 'Sube una foto del modelo en Ajustes para marcar las partes encima' : 'Toca una parte del patín') + '</span></h3>' +
        (B.spcp ? E.spcpBar(B.spcp, canEdit) : '') + '<div id="er-dwp"></div>';
      var zb = el.querySelector('#er-zedit');
      if (zb) zb.addEventListener('click', function () {
        E.zoneEditor({ photo: B.modelPhoto, map: B.modelMap, title: title, sections: B.sections, onSave: function (m) {
          return E.api('zonesSave', {}, { id_model: D.id_model, map: m ? JSON.stringify(m) : '' }).then(function (res) { if (res.ok) { B.modelMap = res.map; render(); } return res; });
        } });
      });
      E.PartsDiagram(el.querySelector('#er-dwp'), { parts: parts, zones: D.zones, sections: B.sections, map: B.modelMap, photo: B.modelPhoto, admin: !!D.isAdmin, incompat: incompat,
        published: B.spcp ? B.spcp.published : null,
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
          E.partDialog(p, zone, { zones: D.zones, sections: B.sections, admin: !!D.isAdmin, canDelete: canDelete, id_brand: D.id_brand, id_model: D.id_model, title: title,
            onSaved: function (list) { parts = list; render(); } });
        } : null });
      return;
    }
    if (tab === 'codes') {
      el.innerHTML = '<h3>' + icon('code') + 'Códigos de error' + (canEdit ? '<span class="er-r"><button type="button" class="er-btn er-btn-sm er-btn-ghost" data-paste="code">' + icon('doc', true) + 'Pegar de la web</button><button type="button" class="er-btn er-btn-sm er-btn-pri" data-new="code">' + icon('plus', true) + 'Añadir código</button></span>' : '') + '</h3>' +
        '<label class="er-search">' + icon('search') + '<input class="er-input" id="er-kq" placeholder="Busca el código que sale en la pantalla" value="' + esc(q) + '"></label><div id="er-kl" class="er-stack" style="gap:8px"></div>';
      drawCodes();
    } else if (tab === 'params') {
      el.innerHTML = '<h3>' + icon('book') + 'Cómo entrar al menú' + (canEdit ? '<button type="button" class="er-btn er-btn-sm er-r" data-new="menu" style="margin-left:auto">' + icon('plus', true) + 'Añadir instrucciones</button>' : '') + '</h3>' +
        (kb.menu.length ? kb.menu.map(function (m) { return item('menu', m, '<b>' + esc(m.title) + '</b>', '<div class="er-kb-body">' + esc(m.body) + '</div>'); }).join('') : empty('Sin instrucciones todavía.')) +
        '<h3 style="margin-top:8px">' + icon('code') + 'Parámetros' + (canEdit ? '<span class="er-r"><button type="button" class="er-btn er-btn-sm er-btn-ghost" data-paste="param">' + icon('doc', true) + 'Pegar de la web</button><button type="button" class="er-btn er-btn-sm er-btn-pri" data-new="param">' + icon('plus', true) + 'Añadir parámetro</button></span>' : '') + '</h3>' +
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
  /**
   * Convierte un texto copiado de una web (lista, tabla o párrafos) en códigos: «E10 – No comunica… Revisar cable».
   * Cada línea que empieza por un código abre uno nuevo; las líneas siguientes sin código se suman a «qué revisar».
   */
  var CODE_RE = /^(?:(?:error|err|c[oó]digo|code|fallo|fault|aver[ií]a|alarma)\s*(?:n[ºo°.]*)?\s*[:#]?\s*)?((?:[A-Za-z]{1,3}\s?-?\s?)?\d{1,4}[A-Za-z]?|[A-Za-z]{1,3}\d{0,3}[A-Za-z]?(?=\s*[:=|–—\t]))(?=$|[\s:=|.)\]–—,\-\t])[\s:=|.)\]–—,\-\t]*(.*)$/i;
  function parsePasted(text) {
    var out = [], cur = null;
    String(text || '').replace(/\r/g, '').split('\n').forEach(function (raw) {
      var line = raw.replace(/\u00a0/g, ' ').replace(/^\s*(?:[-•*·▪►✓]|\(?\d{1,2}[.)](?=\s+(?:error|err|c[oó]digo|code|[A-Za-z]{1,3}\s?-?\d)))\s*/i, '').trim();
      if (!line) return;
      var cells = line.indexOf('\t') > -1 ? line.split(/\t+/) : line.indexOf('|') > -1 ? line.split('|') : null;
      if (cells) cells = cells.map(function (c) { return c.trim(); }).filter(Boolean);
      var m = (cells && cells.length > 1 ? cells[0] + ' : ' + cells.slice(1).join(' | ') : line).match(CODE_RE);
      if (m && /\d|^[A-Z]{1,3}$/i.test(m[1]) && !/^\d{5,}$/.test(m[1])) {
        var code = m[1].replace(/\s+/g, '').toUpperCase(), rest = m[2].trim(), title = rest, causes = '';
        if (cells && cells.length > 2) { title = cells[1]; causes = cells.slice(2).join(' · '); }
        else {
          var cut = rest.search(/\s[-–—]\s|[.;]\s|\s→\s|\s(?=(?:causa|soluci[oó]n|revisar|comprobar|check|cause|solution)\b)/i);
          if (cut > 8) { title = rest.slice(0, cut).trim(); causes = rest.slice(cut).replace(/^[\s\-–—.;→]+/, '').trim(); }
        }
        if (title.length > 160) { causes = (title.slice(157) + ' ' + causes).trim(); title = title.slice(0, 157) + '…'; }
        cur = { code: code.slice(0, 16), title: title.replace(/[.:;,]+$/, ''), causes: causes, on: true };
        out.push(cur);
      } else if (cur) {
        cur.causes = (cur.causes ? cur.causes + '\n' : '') + line;
      }
    });
    // Mismo código dos veces: se juntan
    var seen = {};
    return out.filter(function (r) {
      if (seen[r.code]) { seen[r.code].causes = (seen[r.code].causes + '\n' + r.title + (r.causes ? '\n' + r.causes : '')).trim(); return false; }
      seen[r.code] = r; return true;
    });
  }
  function pasteList(type) {
    var isCode = type === 'code', rows = [];
    var existing = {};
    (isCode ? kb.codes : kb.params).forEach(function (x) { existing[String(x.code).toUpperCase()] = x; });
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg er-paste-dlg"><h2>Pegar ' + (isCode ? 'códigos de error' : 'parámetros') + ' · ' + esc(title) + '</h2>' +
      '<div id="er-ps-1"><p class="er-muted" style="margin:0">Copia de la web la lista o la tabla entera (aunque venga desordenada) y pégala aquí. Luego la revisas antes de guardar.</p>' +
      '<textarea class="er-input" id="er-ps-in" rows="12" data-novoice placeholder="' + (isCode ? 'E10  Error de comunicación entre la pantalla y la controladora. Revisar el cable…\nE14  Fallo del acelerador…' : 'P01  Brillo de la pantalla  1-5\nP02  Unidades km/mi  0') + '"></textarea></div>' +
      '<div id="er-ps-2" hidden></div>' +
      (D.model ? '<label class="er-toggle">Vale para toda la marca ' + esc(D.brand) + '<input type="checkbox" class="er-sw" id="er-ps-brand" checked></label>' : '') +
      '<div class="er-err" id="er-ps-err" hidden></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-ghost" data-back hidden>Volver al texto</button>' +
      '<button type="button" class="er-btn er-btn-pri" data-go>Organizar</button></div></div>';
    app.appendChild(wrap);
    var ta = wrap.querySelector('#er-ps-in'), s1 = wrap.querySelector('#er-ps-1'), s2 = wrap.querySelector('#er-ps-2'), go = wrap.querySelector('[data-go]'), back = wrap.querySelector('[data-back]'), err = wrap.querySelector('#er-ps-err');
    ta.focus();
    function count() { return rows.filter(function (r) { return r.on; }).length; }
    function draw() {
      s2.innerHTML = '<p class="er-muted" style="margin:0">' + rows.length + ' encontrados. Corrige lo que haga falta y quita los que no quieras.</p><div class="er-ps-list">' + rows.map(function (r, i) {
        var ex = existing[r.code];
        return '<div class="er-ps-row' + (r.on ? '' : ' off') + '"><label class="er-ps-ck"><input type="checkbox" data-i="' + i + '" data-f="on"' + (r.on ? ' checked' : '') + '></label>' +
          '<input class="er-input er-ps-code" data-i="' + i + '" data-f="code" maxlength="16" value="' + esc(r.code) + '">' +
          '<div class="er-ps-txt"><input class="er-input" data-i="' + i + '" data-f="title" maxlength="160" value="' + esc(r.title) + '" placeholder="' + (isCode ? 'Qué significa' : 'Para qué sirve') + '">' +
          '<textarea class="er-input" data-i="' + i + '" data-f="causes" rows="2" maxlength="3000" placeholder="' + (isCode ? 'Qué revisar / causas' : 'Valor de fábrica y notas') + '">' + esc(r.causes) + '</textarea>' +
          (ex ? '<span class="er-tag er-t-warn">Ya existe: se actualiza</span>' : '') + '</div></div>';
      }).join('') + '</div>';
      go.textContent = 'Guardar ' + count();
      go.disabled = !count();
    }
    s2.addEventListener('input', function (e) {
      var el = e.target, i = el.getAttribute('data-i');
      if (i == null) return;
      var f = el.getAttribute('data-f');
      rows[i][f] = f === 'on' ? el.checked : el.value;
      if (f === 'on') { el.closest('.er-ps-row').classList.toggle('off', !el.checked); go.textContent = 'Guardar ' + count(); go.disabled = !count(); }
    });
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if (e.target.closest('[data-back]')) { s2.hidden = true; s1.hidden = false; back.hidden = true; go.textContent = 'Organizar'; go.disabled = false; rows = []; return; }
      if (!e.target.closest('[data-go]') || go.disabled) return;
      err.hidden = true;
      if (!rows.length) {
        rows = parsePasted(ta.value);
        if (!rows.length) { err.textContent = 'No he encontrado ningún código. Comprueba que cada uno empieza por su código (E10, 21, P05…).'; err.hidden = false; return; }
        s1.hidden = true; s2.hidden = false; back.hidden = false;
        draw();
        return;
      }
      var list = rows.filter(function (r) { return r.on && r.code.trim(); }), done = 0, fails = [];
      var brand = wrap.querySelector('#er-ps-brand'), idModel = brand && brand.checked ? 0 : D.id_model;
      go.disabled = true;
      (function next() {
        if (done >= list.length) {
          reload().then(function () {
            render();
            if (fails.length) { err.textContent = 'No se guardaron: ' + fails.join(' · '); err.hidden = false; go.disabled = false; return; }
            wrap.remove();
            E.toast(list.length + ' guardados');
          });
          return;
        }
        var r = list[done], ex = existing[r.code.trim().toUpperCase()], data;
        if (isCode) data = { code: r.code.trim(), title: r.title.trim() || r.code.trim(), causes: r.causes.trim(), parts: ex ? ex.parts || '' : '', verified: ex && ex.verified ? 1 : 0 };
        else data = { code: r.code.trim(), name: r.title.trim() || r.code.trim(), default_value: ex ? ex.default_value || '' : '', notes: r.causes.trim() };
        go.textContent = 'Guardando ' + (done + 1) + ' de ' + list.length + '…';
        var mid = ex ? (ex.scope === 'brand' ? 0 : D.id_model) : idModel;
        E.api('kbSave', {}, { type: type, id: ex ? ex.id : 0, id_brand: D.id_brand, id_model: mid, data: JSON.stringify(data) }).then(function (res) {
          if (!res.ok) fails.push(r.code + ' (' + (res.error || 'error') + ')');
          done++; next();
        }, function () { fails.push(r.code); done++; next(); });
      })();
    });
  }
  function reload() {
    return E.api('kbLookup', { id_brand: D.id_brand, id_model: D.id_model }).then(function (res) { if (res.ok) kb = res.kb; });
  }

  app.addEventListener('click', function (e) {
    var t;
    if (e.target.closest('[data-spcppub]')) {
      E.spcpDialog({ title: title, id_model: D.id_model, spcp: B.spcp, parts: parts, zones: D.zones, onDone: function (b) { B.spcp = b; render(); } });
      return;
    }
    if (e.target.closest('[data-spcplink]')) {
      E.spcpLinkDialog({ title: title, id_model: D.id_model, spcp: B.spcp, onDone: function (b) { B.spcp = b; render(); } });
      return;
    }
    if (e.target.closest('[data-bell]')) {
      E.incompatPanel({ title: title, list: incompat,
        onAdd: canEdit ? function () {
          E.incompatDialog({ title: title, canBrand: !!D.id_model, onSave: function (d) {
            return E.api('incompatSave', {}, { id_brand: D.id_brand, id_model: d.all_brand ? 0 : D.id_model, view_model: D.id_model, data: JSON.stringify(d) }).then(function (res) {
              if (res.ok) { incompat = res.incompat; render(); }
              return res;
            });
          } });
        } : null,
        onDelete: canDelete ? function (id) {
          return E.api('incompatDelete', {}, { id: id, id_brand: D.id_brand, id_model: D.id_model }).then(function (res) { incompat = res.incompat || []; render(); return incompat; });
        } : null });
      return;
    }
    if ((t = e.target.closest('[data-tab]'))) { tab = t.getAttribute('data-tab'); render(); return; }
    if ((t = e.target.closest('[data-new]'))) { form(t.getAttribute('data-new')); return; }
    if ((t = e.target.closest('[data-paste]'))) { pasteList(t.getAttribute('data-paste')); return; }
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
