<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>Pegatina {$tag|escape:'html':'UTF-8'}</title>
{if $label == '50x25'}{assign var=w value='50mm'}{assign var=h value='25mm'}{elseif $label == '62x100'}{assign var=w value='62mm'}{assign var=h value='100mm'}{else}{assign var=w value='62mm'}{assign var=h value='29mm'}{/if}
<style>
  {if $format == 'a4'}@page { size: A4; margin: 0; }{else}@page { size: {$w} {$h}; margin: 0; }{/if}
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
  .st { display: flex; gap: 2mm; align-items: center; overflow: hidden; padding: 1.5mm; }
  .st .qr { flex: none; }
  .st .qr svg { width: 100%; height: 100%; display: block; }
  .st .txt { min-width: 0; line-height: 1.15; }
  .st .txt div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .st .logo { max-width: 100%; max-height: 6mm; display: block; margin-bottom: .8mm; }
  .st .tag { font-weight: bold; letter-spacing: .06em; }
  .roll { width: {$w}; height: {$h}; font-size: 8px; {if $label == '62x100'}flex-direction: column; justify-content: center; text-align: center; font-size: 11px;{/if} }
  .roll .qr { width: {if $label == '62x100'}42mm{else}calc({$h} - 3mm){/if}; height: {if $label == '62x100'}42mm{else}calc({$h} - 3mm){/if}; }
  .roll .tag { font-size: {if $label == '50x25'}10px{else}12px{/if}; }
  .sheet { width: 210mm; height: 297mm; padding: 8.5mm 0; display: grid; grid-template-columns: repeat(3, 70mm); grid-auto-rows: 35mm; }
  .sheet .st { width: 70mm; height: 35mm; font-size: 9px; padding: 3mm; }
  .sheet .qr { width: 29mm; height: 29mm; }
  .sheet .tag { font-size: 13px; }
  .noprint { padding: 10px; font: 600 14px Arial, sans-serif; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; background: #F4F7F5; }
  .noprint button, .noprint a { font: inherit; padding: 8px 14px; border-radius: 8px; border: 1px solid #0B6E4B; background: #0B6E4B; color: #fff; cursor: pointer; text-decoration: none; }
  .noprint a.alt { background: #fff; color: #0B6E4B; }
  .noprint select { font: inherit; padding: 6px; border-radius: 8px; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
<div class="noprint">
  <button type="button" onclick="window.print()">Imprimir pegatina</button>
  {if $format == 'a4'}
    <a class="alt" href="{$selfUrl|escape:'html':'UTF-8'}">Rollo de etiquetas</a>
    <label>Posición en la hoja <select onchange="location.href='{$selfUrl|escape:'javascript':'UTF-8'}&format=a4&pos='+this.value">{for $i=1 to 24}<option value="{$i}"{if $i == $pos} selected{/if}>{$i}</option>{/for}</select></label>
    <span>Hoja A4 de 3 × 8 etiquetas (70 × 35 mm). Elige la casilla libre de la hoja.</span>
  {else}
    <a class="alt" href="{$selfUrl|escape:'html':'UTF-8'}&format=a4">Hoja A4</a>
    <span>Rollo {$w} × {$h}. Para el patín usa etiqueta de film plástico (resiste agua).</span>
  {/if}
</div>
{capture name=sticker}
  <div class="qr"></div>
  <div class="txt">
    {if $logo}<img class="logo" src="{$logo|escape:'html':'UTF-8'}" alt="">{else}<div><b>{$shopName|escape:'html':'UTF-8'}</b></div>{/if}
    <div><b>{$r.device_name|escape:'html':'UTF-8'}</b></div>
    <div class="tag">{$tag|escape:'html':'UTF-8'}</div>
    <div>Escanea: historial y garantía</div>
  </div>
{/capture}
{if $format == 'a4'}
  <div class="sheet">{for $i=1 to 24}{if $i == $pos}<div class="st">{$smarty.capture.sticker nofilter}</div>{else}<div></div>{/if}{/for}</div>
{else}
  <div class="st roll">{$smarty.capture.sticker nofilter}</div>
{/if}
<script src="{$qrJs|escape:'html':'UTF-8'}"></script>
<script>
  (function () {
    try {
      var q = qrcode(0, 'M');
      q.addData({$url|json_encode nofilter});
      q.make();
      var svg = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      document.querySelectorAll('.qr').forEach(function (el) { el.innerHTML = svg; });
    } catch (e) { }
  })();
</script>
</body>
</html>
