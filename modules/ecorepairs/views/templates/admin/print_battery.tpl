<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Batería {$b.serial|escape:'html':'UTF-8'}</title>
{*
 * Pegatina de batería fabricada (80 × 50 mm, Xprinter): logo, voltaje y Ah grandes, datos técnicos y QR de la garantía.
 *}
<style>
  @page { size: 76.2mm 50mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font: bold 11px/1.25 Arial, Helvetica, sans-serif; }
  .l, .l * { color: #000 !important; }
  .l { width: 70mm; height: 48mm; margin: 0 auto; padding: 2mm 0; display: grid; grid-template-columns: 1fr 22mm; grid-template-rows: auto 1fr auto; gap: 1mm 2.5mm; }
  .hd { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 1mm; }
  .hd img { max-height: 7mm; max-width: 42mm; }
  .hd .brand { font-size: 15px; font-weight: 900; letter-spacing: .02em; }
  .hd .sn { font-size: 12px; font-weight: 900; }
  .big { font-size: 27px; font-weight: 900; line-height: 1; }
  .big small { font-size: 15px; }
  .sp { display: grid; grid-template-columns: auto 1fr; gap: .2mm 2mm; margin-top: 1mm; font-size: 10.5px; }
  .sp span { font-weight: normal; }
  .qr { width: 22mm; height: 22mm; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .side { display: flex; flex-direction: column; align-items: center; gap: .8mm; font-size: 9.5px; text-align: center; }
  .ft { grid-column: 1 / -1; display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: .6mm; font-size: 10px; }
  .noprint { margin: 12px auto; text-align: center; }
  .noprint button { font: 600 15px Arial, sans-serif; padding: 10px 18px; border-radius: 10px; border: 1px solid #0B6E4B; background: #0B6E4B; color: #fff !important; cursor: pointer; }
  @media print { .noprint { display: none; } }
  @media screen { .l { box-shadow: 0 0 0 1px #ccc; } }
</style>
</head>
<body>
<div class="noprint"><button type="button" onclick="window.print()">Imprimir</button></div>
<div class="l">
  <div class="hd">
    {if $logo}<img src="{$logo|escape:'html':'UTF-8'}" alt="{$b.data.brand|escape:'html':'UTF-8'}">{else}<span class="brand">{$b.data.brand|default:'ECOPLANET WAY'|escape:'html':'UTF-8'}</span>{/if}
    <span class="sn">{$b.serial|escape:'html':'UTF-8'}</span>
  </div>
  <div>
    <div class="big">{$b.data.volts|escape:'html':'UTF-8'} V <small>· {$b.data.ah|escape:'html':'UTF-8'} Ah</small></div>
    <div class="sp">
      {if $b.data.wh}<b>Energía</b><span>{$b.data.wh|escape:'html':'UTF-8'} Wh</span>{/if}
      {if $b.data.config || $b.data.cell}<b>Celdas</b><span>{$b.data.config|escape:'html':'UTF-8'}{if $b.data.chem} · {$b.data.chem|escape:'html':'UTF-8'}{/if}{if $b.data.cell} {$b.data.cell|escape:'html':'UTF-8'}{/if}</span>{/if}
      {if $b.data.bms}<b>BMS</b><span>{$b.data.bms|escape:'html':'UTF-8'}</span>{/if}
      {if $b.data.conn_ctrl || $b.data.conn_charge}<b>Conectores</b><span>{$b.data.conn_ctrl|escape:'html':'UTF-8'}{if $b.data.conn_charge} · carga {$b.data.conn_charge|escape:'html':'UTF-8'}{/if}</span>{/if}
      {if $b.data.for_model}<b>Para</b><span>{$b.data.for_model|escape:'html':'UTF-8'}</span>{/if}
    </div>
  </div>
  <div class="side"><div class="qr" id="qr"></div>Garantía y datos</div>
  <div class="ft"><span>Fab. {$b.date_add|date_format:'%d/%m/%Y'}{if $b.made_by} · {$b.made_by|regex_replace:'/\s.*$/':''|escape:'html':'UTF-8'}{/if}</span><span>{if $b.warranty_until}Garantía {$b.warranty_until|date_format:'%d/%m/%Y'}{/if}</span></div>
</div>
<script src="{$qrJs|escape:'html':'UTF-8'}"></script>
<script>
  (function () {
    try {
      var q = qrcode(0, 'M');
      q.addData({$b.url|json_encode nofilter});
      q.make();
      document.getElementById('qr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) { }
    var imgs = Array.prototype.slice.call(document.images);
    Promise.all(imgs.map(function (i) { return i.complete ? 1 : new Promise(function (ok) { i.onload = i.onerror = ok; }); })).then(function () { setTimeout(function () { window.print(); }, 250); });
  })();
</script>
</body>
</html>
