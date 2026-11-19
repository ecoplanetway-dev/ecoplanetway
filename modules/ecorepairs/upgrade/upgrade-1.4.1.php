<?php
/**
 * 1.4.0 → 1.4.1: descuento en euros por línea del presupuesto.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_4_1($module)
{
    require_once _PS_MODULE_DIR_ . 'ecorepairs/classes/EcoRepairInstaller.php';

    return EcoRepairInstaller::addColumn('ecorepair_quote_line', 'discount', 'DECIMAL(20,6) NOT NULL DEFAULT 0');
}
