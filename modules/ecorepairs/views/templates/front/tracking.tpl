{*
 * Seguimiento público de una reparación (/seguimiento). Página propia, sin el tema de la tienda.
 *}<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Seguimiento{if $state == 'ok'} {$r.reference|escape:'html':'UTF-8'}{/if} · {$shop.name|escape:'html':'UTF-8'}</title>
<style>
  :root { --bg:#F4F5F7; --card:#FFFFFF; --fg:#14161A; --fg2:#5B6170; --line:#D5D8DE; --line2:#EEF0F2; --pri:#0B6E4B; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 -apple-system, "Segoe UI", Roboto, Inter, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 20px 16px 40px; }
  .top { text-align: center; margin-bottom: 16px; }
  .top img { max-height: 48px; max-width: 200px; }
  .top .shop { font-weight: 700; margin-top: 6px; }
  .card { background: var(--card); border: 1px solid var(--line2); border-radius: 16px; box-shadow: 0 1px 2px rgba(20,22,26,.08); padding: 20px; margin-bottom: 14px; animation: in .4s cubic-bezier(.2,.8,.2,1) both; }
  .card:nth-child(3) { animation-delay: .06s; } .card:nth-child(4) { animation-delay: .12s; }
  @keyframes in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -.01em; }
  .muted { color: var(--fg2); font-size: 14px; }
  .chip { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 16px; padding: 8px 14px; border-radius: 999px; background: var(--line2); margin: 12px 0 8px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .steps { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin: 14px 0 6px; }
  .steps div { height: 8px; border-radius: 999px; background: var(--line2); }
  .steps .done { background: linear-gradient(135deg, #17A673, #0B6E4B); }
  .steps .cur { background: linear-gradient(135deg, #17A673, #0B6E4B); animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .45; } }
  .labels { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; font-size: 10px; color: var(--fg2); text-align: center; }
  .kv { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid var(--line2); }
  .kv:first-child { border-top: 0; }
  .kv b { text-align: right; }
  .tag { display: inline-block; font-size: 12px; font-weight: 700; border-radius: 999px; padding: 3px 10px; background: #FCF0CC; color: #6B4A00; }
  .btn { display: block; width: 100%; min-height: 50px; border-radius: 12px; border: 0; background: linear-gradient(135deg, #17A673, #0B6E4B); color: #fff; font: 700 16px/50px inherit; font-family: inherit; text-align: center; text-decoration: none; cursor: pointer; box-shadow: 0 8px 18px -8px rgba(11,110,75,.6); }
  input { width: 100%; min-height: 52px; border: 1px solid var(--line); border-radius: 12px; padding: 0 14px; font: 600 20px/1 inherit; font-family: inherit; text-transform: uppercase; letter-spacing: .12em; text-align: center; margin: 10px 0; }
  .msg { border-radius: 12px; padding: 14px; background: #FBE1E1; color: #8A1C1C; margin-bottom: 14px; }
  .foot { text-align: center; font-size: 13px; color: var(--fg2); margin-top: 20px; }
  .foot a { color: var(--pri); }
  @media (prefers-reduced-motion: reduce) { .card, .steps .cur { animation: none; } }
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    {if $shop.logo}<a href="{$shop.url|escape:'html':'UTF-8'}"><img src="{$shop.logo|escape:'html':'UTF-8'}" alt="{$shop.name|escape:'html':'UTF-8'}"></a>{/if}
    <div class="shop">{$shop.name|escape:'html':'UTF-8'}</div>
  </div>

  {if $state == 'ok'}
    <div class="card">
      <div class="muted">Reparación {$r.reference|escape:'html':'UTF-8'}</div>
      <h1>{$r.device|escape:'html':'UTF-8'}</h1>
      <div class="chip"><span class="dot" style="background:{$r.status_color|escape:'html':'UTF-8'}"></span>{$r.status_name|escape:'html':'UTF-8'}</div>
      {if $r.waiting_part}<div><span class="tag">Esperando una pieza</span></div>{/if}
      <p style="margin:8px 0 0">{$r.message|escape:'html':'UTF-8'}</p>
      {if $r.status != 'cancelled'}
        <div class="steps">{foreach from=$steps item=s}<div class="{if $s.done}done{elseif $s.current}cur{/if}"></div>{/foreach}</div>
        <div class="labels">{foreach from=$steps item=s}<span>{$s.name|escape:'html':'UTF-8'}</span>{/foreach}</div>
      {/if}
    </div>
    {if $photos}
      <div class="card"><b>Fotos del trabajo</b>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:10px">
          {foreach from=$photos item=ph}<a href="{$ph.full|escape:'html':'UTF-8'}" target="_blank" rel="noopener"><img src="{$ph.thumb|escape:'html':'UTF-8'}" alt="" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;display:block"></a>{/foreach}
        </div>
      </div>
    {/if}
    {if $quoteLink}
      <div class="card"><b>Tienes un presupuesto pendiente</b><p class="muted" style="margin:4px 0 12px">Revísalo y acéptalo para que empecemos la reparación.</p>
        <a class="btn" href="{$quoteLink|escape:'html':'UTF-8'}">Ver el presupuesto</a></div>
    {/if}
    <div class="card">
      <div class="kv"><span class="muted">Entrada</span><b>{$r.date_add|date_format:'%d/%m/%Y'}</b></div>
      {if $r.eta}<div class="kv"><span class="muted">Fecha prevista</span><b>{$r.eta|date_format:'%d/%m/%Y'}</b></div>{/if}
      <div class="kv"><span class="muted">Último cambio</span><b>{$r.date_status|date_format:'%d/%m/%Y %H:%M'}</b></div>
      {if $r.total > 0}<div class="kv"><span class="muted">Total</span><b>{$r.total|string_format:'%.2f'|replace:'.':','} €</b></div>{/if}
      {if $r.pending > 0 && $r.pending < $r.total}<div class="kv"><span class="muted">Pendiente de pago</span><b>{$r.pending|string_format:'%.2f'|replace:'.':','} €</b></div>{/if}
      {if $r.warranty}<div class="kv"><span class="muted">Garantía</span><b>Sí</b></div>{/if}
    </div>
  {else}
    <div class="card">
      <h1>Seguimiento de tu reparación</h1>
      {if $state == 'notfound'}<div class="msg">No encontramos ninguna reparación con ese código. Revisa el resguardo.</div>{/if}
      {if $state == 'expired'}<div class="msg">Esta reparación se cerró hace tiempo y ya no se puede consultar.</div>{/if}
      {if $state == 'limit'}<div class="msg">Demasiados intentos. Prueba dentro de unos minutos.</div>{/if}
      <p class="muted">Escribe el código que aparece en tu resguardo (por ejemplo ABCD-1234) o escanea el QR.</p>
      <form method="get" action="{$action|escape:'html':'UTF-8'}">
        <input name="c" value="{$code|escape:'html':'UTF-8'}" maxlength="9" autocomplete="off" placeholder="ABCD-1234" aria-label="Código de seguimiento">
        <button type="submit" class="btn">Ver mi reparación</button>
      </form>
    </div>
  {/if}

  <div class="foot">{$shop.name|escape:'html':'UTF-8'}{if $shop.address} · {$shop.address|escape:'html':'UTF-8'}{/if}{if $shop.phone} · <a href="tel:{$shop.phone|escape:'html':'UTF-8'}">{$shop.phone|escape:'html':'UTF-8'}</a>{/if}</div>
</div>
</body>
</html>
