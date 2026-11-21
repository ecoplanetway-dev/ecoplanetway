/* Reparaciones del taller · baterías fabricadas: ficha editable, nº de serie y pegatinas */
(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;

  E.ready(function () {
    var app = E.root();
    if (!app || app.getAttribute('data-view') !== 'batteries') return;
    var D = E.data || {}, list = D.list || [], F = D.fields || {}, q = '';

    function spec(b) {
      var d = b.data;
      return [d.volts ? d.volts + ' V' : '', d.ah ? d.ah + ' Ah' : '', d.wh ? d.wh + ' Wh' : '', d.config].filter(Boolean).join(' · ');
    }
    function render() {
      var rows = list.filter(function (b) { return !q || (b.serial + ' ' + spec(b) + ' ' + (b.data.for_model || '') + ' ' + (b.reference || '')).toLowerCase().indexOf(q.toLowerCase()) > -1; });
      app.innerHTML =
        '<div class="er-f-head"><a class="er-btn er-btn-ghost er-icon-btn" href="' + esc(E.boot.links.board) + '" aria-label="Volver">' + icon('back') + '</a>' +
          '<div class="er-f-title"><h1>Baterías fabricadas</h1><span class="er-st-chip">' + list.length + ' en total</span></div>' +
          (D.canEdit ? '<button type="button" class="er-btn er-ink" data-new>' + icon('plus') + 'Nueva batería</button>' : '') + '</div>' +
        '<label class="er-search" style="margin-bottom:12px">' + icon('search') + '<input class="er-input" id="er-bq" type="search" placeholder="Nº de serie, voltaje, modelo o REP-" value="' + esc(q) + '"></label>' +
        '<div class="er-bat-list">' + (rows.length ? rows.map(function (b, i) {
          return '<div class="er-bat-row"><div class="er-bat-v"><b>' + esc(b.data.volts || '?') + ' V</b><small>' + esc(b.data.ah || '?') + ' Ah</small></div>' +
            '<div class="er-grow"><b>' + esc(b.serial) + '</b> <span class="er-muted er-small">' + esc(E.fmtDate(b.date_add)) + (b.made_by ? ' · ' + esc(b.made_by) : '') + '</span>' +
              '<div class="er-small">' + esc(spec(b)) + (b.data.for_model ? ' · para ' + esc(b.data.for_model) : '') + (b.reference ? ' · <b>' + esc(b.reference) + '</b>' : '') + '</div>' +
              (b.warranty_until ? '<div class="er-small er-muted">Garantía hasta el ' + esc(E.fmtDate(b.warranty_until)) + '</div>' : '') + '</div>' +
            '<div class="er-bat-act">' +
              '<a class="er-btn er-btn-sm" href="' + esc(E.ajaxUrl('printBattery', { id: b.id })) + '" target="_blank" rel="noopener">' + icon('print', true) + 'Xprinter</a>' +
              '<button type="button" class="er-btn er-btn-sm" data-niim="' + b.id + '">' + icon('qr', true) + 'Niimbot</button>' +
              (D.canEdit ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost" data-edit="' + b.id + '">' + icon('pen', true) + 'Editar</button>' : '') +
              '<a class="er-btn er-btn-sm er-btn-ghost" href="' + esc(b.url) + '" target="_blank" rel="noopener">Ver página</a></div></div>';
        }).join('') : '<div class="er-empty">' + (list.length ? 'Ninguna con «' + esc(q) + '».' : 'Aún no hay baterías. Pulsa «Nueva batería».') + '</div>') + '</div>';
      var inp = app.querySelector('#er-bq');
      if (inp && q) { inp.focus(); inp.setSelectionRange(q.length, q.length); }
    }
    function find(id) { return list.filter(function (b) { return b.id === id; })[0]; }

    function form(b) {
      var d = b ? b.data : {};
      var keys = Object.keys(F);
      var wrap = document.createElement('div');
      wrap.className = 'er-modal';
      wrap.innerHTML = '<div class="er-dlg" style="max-width:640px"><h2>' + (b ? 'Batería ' + esc(b.serial) : 'Nueva batería') + '</h2>' +
        '<p class="er-muted er-small" style="margin:0">Cada batería puede ser distinta: cambia lo que haga falta. Los Wh se calculan solos si los dejas vacíos.</p>' +
        '<div class="er-fg er-bat-form">' + keys.map(function (k) {
          var v = b ? (d[k] || '') : F[k][2];
          return k === 'notes' ? '<label class="er-field er-bat-wide">' + esc(F[k][0]) + '<textarea class="er-input" data-k="' + k + '" rows="2" maxlength="' + F[k][1] + '">' + esc(v) + '</textarea></label>'
            : '<label class="er-field">' + esc(F[k][0]) + '<input class="er-input" data-k="' + k + '" maxlength="' + F[k][1] + '" value="' + esc(v) + '"' + (/volts|ah|wh|warranty/.test(k) ? ' inputmode="decimal"' : '') + '></label>';
        }).join('') +
          '<label class="er-field">Reparación (opcional)<input class="er-input" data-k="reference" maxlength="16" placeholder="REP-0014" value="' + esc(b ? b.reference || '' : '') + '"></label></div>' +
        '<div class="er-err" id="er-berr" hidden></div>' +
        '<div class="er-dlg-act">' + (b && D.canDelete ? '<button type="button" class="er-btn er-btn-ghost er-danger" data-del>Borrar</button>' : '') +
          '<button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>' + icon('check', true) + 'Guardar</button></div></div>';
      app.appendChild(wrap);
      wrap.addEventListener('click', function (e) {
        if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); return; }
        if (e.target.closest('[data-del]')) {
          E.dialog({ title: 'Borrar ' + b.serial, text: 'Su QR dejará de funcionar.', ok: 'Borrar', danger: true }).then(function (y) {
            if (!y) return;
            E.api('battDelete', {}, { id: b.id }).then(function (res) { if (res.ok) { list = res.list; wrap.remove(); render(); } });
          });
          return;
        }
        if (!e.target.closest('[data-ok]')) return;
        var data = {};
        wrap.querySelectorAll('[data-k]').forEach(function (i) { data[i.getAttribute('data-k')] = i.value; });
        E.api('battSave', {}, { id: b ? b.id : 0, data: JSON.stringify(data) }).then(function (res) {
          if (!res.ok) { var er = wrap.querySelector('#er-berr'); er.textContent = res.error; er.hidden = false; return; }
          list = res.list; wrap.remove(); render();
          E.toast(b ? 'Guardada' : 'Batería ' + res.battery.serial + ' creada');
        });
      });
    }

    app.addEventListener('input', function (e) { if (e.target.id === 'er-bq') { q = e.target.value; render(); } });
    app.addEventListener('click', function (e) {
      var t;
      if (e.target.closest('[data-new]')) { form(null); return; }
      if ((t = e.target.closest('[data-edit]'))) { form(find(+t.getAttribute('data-edit'))); return; }
      if ((t = e.target.closest('[data-niim]'))) {
        var b = find(+t.getAttribute('data-niim'));
        E.batteryLabel(Object.assign({}, b.data, { serial: b.serial, url: b.url, logo: D.logo, date: E.fmtDate(b.date_add) }));
      }
    });
    render();
  });
})();
