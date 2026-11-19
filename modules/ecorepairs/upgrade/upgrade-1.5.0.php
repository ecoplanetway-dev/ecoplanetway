<?php
/**
 * 1.4.x → 1.5.0: avisos (WhatsApp, emails, recordatorios), página /seguimiento, encargos,
 * ficha del cliente y garantía de la reparación.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_5_0($module)
{
    require_once _PS_MODULE_DIR_ . 'ecorepairs/classes/EcoRepairInstaller.php';

    return EcoRepairInstaller::installQuoteDb()
        && EcoRepairInstaller::addColumn('ecorepair', 'id_parent_repair', 'INT UNSIGNED NOT NULL DEFAULT 0')
        && EcoRepairInstaller::addColumn('ecorepair', 'date_reminder', 'DATETIME NULL DEFAULT NULL')
        && EcoRepairInstaller::installConfig()
        && $module->registerHook('moduleRoutes');
}
