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

    public function setMedia($isNewTheme = false)
    {
        parent::setMedia($isNewTheme);
        $base = $this->module->getPathUri();
        $v = '?v=' . $this->module->version;
        $this->addCSS('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', 'all', null, false);
        $this->addCSS($base . 'views/css/admin.css' . $v, 'all', null, false);
        $this->addJS($base . 'views/js/common.js' . $v, false);
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
            'canEdit' => (bool) $this->access('edit'),
        );
        $this->context->smarty->assign(array(
            'ecor_view' => 'settings',
            'ecor_boot' => $this->json(array(
                'icons' => $this->iconsSvg(),
                'links' => array(
                    'board' => $this->context->link->getAdminLink('AdminEcoRepairs'),
                    'ajax' => $this->context->link->getAdminLink('AdminEcoRepairsSettings') . '&ajax=1',
                    'modelImage' => $this->context->link->getAdminLink('AdminEcoRepairs') . '&ajax=1&action=modelImage',
                ),
            )),
            'ecor_data' => $this->json($data),
        ));
        $this->setTemplate('app.tpl');
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
                } else {
                    $res = EcoRepairCatalog::setModelImage($id, (string) Tools::getValue('url'));
                }
                break;
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
                case 'ECOREPAIRS_ACCESSORIES':
                case 'ECOREPAIRS_DAMAGES':
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

        return array('ok' => true, 'config' => $this->currentConfig());
    }

    protected function jsonOut($data, $code = 200)
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store');
            if ($code !== 200) {
                http_response_code($code);
            }
        }
        echo json_encode($data);
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
            'back' => $s . '<path d="M15 18l-6-6 6-6"/></svg>',
            'plus' => $s . '<path d="M12 5v14M5 12h14"/></svg>',
            'check' => $s . '<path d="M20 6 9 17l-5-5"/></svg>',
            'camera' => $s . '<path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/></svg>',
            'link' => $s . '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
            'x' => $s . '<path d="M18 6 6 18M6 6l12 12"/></svg>',
            'search' => $s . '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
            'download' => $s . '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
            'pen' => $s . '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
            'scooter' => $s . '<circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M8 18h8M15 4h3l1 14"/></svg>',
            'bike' => $s . '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M5.5 17.5 10 7h4l4.5 10.5M14 7l1-3h3"/></svg>',
            'battery' => $s . '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2M11 9l-2 3h4l-2 3"/></svg>',
            'moto' => $s . '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M8 17h7l3-6h-5l-2-4H8M15 11 13 7"/></svg>',
            'other' => $s . '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>',
        );
    }
}
