<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>Cierre del taller {$close.date|date_format:'%d/%m/%Y'}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 12px/1.35 Arial, Helvetica, sans-serif; color: #000; }
  .doc { width: 72mm; margin: 0 auto; padding: 3mm 0; }
  h1 { font-size: 16px; text-align: center; margin: 1mm 0; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #000; margin: 3mm 0 1mm; padding-bottom: .8mm; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: .6mm 0; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; }
  .big td { font-size: 15px; font-weight: bold; border-top: 1px solid #000; padding-top: 1mm; }
  .cash { border: 2px solid #000; padding: 2mm; margin-top: 2mm; text-align: center; font-weight: bold; }
  .muted { color: #333; font-size: 10px; }
  .noprint { margin: 12px auto; text-align: center; }
  .noprint button { font: 600 15px Arial, sans-serif; padding: 10px 18px; border-radius: 10px; border: 0; background: #0B6E4B; color: #fff; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
<div class="noprint"><button type="button" onclick="window.print()">Imprimir</button></div>
<div class="doc">
  <div style="text-align:center"><b>{$shopName|escape:'html':'UTF-8'}</b></div>
  <h1>CIERRE DEL TALLER</h1>
  <div style="text-align:center">{$close.date|date_format:'%d/%m/%Y'}</div>
  <h2>Por forma de pago</h2>
  <table>
    {foreach from=$close.methods item=m}
      <tr><td>{$m.name|escape:'html':'UTF-8'} ({$m.count|intval})</td><td class="r">{$m.total|string_format:'%.2f'|replace:'.':','} €</td></tr>
    {/foreach}
    <tr class="big"><td>TOTAL</td><td class="r">{$close.total|string_format:'%.2f'|replace:'.':','} €</td></tr>
  </table>
  {foreach from=$close.methods item=m}{if $m.method == 'cash'}
    <div class="cash">Efectivo a sumar en la caja: {$m.total|string_format:'%.2f'|replace:'.':','} €</div>
  {/if}{/foreach}
  <h2>Detalle</h2>
  <table>
    {foreach from=$close.payments item=p}
      <tr><td>{$p.time|escape:'html':'UTF-8'} {$p.reference|escape:'html':'UTF-8'}<br><span class="muted">{$p.type|escape:'html':'UTF-8'} · {$p.method|escape:'html':'UTF-8'}{if $p.order} · {$p.order|escape:'html':'UTF-8'}{/if}</span></td>
        <td class="r">{$p.amount|string_format:'%.2f'|replace:'.':','} €</td></tr>
    {foreachelse}
      <tr><td class="muted">Sin cobros este día.</td></tr>
    {/foreach}
  </table>
  <div class="muted" style="margin-top:3mm;text-align:center">Impreso el {$printDate|escape:'html':'UTF-8'} · {$employee|escape:'html':'UTF-8'}</div>
</div>
<script>setTimeout(function () { window.print(); }, 300);</script>
</body>
</html>
