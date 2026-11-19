<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Precio cerrado por modelo: «Cambio de rueda trasera = 35 €». Puede llevar piezas de la tienda (para descontar stock).
 * Al aplicarlo, la mano de obra se ajusta para que el total sea el precio cerrado.
 */
class EcoRepairFixed
{
    public static function forModel($idBrand, $idModel)
    {
        $rows = Db::getInstance()->executeS('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_fixed`
            WHERE id_ecorepair_brand = ' . (int) $idBrand . ' AND id_ecorepair_model IN (0, ' . (int) $idModel . ')
            ORDER BY name ASC') ?: array();
        $out = array();
        foreach ($rows as $r) {
            $out[] = array(
                'id' => (int) $r['id_ecorepair_fixed'],
                'name' => $r['name'],
                'price' => round((float) $r['price'], 2),
                'products' => EcoRepairUnlock::products($r['products']),
                'notes' => $r['notes'],
                'scope' => (int) $r['id_ecorepair_model'] ? 'model' : 'brand',
            );
        }

        return $out;
    }

    public static function save($id, $idBrand, $idModel, array $d)
    {
        if (!(int) $idBrand) {
            return array('ok' => false, 'error' => 'Falta la marca.');
        }
        $name = Tools::substr(trim(strip_tags(isset($d['name']) ? (string) $d['name'] : '')), 0, 128);
        if ($name === '') {
            return array('ok' => false, 'error' => 'Escribe qué incluye (por ejemplo «Cambio de rueda trasera»).');
        }
        $price = round((float) str_replace(',', '.', (string) (isset($d['price']) ? $d['price'] : 0)), 2);
        if ($price <= 0 || $price > 99999) {
            return array('ok' => false, 'error' => 'Escribe el precio cerrado con IVA.');
        }
        $row = array(
            'name' => pSQL($name),
            'price' => $price,
            'products' => pSQL(json_encode(EcoRepairUnlock::cleanProducts(isset($d['products']) ? $d['products'] : array()))),
            'notes' => pSQL(Tools::substr(trim(strip_tags(isset($d['notes']) ? (string) $d['notes'] : '')), 0, 500)),
            'date_upd' => date('Y-m-d H:i:s'),
        );
        $db = Db::getInstance();
        if ($id) {
            $db->update('ecorepair_fixed', $row, 'id_ecorepair_fixed = ' . (int) $id);
        } else {
            $row['id_ecorepair_brand'] = (int) $idBrand;
            $row['id_ecorepair_model'] = (int) $idModel;
            $row['date_add'] = $row['date_upd'];
            $db->insert('ecorepair_fixed', $row);
            $id = (int) $db->Insert_ID();
        }

        return array('ok' => true, 'id' => (int) $id);
    }

    public static function delete($id)
    {
        Db::getInstance()->delete('ecorepair_fixed', 'id_ecorepair_fixed = ' . (int) $id);

        return array('ok' => true);
    }

    /**
     * Líneas para el presupuesto: las piezas con su precio de la tienda y la mano de obra con lo que falta hasta el precio cerrado.
     * Si las piezas valen más que el precio cerrado, se pone un descuento en las piezas.
     */
    public static function lines(array $f)
    {
        $lines = array();
        $parts = 0;
        foreach ($f['products'] as $p) {
            $lines[] = array('type' => 'part', 'id_product' => $p['id_product'], 'id_product_attribute' => $p['id_product_attribute'], 'name' => $p['name'],
                'reference' => $p['reference'], 'qty' => $p['qty'], 'price' => $p['price'], 'tax_rate' => $p['tax_rate'], 'discount' => 0);
            $parts += round($p['qty'] * $p['price'], 2);
        }
        $rest = round($f['price'] - $parts, 2);
        if ($rest >= 0) {
            $lines[] = array('type' => 'labour', 'name' => 'Precio cerrado · ' . $f['name'], 'qty' => 1, 'price' => $rest, 'tax_rate' => 21, 'discount' => 0);
        } else {
            $left = -$rest;
            foreach ($lines as &$l) {
                $max = round($l['qty'] * $l['price'], 2);
                $take = min($max, $left);
                $l['discount'] = $take;
                $left = round($left - $take, 2);
            }
            unset($l);
            $lines[0]['name'] = Tools::substr($lines[0]['name'] . ' (precio cerrado: ' . $f['name'] . ')', 0, 128);
        }

        return $lines;
    }

    public static function addToQuote(array $repair, $id, $idEmployee, $who)
    {
        $f = null;
        foreach (self::forModel((int) $repair['id_brand'], (int) $repair['id_model']) as $x) {
            if ($x['id'] === (int) $id) {
                $f = $x;
            }
        }
        if (!$f) {
            return array('ok' => false, 'error' => 'Ese precio cerrado no es de este modelo.');
        }

        return EcoRepairQuote::appendToDraft($repair, self::lines($f), $idEmployee, $who);
    }
}
