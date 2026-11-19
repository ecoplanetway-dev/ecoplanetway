<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . 'ecorepairs/ecorepairs.php';

/**
 * Pantallas del taller: tablero, nueva reparación, ficha e impresión.
 * Las acciones AJAX comprueban token del panel y permisos del perfil.
 */
class AdminEcoRepairsController extends ModuleAdminController
{
    /** @var EcoRepairs */
    public $module;

    public function __construct()
    {
        $this->bootstrap = true;
        $this->display = 'view';
        parent::__construct();
        $this->meta_title = 'Reparaciones';
    }

    public function init()
    {
        parent::init();
        if (!EcoRepairInstaller::ensureSchema()) {
            $this->errors[] = 'No se pudieron crear las tablas del módulo. Revisa los permisos de la base de datos.';
        }
    }

    public function setMedia($isNewTheme = false)
    {
        parent::setMedia($isNewTheme);
        $base = $this->module->getPathUri();
        $v = '?v=' . $this->module->version;
        $this->addCSS('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', 'all', null, false);
        $this->addCSS($base . 'views/css/admin.css' . $v, 'all', null, false);
        $this->addJS($base . 'views/js/common.js' . $v, false);
        $view = $this->currentView();
        if ($view === 'board') {
            $this->addJS($base . 'views/js/notify.js' . $v, false);
            $this->addJS($base . 'views/js/board.js' . $v, false);
        } elseif ($view === 'new') {
            $this->addJS($base . 'views/js/repair-form.js' . $v, false);
            $this->addJS($base . 'views/js/new.js' . $v, false);
        } elseif ($view === 'repair') {
            $this->addJS($base . 'views/js/vendor/qrcode.js' . $v, false);
            $this->addJS($base . 'views/js/repair-form.js' . $v, false);
            $this->addJS($base . 'views/js/notify.js' . $v, false);
            $this->addJS($base . 'views/js/parts.js' . $v, false);
            $this->addJS($base . 'views/js/repair.js' . $v, false);
        } elseif ($view === 'stats') {
            $this->addJS($base . 'views/js/stats.js' . $v, false);
        } elseif ($view === 'cash') {
            $this->addJS($base . 'views/js/cash.js' . $v, false);
        } elseif ($view === 'techs') {
            $this->addJS($base . 'views/js/techs.js' . $v, false);
        } elseif ($view === 'model') {
            $this->addJS($base . 'views/js/parts.js' . $v, false);
            $this->addJS($base . 'views/js/model.js' . $v, false);
        } elseif ($view === 'parts') {
            $this->addJS($base . 'views/js/parts.js' . $v, false);
        } elseif ($view === 'requests') {
            $this->addJS($base . 'views/js/notify.js' . $v, false);
            $this->addJS($base . 'views/js/requests.js' . $v, false);
        } elseif ($view === 'customer') {
            $this->addJS($base . 'views/js/repair-form.js' . $v, false);
            $this->addJS($base . 'views/js/customer.js' . $v, false);
        } elseif ($view === 'quote') {
            $this->addJS($base . 'views/js/repair-form.js' . $v, false);
            $this->addJS($base . 'views/js/quote.js' . $v, false);
        }
    }

    protected function currentView()
    {
        if (Tools::getValue('view') === 'new') {
            return 'new';
        }
        if (Tools::getValue('view') === 'stats') {
            return 'stats';
        }
        if (Tools::getValue('view') === 'cash') {
            return 'cash';
        }
        if (Tools::getValue('view') === 'requests') {
            return 'requests';
        }
        if (Tools::getValue('view') === 'techs') {
            return 'techs';
        }
        if (Tools::getValue('view') === 'parts') {
            return 'parts';
        }
        if (Tools::getValue('view') === 'model' && (int) Tools::getValue('id_brand')) {
            return 'model';
        }
        if (Tools::getValue('view') === 'customer' && (int) Tools::getValue('id_customer')) {
            return 'customer';
        }
        if ((int) Tools::getValue('id_ecorepair')) {
            return Tools::getValue('view') === 'quote' ? 'quote' : 'repair';
        }

        return 'board';
    }

    public function initToolbarTitle()
    {
        $this->toolbar_title = array('Taller', 'Reparaciones');
    }

