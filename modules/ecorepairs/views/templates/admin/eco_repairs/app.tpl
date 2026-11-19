{*
 * Reparaciones del taller: contenedor de la pantalla. El contenido lo pinta el JS del módulo.
 *}
<div class="ecor" id="ecor-app" data-view="{$ecor_view|escape:'html':'UTF-8'}">
  <div class="er-empty">Cargando…</div>
  <noscript><div class="er-banner er-bad">Esta pantalla necesita JavaScript activado.</div></noscript>
</div>
<script type="application/json" id="ecor-boot">{$ecor_boot nofilter}</script>
<script type="application/json" id="ecor-data">{$ecor_data nofilter}</script>
