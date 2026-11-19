<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

use PrestaShop\PrestaShop\Adapter\ServiceLocator;

/**
 * Clientes del taller: son clientes normales de PrestaShop más una fila propia
 * con el teléfono (PrestaShop guarda el teléfono solo en las direcciones).
 */
class EcoRepairCustomer
{
    const NO_EMAIL_DOMAIN = 'sin-email.invalid';

    public static function normalizePhone($phone)
    {
        $digits = preg_replace('/[^0-9]/', '', (string) $phone);
        if (strpos($digits, '0034') === 0) {
            $digits = substr($digits, 4);
        } elseif (strlen($digits) === 11 && strpos($digits, '34') === 0) {
            $digits = substr($digits, 2);
        }

        return $digits;
    }

    public static function isPlaceholderEmail($email)
    {
        return (bool) preg_match('/@' . preg_quote(self::NO_EMAIL_DOMAIN, '/') . '$/i', (string) $email);
    }

    public static function fieldRule($field)
    {
        $v = Configuration::get('ECOREPAIRS_FIELD_' . Tools::strtoupper($field));

        return $v === 'req' ? 'req' : 'opt';
    }

    /**
     * Busca por nombre, email, empresa, teléfono o NIF.
     */
    public static function search($query, $limit = 8)
    {
        $query = trim((string) $query);
        if (Tools::strlen($query) < 2) {
            return array();
        }
        $p = _DB_PREFIX_;
        $like = pSQL(str_replace(array('%', '_'), array('\\%', '\\_'), $query));
        $digits = self::normalizePhone($query);
        $where = array(
            "CONCAT(c.firstname, ' ', c.lastname) LIKE '%{$like}%'",
            "CONCAT(c.lastname, ' ', c.firstname) LIKE '%{$like}%'",
            "c.email LIKE '%{$like}%'",
            "c.company LIKE '%{$like}%'",
            "a.dni LIKE '%{$like}%'",
            "a.vat_number LIKE '%{$like}%'",
        );
        if (strlen($digits) >= 3) {
            $d = pSQL($digits);
            $where[] = "ec.phone_norm LIKE '%{$d}%'";
            $where[] = "REPLACE(REPLACE(a.phone, ' ', ''), '-', '') LIKE '%{$d}%'";
            $where[] = "REPLACE(REPLACE(a.phone_mobile, ' ', ''), '-', '') LIKE '%{$d}%'";
        }

        $rows = Db::getInstance()->executeS("SELECT DISTINCT c.id_customer
            FROM `{$p}customer` c
            LEFT JOIN `{$p}ecorepair_customer` ec ON ec.id_customer = c.id_customer
            LEFT JOIN `{$p}address` a ON a.id_customer = c.id_customer AND a.deleted = 0
            WHERE c.deleted = 0 AND c.is_guest = 0 AND (" . implode(' OR ', $where) . ')
            ORDER BY c.date_upd DESC
            LIMIT ' . (int) $limit) ?: array();

        $out = array();
        foreach ($rows as $row) {
            $info = self::info((int) $row['id_customer']);
            if ($info) {
                $out[] = $info;
            }
        }

        return $out;
    }

    /**
     * Datos de un cliente para mostrar en el taller.
     */
    public static function info($idCustomer)
    {
        $p = _DB_PREFIX_;
        $db = Db::getInstance();
        $c = $db->getRow("SELECT c.id_customer, c.firstname, c.lastname, c.email, c.company, c.date_add,
                ec.phone, ec.no_email, ec.consent_whatsapp
            FROM `{$p}customer` c
            LEFT JOIN `{$p}ecorepair_customer` ec ON ec.id_customer = c.id_customer
            WHERE c.id_customer = " . (int) $idCustomer . ' AND c.deleted = 0');
        if (!$c) {
            return false;
        }

        $address = self::invoiceAddress((int) $idCustomer);
        $phone = $c['phone'];
        if (!$phone) {
            $phone = (string) $db->getValue("SELECT IF(phone_mobile != '', phone_mobile, phone) FROM `{$p}address`
                WHERE id_customer = " . (int) $idCustomer . " AND deleted = 0 AND (phone != '' OR phone_mobile != '')
                ORDER BY date_upd DESC");
        }

        $orders = $db->getRow("SELECT COUNT(*) AS n, IFNULL(SUM(o.total_paid_tax_incl / o.conversion_rate), 0) AS total, MIN(o.date_add) AS first_order
            FROM `{$p}orders` o
            WHERE o.id_customer = " . (int) $idCustomer . ' AND o.valid = 1');
        $repairs = (int) $db->getValue("SELECT COUNT(*) FROM `{$p}ecorepair` WHERE id_customer = " . (int) $idCustomer);

        $email = $c['email'];
        if ((int) $c['no_email'] || self::isPlaceholderEmail($email)) {
            $email = '';
        }

        return array(
            'id_customer' => (int) $c['id_customer'],
            'name' => trim($c['firstname'] . ' ' . $c['lastname']),
            'firstname' => $c['firstname'],
            'lastname' => $c['lastname'],
            'email' => $email,
            'phone' => (string) $phone,
            'company' => $c['company'],
            'date_add' => $c['date_add'],
            'consent_whatsapp' => (int) $c['consent_whatsapp'],
            'invoice' => $address,
            'orders_count' => (int) $orders['n'],
            'orders_total' => (float) $orders['total'],
            'repairs_count' => $repairs,
        );
    }

    /**
     * Dirección con datos fiscales (la más reciente que tenga NIF).
     */
    public static function invoiceAddress($idCustomer)
    {
        $p = _DB_PREFIX_;
        $a = Db::getInstance()->getRow("SELECT id_address, company, dni, vat_number, address1, address2, postcode, city
            FROM `{$p}address`
            WHERE id_customer = " . (int) $idCustomer . " AND deleted = 0 AND (dni != '' OR vat_number != '')
            ORDER BY date_upd DESC");
        if (!$a) {
            return null;
        }

        return array(
            'id_address' => (int) $a['id_address'],
            'company' => $a['company'],
            'nif' => $a['vat_number'] ?: $a['dni'],
            'address' => trim($a['address1'] . ' ' . $a['address2']),
            'postcode' => $a['postcode'],
            'city' => $a['city'],
        );
    }

    /**
     * NIF, NIE o CIF español con dígito de control, o un NIF intracomunitario (2 letras + código).
     */
    public static function isValidTaxId($value)
    {
        $v = Tools::strtoupper(preg_replace('/[\s\-\.]/', '', (string) $value));
        if ($v === '') {
            return false;
        }
        $letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
        if (preg_match('/^([0-9]{8})([A-Z])$/', $v, $m)) {
            return $letters[(int) $m[1] % 23] === $m[2];
        }
        if (preg_match('/^([XYZ])([0-9]{7})([A-Z])$/', $v, $m)) {
            $num = (int) (strpos('XYZ', $m[1]) . $m[2]);

            return $letters[$num % 23] === $m[3];
        }
        if (preg_match('/^([ABCDEFGHJNPQRSUVW])([0-9]{7})([0-9A-J])$/', $v, $m)) {
            $digits = $m[2];
            $sum = 0;
            for ($i = 0; $i < 7; ++$i) {
                $n = (int) $digits[$i];
                if ($i % 2 === 0) {
                    $n *= 2;
                    $n = (int) floor($n / 10) + ($n % 10);
                }
                $sum += $n;
            }
            $control = (10 - ($sum % 10)) % 10;
            $controlLetter = 'JABCDEFGHI';

            return $m[3] === (string) $control || $m[3] === $controlLetter[$control];
        }
        if (strpos($v, 'ES') !== 0 && preg_match('/^[A-Z]{2}[0-9A-Z]{2,13}$/', $v)) {
            return true;
        }

        return false;
    }

    /**
     * Valida los datos fiscales. Devuelve array de errores por campo.
     */
    public static function validateInvoice(array $d)
    {
        $errors = array();
        if (!self::isValidTaxId($d['nif'])) {
            $errors['nif'] = 'El NIF/CIF no es válido.';
        }
        if (trim($d['address']) === '' || !Validate::isAddress($d['address'])) {
            $errors['address'] = 'Escribe la dirección.';
        }
        if (!preg_match('/^[0-9]{5}$/', trim($d['postcode']))) {
            $errors['postcode'] = 'El código postal debe tener 5 cifras.';
        }
        if (trim($d['city']) === '' || !Validate::isCityName($d['city'])) {
            $errors['city'] = 'Escribe la ciudad.';
        }
        if ($d['company'] !== '' && !Validate::isGenericName($d['company'])) {
            $errors['company'] = 'La razón social tiene caracteres no permitidos.';
        }

        return $errors;
    }

    /**
     * Crea un cliente de PrestaShop (y su dirección fiscal si quiere factura).
     *
     * @return array ok, id_customer | errors (campo => mensaje), existing (id si ya existía)
     */
    public static function create(array $d, Context $context)
    {
        $errors = array();
        $d = array_map(function ($v) {
            return is_string($v) ? trim($v) : $v;
        }, $d);

        if ($d['firstname'] === '' || !Validate::isCustomerName($d['firstname'])) {
            $errors['firstname'] = 'Escribe un nombre válido.';
        }
        if ($d['lastname'] === '' || !Validate::isCustomerName($d['lastname'])) {
            $errors['lastname'] = 'Escribe los apellidos.';
        }

        $phoneNorm = self::normalizePhone($d['phone']);
        if ($d['phone'] === '') {
            if (self::fieldRule('phone') === 'req') {
                $errors['phone'] = 'El teléfono es obligatorio.';
            }
        } elseif (!Validate::isPhoneNumber($d['phone']) || strlen($phoneNorm) < 9) {
            $errors['phone'] = 'El teléfono no es válido.';
        }

        if ($d['email'] === '') {
            if (self::fieldRule('email') === 'req') {
                $errors['email'] = 'El email es obligatorio.';
            }
        } elseif (!Validate::isEmail($d['email'])) {
            $errors['email'] = 'El email no es válido.';
        }

        if (!empty($d['invoice'])) {
            $errors = array_merge($errors, self::validateInvoice($d));
        }
        if ($errors) {
            return array('ok' => false, 'errors' => $errors);
        }

        // Duplicados
        if ($d['email'] !== '') {
            $existing = (int) Customer::customerExists($d['email'], true, true);
            if ($existing) {
                return array('ok' => false, 'existing' => $existing, 'errors' => array('email' => 'Ya hay un cliente con ese email. Búscalo arriba.'));
            }
        }
        if ($phoneNorm !== '') {
            $existing = (int) Db::getInstance()->getValue('SELECT ec.id_customer FROM `' . _DB_PREFIX_ . 'ecorepair_customer` ec
                INNER JOIN `' . _DB_PREFIX_ . 'customer` c ON c.id_customer = ec.id_customer AND c.deleted = 0
                WHERE ec.phone_norm = \'' . pSQL($phoneNorm) . '\'');
            if ($existing) {
                return array('ok' => false, 'existing' => $existing, 'errors' => array('phone' => 'Ya hay un cliente con ese teléfono. Búscalo arriba.'));
            }
        }

        $noEmail = $d['email'] === '';
        $email = $noEmail ? 'taller.' . Tools::strtolower(Tools::passwdGen(12, 'ALPHANUMERIC')) . '@' . self::NO_EMAIL_DOMAIN : $d['email'];

        $customer = new Customer();
        $customer->firstname = $d['firstname'];
        $customer->lastname = $d['lastname'];
        $customer->email = $email;
        $customer->company = !empty($d['invoice']) ? $d['company'] : '';
        $customer->id_shop = (int) $context->shop->id;
        $customer->id_shop_group = (int) $context->shop->id_shop_group;
        $customer->id_lang = (int) $context->language->id;
        $customer->id_default_group = (int) Configuration::get('PS_CUSTOMER_GROUP');
        $customer->active = 1;
        $customer->is_guest = 0;
        $customer->newsletter = 0;
        $customer->optin = 0;
        $customer->passwd = self::randomPasswordHash();

        try {
            if (!$customer->add()) {
                return array('ok' => false, 'errors' => array('general' => 'PrestaShop no pudo crear el cliente.'));
            }
        } catch (Exception $e) {
            return array('ok' => false, 'errors' => array('general' => 'PrestaShop no pudo crear el cliente: ' . $e->getMessage()));
        }
        $customer->updateGroup(array((int) $customer->id_default_group));

        $now = date('Y-m-d H:i:s');
        Db::getInstance()->insert('ecorepair_customer', array(
            'id_customer' => (int) $customer->id,
            'phone' => pSQL($d['phone']),
            'phone_norm' => pSQL($phoneNorm),
            'no_email' => $noEmail ? 1 : 0,
            'consent_rgpd_date' => !empty($d['consent_rgpd']) ? $now : array('type' => 'sql', 'value' => 'NULL'),
            'consent_whatsapp' => !empty($d['consent_whatsapp']) ? 1 : 0,
            'date_add' => $now,
            'date_upd' => $now,
        ), false, true, Db::REPLACE);

        $idAddress = 0;
        if (!empty($d['invoice'])) {
            $res = self::addInvoiceAddress((int) $customer->id, $d);
            if (!$res['ok']) {
                return array('ok' => false, 'id_customer' => (int) $customer->id, 'errors' => $res['errors']);
            }
            $idAddress = $res['id_address'];
        }

        return array('ok' => true, 'id_customer' => (int) $customer->id, 'id_address' => $idAddress);
    }

    public static function addInvoiceAddress($idCustomer, array $d)
    {
        $errors = self::validateInvoice($d);
        if ($errors) {
            return array('ok' => false, 'errors' => $errors);
        }
        $customer = new Customer((int) $idCustomer);
        if (!Validate::isLoadedObject($customer)) {
            return array('ok' => false, 'errors' => array('general' => 'El cliente no existe.'));
        }
        $nif = Tools::strtoupper(preg_replace('/[\s\-\.]/', '', $d['nif']));
        $address = new Address();
        $address->id_customer = (int) $customer->id;
        $address->alias = 'Facturación taller';
        $address->firstname = $customer->firstname;
        $address->lastname = $customer->lastname;
        $address->company = trim($d['company']);
        $address->dni = $nif;
        $address->vat_number = trim($d['company']) !== '' ? $nif : '';
        $address->address1 = trim($d['address']);
        $address->postcode = trim($d['postcode']);
        $address->city = trim($d['city']);
        $address->id_country = (int) Country::getByIso('ES');
        $phone = isset($d['phone']) && $d['phone'] !== '' ? $d['phone'] : (string) self::storedPhone($idCustomer);
        if ($phone !== '' && Validate::isPhoneNumber($phone)) {
            $address->phone_mobile = $phone;
        }
        try {
            if (!$address->add()) {
                return array('ok' => false, 'errors' => array('general' => 'PrestaShop no pudo guardar la dirección de facturación.'));
            }
        } catch (Exception $e) {
            return array('ok' => false, 'errors' => array('general' => 'Dirección no válida: ' . $e->getMessage()));
        }
        if (trim($d['company']) !== '' && $customer->company !== trim($d['company'])) {
            $customer->company = trim($d['company']);
            $customer->update();
        }

        return array('ok' => true, 'id_address' => (int) $address->id);
    }

    public static function storedPhone($idCustomer)
    {
        return Db::getInstance()->getValue('SELECT phone FROM `' . _DB_PREFIX_ . 'ecorepair_customer` WHERE id_customer = ' . (int) $idCustomer);
    }

    /**
     * Guarda teléfono y consentimientos de un cliente que ya existía en PrestaShop.
     */
    public static function touch($idCustomer, $phone, $consentRgpd, $consentWhatsapp)
    {
        $db = Db::getInstance();
        $p = _DB_PREFIX_;
        $now = date('Y-m-d H:i:s');
        $row = $db->getRow("SELECT * FROM `{$p}ecorepair_customer` WHERE id_customer = " . (int) $idCustomer);
        $phone = trim((string) $phone);
        if (!$row) {
            $db->insert('ecorepair_customer', array(
                'id_customer' => (int) $idCustomer,
                'phone' => pSQL($phone),
                'phone_norm' => pSQL(self::normalizePhone($phone)),
                'no_email' => 0,
                'consent_rgpd_date' => $consentRgpd ? $now : array('type' => 'sql', 'value' => 'NULL'),
                'consent_whatsapp' => $consentWhatsapp ? 1 : 0,
                'date_add' => $now,
                'date_upd' => $now,
            ));

            return;
        }
        $data = array('date_upd' => $now, 'consent_whatsapp' => $consentWhatsapp ? 1 : 0);
        if ($consentRgpd) {
            $data['consent_rgpd_date'] = $now;
        }
        if ($phone !== '' && $row['phone'] === '') {
            $data['phone'] = pSQL($phone);
            $data['phone_norm'] = pSQL(self::normalizePhone($phone));
        }
        $db->update('ecorepair_customer', $data, 'id_customer = ' . (int) $idCustomer);
    }

    protected static function randomPasswordHash()
    {
        $plain = Tools::passwdGen(20, 'RANDOM');
        try {
            $crypto = ServiceLocator::get('\\PrestaShop\\PrestaShop\\Core\\Crypto\\Hashing');

            return $crypto->hash($plain, _COOKIE_KEY_);
        } catch (Exception $e) {
            return Tools::encrypt($plain);
        }
    }
}
