<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Presupuesto {$r.reference|escape:'html':'UTF-8'} v{$q.version|intval}</title>
<style>
  @page { size: {if $format == 'a4'}A4{else}80mm auto{/if}; margin: {if $format == 'a4'}14mm{else}0{/if}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font: 12px/1.35 Arial, Helvetica, sans-serif; }
  .doc { {if $format == 'a4'}max-width: 180mm; margin: 0 auto; font-size: 13px;{else}width: 72mm; margin: 0 auto; padding: 3mm 0;{/if} }
  .center { text-align: center; }
  .logo { max-width: {if $format == 'a4'}50mm{else}46mm{/if}; max-height: 22mm; display: block; margin: 0 auto 2mm; }
  h1 { font-size: {if $format == 'a4'}22px{else}17px{/if}; margin: 2mm 0 1mm; letter-spacing: .02em; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; margin: 3mm 0 1mm; border-bottom: 1px solid #000; padding-bottom: .8mm; }
  .muted { color: #333; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: .8mm 0; vertical-align: top; text-align: left; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #000; }
  .r { text-align: right; white-space: nowrap; padding-left: 2mm; }
  tr.l td { border-bottom: 1px dotted #999; }
  .tot td { padding: .5mm 0; }
  .tot .big td { font-size: {if $format == 'a4'}16px{else}14px{/if}; font-weight: bold; border-top: 1px solid #000; padding-top: 1.2mm; }
  .box { border: 1px solid #000; padding: 2mm; margin-top: 1mm; white-space: pre-wrap; }
  .qr { width: 28mm; height: 28mm; margin: 2mm auto 1mm; }
  .qr svg { width: 100%; height: 100%; }
  .sig { max-width: 60mm; max-height: 24mm; display: block; margin-top: 1mm; }
  .cond { font-size: {if $format == 'a4'}11px{else}10px{/if}; color: #222; }
  .cond p { margin: 0 0 1mm; }
  .stamp { border: 2px solid #000; display: inline-block; padding: 1mm 3mm; font-weight: bold; letter-spacing: .08em; margin-top: 1mm; }
  .cut { border-top: 1px dashed #000; margin-top: 4mm; padding-top: 1mm; font-size: 9px; text-align: center; }
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
    {if $shop.phone}Tel. {$shop.phone|escape:'html':'UTF-8'}{/if}{if $shop.whatsapp}<br>WhatsApp {$shop.whatsapp|escape:'html':'UTF-8'}{/if}
    <h1>PRESUPUESTO {$r.reference|escape:'html':'UTF-8'}{if $q.number > 1}-{$q.number|intval}{/if}</h1>
    <div class="muted">{if $q.number > 1}Adicional · {/if}Versión {$q.version|intval} · {if $q.date_sent}{$q.date_sent|date_format:'%d/%m/%Y'}{else}{$q.date_add|date_format:'%d/%m/%Y'}{/if}</div>
    {if $q.status == 'draft'}<div class="stamp">BORRADOR</div>{elseif $q.status == 'accepted'}<div class="stamp">ACEPTADO</div>{elseif $q.status == 'rejected'}<div class="stamp">RECHAZADO</div>{elseif $q.status == 'superseded'}<div class="stamp">SUSTITUIDO</div>{/if}
  </div>

  <h2>Cliente y equipo</h2>
  <table>
    <tr><td style="width:34%" class="muted">Cliente</td><td>{$r.customer_name|escape:'html':'UTF-8'}{if $customer && $customer.invoice} · {$customer.invoice.nif|escape:'html':'UTF-8'}{/if}</td></tr>
    <tr><td class="muted">Equipo</td><td><b>{$r.device_name|escape:'html':'UTF-8'}</b>{if $r.serial} · Nº serie {$r.serial|escape:'html':'UTF-8'}{/if}</td></tr>
  </table>
  {if $r.diagnosis}<h2>Diagnóstico</h2><div class="box">{$r.diagnosis|escape:'html':'UTF-8'}</div>{/if}

  <h2>Detalle</h2>
  <table>
    <tr><th>Concepto</th>{if $format == 'a4'}<th class="r">Cant.</th><th class="r">Precio</th>{/if}<th class="r">Importe</th></tr>
    {foreach from=$q.lines item=l}
      <tr class="l">
        <td>{$l.name|escape:'html':'UTF-8'}{if $l.reference && $format == 'a4'} <span class="muted">({$l.reference|escape:'html':'UTF-8'})</span>{/if}{if $l.warranty} · <b>GARANTÍA</b>{/if}{if $l.discount > 0}<br><span class="muted">Descuento −{$l.discount|string_format:'%.2f'|replace:'.':','} €</span>{/if}
          {if $format != 'a4'}<br><span class="muted">{$l.qty_text|escape:'html':'UTF-8'}{if $l.type == 'labour'} h{/if} × {$l.price|string_format:'%.2f'|replace:'.':','} €</span>{/if}</td>
        {if $format == 'a4'}<td class="r">{$l.qty_text|escape:'html':'UTF-8'}{if $l.type == 'labour'} h{/if}</td><td class="r">{$l.price|string_format:'%.2f'|replace:'.':','} €</td>{/if}
        <td class="r">{if $l.warranty}0,00{else}{$l.total|string_format:'%.2f'|replace:'.':','}{/if} €</td>
      </tr>
    {/foreach}
  </table>
  <table class="tot" style="margin-top:2mm">
    <tr><td class="muted">Base imponible</td><td class="r">{$q.totals.total_tax_excl|string_format:'%.2f'|replace:'.':','} €</td></tr>
    <tr><td class="muted">IVA</td><td class="r">{$q.totals.tax|string_format:'%.2f'|replace:'.':','} €</td></tr>
    {if $q.totals.warranty_amount > 0}<tr><td class="muted">Cubierto por garantía</td><td class="r">{$q.totals.warranty_amount|string_format:'%.2f'|replace:'.':','} €</td></tr>{/if}
    <tr class="big"><td>TOTAL (IVA incl.)</td><td class="r">{$q.totals.total_tax_incl|string_format:'%.2f'|replace:'.':','} €</td></tr>
  </table>
  {if $q.date_expire}<div class="muted" style="margin-top:1mm">Válido hasta el {$q.date_expire|date_format:'%d/%m/%Y'}</div>{/if}

  {if $q.notes}<h2>Observaciones</h2><div class="box">{$q.notes|escape:'html':'UTF-8'}</div>{/if}

  <h2>Condiciones</h2>
  <div class="cond">{foreach from=$conditions item=line}{if $line|trim}<p>{$line|escape:'html':'UTF-8'}</p>{/if}{/foreach}</div>

  {if $q.status == 'accepted'}
    <h2>Aceptación</h2>
    <div>{if $q.channel == 'store'}Aprobado en tienda{if $q.accepted_by} · atendió {$q.accepted_by|escape:'html':'UTF-8'}{/if}{else}Aceptado desde el enlace{if $q.ip} · IP {$q.ip|escape:'html':'UTF-8'}{/if}{/if} · {$q.date_answer|date_format:'%d/%m/%Y %H:%M'}</div>
    {if $signature}<img class="sig" src="{$signature|escape:'html':'UTF-8'}" alt="Firma">{/if}
  {elseif $q.status == 'sent' && $q.link}
    <h2>Aceptar online</h2>
    <div class="center"><div class="qr" id="qr"></div><div class="muted">Escanea el código para aceptar o rechazar</div></div>
  {elseif $q.status == 'draft'}
    <h2>Firma del cliente</h2>
    <div style="height:18mm"></div>
  {/if}

  <div class="cut">Impreso el {$printDate|escape:'html':'UTF-8'}</div>
</div>
<script src="{$qrJs|escape:'html':'UTF-8'}"></script>
<script>
  (function () {
    var el = document.getElementById('qr');
    if (el) {
      try {
        var q = qrcode(0, 'M');
        q.addData({$q.link|json_encode nofilter});
        q.make();
        el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      } catch (e) { }
    }
    var imgs = Array.prototype.slice.call(document.images);
    Promise.all(imgs.map(function (i) {
      return i.complete ? 1 : new Promise(function (ok) { i.onload = i.onerror = ok; });
    })).then(function () { setTimeout(function () { window.print(); }, 250); });
  })();
</script>
</body>
</html>
