/* Reparaciones del taller · ventana de WhatsApp (el mensaje se abre ya escrito y el empleado pulsa enviar) */
(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;

  /**
   * params: { id_ecorepair } o { id_request }. Devuelve una promesa con la respuesta del registro (log) o null.
   * «Abrir en WhatsApp Web» usa siempre la misma pestaña; «WhatsApp de PC» abre la aplicación.
   */
  function notify(params) {
    return E.api('notifyPreview', params).then(function (res) {
      if (!res.ok) { E.toast(res.error, true); return null; }
      return new Promise(function (resolve) {
        var key = res.default, texts = {};
        Object.keys(res.templates).forEach(function (k) { texts[k] = res.templates[k].text; });
        var wrap = document.createElement('div');
        wrap.className = 'er-modal';
        wrap.innerHTML = '<div class="er-dlg er-wa" style="max-width:620px">' +
          '<div class="er-row"><span class="er-wa-ico">' + icon('whatsapp') + '</span><h2 style="margin-right:auto">WhatsApp a ' + esc(res.name || 'cliente') + '</h2>' +
            '<button type="button" class="er-btn er-btn-ghost er-icon-btn" data-x aria-label="Cerrar">' + icon('x') + '</button></div>' +
          (res.consent ? '' : '<div class="er-banner er-warn" style="margin:0">' + icon('alert') + '<div>No consta que el cliente acepte avisos por WhatsApp. Envíalo solo si te lo ha pedido.</div></div>') +
          (Object.keys(res.templates).length > 1 ? '<div class="er-opts" id="er-wa-tpl">' + Object.keys(res.templates).map(function (k) {
            return '<button type="button" class="er-opt" data-tpl="' + k + '" aria-pressed="' + (k === key) + '">' + esc(res.templates[k].name) + '</button>';
          }).join('') + '</div>' : '') +
          '<label class="er-field">Teléfono<input class="er-input er-num" id="er-wa-phone" inputmode="tel" value="' + esc(res.phone) + '"></label>' +
          '<label class="er-field">Mensaje (puedes cambiarlo antes de abrir WhatsApp)<textarea class="er-input" id="er-wa-text" rows="7"></textarea></label>' +
          '<div class="er-err" id="er-wa-err" hidden></div>' +
          '<div class="er-wa-act">' +
            '<button type="button" class="er-btn er-btn-wa er-btn-lg" data-open="web">' + icon('whatsapp') + 'Abrir en WhatsApp Web</button>' +
            '<button type="button" class="er-btn er-btn-lg" data-open="app">' + icon('whatsapp') + 'Abrir en WhatsApp de PC</button>' +
            '<button type="button" class="er-btn er-btn-ghost" data-copy>' + icon('copy', true) + 'Copiar texto</button>' +
          '</div></div>';
        (E.root() || document.body).appendChild(wrap);
        var ta = wrap.querySelector('#er-wa-text');
        ta.value = texts[key] || '';
        ta.addEventListener('input', function () { texts[key] = ta.value; });
        function close(v) { wrap.remove(); resolve(v); }
        function phone() {
          var d = wrap.querySelector('#er-wa-phone').value.replace(/\D+/g, '');
          if (d.indexOf('00') === 0) d = d.slice(2);
          if (d.length === 9) d = '34' + d;
          return d;
        }
        wrap.addEventListener('click', function (e) {
          var t;
          if (e.target === wrap || e.target.closest('[data-x]')) { close(null); return; }
          if ((t = e.target.closest('[data-tpl]'))) {
            key = t.getAttribute('data-tpl');
            wrap.querySelectorAll('[data-tpl]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
            ta.value = texts[key] || '';
            return;
          }
          if (e.target.closest('[data-copy]')) {
            ta.select();
            try { document.execCommand('copy'); E.toast('Texto copiado'); } catch (er) { }
            return;
          }
          if ((t = e.target.closest('[data-open]'))) {
            var p = phone(), err = wrap.querySelector('#er-wa-err');
            if (p.length < 10) { err.textContent = 'Revisa el teléfono.'; err.hidden = false; return; }
            if (!ta.value.trim()) { err.textContent = 'Escribe el mensaje.'; err.hidden = false; return; }
            var q = 'phone=' + p + '&text=' + encodeURIComponent(ta.value.trim());
            if (t.getAttribute('data-open') === 'web') window.open('https://web.whatsapp.com/send?' + q, 'ecor-whatsapp');
            else window.location.href = 'whatsapp://send?' + q;
            var body = Object.assign({ template: key, phone: p, body: ta.value.trim() }, params);
            E.api('logMessage', params, body).then(function (r2) { close(r2 && r2.ok ? r2 : { ok: true }); });
            E.toast('Mensaje abierto en WhatsApp. Queda guardado en el historial.');
          }
        });
      });
    });
  }

  E.notify = notify;
})();
