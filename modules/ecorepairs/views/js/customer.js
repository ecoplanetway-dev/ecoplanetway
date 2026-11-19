/* Reparaciones del taller · ficha completa del cliente */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'customer') return;

  var c = D.customer;
  var today = new Date().toISOString().slice(0, 10);
  var spent = D.repairs.reduce(function (a, r) { return a + (r.total || 0); }, 0);

  function warrantyTag(until) {
    if (!until) return '';
    return until >= today ? '<span class="er-tag er-t-gar">' + icon('shield', true) + 'Garantía hasta ' + esc(E.fmtDate(until)) + '</span>'
      : '<span class="er-tag er-t-neu">Garantía terminada</span>';
  }

  function render() {
    app.innerHTML =
      '<div class="er-f-head">' +
        '<a class="er-btn er-btn-ghost er-icon-btn" href="javascript:history.back()" aria-label="Volver">' + icon('back') + '</a>' +
        '<div class="er-person"><span class="er-av er-av-xl">' + esc(E.initials(c.name)) + '</span><div><h1 style="font-size:26px">' + esc(c.name) + '</h1>' +
          '<div class="er-muted er-num">' + esc([c.phone, c.email, 'Cliente nº ' + c.id_customer].filter(Boolean).join(' · ')) + '</div></div></div>' +
        '<div class="er-f-actions" style="margin-left:auto">' +
          (D.canEdit ? '<button type="button" class="er-btn" id="er-c-edit">' + icon('pen') + 'Editar</button>' : '') +
          '<a class="er-btn" href="' + esc(E.boot.links.requests + '&id_customer=' + c.id_customer) + '">' + icon('package') + 'Nuevo encargo</a>' +
          '<a class="er-btn er-btn-pri" href="' + esc(E.boot.links['new'] + '&id_customer=' + c.id_customer) + '">' + icon('plus') + 'Nueva reparación</a>' +
        '</div>' +
      '</div>' +
      '<div class="er-kpis">' +
        kpi('Reparaciones', D.repairs.length, 'wrench') +
        kpi('Gastado en el taller', E.fmtMoney(spent), 'tag') +
        kpi('Compras en la tienda', c.orders_count + ' · ' + E.fmtMoney(c.orders_total), 'box') +
        kpi('Avisos por WhatsApp', c.consent_whatsapp ? 'Acepta' : 'No consta', 'whatsapp') +
      '</div>' +
      '<div class="er-c360">' +
        '<div class="er-stack">' +
          panel('wrench', 'Reparaciones', D.repairs.length, D.repairs.length ? '<div class="er-mini">' + D.repairs.map(function (r) {
            return '<a href="' + esc(E.boot.links.repair + r.id) + '">' + (r.cover ? '<img class="er-mthumb" src="' + esc(r.cover) + '" alt="">' : '') +
              '<span class="er-grow" style="white-space:normal"><b class="er-num">' + esc(r.reference) + '</b> · ' + esc(r.device_name) +
              '<span class="er-muted er-small" style="display:block">' + esc(E.fmtDate(r.date_add) + ' · ' + (r.faults.concat(r.fault_customer ? [r.fault_customer] : []).join(', ') || 'Sin avería indicada')) +
              (r.diagnosis ? '<br>Solución: ' + esc(r.diagnosis) : '') + '</span>' + warrantyTag(r.warranty_until) + '</span>' +
              '<span style="text-align:right">' + E.statusChip(D.statuses, r.status) + (r.total ? '<b class="er-num" style="display:block;margin-top:4px">' + esc(E.fmtMoney(r.total)) + '</b>' : '') + '</span></a>';
          }).join('') + '</div>' : empty('Sin reparaciones.')) +
          panel('box', 'Compras en la tienda', D.orders.length, D.orders.length ? '<div class="er-mini">' + D.orders.map(function (o) {
            return '<a href="' + esc(o.url) + '" target="_blank" rel="noopener"><span class="er-grow" style="white-space:normal"><b class="er-num">' + esc(o.reference) + '</b> · ' + esc(E.fmtDate(o.date)) +
              '<span class="er-muted er-small" style="display:block">' + esc(o.items.slice(0, 4).join(' · ') + (o.items.length > 4 ? ' …' : '')) + '</span>' + warrantyTag(o.warranty_until) + '</span>' +
              '<span style="text-align:right"><span class="er-st-chip"><span class="er-dot" style="background:' + esc(o.color || '#8B93A3') + '"></span>' + esc(o.state) + '</span><b class="er-num" style="display:block;margin-top:4px">' + esc(E.fmtMoney(o.total)) + '</b></span></a>';
          }).join('') + '</div>' : empty('No ha comprado en la tienda online.')) +
        '</div>' +
        '<div class="er-stack">' +
          panel('device', 'Sus equipos', D.devices.length, D.devices.length ? '<div class="er-mini">' + D.devices.map(function (d) {
            return '<div>' + (d.cover ? '<img class="er-mthumb" src="' + esc(d.cover) + '" alt="">' : '') + '<span class="er-grow" style="white-space:normal"><b>' + esc(d.device) + '</b>' +
              '<span class="er-muted er-small" style="display:block">' + esc([d.category, d.serial ? 'Nº serie ' + d.serial : '', d.count + (d.count === 1 ? ' reparación' : ' reparaciones')].filter(Boolean).join(' · ')) + '</span>' + warrantyTag(d.warranty_until) + '</span></div>';
          }).join('') + '</div>' : empty('Sin equipos.')) +
          panel('package', 'Encargos', D.requests.length, D.requests.length ? '<div class="er-mini">' + D.requests.map(function (q) {
            var st = D.requestStatuses[q.status] || {};
            return '<a href="' + esc(E.boot.links.requests) + '"><span class="er-grow" style="white-space:normal"><b>' + esc(q.request) + '</b><span class="er-muted er-small" style="display:block">' + esc(E.fmtDate(q.date_add) + (q.supplier ? ' · ' + q.supplier : '')) + '</span></span>' +
              '<span class="er-st-chip"><span class="er-dot" style="background:' + esc(st.color || '#8B93A3') + '"></span>' + esc(q.status_name) + '</span></a>';
          }).join('') + '</div>' : empty('Sin encargos.')) +
          panel('whatsapp', 'Mensajes enviados', D.messages.length, D.messages.length ? '<ul class="er-timeline">' + D.messages.map(function (m) {
            return '<li><span class="er-tdot" style="background:' + (m.channel === 'email' ? '#1F6FD1' : '#25D366') + '"></span><div><div class="er-note" style="white-space:pre-wrap">' + esc(m.body) + '</div>' +
              '<div class="er-when er-num">' + esc(E.fmtDateTime(m.date) + ' · ' + (m.channel === 'email' ? 'Email' : 'WhatsApp') + (m.reference ? ' · ' + m.reference : '') + (m.employee ? ' · ' + m.employee : '')) + '</div></div></li>';
          }).join('') + '</ul>' : empty('No se le ha enviado nada.')) +
        '</div>' +
      '</div>';
  }
  function kpi(label, value, ico) { return '<div class="er-panel er-kpi er-kpi-mini"><div class="er-kpi-h">' + icon(ico, true) + esc(label) + '</div><div class="er-kpi-v er-num">' + esc(String(value)) + '</div></div>'; }
  function panel(ico, title, n, body) { return '<div class="er-panel"><h3>' + icon(ico) + esc(title) + '<span class="er-r">' + n + '</span></h3>' + body + '</div>'; }
  function empty(t) { return '<p class="er-muted" style="margin:0">' + esc(t) + '</p>'; }

  app.addEventListener('click', function (e) {
    if (!e.target.closest('#er-c-edit')) return;
    E.customerDialog(c).then(function (res) {
      if (!res) return;
      c = res.customer; render();
      E.toast('Datos del cliente guardados');
    });
  });

  render();
});
