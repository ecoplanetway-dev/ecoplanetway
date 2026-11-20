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
        $vars = array('state' => 'form', 'code' => $code, 'tech' => null);

        // Foto pública del trabajo (solo las marcadas «Mostrar al cliente» y con el código correcto)
        if ((int) Tools::getValue('photo') && $code !== '') {
            $ph = EcoRepairPhoto::get((int) Tools::getValue('photo'));
            $ok = $ph && (int) $ph['public'] && (string) Db::getInstance()->getValue('SELECT tracking_code FROM `' . _DB_PREFIX_ . 'ecorepair` WHERE id_ecorepair = ' . (int) $ph['id_ecorepair']) === $code;
            if (!$ok || !EcoRepairPhoto::output($ph, (bool) Tools::getValue('thumb'))) {
                header('HTTP/1.1 404 Not Found');
            }
            exit;
        }

        // Pegatina QR del patín: historial del patín y garantía. El personal del taller va a la app (nueva entrada con los datos)
        $tag = preg_replace('/[^A-Z0-9]/', '', Tools::strtoupper((string) Tools::getValue('d')));
        if ($tag !== '') {
            if (EcoRepairStaff::current()) {
                $app = Configuration::get('PS_REWRITING_SETTINGS') ? $this->context->link->getBaseLink() . 'taller' : $this->context->link->getModuleLink('ecorepairs', 'app', array(), true);
                Tools::redirect($app . '#tag/' . rawurlencode($tag));
            }
            $vars = array('state' => 'notfound', 'code' => '');
            if (EcoRepairRateLimit::blocked('track', self::RATE_LIMIT)) {
                $vars['state'] = 'limit';
            } else {
                $list = strlen($tag) >= 6 ? EcoRepair::historyByTag($tag) : array();
                if (!$list) {
                    EcoRepairRateLimit::hit('track');
                } else {
                    $all = EcoRepairStatus::all();
                    $rows = array();
                    $open = '';
                    foreach ($list as $r) {
                        if (!in_array($r['status'], array(EcoRepairStatus::DELIVERED, EcoRepairStatus::CANCELLED), true) && $open === '') {
                            $open = $r['tracking_code'];
                        }
                        $rows[] = array('date' => $r['date_add'], 'status_name' => $r['status_name'], 'status_color' => isset($all[$r['status']]['color']) ? $all[$r['status']]['color'] : '#888',
                            'warranty_until' => EcoRepair::warrantyUntil($r));
                    }
                    $phone = EcoRepairs::workshop()['wa'];
                    $vars = array('state' => 'device', 'code' => '', 'device' => $list[0]['device_name'], 'tag' => $tag, 'rows' => $rows,
                        'openUrl' => $open !== '' ? $this->context->link->getBaseLink() . 'seguimiento?c=' . rawurlencode($open) : '',
                        'waUrl' => $phone ? 'https://wa.me/' . $phone . '?text=' . rawurlencode('Hola, quiero pedir una revisión para mi ' . $list[0]['device_name'] . ' (' . $tag . ')') : '');
                }
            }
            $vars['shop'] = $this->shopVars('');
            $vars['action'] = $this->context->link->getBaseLink() . 'seguimiento';
            $this->context->smarty->assign($vars);
            header('Content-Type: text/html; charset=utf-8');
            echo $this->context->smarty->fetch($this->module->getLocalPath() . 'views/templates/front/tracking.tpl');
            exit;
        }

        // Un técnico con sesión en su móvil que escanea el QR va directo a la reparación en la app del taller
        if ($code !== '' && EcoRepairStaff::current()) {
            $app = Configuration::get('PS_REWRITING_SETTINGS') ? $this->context->link->getBaseLink() . 'taller' : $this->context->link->getModuleLink('ecorepairs', 'app', array(), true);
            Tools::redirect($app . '#rep/' . rawurlencode($code));
        }

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

        $vars['shop'] = $this->shopVars($vars['state'] === 'ok' ? $code : '');
        $vars['action'] = $this->context->link->getBaseLink() . 'seguimiento';
        $this->context->smarty->assign($vars);
        if ($vars['state'] === 'notfound' || $vars['state'] === 'limit') {
            http_response_code($vars['state'] === 'limit' ? 429 : 404);
        }
        header('Content-Type: text/html; charset=utf-8');
        echo $this->context->smarty->fetch($this->module->getLocalPath() . 'views/templates/front/tracking.tpl');
        exit;
    }

    protected function publicPhotos($idRepair, $code)
    {
        $base = (Configuration::get('PS_REWRITING_SETTINGS') ? $this->context->link->getBaseLink() . 'seguimiento?' : $this->context->link->getModuleLink('ecorepairs', 'tracking', array(), true) . '&')
            . 'c=' . rawurlencode($code) . '&photo=';
        $out = array();
        foreach (EcoRepairPhoto::forRepair($idRepair) as $ph) {
            if ((int) $ph['public']) {
                $out[] = array('thumb' => $base . (int) $ph['id_ecorepair_photo'] . '&thumb=1', 'full' => $base . (int) $ph['id_ecorepair_photo']);
            }
        }

        return $out;
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
            'photos' => $this->publicPhotos((int) $repair['id_ecorepair'], $repair['tracking_code']),
            'tech' => EcoRepairPhoto::techFor((int) $repair['id_employee_tech']),
        );
    }

    /** Datos del taller para la página: dirección, horario, mapa, teléfono y WhatsApp (con el código de la reparación ya escrito). */
    protected function shopVars($code)
    {
        $ws = EcoRepairs::workshop();
        $hours = array();
        foreach (preg_split('/\r\n|\r|\n/', $ws['hours']) as $l) {
            $l = trim($l);
            if ($l === '') {
                continue;
            }
            $p = strpos($l, ':');
            $hours[] = $p !== false && $p < 30 ? array('d' => trim(substr($l, 0, $p)), 'h' => trim(substr($l, $p + 1))) : array('d' => '', 'h' => $l);
        }
        $text = $code !== '' ? 'Hola, os escribo por mi reparación ' . $code . '.' : 'Hola, quería consultaros una cosa.';

        return array_merge($ws, array(
            'address' => $ws['full'],
            'hoursList' => $hours,
            'waLink' => $ws['wa'] ? 'https://wa.me/' . $ws['wa'] . '?text=' . rawurlencode($text) : '',
            'logo' => EcoRepairs::logoUrl(),
            'url' => $this->context->link->getBaseLink(),
        ));
    }
}
