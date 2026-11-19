/* Reparaciones del taller · tablero */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'board') return;

  var repairs = D.repairs || [];
  var catById = {};
  (D.categories || []).forEach(function (c) { catById[c.id] = c; });

  var FILTERS = [
    { id: 'all', name: 'Todas', f: function () { return true; } },
    { id: 'mine', name: 'Mis reparaciones', f: function (r) { return r.id_employee_tech === D.me; } },
    { id: 'urgent', name: 'Urgentes', f: function (r) { return !!r.urgent; } },
    { id: 'warranty', name: 'En garantía', f: function (r) { return !!r.warranty; } },
    { id: 'wait', name: 'Esperando pieza', f: function (r) { return !!r.waiting_part; } }
  ];
  var state = { filter: 'all', q: '', cat: '' };
  try { var saved = JSON.parse(localStorage.getItem('ecor-board') || '{}'); if (saved.filter) state.filter = saved.filter; if (saved.cat) state.cat = saved.cat; } catch (e) {}

  app.innerHTML =
    '<header class="er-head">' +
      '<div class="er-brand"><div class="er-ico">' + icon('logo') + '</div><div><h1>Reparaciones</h1><p id="er-sub" class="er-num"></p></div></div>' +
      '<label class="er-search">' + icon('search') + '<input id="er-q" class="er-input" type="search" autocomplete="off" placeholder="Cliente, teléfono, nº de serie o REP-" aria-label="Buscar reparación"></label>' +
      '<a class="er-btn" href="' + esc(E.boot.links.cash) + '">' + icon('tag') + '<span>Caja</span></a>' +
      '<a class="er-btn" href="' + esc(E.boot.links.stats) + '">' + icon('chart') + '<span>Indicadores</span></a>' +
      '<a class="er-btn er-btn-pri" href="' + esc(E.boot.links['new']) + '">' + icon('plus') + '<span>Nueva reparación</span></a>' +
    '</header>' +
    '<div class="er-filters" id="er-filters"></div>' +
    '<div class="er-results" id="er-results" hidden></div>' +
    '<div class="er-board" id="er-board"></div>' +
    '<div id="er-archive" hidden></div>';

  var $ = function (s) { return app.querySelector(s); };
  var nf = /[?&]notfound=(\d+)/.exec(location.search);
  if (nf) setTimeout(function () { E.toast('La reparación nº ' + nf[1] + ' no se pudo abrir. Si se repite, mira Parámetros avanzados › Registros.', true); }, 300);

  function match(r) {
    var f = FILTERS.filter(function (x) { return x.id === state.filter; })[0] || FILTERS[0];
    if (!f.f(r)) return false;
    if (state.cat && String(r.id_category) !== String(state.cat)) return false;
    if (!state.q) return true;
    var q = state.q.toLowerCase();
    var digits = q.replace(/\D/g, '');
    var hay = [r.reference, r.customer_name, r.serial, r.device_name, r.tracking_code, r.category_name].join(' ').toLowerCase();
    if (hay.indexOf(q) > -1) return true;
    return digits.length >= 3 && String(r.phone || '').replace(/\D/g, '').indexOf(digits) > -1;
  }

  function daysLabel(r) {
    if (r.status === 'ready' && r.days_in_status >= D.pickupDays) {
      return { text: 'Sin recoger ' + r.days_in_status + ' d', late: true };
    }
    var d = r.days_in_shop;
    return { text: d === 0 ? 'Hoy' : d + ' d', late: r.status !== 'ready' && d >= D.lateDays };
  }

  function card(r) {
    var tags = (r.urgent ? '<span class="er-tag er-t-urg">Urgente</span>' : '') +
      (r.warranty ? '<span class="er-tag er-t-gar">Garantía</span>' : '') +
      (r.waiting_part ? '<span class="er-tag er-t-wait">Esperando pieza</span>' : '');
    var dl = daysLabel(r);
    var cat = catById[r.id_category] || { name: r.category_name || '', icon: r.category_icon || 'other' };
    var fault = r.fault_customer || (r.faults || []).join(', ');
    return '<article class="er-card" tabindex="0" data-id="' + r.id + '" aria-label="' + esc(r.reference + ', ' + r.device_name) + '">' +
      '<div class="er-c-top"><span class="er-ref">' + esc(r.reference) + '</span>' + tags + '</div>' +
      '<div class="er-c-dev"><div class="er-c-img">' + (r.cover ? '<img src="' + esc(r.cover) + '" alt="" loading="lazy" draggable="false">' : icon(cat.icon || 'other')) + '</div><div class="er-c-devtxt">' +
        '<div class="er-cat">' + icon(cat.icon || 'other', true) + esc(cat.name) + '</div>' +
        '<div class="er-model">' + (r.device_name && r.device_name !== cat.name ? esc(r.device_name) : '<span class="er-muted">Marca y modelo sin indicar</span>') + '</div></div></div>' +
      (fault ? '<div class="er-fault">' + esc(fault) + '</div>' : '') +
      '<div class="er-c-foot"><span class="er-cust">' + esc(r.customer_name) + '</span>' +
        '<span class="er-days' + (dl.late ? ' er-late' : '') + '" title="Días en el taller">' + icon('clock', true) + esc(dl.text) + '</span>' +
        '<span class="er-av" style="background:' + E.avatarColor(r.id_employee_tech) + '" title="' + esc(r.tech_name || 'Sin asignar') + '">' + esc(E.initials(r.tech_name)) + '</span>' +
      '</div></article>';
  }

  function render() {
    var catOpts = '<option value="">Todas las categorías</option>' + (D.categories || []).map(function (c) {
      return '<option value="' + c.id + '"' + (String(state.cat) === String(c.id) ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
    $('#er-filters').innerHTML = FILTERS.map(function (f) {
      return '<button type="button" class="er-chip" data-f="' + f.id + '" aria-pressed="' + (f.id === state.filter) + '">' + esc(f.name) +
        '<span class="er-n">' + repairs.filter(f.f).length + '</span></button>';
    }).join('') + '<select class="er-input" id="er-cat" aria-label="Categoría">' + catOpts + '</select>' +
      '<span class="er-sep"></span>' +
      '<button type="button" class="er-chip er-chip-arch" data-arch="delivered" aria-pressed="' + (arch === 'delivered') + '">' + icon('check', true) + 'Entregadas</button>' +
      '<button type="button" class="er-chip er-chip-arch er-chip-bad" data-arch="cancelled" aria-pressed="' + (arch === 'cancelled') + '">' + icon('x', true) + 'Canceladas</button>';
    $('#er-board').hidden = !!arch;
    $('#er-archive').hidden = !arch;
    if (arch) return;

    var list = repairs.filter(match);
    $('#er-board').innerHTML = D.board.map(function (st) {
      var s = D.statuses[st];
      var items = list.filter(function (r) { return r.status === st; });
      return '<section class="er-col" data-col="' + st + '" aria-label="' + esc(s.name) + '">' +
        '<div class="er-col-h"><span class="er-dot" style="background:' + esc(s.color) + '"></span>' + esc(s.name) + '<span class="er-cnt">' + items.length + '</span></div>' +
        (items.length ? items.map(card).join('') : '<div class="er-empty">Sin reparaciones</div>') + '</section>';
    }).join('');

    var inShop = repairs.filter(function (r) { return r.status !== 'ready'; }).length;
    var ready = repairs.length - inShop;
    $('#er-sub').textContent = inShop + ' en taller · ' + ready + ' listas para recoger';
    try { localStorage.setItem('ecor-board', JSON.stringify({ filter: state.filter, cat: state.cat })); } catch (e) {}
  }

  /* Búsqueda en reparaciones antiguas (entregadas o canceladas) */
  var searchTimer, searchSeq = 0;
  function remoteSearch() {
    var q = state.q;
    var box = $('#er-results');
    if (q.length < 3) { box.hidden = true; return; }
    var seq = ++searchSeq;
    E.api('searchRepairs', { q: q }).then(function (res) {
      if (seq !== searchSeq) return;
      var onBoard = {};
      repairs.forEach(function (r) { onBoard[r.id] = true; });
      var others = (res.repairs || []).filter(function (r) { return !onBoard[r.id]; });
      if (!res.ok || !others.length) { box.hidden = true; return; }
      box.innerHTML = '<div class="er-panel"><h3>' + icon('clock') + 'Otras reparaciones de ' + esc(q) + '<span class="er-r">Entregadas o canceladas</span></h3><div class="er-mini">' +
        others.map(function (r) {
          return '<a href="' + esc(E.boot.links.repair + r.id) + '"><b class="er-num">' + esc(r.reference) + '</b><span class="er-grow">' +
            esc(r.customer_name + ' · ' + r.device_name) + '</span><span class="er-muted er-num">' + esc(E.fmtDate(r.date_add)) + '</span>' +
            E.statusChip(D.statuses, r.status) + '</a>';
        }).join('') + '</div></div>';
      box.hidden = false;
    });
  }

  /* Archivo: entregadas y canceladas, aparte del tablero */
  var arch = '', archQ = { from: '', to: '', q: '' }, archSeq = 0;
  function archiveLoad() {
    var my = ++archSeq, box = $('#er-archive');
    box.querySelector('#er-arch-list').classList.add('er-loading');
    E.api('archive', { status: arch, from: archQ.from, to: archQ.to, q: archQ.q }).then(function (res) {
      if (my !== archSeq) return;
      var list = res.ok ? res.repairs : [];
      var el = box.querySelector('#er-arch-list');
      el.classList.remove('er-loading');
      el.innerHTML = list.length ? list.map(function (r) {
        return card(r).replace('</article>', (r.status === 'cancelled' && r.cancel_reason ? '<div class="er-arch-why">' + icon('x', true) + esc(r.cancel_reason) + '</div>' : '') +
          '<div class="er-muted er-small er-num">' + esc((r.status === 'cancelled' ? 'Cancelada el ' : 'Entregada el ') + E.fmtDate(r.date_status)) + '</div></article>');
      }).join('') : '<div class="er-empty" style="grid-column:1/-1">No hay reparaciones ' + (arch === 'cancelled' ? 'canceladas' : 'entregadas') + ' con estos filtros.</div>';
      box.querySelector('#er-arch-n').textContent = list.length + (list.length === 200 ? '+' : '');
    });
  }
  function archiveOpen(kind) {
    arch = kind;
    render();
    if (!arch) return;
    $('#er-archive').innerHTML = '<div class="er-panel"><h3>' + icon(arch === 'cancelled' ? 'x' : 'check') + (arch === 'cancelled' ? 'Reparaciones canceladas' : 'Reparaciones entregadas') +
      '<span class="er-r"><span id="er-arch-n"></span> · <button type="button" class="er-link" data-arch="">Volver al tablero</button></span></h3>' +
      '<div class="er-row"><label class="er-search" style="flex:1 1 260px;max-width:none">' + icon('search') + '<input class="er-input" id="er-arch-q" type="search" placeholder="Cliente, teléfono, nº de serie, REP- o motivo" value="' + esc(archQ.q) + '"></label>' +
      '<span class="er-st-dates"><input type="date" class="er-input" id="er-arch-from" value="' + esc(archQ.from) + '" aria-label="Desde"><span class="er-muted">a</span><input type="date" class="er-input" id="er-arch-to" value="' + esc(archQ.to) + '" aria-label="Hasta"></span></div>' +
      '<div class="er-arch-grid" id="er-arch-list"></div></div>';
    archiveLoad();
  }
  var archTimer;
  app.addEventListener('input', function (e) {
    if (e.target.id === 'er-arch-q') { archQ.q = e.target.value.trim(); clearTimeout(archTimer); archTimer = setTimeout(archiveLoad, 300); }
  });
  app.addEventListener('change', function (e) {
    if (e.target.id === 'er-arch-from' || e.target.id === 'er-arch-to') { archQ[e.target.id === 'er-arch-from' ? 'from' : 'to'] = e.target.value; archiveLoad(); }
  });
  app.addEventListener('click', function (e) {
    var a = e.target.closest('[data-arch]');
    if (a) { var k = a.getAttribute('data-arch'); archiveOpen(k === arch ? '' : k); return; }
    var c = e.target.closest('#er-arch-list .er-card');
    if (c) open(+c.getAttribute('data-id'));
  });

  $('#er-filters').addEventListener('click', function (e) {
    var b = e.target.closest('[data-f]');
    if (b) { state.filter = b.getAttribute('data-f'); if (arch) { arch = ''; } render(); }
  });
  $('#er-filters').addEventListener('change', function (e) {
    if (e.target.id === 'er-cat') { state.cat = e.target.value; render(); }
  });
  $('#er-q').addEventListener('input', function (e) {
    state.q = e.target.value.trim();
    render();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(remoteSearch, 350);
  });

  function open(id) { window.location.href = E.boot.links.repair + id; }

  /* Arrastrar con puntero: ratón y dedo */
  var drag = null;
  var boardEl = $('#er-board');
  boardEl.addEventListener('pointerdown', function (e) {
    var c = e.target.closest('.er-card');
    if (!c || e.button > 0) return;
    var rc = c.getBoundingClientRect();
    drag = { el: c, id: +c.getAttribute('data-id'), sx: e.clientX, sy: e.clientY, ox: e.clientX - rc.left, oy: e.clientY - rc.top, w: rc.width, clone: null, over: null };
    c.setPointerCapture(e.pointerId);
  });
  boardEl.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (!drag.clone) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 8) return;
      if (!D.canEdit) { drag = null; E.toast('Tu perfil no puede cambiar estados.', true); return; }
      drag.clone = drag.el.cloneNode(true);
      drag.clone.classList.add('er-drag');
      drag.clone.style.width = drag.w + 'px';
      app.appendChild(drag.clone);
      drag.el.classList.add('er-ghost');
    }
    drag.clone.style.left = (e.clientX - drag.ox) + 'px';
    drag.clone.style.top = (e.clientY - drag.oy) + 'px';
    var under = document.elementFromPoint(e.clientX, e.clientY);
    var col = under && under.closest('.er-col');
    if (drag.over && drag.over !== col) drag.over.classList.remove('er-over');
    if (col) { col.classList.add('er-over'); drag.over = col; }
    // Desplazamiento automático en horizontal cerca de los bordes
    var br = boardEl.getBoundingClientRect();
    if (e.clientX > br.right - 40) boardEl.scrollLeft += 12;
    else if (e.clientX < br.left + 40) boardEl.scrollLeft -= 12;
  });
  function cleanup(d) {
    if (d.clone) d.clone.remove();
    d.el.classList.remove('er-ghost');
    if (d.over) d.over.classList.remove('er-over');
  }
  boardEl.addEventListener('pointerup', function () {
    if (!drag) return;
    var d = drag; drag = null;
    if (!d.clone) { open(d.id); return; }
    cleanup(d);
    var r = repairs.filter(function (x) { return x.id === d.id; })[0];
    if (!r || !d.over) return;
    var to = d.over.getAttribute('data-col');
    if (to === r.status) return;
    var prev = r.status;
    r.status = to;
    if (to === 'ready') r.waiting_part = 0;
    render();
    E.api('setStatus', { id_ecorepair: r.id }, { status: to }).then(function (res) {
      if (!res.ok) {
        r.status = prev;
        render();
        E.toast(res.error || 'No se pudo cambiar el estado.', true);
        return;
      }
      if (res.repair) {
        repairs = repairs.map(function (x) { return x.id === r.id ? res.repair : x; });
        render();
      }
      E.toast(r.reference + ' movida a ' + D.statuses[to].name);
    });
  });
  boardEl.addEventListener('pointercancel', function () { if (drag) cleanup(drag); drag = null; });
  boardEl.addEventListener('keydown', function (e) {
    var c = e.target.closest('.er-card');
    if (c && e.key === 'Enter') open(c.getAttribute('data-id'));
  });

  render();
});
