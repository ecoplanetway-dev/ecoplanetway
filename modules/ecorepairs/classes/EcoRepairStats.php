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
            'techs' => self::technicians($idShop, $from, $to, $catSql),
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

    /**
     * Informe de técnicos: reparaciones terminadas (entregadas) en el periodo, con mano de obra, horas y piezas
     * de sus presupuestos aceptados (sin las líneas de garantía).
     */
    public static function technicians($idShop, $from, $to, $catSql = '')
    {
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT r.id_ecorepair, r.reference, r.device_name, r.id_employee_tech, r.date_add, r.date_status, r.warranty,
                e.firstname, e.lastname
            FROM `{$p}ecorepair` r
            LEFT JOIN `{$p}employee` e ON e.id_employee = r.id_employee_tech
            WHERE r.id_shop = " . (int) $idShop . " AND r.status = 'delivered'
              AND r.date_status BETWEEN '" . pSQL($from) . " 00:00:00' AND '" . pSQL($to) . " 23:59:59'" . $catSql . '
            ORDER BY r.date_status DESC LIMIT 5000') ?: array();
        $byTech = array();
        foreach ($rows as $r) {
            $tid = (int) $r['id_employee_tech'];
            if (!isset($byTech[$tid])) {
                $byTech[$tid] = array('id' => $tid, 'name' => $tid ? trim($r['firstname'] . ' ' . $r['lastname']) : 'Sin asignar',
                    'repairs' => 0, 'labour' => 0.0, 'hours' => 0.0, 'parts' => 0.0, 'other' => 0.0, 'total' => 0.0, 'days' => 0, 'warranty' => 0, 'list' => array());
            }
            $t = &$byTech[$tid];
            $lab = 0.0;
            $hours = 0.0;
            $parts = 0.0;
            $other = 0.0;
            foreach (EcoRepairPayment::acceptedLines((int) $r['id_ecorepair']) as $l) {
                if ($l['warranty']) {
                    continue;
                }
                if ($l['type'] === 'labour') {
                    $lab += $l['total'];
                    $hours += $l['qty'];
                } elseif ($l['type'] === 'part') {
                    $parts += $l['total'];
                } else {
                    $other += $l['total'];
                }
            }
            ++$t['repairs'];
            $t['labour'] += $lab;
            $t['hours'] += $hours;
            $t['parts'] += $parts;
            $t['other'] += $other;
            $t['total'] += $lab + $parts + $other;
            $t['days'] += max(0, (int) floor((strtotime($r['date_status']) - strtotime($r['date_add'])) / 86400));
            $t['warranty'] += (int) $r['warranty'];
            $t['list'][] = array('id' => (int) $r['id_ecorepair'], 'reference' => $r['reference'], 'device' => $r['device_name'],
                'date' => $r['date_status'], 'labour' => round($lab, 2), 'hours' => round($hours, 2), 'parts' => round($parts + $other, 2), 'total' => round($lab + $parts + $other, 2));
            unset($t);
        }
        // Repetidas: reparaciones que entraron en el periodo y vuelven sobre una entregada por este técnico
        $rep = Db::getInstance()->executeS("SELECT o.id_employee_tech, COUNT(*) AS n, SUM(r.repeat_same) AS same
            FROM `{$p}ecorepair` r INNER JOIN `{$p}ecorepair` o ON o.id_ecorepair = r.repeat_of
            WHERE r.id_shop = " . (int) $idShop . " AND r.date_add BETWEEN '" . pSQL($from) . " 00:00:00' AND '" . pSQL($to) . " 23:59:59'
            GROUP BY o.id_employee_tech") ?: array();
        $repBy = array();
        foreach ($rep as $x) {
            $repBy[(int) $x['id_employee_tech']] = array((int) $x['n'], (int) $x['same']);
        }
        foreach ($byTech as &$t) {
            $t['repeats'] = isset($repBy[$t['id']]) ? $repBy[$t['id']][0] : 0;
            $t['repeats_same'] = isset($repBy[$t['id']]) ? $repBy[$t['id']][1] : 0;
            $t['repeat_rate'] = $t['repairs'] ? round($t['repeats_same'] / $t['repairs'] * 100, 1) : 0;
            foreach (array('labour', 'hours', 'parts', 'other', 'total') as $k) {
                $t[$k] = round($t[$k], 2);
            }
            $t['avg_days'] = $t['repairs'] ? round($t['days'] / $t['repairs'], 1) : 0;
            unset($t['days']);
        }
        unset($t);
        usort($byTech, function ($a, $b) {
            return $a['total'] == $b['total'] ? $b['repairs'] - $a['repairs'] : ($a['total'] > $b['total'] ? -1 : 1);
        });

        return array_values($byTech);
    }

    /**
     * Panel de un técnico: sus cifras del periodo, importe por semana/mes, averías y modelos que más repara.
     */
    public static function techDetail($idShop, $idEmployee, $from, $to)
    {
        list($from, $to) = self::cleanRange($from, $to);
        $all = self::technicians($idShop, $from, $to);
        $t = null;
        foreach ($all as $x) {
            if ((int) $x['id'] === (int) $idEmployee) {
                $t = $x;
            }
        }
        $emp = new Employee((int) $idEmployee);
        if (!$t) {
            $t = array('id' => (int) $idEmployee, 'name' => Validate::isLoadedObject($emp) ? trim($emp->firstname . ' ' . $emp->lastname) : 'Sin asignar',
                'repairs' => 0, 'labour' => 0, 'hours' => 0, 'parts' => 0, 'other' => 0, 'total' => 0, 'warranty' => 0, 'avg_days' => 0,
                'repeats' => 0, 'repeats_same' => 0, 'repeat_rate' => 0, 'list' => array());
        }
        $days = (int) round((strtotime($to) - strtotime($from)) / 86400) + 1;
        $unit = $days <= 31 ? 'day' : ($days <= 190 ? 'week' : 'month');
        $series = self::emptyBuckets($from, $to, $unit);
        foreach ($t['list'] as $r) {
            $k = self::bucketKey($r['date'], $unit);
            if (isset($series[$k])) {
                $series[$k]['value'] = round($series[$k]['value'] + $r['total'], 2);
            }
        }
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT r.faults, r.device_name FROM `{$p}ecorepair` r WHERE r.id_shop = " . (int) $idShop
            . ' AND r.id_employee_tech = ' . (int) $idEmployee . " AND r.status = 'delivered'
              AND r.date_status BETWEEN '" . pSQL($from) . " 00:00:00' AND '" . pSQL($to) . " 23:59:59'") ?: array();
        $faults = array();
        $models = array();
        foreach ($rows as $r) {
            $list = json_decode((string) $r['faults'], true);
            foreach (is_array($list) ? $list : array() as $f) {
                $faults[$f] = (isset($faults[$f]) ? $faults[$f] : 0) + 1;
            }
            $models[$r['device_name']] = (isset($models[$r['device_name']]) ? $models[$r['device_name']] : 0) + 1;
        }
        $open = (int) Db::getInstance()->getValue("SELECT COUNT(*) FROM `{$p}ecorepair` WHERE id_shop = " . (int) $idShop
            . ' AND id_employee_tech = ' . (int) $idEmployee . " AND status IN ('received', 'diagnosis', 'quote', 'repair', 'ready')");

        return array('from' => $from, 'to' => $to, 'unit' => $unit, 'tech' => $t, 'series' => array_values($series),
            'faults' => self::top($faults, 8), 'models' => self::top($models, 8), 'open' => $open);
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
