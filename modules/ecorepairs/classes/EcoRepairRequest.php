<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Encargos: lo que los clientes piden y hay que pedir al proveedor.
 * Pendiente → Pedido al proveedor → Llegado → Avisado → Entregado (o Cancelado).
 */
class EcoRepairRequest
{
    public static function statuses()
    {
        return array(
            'pending' => array('name' => 'Pendiente', 'color' => '#8B93A3'),
            'ordered' => array('name' => 'Pedido al proveedor', 'color' => '#E0A100'),
            'arrived' => array('name' => 'Llegado', 'color' => '#1F6FD1'),
            'notified' => array('name' => 'Avisado', 'color' => '#7A4BC2'),
            'delivered' => array('name' => 'Entregado', 'color' => '#0B6E4B'),
            'cancelled' => array('name' => 'Cancelado', 'color' => '#B42318'),
        );
    }

    public static function get($id)
    {
        $rows = self::query('rq.id_ecorepair_request = ' . (int) $id, 1);

        return $rows ? $rows[0] : false;
    }

    public static function query($where, $limit = 300)
    {
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT rq.*, c.firstname, c.lastname, ec.phone, r.reference AS repair_reference,
                e.firstname AS emp_firstname, e.lastname AS emp_lastname
            FROM `{$p}ecorepair_request` rq
            LEFT JOIN `{$p}customer` c ON c.id_customer = rq.id_customer
            LEFT JOIN `{$p}ecorepair_customer` ec ON ec.id_customer = rq.id_customer
            LEFT JOIN `{$p}ecorepair` r ON r.id_ecorepair = rq.id_ecorepair
            LEFT JOIN `{$p}employee` e ON e.id_employee = rq.id_employee
            WHERE {$where} ORDER BY FIELD(rq.status, 'arrived', 'pending', 'ordered', 'notified', 'delivered', 'cancelled'), rq.date_upd DESC
            LIMIT " . (int) $limit) ?: array();
        $st = self::statuses();
        $out = array();
        foreach ($rows as $r) {
            $out[] = array(
                'id' => (int) $r['id_ecorepair_request'],
                'id_customer' => (int) $r['id_customer'],
                'customer_name' => trim($r['firstname'] . ' ' . $r['lastname']),
                'phone' => (string) $r['phone'],
                'id_ecorepair' => (int) $r['id_ecorepair'],
                'repair_reference' => (string) $r['repair_reference'],
                'id_product' => (int) $r['id_product'],
                'id_product_attribute' => (int) $r['id_product_attribute'],
                'request' => $r['request'],
                'for_device' => $r['for_device'],
                'qty' => (int) $r['qty'],
                'supplier' => $r['supplier'],
                'price' => round((float) $r['price'], 2),
                'deposit' => round((float) $r['deposit'], 2),
                'notes' => (string) $r['notes'],
                'status' => $r['status'],
                'status_name' => isset($st[$r['status']]) ? $st[$r['status']]['name'] : $r['status'],
                'employee' => trim($r['emp_firstname'] . ' ' . $r['emp_lastname']),
                'date_add' => $r['date_add'],
                'date_upd' => $r['date_upd'],
                'days' => max(0, (int) floor((time() - strtotime($r['date_add'])) / 86400)),
            );
        }

        return $out;
    }

    public static function listFor($idShop, $status = '', $q = '')
    {
        $where = 'rq.id_shop = ' . (int) $idShop;
        if ($status === 'open') {
            $where .= " AND rq.status IN ('pending', 'ordered', 'arrived', 'notified')";
        } elseif (isset(self::statuses()[$status])) {
            $where .= " AND rq.status = '" . pSQL($status) . "'";
        }
        $q = trim((string) $q);
        if (Tools::strlen($q) >= 2) {
            $like = pSQL(str_replace(array('%', '_'), array('\\%', '\\_'), $q));
            $digits = preg_replace('/[^0-9]/', '', $q);
            $or = array("rq.request LIKE '%{$like}%'", "rq.for_device LIKE '%{$like}%'", "rq.supplier LIKE '%{$like}%'", "CONCAT(c.firstname, ' ', c.lastname) LIKE '%{$like}%'");
            if (strlen($digits) >= 3) {
                $or[] = "ec.phone_norm LIKE '%" . pSQL($digits) . "%'";
            }
            $where .= ' AND (' . implode(' OR ', $or) . ')';
        }

        return self::query($where);
    }

