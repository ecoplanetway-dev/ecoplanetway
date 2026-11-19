<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Avisos al cliente: plantillas de WhatsApp (el empleado pulsa enviar), emails automáticos y recordatorios.
 * Todo lo enviado queda guardado (ecorepair_message) y en el historial de la reparación.
 */
class EcoRepairMessage
{
    /** Plantillas por defecto. Se cambian en Ajustes del taller. */
    public static function defaultTemplates()
    {
        return array(
            'received' => array('name' => 'Recibido', 'text' => "Hola {nombre}, hemos recibido tu {modelo} en {tienda}. Tu reparación es la {rep}.\nPuedes ver cómo va aquí: {seguimiento}"),
            'quote' => array('name' => 'Presupuesto', 'text' => "Hola {nombre}, ya tenemos el presupuesto de tu {modelo} ({rep}):\n{lineas}\nTotal: {total}\nPuedes aceptarlo o rechazarlo aquí: {enlace}"),
            'ready' => array('name' => 'Listo para recoger', 'text' => "Hola {nombre}, tu {modelo} ya está listo para recoger en {tienda}.\nTotal: {total}\nReparación {rep}."),
            'reminder' => array('name' => 'Recordatorio sin recoger', 'text' => "Hola {nombre}, te recordamos que tu {modelo} lleva {dias} días listo para recoger en {tienda} (reparación {rep})."),
            'delay' => array('name' => 'Retraso', 'text' => "Hola {nombre}, tu {modelo} ({rep}) va a tardar un poco más de lo previsto. Nueva fecha prevista: {fecha_prevista}. Perdona las molestias."),
            'review' => array('name' => 'Pedir reseña', 'text' => "Hola {nombre}, gracias por confiar en {tienda} para tu {modelo}. ¿Qué tal ha quedado?\nSi estás contento con el servicio, nos ayudas mucho dejando una reseña aquí: {resena}"),
            'request' => array('name' => 'Encargo llegado', 'text' => "Hola {nombre}, ya ha llegado tu encargo: {encargo}. Puedes pasar a recogerlo por {tienda}."),
        );
    }

    public static function variables()
    {
        return array('{nombre}', '{rep}', '{modelo}', '{averia}', '{lineas}', '{total}', '{enlace}', '{fecha_prevista}', '{dias}', '{estado}', '{seguimiento}', '{tienda}', '{encargo}', '{resena}');
    }

    public static function templates()
    {
        $tpl = self::defaultTemplates();
        $saved = json_decode((string) Configuration::get('ECOREPAIRS_WA_TEMPLATES'), true);
        if (is_array($saved)) {
            foreach ($saved as $k => $text) {
                if (isset($tpl[$k]) && is_string($text) && trim($text) !== '') {
                    $tpl[$k]['text'] = $text;
                }
            }
        }

        return $tpl;
    }

    public static function saveTemplates($in)
    {
        if (!is_array($in)) {
            return false;
        }
        $out = array();
        foreach (self::defaultTemplates() as $k => $def) {
            if (isset($in[$k]) && is_string($in[$k])) {
                $out[$k] = Tools::substr(strip_tags($in[$k]), 0, 1500);
            }
        }

        return Configuration::updateValue('ECOREPAIRS_WA_TEMPLATES', json_encode($out));
    }

    /** Valores de las variables para una reparación. */
    public static function values(array $repair, $trackingUrl)
    {
        $c = EcoRepairCustomer::info((int) $repair['id_customer']);
        $lines = '';
        $total = '';
        $link = '';
        $quotes = EcoRepairQuote::forRepair((int) $repair['id_ecorepair']);
        $pick = null;
        foreach ($quotes as $q) {
            if (in_array($q['status'], array(EcoRepairQuote::SENT, EcoRepairQuote::ACCEPTED, EcoRepairQuote::DRAFT), true)) {
                $pick = $q;
            }
        }
        if ($pick) {
            $rows = array();
            foreach (EcoRepairQuote::lines((int) $pick['id_ecorepair_quote']) as $l) {
                $rows[] = '- ' . $l['name'] . ': ' . ($l['warranty'] ? 'garantía' : EcoRepairQuote::money($l['total']));
            }
            $lines = implode("\n", $rows);
            if ($pick['token'] && $pick['status'] === EcoRepairQuote::SENT) {
                $link = EcoRepairQuote::link($pick['token']);
            }
        }
        $pay = EcoRepairPayment::summary((int) $repair['id_ecorepair']);
        $total = EcoRepairQuote::money($pay['due'] > 0 ? $pay['pending'] ?: $pay['due'] : ($pick ? $pick['total_tax_incl'] : 0));
        $faults = is_array($repair['faults']) ? $repair['faults'] : array();

        return array(
            '{nombre}' => $c ? $c['firstname'] : '',
            '{rep}' => $repair['reference'],
            '{modelo}' => $repair['device_name'],
            '{averia}' => trim(implode(', ', $faults) . ($repair['fault_customer'] ? ' ' . $repair['fault_customer'] : '')),
            '{lineas}' => $lines,
            '{total}' => $total,
            '{enlace}' => $link,
            '{fecha_prevista}' => $repair['eta_date'] && $repair['eta_date'] !== '0000-00-00' ? date('d/m/Y', strtotime($repair['eta_date'])) : 'por confirmar',
            '{dias}' => (string) (int) $repair['days_in_status'],
            '{estado}' => EcoRepairStatus::name($repair['status']),
            '{seguimiento}' => $trackingUrl,
            '{tienda}' => Configuration::get('PS_SHOP_NAME'),
            '{encargo}' => '',
            '{resena}' => (string) Configuration::get('ECOREPAIRS_REVIEW_URL'),
        );
    }

