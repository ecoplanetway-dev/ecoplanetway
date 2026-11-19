<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Personal del taller que usa la app del móvil (/taller) con PIN, sin entrar en PrestaShop.
 * Cada persona va unida a un empleado de PrestaShop (para asignaciones, historial e informes).
 * Sesión: cookie firmada con _COOKIE_KEY_ que caduca a los 30 días; «Cerrar sesiones» la invalida.
 */
class EcoRepairStaff
{
    const COOKIE = 'ecor_staff';
    const DAYS = 30;

    public static function all($onlyActive = false)
    {
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT s.*, e.firstname, e.lastname FROM `{$p}ecorepair_staff` s
            LEFT JOIN `{$p}employee` e ON e.id_employee = s.id_employee" . ($onlyActive ? ' WHERE s.active = 1' : '') . ' ORDER BY s.name ASC') ?: array();
        $out = array();
        foreach ($rows as $r) {
            $out[] = array(
                'id' => (int) $r['id_ecorepair_staff'],
                'name' => $r['name'],
                'id_employee' => (int) $r['id_employee'],
                'employee' => trim($r['firstname'] . ' ' . $r['lastname']),
                'role_tech' => (int) $r['role_tech'],
                'role_reception' => (int) $r['role_reception'],
                'active' => (int) $r['active'],
                'date_last' => (string) $r['date_last'],
            );
        }

        return $out;
    }

    public static function get($id)
    {
        $r = Db::getInstance()->getRow('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_staff` WHERE id_ecorepair_staff = ' . (int) $id);

        return $r ?: false;
    }

    public static function save($id, array $d)
    {
        $name = trim(strip_tags((string) $d['name']));
        if ($name === '' || Tools::strlen($name) > 64) {
            return array('ok' => false, 'error' => 'Escribe el nombre.');
        }
        $dup = (int) Db::getInstance()->getValue('SELECT id_ecorepair_staff FROM `' . _DB_PREFIX_ . 'ecorepair_staff`
            WHERE LOWER(name) = \'' . pSQL(Tools::strtolower($name)) . '\' AND id_ecorepair_staff != ' . (int) $id);
        if ($dup) {
            return array('ok' => false, 'error' => 'Ya hay una persona con ese nombre. Edítala en vez de crear otra.');
        }
        $idEmployee = (int) $d['id_employee'];
        if ($idEmployee === -1) {
            $idEmployee = self::createEmployee($name);
            if (!$idEmployee) {
                return array('ok' => false, 'error' => 'No se pudo crear el empleado. Créalo en Parámetros avanzados › Equipo.');
            }
        }
        $emp = new Employee($idEmployee);
        if (!Validate::isLoadedObject($emp)) {
            return array('ok' => false, 'error' => 'Elige su empleado de PrestaShop (sirve para las asignaciones y los informes).');
        }
        $pin = trim((string) $d['pin']);
        if ((!$id || $pin !== '') && !preg_match('/^\d{4,6}$/', $pin)) {
            return array('ok' => false, 'error' => 'El PIN tiene que ser de 4 a 6 números.');
        }
        if (empty($d['role_tech']) && empty($d['role_reception'])) {
            return array('ok' => false, 'error' => 'Marca al menos un rol: técnico o recepción.');
        }
        $row = array(
            'name' => pSQL($name),
            'id_employee' => $idEmployee,
            'role_tech' => !empty($d['role_tech']) ? 1 : 0,
            'role_reception' => !empty($d['role_reception']) ? 1 : 0,
            'active' => !empty($d['active']) ? 1 : 0,
            'date_upd' => date('Y-m-d H:i:s'),
        );
        if ($pin !== '') {
            $row['pin_hash'] = pSQL(password_hash($pin, PASSWORD_DEFAULT));
        }
        $db = Db::getInstance();
        if ($id) {
            if ($pin !== '' || empty($d['active'])) {
                $db->execute('UPDATE `' . _DB_PREFIX_ . 'ecorepair_staff` SET session_version = session_version + 1 WHERE id_ecorepair_staff = ' . (int) $id);
            }
            $db->update('ecorepair_staff', $row, 'id_ecorepair_staff = ' . (int) $id);
        } else {
            $row['date_add'] = $row['date_upd'];
            $row['session_version'] = 1;
            $db->insert('ecorepair_staff', $row);
            $id = (int) $db->Insert_ID();
        }

        return array('ok' => true, 'id' => (int) $id);
    }

