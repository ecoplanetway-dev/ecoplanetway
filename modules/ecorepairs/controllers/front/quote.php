<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . 'ecorepairs/ecorepairs.php';

/**
 * Página pública del presupuesto: el cliente lo acepta o lo rechaza desde el enlace.
 * /module/ecorepairs/quote?t=TOKEN
 *
 * - Página propia y ligera: no carga el tema ni sus CSS/JS.
 * - No muestra datos personales: solo la referencia, el equipo y las líneas.
 * - Solo acepta respuestas por POST con una clave ligada al enlace. Responder dos veces no crea dos respuestas.
 */
class EcoRepairsQuoteModuleFrontController extends ModuleFrontController
{
    public $ssl = true;
    public $auth = false;

    /** Intentos con enlace no válido permitidos por IP cada 10 minutos. */
    const RATE_LIMIT = 30;

    public function initContent()
    {
        header('X-Robots-Tag: noindex, nofollow');
        header('Cache-Control: no-store');
        header('Referrer-Policy: no-referrer');
        header('X-Frame-Options: DENY');

        $token = (string) Tools::getValue('t');
        if ($this->rateLimited()) {
            $this->render(array('state' => 'limit'), 429);
        }
        $q = EcoRepairQuote::getByToken($token);
        if (!$q) {
            $this->countFailure();
            $this->render(array('state' => 'notfound'), 404);
        }

        $result = '';
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $answer = (string) Tools::getValue('answer');
            if (!hash_equals($this->formKey($token), (string) Tools::getValue('k')) || !in_array($answer, array('accept', 'reject'), true)) {
                $this->render(array('state' => 'notfound'), 400);
            }
            if ($answer === 'accept' && !Tools::getValue('agree')) {
                $result = 'need_agree';
            } else {
                $res = EcoRepairQuote::answerByLink($token, $answer === 'accept', Tools::getRemoteAddr(), (string) Tools::getValue('note'));
                $result = $res['code'];
                $q = EcoRepairQuote::get((int) $q['id_ecorepair_quote']);
            }
        }

        $repair = EcoRepair::get((int) $q['id_ecorepair']);
        $pq = EcoRepairQuote::publicQuote($q);
        $logo = Configuration::get('PS_LOGO');
        $this->render(array(
            'state' => EcoRepairQuote::linkState($q),
            'result' => $result,
            'q' => $pq,
            'reference' => $repair ? $repair['reference'] : '',
            'device' => $repair ? trim($repair['category_name'] . ' · ' . $repair['device_name'], ' ·') : '',
            'formKey' => $this->formKey($token),
            'action' => EcoRepairQuote::link($token),
            'conditions' => preg_split('/\r\n|\r|\n/', (string) Configuration::get('ECOREPAIRS_QUOTE_CONDITIONS')),
            'shop' => array(
                'name' => Configuration::get('PS_SHOP_NAME'),
                'phone' => Configuration::get('PS_SHOP_PHONE'),
                'logo' => $logo ? $this->context->link->getMediaLink(_PS_IMG_ . $logo) : '',
            ),
        ));
    }

    protected function formKey($token)
    {
        return hash_hmac('sha256', 'ecorquote|' . $token, _COOKIE_KEY_);
    }

    protected function render(array $vars, $code = 200)
    {
        if ($code !== 200) {
            http_response_code($code);
        }
        $defaults = array('state' => 'notfound', 'result' => '', 'q' => null, 'reference' => '', 'device' => '',
            'formKey' => '', 'action' => '', 'conditions' => array(),
            'shop' => array('name' => Configuration::get('PS_SHOP_NAME'), 'phone' => Configuration::get('PS_SHOP_PHONE'), 'logo' => ''));
        $this->context->smarty->assign(array_merge($defaults, $vars));
        header('Content-Type: text/html; charset=utf-8');
        echo $this->context->smarty->fetch($this->module->getLocalPath() . 'views/templates/front/quote.tpl');
        exit;
    }

    /* Límite sencillo de intentos con enlaces no válidos, por IP, en la caché de PrestaShop. */

    protected function rateFile()
    {
        $dir = _PS_CACHE_DIR_ . 'ecorepairs/';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        return $dir . 'rl_' . md5(Tools::getRemoteAddr() . _COOKIE_KEY_) . '.json';
    }

    protected function rateData()
    {
        $file = $this->rateFile();
        $data = is_file($file) ? json_decode((string) @file_get_contents($file), true) : null;
        if (!is_array($data) || !isset($data['t'], $data['n']) || $data['t'] < time() - 600) {
            $data = array('t' => time(), 'n' => 0);
        }

        return $data;
    }

    protected function rateLimited()
    {
        $data = $this->rateData();

        return $data['n'] >= self::RATE_LIMIT;
    }

    protected function countFailure()
    {
        $data = $this->rateData();
        ++$data['n'];
        @file_put_contents($this->rateFile(), json_encode($data), LOCK_EX);
    }
}