    public static function render($text, array $values)
    {
        // Se quitan las líneas que acaban en una variable vacía (p. ej. «Acéptalo aquí: {enlace}» sin enlace)
        $keep = array();
        foreach (preg_split('/\r\n|\r|\n/', (string) $text) as $line) {
            $drop = false;
            foreach ($values as $var => $val) {
                if ((string) $val === '' && preg_match('/' . preg_quote($var, '/') . '\s*$/', $line)) {
                    $drop = true;
                }
            }
            if (!$drop) {
                $keep[] = $line;
            }
        }

        return trim(preg_replace("/\n{3,}/", "\n\n", strtr(implode("\n", $keep), $values)));
    }

    /** Teléfono en formato internacional sin «+» (34600111222) para WhatsApp. */
    public static function waPhone($phone)
    {
        $d = preg_replace('/\D+/', '', (string) $phone);
        if (strpos($d, '00') === 0) {
            $d = substr($d, 2);
        }
        if (strlen($d) === 9) {
            $d = '34' . $d;
        }

        return $d;
    }

    public static function log($idRepair, $idRequest, $idCustomer, $channel, $template, $recipient, $body, $idEmployee)
    {
        Db::getInstance()->insert('ecorepair_message', array(
            'id_ecorepair' => (int) $idRepair,
            'id_ecorepair_request' => (int) $idRequest,
            'id_customer' => (int) $idCustomer,
            'channel' => pSQL($channel),
            'template' => pSQL(Tools::substr((string) $template, 0, 32)),
            'recipient' => pSQL(Tools::substr((string) $recipient, 0, 128)),
            'body' => pSQL(Tools::substr((string) $body, 0, 4000)),
            'id_employee' => (int) $idEmployee,
            'date_add' => date('Y-m-d H:i:s'),
        ));
        if ($idRepair) {
            $names = self::defaultTemplates();
            EcoRepairLog::add($idRepair, $idEmployee, 'message', ($channel === 'email' ? 'Email' : 'WhatsApp') . ' enviado'
                . (isset($names[$template]) ? ' · ' . $names[$template]['name'] : '') . ' · ' . $recipient);
        }
    }

    public static function forCustomer($idCustomer)
    {
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT m.*, r.reference, e.firstname, e.lastname FROM `{$p}ecorepair_message` m
            LEFT JOIN `{$p}ecorepair` r ON r.id_ecorepair = m.id_ecorepair
            LEFT JOIN `{$p}employee` e ON e.id_employee = m.id_employee
            WHERE m.id_customer = " . (int) $idCustomer . ' ORDER BY m.date_add DESC LIMIT 100');
        $out = array();
        foreach ($rows ?: array() as $r) {
            $out[] = array(
                'channel' => $r['channel'],
                'template' => $r['template'],
                'reference' => (string) $r['reference'],
                'recipient' => $r['recipient'],
                'body' => $r['body'],
                'employee' => trim($r['firstname'] . ' ' . $r['lastname']),
                'date' => $r['date_add'],
            );
        }

        return $out;
    }

    /* ------------------------------------------------------------------ */
    /* Emails                                                              */
    /* ------------------------------------------------------------------ */

    /** Frase de cada estado para el email. */
    protected static function statusSentence($status)
    {
        $s = array(
            EcoRepairStatus::RECEIVED => 'Hemos recibido tu equipo y lo revisaremos lo antes posible.',
            EcoRepairStatus::DIAGNOSIS => 'Estamos revisando tu equipo para ver qué le pasa.',
            EcoRepairStatus::QUOTE => 'Ya tenemos el presupuesto de la reparación.',
            EcoRepairStatus::REPAIR => 'Estamos reparando tu equipo.',
            EcoRepairStatus::READY => 'Tu equipo ya está reparado y listo para recoger.',
            EcoRepairStatus::DELIVERED => 'Has recogido tu equipo. ¡Gracias por confiar en nosotros!',
            EcoRepairStatus::CANCELLED => 'La reparación se ha cerrado sin reparar.',
        );

        return isset($s[$status]) ? $s[$status] : '';
    }

