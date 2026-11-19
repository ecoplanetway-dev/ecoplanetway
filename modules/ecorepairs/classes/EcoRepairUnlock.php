<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Deslimitación por modelo: uno o varios métodos con pasos, velocidad, piezas de la tienda y proveedor (solo admin).
 * Desde una reparación se añade al presupuesto (servicio + piezas) con el aviso legal en las observaciones.
 */
class EcoRepairUnlock
{
    public static function methods()
    {
        return array('app' => 'App', 'firmware' => 'Firmware', 'dongle' => 'Chip / dongle', 'controller' => 'Cambio de controladora',
            'display' => 'Ajustes de la pantalla (P)', 'other' => 'Otro');
    }

    /** Producto de la tienda con nombre, precio con IVA, stock y foto. */
    public static function productInfo($idProduct, $idAttr)
    {
        $ctx = Context::getContext();
        $idProduct = (int) $idProduct;
        $idAttr = (int) $idAttr;
        $name = $idProduct ? Product::getProductName($idProduct, $idAttr ?: null, (int) $ctx->language->id) : '';
        if (!$name) {
            return null;
        }
        $rate = (float) Tax::getProductTaxRate($idProduct);
        $excl = (float) Product::getPriceStatic($idProduct, false, $idAttr ?: null, 6);

        return array(
            'id_product' => $idProduct,
            'id_product_attribute' => $idAttr,
            'name' => $name,
            'reference' => (string) Db::getInstance()->getValue('SELECT reference FROM `' . _DB_PREFIX_ . 'product` WHERE id_product = ' . $idProduct),
            'price' => round($excl * (1 + $rate / 100), 2),
            'tax_rate' => (int) round($rate) ?: 21,
            'stock' => (int) StockAvailable::getQuantityAvailableByProduct($idProduct, $idAttr, (int) $ctx->shop->id),
            'image' => EcoRepairQuote::productImage($idProduct, $idAttr, '', (int) $ctx->shop->id),
        );
    }

    /** Lista de productos guardada como JSON → con datos de la tienda. */
    public static function products($json)
    {
        $out = array();
        $list = json_decode((string) $json, true);
        foreach (is_array($list) ? $list : array() as $p) {
            if (!is_array($p) || empty($p['id_product'])) {
                continue;
            }
            $info = self::productInfo($p['id_product'], isset($p['id_product_attribute']) ? $p['id_product_attribute'] : 0);
            if ($info) {
                $info['qty'] = max(1, (int) (isset($p['qty']) ? $p['qty'] : 1));
                $out[] = $info;
            }
        }

        return $out;
    }

    /** Limpia la lista de productos que llega del navegador. */
    public static function cleanProducts($raw)
    {
        $out = array();
        foreach (is_array($raw) ? array_slice($raw, 0, 20) : array() as $p) {
            if (is_array($p) && (int) (isset($p['id_product']) ? $p['id_product'] : 0) > 0) {
                $out[] = array('id_product' => (int) $p['id_product'], 'id_product_attribute' => max(0, (int) (isset($p['id_product_attribute']) ? $p['id_product_attribute'] : 0)),
                    'qty' => max(1, min(99, (int) (isset($p['qty']) ? $p['qty'] : 1))));
            }
        }

        return $out;
    }