    public static function counts($idShop)
    {
        $rows = Db::getInstance()->executeS('SELECT status, COUNT(*) AS n FROM `' . _DB_PREFIX_ . 'ecorepair_request`
            WHERE id_shop = ' . (int) $idShop . ' GROUP BY status') ?: array();
        $out = array();
        foreach ($rows as $r) {
            $out[$r['status']] = (int) $r['n'];
        }

        return $out;
    }

    /**
     * Crea o actualiza un encargo. $d: id_customer, request, for_device, qty, supplier, price, deposit, notes, id_ecorepair, id_product, id_product_attribute.
     */
    public static function save($id, array $d, $idShop, $idEmployee)
    {
        $request = trim(strip_tags((string) $d['request']));
        if ($request === '' || Tools::strlen($request) > 255) {
            return array('ok' => false, 'error' => 'Escribe qué pide el cliente (máximo 255 caracteres).');
        }
        $idCustomer = (int) $d['id_customer'];
        if (!$idCustomer || !EcoRepairCustomer::info($idCustomer)) {
            return array('ok' => false, 'error' => 'Elige el cliente.');
        }
        $num = function ($v) {
            return round(max(0, (float) str_replace(',', '.', (string) $v)), 2);
        };
        $row = array(
            'id_customer' => $idCustomer,
            'request' => pSQL($request),
            'for_device' => pSQL(Tools::substr(trim(strip_tags((string) $d['for_device'])), 0, 160)),
            'qty' => max(1, min(9999, (int) $d['qty'])),
            'supplier' => pSQL(Tools::substr(trim(strip_tags((string) $d['supplier'])), 0, 96)),
            'price' => $num($d['price']),
            'deposit' => $num($d['deposit']),
            'notes' => pSQL(Tools::substr(trim(strip_tags((string) $d['notes'])), 0, 2000)),
            'date_upd' => date('Y-m-d H:i:s'),
        );
        $db = Db::getInstance();
        if ($id) {
            $db->update('ecorepair_request', $row, 'id_ecorepair_request = ' . (int) $id . ' AND id_shop = ' . (int) $idShop);
        } else {
            $row['id_shop'] = (int) $idShop;
            $row['id_ecorepair'] = (int) $d['id_ecorepair'];
            $row['id_product'] = (int) $d['id_product'];
            $row['id_product_attribute'] = (int) $d['id_product_attribute'];
            $row['status'] = 'pending';
            $row['id_employee'] = (int) $idEmployee;
            $row['date_add'] = date('Y-m-d H:i:s');
            $db->insert('ecorepair_request', $row);
            $id = (int) $db->Insert_ID();
            if ((int) $d['id_ecorepair']) {
                EcoRepairLog::add((int) $d['id_ecorepair'], $idEmployee, 'request', 'Encargo creado: ' . $request);
            }
        }

        return array('ok' => true, 'id' => (int) $id);
    }

    public static function setStatus($id, $status, $idShop, $idEmployee)
    {
        if (!isset(self::statuses()[$status])) {
            return array('ok' => false, 'error' => 'Estado no válido.');
        }
        $r = self::get($id);
        if (!$r) {
            return array('ok' => false, 'error' => 'El encargo no existe.');
        }
        Db::getInstance()->update('ecorepair_request', array('status' => pSQL($status), 'date_upd' => date('Y-m-d H:i:s')),
            'id_ecorepair_request = ' . (int) $id . ' AND id_shop = ' . (int) $idShop);
        if ($r['id_ecorepair']) {
            EcoRepairLog::add($r['id_ecorepair'], $idEmployee, 'request', 'Encargo «' . $r['request'] . '»: ' . self::statuses()[$status]['name']);
        }

        return array('ok' => true);
    }
}