    /**
     * Email de cambio de estado si ese estado está activado en Ajustes y el cliente tiene email.
     */
    public static function statusEmail($idRepair, $status, $idEmployee, $trackingUrl)
    {
        $enabled = array_filter(explode(',', (string) Configuration::get('ECOREPAIRS_EMAIL_STATUSES')));
        if (!in_array($status, $enabled, true)) {
            return false;
        }
        $repair = EcoRepair::get((int) $idRepair);

        return $repair ? self::sendEmail($repair, 'status_' . $status, 'Tu reparación ' . $repair['reference'] . ': ' . EcoRepairStatus::name($status),
            self::statusSentence($status), '', $idEmployee, $trackingUrl) : false;
    }

    /** Email con el enlace del presupuesto. */
    public static function quoteEmail(array $repair, $link, $total, $idEmployee, $trackingUrl)
    {
        if (!Configuration::get('ECOREPAIRS_EMAIL_QUOTE')) {
            return false;
        }

        return self::sendEmail($repair, 'quote', 'Presupuesto de tu reparación ' . $repair['reference'],
            'Ya tenemos el presupuesto de tu ' . $repair['device_name'] . ': ' . $total . '. Puedes verlo y aceptarlo o rechazarlo en el botón de abajo.',
            $link, $idEmployee, $trackingUrl);
    }

    public static function sendEmail(array $repair, $template, $subject, $message, $buttonUrl, $idEmployee, $trackingUrl)
    {
        $c = EcoRepairCustomer::info((int) $repair['id_customer']);
        if (!$c || $c['email'] === '' || !Validate::isEmail($c['email'])) {
            return false;
        }
        $idLang = (int) Language::getIdByIso('es') ?: (int) Configuration::get('PS_LANG_DEFAULT');
        $vars = array(
            '{firstname}' => $c['firstname'],
            '{reference}' => $repair['reference'],
            '{device}' => $repair['device_name'],
            '{status}' => EcoRepairStatus::name($repair['status']),
            '{message}' => $message,
            '{button_url}' => $buttonUrl ?: $trackingUrl,
            '{button_text}' => $buttonUrl ? 'Ver el presupuesto' : 'Ver cómo va mi reparación',
            '{tracking_url}' => $trackingUrl,
            '{shop_phone}' => (string) Configuration::get('PS_SHOP_PHONE'),
        );
        try {
            $ok = Mail::Send($idLang, 'ecorepairs_notice', $subject, $vars, $c['email'], $c['name'], null, null, null, null,
                _PS_MODULE_DIR_ . 'ecorepairs/mails/', false, (int) $repair['id_shop']);
        } catch (Exception $e) {
            $ok = false;
        }
        if ($ok) {
            self::log((int) $repair['id_ecorepair'], 0, (int) $repair['id_customer'], 'email', $template, $c['email'], $subject . "\n" . $message, $idEmployee);
        }

        return (bool) $ok;
    }

    /**
     * Recordatorio automático de «sin recoger» (por email). Se ejecuta como mucho una vez al día al abrir el tablero.
     * Solo a reparaciones listas desde hace X días y sin recordatorio en los últimos X días.
     */
    public static function autoReminders($idShop, $trackingUrlFn)
    {
        if (!Configuration::get('ECOREPAIRS_REMINDER_AUTO') || Configuration::get('ECOREPAIRS_REMINDER_LAST') === date('Y-m-d')) {
            return 0;
        }
        Configuration::updateValue('ECOREPAIRS_REMINDER_LAST', date('Y-m-d'));
        $days = max(1, (int) Configuration::get('ECOREPAIRS_PICKUP_DAYS'));
        $p = _DB_PREFIX_;
        $ids = Db::getInstance()->executeS("SELECT id_ecorepair FROM `{$p}ecorepair`
            WHERE id_shop = " . (int) $idShop . " AND status = 'ready' AND date_status <= DATE_SUB(NOW(), INTERVAL {$days} DAY)
              AND (date_reminder IS NULL OR date_reminder <= DATE_SUB(NOW(), INTERVAL {$days} DAY)) LIMIT 50") ?: array();
        $tpl = self::templates();
        $n = 0;
        foreach ($ids as $row) {
            $repair = EcoRepair::get((int) $row['id_ecorepair']);
            if (!$repair) {
                continue;
            }
            $url = call_user_func($trackingUrlFn, $repair['tracking_code']);
            $text = self::render($tpl['reminder']['text'], self::values($repair, $url));
            if (self::sendEmail($repair, 'reminder', 'Tu ' . $repair['device_name'] . ' te espera', $text, '', 0, $url)) {
                ++$n;
            }
            Db::getInstance()->update('ecorepair', array('date_reminder' => date('Y-m-d H:i:s')), 'id_ecorepair = ' . (int) $repair['id_ecorepair']);
        }

        return $n;
    }
}
