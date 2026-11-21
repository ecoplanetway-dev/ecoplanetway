{*
 * App del taller en el móvil (/taller). Página propia: no carga el tema de la tienda.
 *}<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0B6E4B">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>Taller · {$shopName|escape:'html':'UTF-8'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
{foreach from=$css item=href}<link rel="stylesheet" href="{$href|escape:'html':'UTF-8'}">{/foreach}
</head>
<body class="er-appbody">
<div class="ecor er-app" id="ecor-app" data-view="app" data-logo="{$logo|escape:'html':'UTF-8'}">
  <div class="er-empty">Cargando…</div>
  <noscript><div class="er-banner er-bad">Esta página necesita JavaScript.</div></noscript>
</div>
<script type="application/json" id="ecor-boot">{$boot nofilter}</script>
<script type="application/json" id="ecor-data">{$data nofilter}</script>
{foreach from=$js item=src}<script src="{$src|escape:'html':'UTF-8'}"></script>{/foreach}
</body>
</html>
