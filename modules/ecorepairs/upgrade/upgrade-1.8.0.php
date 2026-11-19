<?php
/**
 * 1.7.x → 1.8.0: zonas sobre la foto del modelo, deslimitación, precio cerrado, revisión de salida y pegatina QR.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_8_0($module)
{
    require_once _PS_MODULE_DIR_ . 'ecorepairs/ecorepairs.php';
    Configuration::updateValue('ECOREPAIRS_SCHEMA', '');

    return EcoRepairInstaller::ensureSchema();
}
