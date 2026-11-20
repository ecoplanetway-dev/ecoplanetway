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
require_once __DIR__ . '/classes/EcoRepairPayment.php';
require_once __DIR__ . '/classes/EcoRepairMessage.php';
require_once __DIR__ . '/classes/EcoRepairRequest.php';
require_once __DIR__ . '/classes/EcoRepairRateLimit.php';
require_once __DIR__ . '/classes/EcoRepairKnowledge.php';
require_once __DIR__ . '/classes/EcoRepairKnowledgeData.php';
require_once __DIR__ . '/classes/EcoRepairParts.php';
require_once __DIR__ . '/classes/EcoRepairIncompat.php';
require_once __DIR__ . '/classes/EcoRepairUnlock.php';
require_once __DIR__ . '/classes/EcoRepairFixed.php';
require_once __DIR__ . '/classes/EcoRepairLinks.php';
require_once __DIR__ . '/classes/EcoRepairStaff.php';

/**
 * También es un módulo de pago (Taller · Efectivo / Tarjeta / Transferencia) para crear los pedidos del taller.
 * No se engancha a la tienda online: no aparece como forma de pago a los clientes.
 */
class EcoRepairs extends PaymentModule
{
    public function __construct()
    {
        $this->name = 'ecorepairs';
        $this->tab = 'administration';
        $this->version = '1.8.9';
        $this->currencies = true;
        $this->currencies_mode = 'checkbox';
        $this->author = 'Ecoplanet Way';
        $this->need_instance = 0;
        $this->bootstrap = true;
        $this->ps_versions_compliancy = array('min' => '1.7.6.0', 'max' => _PS_VERSION_);

        parent::__construct();

        $this->displayName = $this->l('Reparaciones del taller');
        $this->description = $this->l('Recepción, presupuestos y cobro de las reparaciones del taller.');
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
            && $this->registerHook('moduleRoutes')
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

    /**
     * Dirección pública /seguimiento (el QR del resguardo y de la etiqueta apunta aquí).
     */
    public function hookModuleRoutes()
    {
        return array(
            'module-ecorepairs-tracking' => array(
                'controller' => 'tracking',
                'rule' => 'seguimiento',
                'keywords' => array(),
                'params' => array('fc' => 'module', 'module' => 'ecorepairs', 'controller' => 'tracking'),
            ),
            'module-ecorepairs-app' => array(
                'controller' => 'app',
                'rule' => 'taller',
                'keywords' => array(),
                'params' => array('fc' => 'module', 'module' => 'ecorepairs', 'controller' => 'app'),
            ),
        );
    }

    /**
     * Logo del taller (negro y azul, para fondos claros): views/img/logo-taller.png.
     * Si no existe, el logo de la tienda.
     */
    public static function logoUrl()
    {
        $file = _PS_MODULE_DIR_ . 'ecorepairs/views/img/logo-taller.png';
        if (is_file($file)) {
            return Tools::getShopDomainSsl(true) . _MODULE_DIR_ . 'ecorepairs/views/img/logo-taller.png?v=' . filemtime($file);
        }
        $logo = Configuration::get('PS_LOGO');

        return $logo ? Context::getContext()->link->getMediaLink(_PS_IMG_ . $logo) : '';
    }

    /**
     * Datos del taller para el cliente (seguimiento, resguardo, presupuesto, mensajes).
     * Son los de Ajustes → Datos del taller; si están vacíos, los de la tienda.
     */
    public static function workshop()
    {
        $g = function ($k) { return trim((string) Configuration::get($k)); };
        $address = $g('ECOREPAIRS_WS_ADDRESS') ?: trim($g('PS_SHOP_ADDR1') . ' ' . $g('PS_SHOP_ADDR2'));
        $city = $g('ECOREPAIRS_WS_CITY') ?: trim($g('PS_SHOP_CODE') . ' ' . $g('PS_SHOP_CITY'));
        $phone = $g('ECOREPAIRS_WS_PHONE') ?: $g('PS_SHOP_PHONE');
        $wa = preg_replace('/\D+/', '', $g('ECOREPAIRS_WS_WHATSAPP') ?: $phone);
        if (strlen($wa) === 9) {
            $wa = '34' . $wa;
        }
        $full = trim($address . ($city !== '' ? ', ' . $city : ''), ', ');
        $maps = $g('ECOREPAIRS_WS_MAPS') ?: ($full !== '' ? 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode($full) : '');
        preg_match('/(\d{5})\s*(.*)$/', $city, $pc);

        return array(
            'name' => $g('ECOREPAIRS_WS_NAME') ?: $g('PS_SHOP_NAME'),
            'address' => $address,
            'city' => $city,
            'postcode' => isset($pc[1]) ? $pc[1] : $g('PS_SHOP_CODE'),
            'town' => isset($pc[2]) && $pc[2] !== '' ? $pc[2] : $g('PS_SHOP_CITY'),
            'full' => $full,
            'phone' => $phone,
            'tel' => preg_replace('/[^\d+]/', '', $phone),
            'whatsapp' => $g('ECOREPAIRS_WS_WHATSAPP'),
            'wa' => $wa,
            'hours' => $g('ECOREPAIRS_WS_HOURS'),
            'maps' => $maps,
            'email' => $g('PS_SHOP_EMAIL'),
        );
    }

    public function getContent()
    {
        Tools::redirectAdmin($this->context->link->getAdminLink('AdminEcoRepairsSettings'));
    }
}
