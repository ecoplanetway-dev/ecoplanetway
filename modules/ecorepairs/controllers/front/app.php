<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . 'ecorepairs/ecorepairs.php';

/**
 * App del taller en el móvil: /taller
 * Entran con PIN técnicos y recepción, sin usar PrestaShop. Cada acción queda en el historial con su nombre.
 * - Técnico: escanear QR, asignarse, estado, notas, fotos, piezas, códigos de error y manual.
 * - Recepción: nueva reparación sencilla.
 */
class EcoRepairsAppModuleFrontController extends ModuleFrontController
{
    public $ssl = true;
    public $auth = false;

    /** @var array|false */
    protected $staff;

    public function initContent()
    {
        header('X-Robots-Tag: noindex, nofollow');
        header('Cache-Control: no-store');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: same-origin');

        $this->staff = EcoRepairStaff::current();
        $action = (string) Tools::getValue('action');
        if ($action !== '') {
            $this->ajax($action);
        }
        $this->renderShell();
    }

    /* ------------------------------------------------------------------ */
    /* Página                                                              */
    /* ------------------------------------------------------------------ */

    protected function appUrl()
    {
        if (Configuration::get('PS_REWRITING_SETTINGS')) {
            return $this->context->link->getBaseLink() . 'taller';
        }

        return $this->context->link->getModuleLink('ecorepairs', 'app', array(), true);
    }

