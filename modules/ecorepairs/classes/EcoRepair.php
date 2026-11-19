<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Acceso a datos de las reparaciones.
 * Todas las consultas escapan los valores con pSQL() o (int).
 */
class EcoRepair
{
    const TRACKING_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    /** Campos que se pueden cambiar desde la ficha. */
    public static function editableFields()
    {
        return array(
            'id_employee_tech' => 'int',
            'eta_date' => 'date',
            'urgent' => 'bool',
            'warranty' => 'bool',
            'waiting_part' => 'bool',
            'serial' => 'string64',
            'km' => 'intnull',
            'color' => 'string64',
            'fault_customer' => 'text',
            'diagnosis' => 'text',
            'accessories' => 'list',
            'damages' => 'list',
            'faults' => 'list',
        );
    }

    public static function fieldLabel($field)
    {
        $labels = array(
            'id_employee_tech' => 'Técnico',
            'eta_date' => 'Fecha prevista',
            'urgent' => 'Urgente',
            'warranty' => 'Garantía',
            'waiting_part' => 'Esperando pieza',
            'serial' => 'Nº de serie',
            'km' => 'Kilómetros',
            'color' => 'Color',
            'fault_customer' => 'Avería que indica el cliente',
            'diagnosis' => 'Diagnóstico',
            'accessories' => 'Entregado con el equipo',
            'damages' => 'Daños previos',
            'faults' => 'Averías',
            'device' => 'Equipo',
        );

        return isset($labels[$field]) ? $labels[$field] : $field;
    }

    /**
     * Normaliza un valor según su tipo. Devuelve array(valorParaBD, valorLegible) o false si no es válido.
     */
    public static function normalize($type, $value)
    {
        switch ($type) {
            case 'int':
                return array((int) $value, (int) $value);
            case 'intnull':
                $value = trim((string) $value);
                if ($value === '') {
                    return array(array('type' => 'sql', 'value' => 'NULL'), '');
                }
                $value = preg_replace('/[^0-9]/', '', $value);
                if ($value === '' || strlen($value) > 9) {
                    return false;
                }

                return array((int) $value, (int) $value);
            case 'bool':
                $v = $value ? 1 : 0;

                return array($v, $v ? 'Sí' : 'No');
            case 'date':
                $value = trim((string) $value);
                if ($value === '') {
                    return array(array('type' => 'sql', 'value' => 'NULL'), '');
                }
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) || !Validate::isDate($value)) {
                    return false;
                }

                return array(pSQL($value), date('d/m/Y', strtotime($value)));
            case 'string64':
                $value = trim(strip_tags((string) $value));
                if (Tools::strlen($value) > 64) {
                    return false;
                }

                return array(pSQL($value), $value);
            case 'text':
                $value = trim(strip_tags((string) $value));
                if (Tools::strlen($value) > 5000) {
                    return false;
                }

                return array(pSQL($value), $value);
            case 'list':
                $clean = self::cleanList($value);
                if ($clean === false) {
                    return false;
                }

