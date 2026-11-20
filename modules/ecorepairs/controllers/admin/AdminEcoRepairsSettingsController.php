<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . 'ecorepairs/ecorepairs.php';

/**
 * Ajustes del taller: catálogo, campos del cliente, recepción, tablero e impresión.
 * Para limitarlo al responsable: Equipo > Permisos, pestaña «Ajustes del taller».
 */
class AdminEcoRepairsSettingsController extends ModuleAdminController
{
    /** @var EcoRepairs */
    public $module;

    public function __construct()
    {
        $this->bootstrap = true;
        $this->display = 'view';
        parent::__construct();
        $this->meta_title = 'Ajustes del taller';
    }

    public function init()
    {
        parent::init();
        EcoRepairInstaller::ensureSchema();
    }

    public function setMedia($isNewTheme = false)
    {
        parent::setMedia($isNewTheme);
        $base = $this->module->getPathUri();
        $v = '?v=' . $this->module->version;
        $this->addCSS('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', 'all', null, false);
        $this->addCSS($base . 'views/css/admin.css' . $v, 'all', null, false);
        $this->addJS($base . 'views/js/common.js' . $v, false);
        $this->addJS($base . 'views/js/vendor/qrcode.js' . $v, false);
        $this->addJS($base . 'views/js/settings.js' . $v, false);
    }

    public function initToolbarTitle()
    {
        $this->toolbar_title = array('Taller', 'Ajustes del taller');
    }

    public function initContent()
    {
        parent::initContent();
        if ($this->ajax) {
            return;
        }
        $data = array(
            'catalog' => EcoRepairCatalog::tree(false),
            'icons' => EcoRepairCatalog::icons(),
            'config' => $this->currentConfig(),
            'carriers' => $this->carriers(),
            'templates' => EcoRepairMessage::templates(),
            'staff' => EcoRepairStaff::all(),
            'employees' => array_map(function ($e) {
                return array('id' => (int) $e['id_employee'], 'name' => trim($e['firstname'] . ' ' . $e['lastname']));
            }, Employee::getEmployees(false)),
            // Para Permisos: solo los que entran en PrestaShop (activos)
            'activeEmployees' => array_map(function ($e) {
                return array('id' => (int) $e['id_employee'], 'name' => trim($e['firstname'] . ' ' . $e['lastname']));
            }, Employee::getEmployees(true)),
            'appUrl' => Configuration::get('PS_REWRITING_SETTINGS') ? $this->context->link->getBaseLink() . 'taller' : $this->context->link->getModuleLink('ecorepairs', 'app', array(), true),
            'variables' => EcoRepairMessage::variables(),
            'statuses' => EcoRepairStatus::all(),
            'canEdit' => (bool) $this->access('edit'),
            'isAdmin' => (int) $this->context->employee->id_profile === (int) _PS_ADMIN_PROFILE_,
        );
        $this->context->smarty->assign(array(
            'ecor_view' => 'settings',
            'ecor_boot' => $this->json(array(
                'icons' => $this->iconsSvg(),
                'avatars' => EcoRepairPhoto::avatars(),
                'links' => array(
                    'board' => $this->context->link->getAdminLink('AdminEcoRepairs'),
                    'ajax' => $this->context->link->getAdminLink('AdminEcoRepairsSettings') . '&ajax=1',
                    'modelImage' => $this->context->link->getAdminLink('AdminEcoRepairs') . '&ajax=1&action=modelImage',
                    'model' => $this->context->link->getAdminLink('AdminEcoRepairs') . '&view=model',
                ),
            )),
            'ecor_data' => $this->json($data),
        ));
        $this->setTemplate('app.tpl');
    }

    protected function carriers()
    {
        $out = array();
        foreach (Carrier::getCarriers((int) $this->context->language->id, true, false, false, null, Carrier::ALL_CARRIERS) as $c) {
            $out[] = array('id' => (int) $c['id_carrier'], 'name' => $c['name'], 'free' => (int) $c['is_free']);
        }

        return $out;
    }

    protected function currentConfig()
    {
        $out = array();
        foreach (array_keys(EcoRepairInstaller::defaultConfig()) as $key) {
            $out[$key] = (string) Configuration::get($key);
        }

        return $out;
    }

