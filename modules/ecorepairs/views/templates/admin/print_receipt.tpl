<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Resguardo {$r.reference|escape:'html':'UTF-8'}</title>
<style>
  @page { size: {if $format == 'a4'}A4{else}80mm auto{/if}; margin: {if $format == 'a4'}14mm{else}0{/if}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font: 12px/1.35 Arial, Helvetica, sans-serif; }
  .doc { {if $format == 'a4'}max-width: 180mm; margin: 0 auto; font-size: 13px;{else}width: 72mm; margin: 0 auto; padding: 3mm 0;{/if} }
  .center { text-align: center; }
  .logo { max-width: {if $format == 'a4'}50mm{else}46mm{/if}; max-height: 22mm; display: block; margin: 0 auto 2mm; }
  h1 { font-size: {if $format == 'a4'}22px{else}18px{/if}; margin: 2mm 0 1mm; letter-spacing: .02em; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; margin: 3mm 0 1mm; border-bottom: 1px solid #000; padding-bottom: .8mm; }
  .muted { color: #333; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: .6mm 0; vertical-align: top; }
  td.k { width: 34%; color: #333; padding-right: 2mm; }
  .box { border: 1px solid #000; padding: 2mm; margin-top: 1mm; white-space: pre-wrap; }
  .qr { width: {if $format == 'a4'}32mm{else}30mm{/if}; height: {if $format == 'a4'}32mm{else}30mm{/if}; margin: 2mm auto 1mm; }
  .qr svg { width: 100%; height: 100%; }
  .code { font-size: 16px; font-weight: bold; letter-spacing: .12em; }
  .sig { max-width: 60mm; max-height: 24mm; display: block; margin-top: 1mm; }
  .cond { font-size: {if $format == 'a4'}11px{else}10px{/if}; color: #222; }
  .cond p { margin: 0 0 1mm; }
  .cut { border-top: 1px dashed #000; margin-top: 4mm; padding-top: 1mm; font-size: 9px; text-align: center; }
  .cols { {if $format == 'a4'}display: grid; grid-template-columns: 1fr 1fr; gap: 8mm;{/if} }
  .noprint { margin: 12px auto; text-align: center; }
  .noprint button { font: 600 15px Arial, sans-serif; padding: 10px 18px; border-radius: 10px; border: 1px solid #0B6E4B; background: #0B6E4B; color: #fff; cursor: pointer; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
<div class="noprint"><button type="button" onclick="window.print()">Imprimir</button></div>
<div class="doc">
  <div class="center">
    {if $shop.logo}<img class="logo" src="{$shop.logo|escape:'html':'UTF-8'}" alt="">{/if}
    <b>{$shop.name|escape:'html':'UTF-8'}</b><br>
    {if $shop.address}{$shop.address|escape:'html':'UTF-8'}<br>{/if}
    {if $shop.city}{$shop.city|escape:'html':'UTF-8'}<br>{/if}
    {if $shop.phone}Tel. {$shop.phone|escape:'html':'UTF-8'}{/if}
    <h1>RESGUARDO {$r.reference|escape:'html':'UTF-8'}</h1>
    <div class="muted">Entrada: {$r.date_add|date_format:'%d/%m/%Y %H:%M'}</div>
  </div>

  <div class="cols">
    <div>
      <h2>Cliente</h2>
      <table>
        <tr><td class="k">Nombre</td><td>{$r.customer_name|escape:'html':'UTF-8'}</td></tr>
        {if $customer && $customer.phone}<tr><td class="k">Teléfono</td><td>{$customer.phone|escape:'html':'UTF-8'}</td></tr>{/if}
        {if $customer && $customer.email}<tr><td class="k">Email</td><td>{$customer.email|escape:'html':'UTF-8'}</td></tr>{/if}
        {if $customer && $customer.invoice}<tr><td class="k">NIF</td><td>{$customer.invoice.nif|escape:'html':'UTF-8'}</td></tr>{/if}
      </table>

      <h2>Equipo</h2>
      <table>
        <tr><td class="k">Tipo</td><td>{$r.category_name|escape:'html':'UTF-8'}</td></tr>
        <tr><td class="k">Equipo</td><td><b>{$r.device_name|escape:'html':'UTF-8'}</b></td></tr>
        {if $r.serial}<tr><td class="k">Nº de serie</td><td>{$r.serial|escape:'html':'UTF-8'}</td></tr>{/if}
        {if $r.km !== null && $r.km !== ''}<tr><td class="k">Kilómetros</td><td>{$r.km|intval}</td></tr>{/if}
        {if $r.color}<tr><td class="k">Color</td><td>{$r.color|escape:'html':'UTF-8'}</td></tr>{/if}
        <tr><td class="k">Entrega con</td><td>{if $r.accessories}{', '|implode:$r.accessories|escape:'html':'UTF-8'}{else}Nada{/if}</td></tr>
        <tr><td class="k">Daños previos</td><td>{if $r.damages}{', '|implode:$r.damages|escape:'html':'UTF-8'}{else}Ninguno indicado{/if}</td></tr>
        {if $r.eta_date && $r.eta_date != '0000-00-00'}<tr><td class="k">Fecha prevista</td><td>{$r.eta_date|date_format:'%d/%m/%Y'} (orientativa)</td></tr>{/if}
      </table>

      <h2>Avería indicada</h2>
      <div class="box">{if $r.faults}{', '|implode:$r.faults|escape:'html':'UTF-8'}{if $r.fault_customer}. {/if}{/if}{$r.fault_customer|escape:'html':'UTF-8'}</div>
    </div>

    <div>
      <h2>Seguimiento</h2>
      <div class="center">
        <div class="qr" id="qr"></div>
        <div class="code">{$r.tracking_code|escape:'html':'UTF-8'}</div>
        <div class="muted" style="word-break:break-all">{$trackingUrl|escape:'html':'UTF-8'}</div>
      </div>

      <h2>Condiciones</h2>
      <div class="cond">
        {foreach from=$conditions item=line}{if $line|trim}<p>{$line|escape:'html':'UTF-8'}</p>{/if}{/foreach}
      </div>

      <h2>Firma del cliente</h2>
      {if $signature}<img class="sig" src="{$signature|escape:'html':'UTF-8'}" alt="Firma">{else}<div style="height:18mm"></div>{/if}
      <div class="muted" style="font-size:10px">{$r.customer_name|escape:'html':'UTF-8'}{if $r.consent_rgpd} · Acepta condiciones y protección de datos{/if}{if $r.consent_whatsapp} · Acepta avisos por WhatsApp{/if}</div>
    </div>
  </div>

  <div class="cut">Impreso el {$printDate|escape:'html':'UTF-8'} · Conserve este resguardo para recoger su equipo</div>
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