    public function initContent()
    {
        parent::initContent();
        if ($this->ajax) {
            return;
        }

        $view = $this->currentView();
        $this->context->smarty->assign(array(
            'ecor_boot' => $this->json(array(
                'icons' => $this->icons(),
                'links' => $this->links(),
                'token' => $this->token,
            )),
            'ecor_data' => '{}',
        ));

        if ($view === 'parts') {
            $this->context->smarty->assign(array(
                'ecor_data' => $this->json(array('zones' => EcoRepairParts::zones(), 'isAdmin' => $this->isAdmin(), 'q' => (string) Tools::getValue('q'))),
                'ecor_view' => 'parts',
            ));
            $this->setTemplate('app.tpl');
        } elseif ($view === 'techs') {
            if (!$this->canSeeTechs()) {
                Tools::redirectAdmin($this->baseUrl());
            }
            $this->context->smarty->assign(array(
                'ecor_data' => $this->json(array(
                    'stats' => EcoRepairStats::technicians((int) $this->context->shop->id, date('Y-m-01'), date('Y-m-d')),
                    'from' => date('Y-m-01'),
                    'to' => date('Y-m-d'),
                )),
                'ecor_view' => 'techs',
            ));
            $this->setTemplate('app.tpl');
        } elseif ($view === 'model') {
            $idBrand = (int) Tools::getValue('id_brand');
            $idModel = (int) Tools::getValue('id_model');
            $names = Db::getInstance()->getRow('SELECT b.name AS brand, m.name AS model, m.image FROM `' . _DB_PREFIX_ . 'ecorepair_brand` b
                LEFT JOIN `' . _DB_PREFIX_ . 'ecorepair_model` m ON m.id_ecorepair_model = ' . $idModel . ' AND m.id_ecorepair_brand = b.id_ecorepair_brand
                WHERE b.id_ecorepair_brand = ' . $idBrand);
            $models = Db::getInstance()->executeS('SELECT id_ecorepair_model AS id, name FROM `' . _DB_PREFIX_ . 'ecorepair_model` WHERE id_ecorepair_brand = ' . $idBrand . ' AND active = 1 ORDER BY name') ?: array();
            $this->context->smarty->assign(array(
                'ecor_data' => $this->json(array(
                    'id_brand' => $idBrand,
                    'id_model' => $names && $names['model'] ? $idModel : 0,
                    'brand' => $names ? $names['brand'] : '',
                    'model' => $names ? (string) $names['model'] : '',
                    'image' => $names && $names['image'] ? $this->modelImageUrl($names['image']) : '',
                    'models' => array_map(function ($m) {
                        return array('id' => (int) $m['id'], 'name' => $m['name']);
                    }, $models),
                    'kb' => EcoRepairKnowledge::forModel($idBrand, $names && $names['model'] ? $idModel : 0),
                    'parts' => EcoRepairParts::forModel($idBrand, $names && $names['model'] ? $idModel : 0, $this->isAdmin()),
                    'incompat' => EcoRepairIncompat::forModel($idBrand, $names && $names['model'] ? $idModel : 0),
                    'zones' => EcoRepairParts::zones(),
                    'isAdmin' => $this->isAdmin(),
                    'shape' => (string) Db::getInstance()->getValue('SELECT c.icon FROM `' . _DB_PREFIX_ . 'ecorepair_brand` b INNER JOIN `' . _DB_PREFIX_ . 'ecorepair_category` c ON c.id_ecorepair_category = b.id_ecorepair_category WHERE b.id_ecorepair_brand = ' . $idBrand) === 'bike' ? 'bike' : 'scooter',
                    'tab' => (string) Tools::getValue('tab'),
                    'canEdit' => (bool) $this->access('edit'),
                    'canDelete' => (bool) $this->access('delete'),
                    'code' => (string) Tools::getValue('code'),
                    'from' => (int) Tools::getValue('from'),
                    'bundle' => $this->modelBundle($idBrand, $names && $names['model'] ? $idModel : 0, $names ? (string) $names['image'] : ''),
                    'modelIndex' => $this->modelIndex(),
                )),
                'ecor_view' => 'model',
            ));
            $this->setTemplate('app.tpl');
        } elseif ($view === 'requests') {
            $this->context->smarty->assign(array(
                'ecor_data' => $this->json(array(
                    'requests' => EcoRepairRequest::listFor((int) $this->context->shop->id, 'open'),
                    'statuses' => EcoRepairRequest::statuses(),
                    'counts' => EcoRepairRequest::counts((int) $this->context->shop->id),
                    'canEdit' => (bool) $this->access('edit'),
                    'preset' => (int) Tools::getValue('id_customer') ? EcoRepairCustomer::info((int) Tools::getValue('id_customer')) : null,
                )),
                'ecor_view' => 'requests',
            ));
            $this->setTemplate('app.tpl');
        } elseif ($view === 'customer') {
            $this->renderCustomer((int) Tools::getValue('id_customer'));
        } elseif ($view === 'cash') {
            $this->context->smarty->assign(array(
                'ecor_data' => $this->json(array(
                    'close' => EcoRepairPayment::dayClose((int) $this->context->shop->id, date('Y-m-d')),
                    'year' => (int) date('Y'),
                    'quarter' => (int) ceil(date('n') / 3),
                )),
                'ecor_view' => 'cash',
            ));
            $this->setTemplate('app.tpl');
        } elseif ($view === 'stats') {
            $this->context->smarty->assign(array(
                'ecor_data' => $this->json(array(
                    'categories' => $this->categoriesLite(),
                    'stats' => EcoRepairStats::get((int) $this->context->shop->id, '', ''),
                )),
                'ecor_view' => 'stats',
            ));
            $this->setTemplate('app.tpl');
        } elseif ($view === 'quote') {
            $this->renderQuote((int) Tools::getValue('id_ecorepair'));
        } elseif ($view === 'repair') {
            $this->renderRepair((int) Tools::getValue('id_ecorepair'));
        } elseif ($view === 'new') {
            $this->renderNew();
        } else {
            $this->renderBoard();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Pantallas                                                           */
    /* ------------------------------------------------------------------ */

    protected function renderBoard()
    {
        $idShop = (int) $this->context->shop->id;
        EcoRepairMessage::autoReminders($idShop, array($this, 'trackingUrl'));
        $data = array(
            'repairs' => $this->publicRepairs(EcoRepair::boardList($idShop)),
            'statuses' => EcoRepairStatus::all(),
            'board' => EcoRepairStatus::board(),
            'categories' => $this->categoriesLite(),
            'me' => (int) $this->context->employee->id,
            'lateDays' => (int) Configuration::get('ECOREPAIRS_LATE_DAYS'),
            'pickupDays' => (int) Configuration::get('ECOREPAIRS_PICKUP_DAYS'),
            'canEdit' => (bool) $this->access('edit'),
            'requestCounts' => EcoRepairRequest::counts($idShop),
            'recall' => $this->publicRepairs(EcoRepair::toRecall($idShop)),
            'recallDays' => (int) Configuration::get('ECOREPAIRS_RECALL_DAYS'),
            'models' => $this->modelIndex(),
        );
        $this->context->smarty->assign('ecor_data', $this->json($data));
        $this->context->smarty->assign('ecor_view', 'board');
        $this->setTemplate('app.tpl');
    }

    protected function renderNew()
    {
        if (!$this->access('add')) {
            $this->errors[] = 'Tu perfil no tiene permiso para crear reparaciones.';

            return;
        }
        $data = array(
            'catalog' => EcoRepairCatalog::tree(true),
            'technicians' => $this->technicians(),
            'accessories' => EcoRepairCatalog::configList('ECOREPAIRS_ACCESSORIES'),
            'damages' => EcoRepairCatalog::configList('ECOREPAIRS_DAMAGES'),
            'fieldRules' => array(
                'phone' => EcoRepairCustomer::fieldRule('phone'),
                'email' => EcoRepairCustomer::fieldRule('email'),
            ),
            'me' => (int) $this->context->employee->id,
            'canEdit' => (bool) $this->access('edit'),
            'preselectCustomer' => (int) Tools::getValue('id_customer') ? EcoRepairCustomer::info((int) Tools::getValue('id_customer')) : null,
            'fromTag' => null,
        );
        $prev = Tools::getValue('tag') ? EcoRepair::byTag((string) Tools::getValue('tag')) : false;
        if ($prev && (int) $prev['id_shop'] === (int) $this->context->shop->id) {
            $data['preselectCustomer'] = EcoRepairCustomer::info((int) $prev['id_customer']);
            $data['fromTag'] = array('tag' => $prev['device_tag'], 'reference' => $prev['reference'], 'id_category' => (int) $prev['id_category'], 'id_brand' => (int) $prev['id_brand'],
                'id_model' => (int) $prev['id_model'], 'serial' => $prev['serial'], 'color' => $prev['color'], 'device_name' => $prev['device_name']);
        }
        $this->context->smarty->assign('ecor_data', $this->json($data));
        $this->context->smarty->assign('ecor_view', 'new');
        $this->setTemplate('app.tpl');
    }

    protected function renderRepair($id)
    {
        $repair = EcoRepair::get($id);
        if (!$repair || (int) $repair['id_shop'] !== (int) $this->context->shop->id) {
            $this->logDbError('ficha ' . (int) $id);
            Tools::redirectAdmin($this->baseUrl() . '&notfound=' . (int) $id);
        }
        $customer = EcoRepairCustomer::info((int) $repair['id_customer']);
        $photos = array();
        $signature = null;
        $devicePhoto = null;
        foreach (EcoRepairPhoto::forRepair($id) as $ph) {
            if ($ph['type'] === 'device') {
                $devicePhoto = array('id' => (int) $ph['id_ecorepair_photo'], 'full' => $this->photoUrl((int) $ph['id_ecorepair_photo'], false));
                continue;
            }
            $item = array(
                'id' => (int) $ph['id_ecorepair_photo'],
                'type' => $ph['type'],
                'date' => $ph['date_add'],
                'thumb' => $this->photoUrl((int) $ph['id_ecorepair_photo'], true),
                'full' => $this->photoUrl((int) $ph['id_ecorepair_photo'], false),
                'public' => isset($ph['public']) ? (int) $ph['public'] : 0,
            );
            if ($ph['type'] === 'signature') {
                $signature = $item;
            } elseif ($ph['type'] !== 'quote_sig') {
                $photos[] = $item;
            }
        }

        $flow = EcoRepairStatus::flow();
        $idx = array_search($repair['status'], $flow, true);
        $next = ($idx !== false && $idx < count($flow) - 1) ? $flow[$idx + 1] : null;

        $data = array(
            'repair' => $this->publicRepair($repair),
            'customer' => $customer,
            'history' => $this->publicRepairs(EcoRepair::customerHistory((int) $repair['id_customer'], $id)),
            'photos' => $photos,
            'signature' => $signature,
            'log' => EcoRepairLog::forRepair($id),
            'statuses' => EcoRepairStatus::all(),
            'flow' => $flow,
            'next' => $next,
            'technicians' => $this->technicians(),
            'catalog' => EcoRepairCatalog::tree(true),
            'accessories' => EcoRepairCatalog::configList('ECOREPAIRS_ACCESSORIES'),
            'damages' => EcoRepairCatalog::configList('ECOREPAIRS_DAMAGES'),
            'trackingUrl' => $this->trackingUrl($repair['tracking_code']),
            'customerAdminUrl' => $this->context->link->getAdminLink('AdminCustomers', true, array(), array(
                'id_customer' => (int) $repair['id_customer'],
                'viewcustomer' => 1,
            )),
            'canEdit' => (bool) $this->access('edit'),
            'canDelete' => (bool) $this->access('delete'),
            'justCreated' => (bool) Tools::getValue('created'),
            'quotes' => EcoRepairQuote::summary($id),
            'quoteUrl' => $this->repairUrl($id) . '&view=quote',
            'devicePhoto' => $devicePhoto,
            'modelImage' => $this->modelImageUrl((string) $repair['model_image']),
            'payment' => $this->paymentData($repair),
            'methods' => EcoRepairPayment::methods(),
            'isAdmin' => $this->isAdmin(),
            'warrantyUntil' => EcoRepair::warrantyUntil($repair),
            'repeat' => (int) $repair['repeat_of'] ? (function ($o, $r) {
                return $o ? array('id' => (int) $o['id_ecorepair'], 'reference' => $o['reference'], 'tech' => $o['tech_name'], 'same' => (int) $r['repeat_same'],
                    'days' => max(0, (int) floor((strtotime($r['date_add']) - strtotime($o['date_status'])) / 86400))) : null;
            })(EcoRepair::get((int) $repair['repeat_of']), $repair) : null,
            'kbCount' => (int) $repair['id_brand'] ? EcoRepairKnowledge::counts((int) $repair['id_brand'], (int) $repair['id_model']) : null,
            'modelParts' => (int) $repair['id_brand'] ? EcoRepairParts::forModel((int) $repair['id_brand'], (int) $repair['id_model'], $this->isAdmin()) : array(),
            'incompat' => (int) $repair['id_brand'] ? EcoRepairIncompat::forModel((int) $repair['id_brand'], (int) $repair['id_model']) : array(),
            'zones' => EcoRepairParts::zones(),
            'suggestedZones' => EcoRepairParts::zonesForFaults($repair['faults'], $repair['fault_customer'] . ' ' . $repair['diagnosis']),
            'shape' => $repair['category_icon'] === 'bike' ? 'bike' : 'scooter',
            'modelUrl' => (int) $repair['id_brand'] ? $this->baseUrl() . '&view=model&id_brand=' . (int) $repair['id_brand'] . '&id_model=' . (int) $repair['id_model'] : '',
            'reviewUrl' => (string) Configuration::get('ECOREPAIRS_REVIEW_URL'),
            'parent' => (int) $repair['id_parent_repair'] ? EcoRepair::get((int) $repair['id_parent_repair']) : null,
            'children' => EcoRepair::children($id),
            'pickupDays' => (int) Configuration::get('ECOREPAIRS_PICKUP_DAYS'),
            'customerUrl' => $this->baseUrl() . '&view=customer&id_customer=' . (int) $repair['id_customer'],
            'requests' => EcoRepairRequest::query('rq.id_ecorepair = ' . (int) $id),
            'canMove' => array(
                'ready' => EcoRepair::canMoveTo($repair, EcoRepairStatus::READY),
                'delivered' => EcoRepair::canMoveTo($repair, EcoRepairStatus::DELIVERED),
            ),
            'checklistItems' => EcoRepair::checklistItems(),
            'checklist' => $repair['checklist'],
            'stickerUrl' => $this->ajaxUrl('printSticker', array('id_ecorepair' => $id)),
        );
        $data = array_merge($data, $this->modelBundle((int) $repair['id_brand'], (int) $repair['id_model'], (string) $repair['model_image']));
        $this->context->smarty->assign(array(
            'ecor_data' => $this->json($data),
            'ecor_repair' => $repair,
        ));
        $this->context->smarty->assign('ecor_view', 'repair');
        $this->setTemplate('app.tpl');
    }

    protected function renderQuote($id)
    {
        $repair = EcoRepair::get($id);
        if (!$repair || (int) $repair['id_shop'] !== (int) $this->context->shop->id) {
            Tools::redirectAdmin($this->baseUrl() . '&notfound=' . (int) $id);
        }
        $customer = EcoRepairCustomer::info((int) $repair['id_customer']);
        $data = array(
            'repair' => $this->publicRepair($repair),
            'customer' => array(
                'name' => $customer ? $customer['name'] : $repair['customer_name'],
                'phone' => $customer ? $customer['phone'] : '',
                'email' => $customer ? $customer['email'] : '',
            ),
            'statuses' => EcoRepairStatus::all(),
            'quotes' => EcoRepairQuote::publicList($id),
            'kits' => EcoRepairKit::all((int) $this->context->language->id, (int) $this->context->shop->id),
            'categories' => $this->categoriesLite(),
            'labourRate' => (float) str_replace(',', '.', (string) Configuration::get('ECOREPAIRS_LABOUR_RATE')),
            'taxRates' => EcoRepairQuote::taxRates(),
            'incompat' => (int) $repair['id_brand'] ? EcoRepairIncompat::forModel((int) $repair['id_brand'], (int) $repair['id_model']) : array(),
            'repairUrl' => $this->repairUrl($id),
            'canEdit' => (bool) $this->access('edit'),
            'canDelete' => (bool) $this->access('delete'),
        );
        $this->context->smarty->assign('ecor_data', $this->json($data));
        $this->context->smarty->assign('ecor_view', 'quote');
        $this->setTemplate('app.tpl');
    }

    /* ------------------------------------------------------------------ */
    /* AJAX                                                                */
    /* ------------------------------------------------------------------ */

    public function postProcess()
    {
        if (!$this->ajax) {
            return parent::postProcess();
        }
        // Si la subida supera el límite del servidor, PHP descarta todo el formulario (también el token)
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && EcoRepairPhoto::overPostLimit()) {
            $this->jsonOut(array('ok' => false, 'error' => 'La foto es demasiado grande para el servidor (máximo ' . ini_get('post_max_size') . '). Vuelve a intentarlo: se reduce sola.'), 413);
        }
        $action = (string) Tools::getValue('action');
        $map = array(
            // acción => array(método, permiso, solo POST)
            'searchRepairs' => array('ajaxSearchRepairs', 'view', false),
            'searchCustomers' => array('ajaxSearchCustomers', 'view', false),
            'customerInfo' => array('ajaxCustomerInfo', 'view', false),
            'createCustomer' => array('ajaxCreateCustomer', 'add', true),
            'addInvoiceAddress' => array('ajaxAddInvoiceAddress', 'edit', true),
            'addCatalog' => array('ajaxAddCatalog', 'edit', true),
            'createRepair' => array('ajaxCreateRepair', 'add', true),
            'updateField' => array('ajaxUpdateField', 'edit', true),
            'updateDevice' => array('ajaxUpdateDevice', 'edit', true),
            'setStatus' => array('ajaxSetStatus', 'edit', true),
            'addNote' => array('ajaxAddNote', 'edit', true),
            'uploadPhoto' => array('ajaxUploadPhoto', 'edit', true),
            'saveSignature' => array('ajaxSaveSignature', 'edit', true),
            'deletePhoto' => array('ajaxDeletePhoto', 'delete', true),
            'photo' => array('ajaxPhoto', 'view', false),
            'printReceipt' => array('ajaxPrintReceipt', 'view', false),
            'printLabel' => array('ajaxPrintLabel', 'view', false),
            'searchProducts' => array('ajaxSearchProducts', 'view', false),
            'productUpdate' => array('ajaxProductUpdate', 'edit', true),
            'quoteCreate' => array('ajaxQuoteCreate', 'edit', true),
            'quoteSave' => array('ajaxQuoteSave', 'edit', true),
            'quoteSend' => array('ajaxQuoteSend', 'edit', true),
            'quoteNewVersion' => array('ajaxQuoteNewVersion', 'edit', true),
            'quoteDiscard' => array('ajaxQuoteDiscard', 'edit', true),
            'quoteAccept' => array('ajaxQuoteAccept', 'edit', true),
            'quoteReject' => array('ajaxQuoteReject', 'edit', true),
            'kitSave' => array('ajaxKitSave', 'edit', true),
            'kitDelete' => array('ajaxKitDelete', 'delete', true),
            'printQuote' => array('ajaxPrintQuote', 'view', false),
            'hideCatalog' => array('ajaxHideCatalog', 'edit', true),
            'listOption' => array('ajaxListOption', 'edit', true),
            'modelImage' => array('ajaxModelImage', 'view', false),
            'stats' => array('ajaxStats', 'view', false),
            'updateCustomer' => array('ajaxUpdateCustomer', 'edit', true),
            'deposit' => array('ajaxDeposit', 'edit', true),
            'checkout' => array('ajaxCheckout', 'edit', true),
            'devicePhoto' => array('ajaxDevicePhoto', 'edit', true),
            'deviceReset' => array('ajaxDeviceReset', 'edit', true),
            'deviceToModel' => array('ajaxDeviceToModel', 'edit', true),
            'archive' => array('ajaxArchive', 'view', false),
            'dayClose' => array('ajaxDayClose', 'view', false),
            'printCash' => array('ajaxPrintCash', 'view', false),
            'exportQuarter' => array('ajaxExportQuarter', 'view', false),
            'notifyPreview' => array('ajaxNotifyPreview', 'view', false),
            'kbSave' => array('ajaxKbSave', 'edit', true),
            'partSave' => array('ajaxPartSave', 'edit', true),
            'incompatSave' => array('ajaxIncompatSave', 'edit', true),
            'incompatDelete' => array('ajaxIncompatDelete', 'delete', true),
            'partDelete' => array('ajaxPartDelete', 'delete', true),
            'partSearch' => array('ajaxPartSearch', 'view', false),
            'quoteAddParts' => array('ajaxQuoteAddParts', 'edit', true),
            'kbDelete' => array('ajaxKbDelete', 'delete', true),
            'kbLookup' => array('ajaxKbLookup', 'view', false),
            'photoPublic' => array('ajaxPhotoPublic', 'edit', true),
            'techDetail' => array('ajaxTechDetail', 'view', false),
            'techList' => array('ajaxTechList', 'view', false),
            'logMessage' => array('ajaxLogMessage', 'edit', true),
            'newTrackingCode' => array('ajaxNewTrackingCode', 'edit', true),
            'reopen' => array('ajaxReopen', 'add', true),
            'requests' => array('ajaxRequests', 'view', false),
            'requestSave' => array('ajaxRequestSave', 'edit', true),
            'requestStatus' => array('ajaxRequestStatus', 'edit', true),
            'zonesSave' => array('ajaxZonesSave', 'edit', true),
            'unlockSave' => array('ajaxUnlockSave', 'edit', true),
            'unlockDelete' => array('ajaxUnlockDelete', 'delete', true),
            'unlockAdd' => array('ajaxUnlockAdd', 'edit', true),
            'fixedSave' => array('ajaxFixedSave', 'edit', true),
            'fixedDelete' => array('ajaxFixedDelete', 'delete', true),
            'fixedAdd' => array('ajaxFixedAdd', 'edit', true),
            'checkToggle' => array('ajaxCheckToggle', 'edit', true),
            'recallDone' => array('ajaxRecallDone', 'edit', true),
            'printSticker' => array('ajaxPrintSticker', 'view', false),
        );
        if (!isset($map[$action])) {
            $this->jsonOut(array('ok' => false, 'error' => 'Acción desconocida.'), 400);
        }
        list($method, $perm, $postOnly) = $map[$action];

        if (Tools::getValue('token') !== $this->token) {
            $this->jsonOut(array('ok' => false, 'error' => 'La sesión ha caducado. Recarga la página.'), 403);
        }
        if ($postOnly && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonOut(array('ok' => false, 'error' => 'Método no permitido.'), 405);
        }
        if (!$this->access($perm)) {
            $this->jsonOut(array('ok' => false, 'error' => 'Tu perfil no tiene permiso para esta acción.'), 403);
        }

        $this->checkLocked($action);

        try {
            $this->{$method}();
        } catch (Exception $e) {
            PrestaShopLogger::addLog('ecorepairs: ' . $e->getMessage(), 3, null, 'EcoRepair');
            $this->jsonOut(array('ok' => false, 'error' => 'Error inesperado. Inténtalo de nuevo.'), 500);
        }
    }

    protected function ajaxSearchRepairs()
    {
        $rows = EcoRepair::search(Tools::getValue('q'), (int) $this->context->shop->id);
        $this->jsonOut(array('ok' => true, 'repairs' => $this->publicRepairs($rows)));
    }

    protected function ajaxSearchCustomers()
    {
        $this->jsonOut(array('ok' => true, 'customers' => EcoRepairCustomer::search(Tools::getValue('q'))));
    }

    protected function ajaxCustomerInfo()
    {
        $info = EcoRepairCustomer::info((int) Tools::getValue('id_customer'));
        $this->jsonOut($info ? array('ok' => true, 'customer' => $info) : array('ok' => false, 'error' => 'El cliente no existe.'));
    }

    protected function ajaxCreateCustomer()
    {
        $d = array(
            'firstname' => (string) Tools::getValue('firstname'),
            'lastname' => (string) Tools::getValue('lastname'),
            'phone' => (string) Tools::getValue('phone'),
            'email' => (string) Tools::getValue('email'),
            'invoice' => (bool) Tools::getValue('invoice'),
            'nif' => (string) Tools::getValue('nif'),
            'company' => (string) Tools::getValue('company'),
            'address' => (string) Tools::getValue('address'),
            'postcode' => (string) Tools::getValue('postcode'),
            'city' => (string) Tools::getValue('city'),
            'consent_rgpd' => (bool) Tools::getValue('consent_rgpd'),
            'consent_whatsapp' => (bool) Tools::getValue('consent_whatsapp'),
        );
        $res = EcoRepairCustomer::create($d, $this->context);
        if (!empty($res['id_customer'])) {
            $res['customer'] = EcoRepairCustomer::info((int) $res['id_customer']);
        }
        if (!empty($res['existing'])) {
            $res['existingCustomer'] = EcoRepairCustomer::info((int) $res['existing']);
        }
        $this->jsonOut($res);
    }

    protected function ajaxAddInvoiceAddress()
    {
        $idCustomer = (int) Tools::getValue('id_customer');
        $res = EcoRepairCustomer::addInvoiceAddress($idCustomer, array(
            'nif' => (string) Tools::getValue('nif'),
            'company' => (string) Tools::getValue('company'),
            'address' => (string) Tools::getValue('address'),
            'postcode' => (string) Tools::getValue('postcode'),
            'city' => (string) Tools::getValue('city'),
        ));
        if ($res['ok']) {
            $idRepair = (int) Tools::getValue('id_ecorepair');
            if ($idRepair) {
                $repair = EcoRepair::get($idRepair);
                if ($repair && (int) $repair['id_customer'] === $idCustomer) {
                    Db::getInstance()->update('ecorepair', array('id_address_invoice' => (int) $res['id_address']), 'id_ecorepair = ' . $idRepair);
                    EcoRepairLog::add($idRepair, (int) $this->context->employee->id, 'customer', 'Datos de facturación añadidos');
                }
            }
            $res['customer'] = EcoRepairCustomer::info($idCustomer);
        }
        $this->jsonOut($res);
    }

    /** Ocultar categoría, marca, modelo o avería desde la recepción (no se borra). */
    protected function ajaxHideCatalog()
    {
        $res = EcoRepairCatalog::setActive((string) Tools::getValue('type'), (int) Tools::getValue('id'), false);
        $this->jsonOut($res);
    }

    /**
     * Añadir o quitar opciones de «Entregado con el equipo» y «Daños previos» desde la recepción o la ficha.
     */
    protected function ajaxListOption()
    {
        $keys = array('accessories' => 'ECOREPAIRS_ACCESSORIES', 'damages' => 'ECOREPAIRS_DAMAGES');
        $list = (string) Tools::getValue('list');
        if (!isset($keys[$list])) {
            $this->jsonOut(array('ok' => false, 'error' => 'Lista no válida.'), 400);
        }
        $value = trim(preg_replace('/\s+/u', ' ', strip_tags((string) Tools::getValue('value'))));
        if ($value === '' || Tools::strlen($value) > 64) {
            $this->jsonOut(array('ok' => false, 'error' => 'Escribe un texto de máximo 64 caracteres.'));
        }
        $items = EcoRepairCatalog::configList($keys[$list]);
        if (Tools::getValue('op') === 'remove') {
            $items = array_values(array_filter($items, function ($i) use ($value) {
                return Tools::strtolower($i) !== Tools::strtolower($value);
            }));
        } elseif (!in_array(Tools::strtolower($value), array_map(array('Tools', 'strtolower'), $items), true)) {
            $items[] = $value;
        }
        Configuration::updateValue($keys[$list], implode("\n", $items));
        $this->jsonOut(array('ok' => true, 'options' => $items));
    }

    public function isAdmin()
    {
        return (int) $this->context->employee->id_profile === (int) _PS_ADMIN_PROFILE_;
    }

    /** El informe de técnicos solo lo ve el administrador (y los empleados que él marque en Ajustes). */
    public function canSeeTechs()
    {
        if ($this->isAdmin()) {
            return true;
        }
        $ids = array_map('intval', explode(',', (string) Configuration::get('ECOREPAIRS_TECHS_VIEWERS')));

        return in_array((int) $this->context->employee->id, $ids, true);
    }

    protected function denyTechs()
    {
        if (!$this->canSeeTechs()) {
            $this->jsonOut(array('ok' => false, 'error' => 'Solo el administrador puede ver el informe de técnicos.'), 403);
        }
    }

    /** Dirección pública de la pegatina QR del patín. */
    public function deviceUrl($tag)
    {
        if (!Configuration::get('PS_REWRITING_SETTINGS')) {
            return $this->context->link->getModuleLink('ecorepairs', 'tracking', array('d' => $tag), true);
        }

        return $this->context->link->getBaseLink() . 'seguimiento?d=' . rawurlencode($tag);
    }

    /** Datos del modelo para el dibujo de piezas: foto, zonas, piezas, deslimitación y precios cerrados. */
    protected function modelBundle($idBrand, $idModel, $image)
    {
        return array(
            'modelMap' => EcoRepairParts::modelMap($idModel),
            'modelPhoto' => $image ? $this->modelImageUrl($image) : '',
            'sections' => EcoRepairParts::sections(),
            'unlock' => $idBrand ? EcoRepairUnlock::forModel($idBrand, $idModel, $this->isAdmin()) : array(),
            'fixed' => $idBrand ? EcoRepairFixed::forModel($idBrand, $idModel) : array(),
            'unlockMethods' => EcoRepairUnlock::methods(),
        );
    }

    /**
     * Las reparaciones entregadas no se pueden cambiar, salvo el administrador. Las notas sí se pueden añadir.
     */
    protected function checkLocked($action)
    {
        $locked = array('updateField', 'updateDevice', 'setStatus', 'uploadPhoto', 'saveSignature', 'deletePhoto', 'addInvoiceAddress',
            'quoteCreate', 'quoteAddParts', 'quoteSave', 'quoteSend', 'quoteNewVersion', 'quoteDiscard', 'quoteAccept', 'quoteReject',
            'deposit', 'checkout', 'devicePhoto', 'deviceReset', 'deviceToModel', 'unlockAdd', 'fixedAdd', 'checkToggle');
        if (!in_array($action, $locked, true) || $this->isAdmin()) {
            return;
        }
        $id = (int) Tools::getValue('id_ecorepair');
        if (!$id && (int) Tools::getValue('id_quote')) {
            $q = EcoRepairQuote::get((int) Tools::getValue('id_quote'));
            $id = $q ? (int) $q['id_ecorepair'] : 0;
        }
        if (!$id && (int) Tools::getValue('id_photo')) {
            $ph = EcoRepairPhoto::get((int) Tools::getValue('id_photo'));
            $id = $ph ? (int) $ph['id_ecorepair'] : 0;
        }
        $status = $id ? (string) Db::getInstance()->getValue('SELECT status FROM `' . _DB_PREFIX_ . 'ecorepair` WHERE id_ecorepair = ' . $id) : '';
        if ($status === EcoRepairStatus::DELIVERED) {
            $this->jsonOut(array('ok' => false, 'error' => 'La reparación está entregada y bloqueada. Solo el administrador puede cambiarla.'), 403);
        }
    }

    protected function paymentData(array $repair)
    {
        $s = EcoRepairPayment::summary((int) $repair['id_ecorepair']);
        $s['orderUrl'] = $s['id_order'] ? $this->context->link->getAdminLink('AdminOrders', true, array(), array('id_order' => $s['id_order'], 'vieworder' => 1)) : '';
        $s['invoiceUrl'] = $s['id_order'] ? $this->context->link->getAdminLink('AdminPdf') . '&submitAction=generateInvoicePDF&id_order=' . $s['id_order'] : '';

        return $s;
    }

    protected function ajaxUpdateCustomer()
    {
        $idCustomer = (int) Tools::getValue('id_customer');
        $res = EcoRepairCustomer::update($idCustomer, array(
            'firstname' => (string) Tools::getValue('firstname'),
            'lastname' => (string) Tools::getValue('lastname'),
            'phone' => (string) Tools::getValue('phone'),
            'email' => (string) Tools::getValue('email'),
            'consent_whatsapp' => (bool) Tools::getValue('consent_whatsapp'),
            'invoice' => (bool) Tools::getValue('invoice'),
            'nif' => (string) Tools::getValue('nif'),
            'company' => (string) Tools::getValue('company'),
            'address' => (string) Tools::getValue('address'),
            'postcode' => (string) Tools::getValue('postcode'),
            'city' => (string) Tools::getValue('city'),
        ));
        if ($res['ok']) {
            $idRepair = (int) Tools::getValue('id_ecorepair');
            if ($idRepair) {
                $repair = EcoRepair::get($idRepair);
                if ($repair && (int) $repair['id_customer'] === $idCustomer) {
                    if ($res['id_address']) {
                        Db::getInstance()->update('ecorepair', array('id_address_invoice' => (int) $res['id_address']), 'id_ecorepair = ' . $idRepair);
                    }
                    EcoRepairLog::add($idRepair, (int) $this->context->employee->id, 'customer', 'Datos del cliente corregidos');
                }
            }
            $res['customer'] = EcoRepairCustomer::info($idCustomer);
        }
        $this->jsonOut($res);
    }

    protected function ajaxDeposit()
    {
        $repair = $this->loadRepairOr404();
        $res = EcoRepairPayment::addDeposit($repair, (string) Tools::getValue('method'), Tools::getValue('amount'), (int) $this->context->employee->id);
        $res['payment'] = $this->paymentData(EcoRepair::get((int) $repair['id_ecorepair']));
        $this->jsonOut($this->withLog($res, (int) $repair['id_ecorepair']));
    }

    protected function ajaxCheckout()
    {
        $repair = $this->loadRepairOr404();
        $res = EcoRepairPayment::checkout($repair, (string) Tools::getValue('method'), (int) $this->context->employee->id, Tools::getValue('diagnosis'));
        $idRepair = (int) $repair['id_ecorepair'];
        if ($res['ok'] && Tools::getValue('deliver')) {
            $st = EcoRepair::setStatus($idRepair, EcoRepairStatus::DELIVERED, (int) $this->context->employee->id);
            $res['delivered'] = $st['ok'];
            if ($st['ok']) {
                EcoRepairMessage::statusEmail($idRepair, EcoRepairStatus::DELIVERED, (int) $this->context->employee->id, $this->trackingUrl($repair['tracking_code']));
            }
            if (!$st['ok']) {
                $res['warning'] = $st['error'];
            }
        }
        $fresh = EcoRepair::get($idRepair);
        $res['payment'] = $this->paymentData($fresh);
        $res['repair'] = $this->publicRepair($fresh);
        $this->jsonOut($this->withLog($res, $idRepair));
    }

    protected function ajaxDevicePhoto()
    {
        $repair = $this->loadRepairOr404();
        $idRepair = (int) $repair['id_ecorepair'];
        if (empty($_FILES['photo'])) {
            $this->jsonOut(array('ok' => false, 'error' => 'No se recibió la foto.'));
        }
        $res = EcoRepairPhoto::saveUpload($idRepair, $_FILES['photo'], 'device', (int) $this->context->employee->id);
        if ($res['ok']) {
            foreach (EcoRepairPhoto::forRepair($idRepair) as $ph) {
                if ($ph['type'] === 'device' && (int) $ph['id_ecorepair_photo'] !== (int) $res['id']) {
                    EcoRepairPhoto::delete((int) $ph['id_ecorepair_photo'], (int) $this->context->employee->id);
                }
            }
            $res['devicePhoto'] = array('id' => (int) $res['id'], 'full' => $this->photoUrl((int) $res['id'], false));
            $res['modelHasImage'] = (string) $repair['model_image'] !== '';
        }
        $this->jsonOut($this->withLog($res, $idRepair));
    }

    protected function ajaxDeviceReset()
    {
        $repair = $this->loadRepairOr404();
        foreach (EcoRepairPhoto::forRepair((int) $repair['id_ecorepair']) as $ph) {
            if ($ph['type'] === 'device') {
                EcoRepairPhoto::delete((int) $ph['id_ecorepair_photo'], (int) $this->context->employee->id);
            }
        }
        $this->jsonOut($this->withLog(array('ok' => true), (int) $repair['id_ecorepair']));
    }

    protected function ajaxDeviceToModel()
    {
        $repair = $this->loadRepairOr404();
        if (!(int) $repair['id_model']) {
            $this->jsonOut(array('ok' => false, 'error' => 'La reparación no tiene modelo elegido.'));
        }
        $photo = null;
        foreach (EcoRepairPhoto::forRepair((int) $repair['id_ecorepair']) as $ph) {
            if ($ph['type'] === 'device') {
                $photo = $ph;
            }
        }
        if (!$photo) {
            $this->jsonOut(array('ok' => false, 'error' => 'Primero haz la foto del equipo.'));
        }
        $copy = EcoRepairPhoto::copyToModel($photo);
        if (!$copy['ok']) {
            $this->jsonOut($copy);
        }
        $res = EcoRepairCatalog::setModelImage((int) $repair['id_model'], $copy['file']);
        if ($res['ok']) {
            EcoRepairLog::add((int) $repair['id_ecorepair'], (int) $this->context->employee->id, 'photo', 'Foto guardada también como foto del modelo ' . $repair['device_name']);
            $res['modelImage'] = $this->modelImageUrl($copy['file']);
        }
        $this->jsonOut($this->withLog($res, (int) $repair['id_ecorepair']));
    }

    protected function ajaxArchive()
    {
        $rows = EcoRepair::archive(
            (int) $this->context->shop->id,
            (string) Tools::getValue('status'),
            (string) Tools::getValue('from'),
            (string) Tools::getValue('to'),
            (string) Tools::getValue('q')
        );
        $this->jsonOut(array('ok' => true, 'repairs' => $this->publicRepairs($rows)));
    }

    protected function ajaxDayClose()
    {
        $this->jsonOut(array('ok' => true, 'close' => EcoRepairPayment::dayClose((int) $this->context->shop->id, (string) Tools::getValue('date'))));
    }

    protected function ajaxPrintCash()
    {
        $close = EcoRepairPayment::dayClose((int) $this->context->shop->id, (string) Tools::getValue('date'));
        $this->context->smarty->assign(array(
            'close' => $close,
            'shopName' => Configuration::get('PS_SHOP_NAME'),
            'employee' => trim($this->context->employee->firstname . ' ' . $this->context->employee->lastname),
            'printDate' => date('d/m/Y H:i'),
        ));
        header('Content-Type: text/html; charset=utf-8');
        echo $this->context->smarty->fetch($this->module->getLocalPath() . 'views/templates/admin/print_cash.tpl');
        exit;
    }

    protected function ajaxExportQuarter()
    {
        $res = EcoRepairPayment::quarterCsv((int) $this->context->shop->id, (int) Tools::getValue('year'), (int) Tools::getValue('quarter'), (int) $this->context->language->id);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $res['filename'] . '"');
        header('Cache-Control: no-store');
        echo $res['csv'];
        exit;
    }

    /** Textos de WhatsApp ya rellenados para una reparación o un encargo. */
    protected function ajaxNotifyPreview()
    {
        $tpl = EcoRepairMessage::templates();
        $idRequest = (int) Tools::getValue('id_request');
        if ($idRequest) {
            $rq = EcoRepairRequest::get($idRequest);
            if (!$rq) {
                $this->jsonOut(array('ok' => false, 'error' => 'El encargo no existe.'), 404);
            }
            $c = EcoRepairCustomer::info($rq['id_customer']);
            $vals = array('{nombre}' => $c ? $c['firstname'] : '', '{encargo}' => $rq['request'] . ($rq['for_device'] ? ' (' . $rq['for_device'] . ')' : ''),
                '{tienda}' => Configuration::get('PS_SHOP_NAME'), '{total}' => $rq['price'] > 0 ? EcoRepairQuote::money($rq['price'] - $rq['deposit']) : '');
            $this->jsonOut(array('ok' => true, 'phone' => $c ? $c['phone'] : '', 'consent' => $c ? (int) $c['consent_whatsapp'] : 0, 'name' => $c ? $c['name'] : '',
                'templates' => array('request' => array('name' => $tpl['request']['name'], 'text' => EcoRepairMessage::render($tpl['request']['text'], $vals))), 'default' => 'request'));
        }
        $repair = $this->loadRepairOr404();
        $vals = EcoRepairMessage::values($repair, $this->trackingUrl($repair['tracking_code']));
        $out = array();
        foreach ($tpl as $k => $t) {
            if ($k !== 'request') {
                $out[$k] = array('name' => $t['name'], 'text' => EcoRepairMessage::render($t['text'], $vals));
            }
        }
        $default = array('delivered' => 'review', 'received' => 'received', 'quote' => 'quote', 'ready' => (int) $repair['days_in_status'] >= (int) Configuration::get('ECOREPAIRS_PICKUP_DAYS') ? 'reminder' : 'ready');
        $c = EcoRepairCustomer::info((int) $repair['id_customer']);
        $this->jsonOut(array('ok' => true, 'phone' => $c ? $c['phone'] : '', 'consent' => $c ? (int) $c['consent_whatsapp'] : 0, 'name' => $c ? $c['name'] : '',
            'templates' => $out, 'default' => isset($default[$repair['status']]) ? $default[$repair['status']] : 'received'));
    }

    protected function ajaxLogMessage()
    {
        $idRepair = (int) Tools::getValue('id_ecorepair');
        $idRequest = (int) Tools::getValue('id_request');
        $idCustomer = 0;
        if ($idRepair) {
            $repair = $this->loadRepairOr404();
            $idCustomer = (int) $repair['id_customer'];
            if ((string) Tools::getValue('template') === 'reminder') {
                Db::getInstance()->update('ecorepair', array('date_reminder' => date('Y-m-d H:i:s')), 'id_ecorepair = ' . $idRepair);
            }
        } elseif ($idRequest) {
            $rq = EcoRepairRequest::get($idRequest);
            if (!$rq) {
                $this->jsonOut(array('ok' => false, 'error' => 'El encargo no existe.'), 404);
            }
            $idCustomer = $rq['id_customer'];
            if ($rq['status'] === 'arrived') {
                EcoRepairRequest::setStatus($idRequest, 'notified', (int) $this->context->shop->id, (int) $this->context->employee->id);
            }
        }
        EcoRepairMessage::log($idRepair, $idRequest, $idCustomer, 'whatsapp', (string) Tools::getValue('template'),
            EcoRepairMessage::waPhone(Tools::getValue('phone')), (string) Tools::getValue('body'), (int) $this->context->employee->id);
        $this->jsonOut($idRepair ? $this->withLog(array('ok' => true), $idRepair) : array('ok' => true));
    }

    protected function ajaxNewTrackingCode()
    {
        $repair = $this->loadRepairOr404();
        $code = EcoRepair::newTrackingCode((int) $repair['id_ecorepair'], (int) $this->context->employee->id);
        $this->jsonOut($this->withLog(array('ok' => true, 'code' => $code, 'url' => $this->trackingUrl($code)), (int) $repair['id_ecorepair']));
    }

    protected function ajaxReopen()
    {
        $repair = $this->loadRepairOr404();
        $res = EcoRepair::reopen($repair, (string) Tools::getValue('reason'), (int) $this->context->employee->id);
        if ($res['ok']) {
            $res['url'] = $this->repairUrl($res['id']);
        }
        $this->jsonOut($res);
    }

    protected function ajaxRequests()
    {
        $this->jsonOut(array('ok' => true,
            'requests' => EcoRepairRequest::listFor((int) $this->context->shop->id, (string) Tools::getValue('status'), (string) Tools::getValue('q')),
            'counts' => EcoRepairRequest::counts((int) $this->context->shop->id)));
    }

    protected function ajaxRequestSave()
    {
        $id = (int) Tools::getValue('id_request');
        $res = EcoRepairRequest::save($id, array(
            'id_customer' => (int) Tools::getValue('id_customer'),
            'request' => (string) Tools::getValue('request'),
            'for_device' => (string) Tools::getValue('for_device'),
            'qty' => (int) Tools::getValue('qty', 1),
            'supplier' => (string) Tools::getValue('supplier'),
            'price' => Tools::getValue('price'),
            'deposit' => Tools::getValue('deposit'),
            'notes' => (string) Tools::getValue('notes'),
            'id_ecorepair' => (int) Tools::getValue('id_ecorepair'),
            'id_product' => (int) Tools::getValue('id_product'),
            'id_product_attribute' => (int) Tools::getValue('id_product_attribute'),
        ), (int) $this->context->shop->id, (int) $this->context->employee->id);
        if ($res['ok']) {
            $res['request'] = EcoRepairRequest::get($res['id']);
        }
        $this->jsonOut($res);
    }

    protected function ajaxRequestStatus()
    {
        $res = EcoRepairRequest::setStatus((int) Tools::getValue('id_request'), (string) Tools::getValue('status'), (int) $this->context->shop->id, (int) $this->context->employee->id);
        if ($res['ok']) {
            $res['request'] = EcoRepairRequest::get((int) Tools::getValue('id_request'));
        }
        $this->jsonOut($res);
    }

    /** Ficha completa del cliente. */
    protected function renderCustomer($idCustomer)
    {
        $c = EcoRepairCustomer::info($idCustomer);
        if (!$c) {
            Tools::redirectAdmin($this->baseUrl());
        }
        $repairs = array();
        $devices = array();
        foreach (EcoRepair::customerHistory($idCustomer, 0) as $r) {
            $pr = $this->publicRepair($r);
            $pay = EcoRepairPayment::summary((int) $r['id_ecorepair']);
            $pr['total'] = $pay['due'];
            $pr['warranty_until'] = EcoRepair::warrantyUntil($r);
            $repairs[] = $pr;
            $key = Tools::strtolower($r['device_name'] . '|' . $r['serial']);
            if (!isset($devices[$key])) {
                $devices[$key] = array('device' => $r['device_name'], 'serial' => $r['serial'], 'category' => (string) $r['category_name'], 'count' => 0, 'last' => $r['date_add'],
                    'warranty_until' => '', 'cover' => $pr['cover']);
            }
            ++$devices[$key]['count'];
            if ($pr['warranty_until'] > $devices[$key]['warranty_until']) {
                $devices[$key]['warranty_until'] = $pr['warranty_until'];
            }
        }
        $p = _DB_PREFIX_;
        $idLang = (int) $this->context->language->id;
        $orders = array();
        foreach (Db::getInstance()->executeS("SELECT o.id_order, o.reference, o.date_add, o.total_paid_tax_incl, o.payment, osl.name AS state, os.color
                FROM `{$p}orders` o
                LEFT JOIN `{$p}order_state` os ON os.id_order_state = o.current_state
                LEFT JOIN `{$p}order_state_lang` osl ON osl.id_order_state = o.current_state AND osl.id_lang = {$idLang}
                WHERE o.id_customer = " . (int) $idCustomer . ' ORDER BY o.date_add DESC LIMIT 50') ?: array() as $o) {
            $items = Db::getInstance()->executeS("SELECT product_name, product_quantity FROM `{$p}order_detail` WHERE id_order = " . (int) $o['id_order']) ?: array();
            $orders[] = array('id' => (int) $o['id_order'], 'reference' => $o['reference'], 'date' => $o['date_add'], 'total' => round((float) $o['total_paid_tax_incl'], 2),
                'payment' => $o['payment'], 'state' => (string) $o['state'], 'color' => (string) $o['color'],
                'items' => array_map(function ($i) {
                    return (int) $i['product_quantity'] . ' × ' . $i['product_name'];
                }, $items),
                // Garantía legal de 3 años para lo comprado
                'warranty_until' => date('Y-m-d', strtotime($o['date_add'] . ' +3 years')),
                'url' => $this->context->link->getAdminLink('AdminOrders', true, array(), array('id_order' => (int) $o['id_order'], 'vieworder' => 1)));
        }
        $data = array(
            'customer' => $c,
            'repairs' => $repairs,
            'devices' => array_values($devices),
            'orders' => $orders,
            'messages' => EcoRepairMessage::forCustomer($idCustomer),
            'requests' => EcoRepairRequest::query('rq.id_customer = ' . (int) $idCustomer),
            'statuses' => EcoRepairStatus::all(),
            'requestStatuses' => EcoRepairRequest::statuses(),
            'canEdit' => (bool) $this->access('edit'),
            'customerAdminUrl' => $this->context->link->getAdminLink('AdminCustomers', true, array(), array('id_customer' => (int) $idCustomer, 'viewcustomer' => 1)),
        );
        $this->context->smarty->assign(array('ecor_data' => $this->json($data), 'ecor_view' => 'customer'));
        $this->setTemplate('app.tpl');
    }

    protected function ajaxPartSave()
    {
        $d = json_decode((string) Tools::getValue('data'), true) ?: array();
        $id = (int) Tools::getValue('id');
        if (!$this->isAdmin()) {
            // Los datos del proveedor solo los cambia el administrador
            foreach (array('supplier_name', 'supplier_ref', 'supplier_url', 'supplier_price') as $k) {
                unset($d[$k]);
            }
            if ($id) {
                $old = Db::getInstance()->getRow('SELECT supplier_name, supplier_ref, supplier_url, supplier_price FROM `' . _DB_PREFIX_ . 'ecorepair_part` WHERE id_ecorepair_part = ' . $id);
                $d = array_merge($d, $old ?: array());
            }
        }
        $res = EcoRepairParts::save($id, (int) Tools::getValue('id_brand'), (int) Tools::getValue('id_model'), $d);
        $res['parts'] = EcoRepairParts::forModel((int) Tools::getValue('id_brand'), (int) Tools::getValue('id_model'), $this->isAdmin());
        $this->jsonOut($res);
    }

    protected function ajaxIncompatSave()
    {
        $idBrand = (int) Tools::getValue('id_brand');
        $idModel = (int) Tools::getValue('id_model');
        $res = EcoRepairIncompat::save($idBrand, $idModel, json_decode((string) Tools::getValue('data'), true) ?: array(),
            trim($this->context->employee->firstname . ' ' . $this->context->employee->lastname));
        $idRepair = (int) Tools::getValue('id_ecorepair');
        if ($res['ok'] && $idRepair) {
            $d = json_decode((string) Tools::getValue('data'), true) ?: array();
            EcoRepairLog::add($idRepair, (int) $this->context->employee->id, 'field', 'Apuntado como no compatible con el modelo: ' . (isset($d['label']) ? $d['label'] : '') . ' · ' . (isset($d['reason']) ? $d['reason'] : ''));
        }
        // Al guardar desde un modelo concreto se devuelven los de ese modelo (incluye los de la marca)
        $res['incompat'] = EcoRepairIncompat::forModel($idBrand, (int) Tools::getValue('view_model', $idModel));
        $this->jsonOut($res);
    }

    protected function ajaxIncompatDelete()
    {
        $res = EcoRepairIncompat::delete((int) Tools::getValue('id'));
        $res['incompat'] = EcoRepairIncompat::forModel((int) Tools::getValue('id_brand'), (int) Tools::getValue('id_model'));
        $this->jsonOut($res);
    }

    protected function ajaxPartDelete()
    {
        $res = EcoRepairParts::delete((int) Tools::getValue('id'));
        $res['parts'] = EcoRepairParts::forModel((int) Tools::getValue('id_brand'), (int) Tools::getValue('id_model'), $this->isAdmin());
        $this->jsonOut($res);
    }

    protected function ajaxPartSearch()
    {
        $this->jsonOut(array('ok' => true, 'results' => EcoRepairParts::search((string) Tools::getValue('q'), $this->isAdmin())));
    }

    protected function ajaxQuoteAddParts()
    {
        $repair = $this->loadRepairOr404();
        $lines = json_decode((string) Tools::getValue('lines'), true);
        $res = EcoRepairQuote::appendToDraft($repair, is_array($lines) ? $lines : array(), (int) $this->context->employee->id, '');
        if ($res['ok']) {
            $res['quotes'] = EcoRepairQuote::summary((int) $repair['id_ecorepair']);
        }
        $this->jsonOut($this->withLog($res, (int) $repair['id_ecorepair']));
    }

    protected function modelIndex()
    {
        $out = EcoRepairCatalog::modelIndex();
        foreach ($out as &$m) {
            $m['image'] = $m['image'] ? $this->modelImageUrl($m['image']) : '';
        }
        unset($m);

        return $out;
    }

    protected function ajaxZonesSave()
    {
        $this->jsonOut(EcoRepairParts::saveModelMap((int) Tools::getValue('id_model'), (string) Tools::getValue('map')));
    }

    protected function ajaxUnlockSave()
    {
        $idBrand = (int) Tools::getValue('id_brand');
        $res = EcoRepairUnlock::save((int) Tools::getValue('id'), $idBrand, (int) Tools::getValue('id_model'), json_decode((string) Tools::getValue('data'), true) ?: array(),
            trim($this->context->employee->firstname . ' ' . $this->context->employee->lastname), $this->isAdmin());
        $res['unlock'] = EcoRepairUnlock::forModel($idBrand, (int) Tools::getValue('view_model'), $this->isAdmin());
        $this->jsonOut($res);
    }

    protected function ajaxUnlockDelete()
    {
        $res = EcoRepairUnlock::delete((int) Tools::getValue('id'));
        $res['unlock'] = EcoRepairUnlock::forModel((int) Tools::getValue('id_brand'), (int) Tools::getValue('view_model'), $this->isAdmin());
        $this->jsonOut($res);
    }

    protected function ajaxUnlockAdd()
    {
        $repair = $this->loadRepairOr404();
        $res = EcoRepairUnlock::addToQuote($repair, (int) Tools::getValue('id'), (int) $this->context->employee->id, '');
        if ($res['ok']) {
            $res['quotes'] = EcoRepairQuote::summary((int) $repair['id_ecorepair']);
        }
        $this->jsonOut($this->withLog($res, (int) $repair['id_ecorepair']));
    }

    protected function ajaxFixedSave()
    {
        $idBrand = (int) Tools::getValue('id_brand');
        $res = EcoRepairFixed::save((int) Tools::getValue('id'), $idBrand, (int) Tools::getValue('id_model'), json_decode((string) Tools::getValue('data'), true) ?: array());
        $res['fixed'] = EcoRepairFixed::forModel($idBrand, (int) Tools::getValue('view_model'));
        $this->jsonOut($res);
    }

    protected function ajaxFixedDelete()
    {
        $res = EcoRepairFixed::delete((int) Tools::getValue('id'));
        $res['fixed'] = EcoRepairFixed::forModel((int) Tools::getValue('id_brand'), (int) Tools::getValue('view_model'));
        $this->jsonOut($res);
    }

    protected function ajaxFixedAdd()
    {
        $repair = $this->loadRepairOr404();
        $res = EcoRepairFixed::addToQuote($repair, (int) Tools::getValue('id'), (int) $this->context->employee->id, '');
        if ($res['ok']) {
            $res['quotes'] = EcoRepairQuote::summary((int) $repair['id_ecorepair']);
        }
        $this->jsonOut($this->withLog($res, (int) $repair['id_ecorepair']));
    }

    protected function ajaxRecallDone()
    {
        $repair = $this->loadRepairOr404();
        Db::getInstance()->update('ecorepair', array('date_reminder' => date('Y-m-d H:i:s')), 'id_ecorepair = ' . (int) $repair['id_ecorepair']);
        EcoRepairLog::add((int) $repair['id_ecorepair'], (int) $this->context->employee->id, 'note', 'Se ha vuelto a avisar al cliente para que recoja el equipo');
        $this->jsonOut(array('ok' => true));
    }

    protected function ajaxCheckToggle()
    {
        $repair = $this->loadRepairOr404();
        $res = EcoRepair::checklistToggle($repair, (string) Tools::getValue('item'), trim($this->context->employee->firstname . ' ' . $this->context->employee->lastname),
            (int) $this->context->employee->id);
        $this->jsonOut($this->withLog($res, (int) $repair['id_ecorepair']));
    }

    /** Pegatina QR fija del patín (historial y garantía). En rollo de etiquetas o en hoja A4 de 24. */
    protected function ajaxPrintSticker()
    {
        $repair = EcoRepair::get((int) Tools::getValue('id_ecorepair'));
        if (!$repair || (int) $repair['id_shop'] !== (int) $this->context->shop->id) {
            header('HTTP/1.1 404 Not Found');
            echo 'La reparación no existe.';
            exit;
        }
        $tag = EcoRepair::deviceTag($repair);
        $label = Configuration::get('ECOREPAIRS_LABEL_SIZE');
        $this->context->smarty->assign(array(
            'r' => $repair,
            'tag' => $tag,
            'url' => $this->deviceUrl($tag),
            'format' => Tools::getValue('format') === 'a4' ? 'a4' : 'roll',
            'pos' => max(1, min(24, (int) Tools::getValue('pos', 1))),
            'label' => in_array($label, array('62x29', '50x25', '62x100'), true) ? $label : '62x29',
            'logo' => EcoRepairs::logoUrl(),
            'shopName' => Configuration::get('PS_SHOP_NAME'),
            'qrJs' => $this->module->getPathUri() . 'views/js/vendor/qrcode.js',
            'selfUrl' => $this->ajaxUrl('printSticker', array('id_ecorepair' => (int) $repair['id_ecorepair'])),
        ));
        header('Content-Type: text/html; charset=utf-8');
        header('X-Robots-Tag: noindex');
        echo $this->context->smarty->fetch($this->module->getLocalPath() . 'views/templates/admin/print_sticker.tpl');
        exit;
    }

    protected function ajaxKbSave()
    {
        $res = EcoRepairKnowledge::save((string) Tools::getValue('type'), (int) Tools::getValue('id'), (int) Tools::getValue('id_brand'), (int) Tools::getValue('id_model'),
            json_decode((string) Tools::getValue('data'), true) ?: array(), trim($this->context->employee->firstname . ' ' . $this->context->employee->lastname));
        if ($res['ok']) {
            $res['kb'] = EcoRepairKnowledge::forModel((int) Tools::getValue('id_brand'), (int) Tools::getValue('id_model'));
        }
        $this->jsonOut($res);
    }

    protected function ajaxKbDelete()
    {
        $res = EcoRepairKnowledge::delete((string) Tools::getValue('type'), (int) Tools::getValue('id'));
        $res['kb'] = EcoRepairKnowledge::forModel((int) Tools::getValue('id_brand'), (int) Tools::getValue('id_model'));
        $this->jsonOut($res);
    }

    protected function ajaxKbLookup()
    {
        $this->jsonOut(array('ok' => true, 'kb' => EcoRepairKnowledge::forModel((int) Tools::getValue('id_brand'), (int) Tools::getValue('id_model'))));
    }

    protected function ajaxPhotoPublic()
    {
        $ph = EcoRepairPhoto::get((int) Tools::getValue('id_photo'));
        $repair = $ph ? EcoRepair::get((int) $ph['id_ecorepair']) : false;
        if (!$repair || (int) $repair['id_shop'] !== (int) $this->context->shop->id) {
            $this->jsonOut(array('ok' => false, 'error' => 'La foto no existe.'), 404);
        }
        $on = Tools::getValue('public') ? 1 : 0;
        Db::getInstance()->update('ecorepair_photo', array('public' => $on), 'id_ecorepair_photo = ' . (int) $ph['id_ecorepair_photo']);
        EcoRepairLog::add((int) $ph['id_ecorepair'], (int) $this->context->employee->id, 'photo', $on ? 'Foto visible para el cliente en el seguimiento' : 'Foto oculta al cliente');
        $this->jsonOut($this->withLog(array('ok' => true, 'public' => $on), (int) $ph['id_ecorepair']));
    }

    protected function ajaxTechList()
    {
        $this->denyTechs();
        list($from, $to) = EcoRepairStats::cleanRange((string) Tools::getValue('from'), (string) Tools::getValue('to'));
        $this->jsonOut(array('ok' => true, 'stats' => EcoRepairStats::technicians((int) $this->context->shop->id, $from, $to), 'from' => $from, 'to' => $to));
    }

    protected function ajaxTechDetail()
    {
        $this->denyTechs();
        $this->jsonOut(array('ok' => true, 'detail' => EcoRepairStats::techDetail((int) $this->context->shop->id, (int) Tools::getValue('id_employee'),
            (string) Tools::getValue('from'), (string) Tools::getValue('to'))));
    }

    protected function ajaxStats()
    {
        $this->jsonOut(array('ok' => true, 'stats' => EcoRepairStats::get(
            (int) $this->context->shop->id,
            (string) Tools::getValue('from'),
            (string) Tools::getValue('to'),
            (int) Tools::getValue('id_category')
        )));
    }

    protected function ajaxModelImage()
    {
        if (!EcoRepairPhoto::outputModelImage((string) Tools::getValue('f'))) {
            header('HTTP/1.1 404 Not Found');
        }
        exit;
    }

    protected function ajaxAddCatalog()
    {
        $res = EcoRepairCatalog::add(
            (string) Tools::getValue('type'),
            (int) Tools::getValue('id_parent'),
            (string) Tools::getValue('name'),
            (string) Tools::getValue('icon', 'other')
        );
        $image = trim((string) Tools::getValue('image'));
        if ($res['ok'] && Tools::getValue('type') === 'model' && $image !== '') {
            $img = EcoRepairCatalog::setModelImage((int) $res['id'], $image);
            $res['image'] = $img['ok'] ? $image : '';
            if (!$img['ok']) {
                $res['warning'] = $img['error'];
            }
        }
        $this->jsonOut($res);
    }

    protected function ajaxCreateRepair()
    {
        $p = json_decode((string) Tools::getValue('payload'), true);
        if (!is_array($p)) {
            $this->jsonOut(array('ok' => false, 'error' => 'Datos no válidos.'), 400);
        }
        $errors = array();

        $idCustomer = isset($p['id_customer']) ? (int) $p['id_customer'] : 0;
        $customer = $idCustomer ? EcoRepairCustomer::info($idCustomer) : false;
        if (!$customer) {
            $errors['customer'] = 'Elige o crea un cliente.';
        }

        $idCategory = isset($p['id_category']) ? (int) $p['id_category'] : 0;
        $idBrand = isset($p['id_brand']) ? (int) $p['id_brand'] : 0;
        $idModel = isset($p['id_model']) ? (int) $p['id_model'] : 0;
        $names = EcoRepairCatalog::deviceNames($idCategory, $idBrand, $idModel);
        if (!$names) {
            $errors['device'] = 'Elige la categoría del equipo.';
        }

        $fields = EcoRepair::editableFields();
        $clean = array();
        foreach (array('serial', 'km', 'color', 'fault_customer', 'accessories', 'damages', 'faults', 'eta_date') as $f) {
            $raw = isset($p[$f]) ? $p[$f] : ($fields[$f] === 'list' ? array() : '');
            $norm = EcoRepair::normalize($fields[$f], $raw);
            if ($norm === false) {
                $errors[$f] = 'El campo "' . EcoRepair::fieldLabel($f) . '" no es válido.';
                continue;
            }
            $clean[$f] = $norm[1];
        }
        if (empty($clean['fault_customer']) && empty($p['faults'])) {
            $errors['fault_customer'] = 'Indica la avería: elige una frecuente o escríbela.';
        }
        $idTech = isset($p['id_employee_tech']) ? (int) $p['id_employee_tech'] : 0;
        if ($idTech) {
            $emp = new Employee($idTech);
            if (!Validate::isLoadedObject($emp) || (!$emp->active && !in_array($idTech, EcoRepairStaff::techEmployeeIds(), true))) {
                $errors['tech'] = 'Ese técnico no existe.';
            }
        }
        if (empty($p['consent_rgpd'])) {
            $errors['consent_rgpd'] = 'El cliente tiene que aceptar las condiciones y la protección de datos.';
        }
        if ($errors) {
            $this->jsonOut(array('ok' => false, 'errors' => $errors));
        }

        $idAddress = !empty($customer['invoice']) ? (int) $customer['invoice']['id_address'] : 0;
        $id = EcoRepair::create(array(
            'id_customer' => $idCustomer,
            'id_address_invoice' => $idAddress,
            'id_employee_tech' => $idTech,
            'id_category' => $idCategory,
            'id_brand' => $idBrand,
            'id_model' => $idModel,
            'device_name' => $names['device_name'],
            'serial' => $clean['serial'],
            'km' => $clean['km'] === '' ? null : (int) $clean['km'],
            'color' => $clean['color'],
            'fault_customer' => $clean['fault_customer'],
            'faults' => $this->listValue($p, 'faults'),
            'accessories' => $this->listValue($p, 'accessories'),
            'damages' => $this->listValue($p, 'damages'),
            'urgent' => !empty($p['urgent']),
            'warranty' => !empty($p['warranty']),
            'eta_date' => $clean['eta_date'],
            'consent_rgpd' => !empty($p['consent_rgpd']),
            'consent_whatsapp' => !empty($p['consent_whatsapp']),
            'device_tag' => !empty($p['device_tag']) && EcoRepair::byTag((string) $p['device_tag']) ? (string) $p['device_tag'] : '',
        ), (int) $this->context->employee->id, (int) $this->context->shop->id);

        if (!$id) {
            $this->jsonOut(array('ok' => false, 'error' => 'No se pudo crear la reparación.'));
        }
        EcoRepairCustomer::touch($idCustomer, isset($p['phone']) ? (string) $p['phone'] : '', !empty($p['consent_rgpd']), !empty($p['consent_whatsapp']));
        EcoRepairLog::add($id, (int) $this->context->employee->id, 'create', 'Reparación registrada · ' . $names['category'] . ' · ' . $names['device_name']);
        EcoRepair::detectRepeat($id, (int) $this->context->employee->id);
        EcoRepairMessage::statusEmail($id, EcoRepairStatus::RECEIVED, (int) $this->context->employee->id, $this->trackingUrl(EcoRepair::get($id)['tracking_code']));

        $repair = EcoRepair::get($id);
        $this->jsonOut(array(
            'ok' => true,
            'id' => $id,
            'reference' => $repair['reference'],
            'url' => $this->repairUrl($id) . '&created=1',
            'printUrl' => $this->ajaxUrl('printReceipt', array('id_ecorepair' => $id)),
            'labelUrl' => $this->ajaxUrl('printLabel', array('id_ecorepair' => $id)),
        ));
    }

    protected function listValue(array $p, $key)
    {
        $list = EcoRepair::cleanList(isset($p[$key]) ? $p[$key] : array());

        return $list === false ? array() : $list;
    }

    protected function loadRepairOr404()
    {
        $id = (int) Tools::getValue('id_ecorepair');
        $repair = $id ? EcoRepair::get($id) : false;
        if (!$repair || (int) $repair['id_shop'] !== (int) $this->context->shop->id) {
            $this->jsonOut(array('ok' => false, 'error' => 'La reparación no existe.'), 404);
        }

        return $repair;
    }

    protected function ajaxUpdateField()
    {
        $repair = $this->loadRepairOr404();
        $field = (string) Tools::getValue('field');
        if ($field === 'id_employee_tech' && (int) $repair['id_employee_tech'] && !$this->isAdmin()) {
            $this->jsonOut(array('ok' => false, 'error' => 'Ya tiene técnico. Solo el administrador puede cambiarlo o dejarlo sin asignar.'));
        }
        $value = Tools::getValue('value');
        if (in_array($field, array('accessories', 'damages', 'faults'), true)) {
            $value = json_decode((string) $value, true);
        }
        $res = EcoRepair::updateField((int) $repair['id_ecorepair'], $field, $value, (int) $this->context->employee->id);
        $this->jsonOut($this->withLog($res, (int) $repair['id_ecorepair']));
    }

    protected function ajaxUpdateDevice()
    {
        $repair = $this->loadRepairOr404();
        $res = EcoRepair::updateDevice(
            (int) $repair['id_ecorepair'],
            (int) Tools::getValue('id_category'),
            (int) Tools::getValue('id_brand'),
            (int) Tools::getValue('id_model'),
            (int) $this->context->employee->id
        );
        if ($res['ok']) {
            $res['repair'] = $this->publicRepair(EcoRepair::get((int) $repair['id_ecorepair']));
        }
        $this->jsonOut($this->withLog($res, (int) $repair['id_ecorepair']));
    }

    protected function ajaxSetStatus()
    {
        $repair = $this->loadRepairOr404();
        $res = EcoRepair::setStatus(
            (int) $repair['id_ecorepair'],
            (string) Tools::getValue('status'),
            (int) $this->context->employee->id,
            (string) Tools::getValue('reason')
        );
        if ($res['ok'] && empty($res['unchanged'])) {
            $res['emailed'] = EcoRepairMessage::statusEmail((int) $repair['id_ecorepair'], (string) Tools::getValue('status'), (int) $this->context->employee->id, $this->trackingUrl($repair['tracking_code']));
        }
        if ($res['ok']) {
            $res['repair'] = $this->publicRepair(EcoRepair::get((int) $repair['id_ecorepair']));
        }
        $this->jsonOut($this->withLog($res, (int) $repair['id_ecorepair']));
    }

    protected function withLog(array $res, $idRepair)
    {
        $res['log'] = EcoRepairLog::forRepair((int) $idRepair);

        return $res;
    }

    protected function ajaxAddNote()
    {
        $repair = $this->loadRepairOr404();
        $note = trim(strip_tags((string) Tools::getValue('note')));
        if ($note === '' || Tools::strlen($note) > 2000) {
            $this->jsonOut(array('ok' => false, 'error' => 'Escribe la nota (máximo 2000 caracteres).'));
        }
        EcoRepairLog::add((int) $repair['id_ecorepair'], (int) $this->context->employee->id, 'note', $note);
        $this->jsonOut(array('ok' => true, 'log' => EcoRepairLog::forRepair((int) $repair['id_ecorepair'])));
    }

    protected function ajaxUploadPhoto()
    {
        $repair = $this->loadRepairOr404();
        if (empty($_FILES['photo'])) {
            $this->jsonOut(array('ok' => false, 'error' => 'No se recibió la foto.'));
        }
        $res = EcoRepairPhoto::saveUpload((int) $repair['id_ecorepair'], $_FILES['photo'], 'entry', (int) $this->context->employee->id);
        if ($res['ok']) {
            $res['photo'] = array(
                'id' => $res['id'],
                'thumb' => $this->photoUrl($res['id'], true),
                'full' => $this->photoUrl($res['id'], false),
            );
        }
        $this->jsonOut($this->withLog($res, (int) $repair['id_ecorepair']));
    }

    protected function ajaxSaveSignature()
    {
        $repair = $this->loadRepairOr404();
        $idRepair = (int) $repair['id_ecorepair'];
        $res = EcoRepairPhoto::saveSignature($idRepair, (string) Tools::getValue('signature'), (int) $this->context->employee->id);
        if ($res['ok']) {
            // Solo una firma por reparación: se borran las anteriores
            foreach (EcoRepairPhoto::forRepair($idRepair) as $ph) {
                if ($ph['type'] === 'signature' && (int) $ph['id_ecorepair_photo'] !== (int) $res['id']) {
                    EcoRepairPhoto::delete((int) $ph['id_ecorepair_photo'], (int) $this->context->employee->id);
                }
            }
            $res['signature'] = array('id' => $res['id'], 'full' => $this->photoUrl($res['id'], false));
        }
        $this->jsonOut($this->withLog($res, $idRepair));
    }

    protected function ajaxDeletePhoto()
    {
        $photo = EcoRepairPhoto::get((int) Tools::getValue('id_photo'));
        $repair = $photo ? EcoRepair::get((int) $photo['id_ecorepair']) : false;
        if (!$repair || (int) $repair['id_shop'] !== (int) $this->context->shop->id) {
            $this->jsonOut(array('ok' => false, 'error' => 'La foto no existe.'), 404);
        }
        $res = EcoRepairPhoto::delete((int) $photo['id_ecorepair_photo'], (int) $this->context->employee->id);
        $this->jsonOut($this->withLog($res, (int) $photo['id_ecorepair']));
    }

    protected function ajaxPhoto()
    {
        $photo = EcoRepairPhoto::get((int) Tools::getValue('id_photo'));
        $repair = $photo ? EcoRepair::get((int) $photo['id_ecorepair']) : false;
        if (!$repair || (int) $repair['id_shop'] !== (int) $this->context->shop->id || !EcoRepairPhoto::output($photo, (bool) Tools::getValue('thumb'))) {
            header('HTTP/1.1 404 Not Found');
        }
        exit;
    }

    protected function ajaxPrintReceipt()
    {
        $this->outputPrint('print_receipt.tpl');
    }

    protected function ajaxPrintLabel()
    {
        $this->outputPrint('print_label.tpl');
    }

    protected function outputPrint($tpl)
    {
        $repair = EcoRepair::get((int) Tools::getValue('id_ecorepair'));
        if (!$repair || (int) $repair['id_shop'] !== (int) $this->context->shop->id) {
            $this->logDbError('imprimir ' . (int) Tools::getValue('id_ecorepair'));
            header('HTTP/1.1 404 Not Found');
            echo 'La reparación no existe.';
            exit;
        }
        $customer = EcoRepairCustomer::info((int) $repair['id_customer']);
        $signature = null;
        foreach (EcoRepairPhoto::forRepair((int) $repair['id_ecorepair']) as $ph) {
            if ($ph['type'] === 'signature') {
                $signature = $this->photoUrl((int) $ph['id_ecorepair_photo'], false);
            }
        }
        $format = Tools::getValue('format', Configuration::get('ECOREPAIRS_PRINT_FORMAT'));
        $format = in_array($format, array('80mm', 'a4'), true) ? $format : '80mm';
        $label = Configuration::get('ECOREPAIRS_LABEL_SIZE');
        $label = in_array($label, array('62x29', '50x25', '62x100'), true) ? $label : '62x29';

        $this->context->smarty->assign(array(
            'r' => $repair,
            'customer' => $customer,
            'signature' => $signature,
            'format' => $format,
            'label' => $label,
            'shop' => array(
                'name' => Configuration::get('PS_SHOP_NAME'),
                'address' => trim(Configuration::get('PS_SHOP_ADDR1') . ' ' . Configuration::get('PS_SHOP_ADDR2')),
                'city' => trim(Configuration::get('PS_SHOP_CODE') . ' ' . Configuration::get('PS_SHOP_CITY')),
                'phone' => Configuration::get('PS_SHOP_PHONE'),
                'email' => Configuration::get('PS_SHOP_EMAIL'),
                'details' => Configuration::get('PS_SHOP_DETAILS'),
                'logo' => EcoRepairs::logoUrl(),
            ),
            'conditions' => preg_split('/\r\n|\r|\n/', (string) Configuration::get('ECOREPAIRS_CONDITIONS')),
            'trackingUrl' => $this->trackingUrl($repair['tracking_code']),
            'qrJs' => $this->module->getPathUri() . 'views/js/vendor/qrcode.js',
            'printDate' => date('d/m/Y H:i'),
        ));
        header('Content-Type: text/html; charset=utf-8');
        header('X-Robots-Tag: noindex');
        echo $this->context->smarty->fetch($this->module->getLocalPath() . 'views/templates/admin/' . $tpl);
        exit;
    }

    /* ------------------------------------------------------------------ */
    /* Presupuestos                                                        */
    /* ------------------------------------------------------------------ */

    protected function ajaxProductUpdate()
    {
        $stock = Tools::getIsset('stock') && Tools::getValue('stock') !== '' ? (string) Tools::getValue('stock') : null;
        $price = Tools::getIsset('price') && Tools::getValue('price') !== '' ? (string) Tools::getValue('price') : null;
        if ($stock === null && $price === null) {
            $this->jsonOut(array('ok' => false, 'error' => 'No hay nada que guardar.'));
        }
        $this->jsonOut(EcoRepairQuote::updateShopProduct(
            (int) Tools::getValue('id_product'),
            (int) Tools::getValue('id_product_attribute'),
            $stock,
            $price,
            (int) $this->context->shop->id,
            (int) $this->context->language->id,
            $this->context->employee
        ));
    }

    protected function ajaxSearchProducts()
    {
        $device = '';
        $repair = (int) Tools::getValue('id_ecorepair') ? EcoRepair::get((int) Tools::getValue('id_ecorepair')) : false;
        if ($repair && (int) $repair['id_shop'] === (int) $this->context->shop->id) {
            $device = $repair['brand_name'] . ' ' . $repair['model_name'];
        }
        $products = EcoRepairQuote::searchProducts(
            Tools::getValue('q'),
            (int) $this->context->language->id,
            (int) $this->context->shop->id,
            40,
            $device
        );
        // Avisos de piezas que no valen para el modelo de la reparación
        if ($repair && (int) $repair['id_brand']) {
            $map = EcoRepairIncompat::mapForProducts((int) $repair['id_brand'], (int) $repair['id_model'], array_column($products, 'id_product'));
            foreach ($products as &$pr) {
                $pr['incompat'] = EcoRepairIncompat::find($map, $pr['id_product'], $pr['id_product_attribute']);
            }
            unset($pr);
        }
        $this->jsonOut(array('ok' => true, 'products' => $products));
    }

    /**
     * Carga el presupuesto y comprueba que su reparación es de esta tienda.
     */
    protected function loadQuoteOr404()
    {
        $q = EcoRepairQuote::get((int) Tools::getValue('id_quote'));
        $repair = $q ? EcoRepair::get((int) $q['id_ecorepair']) : false;
        if (!$repair || (int) $repair['id_shop'] !== (int) $this->context->shop->id) {
            $this->jsonOut(array('ok' => false, 'error' => 'El presupuesto no existe.'), 404);
        }

        return $q;
    }

    /** Respuesta con todos los presupuestos, la reparación y el historial actualizados. */
    protected function quoteOut(array $res, $idRepair)
    {
        $res['quotes'] = EcoRepairQuote::publicList((int) $idRepair);
        $res['repair'] = $this->publicRepair(EcoRepair::get((int) $idRepair));
        $this->jsonOut($res);
    }

    protected function ajaxQuoteCreate()
    {
        $repair = $this->loadRepairOr404();
        if (in_array($repair['status'], array(EcoRepairStatus::DELIVERED, EcoRepairStatus::CANCELLED), true)) {
            $this->jsonOut(array('ok' => false, 'error' => 'La reparación está cerrada.'));
        }
        $res = EcoRepairQuote::create((int) $repair['id_ecorepair'], (int) $this->context->employee->id);
        $this->quoteOut($res, (int) $repair['id_ecorepair']);
    }

    protected function ajaxQuoteSave()
    {
        $q = $this->loadQuoteOr404();
        $lines = json_decode((string) Tools::getValue('lines'), true);
        $res = EcoRepairQuote::saveDraft($q, $lines, (string) Tools::getValue('notes'));
        $this->jsonOut($res);
    }

    protected function ajaxQuoteSend()
    {
        $q = $this->loadQuoteOr404();
        $res = EcoRepairQuote::send($q, (int) $this->context->employee->id);
        if ($res['ok']) {
            $repair = EcoRepair::get((int) $q['id_ecorepair']);
            $fresh = EcoRepairQuote::get((int) $q['id_ecorepair_quote']);
            $res['emailed'] = EcoRepairMessage::quoteEmail($repair, $res['link'], EcoRepairQuote::money($fresh['total_tax_incl']), (int) $this->context->employee->id, $this->trackingUrl($repair['tracking_code']));
        }
        $this->quoteOut($res, (int) $q['id_ecorepair']);
    }

    protected function ajaxQuoteNewVersion()
    {
        $q = $this->loadQuoteOr404();
        $res = EcoRepairQuote::newVersion($q, (int) $this->context->employee->id);
        $this->quoteOut($res, (int) $q['id_ecorepair']);
    }

    protected function ajaxQuoteDiscard()
    {
        $q = $this->loadQuoteOr404();
        $res = EcoRepairQuote::discard($q, (int) $this->context->employee->id);
        $this->quoteOut($res, (int) $q['id_ecorepair']);
    }

    protected function ajaxQuoteAccept()
    {
        $q = $this->loadQuoteOr404();
        $res = EcoRepairQuote::acceptInStore($q, (string) Tools::getValue('signature'), (int) $this->context->employee->id);
        $this->quoteOut($res, (int) $q['id_ecorepair']);
    }

    protected function ajaxQuoteReject()
    {
        $q = $this->loadQuoteOr404();
        $res = EcoRepairQuote::rejectInStore($q, (string) Tools::getValue('reason'), (int) $this->context->employee->id);
        $this->quoteOut($res, (int) $q['id_ecorepair']);
    }

    protected function ajaxKitSave()
    {
        $res = EcoRepairKit::save(
            (string) Tools::getValue('name'),
            (int) Tools::getValue('id_category'),
            json_decode((string) Tools::getValue('lines'), true)
        );
        $res['kits'] = EcoRepairKit::all((int) $this->context->language->id, (int) $this->context->shop->id);
        $this->jsonOut($res);
    }

    protected function ajaxKitDelete()
    {
        $res = EcoRepairKit::remove((int) Tools::getValue('id_kit'));
        $res['kits'] = EcoRepairKit::all((int) $this->context->language->id, (int) $this->context->shop->id);
        $this->jsonOut($res);
    }

    protected function ajaxPrintQuote()
    {
        $q = EcoRepairQuote::get((int) Tools::getValue('id_quote'));
        $repair = $q ? EcoRepair::get((int) $q['id_ecorepair']) : false;
        if (!$repair || (int) $repair['id_shop'] !== (int) $this->context->shop->id) {
            header('HTTP/1.1 404 Not Found');
            echo 'El presupuesto no existe.';
            exit;
        }
        $format = Tools::getValue('format', Configuration::get('ECOREPAIRS_PRINT_FORMAT'));
        $format = in_array($format, array('80mm', 'a4'), true) ? $format : 'a4';
        $pq = EcoRepairQuote::publicQuote($q);
        $this->context->smarty->assign(array(
            'r' => $repair,
            'q' => $pq,
            'customer' => EcoRepairCustomer::info((int) $repair['id_customer']),
            'signature' => $pq['id_photo_signature'] ? $this->photoUrl($pq['id_photo_signature'], false) : '',
            'format' => $format,
            'shop' => array(
                'name' => Configuration::get('PS_SHOP_NAME'),
                'address' => trim(Configuration::get('PS_SHOP_ADDR1') . ' ' . Configuration::get('PS_SHOP_ADDR2')),
                'city' => trim(Configuration::get('PS_SHOP_CODE') . ' ' . Configuration::get('PS_SHOP_CITY')),
                'phone' => Configuration::get('PS_SHOP_PHONE'),
                'logo' => EcoRepairs::logoUrl(),
            ),
            'conditions' => preg_split('/\r\n|\r|\n/', (string) Configuration::get('ECOREPAIRS_QUOTE_CONDITIONS')),
            'qrJs' => $this->module->getPathUri() . 'views/js/vendor/qrcode.js',
            'printDate' => date('d/m/Y H:i'),
        ));
        header('Content-Type: text/html; charset=utf-8');
        header('X-Robots-Tag: noindex');
        echo $this->context->smarty->fetch($this->module->getLocalPath() . 'views/templates/admin/print_quote.tpl');
        exit;
    }

    /* ------------------------------------------------------------------ */
    /* Utilidades                                                          */
    /* ------------------------------------------------------------------ */

    /** Si una consulta falla, deja el error de la base de datos en Parámetros avanzados › Registros. */
    protected function logDbError($where)
    {
        $msg = Db::getInstance()->getMsgError();
        if ($msg) {
            PrestaShopLogger::addLog('ecorepairs (' . $where . '): ' . Tools::substr($msg, 0, 900), 3, null, 'EcoRepair');
        }
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

    protected function baseUrl()
    {
        return $this->context->link->getAdminLink('AdminEcoRepairs');
    }

    protected function ajaxUrl($action, array $params = array())
    {
        $params = array_merge(array('ajax' => 1, 'action' => $action), $params);

        return $this->baseUrl() . '&' . http_build_query($params);
    }

    protected function repairUrl($id)
    {
        return $this->baseUrl() . '&id_ecorepair=' . (int) $id;
    }

    protected function photoUrl($idPhoto, $thumb)
    {
        return $this->ajaxUrl('photo', array('id_photo' => (int) $idPhoto, 'thumb' => $thumb ? 1 : 0));
    }

    public function trackingUrl($code)
    {
        if (!Configuration::get('PS_REWRITING_SETTINGS')) {
            return $this->context->link->getModuleLink('ecorepairs', 'tracking', array('c' => $code), true);
        }

        return $this->context->link->getBaseLink() . 'seguimiento?c=' . rawurlencode($code);
    }

    protected function links()
    {
        return array(
            'board' => $this->baseUrl(),
            'new' => $this->baseUrl() . '&view=new',
            'stats' => $this->baseUrl() . '&view=stats',
            'cash' => $this->baseUrl() . '&view=cash',
            'requests' => $this->baseUrl() . '&view=requests',
            'techs' => $this->canSeeTechs() ? $this->baseUrl() . '&view=techs' : '',
            'parts' => $this->baseUrl() . '&view=parts',
            'model' => $this->baseUrl() . '&view=model',
            'customer' => $this->baseUrl() . '&view=customer&id_customer=',
            'repair' => $this->baseUrl() . '&id_ecorepair=',
            'ajax' => $this->baseUrl() . '&ajax=1',
            'settings' => $this->context->link->getAdminLink('AdminEcoRepairsSettings'),
            'modelImage' => $this->baseUrl() . '&ajax=1&action=modelImage',
        );
    }

    protected function technicians()
    {
        $out = array();
        $seen = array();
        foreach (Employee::getEmployees(true) as $e) {
            $seen[(int) $e['id_employee']] = true;
            $out[] = array(
                'id' => (int) $e['id_employee'],
                'name' => trim($e['firstname'] . ' ' . $e['lastname']),
            );
        }
        // Técnicos de la app con empleado desactivado (no entran en PrestaShop)
        foreach (EcoRepairStaff::techEmployeeIds() as $id) {
            if (!isset($seen[$id])) {
                $e = new Employee($id);
                if (Validate::isLoadedObject($e)) {
                    $out[] = array('id' => $id, 'name' => trim($e->firstname . ' ' . $e->lastname) . ' (taller)');
                }
            }
        }

        return $out;
    }

    protected function categoriesLite()
    {
        $out = array();
        foreach (EcoRepairCatalog::tree(false) as $c) {
            $out[] = array('id' => $c['id'], 'name' => $c['name'], 'icon' => $c['icon'], 'active' => $c['active']);
        }

        return $out;
    }

    /**
     * Datos de la reparación que se envían al navegador.
     */
    protected function publicRepair(array $r)
    {
        return array(
            'id' => (int) $r['id_ecorepair'],
            'reference' => $r['reference'],
            'status' => $r['status'],
            'status_name' => $r['status_name'],
            'waiting_part' => (int) $r['waiting_part'],
            'urgent' => (int) $r['urgent'],
            'warranty' => (int) $r['warranty'],
            'id_customer' => (int) $r['id_customer'],
            'customer_name' => $r['customer_name'],
            'phone' => (string) $r['phone'],
            'id_category' => (int) $r['id_category'],
            'id_brand' => (int) $r['id_brand'],
            'id_model' => (int) $r['id_model'],
            'category_name' => (string) $r['category_name'],
            'category_icon' => (string) $r['category_icon'],
            'device_name' => $r['device_name'],
            'serial' => $r['serial'],
            'km' => $r['km'] === null ? '' : (string) $r['km'],
            'color' => $r['color'],
            'fault_customer' => (string) $r['fault_customer'],
            'faults' => $r['faults'],
            'diagnosis' => (string) $r['diagnosis'],
            'accessories' => $r['accessories'],
            'damages' => $r['damages'],
            'id_employee_tech' => (int) $r['id_employee_tech'],
            'tech_name' => $r['tech_name'],
            'eta_date' => (string) $r['eta_date'],
            'tracking_code' => $r['tracking_code'],
            'cancel_reason' => $r['cancel_reason'],
            'date_add' => $r['date_add'],
            'date_status' => $r['date_status'],
            'days_in_shop' => $r['days_in_shop'],
            'days_in_status' => $r['days_in_status'],
            'id_address_invoice' => (int) $r['id_address_invoice'],
            'cover' => $this->coverUrl($r),
            'quotes_accepted' => isset($r['quotes_accepted']) ? (int) $r['quotes_accepted'] : 0,
            'id_order' => (int) $r['id_order'],
            'date_upd' => $r['date_upd'],
            'id_parent_repair' => isset($r['id_parent_repair']) ? (int) $r['id_parent_repair'] : 0,
            'repeat_of' => isset($r['repeat_of']) ? (int) $r['repeat_of'] : 0,
            'repeat_same' => isset($r['repeat_same']) ? (int) $r['repeat_same'] : 0,
            'id_brand_raw' => (int) $r['id_brand'],
        );
    }

    /**
     * Foto para localizar el equipo: la primera foto de entrada; si no hay, la del modelo.
     */
    protected function coverUrl(array $r)
    {
        if (!empty($r['id_photo_cover'])) {
            return $this->photoUrl((int) $r['id_photo_cover'], true);
        }

        return $this->modelImageUrl(isset($r['model_image']) ? (string) $r['model_image'] : '');
    }

    public function modelImageUrl($image)
    {
        if ($image === '') {
            return '';
        }

        return preg_match('#^https://#i', $image) ? $image : $this->ajaxUrl('modelImage', array('f' => $image));
    }

    protected function publicRepairs(array $rows)
    {
        return array_map(array($this, 'publicRepair'), $rows);
    }

    /**
     * Iconos de línea (stroke 2). Se usan en plantillas y JS.
     */
    protected function icons()
    {
        $s = '<svg class="er-i" viewBox="0 0 24 24" aria-hidden="true">';

        return array(
            'wrench' => $s . '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
            'search' => $s . '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
            'plus' => $s . '<path d="M12 5v14M5 12h14"/></svg>',
            'back' => $s . '<path d="M15 18l-6-6 6-6"/></svg>',
            'print' => $s . '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>',
            'tag' => $s . '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
            'user' => $s . '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
            'device' => $s . '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M5.5 17.5 10 7h4l4.5 10.5M14 7l1-3h3"/></svg>',
            'alert' => $s . '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>',
            'camera' => $s . '<path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/></svg>',
            'clock' => $s . '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
            'assign' => $s . '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/></svg>',
            'qr' => $s . '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 14v7h-7"/></svg>',
            'check' => $s . '<path d="M20 6 9 17l-5-5"/></svg>',
            'x' => $s . '<path d="M18 6 6 18M6 6l12 12"/></svg>',
            'pen' => $s . '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
            'copy' => $s . '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
            'shield' => $s . '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
            'settings' => $s . '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
            'scooter' => $s . '<circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M8 18h8M15 4h3l1 14"/></svg>',
            'bike' => $s . '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M5.5 17.5 10 7h4l4.5 10.5M14 7l1-3h3"/></svg>',
            'battery' => $s . '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2M11 9l-2 3h4l-2 3"/></svg>',
            'moto' => $s . '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M8 17h7l3-6h-5l-2-4H8M15 11 13 7"/></svg>',
            'other' => $s . '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>',
            'trash' => $s . '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
            'link' => $s . '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
            'chart' => $s . '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="1"/><rect x="12" y="8" width="3" height="10" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/></svg>',
            'whatsapp' => $s . '<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.3-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2z"/></svg>',
            'mail' => $s . '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
            'refresh' => $s . '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>',
            'bolt' => $s . '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
            'mic' => $s . '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
            'package' => $s . '<path d="M16.5 9.4 7.5 4.2M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>',
            'book' => $s . '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/></svg>',
            'code' => $s . '<path d="m8 9-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/></svg>',
            'eye' => $s . '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
            'star' => $s . '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
            'trend' => $s . '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
            'logo' => $s . '<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/><path d="M12.8 8.6 10.6 12.3h2.8l-2.2 3.7" stroke-width="2.2"/></svg>',
            'doc' => $s . '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
            'box' => $s . '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
            'lock' => $s . '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
            'send' => $s . '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
            'layers' => $s . '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
        );
    }
}
