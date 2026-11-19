<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Kits de reparación: grupo de piezas + mano de obra que se añade al presupuesto con un toque.
 * Las piezas del catálogo se añaden con su precio actual; el resto, con el precio guardado en el kit.
 */
class EcoRepairKit
{
    public static function all($idLang, $idShop)
    {
        $p = _DB_PREFIX_;
        $kits = Db::getInstance()->executeS("SELECT k.*, c.name AS category_name FROM `{$p}ecorepair_kit` k
            LEFT JOIN `{$p}ecorepair_category` c ON c.id_ecorepair_category = k.id_ecorepair_category
            WHERE k.active = 1 ORDER BY k.name ASC");
        if (!$kits) {
            return array();
        }
        $ids = array();
        foreach ($kits as $k) {
            $ids[] = (int) $k['id_ecorepair_kit'];
        }
        $lines = Db::getInstance()->executeS("SELECT * FROM `{$p}ecorepair_kit_line`
            WHERE id_ecorepair_kit IN (" . implode(',', $ids) . ') ORDER BY position ASC, id_ecorepair_kit_line ASC');
        $byKit = array();
        foreach ($lines ?: array() as $l) {
            if ((int) $l['id_product']) {
                $l['unit_price_tax_excl'] = (float) Product::getPriceStatic((int) $l['id_product'], false, (int) $l['id_product_attribute'] ?: null, 6);
            }
            $byKit[(int) $l['id_ecorepair_kit']][] = $l;
        }

        $out = array();
        foreach ($kits as $k) {
            $kl = isset($byKit[(int) $k['id_ecorepair_kit']]) ? EcoRepairQuote::decorateLines($byKit[(int) $k['id_ecorepair_kit']]) : array();
            if ($kl) {
                foreach ($kl as &$l) {
                    $l['image'] = $l['id_product'] ? EcoRepairQuote::productImage($l['id_product'], $l['id_product_attribute'], '', $idShop) : '';
                    $l['stock'] = $l['id_product']
                        ? (int) StockAvailable::getQuantityAvailableByProduct($l['id_product'], $l['id_product_attribute'], $idShop)
                        : null;
                }
                unset($l);
            }
            $total = 0;
            foreach ($kl as $l) {
                $total += $l['total'];
            }
            $out[] = array(
                'id' => (int) $k['id_ecorepair_kit'],
                'name' => $k['name'],
                'id_category' => (int) $k['id_ecorepair_category'],
                'category_name' => (string) $k['category_name'],
                'total' => round($total, 2),
                'lines' => $kl,
            );
        }

        return $out;
    }

    public static function save($name, $idCategory, $rawLines)
    {
        $name = trim(strip_tags((string) $name));
        if ($name === '' || Tools::strlen($name) > 96) {
            return array('ok' => false, 'error' => 'Escribe el nombre del kit (máximo 96 caracteres).');
        }
        $idCategory = max(0, (int) $idCategory);
        $clean = EcoRepairQuote::cleanLines($rawLines, false);
        if (!$clean['ok']) {
            return $clean;
        }
        if (!$clean['lines']) {
            return array('ok' => false, 'error' => 'El kit no tiene líneas.');
        }
        $db = Db::getInstance();
        $now = date('Y-m-d H:i:s');
        $db->insert('ecorepair_kit', array(
            'id_ecorepair_category' => $idCategory,
            'name' => pSQL($name),
            'active' => 1,
            'date_add' => $now,
            'date_upd' => $now,
        ));
        $id = (int) $db->Insert_ID();
        foreach ($clean['lines'] as $i => $l) {
            $db->insert('ecorepair_kit_line', array(
                'id_ecorepair_kit' => $id,
                'position' => (int) $i,
                'type' => pSQL($l['type']),
                'id_product' => (int) $l['id_product'],
                'id_product_attribute' => (int) $l['id_product_attribute'],
                'name' => pSQL($l['name']),
                'reference' => pSQL($l['reference']),
                'qty' => (float) $l['qty'],
                'unit_price_tax_excl' => (float) $l['unit_price_tax_excl'],
                'tax_rate' => (float) $l['tax_rate'],
            ));
        }

        return array('ok' => true, 'id' => $id);
    }

    /** Se oculta, no se borra. */
    public static function remove($id)
    {
        Db::getInstance()->update('ecorepair_kit', array('active' => 0, 'date_upd' => date('Y-m-d H:i:s')), 'id_ecorepair_kit = ' . (int) $id);

        return array('ok' => true);
    }
}
