/* Reparaciones del taller · piezas por modelo: dibujo del patinete/bici por zonas y buscador de piezas */
(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;

  /* Dibujos: cada zona es una forma que se pulsa. Coordenadas sobre 600×330. */
  var SHAPES = {
    scooter: {
      base: '<circle cx="110" cy="258" r="56" class="er-dw-tyre"/><circle cx="110" cy="258" r="30" class="er-dw-rim"/>' +
        '<circle cx="488" cy="258" r="56" class="er-dw-tyre"/><circle cx="488" cy="258" r="30" class="er-dw-rim"/>' +
        '<path d="M150 236h300l40 18H150z" class="er-dw-body"/><path d="M118 250 168 70" class="er-dw-line" stroke-width="12"/><path d="M118 62h100" class="er-dw-line" stroke-width="10"/>',
      zones: {
        wheel_f: '<circle cx="110" cy="258" r="62"/>',
        wheel_r: '<circle cx="488" cy="258" r="62"/>',
        motor: '<circle cx="488" cy="258" r="24"/>',
        brakes: '<rect x="520" y="196" width="46" height="34" rx="8"/>',
        battery: '<rect x="190" y="238" width="140" height="16" rx="6"/>',
        controller: '<rect x="342" y="238" width="90" height="16" rx="6"/>',
        frame: '<rect x="150" y="226" width="300" height="10" rx="5"/>',
        folding: '<circle cx="132" cy="196" r="18"/>',
        handlebar: '<rect x="104" y="48" width="132" height="26" rx="10"/>',
        display: '<rect x="150" y="24" width="44" height="24" rx="6"/>',
        lights: '<circle cx="160" cy="104" r="14"/><circle cx="548" cy="244" r="12"/>',
        charger: '<rect x="420" y="282" width="56" height="34" rx="8"/>',
        other: '<rect x="12" y="12" width="74" height="34" rx="10"/>'
      },
      badge: { wheel_f: [110, 182], wheel_r: [488, 182], motor: [488, 258], brakes: [566, 192], battery: [260, 222], controller: [387, 222], frame: [300, 296],
        folding: [100, 184], handlebar: [250, 52], display: [214, 22], lights: [178, 92], charger: [492, 298], other: [49, 29] }
    },
    bike: {
      base: '<circle cx="130" cy="240" r="78" class="er-dw-tyre"/><circle cx="130" cy="240" r="58" class="er-dw-rim"/>' +
        '<circle cx="470" cy="240" r="78" class="er-dw-tyre"/><circle cx="470" cy="240" r="58" class="er-dw-rim"/>' +
        '<path d="M130 240 250 120h170L300 250zM300 250 470 240 420 120M250 120l-22-40M200 78h70M420 120l20-40M424 74h60" class="er-dw-line" stroke-width="10" fill="none"/>',
      zones: {
        wheel_f: '<circle cx="470" cy="240" r="84"/>',
        wheel_r: '<circle cx="130" cy="240" r="84"/>',
        motor: '<circle cx="300" cy="252" r="26"/>',
        brakes: '<rect x="150" y="196" width="40" height="30" rx="8"/>',
        battery: '<rect x="318" y="140" width="96" height="26" rx="8" transform="rotate(-48 366 153)"/>',
        controller: '<rect x="232" y="150" width="44" height="30" rx="8"/>',
        frame: '<rect x="250" y="108" width="170" height="16" rx="6"/>',
        folding: '<circle cx="420" cy="122" r="16"/>',
        handlebar: '<rect x="418" y="60" width="74" height="26" rx="10"/>',
        display: '<rect x="456" y="30" width="40" height="24" rx="6"/>',
        lights: '<circle cx="512" cy="104" r="12"/><circle cx="196" cy="98" r="10"/>',
        charger: '<rect x="530" y="282" width="56" height="34" rx="8"/>',
        other: '<rect x="12" y="12" width="74" height="34" rx="10"/>'
      },
      badge: { wheel_f: [470, 150], wheel_r: [130, 150], motor: [300, 252], brakes: [196, 192], battery: [366, 118], controller: [254, 140], frame: [335, 100],
        folding: [440, 110], handlebar: [500, 60], display: [500, 30], lights: [530, 96], charger: [592, 290], other: [49, 29] }
    }
  };

  function stockTag(s) {
    if (s === null || s === undefined) return '';
    return s <= 0 ? '<span class="er-tag er-t-bad">Sin stock</span>' : '<span class="er-tag er-t-ok">' + s + ' en stock</span>';
  }
  function pimg(src) { return src ? '<img class="er-pimg" src="' + esc(src) + '" alt="" loading="lazy">' : '<span class="er-pimg er-pimg-empty">' + icon('box', true) + '</span>'; }

  /** Tarjeta de una pieza. opts.onAdd / opts.onEdit / opts.admin */
  function partCard(p, opts, i) {
    var pr = p.product;
    return '<div class="er-part" data-pi="' + i + '">' + pimg(pr ? pr.image : '') +
      '<div class="er-part-main"><div class="er-row" style="gap:6px"><b>' + esc(p.name) + '</b>' + (p.spec ? '<span class="er-spec">' + esc(p.spec) + '</span>' : '') +
        (p.scope === 'brand' ? '<span class="er-tag er-t-neu">Toda la marca</span>' : '') + '</div>' +
        (pr ? '<div class="er-small er-muted">' + esc(pr.name) + (pr.reference ? ' · ' + esc(pr.reference) : '') + '</div><div class="er-row er-small">' + stockTag(pr.stock) + '<b class="er-num">' + esc(E.fmtMoney(pr.price)) + '</b></div>'
            : '<div class="er-small er-muted">Sin producto de la tienda asociado</div>') +
        (opts.admin && (p.supplier_url || p.supplier_ref) ? '<div class="er-supplier er-small">' + icon('box', true) + esc((p.supplier_name || 'Proveedor') + (p.supplier_ref ? ' · ' + p.supplier_ref : '') + (p.supplier_price ? ' · ' + E.fmtMoney(p.supplier_price) : '')) +
            (p.supplier_url ? ' <a href="' + esc(p.supplier_url) + '" target="_blank" rel="noopener">Abrir en el proveedor</a>' : '') + '</div>'
          : !opts.admin && p.has_supplier ? '<div class="er-small er-muted">' + icon('box', true) + 'Disponible en proveedor</div>' : '') +
        (p.notes ? '<div class="er-small er-muted">' + esc(p.notes) + '</div>' : '') +
      '</div><div class="er-part-act">' +
        (opts.onAdd && pr ? '<button type="button" class="er-btn er-btn-sm er-btn-pri" data-padd="' + i + '">' + icon('plus', true) + 'Añadir</button>' : '') +
        (opts.onEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost er-icon-btn" data-pedit="' + i + '" aria-label="Editar">' + icon('pen', true) + '</button>' : '') +
      '</div></div>';
  }

  /**
   * Dibujo + lista de piezas de la zona elegida.
   * opts: parts, zones, shape, suggested[], admin, onAdd(part), onEdit(part|null, zone), title
   */
  function PartsDiagram(el, opts) {
    var parts = opts.parts || [], zones = opts.zones || {}, sug = opts.suggested || [], shape = SHAPES[opts.shape] || SHAPES.scooter;
    var sel = sug.length ? 'suggested' : (parts.length ? 'all' : null);
    function count(z) { return parts.filter(function (p) { return p.zone === z; }).length; }
    function render() {
      var svg = '<svg viewBox="0 0 600 330" class="er-dw" role="img" aria-label="Dibujo con las zonas de piezas">' + shape.base +
        Object.keys(shape.zones).map(function (z) {
          var n = count(z), cls = 'er-z' + (n ? ' has' : '') + (sug.indexOf(z) > -1 ? ' sug' : '') + (sel === z ? ' on' : '');
          var b = shape.badge[z];
          return '<g class="' + cls + '" data-zone="' + z + '" tabindex="0" role="button" aria-label="' + esc(zones[z] || z) + '"><title>' + esc(zones[z] || z) + '</title>' + shape.zones[z] +
            (n ? '<g class="er-zb"><circle cx="' + b[0] + '" cy="' + b[1] + '" r="13"/><text x="' + b[0] + '" y="' + (b[1] + 5) + '" text-anchor="middle">' + n + '</text></g>' : '') + '</g>';
        }).join('') + '<text x="49" y="34" text-anchor="middle" class="er-dw-other">Otros</text></svg>';
      var list = sel === 'suggested' ? parts.filter(function (p) { return sug.indexOf(p.zone) > -1; }) : sel === 'all' ? parts : parts.filter(function (p) { return p.zone === sel; });
      var title = sel === 'suggested' ? 'Sugeridas por la avería: ' + sug.map(function (z) { return zones[z]; }).join(', ') : sel === 'all' ? 'Todas las piezas' : (zones[sel] || 'Elige una zona del dibujo');
      el.innerHTML = '<div class="er-dw-wrap">' + svg + '</div>' +
        '<div class="er-row er-dw-chips">' + (sug.length ? '<button type="button" class="er-chip" data-sel="suggested" aria-pressed="' + (sel === 'suggested') + '">' + icon('alert', true) + 'Sugeridas</button>' : '') +
          '<button type="button" class="er-chip" data-sel="all" aria-pressed="' + (sel === 'all') + '">Todas <span class="er-n">' + parts.length + '</span></button></div>' +
        '<div class="er-sub" style="margin:4px 0 0">' + esc(title) + '</div>' +
        '<div class="er-parts">' + (list.length ? list.map(function (p) { return partCard(p, opts, parts.indexOf(p)); }).join('')
          : '<div class="er-empty">' + (sel && sel !== 'all' && sel !== 'suggested' ? 'Sin piezas apuntadas en esta zona.' : 'Aún no hay piezas apuntadas para este modelo.') + '</div>') + '</div>' +
        (opts.onEdit && sel && sel !== 'all' && sel !== 'suggested' ? '<button type="button" class="er-btn er-btn-sm" data-pnew>' + icon('plus', true) + 'Añadir pieza en ' + esc(zones[sel]) + '</button>' : '') +
        (opts.onEdit && (!sel || sel === 'all' || sel === 'suggested') ? '<button type="button" class="er-btn er-btn-sm" data-pnew>' + icon('plus', true) + 'Añadir pieza</button>' : '');
    }
    el.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-zone]'))) { sel = t.getAttribute('data-zone'); render(); return; }
      if ((t = e.target.closest('[data-sel]'))) { sel = t.getAttribute('data-sel'); render(); return; }
      if ((t = e.target.closest('[data-padd]'))) { opts.onAdd(parts[+t.getAttribute('data-padd')], t); return; }
      if ((t = e.target.closest('[data-pedit]'))) { opts.onEdit(parts[+t.getAttribute('data-pedit')], null); return; }
      if (e.target.closest('[data-pnew]')) opts.onEdit(null, sel && zones[sel] ? sel : 'other');
    });
    el.addEventListener('keydown', function (e) {
      var t = e.target.closest('[data-zone]');
      if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    });
    render();
    return { set: function (p) { parts = p; render(); } };
  }

  /** Ventana para añadir o editar una pieza (en el PC). */
  function partDialog(p, zone, ctx) {
    p = p || { zone: zone || 'other' };
    var prod = p.product ? { id_product: p.id_product, id_product_attribute: p.id_product_attribute, name: p.product.name, image: p.product.image } : null;
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    function f(k, label, attrs) { return '<label class="er-field">' + label + '<input class="er-input" data-k="' + k + '" value="' + esc(p[k] == null ? '' : p[k]) + '" ' + (attrs || '') + '></label>'; }
    wrap.innerHTML = '<div class="er-dlg" style="max-width:660px"><h2>' + (p.id ? 'Editar pieza' : 'Añadir pieza') + ' · ' + esc(ctx.title) + '</h2>' +
      '<div class="er-fg"><label class="er-field">Zona<select class="er-input" data-k="zone">' + Object.keys(ctx.zones).map(function (z) {
        return '<option value="' + z + '"' + (p.zone === z ? ' selected' : '') + '>' + esc(ctx.zones[z]) + '</option>'; }).join('') + '</select></label>' +
        f('name', 'Pieza <span class="er-req">*</span>', 'maxlength="128" placeholder="Neumático trasero"') + f('spec', 'Medida o referencia técnica', 'maxlength="96" placeholder="10x2,5 · válvula acodada"') + '</div>' +
      '<div><div class="er-sub">Producto de la tienda</div><div id="er-pp"></div>' +
        '<label class="er-search" style="margin-top:6px">' + icon('search') + '<input class="er-input" id="er-pq" placeholder="Buscar producto de la tienda" autocomplete="off"></label><div class="er-pick" id="er-pres"></div></div>' +
      (ctx.admin ? '<div class="er-sub" style="margin:8px 0 0">Proveedor (solo lo ves tú)</div><div class="er-fg">' + f('supplier_name', 'Proveedor', 'maxlength="96"') + f('supplier_ref', 'Referencia', 'maxlength="64"') +
        f('supplier_price', 'Precio de compra (€)', 'inputmode="decimal"') + f('supplier_url', 'Enlace al producto del proveedor', 'maxlength="255" placeholder="https://"') + '</div>' : '') +
      '<label class="er-field">Notas<textarea class="er-input" data-k="notes" rows="2" maxlength="1000" placeholder="Compatible con…">' + esc(p.notes || '') + '</textarea></label>' +
      (ctx.id_model && !p.id ? '<label class="er-toggle">Vale para toda la marca<input type="checkbox" class="er-sw" id="er-pbrand"></label>' : '') +
      '<div class="er-err" id="er-perr" hidden></div>' +
      '<div class="er-dlg-act">' + (p.id && ctx.canDelete ? '<button type="button" class="er-btn er-btn-ghost er-btn-danger" data-pdel>Borrar</button>' : '') +
        '<button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar</button></div></div>';
    (E.root() || document.body).appendChild(wrap);
    function drawProd() {
      wrap.querySelector('#er-pp').innerHTML = prod ? '<div class="er-chosen">' + pimg(prod.image) + '<div class="er-grow"><b>' + esc(prod.name) + '</b></div><button type="button" class="er-btn er-btn-sm" data-punlink>Quitar</button></div>'
        : '<p class="er-muted er-small" style="margin:0">Ninguno. Búscalo para ver su foto, precio y stock en la reparación.</p>';
    }
    drawProd();
    var results = [], timer;
    wrap.addEventListener('input', function (e) {
      if (e.target.id !== 'er-pq') return;
      var v = e.target.value.trim(); clearTimeout(timer);
      timer = setTimeout(function () {
        if (v.length < 2) { wrap.querySelector('#er-pres').innerHTML = ''; return; }
        E.api('searchProducts', { q: v }).then(function (res) {
          results = res.products || [];
          wrap.querySelector('#er-pres').innerHTML = results.slice(0, 8).map(function (r, i) {
            return '<button type="button" data-pp="' + i + '">' + pimg(r.image) + '<span class="er-grow"><b>' + esc(r.name) + '</b><br><span class="er-small er-muted">' + esc(r.reference || '') + '</span></span>' + stockTag(r.stock) + '<b class="er-num">' + esc(E.fmtMoney(r.price)) + '</b></button>';
          }).join('') || '<div class="er-muted er-small" style="padding:10px">Nada encontrado.</div>';
        });
      }, 300);
    });
    wrap.addEventListener('click', function (e) {
      var t;
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if ((t = e.target.closest('[data-pp]'))) { var r = results[+t.getAttribute('data-pp')]; prod = { id_product: r.id_product, id_product_attribute: r.id_product_attribute, name: r.name, image: r.image }; drawProd(); wrap.querySelector('#er-pres').innerHTML = ''; wrap.querySelector('#er-pq').value = ''; return; }
      if (e.target.closest('[data-punlink]')) { prod = null; drawProd(); return; }
      if (e.target.closest('[data-pdel]')) {
        E.api('partDelete', {}, { id: p.id, id_brand: ctx.id_brand, id_model: ctx.id_model }).then(function (res) { wrap.remove(); ctx.onSaved(res.parts); });
        return;
      }
      if (!e.target.closest('[data-ok]')) return;
      var d = { id_product: prod ? prod.id_product : 0, id_product_attribute: prod ? prod.id_product_attribute : 0 };
      wrap.querySelectorAll('[data-k]').forEach(function (i) { d[i.getAttribute('data-k')] = i.value; });
      var allBrand = wrap.querySelector('#er-pbrand');
      E.api('partSave', {}, { id: p.id || 0, id_brand: ctx.id_brand, id_model: p.id ? (p.scope === 'brand' ? 0 : ctx.id_model) : (allBrand && allBrand.checked ? 0 : ctx.id_model), data: JSON.stringify(d) }).then(function (res) {
        if (!res.ok) { var er = wrap.querySelector('#er-perr'); er.textContent = res.error; er.hidden = false; return; }
        wrap.remove(); ctx.onSaved(res.parts); E.toast('Pieza guardada');
      });
    });
  }

  /** Buscador de piezas en todos los modelos. opts.admin, opts.modelLink(m) */
  function PartsSearch(el, opts) {
    var seq = 0, timer;
    el.innerHTML = '<label class="er-search">' + icon('search') + '<input class="er-input" id="er-psq" type="search" placeholder="Medida, pieza o modelo: «10x2,5», «pastillas xiaomi», «cámara 8,5»" autocomplete="off" value="' + esc(opts.q || '') + '"></label>' +
      '<div class="er-parts" id="er-psr" style="margin-top:12px"></div>';
    function run(q) {
      var my = ++seq;
      if (q.trim().length < 2) { el.querySelector('#er-psr').innerHTML = '<div class="er-empty">Escribe una medida, una pieza o un modelo.</div>'; return; }
      E.api('partSearch', { q: q }, opts.post ? {} : undefined).then(function (res) {
        if (my !== seq) return;
        var list = res.results || [];
        el.querySelector('#er-psr').innerHTML = list.length ? list.map(function (p, i) {
          return partCard(p, { admin: opts.admin }, i).replace('</div><div class="er-part-act">', '<div class="er-row er-small" style="margin-top:4px">' + p.models.map(function (m) {
            return '<a class="er-tag er-t-neu" href="' + esc(opts.modelLink(m)) + '">' + esc(m.label) + '</a>';
          }).join('') + '</div></div><div class="er-part-act">');
        }).join('') : '<div class="er-empty">No hay piezas apuntadas con «' + esc(q) + '». Se añaden en la ficha de cada modelo.</div>';
      });
    }
    el.addEventListener('input', function (e) { if (e.target.id === 'er-psq') { clearTimeout(timer); var v = e.target.value; timer = setTimeout(function () { run(v); }, 300); } });
    run(opts.q || '');
  }

  E.PartsDiagram = PartsDiagram;
  E.partDialog = partDialog;
  E.PartsSearch = PartsSearch;

  /* Página «Buscar piezas» del PC */
  E.ready(function () {
    var app = E.root();
    if (!app || app.getAttribute('data-view') !== 'parts') return;
    var D = E.data;
    app.innerHTML = '<header class="er-head"><div class="er-brand"><div class="er-ico">' + icon('box') + '</div><div><h1>Buscar piezas</h1><p>En qué modelos se usa cada pieza, stock en la tienda y proveedor</p></div></div>' +
      '<a class="er-btn" href="' + esc(E.boot.links.board) + '">' + icon('back') + '<span>Tablero</span></a></header><div class="er-panel" id="er-ps"></div>';
    PartsSearch(app.querySelector('#er-ps'), { admin: !!D.isAdmin, q: D.q, modelLink: function (m) { return E.boot.links.model + '&id_brand=' + m.id_brand + '&id_model=' + m.id_model + '&tab=parts'; } });
  });
})();
