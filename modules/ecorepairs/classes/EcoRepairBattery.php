<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Baterías fabricadas en el taller: ficha editable (cada una puede ser distinta), nº de serie B-000001,
 * pegatina (Xprinter 80 × 50 o imagen para Niimbot 50 × 30) y página pública con la garantía (QR).
 */
class EcoRepairBattery
{
    public static function fields()
    {
        return array(
            'brand' => array('Marca en la pegatina', 40, 'ECOPLANET WAY'),
            'volts' => array('Voltaje (V)', 8, ''),
            'ah' => array('Capacidad (Ah)', 8, ''),
            'wh' => array('Energía (Wh)', 8, ''),
            'chem' => array('Química', 24, 'Li-ion'),
            'cell' => array('Celda', 24, '21700'),
            'config' => array('Configuración', 16, ''),
            'bms' => array('BMS / descarga máx.', 24, ''),
            'conn_ctrl' => array('Conector a controladora', 32, ''),
            'conn_charge' => array('Conector de carga', 32, ''),
            'for_model' => array('Para (modelo)', 64, ''),
            'warranty' => array('Garantía (meses)', 3, '12'),
            'notes' => array('Notas', 300, ''),
        );
    }

    protected static function clean(array $d)
    {
        $out = array();
        foreach (self::fields() as $k => $f) {
            $v = isset($d[$k]) ? trim(strip_tags((string) $d[$k])) : $f[2];
            $out[$k] = Tools::substr($v, 0, $f[1]);
        }
        // Wh se calcula si no se escribe
        $v = (float) str_replace(',', '.', $out['volts']);
        $a = (float) str_replace(',', '.', $out['ah']);
        if ($out['wh'] === '' && $v > 0 && $a > 0) {
            $out['wh'] = (string) round($v * $a);
        }
        $out['warranty'] = (string) max(0, min(120, (int) $out['warranty']));

        return $out;
    }

    protected static function row(array $r)
    {
        $d = json_decode((string) $r['data'], true);
        $d = is_array($d) ? $d : array();
        foreach (self::fields() as $k => $f) {
            if (!isset($d[$k])) {
                $d[$k] = '';
            }
        }
        $until = '';
        if ((int) $d['warranty'] > 0) {
            $until = date('Y-m-d', strtotime($r['date_add'] . ' +' . (int) $d['warranty'] . ' months'));
        }

        return array('id' => (int) $r['id_ecorepair_battery'], 'serial' => $r['serial'], 'token' => $r['token'], 'id_ecorepair' => (int) $r['id_ecorepair'],
            'reference' => isset($r['reference']) ? (string) $r['reference'] : '', 'data' => $d, 'made_by' => $r['made_by'], 'date_add' => $r['date_add'],
            'warranty_until' => $until, 'url' => self::publicUrl($r['token']));
    }

    public static function publicUrl($token)
    {
        $link = Context::getContext()->link;
        if (!Configuration::get('PS_REWRITING_SETTINGS')) {
            return $link->getModuleLink('ecorepairs', 'tracking', array('b' => $token), true);
        }

        return $link->getBaseLink() . 'seguimiento?b=' . rawurlencode($token);
    }

    public static function all($idShop, $q = '')
    {
        $p = _DB_PREFIX_;
        $where = 'b.id_shop = ' . (int) $idShop;
        $q = trim((string) $q);
        if ($q !== '') {
            $like = "'%" . pSQL(str_replace(array('%', '_'), ' ', $q)) . "%'";
            $where .= ' AND (b.serial LIKE ' . $like . ' OR b.data LIKE ' . $like . ' OR r.reference LIKE ' . $like . ')';
        }
        $rows = Db::getInstance()->executeS("SELECT b.*, r.reference FROM `{$p}ecorepair_battery` b
            LEFT JOIN `{$p}ecorepair` r ON r.id_ecorepair = b.id_ecorepair WHERE " . $where . ' ORDER BY b.id_ecorepair_battery DESC LIMIT 300') ?: array();

        return array_map(array('EcoRepairBattery', 'row'), $rows);
    }

    public static function get($id)
    {
        $p = _DB_PREFIX_;
        $r = Db::getInstance()->getRow("SELECT b.*, r.reference FROM `{$p}ecorepair_battery` b
            LEFT JOIN `{$p}ecorepair` r ON r.id_ecorepair = b.id_ecorepair WHERE b.id_ecorepair_battery = " . (int) $id);

        return $r ? self::row($r) : null;
    }

    public static function getByToken($token)
    {
        if (!preg_match('/^[a-f0-9]{12}$/', (string) $token)) {
            return null;
        }
        $id = (int) Db::getInstance()->getValue('SELECT id_ecorepair_battery FROM `' . _DB_PREFIX_ . "ecorepair_battery` WHERE token = '" . pSQL($token) . "'");

        return $id ? self::get($id) : null;
    }

    public static function save($id, array $d, $idShop, $who)
    {
        $clean = self::clean($d);
        if ((float) str_replace(',', '.', $clean['volts']) <= 0 || (float) str_replace(',', '.', $clean['ah']) <= 0) {
            return array('ok' => false, 'error' => 'Escribe el voltaje y los Ah.');
        }
        $idRepair = 0;
        $ref = trim((string) (isset($d['reference']) ? $d['reference'] : ''));
        if ($ref !== '') {
            $idRepair = (int) Db::getInstance()->getValue('SELECT id_ecorepair FROM `' . _DB_PREFIX_ . "ecorepair` WHERE reference = '" . pSQL(Tools::strtoupper($ref)) . "'");
            if (!$idRepair) {
                return array('ok' => false, 'error' => 'No existe la reparación ' . $ref . '.');
            }
        }
        $db = Db::getInstance();
        $now = date('Y-m-d H:i:s');
        if ($id) {
            $db->update('ecorepair_battery', array('data' => pSQL(json_encode($clean)), 'id_ecorepair' => $idRepair, 'date_upd' => $now), 'id_ecorepair_battery = ' . (int) $id);
        } else {
            $db->insert('ecorepair_battery', array('id_shop' => (int) $idShop, 'serial' => 'TMP' . bin2hex(random_bytes(4)), 'token' => bin2hex(random_bytes(6)),
                'id_ecorepair' => $idRepair, 'data' => pSQL(json_encode($clean)), 'made_by' => pSQL(Tools::substr((string) $who, 0, 64)), 'date_add' => $now, 'date_upd' => $now));
            $id = (int) $db->Insert_ID();
            $db->update('ecorepair_battery', array('serial' => 'B-' . sprintf('%06d', $id)), 'id_ecorepair_battery = ' . (int) $id);
            if ($idRepair) {
                EcoRepairLog::add($idRepair, 0, 'note', 'Batería fabricada B-' . sprintf('%06d', $id) . ' · ' . $clean['volts'] . ' V ' . $clean['ah'] . ' Ah');
            }
        }

        return array('ok' => true, 'battery' => self::get($id));
    }

    public static function delete($id)
    {
        Db::getInstance()->delete('ecorepair_battery', 'id_ecorepair_battery = ' . (int) $id);

        return array('ok' => true);
    }
}