    /**
     * Empleado de PrestaShop DESACTIVADO para alguien que solo usa la app del taller:
     * no puede entrar en PrestaShop, pero sirve para asignaciones, historial e informes.
     */
    public static function createEmployee($name)
    {
        $parts = preg_split('/\s+/', trim($name), 2);
        $e = new Employee();
        $e->firstname = Tools::substr($parts[0], 0, 32);
        $e->lastname = isset($parts[1]) && $parts[1] !== '' ? Tools::substr($parts[1], 0, 32) : 'Taller';
        $e->email = 'taller.' . Tools::strtolower(Tools::passwdGen(10, 'ALPHANUMERIC')) . '@' . EcoRepairCustomer::NO_EMAIL_DOMAIN;
        $e->passwd = Tools::hash(Tools::passwdGen(24, 'RANDOM'));
        $profile = (int) Db::getInstance()->getValue('SELECT id_profile FROM `' . _DB_PREFIX_ . 'profile` WHERE id_profile != ' . (int) _PS_ADMIN_PROFILE_ . ' ORDER BY id_profile DESC');
        $e->id_profile = $profile ?: (int) _PS_ADMIN_PROFILE_;
        $e->id_lang = (int) Configuration::get('PS_LANG_DEFAULT');
        $e->active = 0;
        $e->default_tab = 0;
        $e->bo_theme = 'default';
        $e->bo_css = 'theme.css';
        try {
            return $e->add() ? (int) $e->id : 0;
        } catch (Exception $ex) {
            PrestaShopLogger::addLog('ecorepairs: no se pudo crear el empleado: ' . $ex->getMessage(), 3);

            return 0;
        }
    }

    /** Empleados que son técnicos de la app (aunque estén desactivados en PrestaShop). */
    public static function techEmployeeIds()
    {
        $rows = Db::getInstance()->executeS('SELECT id_employee FROM `' . _DB_PREFIX_ . 'ecorepair_staff` WHERE active = 1 AND role_tech = 1 AND id_employee > 0') ?: array();

        return array_map('intval', array_column($rows, 'id_employee'));
    }

    /** Cierra la sesión en todos sus móviles. */
    public static function revoke($id)
    {
        Db::getInstance()->execute('UPDATE `' . _DB_PREFIX_ . 'ecorepair_staff` SET session_version = session_version + 1 WHERE id_ecorepair_staff = ' . (int) $id);

        return array('ok' => true);
    }

    public static function delete($id)
    {
        Db::getInstance()->delete('ecorepair_staff', 'id_ecorepair_staff = ' . (int) $id);

        return array('ok' => true);
    }

    /* ---------- Sesión en el móvil ---------- */

    protected static function sign($payload)
    {
        return hash_hmac('sha256', 'ecorstaff|' . $payload, _COOKIE_KEY_);
    }

    public static function login($id, $pin)
    {
        if (EcoRepairRateLimit::blocked('pin', 8, 900)) {
            return array('ok' => false, 'error' => 'Demasiados intentos. Espera 15 minutos.');
        }
        $s = self::get($id);
        if (!$s || !(int) $s['active'] || !password_verify((string) $pin, $s['pin_hash'])) {
            EcoRepairRateLimit::hit('pin', 900);

            return array('ok' => false, 'error' => 'PIN incorrecto.');
        }
        $exp = time() + self::DAYS * 86400;
        $payload = (int) $s['id_ecorepair_staff'] . '.' . (int) $s['session_version'] . '.' . $exp;
        $value = $payload . '.' . self::sign($payload);
        self::setCookie($value, $exp);
        Db::getInstance()->update('ecorepair_staff', array('date_last' => date('Y-m-d H:i:s')), 'id_ecorepair_staff = ' . (int) $s['id_ecorepair_staff']);

        return array('ok' => true);
    }

    protected static function setCookie($value, $exp)
    {
        $path = '/';
        if (PHP_VERSION_ID >= 70300) {
            setcookie(self::COOKIE, $value, array('expires' => $exp, 'path' => $path, 'secure' => Tools::usingSecureMode(), 'httponly' => true, 'samesite' => 'Lax'));
        } else {
            setcookie(self::COOKIE, $value, $exp, $path . '; samesite=Lax', '', Tools::usingSecureMode(), true);
        }
    }

    public static function logout()
    {
        self::setCookie('', time() - 3600);
    }

    /** Persona con sesión en este móvil, o false. */
    public static function current()
    {
        static $cache = null;
        if ($cache !== null) {
            return $cache;
        }
        $cache = false;
        $raw = isset($_COOKIE[self::COOKIE]) ? (string) $_COOKIE[self::COOKIE] : '';
        $parts = explode('.', $raw);
        if (count($parts) !== 4) {
            return $cache;
        }
        list($id, $ver, $exp, $sig) = $parts;
        $payload = (int) $id . '.' . (int) $ver . '.' . (int) $exp;
        if (!hash_equals(self::sign($payload), $sig) || (int) $exp < time()) {
            return $cache;
        }
        $s = self::get((int) $id);
        if (!$s || !(int) $s['active'] || (int) $s['session_version'] !== (int) $ver) {
            return $cache;
        }
        $cache = $s;

        return $cache;
    }

    /** Clave para las peticiones de la app (evita peticiones desde otras webs). */
    public static function csrf(array $s)
    {
        return substr(hash_hmac('sha256', 'ecorcsrf|' . (int) $s['id_ecorepair_staff'] . '|' . (int) $s['session_version'], _COOKIE_KEY_), 0, 32);
    }
}
