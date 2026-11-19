<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>Etiqueta {$r.reference|escape:'html':'UTF-8'}</title>
{if $label == '50x25'}{assign var=w value='50mm'}{assign var=h value='25mm'}{elseif $label == '62x100'}{assign var=w value='62mm'}{assign var=h value='100mm'}{else}{assign var=w value='62mm'}{assign var=h value='29mm'}{/if}
<style>
  @page { size: {$w} {$h}; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  .label { width: {$w}; height: {$h}; padding: 1.5mm; display: flex; gap: 2mm; align-items: center; overflow: hidden; font: 9px/1.2 Arial, Helvetica, sans-serif; {if $label == '62x100'}flex-direction: column; justify-content: center; text-align: center; font-size: 12px;{/if} }
  .qr { flex: none; width: {if $label == '62x100'}40mm{else}calc({$h} - 3mm){/if}; height: {if $label == '62x100'}40mm{else}calc({$h} - 3mm){/if}; }
  .qr svg { width: 100%; height: 100%; }
  .ref { font-size: {if $label == '50x25'}13px{elseif $label == '62x100'}24px{else}15px{/if}; font-weight: bold; letter-spacing: .02em; }
  .txt { min-width: 0; }
  .txt div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .noprint { padding: 10px; font: 600 14px Arial, sans-serif; }
  .noprint button { font: inherit; padding: 8px 14px; border-radius: 8px; border: 1px solid #0B6E4B; background: #0B6E4B; color: #fff; cursor: pointer; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
<div class="noprint"><button type="button" onclick="window.print()">Imprimir etiqueta</button> Tamaño {$w} × {$h}</div>
<div class="label">
  <div class="qr" id="qr"></div>
  <div class="txt">
    <div class="ref">{$r.reference|escape:'html':'UTF-8'}</div>
    <div><b>{$r.device_name|escape:'html':'UTF-8'}</b></div>
    <div>{$r.firstname|escape:'html':'UTF-8'} {$r.lastname|truncate:2:'.':true|escape:'html':'UTF-8'}</div>
    <div>{$r.date_add|date_format:'%d/%m/%Y'}{if $r.urgent} · URGENTE{/if}</div>
  </div>
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
    setTimeout(function () { window.print(); }, 250);
  })();
</script>
</body>
</html>
