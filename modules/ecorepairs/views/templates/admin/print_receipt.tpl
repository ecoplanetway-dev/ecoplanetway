<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Resguardo {$r.reference|escape:'html':'UTF-8'}</title>
<style>
  @page { size: {if $format == 'a4'}A4{else}76.2mm auto{/if}; margin: {if $format == 'a4'}14mm{else}0{/if}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font: 12px/1.3 Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Térmica 203 ppp: nada de gris ni letra de menos de 10 px (sale con puntitos) */
  .doc, .doc * { color: #000 !important; }
  .doc { {if $format == 'a4'}max-width: 100mm; margin: 0 auto; font-size: 12px;{else}width: 68mm; margin: 0 auto; padding: 3mm 0 2mm;{/if} }
  .hd { display: flex; align-items: center; gap: 2.5mm; border-bottom: 1.5px solid #000; padding-bottom: 1.5mm; }
  .hd img { width: 13mm; height: 13mm; object-fit: contain; flex: none; }
  .hd b { font-size: 13px; display: block; }
  .hd small { display: block; font-size: 11px; font-weight: bold; line-height: 1.25; }
  .ref { display: flex; justify-content: space-between; align-items: baseline; margin: 1.6mm 0 1mm; }
  .ref b { font-size: 17px; letter-spacing: .02em; }
  .ref span { font-size: 11px; font-weight: bold; }
  .kv { display: grid; grid-template-columns: 15mm 1fr; gap: .4mm 2mm; }
  .kv span { font-weight: normal; }
  .kv b, .kv i { font-style: normal; overflow-wrap: anywhere; }
  .box { border: 1px solid #000; border-radius: 1mm; padding: 1.2mm 1.8mm; margin: 1.6mm 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .qrrow { display: flex; gap: 2.5mm; align-items: center; border-top: 1px dashed #777; border-bottom: 1px dashed #777; padding: 1.6mm 0; margin: 1.6mm 0; }
  .qr { width: 19mm; height: 19mm; flex: none; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .code { font-size: 14px; font-weight: bold; letter-spacing: .1em; }
  .url { font-size: 10.5px; font-weight: bold; word-break: break-all; }
  .cond { font-size: 10.5px; font-weight: bold; line-height: 1.3; }
  .cond p { margin: 0 0 .5mm; }
  .sig { max-width: 48mm; max-height: 14mm; display: block; margin-top: 1mm; }
  .sigline { border-bottom: 1px solid #000; height: 12mm; }
  .foot { font-size: 10.5px; font-weight: bold; margin-top: .8mm; }
  .noprint { margin: 12px auto; text-align: center; }
  .noprint button { font: 600 15px Arial, sans-serif; padding: 10px 18px; border-radius: 10px; border: 1px solid #0B6E4B; background: #0B6E4B; color: #fff; cursor: pointer; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
<div class="noprint"><button type="button" onclick="window.print()">Imprimir</button></div>
<div class="doc">
  <div class="hd">
    {if $shop.logo}<img src="{$shop.logo|escape:'html':'UTF-8'}" alt="">{/if}
    <div><b>{$shop.name|escape:'html':'UTF-8'}</b>
      <small>{if $shop.address}{$shop.address|escape:'html':'UTF-8'}{if $shop.city}, {$shop.city|escape:'html':'UTF-8'}{/if}{/if}{if $shop.phone} · {$shop.phone|escape:'html':'UTF-8'}{/if}{if $shop.whatsapp} · WA {$shop.whatsapp|escape:'html':'UTF-8'}{/if}</small></div>
  </div>
  <div class="ref"><b>{$r.reference|escape:'html':'UTF-8'}</b><span>{$r.date_add|date_format:'%d/%m/%Y %H:%M'}</span></div>
  <div class="kv">
    <span>Cliente</span><b>{$r.customer_name|escape:'html':'UTF-8'}{if $customer && $customer.phone} · {$customer.phone|escape:'html':'UTF-8'}{/if}</b>
    {if $customer && $customer.invoice && $customer.invoice.nif}<span>NIF</span><i>{$customer.invoice.nif|escape:'html':'UTF-8'}</i>{/if}
    <span>Equipo</span><b>{$r.device_name|escape:'html':'UTF-8'}</b>
    {if $r.serial}<span>Nº serie</span><i>{$r.serial|escape:'html':'UTF-8'}</i>{/if}
    {if $r.km !== null && $r.km !== '' && $r.km > 0}<span>Km</span><i>{$r.km|intval}</i>{/if}
    <span>Trae</span><i>{if $r.accessories}{', '|implode:$r.accessories|escape:'html':'UTF-8'}{else}Nada{/if}</i>
    <span>Daños</span><i>{if $r.damages}{', '|implode:$r.damages|escape:'html':'UTF-8'}{else}Ninguno indicado{/if}</i>
    {if $r.eta_date && $r.eta_date != '0000-00-00'}<span>Previsto</span><i>{$r.eta_date|date_format:'%d/%m/%Y'} (orientativo)</i>{/if}
  </div>
  <div class="box"><b>Avería:</b> {if $r.faults}{', '|implode:$r.faults|escape:'html':'UTF-8'}{if $r.fault_customer} · {/if}{/if}{$r.fault_customer|escape:'html':'UTF-8'}</div>
  <div class="qrrow">
    <div class="qr" id="qr"></div>
    <div>Sigue tu reparación:<div class="code">{$r.tracking_code|escape:'html':'UTF-8'}</div><div class="url">{$trackingUrl|regex_replace:'#^https?://(www\.)?#':''|regex_replace:'#\?.*$#':''|escape:'html':'UTF-8'}</div></div>
  </div>
  <div class="cond">{foreach from=$conditions item=line}{if $line|trim}<p>{$line|escape:'html':'UTF-8'}</p>{/if}{/foreach}</div>
  {if $signature}<img class="sig" src="{$signature|escape:'html':'UTF-8'}" alt="Firma">{else}<div class="sigline"></div>{/if}
  <div class="foot">Firma: {$r.customer_name|escape:'html':'UTF-8'}{if $r.consent_rgpd} · acepta las condiciones{/if} · {$printDate|escape:'html':'UTF-8'}</div>
</div>
<script src="{$qrJs|escape:'html':'UTF-8'}"></script>
<script>
  (function () {
    try {
      var q = qrcode(0, 'M');
      q.addData({$trackingUrl|json_encode nofilter});
      q.make();
      document.getElementById('qr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) { }
    var imgs = Array.prototype.slice.call(document.images);
    Promise.all(imgs.map(function (i) {
      return i.complete ? 1 : new Promise(function (ok) { i.onload = i.onerror = ok; });
    })).then(function () { setTimeout(function () { window.print(); }, 250); });
  })();
</script>
</body>
</html>
