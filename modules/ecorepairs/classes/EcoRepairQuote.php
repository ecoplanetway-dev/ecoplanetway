<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Presupuestos de una reparación.
 *
 * - Cada reparación tiene presupuestos numerados (1 = principal, 2+ = adicionales).
 * - Cada número tiene versiones. Solo el borrador se puede editar.
 * - Al modificar un presupuesto enviado se crea una versión nueva y la anterior queda «sustituida»
 *   (su enlace ya no admite respuesta).
 * - Aceptado = bloqueado. Los trabajos nuevos van en un presupuesto adicional.
 * - Los importes de las líneas quedan congelados: no se recalculan con el precio actual del producto.
 */
class EcoRepairQuote
{
    const DRAFT = 'draft';
    const SENT = 'sent';
    const ACCEPTED = 'accepted';
    const REJECTED = 'rejected';
    const SUPERSEDED = 'superseded';

    const MAX_LINES = 100;

    public static function statusNames()
    {
        return array(
            self::DRAFT => 'Borrador',
            self::SENT => 'Enviado',
            self::ACCEPTED => 'Aceptado',
            self::REJECTED => 'Rechazado',
            self::SUPERSEDED => 'Sustituido',
        );
    }

    public static function lineTypes()
    {
        return array('part', 'labour', 'other');
    }

    public static function taxRates()
    {
        return array(21, 10, 4, 0);
    }

    public static function label(array $q)
    {
        return 'Presupuesto ' . (int) $q['number'] . ((int) $q['number'] > 1 ? ' (adicional)' : '') . ' · v' . (int) $q['version'];
    }

    /* ------------------------------------------------------------------ */
    /* Lectura                                                             */
    /* ------------------------------------------------------------------ */

    public static function get($id)
    {
        $row = Db::getInstance()->getRow('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_quote` WHERE id_ecorepair_quote = ' . (int) $id);

        return $row ?: false;
    }

    public static function getByToken($token)
    {
        if (!preg_match('/^[a-f0-9]{32}$/', (string) $token)) {
            return false;
        }
        $row = Db::getInstance()->getRow('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_quote` WHERE token = \'' . pSQL($token) . '\'');

        return $row ?: false;
    }

