<?php
/**
 * 1.1.0 → 1.2.0: foto de los modelos y catálogo ampliado de marcas y modelos.
 * Solo añade: no cambia ni reactiva nada de lo que ya tengas.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_2_0($module)
{
    require_once _PS_MODULE_DIR_ . 'ecorepairs/classes/EcoRepairInstaller.php';
    require_once _PS_MODULE_DIR_ . 'ecorepairs/classes/EcoRepairCatalogSeed.php';

    return EcoRepairInstaller::addModelImageColumn()
        && is_array(EcoRepairCatalogSeed::importMissing())
        && EcoRepairInstaller::installConfig();
}
