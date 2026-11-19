<?php
/**
 * 1.3.x → 1.4.0: cobro (pagos, pedido + factura + stock), foto del equipo y bloqueo de las entregadas.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_4_0($module)
{
    require_once _PS_MODULE_DIR_ . 'ecorepairs/classes/EcoRepairInstaller.php';

    return EcoRepairInstaller::installQuoteDb()
        && EcoRepairInstaller::installConfig();
}
