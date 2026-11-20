<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Etiqueta {$r.reference|escape:'html':'UTF-8'}</title>
{*
 * Etiqueta del taller para pegar al patín (80 × 60 mm): QR grande que abre la reparación en la app del taller.
 *}
<style>
  @page { size: 80mm 60mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font: 12px/1.25 Arial, Helvetica, sans-serif; }
  .t { width: 80mm; height: 60mm; padding: 3mm; overflow: hidden; display: flex; flex-direction: column; gap: 1.6mm; }
  .top { display: flex; gap: 3mm; }
  .qr { width: 27mm; height: 27mm; flex: none; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .info { min-width: 0; }
  .r1 { font-size: 21px; font-weight: 900; line-height: 1; letter-spacing: .01em; }
  .urg { display: inline-block; background: #000; color: #fff; font-weight: 800; font-size: 10px; padding: .4mm 1.6mm; border-radius: .8mm; margin-top: 1mm; }
  .dev { font-size: 14px; font-weight: 800; margin-top: 1mm; overflow-wrap: anywhere; }
  .fault { border: 1.5px solid #000; border-radius: 1mm; padding: 1mm 1.6mm; font-weight: 700; font-size: 12px; max-height: 12mm; overflow: hidden; }
  .row { display: flex; justify-content: space-between; gap: 2mm; border-top: 1px solid #000; padding-top: 1mm; font-size: 11px; margin-top: auto; }
  .row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .noprint { margin: 12px auto; text-align: center; }
  .noprint button { font: 600 15px Arial, sans-serif; padding: 10px 18px; border-radius: 10px; border: 1px solid #0B6E4B; background: #0B6E4B; color: #fff; cursor: pointer; }
  @media print { .noprint { display: none; } }
  @media screen { .t { margin: 0 auto; box-shadow: 0 0 0 1px #ccc; } }
</style>
</head>
<body>
<div class="noprint"><button type="button" onclick="window.print()">Imprimir</button></div>
<div class="t">
  <div class="top">
    <div class="qr" id="qr"></div>
    <div class="info">
      <div class="r1">{$r.reference|escape:'html':'UTF-8'}</div>
      {if $r.urgent}<span class="urg">URGENTE</span>{/if}
      <div class="dev">{$r.device_name|escape:'html':'UTF-8'}</div>
      <div>Entrada {$r.date_add|date_format:'%d/%m'} · {$r.customer_name|escape:'html':'UTF-8'|truncate:22:'…'}</div>
      {if $customer && $customer.phone}<div>{$customer.phone|escape:'html':'UTF-8'}</div>{/if}
    </div>
  </div>
  <div class="fault">{if $r.faults}{', '|implode:$r.faults|escape:'html':'UTF-8'}{if $r.fault_customer} · {/if}{/if}{$r.fault_customer|escape:'html':'UTF-8'|truncate:110:'…'}</div>
  <div class="row"><span>Trae: {if $r.accessories}{', '|implode:$r.accessories|escape:'html':'UTF-8'}{else}nada{/if}</span><b>{if $r.tech_name}Téc.: {$r.tech_name|escape:'html':'UTF-8'|truncate:16:''}{/if}</b></div>
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