    public static function forModel($idBrand, $idModel, $admin)
    {
        $rows = Db::getInstance()->executeS('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_unlock`
            WHERE id_ecorepair_brand = ' . (int) $idBrand . ' AND id_ecorepair_model IN (0, ' . (int) $idModel . ')
            ORDER BY speed_to DESC, id_ecorepair_unlock ASC') ?: array();
        $methods = self::methods();
        $out = array();
        foreach ($rows as $r) {
            $u = array(
                'id' => (int) $r['id_ecorepair_unlock'],
                'method' => $r['method'],
                'method_name' => isset($methods[$r['method']]) ? $methods[$r['method']] : $r['method'],
                'speed_from' => (int) $r['speed_from'],
                'speed_to' => (int) $r['speed_to'],
                'firmware' => $r['firmware'],
                'steps' => (string) $r['steps'],
                'minutes' => (int) $r['minutes'],
                'difficulty' => (int) $r['difficulty'],
                'price' => round((float) $r['price'], 2),
                'products' => self::products($r['products']),
                'scope' => (int) $r['id_ecorepair_model'] ? 'model' : 'brand',
                'author' => $r['author'],
                'date' => $r['date_upd'],
            );
            if ($admin) {
                $u['supplier_name'] = $r['supplier_name'];
                $u['supplier_url'] = $r['supplier_url'];
            }
            $out[] = $u;
        }

        return $out;
    }

    public static function save($id, $idBrand, $idModel, array $d, $author, $admin = true)
    {
        if (!(int) $idBrand) {
            return array('ok' => false, 'error' => 'Falta la marca.');
        }
        $methods = self::methods();
        $method = isset($d['method'], $methods[$d['method']]) ? $d['method'] : 'other';
        $txt = function ($k, $max) use ($d) {
            return Tools::substr(trim(strip_tags(isset($d[$k]) ? (string) $d[$k] : '')), 0, $max);
        };
        $steps = $txt('steps', 5000);
        if ($steps === '') {
            return array('ok' => false, 'error' => 'Escribe los pasos para deslimitarlo.');
        }
        $url = trim(isset($d['supplier_url']) ? (string) $d['supplier_url'] : '');
        if ($url !== '' && (!preg_match('#^https?://#i', $url) || !Validate::isAbsoluteUrl($url) || Tools::strlen($url) > 255)) {
            return array('ok' => false, 'error' => 'El enlace de compra no es válido (tiene que empezar por http).');
        }
        $row = array(
            'method' => pSQL($method),
            'speed_from' => max(0, min(200, (int) (isset($d['speed_from']) ? $d['speed_from'] : 0))),
            'speed_to' => max(0, min(200, (int) (isset($d['speed_to']) ? $d['speed_to'] : 0))),
            'firmware' => pSQL($txt('firmware', 96)),
            'steps' => pSQL($steps),
            'minutes' => max(0, min(999, (int) (isset($d['minutes']) ? $d['minutes'] : 0))),
            'difficulty' => max(1, min(3, (int) (isset($d['difficulty']) ? $d['difficulty'] : 1))),
            'price' => round(max(0, (float) str_replace(',', '.', (string) (isset($d['price']) ? $d['price'] : 0))), 2),
            'products' => pSQL(json_encode(self::cleanProducts(isset($d['products']) ? $d['products'] : array()))),
            'supplier_name' => pSQL($txt('supplier_name', 96)),
            'supplier_url' => pSQL($url),
            'author' => pSQL(Tools::substr((string) $author, 0, 64)),
            'date_upd' => date('Y-m-d H:i:s'),
        );
        $db = Db::getInstance();
        if (!$admin) {
            // Solo el administrador ve y cambia dónde se compra
            unset($row['supplier_name'], $row['supplier_url']);
        }
        if ($id) {
            $db->update('ecorepair_unlock', $row, 'id_ecorepair_unlock = ' . (int) $id);
        } else {
            $row['id_ecorepair_brand'] = (int) $idBrand;
            $row['id_ecorepair_model'] = (int) $idModel;
            $row['date_add'] = $row['date_upd'];
            $db->insert('ecorepair_unlock', $row);
            $id = (int) $db->Insert_ID();
        }

        return array('ok' => true, 'id' => (int) $id);
    }

    public static function delete($id)
    {
        Db::getInstance()->delete('ecorepair_unlock', 'id_ecorepair_unlock = ' . (int) $id);

        return array('ok' => true);
    }

    public static function get($id)
    {
        $r = Db::getInstance()->getRow('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_unlock` WHERE id_ecorepair_unlock = ' . (int) $id);

        return $r ?: null;
    }

    /** Añade el servicio y sus piezas al borrador del presupuesto, con el aviso legal en las observaciones. */
    public static function addToQuote(array $repair, $id, $idEmployee, $who)
    {
        $u = self::get($id);
        if (!$u || (int) $u['id_ecorepair_brand'] !== (int) $repair['id_brand']) {
            return array('ok' => false, 'error' => 'Ese método no es de este modelo.');
        }
        $methods = self::methods();
        $lines = array(array('type' => 'labour', 'name' => 'Deslimitación · ' . (isset($methods[$u['method']]) ? $methods[$u['method']] : $u['method']) .
            ((int) $u['speed_to'] ? ' (hasta ' . (int) $u['speed_to'] . ' km/h)' : ''), 'qty' => 1, 'price' => round((float) $u['price'], 2), 'tax_rate' => 21));
        foreach (self::products($u['products']) as $p) {
            $lines[] = array('type' => 'part', 'id_product' => $p['id_product'], 'id_product_attribute' => $p['id_product_attribute'], 'name' => $p['name'],
                'reference' => $p['reference'], 'qty' => $p['qty'], 'price' => $p['price'], 'tax_rate' => $p['tax_rate']);
        }

        return EcoRepairQuote::appendToDraft($repair, $lines, $idEmployee, $who, trim((string) Configuration::get('ECOREPAIRS_UNLOCK_NOTICE')));
    }
}
