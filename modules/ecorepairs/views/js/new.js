/* Reparaciones del taller · nueva reparación */
window.ECOR.ready(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;
  var D = E.data;
  var app = E.root();
  if (!app || app.getAttribute('data-view') !== 'new') return;

  var st = {
    customer: D.preselectCustomer || null,
    phone: '',
    newCustomer: false,
    invoiceOpen: false,
    photos: [], // {file, url}
    saving: false
  };

  app.innerHTML =
    '<div class="er-f-head">' +
      '<a class="er-btn er-btn-ghost er-icon-btn" href="' + esc(E.boot.links.board) + '" aria-label="Volver al tablero">' + icon('back') + '</a>' +
      '<div class="er-f-title"><h1>Nueva reparación</h1></div>' +
      '<button type="button" class="er-btn er-btn-pri" id="er-voice" style="margin-left:auto">' + icon('mic') + 'Rellenar por voz</button>' +
    '</div>' +
    (D.fromTag ? '<div class="er-banner">' + icon('qr') + '<div>Patín con pegatina <b>' + esc(D.fromTag.tag) + '</b>: cliente y equipo copiados de ' + esc(D.fromTag.reference) + '. Solo falta la avería.</div></div>' : '') +
    '<div class="er-banner er-bad" id="er-errors" hidden></div>' +
    '<div class="er-grid2">' +
      '<div class="er-stack er-new-grid">' +
        '<div class="er-panel" id="er-p-customer"><h3>' + icon('user') + 'Cliente <span class="er-req">*</span><span class="er-r">Busca por nombre, teléfono, email o NIF</span></h3><div id="er-cust"></div></div>' +
        '<div class="er-panel er-p-device"><h3>' + icon('device') + 'Equipo</h3><div id="er-device" class="er-stack" style="gap:14px"></div>' +
          '<div class="er-fg">' +
            '<label class="er-field">Nº de serie<input class="er-input" id="er-serial" maxlength="64" autocomplete="off"></label>' +
            '<label class="er-field">Kilómetros<input class="er-input" id="er-km" inputmode="numeric" maxlength="9" autocomplete="off"></label>' +
            '<label class="er-field">Color<input class="er-input" id="er-color" maxlength="64" autocomplete="off"></label>' +
          '</div></div>' +
        '<div class="er-panel"><h3>' + icon('alert') + 'Avería y recepción</h3>' +
          '<label class="er-field">Lo que cuenta el cliente<textarea class="er-input" id="er-fault" maxlength="5000" placeholder="Por ejemplo: no enciende desde que se mojó"></textarea></label>' +
          '<div><div class="er-sub">Entregado con el equipo</div><div id="er-acc"></div></div>' +
          '<div><div class="er-sub">Daños previos</div><div id="er-dmg"></div></div>' +
          '<div><div class="er-sub">Fotos de entrada</div><div class="er-photos" id="er-photos"></div>' +
            '<input type="file" id="er-file" accept="image/*" multiple hidden></div>' +
        '</div>' +
      '</div>' +
      '<div class="er-stack">' +
        '<div class="er-panel"><h3>' + icon('assign') + 'Asignación</h3>' +
          '<label class="er-field">Técnico<select class="er-input" id="er-tech"><option value="0">Sin asignar</option>' +
            D.technicians.map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + '</option>'; }).join('') + '</select></label>' +
          '<label class="er-field">Fecha prevista de entrega<input class="er-input" type="date" id="er-eta"></label>' +
          '<label class="er-toggle">Urgente<input type="checkbox" class="er-sw er-sw-urg" id="er-urgent"></label>' +
          '<label class="er-toggle">En garantía<input type="checkbox" class="er-sw er-sw-gar" id="er-warranty"></label>' +
        '</div>' +
        '<div class="er-panel"><h3>' + icon('pen') + 'Firma del cliente<button type="button" class="er-btn er-btn-ghost er-btn-sm" id="er-sig-clear" style="margin-left:auto">Borrar</button></h3>' +
          '<canvas class="er-sig" id="er-sig" aria-label="Firma del cliente"></canvas>' +
          '<label class="er-toggle" style="font-weight:500;font-size:13px">Acepta las condiciones del resguardo y la protección de datos <span class="er-req">*</span><input type="checkbox" class="er-sw" id="er-rgpd"></label>' +
          '<label class="er-toggle" style="font-weight:500;font-size:13px">Acepta recibir avisos por WhatsApp<input type="checkbox" class="er-sw" id="er-wa"></label>' +
        '</div>' +
        '<label class="er-toggle">Imprimir el resguardo al crear<input type="checkbox" class="er-sw" id="er-print" checked></label>' +
        '<button type="button" class="er-btn er-btn-pri er-btn-lg er-btn-block" id="er-save">' + icon('check') + 'Crear reparación</button>' +
      '</div>' +
    '</div>';

  var $ = function (s) { return app.querySelector(s); };
  var today = new Date();
  $('#er-eta').min = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);

  /* ---------- Equipo ---------- */
  var device = E.DevicePicker($('#er-device'), { catalog: D.catalog, canAdd: true, canManage: !!D.canEdit, showFaults: true });
  var acc = E.ChipSet($('#er-acc'), { options: D.accessories, allowOther: true, list: 'accessories', canManage: !!D.canEdit });
  var dmg = E.ChipSet($('#er-dmg'), { options: D.damages, warn: true, allowOther: true, list: 'damages', canManage: !!D.canEdit });
  if (D.fromTag) {
    device.set({ cat: D.fromTag.id_category, brand: D.fromTag.id_brand, model: D.fromTag.id_model });
    $('#er-serial').value = D.fromTag.serial || '';
    $('#er-color').value = D.fromTag.color || '';
  }

  /* ---------- Entrada por voz (pregunta y escucha, paso a paso) ---------- */
  function deviceIndex() {
    var out = [];
    D.catalog.forEach(function (c) {
      c.brands.forEach(function (b) {
        out.push({ cat: c.id, brand_id: b.id, model_id: 0, brand: b.name, model: '', faults: c.faults });
        b.models.forEach(function (m) { out.push({ cat: c.id, brand_id: b.id, model_id: m.id, id_model: m.id, brand: b.name, model: m.name, faults: c.faults }); });
      });
    });
    return out;
  }
  function cap(t) { t = String(t || '').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }
  $('#er-voice').addEventListener('click', function () {
    var cur = device.get();
    E.voiceRepair({ catalog: D.catalog, accessories: acc.options(), damages: dmg.options(), askCustomer: !st.customer, askDevice: !D.fromTag,
      presetCat: D.fromTag ? D.catalog.filter(function (c) { return c.id === cur.id_category; })[0] : null }).then(function (R) {
      if (!R) return;
      if (D.fromTag) device.set({ cat: cur.id_category, brand: cur.id_brand, model: cur.id_model, faults: R.faults });
      else if (R.cat) device.set({ cat: R.cat.id, brand: R.brand ? R.brand.id : 0, model: R.model ? R.model.id : 0, faults: R.faults });
      if (R.serial) $('#er-serial').value = R.serial;
      if (R.km) $('#er-km').value = R.km;
      var fault = [R.fault, R.notes.length ? 'Notas: ' + R.notes.join(', ') : ''].filter(Boolean).join('\n');
      if (fault) $('#er-fault').value = fault;
      if (R.acc.length) acc.set(R.acc);
      if (R.dmg.length) dmg.set(R.dmg);
      // Lo nuevo se guarda en las listas para la próxima vez
      if (D.canEdit) {
        R.accNew.forEach(function (v) { E.api('listOption', {}, { list: 'accessories', op: 'add', value: v }); });
        R.dmgNew.forEach(function (v) { E.api('listOption', {}, { list: 'damages', op: 'add', value: v }); });
      }
      $('#er-urgent').checked = !!R.urgent;
      if (R.firstname || R.phone) voiceCustomer(R.firstname || '', R.lastname || '', R.phone || '');
      E.toast('Revisa los datos y pulsa «Crear reparación»');
    });
  });
  function voiceCustomer(first, last, phone) {
    var name = (first + ' ' + last).trim();
    var q = phone.length >= 6 ? phone : name;
    if (!q) return;
    E.api('searchCustomers', { q: q }).then(function (res) {
      var list = (res.customers || []).filter(function (c) {
        return phone.length >= 6 ? String(c.phone || '').replace(/\D/g, '').indexOf(phone.slice(-9)) > -1 : E.fuzzyScore(name, c.name) >= 80;
      });
      if (list.length === 1) { st.customer = list[0]; renderCustomer(); E.toast('Cliente encontrado: ' + list[0].name); return; }
      st.customer = null; st.newCustomer = true; renderCustomer();
      var f = custEl.querySelector('[data-k="firstname"]'), l = custEl.querySelector('[data-k="lastname"]'), ph = custEl.querySelector('[data-k="phone"]');
      if (f) f.value = first;
      if (l) l.value = last;
      if (ph) ph.value = phone;
      E.toast(list.length > 1 ? 'Hay varios clientes parecidos: búscalo o crea uno nuevo.' : 'Cliente nuevo: revisa los datos y pulsa «Guardar cliente».');
    });
  }

  /* ---------- Cliente ---------- */
  var custEl = $('#er-cust');
  var searchTimer, searchSeq = 0;

  function invoiceForm(prefix) {
    return '<div class="er-fg">' +
      '<label class="er-field">NIF / CIF <span class="er-req">*</span><input class="er-input" data-k="nif" maxlength="16" autocomplete="off"></label>' +
      '<label class="er-field">Razón social<input class="er-input" data-k="company" maxlength="64"></label>' +
      '<label class="er-field">Dirección <span class="er-req">*</span><input class="er-input" data-k="address" maxlength="128"></label>' +
      '<label class="er-field">Código postal <span class="er-req">*</span><input class="er-input" data-k="postcode" inputmode="numeric" maxlength="5"></label>' +
      '<label class="er-field">Ciudad <span class="er-req">*</span><input class="er-input" data-k="city" maxlength="64"></label>' +
      '</div>';
  }

  function renderCustomer() {
    var c = st.customer;
    if (c) {
      var inv = c.invoice
        ? '<span class="er-tag er-t-ok">' + icon('check', true) + 'Factura: ' + esc(c.invoice.nif) + '</span>'
        : (st.invoiceOpen ? '' : '<button type="button" class="er-link" id="er-inv-open">Quiere factura: añadir datos fiscales</button>');
      custEl.innerHTML = '<div class="er-chosen"><span class="er-av" style="background:#5B6170">' + esc(E.initials(c.name)) + '</span>' +
        '<div class="er-grow"><b>' + esc(c.name) + '</b><div class="er-muted er-small er-num">' + esc([c.phone, c.email].filter(Boolean).join(' · ') || 'Sin teléfono ni email') +
        ' · ' + c.repairs_count + ' reparaciones · ' + c.orders_count + ' pedidos</div></div>' +
        '<button type="button" class="er-btn er-btn-sm" id="er-cust-edit">' + icon('pen', true) + 'Editar</button>' +
        '<button type="button" class="er-btn er-btn-sm" id="er-cust-change">Cambiar</button></div>' +
        (!c.phone ? '<label class="er-field" style="margin-top:12px">Teléfono para avisos<input class="er-input" id="er-cust-phone" inputmode="tel" maxlength="32" value="' + esc(st.phone) + '"></label>' : '') +
        '<div style="margin-top:12px">' + inv + '</div>' +
        (st.invoiceOpen ? '<div id="er-inv" class="er-stack" style="gap:12px;margin-top:12px">' + invoiceForm() +
          '<div class="er-err" id="er-inv-err" hidden></div><div class="er-row"><button type="button" class="er-btn er-btn-pri" id="er-inv-save">Guardar datos de factura</button>' +
          '<button type="button" class="er-btn er-btn-ghost" id="er-inv-cancel">Cancelar</button></div></div>' : '');
      return;
    }
    if (st.newCustomer) {
      custEl.innerHTML = '<div class="er-stack" style="gap:12px" id="er-nc">' +
        '<div class="er-fg">' +
          '<label class="er-field">Nombre <span class="er-req">*</span><input class="er-input" data-k="firstname" maxlength="64" autocomplete="off"></label>' +
          '<label class="er-field">Apellidos <span class="er-req">*</span><input class="er-input" data-k="lastname" maxlength="64" autocomplete="off"></label>' +
          '<label class="er-field">Teléfono' + (D.fieldRules.phone === 'req' ? ' <span class="er-req">*</span>' : '') + '<input class="er-input" data-k="phone" inputmode="tel" maxlength="32" autocomplete="off"></label>' +
          '<label class="er-field">Email' + (D.fieldRules.email === 'req' ? ' <span class="er-req">*</span>' : '') + '<input class="er-input" data-k="email" type="email" maxlength="128" autocomplete="off"></label>' +
        '</div>' +
        '<label class="er-toggle">Quiere factura a su nombre<input type="checkbox" class="er-sw" id="er-nc-inv"></label>' +
        '<div id="er-nc-invf" hidden>' + invoiceForm() + '</div>' +
        '<div class="er-err" id="er-nc-err" hidden></div>' +
        '<div class="er-row"><button type="button" class="er-btn er-btn-pri" id="er-nc-save">' + icon('check') + 'Guardar cliente</button>' +
        '<button type="button" class="er-btn er-btn-ghost" id="er-nc-cancel">Cancelar</button></div>' +
        '<p class="er-muted er-small" style="margin:0">Se crea también como cliente en PrestaShop.</p></div>';
      var first = custEl.querySelector('[data-k="firstname"]');
      if (first) first.focus();
      return;
    }
    custEl.innerHTML = '<div class="er-stack" style="gap:12px">' +
      '<label class="er-search">' + icon('search') + '<input class="er-input" id="er-cq" type="search" autocomplete="off" placeholder="Nombre, teléfono, email o NIF" aria-label="Buscar cliente"></label>' +
      '<div id="er-cres"></div>' +
      '<button type="button" class="er-btn" id="er-nc-open">' + icon('plus') + 'Cliente nuevo</button></div>';
  }

  function customerRow(c) {
    return '<button type="button" data-cid="' + c.id_customer + '"><span class="er-av" style="background:#5B6170">' + esc(E.initials(c.name)) + '</span>' +
      '<span class="er-grow"><b>' + esc(c.name) + '</b><br><span class="er-muted er-small er-num">' +
      esc([c.phone, c.email, 'Cliente nº ' + c.id_customer].filter(Boolean).join(' · ')) + '</span></span>' +
      (c.orders_count ? '<span class="er-tag er-t-gar">Compró aquí</span>' : '') +
      (c.repairs_count ? '<span class="er-tag er-t-neu">' + c.repairs_count + ' rep.</span>' : '') +
      '<span class="er-btn er-btn-sm er-btn-ghost" role="button" tabindex="0" data-cedit="' + c.id_customer + '" aria-label="Editar a ' + esc(c.name) + '">' + icon('pen', true) + 'Editar</span></button>';
  }

  var lastResults = [];
  function doSearch(q) {
    var box = custEl.querySelector('#er-cres');
    if (!box) return;
    if (q.length < 2) { box.innerHTML = ''; return; }
    var seq = ++searchSeq;
    box.innerHTML = '<div class="er-muted er-small">Buscando…</div>';
    E.api('searchCustomers', { q: q }).then(function (res) {
      if (seq !== searchSeq || !custEl.querySelector('#er-cres')) return;
      lastResults = res.customers || [];
      box.innerHTML = !res.ok ? '<div class="er-err">' + esc(res.error) + '</div>'
        : lastResults.length ? '<div class="er-pick">' + lastResults.map(customerRow).join('') + '</div>'
        : '<div class="er-muted er-small">No hay clientes con «' + esc(q) + '». Puedes crearlo con «Cliente nuevo».</div>';
    });
  }

  function readFields(scope) {
    var out = {};
    scope.querySelectorAll('[data-k]').forEach(function (i) { out[i.getAttribute('data-k')] = i.value.trim(); });
    return out;
  }
  function markErrors(scope, errors) {
    scope.querySelectorAll('[data-k]').forEach(function (i) {
      i.classList.toggle('er-invalid', !!(errors && errors[i.getAttribute('data-k')]));
    });
  }
  function errorText(errors) {
    return Object.keys(errors || {}).map(function (k) { return errors[k]; }).join(' ');
  }

  custEl.addEventListener('input', function (e) {
    if (e.target.id === 'er-cq') {
      clearTimeout(searchTimer);
      var q = e.target.value.trim();
      searchTimer = setTimeout(function () { doSearch(q); }, 300);
    }
    if (e.target.id === 'er-cust-phone') st.phone = e.target.value.trim();
  });
  custEl.addEventListener('change', function (e) {
    if (e.target.id === 'er-nc-inv') custEl.querySelector('#er-nc-invf').hidden = !e.target.checked;
  });
  custEl.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-cedit]')) || e.target.closest('#er-cust-edit')) {
      e.stopPropagation();
      var cid = t ? +t.getAttribute('data-cedit') : st.customer.id_customer;
      E.api('customerInfo', { id_customer: cid }).then(function (info) {
        if (!info.ok) { E.toast(info.error, true); return; }
        E.customerDialog(info.customer).then(function (res) {
          if (!res) return;
          if (t) {
            lastResults = lastResults.map(function (x) { return x.id_customer === cid ? res.customer : x; });
            var q = custEl.querySelector('#er-cq'); if (q) doSearch(q.value.trim());
          } else { st.customer = res.customer; renderCustomer(); }
          E.toast('Datos del cliente guardados');
        });
      });
      return;
    }
    if ((t = e.target.closest('[data-cid]'))) {
      var id = +t.getAttribute('data-cid');
      st.customer = lastResults.filter(function (c) { return c.id_customer === id; })[0] || null;
      st.invoiceOpen = false;
      renderCustomer();
      return;
    }
    if (e.target.closest('#er-cust-change')) { st.customer = null; st.invoiceOpen = false; renderCustomer(); custEl.querySelector('#er-cq').focus(); return; }
    if (e.target.closest('#er-nc-open')) { st.newCustomer = true; renderCustomer(); return; }
    if (e.target.closest('#er-nc-cancel')) { st.newCustomer = false; renderCustomer(); return; }
    if (e.target.closest('#er-inv-open')) { st.invoiceOpen = true; renderCustomer(); return; }
    if (e.target.closest('#er-inv-cancel')) { st.invoiceOpen = false; renderCustomer(); return; }
    if ((t = e.target.closest('[data-use-existing]'))) {
      E.api('customerInfo', { id_customer: t.getAttribute('data-use-existing') }).then(function (res) {
        if (res.ok) { st.customer = res.customer; st.newCustomer = false; renderCustomer(); }
      });
      return;
    }
    if ((t = e.target.closest('#er-nc-save'))) {
      var scope = custEl.querySelector('#er-nc');
      var f = readFields(scope);
      var wantsInvoice = custEl.querySelector('#er-nc-inv').checked;
      var body = {
        firstname: f.firstname, lastname: f.lastname, phone: f.phone, email: f.email,
        invoice: wantsInvoice, nif: f.nif || '', company: f.company || '', address: f.address || '', postcode: f.postcode || '', city: f.city || '',
        consent_rgpd: $('#er-rgpd').checked, consent_whatsapp: $('#er-wa').checked
      };
      t.disabled = true;
      E.api('createCustomer', {}, body).then(function (res) {
        t.disabled = false;
        var err = custEl.querySelector('#er-nc-err');
        if (!res.ok) {
          markErrors(scope, res.errors);
          err.innerHTML = esc(res.error || errorText(res.errors) || 'No se pudo crear el cliente.') +
            (res.existingCustomer ? ' <button type="button" class="er-link" data-use-existing="' + res.existingCustomer.id_customer + '">Usar a ' + esc(res.existingCustomer.name) + '</button>' : '');
          err.hidden = false;
          return;
        }
        st.customer = res.customer;
        st.newCustomer = false;
        renderCustomer();
        E.toast('Cliente creado en PrestaShop');
      });
      return;
    }
    if ((t = e.target.closest('#er-inv-save'))) {
      var invScope = custEl.querySelector('#er-inv');
      var fi = readFields(invScope);
      fi.id_customer = st.customer.id_customer;
      t.disabled = true;
      E.api('addInvoiceAddress', {}, fi).then(function (res) {
        t.disabled = false;
        if (!res.ok) {
          markErrors(invScope, res.errors);
          var er = custEl.querySelector('#er-inv-err');
          er.textContent = errorText(res.errors) || res.error || 'No se pudo guardar.';
          er.hidden = false;
          return;
        }
        st.customer = res.customer;
        st.invoiceOpen = false;
        renderCustomer();
        E.toast('Datos de factura guardados');
      });
    }
  });

  /* ---------- Fotos ---------- */
  function renderPhotos() {
    $('#er-photos').innerHTML = st.photos.map(function (p, i) {
      return '<div class="er-ph"><img src="' + esc(p.url) + '" alt="Foto ' + (i + 1) + '"><button type="button" class="er-del" data-del="' + i + '" aria-label="Quitar foto">' + icon('x', true) + '</button></div>';
    }).join('') + '<button type="button" class="er-ph er-add" id="er-add-photo">' + icon('camera') + 'Hacer foto</button>' +
      '<button type="button" class="er-ph er-add" id="er-add-gal">' + icon('plus') + 'Desde galería o archivo</button>';
  }
  $('#er-photos').addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]');
    if (d) {
      var i = +d.getAttribute('data-del');
      URL.revokeObjectURL(st.photos[i].url);
      st.photos.splice(i, 1);
      renderPhotos();
      return;
    }
    if (e.target.closest('#er-add-photo')) E.pickPhoto($('#er-file'), false);
    if (e.target.closest('#er-add-gal')) E.pickPhoto($('#er-file'), true);
  });
  $('#er-file').addEventListener('change', function (e) {
    Array.prototype.forEach.call(e.target.files, function (f) {
      if (f.type && !/^image\//.test(f.type)) return;
      st.photos.push({ file: f, url: URL.createObjectURL(f) });
    });
    e.target.value = '';
    renderPhotos();
  });

  /* ---------- Firma ---------- */
  var sig = E.signaturePad($('#er-sig'));
  $('#er-sig-clear').addEventListener('click', function () { sig.clear(); });
  window.addEventListener('resize', function () { if (sig.isEmpty()) sig.reset(); });

  /* ---------- Guardar ---------- */
  function showErrors(list) {
    var box = $('#er-errors');
    if (!list.length) { box.hidden = true; return; }
    box.innerHTML = icon('alert') + '<div>' + list.map(esc).join('<br>') + '</div>';
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  $('#er-save').addEventListener('click', function () {
    if (st.saving) return;
    var dv = device.get();
    var errs = [];
    if (!st.customer) errs.push(st.newCustomer ? 'Guarda primero el cliente nuevo.' : 'Elige o crea un cliente.');
    if (!dv.id_category) errs.push('Elige la categoría del equipo.');
    if (!$('#er-fault').value.trim() && !dv.faults.length) errs.push('Indica la avería: elige una frecuente o escríbela.');
    if (!$('#er-rgpd').checked) errs.push('El cliente tiene que aceptar las condiciones y la protección de datos.');
    if (st.invoiceOpen) errs.push('Guarda o cancela los datos de factura.');
    showErrors(errs);
    if (errs.length) return;

    var printWin = $('#er-print').checked ? window.open('about:blank', '_blank') : null;
    if (printWin) printWin.document.write('<p style="font:16px system-ui;padding:24px">Preparando el resguardo…</p>');

    st.saving = true;
    var btn = $('#er-save');
    btn.disabled = true;
    btn.innerHTML = 'Guardando…';

    var payload = {
      id_customer: st.customer.id_customer,
      phone: st.phone,
      id_category: dv.id_category, id_brand: dv.id_brand, id_model: dv.id_model, faults: dv.faults,
      serial: $('#er-serial').value.trim(), km: $('#er-km').value.trim(), color: $('#er-color').value.trim(),
      fault_customer: $('#er-fault').value.trim(),
      accessories: acc.get(), damages: dmg.get(),
      id_employee_tech: +$('#er-tech').value, eta_date: $('#er-eta').value,
      urgent: $('#er-urgent').checked, warranty: $('#er-warranty').checked,
      consent_rgpd: $('#er-rgpd').checked, consent_whatsapp: $('#er-wa').checked,
      device_tag: D.fromTag ? D.fromTag.tag : ''
    };

    function fail(msg) {
      st.saving = false;
      btn.disabled = false;
      btn.innerHTML = icon('check') + 'Crear reparación';
      if (printWin) printWin.close();
      showErrors([msg]);
    }

    E.api('createRepair', {}, { payload: JSON.stringify(payload) }).then(function (res) {
      if (!res.ok) {
        fail(res.error || errorText(res.errors) || 'No se pudo crear la reparación.');
        return;
      }
      var id = res.id, problems = [];
      var chain = Promise.resolve();
      if (!sig.isEmpty()) {
        chain = chain.then(function () {
          btn.innerHTML = 'Guardando la firma…';
          return E.api('saveSignature', { id_ecorepair: id }, { signature: sig.toDataURL() }).then(function (r) {
            if (!r.ok) problems.push('Firma: ' + r.error);
          });
        });
      }
      chain = chain.then(function () { if (printWin) printWin.location.href = res.printUrl; });
      st.photos.forEach(function (p, i) {
        chain = chain.then(function () {
          btn.innerHTML = 'Subiendo foto ' + (i + 1) + ' de ' + st.photos.length + '…';
          return E.shrinkImage(p.file, 1600).then(function (small) {
            var fd = new FormData();
            fd.append('photo', small, small.name || 'foto.jpg');
            return E.api('uploadPhoto', { id_ecorepair: id }, fd).then(function (r) {
              if (!r.ok) problems.push('Foto ' + (i + 1) + ': ' + r.error);
            });
          });
        });
      });
      chain.then(function () {
        if (problems.length) {
          try { sessionStorage.setItem('ecor-problems', JSON.stringify(problems)); } catch (e) {}
        }
        window.location.href = res.url;
      });
    });
  });

  renderCustomer();
  renderPhotos();
  E.dropZone($('#er-photos').parentNode, function () { return $('#er-file'); });
});
