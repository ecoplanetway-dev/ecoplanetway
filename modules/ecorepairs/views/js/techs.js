/* Reparaciones del taller · técnicos: resumen por periodo y panel completo de cada técnico */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'techs') return;

  var T = D.stats || [], range = { id: 'month', from: D.from, to: D.to };

  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  var QUICK = [
    ['month', 'Este mes', function (t) { return [new Date(t.getFullYear(), t.getMonth(), 1), t]; }],
    ['lastmonth', 'Último mes', function (t) { return [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)]; }],
    ['quarter', 'Último trimestre', function (t) { var q = Math.floor(t.getMonth() / 3); return [new Date(t.getFullYear(), q * 3 - 3, 1), new Date(t.getFullYear(), q * 3, 0)]; }],
    ['year', 'Este año', function (t) { return [new Date(t.getFullYear(), 0, 1), t]; }],
    ['lastyear', 'Año pasado', function (t) { return [new Date(t.getFullYear() - 1, 0, 1), new Date(t.getFullYear() - 1, 11, 31)]; }]
  ];

  function sum(k) { return T.reduce(function (a, t) { return a + (t[k] || 0); }, 0); }
  function money(n) { return E.fmtMoney(n); }
  function num(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }

  function render() {
    var max = Math.max.apply(null, T.map(function (t) { return t.total; }).concat([0.01]));
    app.innerHTML =
      '<header class="er-head"><div class="er-brand"><div class="er-ico">' + icon('assign') + '</div><div><h1>Técnicos</h1><p class="er-num">' + esc(E.fmtDate(range.from) + ' – ' + E.fmtDate(range.to)) + '</p></div></div>' +
        '<a class="er-btn" href="' + esc(E.boot.links.board) + '">' + icon('back') + 'Tablero</a></header>' +
      '<div class="er-filters er-st-filters">' + QUICK.map(function (q) { return '<button type="button" class="er-chip" data-q="' + q[0] + '" aria-pressed="' + (range.id === q[0]) + '">' + q[1] + '</button>'; }).join('') +
        '<span class="er-st-dates"><input type="date" class="er-input" id="er-tf" value="' + esc(range.from) + '"><span class="er-muted">a</span><input type="date" class="er-input" id="er-tt" value="' + esc(range.to) + '"></span></div>' +
      '<div class="er-kpis">' +
        kpi('Total facturado', money(sum('total')), 'tag', sum('repairs') + ' reparaciones entregadas') +
        kpi('Mano de obra', money(sum('labour')), 'wrench', num(sum('hours')) + ' horas') +
        kpi('Piezas y otros', money(sum('parts') + sum('other')), 'box', 'productos instalados') +
        kpi('Repetidas', sum('repeats_same'), 'refresh', 'vuelven por la misma avería') +
      '</div>' +
      '<div class="er-tcards">' + (T.length ? T.map(function (t, i) {
        return '<button type="button" class="er-panel er-tcard" data-t="' + i + '" style="--d:' + (i * 60) + 'ms">' +
          '<div class="er-row" style="flex-wrap:nowrap"><span class="er-av er-av-xl" style="background:' + E.avatarColor(t.id) + '">' + esc(E.initials(t.name)) + '</span>' +
            '<span style="min-width:0;text-align:left"><b style="font-size:17px">' + esc(t.name) + '</b><span class="er-muted er-small" style="display:block">' + t.repairs + ' reparaciones · ' + num(t.avg_days) + ' días de media</span></span>' +
            '<b class="er-num" style="margin-left:auto;font-size:20px">' + esc(money(t.total)) + '</b></div>' +
          '<span class="er-rank-bar"><span style="width:' + Math.max(2, t.total / max * 100) + '%;--d:' + (i * 60) + 'ms"></span></span>' +
          '<div class="er-tkv"><span><small>Mano de obra</small><b>' + esc(money(t.labour)) + '</b></span><span><small>Horas</small><b>' + num(t.hours) + ' h</b></span>' +
            '<span><small>Piezas y otros</small><b>' + esc(money(t.parts + t.other)) + '</b></span><span><small>Repetidas</small><b' + (t.repeat_rate > 10 ? ' class="er-down"' : '') + '>' + t.repeats_same + ' (' + num(t.repeat_rate) + ' %)</b></span></div>' +
          '<span class="er-link er-small" style="text-align:left">Ver todo de ' + esc(t.name.split(' ')[0]) + ' →</span></button>';
      }).join('') : '<div class="er-empty" style="grid-column:1/-1">Ningún técnico ha entregado reparaciones en este periodo.</div>') + '</div>';
  }
  function kpi(label, value, ico, sub) {
    return '<div class="er-panel er-kpi"><div class="er-kpi-h">' + icon(ico, true) + esc(label) + '</div><div class="er-kpi-v er-num">' + esc(String(value)) + '</div><div class="er-kpi-s er-muted">' + esc(sub) + '</div></div>';
  }

  function load() {
    E.api('techList', { from: range.from, to: range.to }).then(function (res) {
      if (!res.ok) return;
      T = res.stats; range.from = res.from; range.to = res.to; render();
    });
  }

  /* ---------- Panel del técnico ---------- */
  function detail(t) {
    var wrap = document.createElement('div');
    wrap.className = 'er-modal er-drawer er-drawer-wide';
    wrap.innerHTML = '<div class="er-dlg"><div class="er-empty">Cargando…</div></div>';
    app.appendChild(wrap);
    function close() { wrap.classList.add('er-out'); setTimeout(function () { wrap.remove(); }, 180); }
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-x]')) close();
    });
    E.api('techDetail', { id_employee: t.id, from: range.from, to: range.to }).then(function (res) {
      if (!res.ok) { close(); return; }
      var d = res.detail, x = d.tech;
      var smax = Math.max.apply(null, d.series.map(function (s) { return s.value; }).concat([0.01]));
      wrap.querySelector('.er-dlg').innerHTML =
        '<div class="er-row" style="flex-wrap:nowrap"><span class="er-av er-av-xl" style="background:' + E.avatarColor(x.id) + '">' + esc(E.initials(x.name)) + '</span>' +
          '<div style="margin-right:auto"><h2>' + esc(x.name) + '</h2><div class="er-muted er-small">' + esc(E.fmtDate(d.from) + ' – ' + E.fmtDate(d.to)) + ' · ' + d.open + ' abiertas ahora</div></div>' +
          '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-x aria-label="Cerrar">' + icon('x') + '</button></div>' +
        '<div class="er-kpis" style="margin:0">' +
          kpi('Total', money(x.total), 'tag', x.repairs + ' reparaciones') + kpi('Mano de obra', money(x.labour), 'wrench', num(x.hours) + ' h') +
          kpi('Piezas y otros', money(x.parts + x.other), 'box', '') + kpi('Días de media', num(x.avg_days), 'clock', x.warranty + ' en garantía') +
          kpi('Repetidas', x.repeats_same + ' (' + num(x.repeat_rate) + ' %)', 'refresh', x.repeats + ' vuelven en total') +
        '</div>' +
        '<div class="er-panel"><h3>' + icon('trend') + 'Importe por ' + ({ day: 'día', week: 'semana', month: 'mes' }[d.unit]) + '</h3><div class="er-mbars">' + d.series.map(function (s, i) {
          return '<div title="' + esc(s.label + ': ' + money(s.value)) + '"><span style="height:' + Math.max(2, s.value / smax * 100) + '%;--d:' + (i * 25) + 'ms"></span><small>' + esc(d.series.length > 14 && i % Math.ceil(d.series.length / 10) ? '' : s.label) + '</small></div>';
        }).join('') + '</div></div>' +
        '<div class="er-grid-2c">' + rank('Averías que más repara', 'alert', d.faults) + rank('Modelos que más repara', 'device', d.models) + '</div>' +
        '<div class="er-panel"><h3>' + icon('wrench') + 'Sus reparaciones<span class="er-r">' + x.list.length + '</span></h3>' + (x.list.length ? '<div class="er-mini">' + x.list.map(function (r) {
          return '<a href="' + esc(E.boot.links.repair + r.id) + '"><b class="er-num">' + esc(r.reference) + '</b><span class="er-grow">' + esc(r.device) + '<span class="er-muted er-small" style="display:block">' + esc(E.fmtDate(r.date) + ' · ' + num(r.hours) + ' h · M.O. ' + money(r.labour) + ' · piezas ' + money(r.parts)) + '</span></span><b class="er-num">' + esc(money(r.total)) + '</b></a>';
        }).join('') + '</div>' : '<p class="er-muted" style="margin:0">Sin reparaciones entregadas en este periodo.</p>') + '</div>';
    });
  }
  function rank(title, ico, items) {
    var max = items.length ? items[0].value : 1;
    return '<div class="er-panel"><h3>' + icon(ico) + esc(title) + '</h3>' + (items.length ? '<ol class="er-rank">' + items.map(function (it, i) {
      return '<li style="--d:' + (i * 40) + 'ms"><span class="er-rank-n">' + (i + 1) + '</span><span class="er-rank-main"><span class="er-rank-t"><span class="er-rank-name">' + esc(it.name) + '</span><b class="er-num">' + it.value + '</b></span>' +
        '<span class="er-rank-bar"><span style="width:' + (it.value / max * 100) + '%"></span></span></span></li>';
    }).join('') + '</ol>' : '<p class="er-muted" style="margin:0">Sin datos.</p>') + '</div>';
  }

  app.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-q]'))) {
      var q = QUICK.filter(function (x) { return x[0] === t.getAttribute('data-q'); })[0], r = q[2](new Date());
      range = { id: q[0], from: iso(r[0]), to: iso(r[1]) }; load(); return;
    }
    if ((t = e.target.closest('[data-t]'))) detail(T[+t.getAttribute('data-t')]);
  });
  app.addEventListener('change', function (e) {
    if (e.target.id === 'er-tf' || e.target.id === 'er-tt') {
      range = { id: '', from: app.querySelector('#er-tf').value, to: app.querySelector('#er-tt').value };
      if (range.from && range.to) load();
    }
  });

  render();
});
