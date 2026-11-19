/* Reparaciones del taller · selectores de equipo y listas (se usan en Nueva reparación y en la Ficha) */
(function () {
  'use strict';
  var E = window.ECOR, esc = E.esc, icon = E.icon;

  function findCat(catalog, id) { return catalog.filter(function (c) { return c.id === id; })[0] || null; }
  function findBrand(cat, id) { return cat ? cat.brands.filter(function (b) { return b.id === id; })[0] || null : null; }
  function norm(s) { return String(s || '').toLowerCase().normalize ? String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : String(s || '').toLowerCase(); }

  /** Botón «Editar listas»: muestra la × para quitar opciones. */
  function editToggle(on) {
    return '<button type="button" class="er-btn er-btn-ghost er-btn-sm er-edit-tg" data-edit aria-pressed="' + on + '">' + icon(on ? 'check' : 'pen', true) + (on ? 'Hecho' : 'Editar listas') + '</button>';
  }
  function xBtn(attr) {
    return '<span class="er-x" role="button" tabindex="0" ' + attr + ' aria-label="Quitar de la lista">' + icon('x', true) + '</span>';
  }

  /** Quita las tildes y busca en los chips de un grupo (sin volver a pintar, para no perder el foco). */
  function filterGroup(group, q) {
    q = norm(q).trim();
    group.querySelectorAll('[data-name]').forEach(function (b) {
      b.hidden = !!q && norm(b.getAttribute('data-name')).indexOf(q) < 0 && b.getAttribute('aria-pressed') !== 'true';
    });
  }

  /**
   * Selector de categoría → marca → modelo (+ averías frecuentes opcional).
   * Se puede añadir lo que falte y, con «Editar listas», ocultar lo que sobra.
   */
  function DevicePicker(el, opts) {
    var catalog = opts.catalog;
    var v = {
      cat: opts.value && opts.value.cat || 0,
      brand: opts.value && opts.value.brand || 0,
      model: opts.value && opts.value.model || 0,
      faults: (opts.value && opts.value.faults || []).slice()
    };
    var adding = null; // 'category' | 'brand' | 'model' | 'fault'
    var editing = false;
    var manage = !!opts.canManage;

    function addBox(type, label) {
      return '<span class="er-inl"><input class="er-input" data-new="' + type + '" maxlength="64" placeholder="' + esc(label) + '" aria-label="' + esc(label) + '">' +
        '<button type="button" class="er-btn er-btn-pri" data-save="' + type + '">Guardar</button>' +
        '<button type="button" class="er-btn er-btn-ghost" data-cancel>Cancelar</button></span>';
    }
    function addBtn(type, tile) {
      if (!opts.canAdd || editing) return '';
      if (adding === type) return addBox(type, { category: 'Nueva categoría', brand: 'Nueva marca', model: 'Nuevo modelo', fault: 'Nueva avería' }[type]) +
        (type === 'model' ? '<span class="er-inl"><input class="er-input" data-newimg maxlength="255" placeholder="Foto del modelo: dirección https:// (opcional)" aria-label="Foto del modelo" style="width:320px">' +
          '<a class="er-btn er-btn-ghost er-btn-sm" data-gimg target="_blank" rel="noopener" href="#">' + icon('search', true) + 'Buscar imagen</a></span>' : '');
      return tile
        ? '<button type="button" class="er-tile er-add" data-add="' + type + '">' + icon('plus') + 'Añadir</button>'
        : '<button type="button" class="er-opt er-add" data-add="' + type + '">' + icon('plus', true) + 'Añadir</button>';
    }
    function finder(type, count, label) {
      return count > 10 ? '<label class="er-search er-find">' + icon('search', true) + '<input class="er-input" data-find="' + type + '" type="search" autocomplete="off" placeholder="' + esc(label) + '" aria-label="' + esc(label) + '"></label>' : '';
    }
    function thumb(m) {
      var src = E.modelImg(m.image);
      return src ? '<img class="er-mthumb" src="' + esc(src) + '" alt="" loading="lazy">' : '';
    }

    function render() {
      var cat = findCat(catalog, v.cat);
      var brand = findBrand(cat, v.brand);
      var html = '<div><div class="er-sub er-sub-row">Categoría <span class="er-req">*</span>' + (manage ? editToggle(editing) : '') + '</div><div class="er-tiles' + (editing ? ' er-editing' : '') + '">' +
        catalog.map(function (c) {
          return '<button type="button" class="er-tile" data-cat="' + c.id + '" aria-pressed="' + (c.id === v.cat) + '">' + icon(c.icon || 'other') + esc(c.name) +
            (editing ? xBtn('data-hide="category" data-id="' + c.id + '" data-label="' + esc(c.name) + '"') : '') + '</button>';
        }).join('') + (adding === 'category' ? '</div><div class="er-opts" style="margin-top:8px">' + addBtn('category') : addBtn('category', true)) + '</div></div>';

      if (cat) {
        html += '<div><div class="er-sub">Marca</div>' + finder('brand', cat.brands.length, 'Buscar marca') +
          '<div class="er-opts' + (editing ? ' er-editing' : '') + '" data-group="brand">' +
          cat.brands.map(function (b) {
            return '<button type="button" class="er-opt" data-brand="' + b.id + '" data-name="' + esc(b.name) + '" aria-pressed="' + (b.id === v.brand) + '">' + esc(b.name) +
              (editing ? xBtn('data-hide="brand" data-id="' + b.id + '" data-label="' + esc(b.name) + '"') : '') + '</button>';
          }).join('') + addBtn('brand') + '</div></div>';
        html += '<div><div class="er-sub">Modelo</div>' + (brand ? finder('model', brand.models.length, 'Buscar modelo de ' + brand.name) : '') +
          '<div class="er-opts' + (editing ? ' er-editing' : '') + '" data-group="model">' +
          (brand
            ? brand.models.map(function (m) {
                return '<button type="button" class="er-opt' + (m.image ? ' er-opt-img' : '') + '" data-model="' + m.id + '" data-name="' + esc(m.name) + '" aria-pressed="' + (m.id === v.model) + '">' + thumb(m) + esc(m.name) +
                  (editing ? xBtn('data-hide="model" data-id="' + m.id + '" data-label="' + esc(m.name) + '"') : '') + '</button>';
              }).join('') + addBtn('model')
            : '<span class="er-muted">Elige primero la marca</span>') + '</div></div>';
        if (opts.showFaults) {
          var list = cat.faults.slice();
          var names = list.map(function (f) { return f.name; });
          v.faults.forEach(function (f) { if (names.indexOf(f) < 0) list.push({ id: 0, name: f }); });
          html += '<div><div class="er-sub">Averías frecuentes</div><div class="er-opts' + (editing ? ' er-editing' : '') + '">' +
            list.map(function (f) {
              return '<button type="button" class="er-opt" data-fault="' + esc(f.name) + '" aria-pressed="' + (v.faults.indexOf(f.name) > -1) + '">' + esc(f.name) +
                (editing && f.id ? xBtn('data-hide="fault" data-id="' + f.id + '" data-label="' + esc(f.name) + '"') : '') + '</button>';
            }).join('') + addBtn('fault') + '</div></div>';
        }
      }
      el.innerHTML = html;
      var inp = el.querySelector('[data-new]');
      if (inp) inp.focus();
    }

    function changed() { if (opts.onChange) opts.onChange(api()); }

    function save(type) {
      var inp = el.querySelector('[data-new="' + type + '"]');
      var name = inp ? inp.value.trim() : '';
      if (!name) { inp && inp.focus(); return; }
      var parent = type === 'brand' || type === 'fault' ? v.cat : type === 'model' ? v.brand : 0;
      var btn = el.querySelector('[data-save="' + type + '"]');
      if (btn) btn.disabled = true;
      var imgInp = el.querySelector('[data-newimg]');
      E.api('addCatalog', {}, { type: type, id_parent: parent, name: name, icon: 'other', image: imgInp ? imgInp.value.trim() : '' }).then(function (res) {
        if (res.warning) E.toast(res.warning, true);
        if (btn) btn.disabled = false;
        if (!res.ok) { E.toast(res.error || 'No se pudo guardar.', true); return; }
        var cat = findCat(catalog, v.cat);
        if (type === 'category') {
          if (!findCat(catalog, res.id)) catalog.push({ id: res.id, name: res.name, icon: 'other', brands: [], faults: [] });
          v.cat = res.id; v.brand = 0; v.model = 0;
        } else if (type === 'brand') {
          if (!findBrand(cat, res.id)) cat.brands.push({ id: res.id, name: res.name, models: [] });
          v.brand = res.id; v.model = 0;
        } else if (type === 'model') {
          var b = findBrand(cat, v.brand);
          if (!b.models.filter(function (m) { return m.id === res.id; })[0]) b.models.push({ id: res.id, name: res.name, image: res.image || '' });
          v.model = res.id;
        } else if (type === 'fault') {
          if (!cat.faults.filter(function (f) { return f.id === res.id; })[0]) cat.faults.push({ id: res.id, name: res.name });
          if (v.faults.indexOf(res.name) < 0) v.faults.push(res.name);
        }
        adding = null;
        render();
        changed();
        E.toast('"' + res.name + '" guardado para la próxima vez');
      });
    }

    function hide(type, id, label) {
      E.api('hideCatalog', {}, { type: type, id: id }).then(function (res) {
        if (!res.ok) { E.toast(res.error || 'No se pudo quitar.', true); return; }
        var cat = findCat(catalog, v.cat);
        if (type === 'category') {
          catalog.splice(catalog.indexOf(findCat(catalog, id)), 1);
          if (v.cat === id) { v.cat = 0; v.brand = 0; v.model = 0; v.faults = []; }
        } else if (type === 'brand') {
          cat.brands = cat.brands.filter(function (b) { return b.id !== id; });
          if (v.brand === id) { v.brand = 0; v.model = 0; }
        } else if (type === 'model') {
          var b = findBrand(cat, v.brand);
          b.models = b.models.filter(function (m) { return m.id !== id; });
          if (v.model === id) v.model = 0;
        } else if (type === 'fault') {
          cat.faults = cat.faults.filter(function (f) { return f.id !== id; });
          v.faults = v.faults.filter(function (f) { return f !== label; });
        }
        render();
        changed();
        E.toast('«' + label + '» quitado de la lista. Se puede volver a mostrar en Ajustes.');
      });
    }

    el.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-hide]'))) {
        e.stopPropagation();
        hide(t.getAttribute('data-hide'), +t.getAttribute('data-id'), t.getAttribute('data-label'));
        return;
      }
      if (e.target.closest('[data-edit]')) { editing = !editing; adding = null; render(); return; }
      if ((t = e.target.closest('[data-cat]'))) {
        var id = +t.getAttribute('data-cat');
        if (id !== v.cat) { v.cat = id; v.brand = 0; v.model = 0; v.faults = []; }
        adding = null; render(); changed(); return;
      }
      if ((t = e.target.closest('[data-brand]'))) {
        var bid = +t.getAttribute('data-brand');
        if (bid === v.brand) { v.brand = 0; v.model = 0; } else { v.brand = bid; v.model = 0; }
        adding = null; render(); changed(); return;
      }
      if ((t = e.target.closest('[data-model]'))) {
        var mid = +t.getAttribute('data-model');
        v.model = mid === v.model ? 0 : mid;
        render(); changed(); return;
      }
      if ((t = e.target.closest('[data-fault]'))) {
        var n = t.getAttribute('data-fault');
        var i = v.faults.indexOf(n);
        if (i > -1) v.faults.splice(i, 1); else v.faults.push(n);
        render(); changed(); return;
      }
      if ((t = e.target.closest('[data-add]'))) { adding = t.getAttribute('data-add'); render(); return; }
      if ((t = e.target.closest('[data-save]'))) { save(t.getAttribute('data-save')); return; }
      if (e.target.closest('[data-cancel]')) { adding = null; render(); }
    });
    el.addEventListener('input', function (e) {
      if (e.target.getAttribute('data-new') === 'model') {
        var g = el.querySelector('[data-gimg]'), cat = findCat(catalog, v.cat), br = findBrand(cat, v.brand);
        if (g) g.href = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent((br ? br.name + ' ' : '') + e.target.value + ' ' + (cat ? cat.name : ''));
      }
      var f = e.target.getAttribute('data-find');
      if (f) filterGroup(el.querySelector('[data-group="' + f + '"]'), e.target.value);
    });
    el.addEventListener('keydown', function (e) {
      if (e.target.closest('[data-hide]') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.target.click(); return; }
      var inp = e.target.closest('[data-new]');
      if (!inp) return;
      if (e.key === 'Enter') { e.preventDefault(); save(inp.getAttribute('data-new')); }
      if (e.key === 'Escape') { adding = null; render(); }
    });

    function api() {
      var cat = findCat(catalog, v.cat), brand = findBrand(cat, v.brand);
      var model = brand ? brand.models.filter(function (m) { return m.id === v.model; })[0] : null;
      return {
        id_category: v.cat, id_brand: v.brand, id_model: v.model, faults: v.faults.slice(),
        label: [brand && brand.name, model && model.name].filter(Boolean).join(' ') || (cat ? cat.name : '')
      };
    }
    render();
    return { get: api, render: render, set: function (nv) {
      v.cat = nv.cat || 0; v.brand = nv.brand || 0; v.model = nv.model || 0;
      if (nv.faults) v.faults = nv.faults.slice();
      render();
    } };
  }

  /**
   * Lista de chips de selección múltiple (accesorios, daños).
   * opts.list ('accessories' | 'damages') + opts.canManage: lo que se añade o quita se guarda en Ajustes.
   */
  function ChipSet(el, opts) {
    var selected = (opts.selected || []).slice();
    var options = (opts.options || []).slice();
    var editing = false;
    var manage = !!(opts.canManage && opts.list);
    selected.forEach(function (s) { if (options.indexOf(s) < 0) options.push(s); });

    function render() {
      el.innerHTML = '<div class="er-opts' + (editing ? ' er-editing' : '') + '">' + options.map(function (o) {
        var on = selected.indexOf(o) > -1;
        return '<button type="button" class="er-opt' + (opts.warn ? ' er-warn' : '') + '" data-o="' + esc(o) + '" aria-pressed="' + on + '">' +
          (on && !opts.warn ? icon('check', true) : '') + esc(o) + (editing ? xBtn('data-rm="' + esc(o) + '"') : '') + '</button>';
      }).join('') +
      (opts.allowOther && !editing ? '<span class="er-inl"><input class="er-input" data-other maxlength="64" placeholder="Otro…" aria-label="Añadir otro">' +
        '<button type="button" class="er-btn er-icon-btn" data-addo aria-label="Añadir">' + icon('plus') + '</button></span>' : '') +
      (manage ? editToggle(editing) : '') + '</div>';
    }
    function changed() { if (opts.onChange) opts.onChange(selected.slice()); }

    function addOther() {
      var inp = el.querySelector('[data-other]');
      var v = inp ? inp.value.trim() : '';
      if (!v) { if (inp) inp.focus(); return; }
      if (options.indexOf(v) < 0) options.push(v);
      if (selected.indexOf(v) < 0) selected.push(v);
      render();
      changed();
      if (manage) {
        E.api('listOption', {}, { list: opts.list, op: 'add', value: v }).then(function (res) {
          if (res.ok) E.toast('«' + v + '» añadido a la lista'); else E.toast(res.error, true);
        });
      }
      var again = el.querySelector('[data-other]');
      if (again) again.focus();
    }

    el.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-rm]'))) {
        e.stopPropagation();
        var val = t.getAttribute('data-rm');
        E.api('listOption', {}, { list: opts.list, op: 'remove', value: val }).then(function (res) {
          if (!res.ok) { E.toast(res.error, true); return; }
          options = options.filter(function (o) { return o !== val; });
          var was = selected.indexOf(val) > -1;
          selected = selected.filter(function (o) { return o !== val; });
          render();
          if (was) changed();
          E.toast('«' + val + '» quitado de la lista');
        });
        return;
      }
      if (e.target.closest('[data-edit]')) { editing = !editing; render(); return; }
      if (e.target.closest('[data-addo]')) { addOther(); return; }
      var b = e.target.closest('[data-o]');
      if (!b || editing) return;
      var o = b.getAttribute('data-o'), i = selected.indexOf(o);
      if (i > -1) selected.splice(i, 1); else selected.push(o);
      render();
      changed();
    });
    el.addEventListener('keydown', function (e) {
      if (e.target.closest('[data-rm]') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.target.click(); return; }
      if (!e.target.closest('[data-other]') || e.key !== 'Enter') return;
      e.preventDefault();
      addOther();
    });
    render();
    return { get: function () { return selected.slice(); }, set: function (list) {
      (list || []).forEach(function (o) { if (options.indexOf(o) < 0) options.push(o); });
      selected = (list || []).slice(); render(); changed();
    }, options: function () { return options.slice(); } };
  }

  /**
   * Ventana para corregir los datos del cliente (también en PrestaShop).
   * Devuelve una promesa con la respuesta del servidor ({customer, log}) o null si se cancela.
   */
  function customerDialog(c, extra) {
    return new Promise(function (resolve) {
      var inv = c.invoice || {};
      var wrap = document.createElement('div');
      wrap.className = 'er-modal';
      function f(k, label, val, attrs) {
        return '<label class="er-field">' + label + '<input class="er-input" data-k="' + k + '" value="' + esc(val || '') + '" ' + (attrs || '') + '></label>';
      }
      wrap.innerHTML = '<div class="er-dlg" style="max-width:640px"><h2>Editar cliente</h2>' +
        '<div class="er-fg">' + f('firstname', 'Nombre <span class="er-req">*</span>', c.firstname, 'maxlength="64"') + f('lastname', 'Apellidos <span class="er-req">*</span>', c.lastname, 'maxlength="64"') +
        f('phone', 'Teléfono', c.phone, 'inputmode="tel" maxlength="32"') + f('email', 'Email', c.email, 'type="email" maxlength="128"') + '</div>' +
        '<label class="er-toggle">Acepta avisos por WhatsApp<input type="checkbox" class="er-sw" data-b="consent_whatsapp"' + (c.consent_whatsapp ? ' checked' : '') + '></label>' +
        '<label class="er-toggle">Quiere factura a su nombre<input type="checkbox" class="er-sw" data-b="invoice"' + (c.invoice ? ' checked' : '') + '></label>' +
        '<div class="er-fg" id="er-ce-inv"' + (c.invoice ? '' : ' hidden') + '>' + f('nif', 'NIF / CIF <span class="er-req">*</span>', inv.nif, 'maxlength="16"') + f('company', 'Razón social', inv.company, 'maxlength="64"') +
          f('address', 'Dirección <span class="er-req">*</span>', inv.address, 'maxlength="128"') + f('postcode', 'Código postal <span class="er-req">*</span>', inv.postcode, 'inputmode="numeric" maxlength="5"') +
          f('city', 'Ciudad <span class="er-req">*</span>', inv.city, 'maxlength="64"') + '</div>' +
        '<p class="er-muted er-small" style="margin:0">Los cambios se guardan también en el cliente de PrestaShop.</p>' +
        '<div class="er-err" id="er-ce-err" hidden></div>' +
        '<div class="er-dlg-act"><button type="button" class="er-btn er-btn-ghost" data-x>Cancelar</button><button type="button" class="er-btn er-btn-pri" data-ok>' + icon('check') + 'Guardar</button></div></div>';
      (E.root() || document.body).appendChild(wrap);
      wrap.querySelector('[data-k]').focus();
      wrap.addEventListener('change', function (e) {
        if (e.target.getAttribute('data-b') === 'invoice') wrap.querySelector('#er-ce-inv').hidden = !e.target.checked;
      });
      wrap.addEventListener('click', function (e) {
        if (e.target === wrap || e.target.closest('[data-x]')) { wrap.remove(); resolve(null); return; }
        var ok = e.target.closest('[data-ok]');
        if (!ok) return;
        var body = { id_customer: c.id_customer };
        wrap.querySelectorAll('[data-k]').forEach(function (i) { body[i.getAttribute('data-k')] = i.value.trim(); });
        wrap.querySelectorAll('[data-b]').forEach(function (i) { body[i.getAttribute('data-b')] = i.checked; });
        ok.disabled = true;
        E.api('updateCustomer', extra || {}, body).then(function (res) {
          ok.disabled = false;
          if (!res.ok) {
            wrap.querySelectorAll('[data-k]').forEach(function (i) { i.classList.toggle('er-invalid', !!(res.errors && res.errors[i.getAttribute('data-k')])); });
            var er = wrap.querySelector('#er-ce-err');
            er.textContent = res.error || Object.keys(res.errors || {}).map(function (k) { return res.errors[k]; }).join(' ');
            er.hidden = false;
            return;
          }
          wrap.remove();
          resolve(res);
        });
      });
    });
  }

  E.customerDialog = customerDialog;
  E.DevicePicker = DevicePicker;
  E.ChipSet = ChipSet;
})();
