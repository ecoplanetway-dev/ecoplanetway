<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . 'ecorepairs/ecorepairs.php';

/**
 * Seguimiento público: /seguimiento?c=CODIGO (el QR del resguardo y de la etiqueta).
 * Solo muestra estado, fechas, equipo y total. Nunca datos personales, notas ni fotos.
 * Página propia y ligera: no carga el tema de la tienda.
 */
class EcoRepairsTrackingModuleFrontController extends ModuleFrontController
{
    public $ssl = true;
    public $auth = false;

    const RATE_LIMIT = 20;

    public function initContent()
    {
        header('X-Robots-Tag: noindex, nofollow');
        header('Cache-Control: no-store');
        header('Referrer-Policy: no-referrer');
        header('X-Frame-Options: DENY');

        $code = Tools::strtoupper(trim((string) Tools::getValue('c')));
        $code = preg_replace('/[^A-Z0-9]/', '', $code);
        if (strlen($code) === 8) {
            $code = substr($code, 0, 4) . '-' . substr($code, 4);
        }
        $vars = array('state' => 'form', 'code' => $code);

        if ($code !== '') {
            if (EcoRepairRateLimit::blocked('track', self::RATE_LIMIT)) {
                $vars['state'] = 'limit';
            } elseif (!preg_match('/^[A-Z0-9]{4}-[A-Z0-9]{4}$/', $code)) {
                EcoRepairRateLimit::hit('track');
                $vars['state'] = 'notfound';
            } else {
                $id = (int) Db::getInstance()->getValue('SELECT id_ecorepair FROM `' . _DB_PREFIX_ . 'ecorepair` WHERE tracking_code = \'' . pSQL($code) . '\'');
                $repair = $id ? EcoRepair::get($id) : false;
                if (!$repair) {
                    EcoRepairRateLimit::hit('track');
                    $vars['state'] = 'notfound';
                } else {
                    $days = max(1, (int) Configuration::get('ECOREPAIRS_TRACKING_DAYS'));
                    $closed = in_array($repair['status'], array(EcoRepairStatus::DELIVERED, EcoRepairStatus::CANCELLED), true);
                    if ($closed && strtotime($repair['date_status']) < time() - $days * 86400) {
                        $vars['state'] = 'expired';
                    } else {
                        $vars = array_merge($vars, $this->repairVars($repair));
                        $vars['state'] = 'ok';
                    }
                }
            }
        }

        $logo = Configuration::get('PS_LOGO');
        $vars['shop'] = array(
            'name' => Configuration::get('PS_SHOP_NAME'),
            'phone' => Configuration::get('PS_SHOP_PHONE'),
            'address' => trim(Configuration::get('PS_SHOP_ADDR1') . ', ' . Configuration::get('PS_SHOP_CITY'), ', '),
            'logo' => $logo ? $this->context->link->getMediaLink(_PS_IMG_ . $logo) : '',
            'url' => $this->context->link->getBaseLink(),
        );
        $vars['action'] = $this->context->link->getBaseLink() . 'seguimiento';
        $this->context->smarty->assign($vars);
        if ($vars['state'] === 'notfound' || $vars['state'] === 'limit') {
            http_response_code($vars['state'] === 'limit' ? 429 : 404);
        }
        header('Content-Type: text/html; charset=utf-8');
        echo $this->context->smarty->fetch($this->module->getLocalPath() . 'views/templates/front/tracking.tpl');
        exit;
    }

    protected function repairVars(array $repair)
    {
        $all = EcoRepairStatus::all();
        $flow = EcoRepairStatus::flow();
        $idx = array_search($repair['status'], $flow, true);
        $steps = array();
        foreach ($flow as $i => $s) {
            $steps[] = array('name' => $all[$s]['name'], 'done' => $idx !== false && $i < $idx, 'current' => $i === $idx);
        }
        $pay = EcoRepairPayment::summary((int) $repair['id_ecorepair']);
        $quoteLink = '';
        foreach (EcoRepairQuote::forRepair((int) $repair['id_ecorepair']) as $q) {
            if ($q['status'] === EcoRepairQuote::SENT && EcoRepairQuote::linkState($q) === 'open') {
                $quoteLink = EcoRepairQuote::link($q['token']);
            }
        }
        $messages = array(
            EcoRepairStatus::RECEIVED => 'Hemos recibido tu equipo. En breve lo revisará un técnico.',
            EcoRepairStatus::DIAGNOSIS => 'Un técnico está revisando tu equipo para ver qué le pasa.',
            EcoRepairStatus::QUOTE => 'Tenemos el presupuesto. Te lo hemos enviado para que lo aceptes.',
            EcoRepairStatus::REPAIR => 'Estamos reparando tu equipo.',
            EcoRepairStatus::READY => '¡Tu equipo está listo! Puedes pasar a recogerlo.',
            EcoRepairStatus::DELIVERED => 'Equipo entregado. ¡Gracias por confiar en nosotros!',
            EcoRepairStatus::CANCELLED => 'La reparación se ha cerrado sin reparar.',
        );

        return array(
            'r' => array(
                'reference' => $repair['reference'],
                'device' => trim($repair['category_name'] . ' · ' . $repair['device_name'], ' ·'),
                'status' => $repair['status'],
                'status_name' => $all[$repair['status']]['name'],
                'status_color' => $all[$repair['status']]['color'],
                'message' => $messages[$repair['status']],
                'waiting_part' => (int) $repair['waiting_part'] && $repair['status'] === EcoRepairStatus::REPAIR,
                'date_add' => $repair['date_add'],
                'date_status' => $repair['date_status'],
                'eta' => $repair['eta_date'] && $repair['eta_date'] !== '0000-00-00' && !in_array($repair['status'], array('ready', 'delivered', 'cancelled'), true) ? $repair['eta_date'] : '',
                'total' => $pay['due'] > 0 ? $pay['due'] : 0,
                'pending' => $pay['due'] > 0 && !$pay['id_order'] ? $pay['pending'] : 0,
                'warranty' => (int) $repair['warranty'],
            ),
            'steps' => $steps,
            'quoteLink' => $quoteLink,
        );
    }
}
