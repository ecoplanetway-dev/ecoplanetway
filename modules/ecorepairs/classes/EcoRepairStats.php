<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Indicadores del taller: entradas por periodo, averías, marcas, modelos y categorías más repetidas.
 */
class EcoRepairStats
{
    const MAX_DAYS = 1100;

    public static function cleanRange($from, $to)
    {
        $today = date('Y-m-d');
        $from = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $from) && Validate::isDate($from) ? $from : date('Y-m-d', strtotime('-29 days'));
        $to = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $to) && Validate::isDate($to) ? $to : $today;
        if ($to < $from) {
            list($from, $to) = array($to, $from);
        }
        if ((strtotime($to) - strtotime($from)) / 86400 > self::MAX_DAYS) {
            $from = date('Y-m-d', strtotime($to . ' -' . self::MAX_DAYS . ' days'));
        }

        return array($from, $to);
    }

    public static function get($idShop, $from, $to, $idCategory = 0)
    {
        list($from, $to) = self::cleanRange($from, $to);
        $p = _DB_PREFIX_;
        $db = Db::getInstance();
        $days = (int) round((strtotime($to) - strtotime($from)) / 86400) + 1;
        $catSql = (int) $idCategory ? ' AND r.id_category = ' . (int) $idCategory : '';
        $range = " r.id_shop = " . (int) $idShop . " AND r.date_add BETWEEN '" . pSQL($from) . " 00:00:00' AND '" . pSQL($to) . " 23:59:59'" . $catSql;

        $rows = $db->executeS("SELECT r.id_ecorepair, r.date_add, r.status, r.date_status, r.faults, r.device_name, r.id_brand, r.id_model,
                cat.name AS category_name, b.name AS brand_name, m.name AS model_name
            FROM `{$p}ecorepair` r
            LEFT JOIN `{$p}ecorepair_category` cat ON cat.id_ecorepair_category = r.id_category
            LEFT JOIN `{$p}ecorepair_brand` b ON b.id_ecorepair_brand = r.id_brand
            LEFT JOIN `{$p}ecorepair_model` m ON m.id_ecorepair_model = r.id_model
            WHERE {$range} LIMIT 20000") ?: array();

        // Agrupación según la duración del periodo
        $unit = $days <= 31 ? 'day' : ($days <= 190 ? 'week' : 'month');
        $series = self::emptyBuckets($from, $to, $unit);
        $faults = array();
        $brands = array();
        $models = array();
        $cats = array();
        foreach ($rows as $r) {
            $k = self::bucketKey($r['date_add'], $unit);
            if (isset($series[$k])) {
                ++$series[$k]['value'];
            }
            $list = json_decode((string) $r['faults'], true);
            foreach (is_array($list) ? $list : array() as $f) {
                $f = trim((string) $f);
                if ($f !== '') {
                    $faults[$f] = (isset($faults[$f]) ? $faults[$f] : 0) + 1;
                }
            }
            if ($r['brand_name']) {
                $brands[$r['brand_name']] = (isset($brands[$r['brand_name']]) ? $brands[$r['brand_name']] : 0) + 1;
            }
            if ($r['model_name']) {
                $name = trim($r['brand_name'] . ' ' . $r['model_name']);
                $models[$name] = (isset($models[$name]) ? $models[$name] : 0) + 1;
            }
            $c = $r['category_name'] ?: 'Sin categoría';
            $cats[$c] = (isset($cats[$c]) ? $cats[$c] : 0) + 1;
        }

        // Periodo anterior de la misma duración, para comparar
        $prevTo = date('Y-m-d', strtotime($from . ' -1 day'));
        $prevFrom = date('Y-m-d', strtotime($prevTo . ' -' . ($days - 1) . ' days'));
        $prevCount = (int) $db->getValue("SELECT COUNT(*) FROM `{$p}ecorepair` r WHERE r.id_shop = " . (int) $idShop
            . " AND r.date_add BETWEEN '" . pSQL($prevFrom) . " 00:00:00' AND '" . pSQL($prevTo) . " 23:59:59'" . $catSql);

        // Entregadas en el periodo y días medios en el taller
        $done = $db->getRow("SELECT COUNT(*) AS n, AVG(DATEDIFF(r.date_status, r.date_add)) AS avg_days FROM `{$p}ecorepair` r
            WHERE r.id_shop = " . (int) $idShop . " AND r.status = 'delivered'
              AND r.date_status BETWEEN '" . pSQL($from) . " 00:00:00' AND '" . pSQL($to) . " 23:59:59'" . $catSql);

        // Presupuestos aceptados en el periodo
        $accepted = $db->getRow("SELECT COUNT(*) AS n, IFNULL(SUM(q.total_tax_incl), 0) AS total FROM `{$p}ecorepair_quote` q
            INNER JOIN `{$p}ecorepair` r ON r.id_ecorepair = q.id_ecorepair
            WHERE r.id_shop = " . (int) $idShop . " AND q.status = 'accepted'
              AND q.date_answer BETWEEN '" . pSQL($from) . " 00:00:00' AND '" . pSQL($to) . " 23:59:59'" . $catSql);

        return array(
            'from' => $from,
            'to' => $to,
            'days' => $days,
            'unit' => $unit,
            'totals' => array(
                'received' => count($rows),
                'received_prev' => $prevCount,
                'delivered' => (int) $done['n'],
                'avg_days' => $done['avg_days'] === null ? null : round((float) $done['avg_days'], 1),
                'accepted' => (int) $accepted['n'],
                'accepted_total' => round((float) $accepted['total'], 2),
            ),
            'series' => array_values($series),
            'faults' => self::top($faults, 10),
            'brands' => self::top($brands, 10),
            'models' => self::top($models, 10),
            'categories' => self::top($cats, 8),
        );
    }

    protected static function top(array $counts, $n)
    {
        arsort($counts);
        $out = array();
        foreach (array_slice($counts, 0, $n, true) as $name => $value) {
            $out[] = array('name' => (string) $name, 'value' => (int) $value);
        }

        return $out;
    }

    protected static function bucketKey($date, $unit)
    {
        $t = strtotime($date);
        if ($unit === 'day') {
            return date('Y-m-d', $t);
        }
        if ($unit === 'week') {
            return date('Y-m-d', strtotime('monday this week', $t));
        }

        return date('Y-m', $t);
    }

    protected static function emptyBuckets($from, $to, $unit)
    {
        $out = array();
        $t = strtotime($from);
        $end = strtotime($to);
        if ($unit === 'week') {
            $t = strtotime('monday this week', $t);
        } elseif ($unit === 'month') {
            $t = strtotime(date('Y-m-01', $t));
        }
        $months = array('ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic');
        while ($t <= $end) {
            $k = self::bucketKey(date('Y-m-d', $t), $unit);
            if ($unit === 'day') {
                $label = date('j', $t) . ' ' . $months[(int) date('n', $t) - 1];
                $t = strtotime('+1 day', $t);
            } elseif ($unit === 'week') {
                $label = 'Sem. ' . date('j', $t) . ' ' . $months[(int) date('n', $t) - 1];
                $t = strtotime('+1 week', $t);
            } else {
                $label = $months[(int) date('n', $t) - 1] . ' ' . date('y', $t);
                $t = strtotime('+1 month', $t);
            }
            $out[$k] = array('key' => $k, 'label' => $label, 'value' => 0);
        }

        return $out;
    }
}
