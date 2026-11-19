/* Reparaciones del taller · encargos */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'requests') return;

  var list = D.requests || [], counts = D.counts || {}, ST = D.statuses, canEdit = !!D.canEdit;
  var state = { status: 'open', q: '' };
  var FLOW = ['pending', 'ordered', 'arrived', 'notified', 'delivered'];
  var CHIPS = [['open', 'Abiertos'], ['pending', 'Pendientes'], ['ordered', 'Pedidos'], ['arrived', 'Llegados'], ['notified', 'Avisados'], ['delivered', 'Entregados'], ['cancelled', 'Cancelados']];

  app.innerHTML =
    '<header class="er-head">' +
      '<div class="er-brand"><div class="er-ico">' + icon('package') + '</div><div><h1>Encargos</h1><p>Lo que piden los clientes y hay que pedir al proveedor</p></div></div>' +
      '<label class="er-search">' + icon('search') + '<input id="er-rq-q" class="er-input" type="search" placeholder="Cliente, teléfono, pieza o proveedor" aria-label="Buscar encargo"></label>' +
      '<a class="er-btn" href="' + esc(E.boot.links.board) + '">' + icon('back') + 'Tablero</a>' +
      (canEdit ? '<button type="button" class="er-btn er-btn-pri" id="er-rq-new">' + icon('plus') + 'Nuevo encargo</button>' : '') +
    '</header>' +
    '<div class="er-filters" id="er-rq-f"></div>' +
    '<div class="er-rq-grid" id="er-rq-list"></div>';

  var $ = function (s) { return app.querySelector(s); };

  function openCount() { return (counts.pending || 0) + (counts.ordered || 0) + (counts.arrived || 0) + (counts.notified || 0); }
  function renderFilters() {
    $('#er-rq-f').innerHTML = CHIPS.map(function (c) {
      var n = c[0] === 'open' ? openCount() : (counts[c[0]] || 0);
      return '<button type="button" class="er-chip' + (c[0] === 'arrived' && n ? ' er-chip-hot' : '') + '" data-st="' + c[0] + '" aria-pressed="' + (state.status === c[0]) + '">' + c[1] + '<span class="er-n">' + n + '</span></button>';
    }).join('');
  }

  function card(rq) {
    var st = ST[rq.status] || { name: rq.status, color: '#8B93A3' };
    var i = FLOW.indexOf(rq.status), next = i > -1 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
    return '<article class="er-card er-rq" data-id="' + rq.id + '">' +
      '<div class="er-c-top"><span class="er-st-chip"><span class="er-dot" style="background:' + esc(st.color) + '"></span>' + esc(st.name) + '</span>' +
        '<span class="er-days' + (rq.days >= 7 && (rq.status === 'pending' || rq.status === 'ordered') ? ' er-late' : '') + '">' + icon('clock', true) + rq.days + ' d</span></div>' +
      '<div class="er-model">' + esc(rq.request) + (rq.qty > 1 ? ' <span class="er-muted">× ' + rq.qty + '</span>' : '') + '</div>' +
      (rq.for_device ? '<div class="er-muted er-small">Para ' + esc(rq.for_device) + '</div>' : '') +
      '<div class="er-kv er-small">' +
        '<div><span class="er-k">Cliente</span><span class="er-v">' + esc(rq.customer_name) + (rq.phone ? '<br><span class="er-muted er-num">' + esc(rq.phone) + '</span>' : '') + '</span></div>' +
        '<div><span class="er-k">Proveedor</span><span class="er-v">' + esc(rq.supplier || '—') + '</span></div>' +
        '<div><span class="er-k">Precio</span><span class="er-v er-num">' + (rq.price ? esc(E.fmtMoney(rq.price)) : '—') + (rq.deposit ? '<br><span class="er-muted">Señal ' + esc(E.fmtMoney(rq.deposit)) + '</span>' : '') + '</span></div>' +
      '</div>' +
      (rq.repair_reference ? '<a class="er-small" href="' + esc(E.boot.links.repair + rq.id_ecorepair) + '">' + icon('wrench', true) + ' ' + esc(rq.repair_reference) + '</a>' : '') +
      (rq.notes ? '<div class="er-note er-small">' + esc(rq.notes) + '</div>' : '') +
      (canEdit ? '<div class="er-row er-rq-act">' +
        (next ? '<button type="button" class="er-btn er-btn-sm' + (next === 'notified' ? '' : ' er-btn-pri') + '" data-next="' + next + '">' + icon('check', true) + esc(ST[next].name) + '</button>' : '') +
        (rq.status === 'arrived' || rq.status === 'notified' ? '<button type="button" class="er-btn er-btn-sm er-btn-wa" data-wa>' + icon('whatsapp', true) + 'Avisar</button>' : '') +
        '<button type="button" class="er-btn er-btn-sm er-btn-ghost" data-edit>' + icon('pen', true) + 'Editar</button>' +
        (rq.status !== 'cancelled' && rq.status !== 'delivered' ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost er-btn-danger" data-next="cancelled">Cancelar</button>' : '') +
      '</div>' : '') +
      '</article>';
  }

  function render() {
    renderFilters();
    $('#er-rq-list').innerHTML = list.length ? list.map(card).join('') : '<div class="er-empty" style="grid-column:1/-1">No hay encargos aquí.</div>';
  }

  var seq = 0;
  function load() {
    var my = ++seq;
    E.api('requests', { status: state.status, q: state.q }).then(function (res) {
      if (my !== seq || !res.ok) return;
      list = res.requests; counts = res.counts; render();
    });
  }

  function replace(rq) {
    var found = false;
    list = list.map(function (x) { if (x.id === rq.id) { found = true; return rq; } return x; });
    if (!found) list.unshift(rq);
    E.api('requests', { status: state.status, q: state.q }).then(function (res) { if (res.ok) { counts = res.counts; renderFilters(); } });
    render();
  }

  /* ---------- Nuevo / editar ---------- */
  function form(rq) {
    rq = rq || {};
    var cust = rq.id_customer ? { id_customer: rq.id_customer, name: rq.customer_name } : (D.preset || null);
    var wrap = document.createElement('div');
    wrap.className = 'er-modal';
    function f(k, label, val, attrs) { return '<label class="er-field">' + label + '<input class="er-input" data-k="' + k + '" value="' + esc(val == null ? '' : val) + '" ' + (attrs || '') + '></label>'; }
    wrap.innerHTML = '<div class="er-dlg" style="max-width:640px"><h2>' + (rq.id ? 'Editar encargo' : 'Nuevo encargo') + '</h2>' +
      '<div><div class="er-sub">Cliente <span class="er-req">*</span></div><div id="er-rq-cust"></div></div>' +
      f('request', 'Qué pide <span class="er-req">*</span>', rq.request, 'maxlength="255" placeholder="Ej.: batería 36V 10Ah"') +
      '<div class="er-fg">' + f('for_device', 'Para qué equipo', rq.for_device, 'maxlength="160"') + f('qty', 'Cantidad', rq.qty || 1, 'inputmode="numeric" maxlength="4"') +
        f('supplier', 'Proveedor', rq.supplier, 'maxlength="96"') + f('price', 'Precio para el cliente (€)', rq.price ? String(rq.price).replace('.', ',') : '', 'inputmode="decimal"') +
        f('deposit', 'Señal cobrada (€)', rq.deposit ? String(rq.deposit).replace('.', ',') : '', 'inputmode="decimal"') + '</div>' +
      '<label class="er-field">Notas<textarea class="er-input" data-k="notes" maxlength="2000" rows="3">' + esc(rq.notes || '') + '</textarea></label>' +
      '<div class="er-err" id="er-rq-err" hidden></div>' +
      '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>' + icon('check') + 'Guardar</button></div></div>';
    app.appendChild(wrap);
    var custBox = wrap.querySelector('#er-rq-cust'), results = [], timer;
    function renderCust() {
      custBox.innerHTML = cust ? '<div class="er-chosen"><span class="er-av" style="background:#5B6170">' + esc(E.initials(cust.name)) + '</span><div class="er-grow"><b>' + esc(cust.name) + '</b></div>' +
        (rq.id ? '' : '<button type="button" class="er-btn er-btn-sm" data-cchange>Cambiar</button>') + '</div>'
        : '<label class="er-search">' + icon('search') + '<input class="er-input" data-cq type="search" placeholder="Nombre, teléfono o email" autocomplete="off"></label><div class="er-pick" data-cres></div>' +
          '<button type="button" class="er-btn er-btn-sm" data-cnew style="margin-top:8px">' + icon('plus', true) + 'Cliente nuevo</button>' +
          '<div data-cform hidden class="er-stack" style="gap:10px;margin-top:10px"><div class="er-fg">' +
            '<label class="er-field">Nombre <span class="er-req">*</span><input class="er-input" data-nc="firstname" maxlength="64"></label>' +
            '<label class="er-field">Apellidos <span class="er-req">*</span><input class="er-input" data-nc="lastname" maxlength="64"></label>' +
            '<label class="er-field">Teléfono<input class="er-input" data-nc="phone" inputmode="tel" maxlength="32"></label>' +
            '<label class="er-field">Email<input class="er-input" data-nc="email" type="email" maxlength="128"></label></div>' +
            '<div class="er-err" data-ncerr hidden></div><div><button type="button" class="er-btn er-btn-pri er-btn-sm" data-ncsave>' + icon('check', true) + 'Crear cliente</button></div>' +
            '<p class="er-muted er-small" style="margin:0">Se crea también en PrestaShop.</p></div>';
      var q = custBox.querySelector('[data-cq]'); if (q) q.focus();
    }
    renderCust();
    custBox.addEventListener('input', function (e) {
      if (!e.target.hasAttribute('data-cq')) return;
      var v = e.target.value.trim();
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (v.length < 2) { custBox.querySelector('[data-cres]').innerHTML = ''; return; }
        E.api('searchCustomers', { q: v }).then(function (res) {
          results = res.customers || [];
          var box = custBox.querySelector('[data-cres]');
          if (box) box.innerHTML = results.map(function (c, i) {
            return '<button type="button" data-ci="' + i + '"><span class="er-grow"><b>' + esc(c.name) + '</b><br><span class="er-muted er-small">' + esc([c.phone, c.email].filter(Boolean).join(' · ')) + '</span></span></button>';
          }).join('') || '<div class="er-muted er-small" style="padding:10px">Sin resultados. Pulsa «Cliente nuevo».</div>';
        });
      }, 300);
    });
    custBox.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-ci]'))) { cust = results[+t.getAttribute('data-ci')]; renderCust(); }
      if (e.target.closest('[data-cchange]')) { cust = null; renderCust(); }
      if (e.target.closest('[data-cnew]')) { custBox.querySelector('[data-cform]').hidden = false; custBox.querySelector('[data-nc="firstname"]').focus(); }
      if (e.target.closest('[data-ncsave]')) {
        var body = { consent_rgpd: 1 };
        custBox.querySelectorAll('[data-nc]').forEach(function (i) { body[i.getAttribute('data-nc')] = i.value.trim(); });
        E.api('createCustomer', {}, body).then(function (res) {
          var er = custBox.querySelector('[data-ncerr]');
          if (!res.ok) {
            if (res.existingCustomer) { cust = res.existingCustomer; renderCust(); E.toast('Ya existía: se ha elegido ' + cust.name); return; }
            er.textContent = res.error || Object.keys(res.errors || {}).map(function (k) { return res.errors[k]; }).join(' ');
            er.hidden = false; return;
          }
          cust = res.customer; renderCust(); E.toast('Cliente creado');
        });
      }
    });
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
      var ok = e.target.closest('[data-ok]');
      if (!ok) return;
      var body = { id_request: rq.id || 0, id_customer: cust ? cust.id_customer : 0 };
      wrap.querySelectorAll('[data-k]').forEach(function (i) { body[i.getAttribute('data-k')] = i.value.trim(); });
      ok.disabled = true;
      E.api('requestSave', {}, body).then(function (res) {
        ok.disabled = false;
        if (!res.ok) { var er = wrap.querySelector('#er-rq-err'); er.textContent = res.error; er.hidden = false; return; }
        wrap.remove(); replace(res.request);
        E.toast(rq.id ? 'Encargo guardado' : 'Encargo creado');
      });
    });
  }

  app.addEventListener('click', function (e) {
    var t;
    if (e.target.closest('#er-rq-new')) { form(); return; }
    if ((t = e.target.closest('[data-st]'))) { state.status = t.getAttribute('data-st'); load(); renderFilters(); return; }
    var c = e.target.closest('.er-rq');
    if (!c) return;
    var rq = list.filter(function (x) { return x.id === +c.getAttribute('data-id'); })[0];
    if (!rq) return;
    if (e.target.closest('[data-edit]')) { form(rq); return; }
    if (e.target.closest('[data-wa]')) {
      E.notify({ id_request: rq.id }).then(function (res) { if (res) load(); });
      return;
    }
    if ((t = e.target.closest('[data-next]'))) {
      var to = t.getAttribute('data-next');
      var go = function () {
        E.api('requestStatus', {}, { id_request: rq.id, status: to }).then(function (res) {
          if (!res.ok) { E.toast(res.error, true); return; }
          replace(res.request);
          if (to === 'arrived') {
            E.dialog({ title: 'Ha llegado', text: '¿Avisar ahora al cliente por WhatsApp?', ok: 'Avisar' }).then(function (yes) {
              if (yes) E.notify({ id_request: rq.id }).then(function () { load(); });
            });
          }
        });
      };
      if (to === 'cancelled') E.dialog({ title: 'Cancelar encargo', text: rq.request, ok: 'Cancelar encargo', danger: true }).then(function (y) { if (y) go(); });
      else go();
    }
  });
  var qt;
  $('#er-rq-q').addEventListener('input', function (e) { state.q = e.target.value.trim(); clearTimeout(qt); qt = setTimeout(load, 300); });

  render();
  if (D.preset && canEdit) form();
});