    protected function renderShell()
    {
        $base = $this->module->getPathUri();
        $v = '?v=' . $this->module->version;
        $url = $this->appUrl();
        $boot = array(
            'icons' => $this->icons(),
            'links' => array(
                'ajax' => $url . (strpos($url, '?') === false ? '?' : '&') . 'ajax=1',
                'app' => $url,
                'modelImage' => $url . (strpos($url, '?') === false ? '?' : '&') . 'action=modelimg',
            ),
            'csrf' => $this->staff ? EcoRepairStaff::csrf($this->staff) : '',
            'avatars' => EcoRepairPhoto::avatars(),
        );
        $data = array(
            'me' => $this->staff ? $this->me() : null,
            'people' => $this->staff ? array() : array_map(function ($s) {
                return array('id' => $s['id'], 'name' => $s['name'], 'emp' => isset($s['id_employee']) ? (int) $s['id_employee'] : 0);
            }, EcoRepairStaff::all(true)),
            'shop' => Configuration::get('PS_SHOP_NAME'),
            'accessories' => EcoRepairCatalog::configList('ECOREPAIRS_ACCESSORIES'),
            'damages' => EcoRepairCatalog::configList('ECOREPAIRS_DAMAGES'),
        );
        $this->context->smarty->assign(array(
            'css' => array($base . 'views/css/admin.css' . $v, $base . 'views/css/app.css' . $v),
            'js' => array($base . 'views/js/common.js' . $v, $base . 'views/js/repair-form.js' . $v, $base . 'views/js/parts.js' . $v, $base . 'views/js/notify.js' . $v, $base . 'views/js/vendor/qrcode.js' . $v, $base . 'views/js/labels.js' . $v, $base . 'views/js/vendor/jsQR.js' . $v, $base . 'views/js/app.js' . $v),
            'boot' => json_encode($boot, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT),
            'data' => json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT),
            'shopName' => Configuration::get('PS_SHOP_NAME'),
            'logo' => EcoRepairs::logoUrl(),
        ));
        header('Content-Type: text/html; charset=utf-8');
        echo $this->context->smarty->fetch($this->module->getLocalPath() . 'views/templates/front/app.tpl');
        exit;
    }

    protected function me()
    {
        $s = $this->staff;

        return array('id' => (int) $s['id_ecorepair_staff'], 'name' => $s['name'], 'id_employee' => (int) $s['id_employee'],
            'tech' => (int) $s['role_tech'], 'reception' => (int) $s['role_reception']);
    }

    /* ------------------------------------------------------------------ */
    /* Peticiones                                                          */
    /* ------------------------------------------------------------------ */

    protected function out($data, $code = 200)
    {
        // Avisos de PHP u otros módulos impresos antes romperían la respuesta: se descartan
        while (ob_get_level() > 0) {
            @ob_end_clean();
        }
        if ($code !== 200) {
            http_response_code($code);
        }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_PARTIAL_OUTPUT_ON_ERROR);
        exit;
    }

    protected function ajax($action)
    {
        // Imágenes (GET, con sesión)
        if ($action === 'modelimg') {
            if (!$this->staff || !EcoRepairPhoto::outputModelImage((string) Tools::getValue('f'))) {
                header('HTTP/1.1 404 Not Found');
            }
            exit;
        }
        if ($action === 'photoimg') {
            $ph = $this->staff ? EcoRepairPhoto::get((int) Tools::getValue('id')) : false;
            if (!$ph || !in_array($ph['type'], array('entry', 'work', 'device'), true) || !EcoRepairPhoto::output($ph, (bool) Tools::getValue('thumb'))) {
                header('HTTP/1.1 404 Not Found');
            }
            exit;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->out(array('ok' => false, 'error' => 'Método no permitido.'), 405);
        }
        if (EcoRepairPhoto::overPostLimit()) {
            $this->out(array('ok' => false, 'error' => 'La foto es demasiado grande para el servidor (máximo ' . ini_get('post_max_size') . ').'), 413);
        }
        if ($action === 'login') {
            $res = EcoRepairStaff::login((int) Tools::getValue('id'), (string) Tools::getValue('pin'));
            $this->out($res);
        }
        if (!$this->staff) {
            $this->out(array('ok' => false, 'error' => 'La sesión ha caducado. Vuelve a entrar con tu PIN.', 'login' => true), 401);
        }
        $csrf = isset($_SERVER['HTTP_X_ECOR_CSRF']) ? (string) $_SERVER['HTTP_X_ECOR_CSRF'] : '';
        if (!hash_equals(EcoRepairStaff::csrf($this->staff), $csrf)) {
            $this->out(array('ok' => false, 'error' => 'Recarga la página.', 'login' => true), 403);
        }

        $tech = array('home', 'claim', 'status', 'request'); // buscar y añadir piezas al presupuesto: también recepción
        $reception = array('customers', 'customerCreate', 'create', 'addCatalog', 'tag');
        if (in_array($action, $tech, true) && !(int) $this->staff['role_tech'] && $action !== 'home') {
            $this->out(array('ok' => false, 'error' => 'Solo para técnicos.'), 403);
        }
        if (in_array($action, $reception, true) && !(int) $this->staff['role_reception']) {
            $this->out(array('ok' => false, 'error' => 'Solo para recepción.'), 403);
        }

        try {
            switch ($action) {
                case 'logout':
                    EcoRepairStaff::logout();
                    $this->out(array('ok' => true));
                    // no break
                case 'home':
                    $this->out($this->home());
                    // no break
                case 'diagnosis':
                    $r = $this->findRepair();
                    $this->open($r);
                    $res = EcoRepair::updateField((int) $r['id_ecorepair'], 'diagnosis', Tools::substr(trim(strip_tags((string) Tools::getValue('value'))), 0, 5000), $this->emp());
                    $this->out($res['ok'] ? array('ok' => true) + $this->repairData(EcoRepair::get((int) $r['id_ecorepair'])) : $res);
                    // no break
                case 'batterySave':
                    $r = $this->findRepair();
                    $this->out(EcoRepairLinks::saveBattery((int) $r['id_model'], json_decode((string) Tools::getValue('data'), true) ?: array()));
                    // no break
                case 'batteryCatalog':
                    $r = $this->findRepair();
                    $this->out(EcoRepairLinks::batAddCatalog((int) $r['id_model']));
                    // no break
                case 'notifyPreview':
                    $this->out($this->notifyPreview($this->repairById()));
                    // no break
                case 'logMessage':
                    $r = $this->repairById();
                    if ((string) Tools::getValue('template') === 'reminder') {
                        Db::getInstance()->update('ecorepair', array('date_reminder' => date('Y-m-d H:i:s')), 'id_ecorepair = ' . (int) $r['id_ecorepair']);
                    }
                    EcoRepairMessage::log((int) $r['id_ecorepair'], 0, (int) $r['id_customer'], 'whatsapp', (string) Tools::getValue('template'),
                        EcoRepairMessage::waPhone(Tools::getValue('phone')), (string) Tools::getValue('body'), $this->emp());
                    $this->out(array('ok' => true));
                    // no break
                case 'quoteLines':
                    $r = $this->findRepair();
                    $this->open($r);
                    $q = $this->draftQuote((int) $r['id_ecorepair']);
                    if (!$q) {
                        $this->out(array('ok' => false, 'error' => 'No hay presupuesto en borrador.'));
                    }
                    $res = EcoRepairQuote::saveDraft($q, json_decode((string) Tools::getValue('lines'), true), (string) $q['notes']);
                    $this->out($res['ok'] ? array('ok' => true) + $this->repairData(EcoRepair::get((int) $r['id_ecorepair'])) : $res);
                    // no break
                case 'quoteLabour':
                    $r = $this->findRepair();
                    $this->open($r);
                    $name = Tools::substr(trim(strip_tags((string) Tools::getValue('name'))), 0, 128);
                    // Acepta «35», «35,50», «35.50 €», «€35»…
                    $rawPrice = preg_replace('/[^0-9,\.]/', '', (string) Tools::getValue('price'));
                    if (strpos($rawPrice, ',') !== false) {
                        $rawPrice = str_replace(array('.', ','), array('', '.'), $rawPrice);
                    }
                    $price = round((float) $rawPrice, 2);
                    if ($name === '' || $price <= 0) {
                        $this->out(array('ok' => false, 'error' => 'Escribe el nombre y el precio (por ejemplo 20 o 20,50).'));
                    }
                    // «labour»: mano de obra · «part»: producto suelto que no está en la tienda
                    $kind = Tools::getValue('kind') === 'part' ? 'part' : 'labour';
                    $qty = max(1, min(999, (int) Tools::getValue('qty', 1)));
                    $res = EcoRepairQuote::appendToDraft($r, array(array('type' => $kind, 'id_product' => 0, 'id_product_attribute' => 0, 'reference' => '', 'name' => $name, 'qty' => $qty, 'price' => $price, 'tax_rate' => 21)),
                        $this->emp(), $this->staff['name'] . ' (móvil)');
                    $this->out(!empty($res['ok']) ? array('ok' => true) + $this->repairData(EcoRepair::get((int) $r['id_ecorepair'])) : $res);
                    // no break
                case 'partLink':
                    // Guardar una pieza de la tienda como pieza de este modelo (en su parte del patín)
                    $r = $this->findRepair();
                    if (!(int) $r['id_brand']) {
                        $this->out(array('ok' => false, 'error' => 'La reparación no tiene marca.'));
                    }
                    $res = EcoRepairParts::save(0, (int) $r['id_brand'], (int) $r['id_model'], array('zone' => (string) Tools::getValue('zone'), 'name' => (string) Tools::getValue('name'),
                        'id_product' => (int) Tools::getValue('id_product'), 'id_product_attribute' => (int) Tools::getValue('id_product_attribute')));
                    $this->out(!empty($res['ok']) ? array('ok' => true) + $this->repairData(EcoRepair::get((int) $r['id_ecorepair'])) : $res);
                    // no break
                case 'printAsk':
                    $r = $this->findRepair();
                    $this->out(EcoRepairPrintQueue::add($r, (string) Tools::getValue('type'), $this->staff['name']));
                    // no break
                case 'quoteNew':

                    $r = $this->findRepair();
                    $this->open($r);
                    $qi = $this->quoteInfo((int) $r['id_ecorepair']);
                    $q = $qi ? EcoRepairQuote::get($qi['id']) : null;
                    if (!$q) {
                        $this->out(array('ok' => false, 'error' => 'No hay presupuesto que rehacer.'));
                    }
                    $res = EcoRepairQuote::newVersion($q, $this->emp());
                    $this->out($res['ok'] ? array('ok' => true) + $this->repairData(EcoRepair::get((int) $r['id_ecorepair'])) : $res);
                    // no break
                case 'quoteSend':
                    $r = $this->findRepair();
                    $this->open($r);
                    $q = $this->draftQuote((int) $r['id_ecorepair']);
                    if (!$q) {
                        $this->out(array('ok' => false, 'error' => 'No hay presupuesto en borrador para enviar.'));
                    }
                    $res = EcoRepairQuote::send($q, $this->emp());
                    if (!$res['ok']) {
                        $this->out($res);
                    }
                    $fresh = EcoRepairQuote::get((int) $q['id_ecorepair_quote']);
                    $emailed = EcoRepairMessage::quoteEmail($r, $res['link'], EcoRepairQuote::money($fresh['total_tax_incl']), $this->emp(), $this->trackingUrl($r['tracking_code']));
                    $this->out(array('ok' => true, 'link' => $res['link'], 'emailed' => $emailed) + $this->repairData(EcoRepair::get((int) $r['id_ecorepair'])));
                    // no break
                case 'all':
                    $this->out($this->allRepairs((string) Tools::getValue('q'), (string) Tools::getValue('st')));
                    // no break
                case 'repair':
                    $this->out($this->repairData($this->findRepair()));
                    // no break
                case 'claim':
                    $this->out($this->claim($this->findRepair()));
                    // no break
                case 'status':
                    $this->out($this->setStatus($this->findRepair()));
                    // no break
                case 'note':
                    $r = $this->findRepair();
                    $note = trim(strip_tags((string) Tools::getValue('note')));
                    if ($note === '' || Tools::strlen($note) > 2000) {
                        $this->out(array('ok' => false, 'error' => 'Escribe la nota.'));
                    }
                    EcoRepairLog::add((int) $r['id_ecorepair'], $this->emp(), 'note', $note . ' · ' . $this->staff['name'] . ' (móvil)');
                    $this->out(array('ok' => true) + $this->repairData(EcoRepair::get((int) $r['id_ecorepair'])));
                    // no break
                case 'photo':
                    $this->out($this->photo($this->findRepair()));
                    // no break
                case 'search':
                    $r = (int) Tools::getValue('id') ? EcoRepair::get((int) Tools::getValue('id')) : false;
                    $products = EcoRepairQuote::searchProducts(Tools::getValue('q'), (int) $this->context->language->id,
                        (int) $this->context->shop->id, 30, $r ? $r['brand_name'] . ' ' . $r['model_name'] : '');
                    if ($r && (int) $r['id_brand']) {
                        $map = EcoRepairIncompat::mapForProducts((int) $r['id_brand'], (int) $r['id_model'], array_column($products, 'id_product'));
                        foreach ($products as &$pr) {
                            $pr['incompat'] = EcoRepairIncompat::find($map, $pr['id_product'], $pr['id_product_attribute']);
                        }
                        unset($pr);
                    }
                    $this->out(array('ok' => true, 'products' => $products));
                    // no break
                case 'addParts':
                    $this->out($this->addParts($this->findRepair()));
                    // no break
                case 'request':
                    $r = $this->findRepair();
                    $res = EcoRepairRequest::save(0, array('id_customer' => (int) $r['id_customer'], 'request' => (string) Tools::getValue('name'),
                        'for_device' => $r['device_name'], 'qty' => (int) Tools::getValue('qty', 1), 'supplier' => '', 'price' => Tools::getValue('price'), 'deposit' => 0,
                        'notes' => 'Pedido desde el móvil por ' . $this->staff['name'], 'id_ecorepair' => (int) $r['id_ecorepair'],
                        'id_product' => (int) Tools::getValue('id_product'), 'id_product_attribute' => (int) Tools::getValue('id_product_attribute')),
                        (int) $this->context->shop->id, $this->emp());
                    $this->out($res);
                    // no break
                case 'knowledge':
                    $this->out(array('ok' => true, 'kb' => EcoRepairKnowledge::forModel((int) Tools::getValue('id_brand'), (int) Tools::getValue('id_model'))));
                    // no break
                case 'kbSave':
                    $type = (string) Tools::getValue('type');
                    if (!in_array($type, array('fault', 'code'), true)) {
                        $this->out(array('ok' => false, 'error' => 'Desde el móvil se pueden añadir soluciones y códigos.'));
                    }
                    $res = EcoRepairKnowledge::save($type, 0, (int) Tools::getValue('id_brand'), (int) Tools::getValue('id_model'),
                        json_decode((string) Tools::getValue('data'), true) ?: array(), $this->staff['name']);
                    if ($res['ok']) {
                        $res['kb'] = EcoRepairKnowledge::forModel((int) Tools::getValue('id_brand'), (int) Tools::getValue('id_model'));
                    }
                    $this->out($res);
                    // no break
                case 'incompatSave':
                    $r = $this->findRepair();
                    $d = json_decode((string) Tools::getValue('data'), true) ?: array();
                    $res = EcoRepairIncompat::save((int) $r['id_brand'], !empty($d['all_brand']) ? 0 : (int) $r['id_model'], $d, $this->staff['name']);
                    if ($res['ok']) {
                        EcoRepairLog::add((int) $r['id_ecorepair'], $this->emp(), 'field', 'Apuntado como no compatible con el modelo: ' . (isset($d['label']) ? $d['label'] : '') . ' · ' . (isset($d['reason']) ? $d['reason'] : '') . ' (' . $this->staff['name'] . ', móvil)');
                        $res = $this->repairData(EcoRepair::get((int) $r['id_ecorepair']));
                    }
                    $this->out($res);
                    // no break
                case 'modelParts':
                    $idb = (int) Tools::getValue('id_brand');
                    $idm = (int) Tools::getValue('id_model');
                    $img = $idm ? (string) Db::getInstance()->getValue('SELECT image FROM `' . _DB_PREFIX_ . 'ecorepair_model` WHERE id_ecorepair_model = ' . $idm) : '';
                    $this->out(array('ok' => true, 'parts' => EcoRepairParts::forModel($idb, $idm, false), 'zones' => EcoRepairParts::zones(),
                        'incompat' => EcoRepairIncompat::forModel($idb, $idm)) + $this->modelBundle($idb, $idm, $img));
                    // no break
                case 'checkToggle':
                    $r = $this->findRepair();
                    $res = EcoRepair::checklistToggle($r, (string) Tools::getValue('item'), $this->staff['name'] . ' (móvil)', $this->emp());
                    $this->out($res['ok'] ? $this->repairData(EcoRepair::get((int) $r['id_ecorepair'])) : $res);
                    // no break
                case 'unlockAdd':
                case 'fixedAdd':
                    $r = $this->findRepair();
                    $this->open($r); // el presupuesto lo puede gestionar cualquiera (técnico o recepción)
                    $res = $action === 'unlockAdd' ? EcoRepairUnlock::addToQuote($r, (int) Tools::getValue('item'), $this->emp(), $this->staff['name'] . ' (móvil)')
                        : EcoRepairFixed::addToQuote($r, (int) Tools::getValue('item'), $this->emp(), $this->staff['name'] . ' (móvil)');
                    $this->out($res['ok'] ? $this->repairData(EcoRepair::get((int) $r['id_ecorepair'])) + array('added' => $res['added']) : $res);
                    // no break
                case 'tag':
                    $prev = EcoRepair::byTag((string) Tools::getValue('tag'));
                    if (!$prev) {
                        $this->out(array('ok' => false, 'error' => 'Esta pegatina no está registrada.'));
                    }
                    $c = EcoRepairCustomer::info((int) $prev['id_customer']);
                    $this->out(array('ok' => true, 'tag' => $prev['device_tag'], 'id_category' => (int) $prev['id_category'], 'id_brand' => (int) $prev['id_brand'],
                        'id_model' => (int) $prev['id_model'], 'device_name' => $prev['device_name'], 'serial' => $prev['serial'], 'color' => $prev['color'],
                        'reference' => $prev['reference'], 'open' => !in_array($prev['status'], array(EcoRepairStatus::DELIVERED, EcoRepairStatus::CANCELLED), true) ? (int) $prev['id_ecorepair'] : 0,
                        'customer' => $c ?: null));
                    // no break
                case 'partSearch':
                    $this->out(array('ok' => true, 'results' => EcoRepairParts::search((string) Tools::getValue('q'), false)));
                    // no break
                case 'catalog':
                    $this->out(array('ok' => true, 'catalog' => EcoRepairCatalog::tree(true)));
                    // no break
                case 'addCatalog':
                    $res = EcoRepairCatalog::add((string) Tools::getValue('type'), (int) Tools::getValue('id_parent'), (string) Tools::getValue('name'), 'other');
                    $this->out($res);
                    // no break
                case 'customers':
                    $this->out(array('ok' => true, 'customers' => EcoRepairCustomer::search(Tools::getValue('q'))));
                    // no break
                case 'customerCreate':
                    $res = EcoRepairCustomer::create(array(
                        'firstname' => (string) Tools::getValue('firstname'), 'lastname' => (string) Tools::getValue('lastname'),
                        'phone' => (string) Tools::getValue('phone'), 'email' => (string) Tools::getValue('email'), 'invoice' => false,
                        'nif' => '', 'company' => '', 'address' => '', 'postcode' => '', 'city' => '',
                        'consent_rgpd' => true, 'consent_whatsapp' => (bool) Tools::getValue('consent_whatsapp'),
                    ), $this->context);
                    if (!empty($res['id_customer'])) {
                        $res['customer'] = EcoRepairCustomer::info((int) $res['id_customer']);
                    }
                    if (!empty($res['existing'])) {
                        $res['existingCustomer'] = EcoRepairCustomer::info((int) $res['existing']);
                    }
                    $this->out($res);
                    // no break
                case 'create':
                    $this->out($this->create());
                    // no break
                case 'signature':
                    $r = $this->findRepair();
                    $res = EcoRepairPhoto::saveSignature((int) $r['id_ecorepair'], (string) Tools::getValue('signature'), $this->emp());
                    $this->out($res);
                    // no break
                case 'models':
                    $this->out(array('ok' => true, 'catalog' => EcoRepairCatalog::tree(true)));
            }
        } catch (Exception $e) {
            PrestaShopLogger::addLog('ecorepairs app: ' . $e->getMessage(), 3, null, 'EcoRepair');
            $this->out(array('ok' => false, 'error' => 'Error inesperado. Inténtalo de nuevo.'), 500);
        }
        $this->out(array('ok' => false, 'error' => 'Acción desconocida.'), 400);
    }

    protected function emp()
    {
        return (int) $this->staff['id_employee'];
    }

    /** Busca por id o por el código del QR (acepta también la dirección completa del QR). */
    protected function findRepair()
    {
        $id = (int) Tools::getValue('id');
        if (!$id) {
            $code = (string) Tools::getValue('code');
            if (preg_match('/[?&]c=([A-Za-z0-9\-]+)/', $code, $m)) {
                $code = $m[1];
            }
            $code = preg_replace('/[^A-Z0-9]/', '', Tools::strtoupper($code));
            if (strlen($code) === 8) {
                $code = substr($code, 0, 4) . '-' . substr($code, 4);
            }
            $id = (int) Db::getInstance()->getValue('SELECT id_ecorepair FROM `' . _DB_PREFIX_ . 'ecorepair` WHERE tracking_code = \'' . pSQL($code) . '\'');
        }
        $r = $id ? EcoRepair::get($id) : false;
        if (!$r || (int) $r['id_shop'] !== (int) $this->context->shop->id) {
            $this->out(array('ok' => false, 'error' => 'No encuentro esa reparación. ¿Es un QR del taller?'), 404);
        }

        return $r;
    }

    protected function lite(array $r)
    {
        return array(
            'id' => (int) $r['id_ecorepair'], 'reference' => $r['reference'], 'status' => $r['status'], 'status_name' => $r['status_name'],
            'device_name' => $r['device_name'], 'category_name' => (string) $r['category_name'], 'category_icon' => (string) $r['category_icon'],
            'customer' => $r['firstname'], 'urgent' => (int) $r['urgent'], 'warranty' => (int) $r['warranty'], 'waiting_part' => (int) $r['waiting_part'],
            'days_in_shop' => (int) $r['days_in_shop'], 'tech_name' => $r['tech_name'], 'id_employee_tech' => (int) $r['id_employee_tech'],
            'fault' => trim(implode(', ', $r['faults']) . ($r['fault_customer'] ? ' · ' . $r['fault_customer'] : ''), ' ·'),
            'cover' => $this->coverUrl($r),
        );
    }

    protected function modelImg($img)
    {
        $img = (string) $img;
        if ($img === '') {
            return '';
        }
        $base = $this->appUrl() . (strpos($this->appUrl(), '?') === false ? '?' : '&');

        return preg_match('#^https://#i', $img) ? $img : $base . 'action=modelimg&f=' . rawurlencode($img);
    }

    /** Foto con zonas, partes, deslimitación (sin proveedor) y precios cerrados del modelo. */
    protected function modelBundle($idBrand, $idModel, $img)
    {
        return array(
            'modelMap' => EcoRepairParts::modelMap($idModel),
            'modelPhoto' => $this->modelImg($img),
            'sections' => EcoRepairParts::sections(),
            'unlock' => $idBrand ? EcoRepairUnlock::forModel($idBrand, $idModel, false) : array(),
            'fixed' => $idBrand ? EcoRepairFixed::forModel($idBrand, $idModel) : array(),
            'battery' => $idModel ? EcoRepairLinks::battery($idModel) : null,
        );
    }

    protected function coverUrl(array $r)
    {
        $base = $this->appUrl() . (strpos($this->appUrl(), '?') === false ? '?' : '&');
        if (!empty($r['id_photo_cover'])) {
            return $base . 'action=photoimg&thumb=1&id=' . (int) $r['id_photo_cover'];
        }
        $img = isset($r['model_image']) ? (string) $r['model_image'] : '';
        if ($img === '') {
            return '';
        }

        return preg_match('#^https://#i', $img) ? $img : $base . 'action=modelimg&f=' . rawurlencode($img);
    }

    protected function home()
    {
        $p = _DB_PREFIX_;
        $open = "('received', 'diagnosis', 'quote', 'repair', 'ready')";
        $mine = array();
        $free = array();
        $rows = Db::getInstance()->executeS('SELECT id_ecorepair FROM `' . $p . 'ecorepair` WHERE id_shop = ' . (int) $this->context->shop->id
            . ' AND status IN ' . $open . ' AND (id_employee_tech = ' . $this->emp() . ' OR id_employee_tech = 0) ORDER BY date_add DESC LIMIT 200') ?: array();
        foreach ($rows as $row) {
            $r = EcoRepair::get((int) $row['id_ecorepair']);
            if ((int) $r['id_employee_tech'] === $this->emp() && $this->emp()) {
                $mine[] = $this->lite($r);
            } else {
                $free[] = $this->lite($r);
            }
        }

        return array('ok' => true, 'mine' => $mine, 'free' => $free, 'statuses' => EcoRepairStatus::all());
    }

    protected function customerLite($idCustomer)
    {
        $c = $idCustomer ? EcoRepairCustomer::info($idCustomer) : false;
        if (!$c) {
            return null;
        }

        return array('name' => isset($c['name']) ? $c['name'] : trim($c['firstname'] . ' ' . $c['lastname']), 'phone' => (string) $c['phone'],
            'email' => (string) $c['email'], 'company' => (string) $c['company'], 'whatsapp' => (int) $c['consent_whatsapp'],
            'repairs' => (int) $c['repairs_count'], 'orders' => (int) $c['orders_count'], 'since' => (string) $c['date_add']);
    }

    /** Último presupuesto que cuenta (no sustituido): para el aviso de arriba (aceptado, rechazado, enviado). */
    protected function quoteInfo($idRepair)
    {
        $last = null;
        foreach (EcoRepairQuote::forRepair($idRepair) as $q) {
            if ($q['status'] !== EcoRepairQuote::SUPERSEDED && $q['status'] !== EcoRepairQuote::DRAFT) {
                $last = $q;
            }
        }
        if (!$last) {
            return null;
        }

        return array('id' => (int) $last['id_ecorepair_quote'], 'label' => EcoRepairQuote::label($last), 'status' => $last['status'],
            'total' => round((float) $last['total_tax_incl'], 2), 'note' => (string) $last['answer_note'], 'channel' => (string) $last['channel'],
            'date' => (string) ($last['date_answer'] ?: $last['date_sent']), 'link' => $last['token'] ? EcoRepairQuote::link($last['token']) : '',
            'hasDraft' => (bool) $this->draftQuote($idRepair), 'lines' => EcoRepairQuote::lines((int) $last['id_ecorepair_quote']),
            'notes' => (string) $last['notes']);
    }

    protected function draftLite($idRepair)
    {
        $q = $this->draftQuote($idRepair);
        if (!$q) {
            return null;
        }

        return array('id' => (int) $q['id_ecorepair_quote'], 'label' => EcoRepairQuote::label($q), 'lines' => EcoRepairQuote::lines((int) $q['id_ecorepair_quote']),
            'total' => round((float) $q['total_tax_incl'], 2));
    }

    protected function repairById()
    {
        $r = EcoRepair::get((int) (Tools::getValue('id_ecorepair') ?: Tools::getValue('id')));
        if (!$r || (int) $r['id_shop'] !== (int) $this->context->shop->id) {
            $this->out(array('ok' => false, 'error' => 'No se encontró la reparación.'), 404);
        }

        return $r;
    }

    protected function open(array $r)
    {
        if (in_array($r['status'], array(EcoRepairStatus::DELIVERED, EcoRepairStatus::CANCELLED), true)) {
            $this->out(array('ok' => false, 'error' => 'La reparación está cerrada.'));
        }
    }

    /** Presupuesto en borrador de la reparación (el último), o null. */
    protected function draftQuote($idRepair)
    {
        $draft = null;
        foreach (EcoRepairQuote::forRepair($idRepair) as $q) {
            if ($q['status'] === EcoRepairQuote::DRAFT) {
                $draft = $q;
            }
        }

        return $draft;
    }

    /** Lo mismo que el panel: plantillas de WhatsApp ya rellenas y el técnico (opcional, con su foto). */
    protected function notifyPreview(array $repair)
    {
        $tpl = EcoRepairMessage::templates();
        $vals = EcoRepairMessage::values($repair, $this->trackingUrl($repair['tracking_code']));
        $out = array();
        foreach ($tpl as $k => $t) {
            if ($k !== 'request') {
                $out[$k] = array('name' => $t['name'], 'text' => EcoRepairMessage::render($t['text'], $vals));
            }
        }
        $default = array('delivered' => 'review', 'received' => 'received', 'quote' => 'quote', 'ready' => (int) $repair['days_in_status'] >= (int) Configuration::get('ECOREPAIRS_PICKUP_DAYS') ? 'reminder' : 'ready');
        $c = EcoRepairCustomer::info((int) $repair['id_customer']);
        $tech = EcoRepairPhoto::techFor((int) $repair['id_employee_tech']);
        if ($tech) {
            $tech['link'] = $this->trackingUrl($repair['tracking_code']);
        }
        $people = EcoRepairPhoto::people($this->emp(), (int) $repair['id_employee_tech']);
        foreach ($people as &$pp) {
            $pp['link'] = $this->trackingUrl($repair['tracking_code']) . '&a=' . $pp['id'];
        }
        unset($pp);

        return array('ok' => true, 'people' => $people, 'phone' => $c ? $c['phone'] : '', 'consent' => $c ? (int) $c['consent_whatsapp'] : 0, 'name' => $c ? $c['name'] : '',
            'templates' => $out, 'default' => isset($default[$repair['status']]) ? $default[$repair['status']] : 'received', 'tech' => $tech);
    }

    /** Todas las reparaciones del taller, con buscador y filtro por estado (para localizarlas desde el móvil). */
    protected function allRepairs($q, $st)
    {
        $p = _DB_PREFIX_;
        $db = Db::getInstance();
        $where = 'r.id_shop = ' . (int) $this->context->shop->id;
        $open = "'received', 'diagnosis', 'quote', 'repair', 'ready'";
        if ($st === '' || $st === 'open') {
            $where .= ' AND r.status IN (' . $open . ')';
        } elseif ($st === 'mine') {
            $where .= ' AND r.status IN (' . $open . ') AND r.id_employee_tech = ' . $this->emp();
        } elseif ($st === 'free') {
            $where .= ' AND r.status IN (' . $open . ') AND r.id_employee_tech = 0';
        } elseif ($st === 'urgent') {
            $where .= ' AND r.status IN (' . $open . ') AND r.urgent = 1';
        } elseif ($st !== 'all' && isset(EcoRepairStatus::all()[$st])) {
            $where .= " AND r.status = '" . pSQL($st) . "'";
        }
        $q = trim(Tools::substr($q, 0, 64));
        if ($q !== '') {
            $like = "'%" . pSQL(str_replace(array('%', '_'), ' ', $q)) . "%'";
            $digits = preg_replace('/\D+/', '', $q);
            $where .= ' AND (r.reference LIKE ' . $like . ' OR r.device_name LIKE ' . $like . ' OR r.serial LIKE ' . $like . ' OR r.tracking_code LIKE ' . $like .
                ' OR CONCAT(c.firstname, \' \', c.lastname) LIKE ' . $like . ' OR c.email LIKE ' . $like .
                (strlen($digits) >= 4 ? " OR REPLACE(REPLACE(a.phone_mobile, ' ', ''), '+34', '') LIKE '%" . pSQL($digits) . "%' OR REPLACE(REPLACE(a.phone, ' ', ''), '+34', '') LIKE '%" . pSQL($digits) . "%'" : '') . ')';
        }
        $rows = $db->executeS('SELECT r.id_ecorepair FROM `' . $p . 'ecorepair` r
            LEFT JOIN `' . $p . 'customer` c ON c.id_customer = r.id_customer
            LEFT JOIN `' . $p . 'address` a ON a.id_customer = r.id_customer AND a.deleted = 0
            WHERE ' . $where . ' GROUP BY r.id_ecorepair ORDER BY r.date_add DESC LIMIT 150') ?: array();
        $out = array();
        foreach ($rows as $row) {
            $r = EcoRepair::get((int) $row['id_ecorepair']);
            if ($r) {
                $out[] = $this->lite($r);
            }
        }

        return array('ok' => true, 'list' => $out, 'statuses' => EcoRepairStatus::all(), 'more' => count($rows) >= 150);
    }

        protected function repairData(array $r)
    {
        $id = (int) $r['id_ecorepair'];
        $base = $this->appUrl() . (strpos($this->appUrl(), '?') === false ? '?' : '&');
        $photos = array();
        foreach (EcoRepairPhoto::forRepair($id) as $ph) {
            if (in_array($ph['type'], array('entry', 'work', 'device'), true)) {
                $photos[] = array('id' => (int) $ph['id_ecorepair_photo'], 'type' => $ph['type'],
                    'thumb' => $base . 'action=photoimg&thumb=1&id=' . (int) $ph['id_ecorepair_photo'], 'full' => $base . 'action=photoimg&id=' . (int) $ph['id_ecorepair_photo']);
            }
        }
        $lines = array();
        $quoteState = 'none';
        foreach (EcoRepairQuote::forRepair($id) as $q) {
            if ($q['status'] === EcoRepairQuote::SUPERSEDED || $q['status'] === EcoRepairQuote::REJECTED) {
                continue;
            }
            foreach (EcoRepairQuote::lines((int) $q['id_ecorepair_quote']) as $l) {
                $l['quote_status'] = $q['status'];
                $lines[] = $l;
            }
            $quoteState = $q['status'];
        }
        $log = array_slice(EcoRepairLog::forRepair($id), 0, 30);
        $repeat = null;
        if ((int) $r['repeat_of']) {
            $o = EcoRepair::get((int) $r['repeat_of']);
            if ($o) {
                $repeat = array('reference' => $o['reference'], 'same' => (int) $r['repeat_same'], 'tech' => $o['tech_name'],
                    'days' => max(0, (int) floor((strtotime($r['date_add']) - strtotime($o['date_status'])) / 86400)));
            }
        }
        $kbCount = (int) $r['id_brand'] ? EcoRepairKnowledge::counts((int) $r['id_brand'], (int) $r['id_model']) : null;

        return array(
            'ok' => true,
            'repair' => $this->lite($r) + array(
                'serial' => $r['serial'], 'km' => $r['km'], 'color' => $r['color'], 'diagnosis' => (string) $r['diagnosis'],
                'accessories' => $r['accessories'], 'damages' => $r['damages'], 'id_brand' => (int) $r['id_brand'], 'id_model' => (int) $r['id_model'],
                'brand_name' => (string) $r['brand_name'], 'model_name' => (string) $r['model_name'], 'eta_date' => (string) $r['eta_date'],
                'quotes_accepted' => (int) $r['quotes_accepted'],
            ),
            'mineOrFree' => !(int) $r['id_employee_tech'] || (int) $r['id_employee_tech'] === $this->emp(),
            'photos' => $photos,
            'lines' => $lines,
            'quoteState' => $quoteState,
            'log' => $log,
            'repeat' => $repeat,
            'kbCount' => $kbCount,
            'modelParts' => (int) $r['id_brand'] ? EcoRepairParts::forModel((int) $r['id_brand'], (int) $r['id_model'], false) : array(),
            'incompat' => (int) $r['id_brand'] ? EcoRepairIncompat::forModel((int) $r['id_brand'], (int) $r['id_model']) : array(),
            'zones' => EcoRepairParts::zones(),
            'suggestedZones' => EcoRepairParts::zonesForFaults($r['faults'], $r['fault_customer'] . ' ' . $r['diagnosis']),
            'shape' => $r['category_icon'] === 'bike' ? 'bike' : 'scooter',
            'statuses' => EcoRepairStatus::all(),
            'checklistItems' => EcoRepair::checklistItems(),
            'checklist' => $r['checklist'],
            'customer' => $this->customerLite((int) $r['id_customer']),
            'draft' => $this->draftLite($id),
            'quoteInfo' => $this->quoteInfo($id),
            'trackingUrl' => $this->trackingUrl($r['tracking_code']),
            'dateIn' => date('d/m', strtotime($r['date_add'])),
            'customerShort' => trim((string) $r['firstname'] . ' ' . Tools::substr((string) $r['lastname'], 0, 1) . '.'),
        ) + $this->modelBundle((int) $r['id_brand'], (int) $r['id_model'], isset($r['model_image']) ? $r['model_image'] : '');
    }

    /** Solo si está libre. Cambiar o quitar el técnico lo hace el administrador desde el PC. */
    protected function claim(array $r)
    {
        if (!$this->emp()) {
            return array('ok' => false, 'error' => 'Tu usuario no tiene empleado de PrestaShop asignado. Díselo al administrador.');
        }
        $db = Db::getInstance();
        $db->execute('UPDATE `' . _DB_PREFIX_ . 'ecorepair` SET id_employee_tech = ' . $this->emp() . ', date_upd = NOW()
            WHERE id_ecorepair = ' . (int) $r['id_ecorepair'] . ' AND id_employee_tech = 0');
        if (!$db->Affected_Rows()) {
            $fresh = EcoRepair::get((int) $r['id_ecorepair']);

            return array('ok' => false, 'error' => 'Ya está asignada a ' . ($fresh['tech_name'] ?: 'otro técnico') . '. Solo el administrador puede cambiarla.');
        }
        EcoRepairLog::add((int) $r['id_ecorepair'], $this->emp(), 'field', 'Asignada por QR a ' . $this->staff['name'] . ' (móvil)');

        return $this->repairData(EcoRepair::get((int) $r['id_ecorepair'])) + array('claimed' => true);
    }

    protected function mustOwn(array $r)
    {
        if ((int) $r['id_employee_tech'] && (int) $r['id_employee_tech'] !== $this->emp()) {
            $this->out(array('ok' => false, 'error' => 'Esta reparación es de ' . $r['tech_name'] . '.'));
        }
        if (in_array($r['status'], array(EcoRepairStatus::DELIVERED, EcoRepairStatus::CANCELLED), true)) {
            $this->out(array('ok' => false, 'error' => 'La reparación está cerrada.'));
        }
    }

    protected function setStatus(array $r)
    {
        $this->mustOwn($r);
        $to = (string) Tools::getValue('status');
        if ($to === 'wait') {
            $res = EcoRepair::updateField((int) $r['id_ecorepair'], 'waiting_part', !(int) $r['waiting_part'], $this->emp());
        } elseif (in_array($to, array(EcoRepairStatus::DIAGNOSIS, EcoRepairStatus::REPAIR, EcoRepairStatus::READY), true)) {
            $res = EcoRepair::setStatus((int) $r['id_ecorepair'], $to, $this->emp());
            if ($res['ok'] && empty($res['unchanged'])) {
                EcoRepairMessage::statusEmail((int) $r['id_ecorepair'], $to, $this->emp(), $this->trackingUrl($r['tracking_code']));
            }
        } else {
            return array('ok' => false, 'error' => 'Desde el móvil solo se puede pasar a Diagnóstico, En reparación o Listo.');
        }
        if (!$res['ok']) {
            return $res;
        }

        return $this->repairData(EcoRepair::get((int) $r['id_ecorepair']));
    }

    protected function trackingUrl($code)
    {
        if (!Configuration::get('PS_REWRITING_SETTINGS')) {
            return $this->context->link->getModuleLink('ecorepairs', 'tracking', array('c' => $code), true);
        }

        return $this->context->link->getBaseLink() . 'seguimiento?c=' . rawurlencode($code);
    }

    protected function photo(array $r)
    {
        if (empty($_FILES['photo'])) {
            return array('ok' => false, 'error' => 'No se recibió la foto.');
        }
        $type = (string) Tools::getValue('type');
        $type = in_array($type, array('entry', 'work', 'device'), true) ? $type : 'work';
        $res = EcoRepairPhoto::saveUpload((int) $r['id_ecorepair'], $_FILES['photo'], $type, $this->emp());
        if ($res['ok'] && $type === 'device') {
            foreach (EcoRepairPhoto::forRepair((int) $r['id_ecorepair']) as $ph) {
                if ($ph['type'] === 'device' && (int) $ph['id_ecorepair_photo'] !== (int) $res['id']) {
                    EcoRepairPhoto::delete((int) $ph['id_ecorepair_photo'], $this->emp());
                }
            }
        }

        return $res['ok'] ? $this->repairData(EcoRepair::get((int) $r['id_ecorepair'])) : $res;
    }

    /**
     * Piezas que el técnico va a instalar: van al borrador del presupuesto.
     * Si el presupuesto ya está aceptado, a un presupuesto adicional en borrador. La tienda lo revisa y lo envía.
     */
    protected function addParts(array $r)
    {
        $this->open($r); // el presupuesto lo puede gestionar cualquiera (técnico o recepción)
        $new = json_decode((string) Tools::getValue('lines'), true);
        if (!is_array($new) || !$new) {
            return array('ok' => false, 'error' => 'Elige alguna pieza.');
        }
        $idRepair = (int) $r['id_ecorepair'];
        $res = EcoRepairQuote::appendToDraft($r, $new, $this->emp(), $this->staff['name'] . ' (móvil)');
        if (!$res['ok']) {
            return $res;
        }
        return $this->repairData(EcoRepair::get($idRepair)) + array('added' => $res['added']);
    }

    /** Nueva reparación desde recepción (versión sencilla). */
    protected function create()
    {
        $p = json_decode((string) Tools::getValue('payload'), true);
        if (!is_array($p)) {
            return array('ok' => false, 'error' => 'Datos no válidos.');
        }
        $idCustomer = isset($p['id_customer']) ? (int) $p['id_customer'] : 0;
        $customer = $idCustomer ? EcoRepairCustomer::info($idCustomer) : false;
        if (!$customer) {
            return array('ok' => false, 'error' => 'Elige o crea el cliente.');
        }
        $names = EcoRepairCatalog::deviceNames((int) $p['id_category'], (int) $p['id_brand'], (int) $p['id_model']);
        if (!$names) {
            return array('ok' => false, 'error' => 'Elige el equipo.');
        }
        $fields = EcoRepair::editableFields();
        $clean = array();
        foreach (array('serial', 'km', 'color', 'fault_customer', 'accessories', 'damages', 'faults') as $f) {
            $norm = EcoRepair::normalize($fields[$f], isset($p[$f]) ? $p[$f] : ($fields[$f] === 'list' ? array() : ''));
            if ($norm === false) {
                return array('ok' => false, 'error' => 'El campo «' . EcoRepair::fieldLabel($f) . '» no es válido.');
            }
            $clean[$f] = $norm[1];
        }
        if ($clean['fault_customer'] === '' && empty($p['faults'])) {
            return array('ok' => false, 'error' => 'Indica la avería.');
        }
        if (empty($p['consent_rgpd'])) {
            return array('ok' => false, 'error' => 'El cliente tiene que aceptar las condiciones y la protección de datos.');
        }
        $list = function ($k) use ($p) {
            $l = EcoRepair::cleanList(isset($p[$k]) ? $p[$k] : array());

            return $l === false ? array() : $l;
        };
        $id = EcoRepair::create(array(
            'id_customer' => $idCustomer,
            'id_address_invoice' => !empty($customer['invoice']) ? (int) $customer['invoice']['id_address'] : 0,
            'id_employee_tech' => 0,
            'id_category' => (int) $p['id_category'], 'id_brand' => (int) $p['id_brand'], 'id_model' => (int) $p['id_model'],
            'device_name' => $names['device_name'],
            'serial' => $clean['serial'], 'km' => $clean['km'] === '' ? null : (int) $clean['km'], 'color' => $clean['color'],
            'fault_customer' => $clean['fault_customer'], 'faults' => $list('faults'), 'accessories' => $list('accessories'), 'damages' => $list('damages'),
            'urgent' => !empty($p['urgent']), 'warranty' => false, 'eta_date' => '',
            'consent_rgpd' => true, 'consent_whatsapp' => !empty($p['consent_whatsapp']),
            'device_tag' => !empty($p['device_tag']) && EcoRepair::byTag((string) $p['device_tag']) ? (string) $p['device_tag'] : '',
        ), $this->emp(), (int) $this->context->shop->id);
        if (!$id) {
            return array('ok' => false, 'error' => 'No se pudo crear la reparación.');
        }
        EcoRepairCustomer::touch($idCustomer, '', true, !empty($p['consent_whatsapp']));
        EcoRepairLog::add($id, $this->emp(), 'create', 'Reparación registrada desde el móvil por ' . $this->staff['name'] . ' · ' . $names['category'] . ' · ' . $names['device_name']);
        EcoRepair::detectRepeat($id, $this->emp());
        $r = EcoRepair::get($id);
        EcoRepairMessage::statusEmail($id, EcoRepairStatus::RECEIVED, $this->emp(), $this->trackingUrl($r['tracking_code']));
        $tpl = EcoRepairMessage::templates();

        return array('ok' => true, 'id' => $id, 'reference' => $r['reference'], 'tracking' => $this->trackingUrl($r['tracking_code']),
            'phone' => EcoRepairMessage::waPhone($customer['phone']),
            'message' => EcoRepairMessage::render($tpl['received']['text'], EcoRepairMessage::values($r, $this->trackingUrl($r['tracking_code']))));
    }

    protected function icons()
    {
        $s = '<svg class="er-i" viewBox="0 0 24 24" aria-hidden="true">';

        return array(
            'qr' => $s . '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 14v7h-7"/></svg>',
            'back' => $s . '<path d="M15 18l-6-6 6-6"/></svg>',
            'plus' => $s . '<path d="M12 5v14M5 12h14"/></svg>',
            'check' => $s . '<path d="M20 6 9 17l-5-5"/></svg>',
            'x' => $s . '<path d="M18 6 6 18M6 6l12 12"/></svg>',
            'search' => $s . '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
            'camera' => $s . '<path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/></svg>',
            'user' => $s . '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
            'layers' => $s . '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></svg>',
            'send' => $s . '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
            'print' => $s . '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>',
            'phone' => $s . '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
            'mail' => $s . '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
            'copy' => $s . '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
            'link' => $s . '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
            'settings' => $s . '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
            'wrench' => $s . '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
            'alert' => $s . '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>',
            'clock' => $s . '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
            'box' => $s . '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
            'book' => $s . '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/></svg>',
            'code' => $s . '<path d="m8 9-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/></svg>',
            'pen' => $s . '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
            'logout' => $s . '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
            'whatsapp' => $s . '<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.3-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2z"/></svg>',
            'scooter' => $s . '<circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M8 18h8M15 4h3l1 14"/></svg>',
            'bike' => $s . '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M5.5 17.5 10 7h4l4.5 10.5M14 7l1-3h3"/></svg>',
            'battery' => $s . '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2M11 9l-2 3h4l-2 3"/></svg>',
            'moto' => $s . '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M8 17h7l3-6h-5l-2-4H8M15 11 13 7"/></svg>',
            'other' => $s . '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>',
            'device' => $s . '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M5.5 17.5 10 7h4l4.5 10.5M14 7l1-3h3"/></svg>',
            'refresh' => $s . '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>',
            'bolt' => $s . '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
            'mic' => $s . '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
            'pin' => $s . '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
            'trash' => $s . '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
        );
    }
}
