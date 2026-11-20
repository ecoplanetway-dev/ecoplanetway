/* Reparaciones del taller · ventana de WhatsApp (el mensaje se abre ya escrito y el empleado pulsa enviar) */
(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;

  /**
   * params: { id_ecorepair } o { id_request }. Devuelve una promesa con la respuesta del registro (log) o null.
   * «Abrir en WhatsApp Web» usa siempre la misma pestaña; «WhatsApp de PC» abre la aplicación.
   */
  function notify(params) {
    // POST: la app del taller solo acepta POST (con GET daba error en el móvil)
    var mobile = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return E.api('notifyPreview', params, {}).then(function (res) {
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
          (Object.keys(res.templates).length > 1 ? '<div class="er-opts er-flat" id="er-wa-tpl">' + Object.keys(res.templates).map(function (k) {
            return '<button type="button" class="er-opt" data-tpl="' + k + '" aria-pressed="' + (k === key) + '">' + esc(res.templates[k].name) + '</button>';
          }).join('') + '</div>' : '') +
          '<label class="er-field">Teléfono<input class="er-input er-num" id="er-wa-phone" inputmode="tel" value="' + esc(res.phone) + '"></label>' +
          '<label class="er-field"><span class="er-row" style="flex-wrap:nowrap">Mensaje (puedes cambiarlo antes de abrir WhatsApp)' + (E.hasVoice ? '<button type="button" class="er-btn er-btn-sm er-btn-ghost" data-dict style="margin-left:auto">' + icon('mic', true) + 'Dictar</button>' : '') + '</span>' +
            '<textarea class="er-input" id="er-wa-text" rows="7"></textarea></label>' +
          (res.tech ? '<div class="er-wa-techbox"><label class="er-wa-tech"><input type="checkbox" id="er-wa-tech">' + (res.tech.avatar ? '<img src="' + esc(res.tech.avatar) + '" alt="">' : '') +
            '<span><b>Mostrar al técnico</b><small>Añade «Tu patín lo ha reparado ' + esc(res.tech.name) + '» al mensaje</small></span></label>' +
            (res.tech.avatar ? '<button type="button" class="er-btn er-btn-sm" data-techimg>' + icon(mobile ? 'send' : 'copy', true) + (mobile ? 'Compartir la foto' : 'Copiar la foto') + '</button>' +
              '<small class="er-muted er-wa-techhelp">' + (mobile ? 'Después de mandar el texto, pulsa «Compartir la foto», elige WhatsApp y el chat del cliente.' : 'Pulsa «Copiar la foto» y en el chat de WhatsApp pulsa Ctrl+V para pegarla.') + '</small>'
              : '<small class="er-muted er-wa-techhelp">' + esc(res.tech.name) + ' no tiene foto. Súbela en Ajustes → Personal y app.</small>') + '</div>' : '') +
          '<div class="er-err" id="er-wa-err" hidden></div>' +
          '<div class="er-wa-act">' +
            (mobile ? '<a class="er-btn er-btn-wa er-btn-lg" data-open="mobile" href="https://wa.me/">' + icon('whatsapp') + 'Abrir WhatsApp</a>'
              : '<button type="button" class="er-btn er-btn-wa er-btn-lg" data-open="web">' + icon('whatsapp') + 'Abrir en WhatsApp Web</button>' +
                '<button type="button" class="er-btn er-btn-lg" data-open="app">' + icon('whatsapp') + 'Abrir en WhatsApp de PC</button>') +
            '<button type="button" class="er-btn er-btn-ghost" data-copy>' + icon('copy', true) + 'Copiar texto</button>' +
          '</div></div>';
        (E.root() || document.body).appendChild(wrap);
        var ta = wrap.querySelector('#er-wa-text');
        ta.value = texts[key] || '';
        ta.addEventListener('input', function () { texts[key] = ta.value; });
        // Técnico (opcional): una línea con su nombre y el enlace de seguimiento, que en WhatsApp sale con su foto
        var techLine = res.tech ? '\n\nTu patín lo ha reparado ' + res.tech.name + ' 🔧' : '';
        function withTech(txt, on) {
          if (!res.tech) return txt;
          var base = txt.replace(techLine + '\n' + res.tech.link, '').replace(techLine, '');
          if (!on) return base;
          return base + techLine + (base.indexOf(res.tech.link) > -1 ? '' : '\n' + res.tech.link);
        }
        var techCb = wrap.querySelector('#er-wa-tech');
        // En el móvil la foto del técnico se manda como imagen con «Compartir» (se prepara antes para que el botón funcione al primer toque)
        var techFile = null;
        if (mobile && res.tech && res.tech.avatar && navigator.canShare && window.fetch) {
          var path = res.tech.avatar;
          try { path = new URL(res.tech.avatar, location.href).pathname; } catch (er) { }
          fetch(path, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) {
            if (!b) return;
            var f = new File([b], 'tecnico-' + String(res.tech.name || 'taller').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.' + ((b.type.split('/')[1] || 'png').replace('jpeg', 'jpg')), { type: b.type || 'image/png' });
            if (navigator.canShare({ files: [f] })) techFile = f;
          }).catch(function () { });
        }
        // Ordenador: copia la foto al portapapeles (PNG) para pegarla con Ctrl+V en WhatsApp
        function copyTech(btn) {
          var path = res.tech.avatar;
          try { path = new URL(res.tech.avatar, location.href).pathname; } catch (er) { }
          if (!navigator.clipboard || !window.ClipboardItem) { window.open(res.tech.avatar, '_blank'); E.toast('Botón derecho sobre la foto → «Copiar imagen» y pégala en el chat.'); return; }
          // El navegador pide la promesa dentro del clic (si no, no deja copiar)
          var png = fetch(path, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error('foto'); return r.blob(); }).then(function (b) {
            if (b.type === 'image/png') return b;
            return new Promise(function (ok, ko) {
              var im = new Image();
              im.onload = function () { var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); c.toBlob(function (x) { x ? ok(x) : ko(); }, 'image/png'); };
              im.onerror = ko; im.src = URL.createObjectURL(b);
            });
          });
          navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]).then(function () {
            if (btn) btn.innerHTML = icon('check', true) + 'Foto copiada';
            E.toast('Foto copiada: en el chat de WhatsApp pulsa Ctrl+V');
          }, function () { window.open(res.tech.avatar, '_blank'); E.toast('No se pudo copiar. Botón derecho sobre la foto → «Copiar imagen».', true); });
        }
        function shareTech() {
          if (!techFile) {
            // Sin «Compartir» de archivos: se abre la foto para mantenerla pulsada → Copiar o Compartir
            window.open(res.tech.avatar, '_blank');
            E.toast('Mantén pulsada la foto → «Compartir» o «Copiar» y pégala en el chat.');
            return;
          }
          navigator.share({ files: [techFile] }).then(function () { close({ ok: true }); }).catch(function () { });
        }
        if (techCb) techCb.addEventListener('change', function () { ta.value = withTech(ta.value, techCb.checked); texts[key] = ta.value; });
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
            ta.value = withTech(texts[key] || '', techCb && techCb.checked);
            return;
          }
          if (e.target.closest('[data-dict]')) { e.preventDefault(); E.dictate(ta); return; }
          if (e.target.closest('[data-sharetech]')) { shareTech(); return; }
          var ti = e.target.closest('[data-techimg]');
          if (ti) { if (mobile) shareTech(); else copyTech(ti); return; }
          if (e.target.closest('[data-copy]')) {
            ta.select();
            try { document.execCommand('copy'); E.toast('Texto copiado'); } catch (er) { }
            return;
          }
          if ((t = e.target.closest('[data-open]'))) {
            var p = phone(), err = wrap.querySelector('#er-wa-err');
            if (p.length < 10) { e.preventDefault(); err.textContent = 'Revisa el teléfono.'; err.hidden = false; return; }
            if (!ta.value.trim()) { e.preventDefault(); err.textContent = 'Escribe el mensaje.'; err.hidden = false; return; }
            var q = 'phone=' + p + '&text=' + encodeURIComponent(ta.value.trim()), how = t.getAttribute('data-open');
            var body = Object.assign({ template: key, phone: p, body: ta.value.trim() }, params);
            if (how === 'mobile') {
              // En el móvil: el botón es un enlace normal a wa.me y lo abre el propio toque
              // (así el iPhone abre WhatsApp directamente, sin preguntar). El historial se guarda a la vez.
              t.href = 'https://wa.me/' + p + '?text=' + encodeURIComponent(ta.value.trim());
              var withPhoto = techCb && techCb.checked && res.tech && res.tech.avatar;
              E.api('logMessage', params, body).then(function (r2) {
                if (withPhoto) {
                  // Paso 2: al volver de WhatsApp, mandar la foto del técnico al mismo chat
                  wrap.querySelector('.er-wa-act').innerHTML = '<div class="er-wa-step2"><b>Paso 2 · La foto de ' + esc(res.tech.name) + '</b>' +
                    '<span class="er-muted er-small">Cuando hayas enviado el texto, vuelve aquí, pulsa el botón, elige WhatsApp y el chat de ' + esc(res.name || 'el cliente') + '.</span>' +
                    '<button type="button" class="er-btn er-btn-wa er-btn-lg" data-sharetech>' + icon('whatsapp') + 'Enviar la foto del técnico</button>' +
                    '<button type="button" class="er-btn er-btn-ghost" data-x>Terminar</button></div>';
                } else {
                  setTimeout(function () { close(r2 && r2.ok ? r2 : { ok: true }); }, 400);
                }
              });
              return;
            }
            if (how === 'web') window.open('https://web.whatsapp.com/send?' + q, 'ecor-whatsapp');
            else window.location.href = 'whatsapp://send?' + q;
            E.api('logMessage', params, body).then(function (r2) { close(r2 && r2.ok ? r2 : { ok: true }); });
            E.toast('Mensaje abierto en WhatsApp. Queda guardado en el historial.');
          }
        });
      });
    });
  }

  E.notify = notify;
})();
