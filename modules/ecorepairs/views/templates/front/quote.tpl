{*
 * Presupuesto público (enlace que recibe el cliente). Página propia, sin el tema de la tienda.
 *}<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Presupuesto{if $reference} {$reference|escape:'html':'UTF-8'}{/if} · {$shop.name|escape:'html':'UTF-8'}</title>
<style>
  :root { --bg:#F4F5F7; --card:#FFFFFF; --fg:#14161A; --fg2:#5B6170; --line:#D5D8DE; --line2:#EEF0F2; --pri:#0B6E4B; --pri-h:#084F36; --ok-bg:#E3F1EB; --bad:#B42318; --bad-bg:#FBE1E1; --gar-fg:#0A4F7A; --gar-bg:#DCEEFB; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 -apple-system, "Segoe UI", Roboto, Inter, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 20px 16px 40px; }
  .top { text-align: center; margin-bottom: 16px; }
  .top img { max-height: 48px; max-width: 200px; }
  .top .shop { font-weight: 700; margin-top: 6px; }
  .card { background: var(--card); border: 1px solid var(--line2); border-radius: 14px; box-shadow: 0 1px 2px rgba(20,22,26,.08); padding: 18px; margin-bottom: 14px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -.01em; }
  .muted { color: var(--fg2); font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  td { padding: 10px 0; border-top: 1px solid var(--line2); vertical-align: top; }
  tr:first-child td { border-top: 0; }
  td.n { text-align: right; white-space: nowrap; padding-left: 12px; font-variant-numeric: tabular-nums; font-weight: 600; }
  .tag { display: inline-block; font-size: 11px; font-weight: 600; border-radius: 999px; padding: 2px 8px; background: var(--gar-bg); color: var(--gar-fg); margin-left: 4px; }
  .tot { display: flex; justify-content: space-between; padding: 4px 0; font-variant-numeric: tabular-nums; }
  .tot.big { font-size: 20px; font-weight: 700; border-top: 1px solid var(--line); margin-top: 6px; padding-top: 10px; }
  .msg { border-radius: 10px; padding: 14px; margin-bottom: 14px; font-weight: 500; }
  .msg.ok { background: var(--ok-bg); color: var(--pri); }
  .msg.bad { background: var(--bad-bg); color: #8A1C1C; }
  .msg.neu { background: var(--line2); color: var(--fg); }
  .cond { font-size: 13px; color: var(--fg2); }
  .cond p { margin: 0 0 6px; }
  .agree { display: flex; gap: 10px; align-items: flex-start; margin: 12px 0; font-size: 14px; cursor: pointer; }
  .agree input { width: 22px; height: 22px; margin: 0; flex: none; accent-color: var(--pri); }
  .btn { display: block; width: 100%; min-height: 48px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--fg); font: 600 16px/1 inherit; font-family: inherit; cursor: pointer; margin-top: 10px; }
  .btn.pri { background: var(--pri); border-color: var(--pri); color: #fff; }
  .btn.pri:hover { background: var(--pri-h); }
  .btn.ghost { border-color: transparent; background: transparent; color: var(--bad); }
  textarea { width: 100%; min-height: 80px; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font: inherit; margin-top: 6px; }
  details summary { cursor: pointer; color: var(--bad); font-weight: 600; text-align: center; padding: 12px 0 0; list-style: none; }
  details summary::-webkit-details-marker { display: none; }
  .foot { text-align: center; font-size: 13px; color: var(--fg2); margin-top: 20px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    {if $shop.logo}<img src="{$shop.logo|escape:'html':'UTF-8'}" alt="{$shop.name|escape:'html':'UTF-8'}">{/if}
    <div class="shop">{$shop.name|escape:'html':'UTF-8'}</div>
  </div>

  {if $state == 'notfound' || $state == 'limit' || !$q}
    <div class="card">
      <h1>Enlace no válido</h1>
      <p class="muted">{if $state == 'limit'}Demasiados intentos. Prueba más tarde.{else}Este enlace no existe o ya no está disponible.{/if}
      {if $shop.phone} Llámanos al {$shop.phone|escape:'html':'UTF-8'}.{/if}</p>
    </div>
  {else}
    {if $result == 'accepted'}<div class="msg ok">Gracias. Has aceptado el presupuesto y empezamos con la reparación.</div>
    {elseif $result == 'rejected'}<div class="msg neu">Has rechazado el presupuesto. Te avisaremos para que recojas el equipo.</div>
    {elseif $result == 'need_agree'}<div class="msg bad">Marca la casilla para aceptar el presupuesto.</div>
    {elseif $state == 'answered'}<div class="msg neu">Este presupuesto ya está {if $q.status == 'accepted'}aceptado{else}rechazado{/if}{if $q.date_answer} desde el {$q.date_answer|date_format:'%d/%m/%Y'}{/if}.</div>
    {elseif $state == 'superseded'}<div class="msg bad">Este presupuesto se ha sustituido por otro más reciente. Usa el último enlace que te hemos enviado.</div>
    {elseif $state == 'expired'}<div class="msg bad">Este presupuesto caducó el {$q.date_expire|date_format:'%d/%m/%Y'}. Contacta con nosotros para renovarlo.</div>
    {/if}

    <div class="card">
      <h1>Presupuesto {$reference|escape:'html':'UTF-8'}{if $q.number > 1} · adicional{/if}</h1>
      <div class="muted">{$device|escape:'html':'UTF-8'}{if $q.date_sent} · {$q.date_sent|date_format:'%d/%m/%Y'}{/if}</div>
      <table>
        {foreach from=$q.lines item=l}
          <tr>
            <td>{$l.name|escape:'html':'UTF-8'}{if $l.warranty}<span class="tag">Garantía</span>{/if}{if $l.discount > 0}<span class="tag" style="background:#E3F1EB;color:#0B6E4B">−{$l.discount|string_format:'%.2f'|replace:'.':','} €</span>{/if}
              <div class="muted">{$l.qty_text|escape:'html':'UTF-8'}{if $l.type == 'labour'} h{else} ud.{/if} × {$l.price|string_format:'%.2f'|replace:'.':','} €</div></td>
            <td class="n">{if $l.warranty}0,00 €{else}{$l.total|string_format:'%.2f'|replace:'.':','} €{/if}</td>
          </tr>
        {/foreach}
      </table>
    </div>

    <div class="card">
      <div class="tot"><span class="muted">Base imponible</span><span>{$q.totals.total_tax_excl|string_format:'%.2f'|replace:'.':','} €</span></div>
      <div class="tot"><span class="muted">IVA</span><span>{$q.totals.tax|string_format:'%.2f'|replace:'.':','} €</span></div>
      {if $q.totals.warranty_amount > 0}<div class="tot"><span class="muted">Cubierto por garantía</span><span>−{$q.totals.warranty_amount|string_format:'%.2f'|replace:'.':','} €</span></div>{/if}
      <div class="tot big"><span>Total</span><span>{$q.totals.total_tax_incl|string_format:'%.2f'|replace:'.':','} €</span></div>
      {if $q.date_expire && $state == 'open'}<div class="muted" style="margin-top:6px">Válido hasta el {$q.date_expire|date_format:'%d/%m/%Y'}</div>{/if}
    </div>

    {if $q.notes}<div class="card"><b>Observaciones</b><div class="muted" style="white-space:pre-wrap;margin-top:4px">{$q.notes|escape:'html':'UTF-8'}</div></div>{/if}

    {if $state == 'open'}
      <div class="card">
        <div class="cond">{foreach from=$conditions item=line}{if $line|trim}<p>{$line|escape:'html':'UTF-8'}</p>{/if}{/foreach}</div>
        <form method="post" action="{$action|escape:'html':'UTF-8'}">
          <input type="hidden" name="k" value="{$formKey|escape:'html':'UTF-8'}">
          <input type="hidden" name="answer" value="accept">
          <label class="agree"><input type="checkbox" name="agree" value="1" required> He leído el presupuesto y lo acepto por {$q.totals.total_tax_incl|string_format:'%.2f'|replace:'.':','} €.</label>
          <button type="submit" class="btn pri">Aceptar presupuesto</button>
        </form>
        <details>
          <summary>No quiero hacer la reparación</summary>
          <form method="post" action="{$action|escape:'html':'UTF-8'}">
            <input type="hidden" name="k" value="{$formKey|escape:'html':'UTF-8'}">
            <input type="hidden" name="answer" value="reject">
            <label class="muted">Motivo (opcional)<textarea name="note" maxlength="255"></textarea></label>
            <button type="submit" class="btn">Rechazar presupuesto</button>
          </form>
        </details>
      </div>
    {/if}
  {/if}

  <div class="foot">{$shop.name|escape:'html':'UTF-8'}{if $shop.phone} · {$shop.phone|escape:'html':'UTF-8'}{/if}</div>
</div>
</body>
</html>
