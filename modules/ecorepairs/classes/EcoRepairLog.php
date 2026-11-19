<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

class EcoRepairLog
{
    public static function add($idRepair, $idEmployee, $action, $detail)
    {
        return Db::getInstance()->insert('ecorepair_log', array(
            'id_ecorepair' => (int) $idRepair,
            'id_employee' => (int) $idEmployee,
            'action' => pSQL(Tools::substr((string) $action, 0, 32)),
            'detail' => pSQL(Tools::substr((string) $detail, 0, 2000)),
            'date_add' => date('Y-m-d H:i:s'),
        ));
    }

    public static function forRepair($idRepair)
    {
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT l.*, e.firstname, e.lastname
            FROM `{$p}ecorepair_log` l
            LEFT JOIN `{$p}employee` e ON e.id_employee = l.id_employee
            WHERE l.id_ecorepair = " . (int) $idRepair . '
            ORDER BY l.date_add DESC, l.id_ecorepair_log DESC');

        $out = array();
        foreach ($rows ?: array() as $row) {
            $out[] = array(
                'action' => $row['action'],
                'detail' => $row['detail'],
                'date' => $row['date_add'],
                'employee' => trim($row['firstname'] . ' ' . $row['lastname']),
            );
        }

        return $out;
    }
}