                return array(pSQL(json_encode($clean)), implode(', ', $clean));
        }

        return false;
    }

    /**
     * Lista de textos cortos (averías, accesorios, daños). Devuelve false si no es una lista.
     */
    public static function cleanList($value)
    {
        if (!is_array($value)) {
            $value = $value === '' || $value === null ? array() : json_decode((string) $value, true);
        }
        if (!is_array($value) || count($value) > 50) {
            return false;
        }
        $clean = array();
        foreach ($value as $item) {
            if (!is_scalar($item)) {
                continue;
            }
            $item = trim(strip_tags((string) $item));
            if ($item !== '' && Tools::strlen($item) <= 96) {
                $clean[] = $item;
            }
        }

        return array_values(array_unique($clean));
    }

    public static function generateTrackingCode()
    {
        $alphabet = self::TRACKING_ALPHABET;
        $max = strlen($alphabet) - 1;
        $db = Db::getInstance();
        for ($attempt = 0; $attempt < 20; ++$attempt) {
            $code = '';
            for ($i = 0; $i < 8; ++$i) {
                $code .= $alphabet[random_int(0, $max)];
            }
            $code = substr($code, 0, 4) . '-' . substr($code, 4);
            $exists = (int) $db->getValue('SELECT id_ecorepair FROM `' . _DB_PREFIX_ . 'ecorepair` WHERE tracking_code = \'' . pSQL($code) . '\'');
            if (!$exists) {
                return $code;
            }
        }

        throw new PrestaShopException('No se pudo generar un código de seguimiento único.');
    }

    public static function referenceFor($id)
    {
        return 'REP-' . str_pad((string) (int) $id, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Crea una reparación. $d ya validado por el controlador.
     */
    public static function create(array $d, $idEmployee, $idShop)
    {
        $now = date('Y-m-d H:i:s');
        $db = Db::getInstance();

        $row = array(
            'reference' => '',
            'id_shop' => (int) $idShop,
            'id_customer' => (int) $d['id_customer'],
            'id_address_invoice' => (int) $d['id_address_invoice'],
            'id_employee_tech' => (int) $d['id_employee_tech'],
            'id_employee_add' => (int) $idEmployee,
            'id_category' => (int) $d['id_category'],
            'id_brand' => (int) $d['id_brand'],
            'id_model' => (int) $d['id_model'],
            'device_name' => pSQL($d['device_name']),
            'serial' => pSQL($d['serial']),
            'km' => $d['km'] === null ? array('type' => 'sql', 'value' => 'NULL') : (int) $d['km'],
            'color' => pSQL($d['color']),
            'fault_customer' => pSQL($d['fault_customer']),
            'faults' => pSQL(json_encode($d['faults'])),
            'diagnosis' => '',
            'accessories' => pSQL(json_encode($d['accessories'])),
            'damages' => pSQL(json_encode($d['damages'])),
            'status' => EcoRepairStatus::RECEIVED,
            'waiting_part' => 0,
            'urgent' => $d['urgent'] ? 1 : 0,
            'warranty' => $d['warranty'] ? 1 : 0,
            'eta_date' => $d['eta_date'] ? pSQL($d['eta_date']) : array('type' => 'sql', 'value' => 'NULL'),
            'tracking_code' => pSQL(self::generateTrackingCode()),
            'consent_rgpd' => $d['consent_rgpd'] ? 1 : 0,
            'consent_whatsapp' => $d['consent_whatsapp'] ? 1 : 0,
            'id_order' => 0,
            'cancel_reason' => '',
            'date_status' => $now,
            'date_add' => $now,
            'date_upd' => $now,
        );

        if (!$db->insert('ecorepair', $row)) {
            return false;
        }
        $id = (int) $db->Insert_ID();
        $db->update('ecorepair', array('reference' => pSQL(self::referenceFor($id))), 'id_ecorepair = ' . $id);

        return $id;
    }

    protected static function baseSelect()
    {
        $p = _DB_PREFIX_;

        return "SELECT r.*, c.firstname, c.lastname, c.email, c.company,
                ec.phone, ec.no_email,
                cat.name AS category_name, cat.icon AS category_icon,
                b.name AS brand_name, m.name AS model_name, m.image AS model_image,
                (SELECT ph.id_ecorepair_photo FROM `{$p}ecorepair_photo` ph WHERE ph.id_ecorepair = r.id_ecorepair AND ph.type = 'entry'
                    ORDER BY ph.date_add ASC, ph.id_ecorepair_photo ASC LIMIT 1) AS id_photo_cover,
                e.firstname AS tech_firstname, e.lastname AS tech_lastname
            FROM `{$p}ecorepair` r
            LEFT JOIN `{$p}customer` c ON c.id_customer = r.id_customer
            LEFT JOIN `{$p}ecorepair_customer` ec ON ec.id_customer = r.id_customer
            LEFT JOIN `{$p}ecorepair_category` cat ON cat.id_ecorepair_category = r.id_category
            LEFT JOIN `{$p}ecorepair_brand` b ON b.id_ecorepair_brand = r.id_brand
            LEFT JOIN `{$p}ecorepair_model` m ON m.id_ecorepair_model = r.id_model
            LEFT JOIN `{$p}employee` e ON e.id_employee = r.id_employee_tech ";
    }

    public static function get($id)
    {
        $row = Db::getInstance()->getRow(self::baseSelect() . 'WHERE r.id_ecorepair = ' . (int) $id);

        return $row ? self::decorate($row) : false;
    }

    public static function boardList($idShop)
    {
        $statuses = array();
        foreach (EcoRepairStatus::board() as $s) {
            $statuses[] = '\'' . pSQL($s) . '\'';
        }
        $rows = Db::getInstance()->executeS(self::baseSelect()
            . 'WHERE r.id_shop = ' . (int) $idShop . ' AND r.status IN (' . implode(',', $statuses) . ')
               ORDER BY r.urgent DESC, r.date_add ASC');

        return array_map(array('EcoRepair', 'decorate'), $rows ?: array());
    }

    /**
     * Búsqueda en todas las reparaciones (también entregadas y canceladas).
     */
    public static function search($query, $idShop, $limit = 15)
    {
        $query = trim((string) $query);
        if (Tools::strlen($query) < 2) {
            return array();
        }
        $like = pSQL(str_replace(array('%', '_'), array('\\%', '\\_'), $query));
        $digits = preg_replace('/[^0-9]/', '', $query);
        $where = array(
            "r.reference LIKE '%{$like}%'",
            "r.serial LIKE '%{$like}%'",
            "r.device_name LIKE '%{$like}%'",
            "r.tracking_code LIKE '%{$like}%'",
            "CONCAT(c.firstname, ' ', c.lastname) LIKE '%{$like}%'",
            "c.email LIKE '%{$like}%'",
        );
        if (strlen($digits) >= 3) {
            $where[] = "ec.phone_norm LIKE '%" . pSQL($digits) . "%'";
        }
        $rows = Db::getInstance()->executeS(self::baseSelect()
            . 'WHERE r.id_shop = ' . (int) $idShop . ' AND (' . implode(' OR ', $where) . ')
               ORDER BY r.date_add DESC LIMIT ' . (int) $limit);

        return array_map(array('EcoRepair', 'decorate'), $rows ?: array());
    }

    public static function customerHistory($idCustomer, $excludeId = 0)
    {
        $rows = Db::getInstance()->executeS(self::baseSelect()
            . 'WHERE r.id_customer = ' . (int) $idCustomer . ' AND r.id_ecorepair != ' . (int) $excludeId . '
               ORDER BY r.date_add DESC LIMIT 20');

        return array_map(array('EcoRepair', 'decorate'), $rows ?: array());
    }

    /**
     * Añade campos calculados y decodifica las listas.
     */
    public static function decorate(array $r)
    {
        foreach (array('faults', 'accessories', 'damages') as $k) {
            $v = json_decode((string) $r[$k], true);
            $r[$k] = is_array($v) ? $v : array();
        }
        $r['id_ecorepair'] = (int) $r['id_ecorepair'];
        $r['customer_name'] = trim($r['firstname'] . ' ' . $r['lastname']);
        $r['tech_name'] = trim($r['tech_firstname'] . ' ' . $r['tech_lastname']);
        $r['status_name'] = EcoRepairStatus::name($r['status']);
        $now = time();
        $r['days_in_shop'] = max(0, (int) floor(($now - strtotime($r['date_add'])) / 86400));
        $r['days_in_status'] = max(0, (int) floor(($now - strtotime($r['date_status'])) / 86400));
        unset($r['tech_firstname'], $r['tech_lastname']);

        return $r;
    }

    /**
     * Actualiza un campo editable y deja constancia en el historial.
     */
    public static function updateField($id, $field, $value, $idEmployee)
    {
        $fields = self::editableFields();
        if (!isset($fields[$field])) {
            return array('ok' => false, 'error' => 'Campo no permitido.');
        }
        $norm = self::normalize($fields[$field], $value);
        if ($norm === false) {
            return array('ok' => false, 'error' => 'El valor de "' . self::fieldLabel($field) . '" no es válido.');
        }
        list($dbValue, $readable) = $norm;

        if ($field === 'id_employee_tech' && $dbValue) {
            $emp = new Employee((int) $dbValue);
            if (!Validate::isLoadedObject($emp) || !$emp->active) {
                return array('ok' => false, 'error' => 'Ese técnico no existe o no está activo.');
            }
            $readable = trim($emp->firstname . ' ' . $emp->lastname);
        } elseif ($field === 'id_employee_tech') {
            $readable = 'Sin asignar';
        }

        $ok = Db::getInstance()->update('ecorepair', array(
            $field => $dbValue,
            'date_upd' => date('Y-m-d H:i:s'),
        ), 'id_ecorepair = ' . (int) $id);
        if (!$ok) {
            return array('ok' => false, 'error' => 'No se pudo guardar.');
        }

        $longText = in_array($field, array('fault_customer', 'diagnosis'), true);
        EcoRepairLog::add($id, $idEmployee, 'field', self::fieldLabel($field) . ($longText ? ' actualizado' : ': ' . ($readable === '' ? '—' : $readable)));

        return array('ok' => true, 'value' => $readable);
    }

    public static function updateDevice($id, $idCategory, $idBrand, $idModel, $idEmployee)
    {
        $names = EcoRepairCatalog::deviceNames($idCategory, $idBrand, $idModel);
        if (!$names) {
            return array('ok' => false, 'error' => 'Categoría, marca o modelo no válidos.');
        }
        Db::getInstance()->update('ecorepair', array(
            'id_category' => (int) $idCategory,
            'id_brand' => (int) $idBrand,
            'id_model' => (int) $idModel,
            'device_name' => pSQL($names['device_name']),
            'date_upd' => date('Y-m-d H:i:s'),
        ), 'id_ecorepair = ' . (int) $id);
        EcoRepairLog::add($id, $idEmployee, 'field', 'Equipo: ' . $names['category'] . ' · ' . $names['device_name']);

        return array('ok' => true);
    }

    public static function setStatus($id, $status, $idEmployee, $reason = '')
    {
        if (!EcoRepairStatus::isValid($status)) {
            return array('ok' => false, 'error' => 'Estado no válido.');
        }
        $repair = self::get($id);
        if (!$repair) {
            return array('ok' => false, 'error' => 'La reparación no existe.');
        }
        if ($repair['status'] === $status) {
            return array('ok' => true, 'unchanged' => true);
        }
        $reason = trim(strip_tags((string) $reason));
        if ($status === EcoRepairStatus::CANCELLED && $reason === '') {
            return array('ok' => false, 'error' => 'Indica el motivo de la cancelación.');
        }

        $data = array(
            'status' => pSQL($status),
            'date_status' => date('Y-m-d H:i:s'),
            'date_upd' => date('Y-m-d H:i:s'),
        );
        if (in_array($status, array(EcoRepairStatus::READY, EcoRepairStatus::DELIVERED, EcoRepairStatus::CANCELLED), true)) {
            $data['waiting_part'] = 0;
        }
        if ($status === EcoRepairStatus::CANCELLED) {
            $data['cancel_reason'] = pSQL(Tools::substr($reason, 0, 255));
        }
        Db::getInstance()->update('ecorepair', $data, 'id_ecorepair = ' . (int) $id);

        $detail = EcoRepairStatus::name($repair['status']) . ' → ' . EcoRepairStatus::name($status);
        if ($status === EcoRepairStatus::CANCELLED) {
            $detail .= ' · Motivo: ' . $reason;
        }
        EcoRepairLog::add($id, $idEmployee, 'status', $detail);

        return array('ok' => true);
    }
}
