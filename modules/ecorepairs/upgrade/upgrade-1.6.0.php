<?php
/**
 * 1.5.x → 1.6.0: app del taller en el móvil (PIN), ficha del modelo (códigos de error, parámetros, soluciones),
 * reparaciones repetidas, fotos públicas en el seguimiento y reseñas.
 * Las tablas y columnas las crea EcoRepairInstaller::ensureSchema() al abrir el taller.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_6_0($module)
{
    require_once _PS_MODULE_DIR_ . 'ecorepairs/ecorepairs.php';
    Configuration::updateValue('ECOREPAIRS_SCHEMA', '');

    return EcoRepairInstaller::ensureSchema();
}
