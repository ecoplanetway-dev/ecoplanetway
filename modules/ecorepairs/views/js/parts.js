/* Reparaciones del taller · piezas por modelo: dibujo del patinete/bici por zonas y buscador de piezas */
(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;

  /* Partes del patín (si el servidor no las manda) */
  var SECTIONS = [
    { key: 'top', name: 'Manillar', color: '#2F6FE0', cats: ['handlebar', 'display', 'throttle', 'levers', 'grips', 'bell', 'cables'] },
    { key: 'stem', name: 'Mástil y plegado', color: '#8B5CF6', cats: ['stem', 'folding', 'hook', 'lights', 'screws'] },
    { key: 'front', name: 'Parte delantera', color: '#EA580C', cats: ['wheel_f', 'brakes', 'fender_f', 'suspension_f', 'fork', 'motor_f'] },
    { key: 'base', name: 'Base central', color: '#0B6E4B', cats: ['battery', 'controller', 'charger', 'stand', 'grip_tape', 'frame', 'cover'] },
    { key: 'rear', name: 'Parte trasera', color: '#DC2626', cats: ['wheel_r', 'motor', 'brakes', 'fender_r', 'light_r', 'swingarm'] },
    { key: 'other', name: 'Otros', color: '#64748B', cats: ['other'] }
  ];
  /* Iconos pequeños de cada parte para cuando el modelo no tiene foto con zonas */
  var SEC_ICON = {
    top: '<path d="M4 9h16M9 9V6h6v3M7 9l-2 4M17 9l2 4"/>',
    stem: '<path d="M8 21 16 3M6 14h6"/>',
    front: '<circle cx="12" cy="15" r="6"/><circle cx="12" cy="15" r="2"/><path d="M12 9 15 2"/>',
    base: '<rect x="2" y="10" width="20" height="5" rx="2"/><path d="M6 12.5h8"/>',
    rear: '<circle cx="12" cy="15" r="6"/><circle cx="12" cy="15" r="3"/><path d="M5 8c3-4 11-4 14 1"/>',
    other: '<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>'
  };
  function secIcon(k) { return '<svg class="er-i" viewBox="0 0 24 24" aria-hidden="true">' + (SEC_ICON[k] || SEC_ICON.other) + '</svg>'; }

  /** Centro de un polígono (para el número de piezas). */
  function center(poly) {
    var x = 0, y = 0;
    poly.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / poly.length, y / poly.length];
  }

  /** Foto del modelo con sus partes pintadas encima. Devuelve el HTML; las partes llevan data-sec. */
  function photoMap(photo, map, sections, opts) {
    opts = opts || {};
    var polys = map.polys || {};
    return '<div class="er-pmap' + (opts.small ? ' er-pmap-sm' : '') + '"><img src="' + esc(photo) + '" alt="" draggable="false"' + (map.flip ? ' style="transform:scaleX(-1)"' : '') + '>' +
      '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + sections.filter(function (s) { return polys[s.key]; }).map(function (s) {
        return '<polygon class="er-phz' + (opts.sel === s.key ? ' on' : '') + (opts.sug && opts.sug.indexOf(s.key) > -1 ? ' sug' : '') + '" data-sec="' + s.key + '" points="' +
          polys[s.key].map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '" style="--c:' + s.color + '"/>';
      }).join('') + '</svg>' +
      sections.filter(function (s) { return polys[s.key]; }).map(function (s) {
        var c = center(polys[s.key]), n = opts.count ? opts.count(s) : 0;
        if (opts.compact) return n ? '<button type="button" class="er-phb er-phb-n' + (opts.sel === s.key ? ' on' : '') + '" data-sec="' + s.key + '" title="' + esc(s.name) + '" style="left:' + c[0] + '%;top:' + c[1] + '%;--c:' + s.color + '">' + n + '</button>' : '';
        return '<button type="button" class="er-phb' + (opts.sel === s.key ? ' on' : '') + '" data-sec="' + s.key + '" style="left:' + c[0] + '%;top:' + c[1] + '%;--c:' + s.color + '">' +
          esc(s.name) + (n ? ' <b>' + n + '</b>' : '') + '</button>';
      }).join('') + '</div>';
  }

  function stockTag(s) {
    if (s === null || s === undefined) return '';
    return s <= 0 ? '<span class="er-tag er-t-bad">Sin stock</span>' : '<span class="er-tag er-t-ok">' + s + ' en stock</span>';
  }
  function pimg(src) { return src ? '<img class="er-pimg" src="' + esc(src) + '" alt="" loading="lazy">' : '<span class="er-pimg er-pimg-empty">' + icon('box', true) + '</span>'; }

  /** Lista de piezas que no valen para el modelo. */
  function incompatList(list, opts) {
    if (!list.length && !opts.onIncompat) return '';
    return '<div class="er-incompat"><div class="er-row" style="flex-wrap:nowrap"><b class="er-incompat-t">' + icon('alert', true) + 'No compatibles con este modelo' + (list.length ? ' (' + list.length + ')' : '') + '</b>' +
      (opts.onIncompat ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost" data-inew style="margin-left:auto">' + icon('plus', true) + 'Apuntar</button>' : '') + '</div>' +
      list.map(function (w) {
        return '<div class="er-iw er-iw-' + esc(w.level) + '">' + (w.image ? '<img class="er-pimg" src="' + esc(w.image) + '" alt="">' : '') +
          '<div class="er-grow"><b>' + esc(w.label) + '</b> <span class="er-tag ' + (w.level === 'block' ? 'er-t-bad' : 'er-t-warn') + '">' + (w.level === 'block' ? 'No poner' : 'Precaución') + '</span>' +
          (w.scope === 'brand' ? ' <span class="er-tag er-t-neu">Toda la marca</span>' : '') +
          '<div class="er-small">' + esc(w.reason) + '</div><div class="er-small er-muted">' + esc((w.author ? w.author + ' · ' : '') + E.fmtDate(w.date)) + '</div></div>' +
          (opts.onIncompatDelete ? '<button type="button" class="er-btn er-btn-ghost er-btn-sm er-icon-btn" data-idel="' + w.id + '" aria-label="Quitar aviso">' + icon('trash', true) + '</button>' : '') + '</div>';
      }).join('') + '</div>';
  }

  /**
   * Ventana para apuntar una pieza que no vale para el modelo (PC).
   * ctx: { title, prefill: {id_product, id_product_attribute, name, image}, canBrand, onSave(data) }
   */
  function incompatDialog(ctx) {
    var prod = ctx.prefill || null;
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg" style="max-width:600px"><h2>' + icon('alert') + ' Pieza que no vale para ' + esc(ctx.title) + '</h2>' +
      '<div id="er-ip"></div>' +
      '<label class="er-search">' + icon('search') + '<input class="er-input" id="er-iq" placeholder="Buscar el producto de la tienda" autocomplete="off"></label><div class="er-pick" id="er-ires"></div>' +
      '<label class="er-field">O escríbela si no está en la tienda<input class="er-input" id="er-ilabel" maxlength="160" placeholder="Neumático 10x3"></label>' +
      '<label class="er-field">Por qué no vale <span class="er-req">*</span><textarea class="er-input" id="er-ireason" rows="2" maxlength="500" placeholder="No entra en la horquilla, otra válvula…"></textarea></label>' +
      '<div class="er-opts"><button type="button" class="er-opt er-warn" data-lv="block" aria-pressed="true">No poner</button><button type="button" class="er-opt" data-lv="warn" aria-pressed="false">Precaución</button></div>' +
      (ctx.canBrand ? '<label class="er-toggle">Vale para toda la marca<input type="checkbox" class="er-sw" id="er-ibrand"></label>' : '') +
      '<div class="er-err" id="er-ierr" hidden></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar aviso</button></div></div>';
    (E.root() || document.body).appendChild(wrap);
    var level = 'block', results = [], timer;
    function drawProd() {
      wrap.querySelector('#er-ip').innerHTML = prod ? '<div class="er-chosen">' + pimg(prod.image) + '<div class="er-grow"><b>' + esc(prod.name) + '</b></div><button type="button" class="er-btn er-btn-sm" data-iun>Quitar</button></div>' : '';
    }
    drawProd();
    wrap.addEventListener('input', function (e) {
      if (e.target.id !== 'er-iq') return;
      var v = e.target.value.trim(); clearTimeout(timer);
      timer = setTimeout(function () {
        if (v.length < 2) { wrap.querySelector('#er-ires').innerHTML = ''; return; }
        E.api('searchProducts', { q: v }).then(function (res) {
          results = res.products || [];
          wrap.querySelector('#er-ires').innerHTML = results.slice(0, 8).map(function (r, i) {
            return '<button type="button" data-ipp="' + i + '">' + pimg(r.image) + '<span class="er-grow"><b>' + esc(r.name) + '</b><br><span class="er-small er-muted">' + esc(r.reference || '') + '</span></span></button>';
          }).join('');
        });
      }, 300);
    });
    wrap.addEventListener('click', function (e) {
      var t;
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if ((t = e.target.closest('[data-ipp]'))) { var r = results[+t.getAttribute('data-ipp')]; prod = { id_product: r.id_product, id_product_attribute: r.id_product_attribute, name: r.name, image: r.image }; drawProd(); wrap.querySelector('#er-ires').innerHTML = ''; return; }
      if (e.target.closest('[data-iun]')) { prod = null; drawProd(); return; }
      if ((t = e.target.closest('[data-lv]'))) { level = t.getAttribute('data-lv'); wrap.querySelectorAll('[data-lv]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); return; }
      var ok = e.target.closest('[data-ok]');
      if (!ok) return;
      var d = { id_product: prod ? prod.id_product : 0, id_product_attribute: prod ? prod.id_product_attribute : 0,
        label: prod ? prod.name : wrap.querySelector('#er-ilabel').value.trim(), reason: wrap.querySelector('#er-ireason').value.trim(), level: level,
        all_brand: !!(wrap.querySelector('#er-ibrand') && wrap.querySelector('#er-ibrand').checked) };
      ok.disabled = true;
      ctx.onSave(d).then(function (res) {
        ok.disabled = false;
        if (!res || !res.ok) { var er = wrap.querySelector('#er-ierr'); er.textContent = (res && res.error) || 'No se pudo guardar.'; er.hidden = false; return; }
        wrap.remove(); E.toast('Aviso guardado en ' + ctx.title);
      });
    });
  }

  /** Pregunta antes de añadir una pieza marcada como no compatible. Devuelve promesa true/false. */
  function confirmIncompat(name, w, model) {
    if (!w) return Promise.resolve(true);
    return E.dialog({ title: (w.level === 'block' ? 'No compatible con ' : 'Precaución con ') + model, text: name + ': ' + w.reason, ok: 'Añadir igualmente', danger: w.level === 'block' });
  }

  /** Tarjeta de una pieza. opts.onAdd / opts.onEdit / opts.admin */
  function partCard(p, opts, i) {
    var pr = p.product;
    return '<div class="er-part" data-pi="' + i + '">' + pimg(pr ? pr.image : '') +
      '<div class="er-part-main"><div class="er-row" style="gap:6px"><b>' + esc(p.name) + '</b>' + (p.spec ? '<span class="er-spec">' + esc(p.spec) + '</span>' : '') +
        (p.scope === 'brand' ? '<span class="er-tag er-t-neu">Toda la marca</span>' : '') +
        (opts.published && p.id_product && opts.published[p.id_product] !== undefined ? '<span class="er-tag er-t-ok" title="Publicada como repuesto compatible en la tienda">' + icon('check', true) + 'En la tienda</span>' : '') + '</div>' +
        (pr ? '<div class="er-small er-muted">' + esc(pr.name) + (pr.reference ? ' · ' + esc(pr.reference) : '') + '</div><div class="er-row er-small">' + stockTag(pr.stock) + '<b class="er-num">' + esc(E.fmtMoney(pr.price)) + '</b></div>'
            : '<div class="er-small er-muted">Sin producto de la tienda asociado</div>') +
        (opts.admin && p.epwc && p.epwc.length ? p.epwc.slice(0, 2).map(function (o) {
          var av = { 'in': '<span class="er-tag er-t-ok">Disponible</span>', out: '<span class="er-tag er-t-bad">Agotado</span>' }[o.availability] || '<span class="er-tag er-t-neu">Sin dato</span>';
          return '<div class="er-supplier er-small">' + icon('box', true) + '<b>' + esc(o.source) + '</b>' + (o.cost !== null ? ' · coste ' + esc(E.fmtMoney(o.cost)) : '') + ' ' + av +
            (o.url ? ' <a href="' + esc(o.url) + '" target="_blank" rel="noopener">Abrir</a>' : '') + '</div>';
        }).join('') + '<button type="button" class="er-link er-small" data-pcart="' + p.id_product + '">' + icon('package', true) + 'Añadir a la cesta del proveedor</button>' : '') +
        (opts.admin && !(p.epwc && p.epwc.length) && (p.supplier_url || p.supplier_ref) ? '<div class="er-supplier er-small">' + icon('box', true) + esc((p.supplier_name || 'Proveedor') + (p.supplier_ref ? ' · ' + p.supplier_ref : '') + (p.supplier_price ? ' · ' + E.fmtMoney(p.supplier_price) : '')) +
            (p.supplier_url ? ' <a href="' + esc(p.supplier_url) + '" target="_blank" rel="noopener">Abrir en el proveedor</a>' : '') + '</div>'
          : !opts.admin && p.has_supplier ? '<div class="er-small er-muted">' + icon('box', true) + 'Disponible en proveedor</div>' : '') +
        (p.notes ? '<div class="er-small er-muted">' + esc(p.notes) + '</div>' : '') +
      '</div><div class="er-part-act">' +
        (opts.onAdd && pr ? '<button type="button" class="er-btn er-btn-sm er-btn-pri" data-padd="' + i + '">' + icon('plus', true) + 'Añadir</button>' : '') +
        (opts.onEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost er-icon-btn" data-pedit="' + i + '" aria-label="Editar">' + icon('pen', true) + '</button>' : '') +
      '</div></div>';
  }

  /**
   * Partes del patín (sobre la foto del modelo si tiene zonas) → categorías → piezas.
   * opts: parts, zones, sections, map, photo, suggested[], admin, incompat, onAdd(part, btn), onEdit(part|null, zone), onIncompat, onIncompatDelete
   */
  function PartsDiagram(el, opts) {
    var parts = opts.parts || [], zones = opts.zones || {}, sug = opts.suggested || [], sections = opts.sections || SECTIONS;
    var nSug = parts.filter(function (p) { return sug.indexOf(p.zone) > -1; }).length;
    var st = { mode: nSug ? 'suggested' : 'all', sec: null, cat: null };
    function secOf(k) { return sections.filter(function (s) { return s.key === k; })[0] || null; }
    function inSec(s) { return parts.filter(function (p) { return s.cats.indexOf(p.zone) > -1; }); }
    function sugSecs() { return sections.filter(function (s) { return s.cats.some(function (c) { return sug.indexOf(c) > -1; }); }).map(function (s) { return s.key; }); }
    /* Bloque 2: partes y, dentro de la elegida, sus categorías */
    function secList() {
      var sugs = sugSecs();
      function row(attr, on, ico, name, n, tag) {
        return '<button type="button" class="er-sl' + (on ? ' on' : '') + '" ' + attr + '><span class="er-sl-i">' + ico + '</span><span class="er-sl-n">' + esc(name) + (tag ? '<span class="er-sl-tag">' + tag + '</span>' : '') + '</span><span class="er-sl-c">' + n + '</span></button>';
      }
      return '<div class="er-secl">' +
        (nSug ? row('data-mode="suggested"', st.mode === 'suggested', icon('alert', true), 'Sugeridas por la avería', nSug) : '') +
        row('data-mode="all"', st.mode === 'all', icon('box', true), 'Todas las piezas', parts.length) +
        sections.map(function (x) {
          var open = st.mode === 'sec' && st.sec === x.key;
          return row('data-sec="' + x.key + '"', open && !st.cat, secIcon(x.key), x.name, inSec(x).length, sugs.indexOf(x.key) > -1 ? 'Avería' : '') +
            (open ? '<div class="er-subcats">' + x.cats.map(function (c) {
              var n = parts.filter(function (p) { return p.zone === c; }).length;
              return '<button type="button" class="er-sc' + (st.cat === c ? ' on' : '') + (sug.indexOf(c) > -1 ? ' sug' : '') + (n ? '' : ' empty') + '" data-cat="' + c + '"><span>' + esc(zones[c] || c) + '</span><b>' + n + '</b></button>';
            }).join('') + '</div>' : '');
        }).join('') + '</div>';
    }
    /* Bloque 1: la foto */
    function visual() {
      var map = opts.map, photo = opts.photo;
      if (photo && map && map.polys) return '<div class="er-dw-photo">' + photoMap(photo, map, sections, { compact: true, sel: st.mode === 'sec' ? st.sec : null, sug: sugSecs(), count: function (s) { return inSec(s).length; } }) + '</div>';
      if (!photo) return '';
      return '<div class="er-dw-photo"><div class="er-pmap"><img src="' + esc(photo) + '" alt="" draggable="false"></div>' +
        '<div class="er-dw-hint">' + icon('pen', true) + (opts.zonesUrl ? '<a href="' + esc(opts.zonesUrl) + '">Marca las partes sobre la foto</a>' : 'Las partes se marcan en la ficha del modelo') + '</div></div>';
    }
    function list() {
      if (st.mode === 'suggested') return parts.filter(function (p) { return sug.indexOf(p.zone) > -1; });
      if (st.mode === 'all') return parts;
      var s = secOf(st.sec);
      return parts.filter(function (p) { return st.cat ? p.zone === st.cat : s.cats.indexOf(p.zone) > -1; });
    }
    function render() {
      var s = st.mode === 'sec' ? secOf(st.sec) : null, l = list(), ph = visual();
      var title = st.mode === 'suggested' ? 'Sugeridas por la avería' : st.mode === 'all' ? 'Todas las piezas' : (st.cat ? zones[st.cat] : s.name);
      el.innerHTML = '<div class="er-pd3' + (ph ? '' : ' er-pd3-nophoto') + '">' + (ph ? '<div class="er-pd3-ph">' + ph + '</div>' : '') +
        '<div class="er-pd3-sec">' + secList() + '</div>' +
        '<div class="er-pd3-pr"><div class="er-pd3-h"><b>' + esc(title) + '</b><span class="er-muted er-small">' + l.length + ' pieza' + (l.length === 1 ? '' : 's') + '</span>' +
          (opts.onEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost" data-pnew style="margin-left:auto">' + icon('plus', true) + 'Añadir pieza</button>' : '') + '</div>' +
        '<div class="er-parts er-parts-c">' + (l.length ? l.map(function (p) { return partCard(p, opts, parts.indexOf(p)); }).join('')
          : '<div class="er-empty">' + (st.mode === 'sec' ? 'Sin piezas apuntadas aquí.' : 'Aún no hay piezas apuntadas para este modelo.') + '</div>') + '</div>' +
        '</div></div>';
    }
    el.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-sec]'))) {
        var k = t.getAttribute('data-sec');
        if (st.sec !== k || st.mode !== 'sec') st.cat = null;
        st.mode = 'sec'; st.sec = k; render(); return;
      }
      if ((t = e.target.closest('[data-cat]'))) { var c = t.getAttribute('data-cat') || null; st.cat = st.cat === c ? null : c; render(); return; }
      if ((t = e.target.closest('[data-mode]'))) { st.mode = t.getAttribute('data-mode'); st.sec = null; st.cat = null; render(); return; }
      if ((t = e.target.closest('[data-padd]'))) { opts.onAdd(parts[+t.getAttribute('data-padd')], t); return; }
      if ((t = e.target.closest('[data-pedit]'))) { opts.onEdit(parts[+t.getAttribute('data-pedit')], null); return; }
      if (e.target.closest('[data-pnew]')) { opts.onEdit(null, st.cat || (st.mode === 'sec' ? secOf(st.sec).cats[0] : 'other')); return; }
      if ((t = e.target.closest('[data-pcart]'))) {
        t.disabled = true;
        E.api('supplierCart', {}, { id_product: t.getAttribute('data-pcart'), qty: 1 }).then(function (res) {
          t.disabled = false;
          E.toast(res.ok ? 'Añadida a la cesta de ' + res.source + ' (epwcentro)' : res.error, !res.ok);
        });
        return;
      }
      if (e.target.closest('[data-inew]')) { opts.onIncompat(); return; }
      if ((t = e.target.closest('[data-idel]'))) { opts.onIncompatDelete(+t.getAttribute('data-idel')); }
    });
    render();
    return { set: function (p) { parts = p; render(); }, setIncompat: function (w) { opts.incompat = w; render(); }, setMap: function (m) { opts.map = m; render(); } };
  }

  /* ---------- Editor de zonas sobre la foto del modelo ---------- */
  var STEPS = ['Toca el eje de la rueda delantera', 'Toca el eje de la rueda trasera', 'Toca la bisagra del plegado (donde se dobla el mástil)', 'Toca lo más alto del manillar'];

  /** Calcula las 5 partes a partir de 4 puntos (en px de la foto). Todos los patines tienen la misma estructura. */
  function autoZones(pts, w, h) {
    var F = pts[0], R = pts[1], H = pts[2], T = pts[3];
    var dir = R[0] >= F[0] ? 1 : -1, d = Math.max(20, Math.abs(R[0] - F[0])), r = 0.135 * d;
    function P(x, y) { return [Math.round(Math.max(0, Math.min(100, x / w * 100)) * 10) / 10, Math.round(Math.max(0, Math.min(100, y / h * 100)) * 10) / 10]; }
    var hy = H[1] + 0.03 * d;
    return {
      top: [P(T[0] - 0.13 * d, T[1] - 0.03 * d), P(T[0] + 0.13 * d, T[1] - 0.03 * d), P(T[0] + 0.13 * d, T[1] + 0.21 * d), P(T[0] - 0.13 * d, T[1] + 0.21 * d)],
      stem: [P(T[0] - dir * 0.06 * d, T[1] + 0.21 * d), P(T[0] + dir * 0.07 * d, T[1] + 0.21 * d), P(H[0] + dir * 0.06 * d, hy), P(H[0] - dir * 0.07 * d, hy)],
      front: [P(H[0] - dir * 0.07 * d, hy), P(H[0] + dir * 0.06 * d, hy), P(F[0] + dir * 1.25 * r, F[1] - 1.1 * r), P(F[0] + dir * 1.25 * r, F[1] + 1.35 * r),
        P(F[0] - dir * 1.3 * r, F[1] + 1.35 * r), P(F[0] - dir * 1.3 * r, F[1] - 1.2 * r)],
      base: [P(H[0] + dir * 0.06 * d, hy), P(H[0] + dir * 0.13 * d, hy), P(F[0] + dir * 0.27 * d, F[1] - 0.75 * r), P(R[0] - dir * 1.25 * r, R[1] - 0.75 * r),
        P(R[0] - dir * 1.25 * r, R[1] + 0.45 * r), P(F[0] + dir * 1.25 * r, F[1] + 0.45 * r), P(F[0] + dir * 1.25 * r, F[1] - 1.1 * r)],
      rear: [P(R[0] - dir * 1.25 * r, R[1] - 1.5 * r), P(R[0] + dir * 1.6 * r, R[1] - 1.5 * r), P(R[0] + dir * 1.6 * r, R[1] + 1.35 * r), P(R[0] - dir * 1.25 * r, R[1] + 1.35 * r)]
    };
  }

  /**
   * ctx: { photo, map, title, sections, onSave(map|null) → Promise(res) }
   * 1) 4 toques → las partes salen solas. 2) Se arrastran las esquinas (o los puntos del medio para añadir una esquina).
   */
  function zoneEditor(ctx) {
    var sections = (ctx.sections || SECTIONS).filter(function (s) { return s.key !== 'other'; });
    var map = ctx.map ? JSON.parse(JSON.stringify(ctx.map)) : { flip: 0, pts: [], polys: {} };
    var mode = map.polys && Object.keys(map.polys).length ? 'edit' : 'points', pts = [], sel = 'front', drag = null;
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg er-ze"><div class="er-row" style="flex-wrap:nowrap"><h2 style="margin-right:auto">Partes en la foto · ' + esc(ctx.title) + '</h2>' +
      '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-x aria-label="Cerrar">' + icon('x') + '</button></div>' +
      '<div id="er-ze-bar"></div><div class="er-ze-stage" id="er-ze-st"></div>' +
      '<div class="er-err" id="er-ze-err" hidden></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-zflip>' + icon('refresh', true) + 'Girar foto</button>' +
        '<button type="button" class="er-btn er-btn-ghost" data-zredo>Repetir 4 puntos</button>' +
        (ctx.map ? '<button type="button" class="er-btn er-btn-ghost er-btn-danger" data-zclear>Quitar zonas</button>' : '') +
        '<button type="button" class="er-btn er-btn-pri" data-zsave>' + icon('check', true) + 'Guardar zonas</button></div></div>';
    (E.root() || document.body).appendChild(wrap);
    var stage = wrap.querySelector('#er-ze-st');
    function img() { return stage.querySelector('img'); }
    function draw() {
      var bar = wrap.querySelector('#er-ze-bar');
      if (mode === 'points') {
        bar.innerHTML = '<div class="er-banner"><b>' + (pts.length + 1) + ' de 4 ·</b> ' + esc(STEPS[pts.length] || '') + '</div>';
      } else {
        bar.innerHTML = '<div class="er-row er-dw-chips">' + sections.map(function (s) {
          return '<button type="button" class="er-chip" data-zsel="' + s.key + '" aria-pressed="' + (sel === s.key) + '"><span class="er-dot" style="background:' + s.color + '"></span>' + esc(s.name) + '</button>';
        }).join('') + '</div><p class="er-muted er-small" style="margin:4px 0 0">Arrastra las esquinas de la parte elegida. Los puntos pequeños del medio añaden una esquina. Doble clic en una esquina la quita.</p>';
      }
      var polys = map.polys || {}, html = '<img src="' + esc(ctx.photo) + '" alt="" draggable="false"' + (map.flip ? ' style="transform:scaleX(-1)"' : '') + '>' +
        '<svg viewBox="0 0 100 100" preserveAspectRatio="none">' + (mode === 'edit' ? sections.filter(function (s) { return polys[s.key]; }).map(function (s) {
          return '<polygon class="er-phz' + (sel === s.key ? ' on' : '') + '" data-zsel="' + s.key + '" points="' + polys[s.key].map(function (p) { return p.join(','); }).join(' ') + '" style="--c:' + s.color + '"/>';
        }).join('') : '') + '</svg>';
      if (mode === 'points') {
        html += pts.map(function (p, i) { return '<span class="er-zh er-zh-pt" style="left:' + p[0] + '%;top:' + p[1] + '%">' + (i + 1) + '</span>'; }).join('');
      } else if (polys[sel]) {
        var poly = polys[sel], c = (secOf(sel) || {}).color;
        html += poly.map(function (p, i) { return '<span class="er-zh" data-v="' + i + '" style="left:' + p[0] + '%;top:' + p[1] + '%;--c:' + c + '"></span>'; }).join('');
        html += poly.map(function (p, i) {
          var q = poly[(i + 1) % poly.length];
          return '<span class="er-zh er-zh-mid" data-m="' + i + '" style="left:' + ((p[0] + q[0]) / 2) + '%;top:' + ((p[1] + q[1]) / 2) + '%;--c:' + c + '"></span>';
        }).join('');
      }
      stage.innerHTML = html;
    }
    function secOf(k) { return sections.filter(function (s) { return s.key === k; })[0]; }
    function pos(e) {
      var r = img().getBoundingClientRect();
      return [Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)), Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100))];
    }
    stage.addEventListener('pointerdown', function (e) {
      var t = e.target.closest('[data-v],[data-m]');
      if (mode === 'points') {
        if (!img()) return;
        pts.push(pos(e));
        if (pts.length === 4) {
          var r = img().getBoundingClientRect(), w = r.width, h = r.height;
          var px = pts.map(function (p) { return [p[0] / 100 * w, p[1] / 100 * h]; });
          map.polys = autoZones(px, w, h); map.pts = pts.map(function (p) { return [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]; });
          mode = 'edit'; sel = 'front';
        }
        draw(); return;
      }
      if (!t) return;
      e.preventDefault();
      var poly = map.polys[sel];
      if (t.hasAttribute('data-m')) {
        var i = +t.getAttribute('data-m');
        poly.splice(i + 1, 0, pos(e));
        drag = i + 1;
      } else drag = +t.getAttribute('data-v');
      stage.setPointerCapture(e.pointerId);
      draw();
    });
    stage.addEventListener('pointermove', function (e) {
      if (drag === null) return;
      var p = pos(e);
      map.polys[sel][drag] = [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
      draw();
    });
    stage.addEventListener('pointerup', function () { drag = null; });
    stage.addEventListener('dblclick', function (e) {
      var t = e.target.closest('[data-v]');
      if (!t || map.polys[sel].length <= 3) return;
      map.polys[sel].splice(+t.getAttribute('data-v'), 1); draw();
    });
    wrap.addEventListener('click', function (e) {
      var t;
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if ((t = e.target.closest('[data-zsel]')) && mode === 'edit') { sel = t.getAttribute('data-zsel'); draw(); return; }
      if (e.target.closest('[data-zredo]')) { pts = []; mode = 'points'; map.polys = {}; draw(); return; }
      if (e.target.closest('[data-zflip]')) {
        map.flip = map.flip ? 0 : 1;
        Object.keys(map.polys || {}).forEach(function (k) { map.polys[k] = map.polys[k].map(function (p) { return [Math.round((100 - p[0]) * 10) / 10, p[1]]; }); });
        pts = pts.map(function (p) { return [100 - p[0], p[1]]; });
        draw(); return;
      }
      var save = e.target.closest('[data-zsave],[data-zclear]');
      if (!save) return;
      if (save.hasAttribute('data-zsave') && mode !== 'edit') { var er = wrap.querySelector('#er-ze-err'); er.textContent = 'Marca primero los 4 puntos.'; er.hidden = false; return; }
      save.disabled = true;
      ctx.onSave(save.hasAttribute('data-zclear') ? null : map).then(function (res) {
        save.disabled = false;
        if (!res || !res.ok) { var er2 = wrap.querySelector('#er-ze-err'); er2.textContent = (res && res.error) || 'No se pudo guardar.'; er2.hidden = false; return; }
        wrap.remove(); E.toast('Zonas guardadas');
      });
    });
    draw();
  }

  /** Ventana para añadir o editar una pieza (en el PC). */
  function partDialog(p, zone, ctx) {
    p = p || { zone: zone || 'other' };
    var prod = p.product ? { id_product: p.id_product, id_product_attribute: p.id_product_attribute, name: p.product.name, image: p.product.image } : null;
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    function f(k, label, attrs) { return '<label class="er-field">' + label + '<input class="er-input" data-k="' + k + '" value="' + esc(p[k] == null ? '' : p[k]) + '" ' + (attrs || '') + '></label>'; }
    wrap.innerHTML = '<div class="er-dlg" style="max-width:660px"><h2>' + (p.id ? 'Editar pieza' : 'Añadir pieza') + ' · ' + esc(ctx.title) + '</h2>' +
      '<div class="er-fg"><label class="er-field">Parte y categoría<select class="er-input" data-k="zone">' + (ctx.sections || SECTIONS).map(function (sc) {
        return '<optgroup label="' + esc(sc.name) + '">' + sc.cats.map(function (z) { return '<option value="' + z + '"' + (p.zone === z ? ' selected' : '') + '>' + esc(ctx.zones[z] || z) + '</option>'; }).join('') + '</optgroup>';
      }).join('') + '</select></label>' +
        f('name', 'Pieza <span class="er-req">*</span>', 'maxlength="128" placeholder="Neumático trasero"') + f('spec', 'Medida o referencia técnica', 'maxlength="96" placeholder="10x2,5 · válvula acodada"') + '</div>' +
      '<div><div class="er-sub">Producto de la tienda</div><div id="er-pp"></div>' +
        '<label class="er-search" style="margin-top:6px">' + icon('search') + '<input class="er-input" id="er-pq" placeholder="Buscar producto de la tienda" autocomplete="off"></label><div class="er-pick" id="er-pres"></div></div>' +
      (ctx.admin ? '<div id="er-pepwc"></div><details class="er-psup"' + (p.supplier_name || p.supplier_ref || p.supplier_url || +p.supplier_price ? ' open' : '') + '><summary>' + icon('box', true) + 'Proveedor manual <span class="er-muted">(opcional · solo lo ves tú)</span></summary><div class="er-fg">' + f('supplier_name', 'Proveedor', 'maxlength="96"') + f('supplier_ref', 'Referencia', 'maxlength="64"') +
        f('supplier_price', 'Precio de compra (€)', 'inputmode="decimal"') + f('supplier_url', 'Enlace al producto del proveedor', 'maxlength="255" placeholder="https://"') + '</div></details>' : '') +
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
    // Si el producto ya tiene proveedor en epwcentro, se enseña eso y el bloque manual se esconde
    function drawEpwc(list) {
      var box = wrap.querySelector('#er-pepwc'), man = wrap.querySelector('.er-psup');
      if (!box) return;
      list = list || [];
      box.innerHTML = list.length ? '<div class="er-sub" style="margin:8px 0 4px">Proveedor en epwcentro</div>' + list.slice(0, 3).map(function (o) {
        var av = { 'in': '<span class="er-tag er-t-ok">Disponible</span>', out: '<span class="er-tag er-t-bad">Agotado</span>' }[o.availability] || '<span class="er-tag er-t-neu">Sin dato</span>';
        return '<div class="er-supplier er-small">' + icon('box', true) + '<b>' + esc(o.source) + '</b>' + (o.cost !== null ? ' · coste ' + esc(E.fmtMoney(o.cost)) : '') + ' ' + av +
          (o.url ? ' <a href="' + esc(o.url) + '" target="_blank" rel="noopener">Abrir</a>' : '') + '</div>';
      }).join('') : '';
      if (man) man.hidden = !!list.length;
    }
    function loadEpwc() {
      if (!ctx.admin) return;
      if (!prod || !prod.id_product) { drawEpwc([]); return; }
      E.api('supplierInfo', { id_product: prod.id_product }).then(function (res) { drawEpwc(res && res.ok ? res.epwc : []); });
    }
    drawProd();
    loadEpwc();
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
      if ((t = e.target.closest('[data-pp]'))) { var r = results[+t.getAttribute('data-pp')]; prod = { id_product: r.id_product, id_product_attribute: r.id_product_attribute, name: r.name, image: r.image }; drawProd(); loadEpwc(); wrap.querySelector('#er-pres').innerHTML = ''; wrap.querySelector('#er-pq').value = ''; return; }
      if (e.target.closest('[data-punlink]')) { prod = null; drawProd(); loadEpwc(); return; }
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


  /* ---------- Selector de productos de la tienda (con cantidad) ---------- */
  function productsPicker(box, list) {
    list = (list || []).map(function (p) { return { id_product: p.id_product, id_product_attribute: p.id_product_attribute, name: p.name, image: p.image, price: p.price, qty: p.qty || 1 }; });
    var results = [], timer;
    box.innerHTML = '<div id="er-pk-l"></div><label class="er-search" style="margin-top:6px">' + icon('search') + '<input class="er-input" id="er-pk-q" placeholder="Añadir producto de la tienda" autocomplete="off"></label><div class="er-pick" id="er-pk-r"></div>';
    function draw() {
      box.querySelector('#er-pk-l').innerHTML = list.length ? '<div class="er-mini">' + list.map(function (p, i) {
        return '<div class="er-row" style="flex-wrap:nowrap">' + pimg(p.image) + '<span class="er-grow" style="white-space:normal">' + esc(p.name) + '</span>' +
          '<button type="button" class="er-btn er-btn-sm er-icon-btn" data-pkd="' + i + '">−</button><b class="er-num">' + p.qty + '</b><button type="button" class="er-btn er-btn-sm er-icon-btn" data-pki="' + i + '">+</button>' +
          '<button type="button" class="er-btn er-btn-sm er-btn-ghost er-btn-danger er-icon-btn" data-pkx="' + i + '" aria-label="Quitar producto" title="Quitar producto">' + icon('trash', true) + '</button></div>';
      }).join('') + '</div>' : '<p class="er-muted er-small" style="margin:0">Sin productos.</p>';
    }
    box.addEventListener('input', function (e) {
      if (e.target.id !== 'er-pk-q') return;
      var v = e.target.value.trim(); clearTimeout(timer);
      timer = setTimeout(function () {
        if (v.length < 2) { box.querySelector('#er-pk-r').innerHTML = ''; return; }
        E.api('searchProducts', { q: v }).then(function (res) {
          results = res.products || [];
          box.querySelector('#er-pk-r').innerHTML = results.slice(0, 8).map(function (r, i) {
            return '<button type="button" data-pkp="' + i + '">' + pimg(r.image) + '<span class="er-grow"><b>' + esc(r.name) + '</b></span>' + stockTag(r.stock) + '<b class="er-num">' + esc(E.fmtMoney(r.price)) + '</b></button>';
          }).join('');
        });
      }, 300);
    });
    box.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-pkp]'))) {
        var r = results[+t.getAttribute('data-pkp')];
        list.push({ id_product: r.id_product, id_product_attribute: r.id_product_attribute, name: r.name, image: r.image, price: r.price, qty: 1 });
        box.querySelector('#er-pk-r').innerHTML = ''; box.querySelector('#er-pk-q').value = ''; draw(); return;
      }
      if ((t = e.target.closest('[data-pki]'))) { list[+t.getAttribute('data-pki')].qty++; draw(); return; }
      if ((t = e.target.closest('[data-pkx]'))) { list.splice(+t.getAttribute('data-pkx'), 1); draw(); return; }
      if ((t = e.target.closest('[data-pkd]'))) { var x = list[+t.getAttribute('data-pkd')]; x.qty--; if (x.qty <= 0) list.splice(list.indexOf(x), 1); draw(); }
    });
    draw();
    return { get: function () { return list.map(function (p) { return { id_product: p.id_product, id_product_attribute: p.id_product_attribute, qty: p.qty }; }); } };
  }

  function prodLines(products) {
    return products.length ? '<div class="er-mini" style="margin-top:6px">' + products.map(function (p) {
      return '<div class="er-row" style="flex-wrap:nowrap">' + pimg(p.image) + '<span class="er-grow" style="white-space:normal">' + esc((p.qty > 1 ? p.qty + ' × ' : '') + p.name) + '</span>' + stockTag(p.stock) + '<b class="er-num">' + esc(E.fmtMoney(p.price)) + '</b></div>';
    }).join('') + '</div>' : '';
  }

  /* ---------- Deslimitación ---------- */
  /** Botón llamativo con velocímetro: la aguja sube de 0 a tope al aparecer. */
  function unlockButton(list, attrs) {
    var from = 25, to = 100;
    (list || []).forEach(function (u) { if (u.speed_from) from = Math.min(from, u.speed_from); });
    var tops = (list || []).map(function (u) { return u.speed_to || 0; }).filter(Boolean);
    if (tops.length) to = Math.max.apply(null, tops);
    return '<button type="button" class="er-unlock" ' + (attrs || '') + '>' +
      '<svg class="er-gauge" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 23a11 11 0 1 1 22 0" class="er-g-arc"/>' +
      '<path d="M8.5 15.5l1.6 1.2M16 8.5v2M23.5 15.5l-1.6 1.2M11.8 10.6l.9 1.6M20.2 10.6l-.9 1.6" class="er-g-tick"/>' +
      '<g class="er-g-ndl"><path d="M16 23 16 11.5"/></g><circle cx="16" cy="23" r="2.2"/></svg>' +
      '<span>Deslimitar</span><small>' + from + ' → ' + to + ' km/h</small>' + ((list || []).length ? '' : '') + '</button>';
  }

  var DIFF = { 1: 'Fácil', 2: 'Media', 3: 'Difícil' };
  /** opts: list, admin, methods, onAdd(u, btn), onEdit(u|null), onDelete(id) */
  function UnlockPanel(el, opts) {
    function render() {
      var l = opts.list || [];
      el.innerHTML = (l.length ? '<div class="er-unl2-grid">' + l.map(function (u, i) {
        var cover = (u.products || []).filter(function (p) { return p.image; })[0];
        return '<div class="er-unl2">' +
          '<div class="er-unl2-ph">' + (cover ? '<img src="' + esc(cover.image) + '" alt="">' : '<svg class="er-gauge" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 23a11 11 0 1 1 22 0" class="er-g-arc"/><path d="M16 23 23 14"/><circle cx="16" cy="23" r="2.2"/></svg>') + '</div>' +
          '<div class="er-unl2-main">' +
            '<div class="er-unl2-top"><b>' + esc(u.method_name) + '</b>' +
              (u.speed_to ? '<span class="er-unl2-sp">' + (u.speed_from ? esc(u.speed_from) + ' → ' : '') + esc(u.speed_to) + ' km/h</span>' : '') +
              '<span class="er-unl2-p er-num">' + esc(E.fmtMoney(u.price)) + '</span></div>' +
            '<div class="er-unl2-meta">' + [DIFF[u.difficulty] || '', u.minutes ? u.minutes + ' min' : '', u.firmware ? 'Firmware ' + u.firmware : '', u.scope === 'brand' ? 'Toda la marca' : ''].filter(Boolean).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' +
            (u.products.length ? '<div class="er-unl2-prods">' + u.products.map(function (p) {
              return '<span>' + (p.image ? '<img src="' + esc(p.image) + '" alt="">' : '') + esc((p.qty > 1 ? p.qty + ' × ' : '') + p.name) + ' · <b>' + esc(E.fmtMoney(p.price)) + '</b>' + (p.stock <= 0 ? ' <em>sin stock</em>' : '') + '</span>';
            }).join('') + '</div>' : '') +
            '<details class="er-unl2-steps"><summary>Ver los pasos</summary><div class="er-kb-body">' + esc(u.steps) + '</div></details>' +
            (opts.admin && (u.supplier_name || u.supplier_url) ? '<div class="er-supplier er-small">' + icon('box', true) + esc(u.supplier_name || 'Dónde comprarlo') +
              (u.supplier_url ? ' <a href="' + esc(u.supplier_url) + '" target="_blank" rel="noopener">Abrir</a>' : '') + '</div>' : '') +
            '<div class="er-unl2-act">' +
              (opts.onAdd ? '<button type="button" class="er-btn er-btn-sm er-btn-pri" data-uadd="' + i + '">' + icon('plus', true) + 'Añadir al presupuesto</button>' : '') +
              (opts.onEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost" data-uedit="' + i + '">' + icon('pen', true) + 'Editar</button>' : '') +
              (opts.onDelete ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost er-btn-danger er-icon-btn" data-udel="' + i + '" aria-label="Borrar">' + icon('trash', true) + '</button>' : '') +
              '<span class="er-muted er-small" style="margin-left:auto">' + esc((u.author ? u.author + ' · ' : '') + E.fmtDate(u.date)) + '</span></div>' +
          '</div></div>';
      }).join('') + '</div>' : '<div class="er-empty">Aún no hay forma de deslimitar apuntada para este modelo.</div>') +
        (opts.onEdit ? '<button type="button" class="er-btn er-btn-sm" data-unew>' + icon('plus', true) + 'Añadir método</button>' : '');
    }
    el.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-uadd]'))) { opts.onAdd(opts.list[+t.getAttribute('data-uadd')], t); return; }
      if ((t = e.target.closest('[data-uedit]'))) { opts.onEdit(opts.list[+t.getAttribute('data-uedit')]); return; }
      if (e.target.closest('[data-unew]')) { opts.onEdit(null); return; }
      if ((t = e.target.closest('[data-udel]'))) {
        var u = opts.list[+t.getAttribute('data-udel')];
        E.dialog({ title: 'Borrar método', text: u.method_name + (u.speed_to ? ' · ' + u.speed_to + ' km/h' : ''), ok: 'Borrar', danger: true }).then(function (y) { if (y) opts.onDelete(u.id); });
      }
    });
    render();
    return { set: function (l) { opts.list = l; render(); } };
  }

  /** ctx: { title, methods, admin, canBrand, onSave(data, allBrand) → Promise(res) } */
  function unlockDialog(u, ctx) {
    u = u || { method: 'app', difficulty: 1, products: [] };
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    function f(k, label, attrs) { return '<label class="er-field">' + label + '<input class="er-input" data-k="' + k + '" value="' + esc(u[k] == null || u[k] === 0 ? '' : u[k]) + '" ' + (attrs || '') + '></label>'; }
    wrap.innerHTML = '<div class="er-dlg" style="max-width:680px"><h2>' + (u.id ? 'Editar' : 'Añadir') + ' deslimitación · ' + esc(ctx.title) + '</h2>' +
      '<div class="er-fg"><label class="er-field">Método<select class="er-input" data-k="method">' + Object.keys(ctx.methods).map(function (k) {
        return '<option value="' + k + '"' + (u.method === k ? ' selected' : '') + '>' + esc(ctx.methods[k]) + '</option>'; }).join('') + '</select></label>' +
        f('speed_from', 'Velocidad de fábrica (km/h)', 'inputmode="numeric" maxlength="3" placeholder="25"') + f('speed_to', 'Velocidad que alcanza (km/h)', 'inputmode="numeric" maxlength="3" placeholder="35"') +
        f('firmware', 'Firmware con el que funciona', 'maxlength="96" placeholder="DRV 1.5.x"') + f('minutes', 'Tiempo (minutos)', 'inputmode="numeric" maxlength="3"') +
        '<label class="er-field">Dificultad<select class="er-input" data-k="difficulty">' + [1, 2, 3].map(function (n) { return '<option value="' + n + '"' + (+u.difficulty === n ? ' selected' : '') + '>' + DIFF[n] + '</option>'; }).join('') + '</select></label>' +
        f('price', 'Precio del servicio con IVA (€)', 'inputmode="decimal"') + '</div>' +
      '<label class="er-field">Pasos <span class="er-req">*</span><textarea class="er-input" data-k="steps" rows="7" maxlength="5000" placeholder="1. Conectar la app…">' + esc(u.steps || '') + '</textarea></label>' +
      '<div><div class="er-sub">Piezas de la tienda que hacen falta</div><div id="er-u-pk"></div></div>' +
      (ctx.admin ? '<div class="er-sub" style="margin:8px 0 0">Dónde comprarlo (solo lo ves tú)</div><div class="er-fg">' + f('supplier_name', 'Proveedor', 'maxlength="96"') + f('supplier_url', 'Enlace', 'maxlength="255" placeholder="https://"') + '</div>' : '') +
      (ctx.canBrand && !u.id ? '<label class="er-toggle">Vale para toda la marca<input type="checkbox" class="er-sw" id="er-u-brand"></label>' : '') +
      '<div class="er-err" id="er-u-err" hidden></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar</button></div></div>';
    (E.root() || document.body).appendChild(wrap);
    var pk = productsPicker(wrap.querySelector('#er-u-pk'), u.products);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      var ok = e.target.closest('[data-ok]');
      if (!ok) return;
      var d = { products: pk.get() };
      wrap.querySelectorAll('[data-k]').forEach(function (i) { d[i.getAttribute('data-k')] = i.value; });
      if (!ctx.admin) { d.supplier_name = u.supplier_name || ''; d.supplier_url = u.supplier_url || ''; }
      ok.disabled = true;
      ctx.onSave(d, !!(wrap.querySelector('#er-u-brand') && wrap.querySelector('#er-u-brand').checked)).then(function (res) {
        ok.disabled = false;
        if (!res.ok) { var er = wrap.querySelector('#er-u-err'); er.textContent = res.error; er.hidden = false; return; }
        wrap.remove(); E.toast('Guardado');
      });
    });
  }

  /* ---------- Precio cerrado ---------- */
  /** opts: list, onAdd(f, btn), onEdit(f|null), onDelete(id) */
  function FixedPanel(el, opts) {
    function render() {
      var l = opts.list || [];
      el.innerHTML = (l.length ? '<div class="er-fixed-grid">' + l.map(function (f, i) {
        return '<div class="er-fixed"><div class="er-row" style="flex-wrap:nowrap;align-items:flex-start"><b class="er-grow">' + esc(f.name) + '</b><span class="er-fixed-p er-num">' + esc(E.fmtMoney(f.price)) + '</span></div>' +
          (f.scope === 'brand' ? '<span class="er-tag er-t-neu">Toda la marca</span>' : '') +
          (f.notes ? '<div class="er-small er-muted">' + esc(f.notes) + '</div>' : '') + prodLines(f.products) +
          '<div class="er-row" style="margin-top:8px">' +
            (opts.onAdd ? '<button type="button" class="er-btn er-btn-sm er-btn-pri" data-fadd="' + i + '">' + icon('plus', true) + 'Aplicar</button>' : '') +
            (opts.onEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost er-icon-btn" data-fedit="' + i + '" aria-label="Editar">' + icon('pen', true) + '</button>' : '') +
            (opts.onDelete ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost er-icon-btn er-btn-danger" data-fdel="' + i + '" aria-label="Borrar">' + icon('trash', true) + '</button>' : '') + '</div></div>';
      }).join('') + '</div>' : '<div class="er-empty">Sin precios cerrados para este modelo.</div>') +
        (opts.onEdit ? '<button type="button" class="er-btn er-btn-sm" data-fnew>' + icon('plus', true) + 'Añadir precio cerrado</button>' : '');
    }
    el.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-fadd]'))) { opts.onAdd(opts.list[+t.getAttribute('data-fadd')], t); return; }
      if ((t = e.target.closest('[data-fedit]'))) { opts.onEdit(opts.list[+t.getAttribute('data-fedit')]); return; }
      if (e.target.closest('[data-fnew]')) { opts.onEdit(null); return; }
      if ((t = e.target.closest('[data-fdel]'))) {
        var f = opts.list[+t.getAttribute('data-fdel')];
        E.dialog({ title: 'Borrar precio cerrado', text: f.name, ok: 'Borrar', danger: true }).then(function (y) { if (y) opts.onDelete(f.id); });
      }
    });
    render();
    return { set: function (l) { opts.list = l; render(); } };
  }

  /** ctx: { title, canBrand, onSave(data, allBrand) → Promise(res) } */
  function fixedDialog(f, ctx) {
    f = f || { products: [] };
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    wrap.innerHTML = '<div class="er-dlg" style="max-width:600px"><h2>' + (f.id ? 'Editar' : 'Añadir') + ' precio cerrado · ' + esc(ctx.title) + '</h2>' +
      '<div class="er-fg"><label class="er-field">Qué incluye <span class="er-req">*</span><input class="er-input" data-k="name" maxlength="128" value="' + esc(f.name || '') + '" placeholder="Cambio de rueda trasera"></label>' +
        '<label class="er-field">Precio cerrado con IVA (€) <span class="er-req">*</span><input class="er-input" data-k="price" inputmode="decimal" value="' + esc(f.price ? String(f.price).replace('.', ',') : '') + '" placeholder="35"></label></div>' +
      '<div><div class="er-sub">Piezas incluidas (para descontar stock)</div><div id="er-f-pk"></div></div>' +
      '<label class="er-field">Notas<input class="er-input" data-k="notes" maxlength="500" value="' + esc(f.notes || '') + '" placeholder="Incluye neumático, cámara y montaje"></label>' +
      '<p class="er-muted er-small" style="margin:0">Al aplicarlo, la mano de obra se ajusta sola para que el total sea el precio cerrado.</p>' +
      (ctx.canBrand && !f.id ? '<label class="er-toggle">Vale para toda la marca<input type="checkbox" class="er-sw" id="er-f-brand"></label>' : '') +
      '<div class="er-err" id="er-f-err" hidden></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Guardar</button></div></div>';
    (E.root() || document.body).appendChild(wrap);
    var pk = productsPicker(wrap.querySelector('#er-f-pk'), f.products);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      var ok = e.target.closest('[data-ok]');
      if (!ok) return;
      var d = { products: pk.get() };
      wrap.querySelectorAll('[data-k]').forEach(function (i) { d[i.getAttribute('data-k')] = i.value; });
      ok.disabled = true;
      ctx.onSave(d, !!(wrap.querySelector('#er-f-brand') && wrap.querySelector('#er-f-brand').checked)).then(function (res) {
        ok.disabled = false;
        if (!res.ok) { var er = wrap.querySelector('#er-f-err'); er.textContent = res.error; er.hidden = false; return; }
        wrap.remove(); E.toast('Guardado');
      });
    });
  }

  /* ---------- Revisión de salida (no obligatoria) ---------- */
  /** opts: items[], done{item: {by,date}}, canEdit, onToggle(item) → Promise(res con checklist) */
  function Checklist(el, opts) {
    function render() {
      var done = opts.done || {}, n = opts.items.filter(function (i) { return done[i]; }).length;
      el.innerHTML = '<div class="er-check">' + opts.items.map(function (it) {
        var d = done[it];
        return '<button type="button" class="er-chk' + (d ? ' on' : '') + '" data-chk="' + esc(it) + '"' + (opts.canEdit ? '' : ' disabled') + ' title="' + esc(d ? 'Revisado por ' + d.by + ' · ' + E.fmtDate(d.date) : 'Sin revisar') + '">' +
          '<span class="er-chk-b">' + (d ? icon('check', true) : '') + '</span>' + esc(it) + '</button>';
      }).join('') + '</div><div class="er-muted er-small">' + n + ' de ' + opts.items.length + ' revisados · no es obligatorio</div>';
    }
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-chk]');
      if (!t || !opts.canEdit) return;
      t.disabled = true;
      opts.onToggle(t.getAttribute('data-chk')).then(function (res) {
        if (res && res.ok && res.checklist) { opts.done = res.checklist; }
        render();
      });
    });
    render();
    return { set: function (d) { opts.done = d; render(); } };
  }


  /* ---------- Avisos del modelo (piezas que no valen): botón de campana y lista ---------- */
  function incompatButton(list, canEdit, attrs) {
    var n = (list || []).length;
    if (!n && !canEdit) return '';
    return '<button type="button" class="er-bell' + (n ? ' has' : '') + '" ' + (attrs || 'data-bell') + ' title="Piezas que no valen o con precaución para este modelo">' +
      '<svg class="er-bell-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/></svg>' +
      '<span>Avisos del modelo</span>' + (n ? '<b>' + n + '</b>' : '') + '</button>';
  }
  /** opts: title, list, onAdd() (abre el formulario), onDelete(id) → Promise(lista nueva) */
  function incompatPanel(opts) {
    var list = opts.list || [];
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    function draw() {
      wrap.innerHTML = '<div class="er-dlg er-bellp"><div class="er-bellp-h">' + icon('alert', true) + '<b>Ojo con ' + esc(opts.title) + '</b>' +
        (opts.onAdd ? '<button type="button" class="er-btn er-btn-sm" data-badd>' + icon('plus', true) + 'Apuntar aviso</button>' : '') +
        '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-x aria-label="Cerrar">' + icon('x') + '</button></div>' +
        (list.length ? list.map(function (w) {
          var block = w.level === 'block';
          return '<div class="er-bellp-it">' + (w.image ? '<img class="er-pimg" src="' + esc(w.image) + '" alt="">' : '<i class="' + (block ? 'no' : 'ojo') + '">' + (block ? '✕' : '!') + '</i>') +
            '<div class="er-grow"><b>' + esc(w.label) + '</b><p>' + esc(w.reason) + '</p><small>' + esc((w.author ? w.author + ' · ' : '') + (w.scope === 'brand' ? 'toda la marca' : E.fmtDate(w.date))) + '</small></div>' +
            '<em class="' + (block ? 'no' : 'ojo') + '">' + (block ? 'No poner' : 'Precaución') + '</em>' +
            (opts.onDelete ? '<button type="button" class="er-btn er-btn-ghost er-btn-sm er-icon-btn" data-bdel="' + w.id + '" aria-label="Quitar aviso">' + icon('trash', true) + '</button>' : '') + '</div>';
        }).join('') : '<div class="er-empty" style="margin:14px">Sin avisos. Apunta aquí las piezas que no valen para este modelo.</div>') + '</div>';
    }
    draw();
    (E.root() || document.body).appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      var t;
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if (e.target.closest('[data-badd]')) { wrap.remove(); opts.onAdd(); return; }
      if ((t = e.target.closest('[data-bdel]'))) {
        opts.onDelete(+t.getAttribute('data-bdel')).then(function (l) { list = l || []; draw(); });
      }
    });
  }


  /* ---------- Publicar repuestos compatibles en la tienda (spcompatpro) ---------- */
  /** ctx: { title, id_model, spcp (bundle), parts, onDone(bundle) } */
  function spcpDialog(ctx) {
    var B = ctx.spcp, sel = {}, extra = [], models = {}, results = [], timer;
    var cats = B.categories || [];
    function guessCat(name) {
      var best = cats[0] ? cats[0].id : 0, bs = 0;
      cats.forEach(function (c) { var sc = E.fuzzyScore(c.name, name || ''); if (sc > bs) { bs = sc; best = c.id; } });
      return best;
    }
    var items = (ctx.parts || []).filter(function (p) { return p.id_product && p.product; }).map(function (p) {
      return { id_product: p.id_product, name: p.product.name, image: p.product.image, cat: guessCat(p.name + ' ' + (ctx.zones && ctx.zones[p.zone] || '')) };
    });
    var uniq = {};
    items = items.filter(function (it) { if (uniq[it.id_product]) return false; uniq[it.id_product] = 1; return true; });
    items.forEach(function (it) { if (B.published[it.id_product] === undefined) sel[it.id_product] = true; });
    if (B.linked) models[B.linked] = true;
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    function catSel(it) { return '<select class="er-input er-spcp-cat" data-cat="' + it.id_product + '">' + cats.map(function (c) { return '<option value="' + c.id + '"' + (c.id === it.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>'; }
    function draw(q) {
      var all = items.concat(extra);
      var mq = E.fold(q || '');
      wrap.innerHTML = '<div class="er-dlg er-spcp"><h2>' + icon('box') + ' Publicar en la tienda · ' + esc(ctx.title) + '</h2>' +
        '<p class="er-muted er-small" style="margin:0">Salen en la ficha del patín de la tienda como «repuestos compatibles». Puedes lanzarlos a varios patines a la vez.</p>' +
        '<div class="er-spcp-cols"><div><div class="er-sub">1 · Productos</div><div class="er-mini er-spcp-list">' + (all.length ? all.map(function (it) {
          var pub = B.published[it.id_product] !== undefined;
          return '<label class="er-spcp-row"><input type="checkbox" data-pp="' + it.id_product + '"' + (sel[it.id_product] ? ' checked' : '') + '>' + pimg(it.image) +
            '<span class="er-grow" style="white-space:normal">' + esc(it.name) + (pub ? ' <span class="er-tag er-t-ok">Ya en la tienda</span>' : '') + '</span>' + catSel(it) + '</label>';
        }).join('') : '<div class="er-empty">Este modelo no tiene piezas con producto de la tienda. Búscalos abajo.</div>') + '</div>' +
        '<label class="er-search" style="margin-top:8px">' + icon('search') + '<input class="er-input" id="er-spq" placeholder="Añadir otro producto de la tienda" autocomplete="off" data-novoice></label><div class="er-pick" id="er-spr"></div></div>' +
        '<div><div class="er-sub">2 · Patines de la tienda</div><label class="er-search">' + icon('search') + '<input class="er-input" id="er-smq" placeholder="Buscar patín" value="' + esc(q || '') + '" autocomplete="off" data-novoice></label>' +
        '<div class="er-mini er-spcp-list er-spcp-models">' + (B.models || []).filter(function (m) { return !mq || E.fold(m.brand + ' ' + m.name).indexOf(mq) > -1 || models[m.id]; }).slice(0, 80).map(function (m) {
          return '<label class="er-spcp-row"><input type="checkbox" data-pm="' + m.id + '"' + (models[m.id] ? ' checked' : '') + '><span class="er-grow">' + esc((m.brand ? m.brand + ' ' : '') + m.name) + (m.id === B.linked ? ' <span class="er-tag er-t-neu">Este modelo</span>' : '') + (m.active ? '' : ' <span class="er-tag er-t-warn">Oculto</span>') + '</span></label>';
        }).join('') + '</div></div></div>' +
        '<div class="er-err" id="er-sperr" hidden></div>' +
        '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>' + icon('check', true) + 'Publicar</button></div></div>';
      var mi = wrap.querySelector('#er-smq');
      if (q !== undefined && mi) { mi.focus(); mi.setSelectionRange(mi.value.length, mi.value.length); }
    }
    draw();
    (E.root() || document.body).appendChild(wrap);
    wrap.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-pp')) sel[t.getAttribute('data-pp')] = t.checked;
      if (t.hasAttribute('data-pm')) models[t.getAttribute('data-pm')] = t.checked;
      if (t.hasAttribute('data-cat')) { var id = +t.getAttribute('data-cat'); items.concat(extra).forEach(function (it) { if (it.id_product === id) it.cat = +t.value; }); }
    });
    wrap.addEventListener('input', function (e) {
      if (e.target.id === 'er-smq') { draw(e.target.value); return; }
      if (e.target.id !== 'er-spq') return;
      var v = e.target.value.trim(); clearTimeout(timer);
      timer = setTimeout(function () {
        if (v.length < 2) { wrap.querySelector('#er-spr').innerHTML = ''; return; }
        E.api('searchProducts', { q: v }).then(function (res) {
          results = res.products || [];
          wrap.querySelector('#er-spr').innerHTML = results.slice(0, 8).map(function (r, i) { return '<button type="button" data-spa="' + i + '">' + pimg(r.image) + '<span class="er-grow"><b>' + esc(r.name) + '</b></span></button>'; }).join('');
        });
      }, 300);
    });
    wrap.addEventListener('click', function (e) {
      var t;
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      if ((t = e.target.closest('[data-spa]'))) {
        var r = results[+t.getAttribute('data-spa')];
        if (!items.concat(extra).some(function (it) { return it.id_product === r.id_product; })) extra.push({ id_product: r.id_product, name: r.name, image: r.image, cat: guessCat(r.name) });
        sel[r.id_product] = true; draw(); return;
      }
      var ok = e.target.closest('[data-ok]');
      if (!ok) return;
      var list = items.concat(extra).filter(function (it) { return sel[it.id_product]; }).map(function (it) { return { id_product: it.id_product, id_category: it.cat }; });
      var ms = Object.keys(models).filter(function (k) { return models[k]; });
      var er = wrap.querySelector('#er-sperr');
      if (!list.length) { er.textContent = 'Marca al menos un producto.'; er.hidden = false; return; }
      if (!ms.length) { er.textContent = 'Marca al menos un patín de la tienda.'; er.hidden = false; return; }
      ok.disabled = true;
      E.api('spcpPublish', {}, { id_model: ctx.id_model, items: JSON.stringify(list), models: JSON.stringify(ms) }).then(function (res) {
        ok.disabled = false;
        if (!res.ok) { er.textContent = res.error; er.hidden = false; return; }
        wrap.remove(); E.toast(res.added ? res.added + ' repuesto(s) publicados en la tienda' : 'Ya estaban todos publicados');
        ctx.onDone(res.spcp);
      });
    });
  }

  /** Enlazar el modelo del taller con su modelo de la tienda. ctx: { id_model, spcp, title, onDone(bundle) } */
  function spcpLinkDialog(ctx) {
    var B = ctx.spcp;
    E.dialog({ title: 'Patín de la tienda para ' + ctx.title, text: 'Escribe parte del nombre tal como está en Repuestos compatibles.', input: true, inputLabel: 'Buscar', ok: 'Buscar' }).then(function (q) {
      if (q === false || q === null || q === undefined) return;
      var f = E.fold(q);
      var list = (B.models || []).filter(function (m) { return E.fold(m.brand + ' ' + m.name).indexOf(f) > -1; }).slice(0, 12);
      var wrap = document.createElement('div');
      wrap.className = 'er-modal';
      wrap.innerHTML = '<div class="er-dlg" style="max-width:520px"><h2>Elige el patín de la tienda</h2><div class="er-pick">' + (list.length ? list.map(function (m) {
        return '<button type="button" data-lk="' + m.id + '"><span class="er-grow"><b>' + esc((m.brand ? m.brand + ' ' : '') + m.name) + '</b></span></button>';
      }).join('') : '<div class="er-empty">Nada con «' + esc(q) + '».</div>') + '</div><div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cerrar</button></div></div>';
      (E.root() || document.body).appendChild(wrap);
      wrap.addEventListener('click', function (e) {
        var t;
        if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
        if ((t = e.target.closest('[data-lk]'))) {
          E.api('spcpLink', {}, { id_model: ctx.id_model, spcp: t.getAttribute('data-lk') }).then(function (res) { wrap.remove(); E.toast('Enlazado con la tienda'); ctx.onDone(res.spcp); });
        }
      });
    });
  }

  /** Barra de tienda: a qué patín está enlazado y botón para publicar. */
  function spcpBar(B, canEdit) {
    if (!B) return '';
    var m = (B.models || []).filter(function (x) { return x.id === B.linked; })[0];
    return '<div class="er-spcpbar">' + icon('box', true) + '<span class="er-grow">Tienda: ' + (m ? '<b>' + esc((m.brand ? m.brand + ' ' : '') + m.name) + '</b>' + (B.auto ? ' <span class="er-muted er-small">(encontrado por el nombre)</span>' : '') + ' · ' + Object.keys(B.published || {}).length + ' repuestos publicados' : '<b>sin enlazar</b>') + '</span>' +
      (canEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost" data-spcplink>' + (m ? 'Cambiar' : 'Enlazar') + '</button><button type="button" class="er-btn er-btn-sm er-btn-pri" data-spcppub>' + icon('plus', true) + 'Publicar en la tienda</button>' : '') + '</div>';
  }

  /* ---------- Batería del modelo (medidas del hueco + configurador de baterías) ---------- */
  function batterySummary(b) {
    if (!b) return '';
    var dims = b.len && b.wid && b.hei ? b.len + ' × ' + b.wid + ' × ' + b.hei + ' mm' : '';
    var el = b.volt ? b.volt + ' V' + (b.maxAh ? ' · ' + (b.minAh ? b.minAh + '–' : 'hasta ') + b.maxAh + ' Ah' : '') : '';
    return [el, dims].filter(Boolean).join(' · ');
  }
  /** opts: { data, canEdit, onSave(data) → Promise(res) } */
  function BatteryPanel(el, opts) {
    var b = opts.data;
    function chips(kind, list, chosen) {
      var imgs = b.connectorImages || {};
      return Object.keys(list).map(function (k) {
        return '<button type="button" class="er-opt" data-bc="' + kind + ':' + k + '" aria-pressed="' + (chosen.indexOf(k) > -1) + '"' + (opts.canEdit ? '' : ' disabled') + '>' +
          (imgs[k] ? '<img src="' + esc(imgs[k]) + '" alt="">' : '') + '<span>' + esc(list[k]) + '</span></button>';
      }).join('') + (opts.canEdit && b.module ? '<button type="button" class="er-opt er-add" data-bnew="' + (kind === 'ctrl' ? 'controller' : 'charge') + '">' + icon('plus', true) + (kind === 'ctrl' ? 'Añadir conector' : 'Añadir toma de carga') + '</button>' : '');
    }
    /* Conector nuevo: nombre + foto, se añade también al configurador de baterías */
    function newConnector(kind) {
      var wrap = document.createElement('div');
      wrap.className = 'er-modal';
      wrap.innerHTML = '<div class="er-dlg" style="max-width:520px"><h2>' + (kind === 'controller' ? 'Nuevo conector hacia la controladora' : 'Nueva toma de carga') + '</h2>' +
        '<p class="er-muted er-small" style="margin:0">Se añade también al configurador de baterías de la tienda, con su foto.</p>' +
        '<label class="er-field">Nombre <span class="er-req">*</span><input class="er-input" id="er-cn-l" maxlength="60" placeholder="GX12 · 3 contactos"></label>' +
        '<label class="er-field">Descripción para el cliente<input class="er-input" id="er-cn-i" maxlength="300" placeholder="Mide el diámetro y cuenta los contactos"></label>' +
        '<div class="er-sub">Foto <span class="er-req">*</span></div><div class="er-cn-ph" id="er-cn-ph">' + icon('camera') + '<span>Arrastra la foto aquí o pulsa para elegirla</span></div><input type="file" id="er-cn-f" accept="image/jpeg,image/png,image/webp" class="er-vh">' +
        '<div class="er-err" id="er-cn-err" hidden></div>' +
        '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>Añadir</button></div></div>';
      (E.root() || document.body).appendChild(wrap);
      var file = null, fi = wrap.querySelector('#er-cn-f'), ph = wrap.querySelector('#er-cn-ph');
      E.dropZone(ph, function () { return fi; });
      fi.addEventListener('change', function () {
        file = fi.files[0] || null;
        if (file) ph.innerHTML = '<img src="' + URL.createObjectURL(file) + '" alt="">';
      });
      wrap.addEventListener('click', function (e) {
        if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
        if (e.target.closest('#er-cn-ph')) { fi.click(); return; }
        var ok = e.target.closest('[data-ok]');
        if (!ok) return;
        var er = wrap.querySelector('#er-cn-err');
        if (!wrap.querySelector('#er-cn-l').value.trim()) { er.textContent = 'Escribe el nombre.'; er.hidden = false; return; }
        if (!file) { er.textContent = 'Añade la foto del conector.'; er.hidden = false; return; }
        ok.disabled = true;
        E.shrinkImage(file, 1000).then(function (small) {
          var fd = new FormData();
          fd.append('kind', kind); fd.append('label', wrap.querySelector('#er-cn-l').value.trim()); fd.append('info', wrap.querySelector('#er-cn-i').value.trim());
          fd.append('id_model', opts.id_model || 0); fd.append('image', small, small.name || 'conector.jpg');
          return E.api('connectorAdd', {}, fd);
        }).then(function (res) {
          ok.disabled = false;
          if (!res.ok) { er.textContent = res.error; er.hidden = false; return; }
          wrap.remove();
          var keep = { ctrl: (b.ctrl || []).slice(), charge: (b.charge || []).slice() };
          b = res.battery; b.ctrl = keep.ctrl; b.charge = keep.charge;
          (kind === 'controller' ? b.ctrl : b.charge).push(res.id);
          render(); E.toast('Añadido también al configurador de baterías. Pulsa «Guardar» para dejarlo marcado en este modelo.');
        });
      });
    }
    function render() {
      var dis = opts.canEdit ? '' : ' disabled';
      el.innerHTML = '<div class="er-bat">' +
        '<div class="er-bat-st">' + (b.linked ? '<span class="er-tag er-t-ok">' + icon('check', true) + 'Unido al configurador de baterías</span>' : b.module ? (b.model_id ? '<span class="er-tag er-t-neu">En el configurador, aún sin datos</span>' : '<span class="er-tag er-t-warn">Este modelo no está en el catálogo del configurador de baterías</span>') : '') + '</div>' +
        '<div class="er-sub">Hueco de la batería (medidas internas)</div><div class="er-fg er-bat-3">' +
          '<label class="er-field">Largo (mm)<input class="er-input" data-bk="len" inputmode="decimal" value="' + esc(b.len) + '"' + dis + '></label>' +
          '<label class="er-field">Ancho (mm)<input class="er-input" data-bk="wid" inputmode="decimal" value="' + esc(b.wid) + '"' + dis + '></label>' +
          '<label class="er-field">Alto (mm)<input class="er-input" data-bk="hei" inputmode="decimal" value="' + esc(b.hei) + '"' + dis + '></label></div>' +
        '<div class="er-sub">Batería que le entra</div><div class="er-fg er-bat-3">' +
          '<label class="er-field">Voltaje<select class="er-input" data-bk="volt"' + dis + '><option value="">—</option>' + (b.volts || []).map(function (v) { return '<option value="' + v + '"' + (+b.volt === +v ? ' selected' : '') + '>' + v + ' V</option>'; }).join('') + '</select></label>' +
          '<label class="er-field">Ah mínimo<input class="er-input" data-bk="minAh" inputmode="decimal" value="' + esc(b.minAh) + '"' + dis + '></label>' +
          '<label class="er-field">Ah máximo que entra<input class="er-input" data-bk="maxAh" inputmode="decimal" value="' + esc(b.maxAh) + '"' + dis + '></label></div>' +
        '<div class="er-sub">Conector hacia la controladora</div><div class="er-opts er-bat-con">' + chips('ctrl', b.connectors.controller || {}, b.ctrl || []) + '</div>' +
        '<div class="er-sub">Conector de carga</div><div class="er-opts er-bat-con">' + chips('charge', b.connectors.charge || {}, b.charge || []) + '</div>' +
        '<label class="er-field">Observaciones (salen también en el configurador)<textarea class="er-input" data-bk="notes" rows="2" maxlength="800"' + dis + '>' + esc(b.notes) + '</textarea></label>' +
        '<div class="er-err" id="er-berr" hidden></div>' +
        (opts.canEdit ? '<div class="er-row"><button type="button" class="er-btn er-btn-pri" data-bsave>' + icon('check', true) + 'Guardar' + (b.model_id ? ' en el taller y en el configurador' : '') + '</button></div>' : '') + '</div>';
    }
    el.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-bnew]'))) { newConnector(t.getAttribute('data-bnew')); return; }
      if ((t = e.target.closest('[data-bc]')) && opts.canEdit) { t.setAttribute('aria-pressed', String(t.getAttribute('aria-pressed') !== 'true')); return; }
      if (!(t = e.target.closest('[data-bsave]'))) return;
      var d = { ctrl: [], charge: [] };
      el.querySelectorAll('[data-bk]').forEach(function (i) { d[i.getAttribute('data-bk')] = i.value; });
      el.querySelectorAll('[data-bc][aria-pressed="true"]').forEach(function (x) { var a = x.getAttribute('data-bc').split(':'); d[a[0]].push(a[1]); });
      t.disabled = true;
      opts.onSave(d).then(function (res) {
        t.disabled = false;
        if (!res.ok) { var er = el.querySelector('#er-berr'); er.textContent = res.error; er.hidden = false; return; }
        b = res.battery; render();
        E.toast(res.synced ? 'Guardado también en el configurador de baterías' : res.model_id === '' && b.module ? 'Guardado en el taller (el modelo no está en el configurador)' : 'Guardado');
        if (res.skipped && res.skipped.length) E.toast('No se pudo pasar a: ' + res.skipped.join(', ') + ' (ese voltaje no está en su tabla de precios)', true);
      });
    });
    render();
  }

  E.PartsDiagram = PartsDiagram;
  E.spcpDialog = spcpDialog;
  E.spcpLinkDialog = spcpLinkDialog;
  E.spcpBar = spcpBar;
  E.BatteryPanel = BatteryPanel;
  E.batterySummary = batterySummary;
  E.incompatButton = incompatButton;
  E.incompatPanel = incompatPanel;
  E.UnlockPanel = UnlockPanel;
  E.unlockButton = unlockButton;
  E.unlockDialog = unlockDialog;
  E.FixedPanel = FixedPanel;
  E.fixedDialog = fixedDialog;
  E.Checklist = Checklist;
  E.productsPicker = productsPicker;
  E.zoneEditor = zoneEditor;
  E.photoMap = photoMap;
  E.SECTIONS = SECTIONS;
  E.partDialog = partDialog;
  E.PartsSearch = PartsSearch;
  E.incompatDialog = incompatDialog;
  E.confirmIncompat = confirmIncompat;

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
