<?php
/**
 * Reparaciones del taller - Ecoplanet Way
 *
 * Compatible con PrestaShop 1.7.6 y PHP 7.2 / 7.3.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once __DIR__ . '/classes/EcoRepairInstaller.php';
require_once __DIR__ . '/classes/EcoRepairStatus.php';
require_once __DIR__ . '/classes/EcoRepair.php';
require_once __DIR__ . '/classes/EcoRepairCatalog.php';
require_once __DIR__ . '/classes/EcoRepairCustomer.php';
require_once __DIR__ . '/classes/EcoRepairPhoto.php';
require_once __DIR__ . '/classes/EcoRepairLog.php';
require_once __DIR__ . '/classes/EcoRepairQuote.php';
require_once __DIR__ . '/classes/EcoRepairKit.php';
require_once __DIR__ . '/classes/EcoRepairCatalogSeed.php';
require_once __DIR__ . '/classes/EcoRepairStats.php';

class EcoRepairs extends Module
{
    public function __construct()
    {
        $this->name = 'ecorepairs';
        $this->tab = 'administration';
        $this->version = '1.3.1';
        $this->author = 'Ecoplanet Way';
        $this->need_instance = 0;
        $this->bootstrap = true;
        $this->ps_versions_compliancy = array('min' => '1.7.6.0', 'max' => _PS_VERSION_);

        parent::__construct();

        $this->displayName = $this->l('Reparaciones del taller');
        $this->description = $this->l('Recepción, estados, técnicos, fotos, firma, resguardos y presupuestos de las reparaciones.');
        $this->confirmUninstall = $this->l('Se quitará el menú del taller. Las reparaciones y las fotos se conservan. ¿Continuar?');
    }

    public function install()
    {
        return parent::install()
            && EcoRepairInstaller::installDb()
            && EcoRepairInstaller::seedCatalog()
            && EcoRepairInstaller::addModelImageColumn()
            && is_array(EcoRepairCatalogSeed::importMissing())
            && EcoRepairInstaller::installConfig()
            && EcoRepairInstaller::installTabs($this->name)
            && EcoRepairInstaller::ensureSchema()
            && EcoRepairPhoto::ensureStorage();
    }

    /**
     * Al desinstalar NO se borran tablas ni fotos: son datos del negocio.
     * Si se vuelve a instalar, se reutilizan.
     */
    public function uninstall()
    {
        return EcoRepairInstaller::uninstallTabs()
            && parent::uninstall();
    }

    public function getContent()
    {
        Tools::redirectAdmin($this->context->link->getAdminLink('AdminEcoRepairsSettings'));
    }
}
