<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Etiqueta {$r.reference|escape:'html':'UTF-8'}</title>
{*
 * Etiqueta del taller para pegar al patín (76,2 mm de ancho, vertical, unos 9,5 cm): QR grande que abre la reparación en la app del taller.
 *}
<style>
  @page { size: 76.2mm 90mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font: 12px/1.25 Arial, Helvetica, sans-serif; font-weight: bold; }
  .t, .t * { color: #000 !important; }
  .t { width: 68mm; margin: 0 auto; padding: 2.5mm 0; display: flex; flex-direction: column; align-items: stretch; gap: 1.4mm; text-align: center; }
  .qr { width: 26mm; height: 26mm; margin: 0 auto; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .r1 { font-size: 22px; font-weight: 900; line-height: 1; letter-spacing: .02em; }
  .urg { align-self: center; background: #000; color: #fff; font-weight: 800; font-size: 11px; padding: .5mm 2mm; border-radius: .8mm; }
  .dev { font-size: 15px; font-weight: 800; overflow-wrap: anywhere; }
  .cli { font-size: 12px; }
  .fault { border: 1.5px solid #000; border-radius: 1mm; padding: 1.2mm 1.8mm; font-weight: 700; font-size: 11px; line-height: 1.25; text-align: left; overflow-wrap: anywhere; }
  .fault span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 5; line-clamp: 5; overflow: hidden; }
  .row { margin-top: .6mm; }
  .row { display: flex; justify-content: space-between; gap: 2mm; border-top: 1px solid #000; padding-top: 1mm; font-size: 11.5px; text-align: left; }
  .row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .row b { white-space: nowrap; }
  .noprint { margin: 12px auto; text-align: center; }
  .noprint button { font: 600 15px Arial, sans-serif; padding: 10px 18px; border-radius: 10px; border: 1px solid #0B6E4B; background: #0B6E4B; color: #fff; cursor: pointer; }
  @media print { .noprint { display: none; } }
  @media screen { .t { box-shadow: 0 0 0 1px #ccc; } }
</style>
</head>
<body>
<div class="noprint"><button type="button" onclick="window.print()">Imprimir</button></div>
<div class="t">
  <div class="qr" id="qr"></div>
  <div class="r1">{$r.reference|escape:'html':'UTF-8'}</div>
  {if $r.urgent}<span class="urg">URGENTE</span>{/if}
  <div class="dev">{$r.device_name|escape:'html':'UTF-8'}</div>
  <div class="cli">{$r.customer_name|escape:'html':'UTF-8'|truncate:28:'…'}{if $customer && $customer.phone} · {$customer.phone|escape:'html':'UTF-8'}{/if}<br>Entrada {$r.date_add|date_format:'%d/%m/%Y'}</div>
  <div class="fault"><span>{if $r.faults}{', '|implode:$r.faults|escape:'html':'UTF-8'}{if $r.fault_customer} · {/if}{/if}{$r.fault_customer|escape:'html':'UTF-8'}</span></div>
  <div class="row"><span>Trae: {if $r.accessories}{', '|implode:$r.accessories|escape:'html':'UTF-8'}{else}nada{/if}</span>{if $r.tech_name}<b>Téc.: {$r.tech_name|escape:'html':'UTF-8'|truncate:14:''}</b>{/if}</div>
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
    setTimeout(function () { window.print(); }, 300);
  })();
</script>
</body>
</html>