    public static function forRepair($idRepair)
    {
        $rows = Db::getInstance()->executeS('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_quote`
            WHERE id_ecorepair = ' . (int) $idRepair . ' ORDER BY number ASC, version ASC');

        return $rows ?: array();
    }

    public static function lines($idQuote)
    {
        $rows = Db::getInstance()->executeS('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_quote_line`
            WHERE id_ecorepair_quote = ' . (int) $idQuote . ' ORDER BY position ASC, id_ecorepair_quote_line ASC');

        return self::decorateLines($rows ?: array());
    }

    public static function decorateLines(array $rows)
    {
        $out = array();
        foreach ($rows as $l) {
            $qty = (float) $l['qty'];
            $excl = (float) $l['unit_price_tax_excl'];
            $rate = (float) $l['tax_rate'];
            $disc = isset($l['discount']) ? (float) $l['discount'] : 0.0;
            $out[] = array(
                'type' => (string) $l['type'],
                'id_product' => (int) $l['id_product'],
                'id_product_attribute' => (int) $l['id_product_attribute'],
                'name' => (string) $l['name'],
                'reference' => (string) $l['reference'],
                'qty' => $qty,
                'qty_text' => str_replace('.', ',', rtrim(rtrim(number_format($qty, 2, '.', ''), '0'), '.')),
                'unit_price_tax_excl' => $excl,
                'tax_rate' => $rate,
                'price' => round($excl * (1 + $rate / 100), 2),
                'discount' => round($disc, 2),
                'gross' => round($qty * $excl * (1 + $rate / 100), 2),
                'total' => round($qty * $excl * (1 + $rate / 100) - $disc, 2),
                'warranty' => isset($l['warranty']) ? (int) $l['warranty'] : 0,
            );
        }

        return $out;
    }

    /** La última versión de un número es la que vale. */
    protected static function isLatest(array $q)
    {
        $max = (int) Db::getInstance()->getValue('SELECT MAX(version) FROM `' . _DB_PREFIX_ . 'ecorepair_quote`
            WHERE id_ecorepair = ' . (int) $q['id_ecorepair'] . ' AND number = ' . (int) $q['number']);

        return (int) $q['version'] === $max;
    }

    public static function link($token)
    {
        return Context::getContext()->link->getModuleLink('ecorepairs', 'quote', array('t' => $token), true);
    }

    /* ------------------------------------------------------------------ */
    /* Líneas e importes                                                   */
    /* ------------------------------------------------------------------ */

    protected static function num($v)
    {
        return (float) str_replace(',', '.', trim((string) $v));
    }

    /**
     * Valida las líneas recibidas del navegador. El precio llega con IVA (como lo ve el cliente)
     * y se guarda sin IVA con 6 decimales.
     * Devuelve array('ok' => true, 'lines' => ...) o array('ok' => false, 'error' => ...).
     */
    public static function cleanLines($raw, $withWarranty = true)
    {
        if (!is_array($raw)) {
            return array('ok' => false, 'error' => 'Líneas no válidas.');
        }
        if (count($raw) > self::MAX_LINES) {
            return array('ok' => false, 'error' => 'Máximo ' . self::MAX_LINES . ' líneas.');
        }
        $out = array();
        $productIds = array();
        foreach (array_values($raw) as $i => $l) {
            if (!is_array($l)) {
                return array('ok' => false, 'error' => 'Línea ' . ($i + 1) . ' no válida.');
            }
            $n = $i + 1;
            $type = isset($l['type']) && in_array($l['type'], self::lineTypes(), true) ? $l['type'] : 'other';
            $name = trim(strip_tags(isset($l['name']) ? (string) $l['name'] : ''));
            if ($name === '' || Tools::strlen($name) > 128) {
                return array('ok' => false, 'error' => 'Línea ' . $n . ': escribe la descripción (máximo 128 caracteres).');
            }
            $qty = round(self::num(isset($l['qty']) ? $l['qty'] : 0), 2);
            if ($qty <= 0 || $qty > 9999) {
                return array('ok' => false, 'error' => 'Línea ' . $n . ': la cantidad no es válida.');
            }
            $price = round(self::num(isset($l['price']) ? $l['price'] : 0), 2);
            if ($price < 0 || $price > 999999) {
                return array('ok' => false, 'error' => 'Línea ' . $n . ': el precio no es válido.');
            }
            $discount = round(self::num(isset($l['discount']) ? $l['discount'] : 0), 2);
            if ($discount < 0 || $discount > round($qty * $price, 2)) {
                return array('ok' => false, 'error' => 'Línea ' . $n . ': el descuento no puede ser mayor que el importe.');
            }
            $rate = self::num(isset($l['tax_rate']) ? $l['tax_rate'] : 21);
            if (!in_array((int) $rate, self::taxRates(), true) || (float) (int) $rate !== $rate) {
                return array('ok' => false, 'error' => 'Línea ' . $n . ': el IVA no es válido.');
            }
            $idProduct = isset($l['id_product']) ? max(0, (int) $l['id_product']) : 0;
            $idAttr = isset($l['id_product_attribute']) ? max(0, (int) $l['id_product_attribute']) : 0;
            if ($type !== 'part') {
                $idProduct = 0;
                $idAttr = 0;
            }
            if ($idProduct) {
                $productIds[$idProduct] = true;
            }
            $out[] = array(
                'position' => $i,
                'type' => $type,
                'id_product' => $idProduct,
                'id_product_attribute' => $idProduct ? $idAttr : 0,
                'name' => $name,
                'reference' => Tools::substr(trim(strip_tags(isset($l['reference']) ? (string) $l['reference'] : '')), 0, 64),
                'qty' => $qty,
                'unit_price_tax_excl' => round($price / (1 + $rate / 100), 6),
                'tax_rate' => (int) $rate,
                'warranty' => $withWarranty && !empty($l['warranty']) ? 1 : 0,
                'discount' => $withWarranty ? $discount : 0,
            );
        }
        if ($productIds) {
            $found = Db::getInstance()->executeS('SELECT id_product FROM `' . _DB_PREFIX_ . 'product`
                WHERE id_product IN (' . implode(',', array_map('intval', array_keys($productIds))) . ')');
            $ok = array();
            foreach ($found ?: array() as $f) {
                $ok[(int) $f['id_product']] = true;
            }
            foreach ($out as &$line) {
                if ($line['id_product'] && !isset($ok[$line['id_product']])) {
                    $line['id_product'] = 0;
                    $line['id_product_attribute'] = 0;
                }
            }
            unset($line);
        }

        return array('ok' => true, 'lines' => $out);
    }

    /**
     * Total = líneas no cubiertas por garantía. Cada línea se redondea a 2 decimales.
     */
    public static function totals(array $lines)
    {
        $excl = 0.0;
        $incl = 0.0;
        $war = 0.0;
        foreach ($lines as $l) {
            $disc = isset($l['discount']) ? (float) $l['discount'] : 0.0;
            $base = (float) $l['qty'] * (float) $l['unit_price_tax_excl'] - $disc / (1 + (float) $l['tax_rate'] / 100);
            $lineIncl = round((float) $l['qty'] * (float) $l['unit_price_tax_excl'] * (1 + (float) $l['tax_rate'] / 100) - $disc, 2);
            if (!empty($l['warranty'])) {
                $war += $lineIncl;
            } else {
                $excl += round($base, 2);
                $incl += $lineIncl;
            }
        }

        return array(
            'total_tax_excl' => round($excl, 2),
            'total_tax_incl' => round($incl, 2),
            'tax' => round($incl - $excl, 2),
            'warranty_amount' => round($war, 2),
        );
    }

    protected static function writeLines($idQuote, array $lines)
    {
        $db = Db::getInstance();
        $db->delete('ecorepair_quote_line', 'id_ecorepair_quote = ' . (int) $idQuote);
        foreach ($lines as $i => $l) {
            $db->insert('ecorepair_quote_line', array(
                'id_ecorepair_quote' => (int) $idQuote,
                'position' => (int) $i,
                'type' => pSQL($l['type']),
                'id_product' => (int) $l['id_product'],
                'id_product_attribute' => (int) $l['id_product_attribute'],
                'name' => pSQL($l['name']),
                'reference' => pSQL($l['reference']),
                'qty' => (float) $l['qty'],
                'unit_price_tax_excl' => (float) $l['unit_price_tax_excl'],
                'tax_rate' => (float) $l['tax_rate'],
                'warranty' => !empty($l['warranty']) ? 1 : 0,
                'discount' => isset($l['discount']) ? (float) $l['discount'] : 0,
            ));
        }
        $t = self::totals($lines);
        $db->update('ecorepair_quote', array(
            'total_tax_excl' => $t['total_tax_excl'],
            'total_tax_incl' => $t['total_tax_incl'],
            'warranty_amount' => $t['warranty_amount'],
            'date_upd' => date('Y-m-d H:i:s'),
        ), 'id_ecorepair_quote = ' . (int) $idQuote);

        return $t;
    }

    /* ------------------------------------------------------------------ */
    /* Datos para el navegador                                             */
    /* ------------------------------------------------------------------ */

    public static function publicQuote(array $q, $withStock = false)
    {
        $lines = self::lines((int) $q['id_ecorepair_quote']);
        if ($withStock) {
            $idShop = (int) Context::getContext()->shop->id;
            foreach ($lines as &$l) {
                $l['stock'] = $l['id_product']
                    ? (int) StockAvailable::getQuantityAvailableByProduct($l['id_product'], $l['id_product_attribute'], $idShop)
                    : null;
            }
            unset($l);
        }
        foreach ($lines as &$l) {
            $l['image'] = $l['id_product'] ? self::productImage($l['id_product'], $l['id_product_attribute'], '', (int) Context::getContext()->shop->id) : '';
        }
        unset($l);
        $names = self::statusNames();
        $acceptedBy = '';
        if ((int) $q['id_employee_accept']) {
            $e = new Employee((int) $q['id_employee_accept']);
            $acceptedBy = Validate::isLoadedObject($e) ? trim($e->firstname . ' ' . $e->lastname) : '';
        }
        $expired = $q['status'] === self::SENT && $q['date_expire'] && strtotime($q['date_expire']) < time();

        return array(
            'id' => (int) $q['id_ecorepair_quote'],
            'number' => (int) $q['number'],
            'version' => (int) $q['version'],
            'label' => self::label($q),
            'status' => $q['status'],
            'status_name' => isset($names[$q['status']]) ? $names[$q['status']] : $q['status'],
            'expired' => (bool) $expired,
            'link' => $q['token'] ? self::link($q['token']) : '',
            'notes' => (string) $q['notes'],
            'totals' => self::totals($lines),
            'channel' => (string) $q['channel'],
            'ip' => (string) $q['ip'],
            'answer_note' => (string) $q['answer_note'],
            'accepted_by' => $acceptedBy,
            'id_photo_signature' => (int) $q['id_photo_signature'],
            'date_add' => $q['date_add'],
            'date_sent' => (string) $q['date_sent'],
            'date_expire' => (string) $q['date_expire'],
            'date_answer' => (string) $q['date_answer'],
            'lines' => $lines,
        );
    }

    public static function publicList($idRepair)
    {
        $out = array();
        foreach (self::forRepair($idRepair) as $q) {
            $out[] = self::publicQuote($q, $q['status'] === self::DRAFT);
        }

        return $out;
    }

    /**
     * Resumen para la ficha: la versión vigente de cada número.
     */
    public static function summary($idRepair)
    {
        $latest = array();
        foreach (self::forRepair($idRepair) as $q) {
            $latest[(int) $q['number']] = $q;
        }
        $names = self::statusNames();
        $out = array();
        foreach ($latest as $q) {
            $out[] = array(
                'id' => (int) $q['id_ecorepair_quote'],
                'label' => self::label($q),
                'status' => $q['status'],
                'status_name' => $names[$q['status']],
                'total' => (float) $q['total_tax_incl'],
                'warranty_amount' => (float) $q['warranty_amount'],
            );
        }

        return $out;
    }

    /* ------------------------------------------------------------------ */
    /* Cambios                                                             */
    /* ------------------------------------------------------------------ */

    public static function create($idRepair, $idEmployee)
    {
        $quotes = self::forRepair($idRepair);
        $latest = array();
        foreach ($quotes as $q) {
            $latest[(int) $q['number']] = $q;
            if (in_array($q['status'], array(self::DRAFT, self::SENT), true)) {
                return array('ok' => false, 'error' => 'Ya hay un presupuesto pendiente. Termínalo antes de crear otro.');
            }
        }
        $number = 1;
        if ($latest) {
            $last = end($latest);
            if ($last['status'] !== self::ACCEPTED) {
                return array('ok' => false, 'error' => 'El último presupuesto está rechazado: crea una versión nueva de ese presupuesto.');
            }
            $number = (int) $last['number'] + 1;
        }

        $id = self::insert($idRepair, $number, 1, '', $idEmployee);
        if (!$id) {
            return array('ok' => false, 'error' => 'No se pudo crear el presupuesto.');
        }
        EcoRepairLog::add($idRepair, $idEmployee, 'quote', ($number > 1 ? 'Presupuesto adicional ' . $number : 'Presupuesto') . ' creado');

        return array('ok' => true, 'id' => $id);
    }

    protected static function insert($idRepair, $number, $version, $notes, $idEmployee)
    {
        $now = date('Y-m-d H:i:s');
        $ok = Db::getInstance()->insert('ecorepair_quote', array(
            'id_ecorepair' => (int) $idRepair,
            'number' => (int) $number,
            'version' => (int) $version,
            'status' => self::DRAFT,
            'token' => '',
            'notes' => pSQL($notes),
            'total_tax_excl' => 0,
            'total_tax_incl' => 0,
            'warranty_amount' => 0,
            'channel' => '',
            'ip' => '',
            'answer_note' => '',
            'id_employee_add' => (int) $idEmployee,
            'id_employee_accept' => 0,
            'id_photo_signature' => 0,
            'date_add' => $now,
            'date_upd' => $now,
            'date_sent' => array('type' => 'sql', 'value' => 'NULL'),
            'date_expire' => array('type' => 'sql', 'value' => 'NULL'),
            'date_answer' => array('type' => 'sql', 'value' => 'NULL'),
        ));

        return $ok ? (int) Db::getInstance()->Insert_ID() : 0;
    }

    public static function saveDraft(array $q, $rawLines, $notes)
    {
        if ($q['status'] !== self::DRAFT) {
            return array('ok' => false, 'error' => 'Este presupuesto ya no se puede modificar.', 'locked' => true);
        }
        $notes = trim(strip_tags((string) $notes));
        if (Tools::strlen($notes) > 3000) {
            return array('ok' => false, 'error' => 'Las observaciones son demasiado largas (máximo 3000 caracteres).');
        }
        $clean = self::cleanLines($rawLines);
        if (!$clean['ok']) {
            return $clean;
        }
        Db::getInstance()->update('ecorepair_quote', array('notes' => pSQL($notes)), 'id_ecorepair_quote = ' . (int) $q['id_ecorepair_quote']);
        $totals = self::writeLines((int) $q['id_ecorepair_quote'], $clean['lines']);

        return array('ok' => true, 'totals' => $totals);
    }

    /**
     * Añade piezas al borrador del presupuesto (lo crea si hace falta; si el principal está aceptado, va a un adicional).
     * $new: líneas con id_product, id_product_attribute, name, reference, qty, price (IVA incl.), tax_rate.
     */
    public static function appendToDraft(array $repair, array $new, $idEmployee, $who)
    {
        $idRepair = (int) $repair['id_ecorepair'];
        $draft = null;
        foreach (self::forRepair($idRepair) as $q) {
            if ($q['status'] === self::DRAFT) {
                $draft = $q;
            }
            if ($q['status'] === self::SENT) {
                return array('ok' => false, 'error' => 'Hay un presupuesto enviado esperando respuesta del cliente. Haz una versión nueva para cambiarlo.');
            }
        }
        if (!$draft) {
            $res = self::create($idRepair, $idEmployee);
            if (!$res['ok']) {
                return $res;
            }
            $draft = self::get($res['id']);
        }
        $lines = array();
        foreach (self::lines((int) $draft['id_ecorepair_quote']) as $l) {
            $lines[] = array('type' => $l['type'], 'id_product' => $l['id_product'], 'id_product_attribute' => $l['id_product_attribute'], 'name' => $l['name'],
                'reference' => $l['reference'], 'qty' => $l['qty'], 'price' => $l['price'], 'tax_rate' => $l['tax_rate'], 'warranty' => $l['warranty'], 'discount' => $l['discount']);
        }
        $names = array();
        foreach ($new as $n) {
            if (!is_array($n)) {
                continue;
            }
            $n['type'] = isset($n['type']) && $n['type'] === 'labour' ? 'labour' : 'part';
            $n['warranty'] = (int) $repair['warranty'];
            $n['discount'] = 0;
            $lines[] = $n;
            $names[] = (isset($n['qty']) ? (float) $n['qty'] : 1) . ' × ' . (isset($n['name']) ? $n['name'] : '');
        }
        if (!$names) {
            return array('ok' => false, 'error' => 'Elige alguna pieza.');
        }
        $res = self::saveDraft($draft, $lines, (string) $draft['notes']);
        if (!$res['ok']) {
            return $res;
        }
        EcoRepairLog::add($idRepair, $idEmployee, 'quote', 'Piezas añadidas al ' . Tools::strtolower(self::label($draft)) . ' (borrador)' . ($who ? ' por ' . $who : '') . ': ' . implode(', ', $names));

        return array('ok' => true, 'added' => count($names), 'id_quote' => (int) $draft['id_ecorepair_quote']);
    }

    public static function newVersion(array $q, $idEmployee)
    {
        if (!in_array($q['status'], array(self::SENT, self::REJECTED), true) || !self::isLatest($q)) {
            return array('ok' => false, 'error' => 'Solo se puede hacer una versión nueva de un presupuesto enviado o rechazado.');
        }
        $id = self::insert((int) $q['id_ecorepair'], (int) $q['number'], (int) $q['version'] + 1, (string) $q['notes'], $idEmployee);
        if (!$id) {
            return array('ok' => false, 'error' => 'No se pudo crear la versión.');
        }
        $rows = Db::getInstance()->executeS('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_quote_line`
            WHERE id_ecorepair_quote = ' . (int) $q['id_ecorepair_quote'] . ' ORDER BY position ASC');
        self::writeLines($id, $rows ?: array());
        if ($q['status'] === self::SENT) {
            Db::getInstance()->update('ecorepair_quote', array('status' => self::SUPERSEDED, 'date_upd' => date('Y-m-d H:i:s')), 'id_ecorepair_quote = ' . (int) $q['id_ecorepair_quote']);
        }
        EcoRepairLog::add((int) $q['id_ecorepair'], $idEmployee, 'quote', self::label($q) . ' sustituido por la versión ' . ((int) $q['version'] + 1));

        return array('ok' => true, 'id' => $id);
    }

    /**
     * Descarta un borrador. Si era una versión nueva, la anterior vuelve a estar enviada.
     */
    public static function discard(array $q, $idEmployee)
    {
        if ($q['status'] !== self::DRAFT) {
            return array('ok' => false, 'error' => 'Solo se puede descartar un borrador.');
        }
        $db = Db::getInstance();
        $db->delete('ecorepair_quote_line', 'id_ecorepair_quote = ' . (int) $q['id_ecorepair_quote']);
        $db->delete('ecorepair_quote', 'id_ecorepair_quote = ' . (int) $q['id_ecorepair_quote']);
        if ((int) $q['version'] > 1) {
            $db->update('ecorepair_quote', array('status' => self::SENT), 'id_ecorepair = ' . (int) $q['id_ecorepair']
                . ' AND number = ' . (int) $q['number'] . ' AND version = ' . ((int) $q['version'] - 1)
                . ' AND status = \'' . self::SUPERSEDED . '\'');
        }
        EcoRepairLog::add((int) $q['id_ecorepair'], $idEmployee, 'quote', self::label($q) . ': borrador descartado');

        return array('ok' => true);
    }

    public static function send(array $q, $idEmployee)
    {
        if ($q['status'] !== self::DRAFT) {
            return array('ok' => false, 'error' => 'Este presupuesto ya se envió.');
        }
        if (!self::lines((int) $q['id_ecorepair_quote'])) {
            return array('ok' => false, 'error' => 'Añade al menos una línea.');
        }
        $days = max(1, (int) Configuration::get('ECOREPAIRS_QUOTE_DAYS'));
        $token = bin2hex(random_bytes(16));
        $db = Db::getInstance();
        $db->execute('UPDATE `' . _DB_PREFIX_ . 'ecorepair_quote` SET status = \'' . self::SENT . '\', token = \'' . pSQL($token) . '\',
            date_sent = NOW(), date_expire = DATE_ADD(NOW(), INTERVAL ' . $days . ' DAY), date_upd = NOW()
            WHERE id_ecorepair_quote = ' . (int) $q['id_ecorepair_quote'] . ' AND status = \'' . self::DRAFT . '\'');
        if (!$db->Affected_Rows()) {
            return array('ok' => false, 'error' => 'Este presupuesto ya se envió.');
        }
        $q = self::get((int) $q['id_ecorepair_quote']);
        EcoRepairLog::add((int) $q['id_ecorepair'], $idEmployee, 'quote', self::label($q) . ' listo para enviar al cliente · '
            . self::money($q['total_tax_incl']) . ' · válido hasta el ' . date('d/m/Y', strtotime($q['date_expire'])));

        $repair = EcoRepair::get((int) $q['id_ecorepair']);
        if ($repair && in_array($repair['status'], array(EcoRepairStatus::RECEIVED, EcoRepairStatus::DIAGNOSIS), true)) {
            EcoRepair::setStatus((int) $q['id_ecorepair'], EcoRepairStatus::QUOTE, $idEmployee);
        }

        return array('ok' => true, 'link' => self::link($token));
    }

    /**
     * Aprobado en tienda: hace falta la firma del cliente.
     */
    public static function acceptInStore(array $q, $signatureDataUrl, $idEmployee)
    {
        if (!in_array($q['status'], array(self::DRAFT, self::SENT), true)) {
            return array('ok' => false, 'error' => 'Este presupuesto ya está respondido o sustituido.');
        }
        if (!self::lines((int) $q['id_ecorepair_quote'])) {
            return array('ok' => false, 'error' => 'Añade al menos una línea.');
        }
        // La firma es opcional: basta con la confirmación del empleado
        $sig = array('ok' => true, 'id' => 0);
        if ((string) $signatureDataUrl !== '') {
            $sig = EcoRepairPhoto::saveSignature((int) $q['id_ecorepair'], $signatureDataUrl, $idEmployee, 'quote_sig');
            if (!$sig['ok']) {
                return $sig;
            }
        }
        $db = Db::getInstance();
        $db->execute('UPDATE `' . _DB_PREFIX_ . 'ecorepair_quote` SET status = \'' . self::ACCEPTED . '\', channel = \'store\',
            id_employee_accept = ' . (int) $idEmployee . ', id_photo_signature = ' . (int) $sig['id'] . ', ip = \'\',
            date_answer = NOW(), date_upd = NOW()
            WHERE id_ecorepair_quote = ' . (int) $q['id_ecorepair_quote'] . ' AND status IN (\'' . self::DRAFT . '\', \'' . self::SENT . '\')');
        if (!$db->Affected_Rows()) {
            if ($sig['id']) {
                EcoRepairPhoto::delete((int) $sig['id'], $idEmployee);
            }

            return array('ok' => false, 'error' => 'Este presupuesto ya está respondido.');
        }
        EcoRepairLog::add((int) $q['id_ecorepair'], $idEmployee, 'quote', self::label($q) . ' aprobado en tienda' . ($sig['id'] ? ' con firma' : ' (sin firma)') . ' · ' . self::money($q['total_tax_incl']));
        self::afterAccept($q, $idEmployee);

        return array('ok' => true);
    }

    public static function rejectInStore(array $q, $reason, $idEmployee)
    {
        if (!in_array($q['status'], array(self::DRAFT, self::SENT), true)) {
            return array('ok' => false, 'error' => 'Este presupuesto ya está respondido o sustituido.');
        }
        $reason = Tools::substr(trim(strip_tags((string) $reason)), 0, 255);
        $db = Db::getInstance();
        $db->execute('UPDATE `' . _DB_PREFIX_ . 'ecorepair_quote` SET status = \'' . self::REJECTED . '\', channel = \'store\',
            answer_note = \'' . pSQL($reason) . '\', id_employee_accept = ' . (int) $idEmployee . ', date_answer = NOW(), date_upd = NOW()
            WHERE id_ecorepair_quote = ' . (int) $q['id_ecorepair_quote'] . ' AND status IN (\'' . self::DRAFT . '\', \'' . self::SENT . '\')');
        if (!$db->Affected_Rows()) {
            return array('ok' => false, 'error' => 'Este presupuesto ya está respondido.');
        }
        EcoRepairLog::add((int) $q['id_ecorepair'], $idEmployee, 'quote', self::label($q) . ' rechazado en tienda' . ($reason !== '' ? ' · ' . $reason : ''));

        return array('ok' => true);
    }

    /**
     * Respuesta del cliente desde el enlace. Solo vale una vez: la actualización exige estado «enviado» y sin caducar.
     * Devuelve array('ok' => bool, 'code' => accepted|rejected|answered|superseded|expired|notfound).
     */
    public static function answerByLink($token, $accept, $ip, $note)
    {
        $q = self::getByToken($token);
        if (!$q) {
            return array('ok' => false, 'code' => 'notfound');
        }
        $state = self::linkState($q);
        if ($state !== 'open') {
            return array('ok' => false, 'code' => $state, 'quote' => $q);
        }
        $status = $accept ? self::ACCEPTED : self::REJECTED;
        $note = Tools::substr(trim(strip_tags((string) $note)), 0, 255);
        $ip = Tools::substr(preg_replace('/[^0-9a-fA-F:.]/', '', (string) $ip), 0, 45);
        $db = Db::getInstance();
        $db->execute('UPDATE `' . _DB_PREFIX_ . 'ecorepair_quote` SET status = \'' . $status . '\', channel = \'link\',
            ip = \'' . pSQL($ip) . '\', answer_note = \'' . pSQL($accept ? '' : $note) . '\', date_answer = NOW(), date_upd = NOW()
            WHERE id_ecorepair_quote = ' . (int) $q['id_ecorepair_quote'] . ' AND status = \'' . self::SENT . '\'
              AND (date_expire IS NULL OR date_expire >= NOW())');
        if (!$db->Affected_Rows()) {
            $q = self::get((int) $q['id_ecorepair_quote']);

            return array('ok' => false, 'code' => self::linkState($q), 'quote' => $q);
        }
        EcoRepairLog::add((int) $q['id_ecorepair'], 0, 'quote', self::label($q) . ($accept ? ' aceptado' : ' rechazado')
            . ' por el cliente desde el enlace · IP ' . $ip . (!$accept && $note !== '' ? ' · ' . $note : ''));
        if ($accept) {
            self::afterAccept($q, 0);
        }

        return array('ok' => true, 'code' => $accept ? 'accepted' : 'rejected', 'quote' => self::get((int) $q['id_ecorepair_quote']));
    }

    public static function linkState(array $q)
    {
        if ($q['status'] === self::ACCEPTED || $q['status'] === self::REJECTED) {
            return 'answered';
        }
        if ($q['status'] === self::SUPERSEDED) {
            return 'superseded';
        }
        if ($q['status'] !== self::SENT) {
            return 'notfound';
        }
        if ($q['date_expire'] && strtotime($q['date_expire']) < time()) {
            return 'expired';
        }

        return 'open';
    }

    /** Al aceptar, la reparación pasa a «En reparación» si aún no estaba. */
    protected static function afterAccept(array $q, $idEmployee)
    {
        $repair = EcoRepair::get((int) $q['id_ecorepair']);
        if ($repair && in_array($repair['status'], array(EcoRepairStatus::RECEIVED, EcoRepairStatus::DIAGNOSIS, EcoRepairStatus::QUOTE), true)) {
            EcoRepair::setStatus((int) $q['id_ecorepair'], EcoRepairStatus::REPAIR, $idEmployee);
        }
    }

    public static function money($v)
    {
        return number_format((float) $v, 2, ',', '.') . ' €';
    }

    /* ------------------------------------------------------------------ */
    /* Buscador del catálogo                                               */
    /* ------------------------------------------------------------------ */

    /**
     * Cambia el stock y/o el precio de venta (IVA incluido) de un producto o combinación de la tienda.
     * $stock / $price a null = no se cambia.
     */
    public static function updateShopProduct($idProduct, $idAttr, $stock, $price, $idShop, $idLang, Employee $employee)
    {
        $product = new Product((int) $idProduct, false, null, (int) $idShop);
        if (!Validate::isLoadedObject($product)) {
            return array('ok' => false, 'error' => 'El producto no existe.');
        }
        $idAttr = (int) $idAttr;
        if ($idAttr) {
            $comb = new Combination($idAttr);
            if (!Validate::isLoadedObject($comb) || (int) $comb->id_product !== (int) $product->id) {
                return array('ok' => false, 'error' => 'La combinación no es de ese producto.');
            }
        }
        $done = array();
        if ($stock !== null) {
            $stock = trim((string) $stock);
            if (!preg_match('/^-?\d{1,6}$/', $stock)) {
                return array('ok' => false, 'error' => 'Escribe el stock en unidades (número entero).');
            }
            $old = (int) StockAvailable::getQuantityAvailableByProduct((int) $product->id, $idAttr, (int) $idShop);
            StockAvailable::setQuantity((int) $product->id, $idAttr, (int) $stock, (int) $idShop);
            $done[] = 'stock ' . $old . ' → ' . (int) $stock;
        }
        if ($price !== null) {
            $incl = round(self::num($price), 2);
            if ($incl < 0 || $incl > 999999) {
                return array('ok' => false, 'error' => 'El precio no es válido.');
            }
            $rate = (float) Tax::getProductTaxRate((int) $product->id);
            $excl = round($incl / (1 + $rate / 100), 6);
            try {
                if ($idAttr) {
                    $comb->price = round($excl - (float) $product->price, 6);
                    $comb->update();
                } else {
                    $product->price = $excl;
                    $product->update();
                }
            } catch (Exception $e) {
                return array('ok' => false, 'error' => 'PrestaShop no pudo guardar el precio: ' . $e->getMessage());
            }
            $done[] = 'precio ' . self::money($incl);
        }
        Product::flushPriceCache();
        $name = Product::getProductName((int) $product->id, $idAttr ?: null, (int) $idLang);
        PrestaShopLogger::addLog('ecorepairs: ' . $name . ': ' . implode(', ', $done) . ' (desde el presupuesto del taller)', 1, null, 'Product', (int) $product->id, true, (int) $employee->id);
        $final = round((float) Product::getPriceStatic((int) $product->id, true, $idAttr ?: null, 2, null, false, true, 1, true), 2);
        $base = round((float) Product::getPriceStatic((int) $product->id, true, $idAttr ?: null, 2, null, false, false, 1, true), 2);

        return array(
            'ok' => true,
            'stock' => (int) StockAvailable::getQuantityAvailableByProduct((int) $product->id, $idAttr, (int) $idShop),
            'price' => $final,
            'price_base' => $base,
            'has_discount' => $final < $base - 0.001,
        );
    }

    /**
     * Foto pequeña del producto: la de la combinación si tiene; si no, la portada del producto.
     */
    public static function productImage($idProduct, $idAttr, $linkRewrite, $idShop)
    {
        $p = _DB_PREFIX_;
        $db = Db::getInstance();
        $idImage = 0;
        if ($idAttr) {
            $idImage = (int) $db->getValue("SELECT pai.id_image FROM `{$p}product_attribute_image` pai
                INNER JOIN `{$p}image` i ON i.id_image = pai.id_image
                WHERE pai.id_product_attribute = " . (int) $idAttr . ' ORDER BY i.position ASC');
        }
        if (!$idImage) {
            $idImage = (int) $db->getValue("SELECT id_image FROM `{$p}image_shop` WHERE id_product = " . (int) $idProduct
                . ' AND id_shop = ' . (int) $idShop . ' AND cover = 1');
        }
        if (!$idImage) {
            return '';
        }
        if ($linkRewrite === '') {
            $linkRewrite = (string) $db->getValue("SELECT link_rewrite FROM `{$p}product_lang` WHERE id_product = " . (int) $idProduct
                . ' AND id_lang = ' . (int) Context::getContext()->language->id . ' AND id_shop = ' . (int) $idShop);
        }

        return Context::getContext()->link->getImageLink($linkRewrite ?: 'producto', (int) $idProduct . '-' . $idImage, ImageType::getFormattedName('small'));
    }

    /**
     * Palabras de búsqueda: minúsculas, sin signos y en singular aproximado ("pastillas" → "pastilla").
     */
    public static function searchWords($text)
    {
        $text = Tools::strtolower(Tools::replaceAccentedChars((string) $text));
        $text = preg_replace('/[^a-z0-9,.\-]+/', ' ', $text);
        $out = array();
        $stop = array('de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'y', 'en', 'un', 'una', 'por');
        foreach (preg_split('/\s+/', trim($text)) as $w) {
            $w = trim($w, '.,-');
            if ($w === '' || in_array($w, $stop, true)) {
                continue;
            }
            if (strlen($w) > 4 && !ctype_digit($w)) {
                if (substr($w, -2) === 'es' && strlen($w) > 5) {
                    $w = substr($w, 0, -2);
                } elseif (substr($w, -1) === 's') {
                    $w = substr($w, 0, -1);
                }
            }
            $out[$w] = true;
        }

        return array_slice(array_keys($out), 0, 8);
    }

    /**
     * Buscador del catálogo de la tienda.
     * - Busca cada palabra por separado, en cualquier orden, sin tildes ni mayúsculas, en nombre, referencia y EAN
     *   (del producto y de sus combinaciones).
     * - Primero los que tienen todas las palabras; si no hay, los que tienen alguna.
     * - Ordena por relevancia: referencia exacta, palabras completas, marca/modelo del equipo, stock y visibles en la tienda.
     */
    public static function searchProducts($query, $idLang, $idShop, $limit = 40, $deviceText = '')
    {
        $query = trim((string) $query);
        $words = self::searchWords($query);
        if (Tools::strlen($query) < 2 || !$words) {
            return array();
        }
        $p = _DB_PREFIX_;
        $conds = array();
        foreach ($words as $w) {
            $like = pSQL(str_replace(array('%', '_'), array('\\%', '\\_'), $w));
            $conds[] = "(pl.name LIKE '%{$like}%' OR p.reference LIKE '%{$like}%' OR p.ean13 LIKE '%{$like}%'
                OR pa.reference LIKE '%{$like}%' OR pa.ean13 LIKE '%{$like}%' OR p.supplier_reference LIKE '%{$like}%')";
        }
        $sql = "SELECT p.id_product, IFNULL(pa.id_product_attribute, 0) AS id_product_attribute, pl.name AS pname, pl.link_rewrite,
                IF(pa.reference IS NOT NULL AND pa.reference != '', pa.reference, p.reference) AS reference,
                p.ean13, pa.ean13 AS aean, ps.active
            FROM `{$p}product` p
            INNER JOIN `{$p}product_shop` ps ON ps.id_product = p.id_product AND ps.id_shop = " . (int) $idShop . "
            INNER JOIN `{$p}product_lang` pl ON pl.id_product = p.id_product AND pl.id_lang = " . (int) $idLang . ' AND pl.id_shop = ' . (int) $idShop . "
            LEFT JOIN `{$p}product_attribute` pa ON pa.id_product = p.id_product
            WHERE %s LIMIT 150";
        $db = Db::getInstance();
        $rows = $db->executeS(sprintf($sql, implode(' AND ', $conds)));
        if (!$rows && count($conds) > 1) {
            $rows = $db->executeS(sprintf($sql, implode(' OR ', $conds)));
        }
        if (!$rows) {
            return array();
        }

        // Relevancia
        $q = Tools::strtolower(trim($query));
        $device = self::searchWords($deviceText);
        $scored = array();
        foreach ($rows as $r) {
            $name = ' ' . Tools::strtolower(Tools::replaceAccentedChars($r['pname'])) . ' ';
            $ref = Tools::strtolower((string) $r['reference']);
            $score = 0;
            if ($ref !== '' && $ref === $q) {
                $score += 200;
            } elseif ($ref !== '' && strpos($ref, $q) === 0) {
                $score += 60;
            }
            if ($q !== '' && ($r['ean13'] === $query || $r['aean'] === $query)) {
                $score += 200;
            }
            foreach ($words as $i => $w) {
                if (strpos($name, $w) !== false) {
                    $score += 10;
                    if (preg_match('/[^a-z0-9]' . preg_quote($w, '/') . '/', $name)) {
                        $score += 6; // empieza palabra
                    }
                    if ($i === 0 && strpos(trim($name), $w) === 0) {
                        $score += 8; // el nombre empieza por lo buscado
                    }
                } elseif (strpos($ref, $w) !== false) {
                    $score += 8;
                }
            }
            foreach ($device as $w) {
                if (strlen($w) > 1 && strpos($name, $w) !== false) {
                    $score += 12; // sirve para el equipo de la reparación
                }
            }
            $score += (int) $r['active'] ? 3 : 0;
            $r['score'] = $score - Tools::strlen($r['pname']) / 100;
            $scored[] = $r;
        }
        usort($scored, function ($a, $b) {
            return $a['score'] == $b['score'] ? 0 : ($a['score'] > $b['score'] ? -1 : 1);
        });

        $out = array();
        foreach (array_slice($scored, 0, (int) $limit) as $r) {
            $id = (int) $r['id_product'];
            $ida = (int) $r['id_product_attribute'];
            $excl = (float) Product::getPriceStatic($id, false, $ida ?: null, 6);
            $rate = (float) Tax::getProductTaxRate($id);
            if (!in_array((int) round($rate), self::taxRates(), true)) {
                $rate = 21;
            }
            $stock = (int) StockAvailable::getQuantityAvailableByProduct($id, $ida, $idShop);
            $out[] = array(
                'id_product' => $id,
                'id_product_attribute' => $ida,
                'name' => Product::getProductName($id, $ida ?: null, $idLang),
                'reference' => (string) $r['reference'],
                'price' => round($excl * (1 + $rate / 100), 2),
                'tax_rate' => (int) round($rate),
                'stock' => $stock,
                'active' => (int) $r['active'],
                'image' => self::productImage($id, $ida, (string) $r['link_rewrite'], $idShop),
            );
        }
        return array_values($out);
    }
}
