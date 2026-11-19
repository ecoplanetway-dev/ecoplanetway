<?php
/**
 * 1.0.0 → 1.1.0: presupuestos y kits.
 * Crea las tablas nuevas y los ajustes que falten. No toca los datos existentes.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_1_0($module)
{
    require_once _PS_MODULE_DIR_ . 'ecorepairs/classes/EcoRepairInstaller.php';

    return EcoRepairInstaller::installQuoteDb()
        && EcoRepairInstaller::installConfig();
}
