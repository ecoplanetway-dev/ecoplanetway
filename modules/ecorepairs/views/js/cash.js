/* Reparaciones del taller · caja: cierre del día y exportación trimestral */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'cash') return;

  var C = D.close;
  var ICON = { cash: 'tag', card: 'layers', transfer: 'send' };

  app.innerHTML =
    '<header class="er-head">' +
      '<div class="er-brand"><div class="er-ico">' + icon('tag') + '</div><div><h1>Caja del taller</h1><p>Cierre del día y facturas para el gestor</p></div></div>' +
      '<a class="er-btn" href="' + esc(E.boot.links.board) + '">' + icon('back') + 'Volver al tablero</a>' +
    '</header>' +
    '<div class="er-grid2">' +
      '<div class="er-stack">' +
        '<div class="er-panel"><h3>' + icon('clock') + 'Cierre del día<span class="er-r"><input type="date" class="er-input" id="er-day" aria-label="Día" style="min-height:40px;width:auto"></span></h3>' +
          '<div id="er-close"></div></div>' +
      '</div>' +
      '<div class="er-stack">' +
        '<div class="er-panel"><h3>' + icon('doc') + 'Exportación trimestral</h3>' +
          '<p class="er-muted" style="margin:0">Facturas de los cobros del taller: fecha, nº de factura, cliente, NIF, base, IVA, total y forma de pago. Se abre con Excel.</p>' +
          '<div class="er-fg"><label class="er-field">Año<input class="er-input" id="er-y" inputmode="numeric" maxlength="4" value="' + D.year + '"></label>' +
          '<label class="er-field">Trimestre<select class="er-input" id="er-qt">' + [1, 2, 3, 4].map(function (q) {
            return '<option value="' + q + '"' + (q === D.quarter ? ' selected' : '') + '>' + q + 'T (' + ['ene–mar', 'abr–jun', 'jul–sep', 'oct–dic'][q - 1] + ')</option>';
          }).join('') + '</select></label></div>' +
          '<button type="button" class="er-btn er-btn-pri er-btn-lg" id="er-export">' + icon('doc') + 'Descargar Excel (CSV)</button></div>' +
        '<div class="er-panel"><h3>' + icon('alert') + 'Al contar la caja</h3>' +
          '<p class="er-muted" style="margin:0">Los cobros del taller salen también en el informe del TPV, en «Pedidos online». Suma la línea <b>Taller · Efectivo</b> al efectivo de la tienda.</p></div>' +
      '</div>' +
    '</div>';

  var $ = function (s) { return app.querySelector(s); };

  function render() {
    $('#er-day').value = C.date;
    var cash = C.methods.filter(function (m) { return m.method === 'cash'; })[0] || { total: 0 };
    var max = Math.max.apply(null, C.methods.map(function (m) { return m.total; }).concat([0.01]));
    $('#er-close').innerHTML =
      '<div class="er-kpis" style="margin:0">' + C.methods.map(function (m) {
        return '<div class="er-kpi er-kpi-mini"><div class="er-kpi-h">' + icon(ICON[m.method] || 'tag', true) + esc(m.name.replace('Taller · ', '')) + '</div>' +
          '<div class="er-kpi-v er-num">' + esc(E.fmtMoney(m.total)) + '</div><div class="er-muted er-small">' + m.count + ' cobro' + (m.count === 1 ? '' : 's') + '</div>' +
          '<div class="er-rank-bar"><span style="width:' + Math.round(m.total / max * 100) + '%"></span></div></div>';
      }).join('') + '</div>' +
      '<div class="er-qt er-qt-big"><span>Total del día</span><span class="er-num">' + esc(E.fmtMoney(C.total)) + '</span></div>' +
      '<div class="er-banner er-ok" style="margin:0">' + icon('tag') + '<div>Efectivo a sumar en la caja: <b class="er-num">' + esc(E.fmtMoney(cash.total)) + '</b></div></div>' +
      (C.payments.length ? '<div class="er-mini">' + C.payments.map(function (p) {
        return '<a href="' + esc(E.boot.links.repair + p.id_ecorepair) + '"><b class="er-num">' + esc(p.time) + '</b><span class="er-grow">' + esc(p.reference + ' · ' + p.customer) +
          '<span class="er-muted er-small" style="display:block">' + esc(p.type + ' · ' + p.method + (p.order ? ' · pedido ' + p.order : '')) + '</span></span><b class="er-num">' + esc(E.fmtMoney(p.amount)) + '</b></a>';
      }).join('') + '</div>' : '<div class="er-empty">Sin cobros este día.</div>') +
      '<a class="er-btn er-btn-lg" href="' + esc(E.ajaxUrl('printCash', { date: C.date })) + '" target="_blank" rel="noopener">' + icon('print') + 'Imprimir cierre (80 mm)</a>';
  }

  $('#er-day').addEventListener('change', function (e) {
    E.api('dayClose', { date: e.target.value }).then(function (res) {
      if (!res.ok) { E.toast(res.error, true); return; }
      C = res.close; render();
    });
  });
  $('#er-export').addEventListener('click', function () {
    window.location.href = E.ajaxUrl('exportQuarter', { year: $('#er-y').value, quarter: $('#er-qt').value });
  });

  render();
});
