<?php
/**
 * 1.8.x → 1.8.4: unión con repuestos compatibles, baterías a medida y proveedores.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_8_4($module)
{
    require_once _PS_MODULE_DIR_ . 'ecorepairs/ecorepairs.php';
    Configuration::updateValue('ECOREPAIRS_SCHEMA', '');

    return EcoRepairInstaller::ensureSchema();
}
