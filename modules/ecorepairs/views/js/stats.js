/* Reparaciones del taller · indicadores */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'stats') return;

  var S = D.stats;
  var state = { range: '30d', from: S.from, to: S.to, cat: '' };
  var UNIT = { day: 'día', week: 'semana', month: 'mes' };

  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function quick(id) {
    var t = new Date(), f = new Date();
    if (id === '7d') f.setDate(t.getDate() - 6);
    else if (id === '30d') f.setDate(t.getDate() - 29);
    else if (id === 'month') f = new Date(t.getFullYear(), t.getMonth(), 1);
    else if (id === '3m') f.setMonth(t.getMonth() - 3);
    else if (id === 'year') f = new Date(t.getFullYear(), 0, 1);
    else if (id === '12m') f.setFullYear(t.getFullYear() - 1);
    return { from: iso(f), to: iso(t) };
  }
  var QUICK = [['7d', 'Semana'], ['30d', '30 días'], ['month', 'Este mes'], ['3m', '3 meses'], ['year', 'Este año'], ['12m', '12 meses']];

  app.innerHTML =
    '<header class="er-head">' +
      '<div class="er-brand"><div class="er-ico">' + icon('chart') + '</div><div><h1>Indicadores</h1><p id="er-st-sub" class="er-num"></p></div></div>' +
      '<a class="er-btn" href="' + esc(E.boot.links.board) + '">' + icon('back') + 'Volver al tablero</a>' +
    '</header>' +
    '<div class="er-filters er-st-filters">' +
      QUICK.map(function (q) { return '<button type="button" class="er-chip" data-r="' + q[0] + '">' + q[1] + '</button>'; }).join('') +
      '<span class="er-st-dates"><input type="date" class="er-input" id="er-from" aria-label="Desde"><span class="er-muted">a</span><input type="date" class="er-input" id="er-to" aria-label="Hasta"></span>' +
      '<select class="er-input" id="er-cat" aria-label="Categoría"><option value="">Todas las categorías</option>' +
        (D.categories || []).map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select>' +
    '</div>' +
    '<div id="er-st-body"></div>';

  var $ = function (s) { return app.querySelector(s); };

  /* ---------- Cifras ---------- */
  function tile(label, value, sub, ico) {
    return '<div class="er-panel er-kpi"><div class="er-kpi-h">' + icon(ico, true) + esc(label) + '</div><div class="er-kpi-v er-num">' + value + '</div><div class="er-kpi-s">' + sub + '</div></div>';
  }
  function delta(now, prev) {
    if (!prev) return '<span class="er-muted">Sin datos del periodo anterior</span>';
    var pct = Math.round((now - prev) / prev * 100);
    var cls = pct > 0 ? 'er-up' : pct < 0 ? 'er-down' : 'er-muted';
    return '<span class="' + cls + '">' + (pct > 0 ? '▲ +' : pct < 0 ? '▼ ' : '') + pct + ' %</span> <span class="er-muted">vs. periodo anterior (' + prev + ')</span>';
  }

  /* ---------- Gráfico de columnas: entradas por periodo ---------- */
  function columns(el, series) {
    var w = Math.max(280, el.clientWidth), h = 240, padL = 34, padB = 28, padT = 12;
    var max = Math.max(1, Math.max.apply(null, series.map(function (s) { return s.value; })));
    var step = max <= 5 ? 1 : Math.ceil(max / 4);
    var top = Math.ceil(max / step) * step;
    var n = series.length, cw = (w - padL) / n, bw = Math.max(3, Math.min(42, cw - 4));
    var y = function (v) { return padT + (h - padT - padB) * (1 - v / top); };
    var grid = '';
    for (var g = 0; g <= top; g += step) {
      grid += '<line x1="' + padL + '" x2="' + w + '" y1="' + y(g) + '" y2="' + y(g) + '" class="er-ch-grid"/>' +
        '<text x="' + (padL - 8) + '" y="' + (y(g) + 4) + '" class="er-ch-ax" text-anchor="end">' + g + '</text>';
    }
    var every = Math.ceil(n / Math.max(1, Math.floor((w - padL) / 64)));
    var bars = series.map(function (s, i) {
      var x = padL + i * cw + (cw - bw) / 2, bh = Math.max(0, h - padB - y(s.value)), r = Math.min(4, bw / 2, bh);
      var path = bh > 0 ? 'M' + x + ',' + (h - padB) + 'V' + (y(s.value) + r) + 'q0,-' + r + ' ' + r + ',-' + r + 'H' + (x + bw - r) + 'q' + r + ',0 ' + r + ',' + r + 'V' + (h - padB) + 'Z' : '';
      return '<g class="er-ch-col" data-i="' + i + '" style="--d:' + (i * 18) + 'ms">' +
        '<rect x="' + (padL + i * cw) + '" y="' + padT + '" width="' + cw + '" height="' + (h - padT - padB) + '" class="er-ch-hit"/>' +
        (path ? '<path d="' + path + '" class="er-ch-bar"/>' : '') +
        (i % every === 0 ? '<text x="' + (padL + i * cw + cw / 2) + '" y="' + (h - 8) + '" class="er-ch-ax" text-anchor="middle">' + esc(s.label) + '</text>' : '') + '</g>';
    }).join('');
    el.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" role="img" aria-label="Reparaciones recibidas por ' + UNIT[S.unit] + '">' +
      grid + '<line x1="' + padL + '" x2="' + w + '" y1="' + (h - padB) + '" y2="' + (h - padB) + '" class="er-ch-base"/>' + bars + '</svg>' +
      '<div class="er-ch-tip" hidden></div>';
    var tip = el.querySelector('.er-ch-tip');
    el.querySelectorAll('.er-ch-col').forEach(function (g) {
      g.addEventListener('pointerenter', function () {
        var s = series[+g.getAttribute('data-i')], hit = g.querySelector('.er-ch-hit');
        var box = el.getBoundingClientRect(), r = hit.getBoundingClientRect();
        tip.innerHTML = '<b class="er-num">' + s.value + '</b> ' + (s.value === 1 ? 'reparación' : 'reparaciones') + '<br><span class="er-muted">' + esc(s.label) + '</span>';
        tip.hidden = false;
        tip.style.left = Math.min(box.width - 150, Math.max(0, r.left - box.left + r.width / 2 - 75)) + 'px';
        g.classList.add('er-on');
      });
      g.addEventListener('pointerleave', function () { tip.hidden = true; g.classList.remove('er-on'); });
    });
  }

  /* ---------- Barras horizontales: lo que más se repite ---------- */
  function ranking(title, ico, items, empty) {
    var max = items.length ? items[0].value : 1, total = items.reduce(function (a, b) { return a + b.value; }, 0);
    return '<div class="er-panel"><h3>' + icon(ico) + esc(title) + '</h3>' +
      (items.length ? '<ol class="er-rank">' + items.map(function (it, i) {
        return '<li style="--d:' + (i * 50) + 'ms" title="' + esc(it.name + ': ' + it.value) + '"><span class="er-rank-n er-num">' + (i + 1) + '</span>' +
          '<span class="er-rank-main"><span class="er-rank-t"><span class="er-rank-name">' + esc(it.name) + '</span><b class="er-num">' + it.value +
          ' <span class="er-muted er-small">' + Math.round(it.value / total * 100) + ' %</span></b></span>' +
          '<span class="er-rank-bar"><span style="width:' + Math.max(2, it.value / max * 100) + '%"></span></span></span></li>';
      }).join('') + '</ol>' : '<div class="er-empty">' + esc(empty) + '</div>') + '</div>';
  }

  /* ---------- Informe de técnicos ---------- */
  var openTech = null;
  function techPanel() {
    var T = S.techs || [];
    var max = Math.max.apply(null, T.map(function (t) { return t.total; }).concat([0.01]));
    return '<div class="er-panel" style="margin-top:16px"><h3>' + icon('assign') + 'Técnicos<span class="er-r">Reparaciones entregadas en el periodo · sin líneas de garantía</span></h3>' +
      (T.length ? '<div class="er-tech">' +
        '<div class="er-tech-row er-tech-h"><span>Técnico</span><span>Reparaciones</span><span>Horas</span><span>Mano de obra</span><span>Piezas y otros</span><span>Total</span><span>Días medios</span></div>' +
        T.map(function (t, i) {
          return '<button type="button" class="er-tech-row" data-tech="' + i + '" aria-expanded="' + (openTech === i) + '" style="--d:' + (i * 60) + 'ms">' +
            '<span class="er-tech-name">' + E.avatar(t.id, t.name) + esc(t.name) + '</span>' +
            '<span class="er-num"><b>' + t.repairs + '</b>' + (t.warranty ? ' <span class="er-muted er-small">(' + t.warranty + ' garantía)</span>' : '') + '</span>' +
            '<span class="er-num">' + String(t.hours).replace('.', ',') + ' h</span>' +
            '<span class="er-num">' + esc(E.fmtMoney(t.labour)) + '</span>' +
            '<span class="er-num">' + esc(E.fmtMoney(t.parts + t.other)) + '</span>' +
            '<span class="er-tech-total"><b class="er-num">' + esc(E.fmtMoney(t.total)) + '</b><span class="er-rank-bar"><span style="width:' + Math.max(2, t.total / max * 100) + '%;--d:' + (i * 60) + 'ms"></span></span></span>' +
            '<span class="er-num">' + String(t.avg_days).replace('.', ',') + ' d</span></button>' +
            (openTech === i ? '<div class="er-mini er-tech-list">' + t.list.map(function (r) {
              return '<a href="' + esc(E.boot.links.repair + r.id) + '"><b class="er-num">' + esc(r.reference) + '</b><span class="er-grow">' + esc(r.device + ' · ' + E.fmtDate(r.date)) + '</span>' +
                '<span class="er-muted er-small er-num">' + String(r.hours).replace('.', ',') + ' h · M.O. ' + esc(E.fmtMoney(r.labour)) + ' · piezas ' + esc(E.fmtMoney(r.parts)) + '</span><b class="er-num">' + esc(E.fmtMoney(r.total)) + '</b></a>';
            }).join('') + '</div>' : '');
        }).join('') + '</div>' : '<div class="er-empty">Ningún técnico ha entregado reparaciones en este periodo.</div>') + '</div>';
  }
  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tech]');
    if (!t) return;
    var i = +t.getAttribute('data-tech');
    openTech = openTech === i ? null : i;
    var panel = t.closest('.er-panel');
    var tmp = document.createElement('div'); tmp.innerHTML = techPanel();
    panel.replaceWith(tmp.firstChild);
  });

  function render() {
    var t = S.totals;
    $('#er-st-sub').textContent = E.fmtDate(S.from) + ' – ' + E.fmtDate(S.to) + ' · ' + S.days + ' días';
    app.querySelectorAll('[data-r]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-r') === state.range)); });
    $('#er-from').value = S.from; $('#er-to').value = S.to;
    $('#er-st-body').innerHTML =
      '<div class="er-kpis">' +
        tile('Reparaciones recibidas', t.received, delta(t.received, t.received_prev), 'device') +
        tile('Entregadas', t.delivered, '<span class="er-muted">en el periodo</span>', 'check') +
        tile('Días medios en el taller', t.avg_days === null ? '—' : String(t.avg_days).replace('.', ','), '<span class="er-muted">de las entregadas</span>', 'clock') +
        tile('Presupuestos aceptados', esc(E.fmtMoney(t.accepted_total)), '<span class="er-muted">' + t.accepted + ' aceptados</span>', 'doc') +
      '</div>' +
      '<div class="er-panel"><h3>' + icon('trend') + 'Reparaciones recibidas por ' + UNIT[S.unit] + '</h3><div class="er-chart" id="er-cols"></div></div>' +
      '<div class="er-st-grid">' +
        ranking('Averías más repetidas', 'alert', S.faults, 'No hay averías marcadas en este periodo.') +
        ranking('Marcas que más entran', 'tag', S.brands, 'No hay marcas indicadas en este periodo.') +
        ranking('Modelos que más entran', 'device', S.models, 'No hay modelos indicados en este periodo.') +
        ranking('Por categoría', 'layers', S.categories, 'Sin reparaciones en este periodo.') +
      '</div>' + techPanel();
    columns($('#er-cols'), S.series);
  }

  var seq = 0;
  function load() {
    var my = ++seq;
    $('#er-st-body').classList.add('er-loading');
    E.api('stats', { from: state.from, to: state.to, id_category: state.cat }).then(function (res) {
      if (my !== seq) return;
      $('#er-st-body').classList.remove('er-loading');
      if (!res.ok) { E.toast(res.error, true); return; }
      S = res.stats;
      render();
    });
  }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-r]');
    if (!b) return;
    state.range = b.getAttribute('data-r');
    var q = quick(state.range);
    state.from = q.from; state.to = q.to;
    load();
  });
  app.addEventListener('change', function (e) {
    if (e.target.id === 'er-from' || e.target.id === 'er-to') {
      state.range = 'custom';
      state.from = $('#er-from').value; state.to = $('#er-to').value;
      if (state.from && state.to) load();
    }
    if (e.target.id === 'er-cat') { state.cat = e.target.value; load(); }
  });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { var el = $('#er-cols'); if (el) columns(el, S.series); }, 150); });

  render();
});