    public function postProcess()
    {
        if (!$this->ajax) {
            return parent::postProcess();
        }
        if (Tools::getValue('token') !== $this->token) {
            $this->jsonOut(array('ok' => false, 'error' => 'La sesión ha caducado. Recarga la página.'), 403);
        }
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonOut(array('ok' => false, 'error' => 'Método no permitido.'), 405);
        }
        if (!$this->access('edit')) {
            $this->jsonOut(array('ok' => false, 'error' => 'Tu perfil no puede cambiar los ajustes.'), 403);
        }
        $action = (string) Tools::getValue('action');
        $type = (string) Tools::getValue('type');
        $id = (int) Tools::getValue('id');

        switch ($action) {
            case 'add':
                $res = EcoRepairCatalog::add($type, (int) Tools::getValue('id_parent'), (string) Tools::getValue('name'), (string) Tools::getValue('icon', 'other'));
                break;
            case 'rename':
                $res = EcoRepairCatalog::rename($type, $id, (string) Tools::getValue('name'));
                break;
            case 'active':
                $res = EcoRepairCatalog::setActive($type, $id, (bool) Tools::getValue('active'));
                break;
            case 'delete':
                $res = EcoRepairCatalog::delete($type, $id);
                break;
            case 'avatar':
                $res = !empty($_FILES['image']) ? EcoRepairPhoto::saveAvatar($id, $_FILES['image']) : EcoRepairPhoto::deleteAvatar($id);
                $res['avatars'] = EcoRepairPhoto::avatars();
                $this->jsonOut($res);
                break;
            case 'icon':
                $res = EcoRepairCatalog::setIcon($id, (string) Tools::getValue('icon'));
                break;
            case 'saveConfig':
                $res = $this->saveConfig();
                break;
            case 'modelImage':
                if (!empty($_FILES['image'])) {
                    $up = EcoRepairPhoto::saveModelImage($id, $_FILES['image']);
                    $res = $up['ok'] ? EcoRepairCatalog::setModelImage($id, $up['file']) : $up;
                } elseif (trim((string) Tools::getValue('url')) !== '') {
                    $up = EcoRepairPhoto::modelImageFromUrl((string) Tools::getValue('url'));
                    if (!empty($up['choose'])) {
                        $this->jsonOut($up);
                    }
                    $res = $up['ok'] ? EcoRepairCatalog::setModelImage($id, $up['file']) : $up;
                } else {
                    $res = EcoRepairCatalog::setModelImage($id, '');
                }
                break;
            case 'shopImages':
                $res = array('ok' => true, 'proposals' => EcoRepairCatalog::shopImageProposals((int) $this->context->language->id, (int) $this->context->shop->id));
                break;
            case 'applyShopImages':
                $items = json_decode((string) Tools::getValue('items'), true);
                $n = 0;
                foreach (is_array($items) ? $items : array() as $it) {
                    if (isset($it['id_model'], $it['image']) && EcoRepairCatalog::setModelImage((int) $it['id_model'], (string) $it['image'])['ok']) {
                        ++$n;
                    }
                }
                $res = array('ok' => true, 'saved' => $n);
                break;
            case 'staffSave':
                $res = EcoRepairStaff::save((int) Tools::getValue('id'), array(
                    'name' => (string) Tools::getValue('name'),
                    'id_employee' => (int) Tools::getValue('id_employee'),
                    'pin' => (string) Tools::getValue('pin'),
                    'role_tech' => (bool) Tools::getValue('role_tech'),
                    'role_reception' => (bool) Tools::getValue('role_reception'),
                    'active' => (bool) Tools::getValue('active'),
                ));
                $res['staff'] = EcoRepairStaff::all();
                $this->jsonOut($res);
                // no break
            case 'staffRevoke':
                $res = EcoRepairStaff::revoke($id);
                $res['staff'] = EcoRepairStaff::all();
                $this->jsonOut($res);
                // no break
            case 'staffDelete':
                $res = EcoRepairStaff::delete($id);
                $res['staff'] = EcoRepairStaff::all();
                $this->jsonOut($res);
                // no break
            case 'importCatalog':
                $added = EcoRepairCatalogSeed::importMissing();
                $res = array('ok' => true, 'added' => $added);
                break;
            default:
                $this->jsonOut(array('ok' => false, 'error' => 'Acción desconocida.'), 400);
        }
        if ($res['ok'] && $action !== 'saveConfig') {
            $res['catalog'] = EcoRepairCatalog::tree(false);
        }
        $this->jsonOut($res);
    }

    protected function saveConfig()
    {
        $in = json_decode((string) Tools::getValue('config'), true);
        if (!is_array($in)) {
            return array('ok' => false, 'error' => 'Datos no válidos.');
        }
        $errors = array();
        $clean = array();
        $defaults = EcoRepairInstaller::defaultConfig();
        foreach ($defaults as $key => $def) {
            if (!array_key_exists($key, $in)) {
                continue;
            }
            $v = is_scalar($in[$key]) ? trim((string) $in[$key]) : '';
            switch ($key) {
                case 'ECOREPAIRS_FIELD_PHONE':
                case 'ECOREPAIRS_FIELD_EMAIL':
                    $v = $v === 'req' ? 'req' : 'opt';
                    break;
                case 'ECOREPAIRS_PRINT_FORMAT':
                    $v = in_array($v, array('80mm', 'a4'), true) ? $v : '80mm';
                    break;
                case 'ECOREPAIRS_LABEL_SIZE':
                    $v = in_array($v, array('62x29', '50x25', '62x100'), true) ? $v : '62x29';
                    break;
                case 'ECOREPAIRS_LATE_DAYS':
                case 'ECOREPAIRS_PICKUP_DAYS':
                    if (!ctype_digit($v) || (int) $v < 1 || (int) $v > 365) {
                        $errors[$key] = 'Escribe un número de días entre 1 y 365.';
                    }
                    $v = (string) (int) $v;
                    break;
                case 'ECOREPAIRS_RECALL_DAYS':
                    $v = (string) max(1, min(365, (int) $v));
                    break;
                case 'ECOREPAIRS_UNLOCK_NOTICE':
                    $v = Tools::substr(strip_tags($v), 0, 1000);
                    break;
                case 'ECOREPAIRS_TECHS_VIEWERS':
                    // Quién ve el informe de técnicos: solo lo cambia el administrador
                    if ((int) $this->context->employee->id_profile !== (int) _PS_ADMIN_PROFILE_) {
                        continue 2;
                    }
                    $v = implode(',', array_values(array_unique(array_filter(array_map('intval', explode(',', $v))))));
                    break;
                case 'ECOREPAIRS_ACCESSORIES':
                case 'ECOREPAIRS_DAMAGES':
                case 'ECOREPAIRS_CHECKLIST':
                    $lines = array();
                    foreach (preg_split('/\r\n|\r|\n/', strip_tags($v)) as $line) {
                        $line = trim($line);
                        if ($line !== '' && Tools::strlen($line) <= 64) {
                            $lines[] = $line;
                        }
                    }
                    $v = implode("\n", array_unique($lines));
                    break;
                case 'ECOREPAIRS_CONDITIONS':
                case 'ECOREPAIRS_QUOTE_CONDITIONS':
                    $v = Tools::substr(strip_tags($v), 0, 3000);
                    break;
                case 'ECOREPAIRS_CARRIER':
                    $v = (string) (int) $v;
                    break;
                case 'ECOREPAIRS_REPEAT_DAYS':
                    $v = (string) max(1, min(365, (int) $v));
                    break;
                case 'ECOREPAIRS_WS_NAME':
                case 'ECOREPAIRS_WS_ADDRESS':
                case 'ECOREPAIRS_WS_CITY':
                case 'ECOREPAIRS_WS_PHONE':
                case 'ECOREPAIRS_WS_WHATSAPP':
                    $v = Tools::substr(strip_tags($v), 0, 128);
                    break;
                case 'ECOREPAIRS_WS_HOURS':
                    $v = Tools::substr(strip_tags($v), 0, 600);
                    break;
                case 'ECOREPAIRS_WS_MAPS':
                    if ($v !== '' && (!preg_match('#^https://#i', $v) || !Validate::isAbsoluteUrl($v) || Tools::strlen($v) > 500)) {
                        $errors[$key] = 'Pega el enlace de Google Maps (empieza por https://) o déjalo vacío.';
                    }
                    break;
                case 'ECOREPAIRS_REVIEW_URL':
                    if ($v !== '' && (!preg_match('#^https://#i', $v) || !Validate::isAbsoluteUrl($v) || Tools::strlen($v) > 255)) {
                        $errors[$key] = 'Pega el enlace de reseñas de Google (empieza por https://).';
                    }
                    break;
                case 'ECOREPAIRS_WARRANTY_MONTHS':
                    $v = (string) max(0, min(60, (int) $v));
                    break;
                case 'ECOREPAIRS_TRACKING_DAYS':
                    $v = (string) max(1, min(3650, (int) $v));
                    break;
                case 'ECOREPAIRS_EMAIL_QUOTE':
                case 'ECOREPAIRS_REMINDER_AUTO':
                    $v = $v === '1' ? '1' : '0';
                    break;
                case 'ECOREPAIRS_EMAIL_STATUSES':
                    $v = implode(',', array_values(array_filter(explode(',', $v), array('EcoRepairStatus', 'isValid'))));
                    break;
                case 'ECOREPAIRS_WA_TEMPLATES':
                    continue 2;
                case 'ECOREPAIRS_QUOTE_DAYS':
                    if (!ctype_digit($v) || (int) $v < 1 || (int) $v > 365) {
                        $errors[$key] = 'Escribe un número de días entre 1 y 365.';
                    }
                    $v = (string) (int) $v;
                    break;
                case 'ECOREPAIRS_LABOUR_RATE':
                    $v = str_replace(',', '.', $v);
                    if (!is_numeric($v) || (float) $v < 0 || (float) $v > 9999) {
                        $errors[$key] = 'Escribe el precio por hora, por ejemplo 35 o 35,50.';
                    }
                    $v = (string) round((float) $v, 2);
                    break;
            }
            $clean[$key] = $v;
        }
        if ($errors) {
            return array('ok' => false, 'errors' => $errors);
        }
        foreach ($clean as $key => $v) {
            Configuration::updateValue($key, $v);
        }
        $tpl = json_decode((string) Tools::getValue('templates'), true);
        if (is_array($tpl)) {
            EcoRepairMessage::saveTemplates($tpl);
        }

        return array('ok' => true, 'config' => $this->currentConfig());
    }

    protected function jsonOut($data, $code = 200)
    {
        // Avisos de PHP u otros módulos impresos antes romperían la respuesta: se descartan
        while (ob_get_level() > 0) {
            @ob_end_clean();
        }
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store');
            if ($code !== 200) {
                http_response_code($code);
            }
        }
        echo json_encode($data, JSON_PARTIAL_OUTPUT_ON_ERROR);
        exit;
    }

    protected function json($data)
    {
        return json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    }

    protected function iconsSvg()
    {
        $s = '<svg class="er-i" viewBox="0 0 24 24" aria-hidden="true">';

        return array(
            'settings' => $s . '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
            'device' => $s . '<circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M8 18h8M15 4h3l1 14"/></svg>',
            'doc' => $s . '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
            'clock' => $s . '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
            'pin' => $s . '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
            'bolt' => $s . '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
            'back' => $s . '<path d="M15 18l-6-6 6-6"/></svg>',
            'plus' => $s . '<path d="M12 5v14M5 12h14"/></svg>',
            'check' => $s . '<path d="M20 6 9 17l-5-5"/></svg>',
            'camera' => $s . '<path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/></svg>',
            'link' => $s . '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
            'x' => $s . '<path d="M18 6 6 18M6 6l12 12"/></svg>',
            'user' => $s . '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
            'qr' => $s . '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 14v7h-7"/></svg>',
            'print' => $s . '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>',
            'book' => $s . '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/></svg>',
            'whatsapp' => $s . '<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.3-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2z"/></svg>',
            'search' => $s . '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
            'download' => $s . '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
            'pen' => $s . '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
            'trash' => $s . '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
            'mappin' => $s . '<path d="M12 22s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
            'scooter' => $s . '<circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M8 18h8M15 4h3l1 14"/></svg>',
            'bike' => $s . '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M5.5 17.5 10 7h4l4.5 10.5M14 7l1-3h3"/></svg>',
            'battery' => $s . '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2M11 9l-2 3h4l-2 3"/></svg>',
            'moto' => $s . '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M8 17h7l3-6h-5l-2-4H8M15 11 13 7"/></svg>',
            'other' => $s . '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>',
        );
    }
}
