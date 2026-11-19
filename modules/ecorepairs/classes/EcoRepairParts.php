<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Piezas de cada modelo (o de toda la marca), colocadas por zonas del dibujo del patinete o la bici:
 * neumático, cámara, pastillas, batería… con su medida, el producto de la tienda y el proveedor.
 * El proveedor (referencia, enlace y precio) solo lo ve el administrador.
 */
class EcoRepairParts
{
    /** Zonas del dibujo. */
    /** Partes del patín y sus categorías (clave de la categoría => nombre). Una categoría puede estar en dos partes (frenos). */
    public static function sections()
    {
        return array(
            array('key' => 'top', 'name' => 'Manillar', 'color' => '#2F6FE0', 'cats' => array('handlebar', 'display', 'throttle', 'levers', 'grips', 'bell', 'cables')),
            array('key' => 'stem', 'name' => 'Mástil y plegado', 'color' => '#8B5CF6', 'cats' => array('stem', 'folding', 'hook', 'lights', 'screws')),
            array('key' => 'front', 'name' => 'Parte delantera', 'color' => '#EA580C', 'cats' => array('wheel_f', 'brakes', 'fender_f', 'suspension_f', 'fork', 'motor_f')),
            array('key' => 'base', 'name' => 'Base central', 'color' => '#0B6E4B', 'cats' => array('battery', 'controller', 'charger', 'stand', 'grip_tape', 'frame', 'cover')),
            array('key' => 'rear', 'name' => 'Parte trasera', 'color' => '#DC2626', 'cats' => array('wheel_r', 'motor', 'brakes', 'fender_r', 'light_r', 'swingarm')),
            array('key' => 'other', 'name' => 'Otros', 'color' => '#64748B', 'cats' => array('other')),
        );
    }

    public static function zones()
    {
        return array(
            'handlebar' => 'Manillar', 'display' => 'Pantalla', 'throttle' => 'Acelerador', 'levers' => 'Manetas de freno', 'grips' => 'Puños',
            'bell' => 'Timbre', 'cables' => 'Cables',
            'stem' => 'Mástil', 'folding' => 'Plegado y dirección', 'hook' => 'Gancho', 'lights' => 'Luz delantera', 'screws' => 'Tornillería',
            'wheel_f' => 'Rueda delantera', 'brakes' => 'Frenos', 'fender_f' => 'Guardabarros delantero', 'suspension_f' => 'Suspensión delantera',
            'fork' => 'Horquilla', 'motor_f' => 'Motor delantero',
            'battery' => 'Batería', 'controller' => 'Controladora', 'charger' => 'Cargador y puerto de carga', 'stand' => 'Caballete',
            'grip_tape' => 'Goma antideslizante', 'frame' => 'Plataforma y chasis', 'cover' => 'Tapa inferior',
            'wheel_r' => 'Rueda trasera', 'motor' => 'Motor', 'fender_r' => 'Guardabarros trasero', 'light_r' => 'Luz trasera', 'swingarm' => 'Basculante y suspensión',
            'other' => 'Otros',
        );
    }

    /**
     * Qué zonas sugiere cada avería (por palabras). Sirve para destacar las piezas después del diagnóstico.
     */
    public static function zonesForFaults(array $faults, $text = '')
    {
        $map = array(
            'pinch|neum|rueda|cámara|camara|llanta' => array('wheel_f', 'wheel_r'),
            'fren|pastill|disco|maneta' => array('brakes', 'levers'),
            'no carga|carga|cargador|autonom|se apaga|batería|bateria|bms|hinchad' => array('battery', 'charger'),
            'no enciende|no arranca' => array('battery', 'controller', 'display'),
            'pantalla|error|display' => array('display', 'controller'),
            'aceler|gatillo' => array('throttle'),
            'luz|luces' => array('lights', 'light_r'),
            'ruido|motor|pierde asistencia|sensor' => array('motor', 'motor_f', 'controller'),
            'plegado|holgura|dirección|direccion|cierre' => array('folding', 'hook'),
            'guardabarros' => array('fender_f', 'fender_r'),
            'suspensi|amortigu' => array('suspension_f', 'swingarm'),
            'caballete|pata' => array('stand'),
        );
        $hay = Tools::strtolower(implode(' ', $faults) . ' ' . $text);
        $out = array();
        foreach ($map as $words => $zones) {
            if (preg_match('/' . $words . '/u', $hay)) {
                $out = array_merge($out, $zones);
            }
        }

        return array_values(array_unique($out));
    }

    /**
     * Zonas dibujadas sobre la foto del modelo: array('flip' => 0|1, 'pts' => [4 puntos], 'polys' => array(parte => [[x,y],...])) en % de la foto.
     */
    public static function modelMap($idModel)
    {
        if (!(int) $idModel) {
            return null;
        }
        $raw = Db::getInstance()->getValue('SELECT zones FROM `' . _DB_PREFIX_ . 'ecorepair_model` WHERE id_ecorepair_model = ' . (int) $idModel);
        $d = $raw ? json_decode($raw, true) : null;

        return is_array($d) && !empty($d['polys']) ? $d : null;
    }

    public static function saveModelMap($idModel, $raw)
    {
        $d = json_decode((string) $raw, true);
        if (!(int) $idModel) {
            return array('ok' => false, 'error' => 'Elige un modelo.');
        }
        if (!is_array($d)) {
            Db::getInstance()->update('ecorepair_model', array('zones' => null), 'id_ecorepair_model = ' . (int) $idModel, 0, true);

            return array('ok' => true, 'map' => null);
        }
        $keys = array('top', 'stem', 'front', 'base', 'rear');
        $pt = function ($p) {
            return is_array($p) && count($p) === 2 ? array(round(max(0, min(100, (float) $p[0])), 2), round(max(0, min(100, (float) $p[1])), 2)) : null;
        };
        $out = array('flip' => !empty($d['flip']) ? 1 : 0, 'pts' => array(), 'polys' => array());
        foreach (isset($d['pts']) && is_array($d['pts']) ? array_slice($d['pts'], 0, 4) : array() as $p) {
            if ($q = $pt($p)) {
                $out['pts'][] = $q;
            }
        }
        foreach ($keys as $k) {
            if (empty($d['polys'][$k]) || !is_array($d['polys'][$k])) {
                continue;
            }
            $poly = array();
            foreach (array_slice($d['polys'][$k], 0, 24) as $p) {
                if ($q = $pt($p)) {
                    $poly[] = $q;
                }
            }
            if (count($poly) >= 3) {
                $out['polys'][$k] = $poly;
            }
        }
        if (!$out['polys']) {
            return array('ok' => false, 'error' => 'Marca al menos una parte en la foto.');
        }
        Db::getInstance()->update('ecorepair_model', array('zones' => pSQL(json_encode($out))), 'id_ecorepair_model = ' . (int) $idModel);

        return array('ok' => true, 'map' => $out);
    }

    protected static function txt($v, $max)
    {
        return Tools::substr(trim(strip_tags((string) $v)), 0, $max);
    }

    /**
     * Piezas de un modelo (las suyas y las de su marca), con el producto de la tienda: foto, precio y stock.
     * $admin: incluye los datos del proveedor.
     */
    public static function forModel($idBrand, $idModel, $admin)
    {
        $rows = Db::getInstance()->executeS('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_part`
            WHERE id_ecorepair_brand = ' . (int) $idBrand . ' AND id_ecorepair_model IN (0, ' . (int) $idModel . ')
            ORDER BY position ASC, id_ecorepair_part ASC') ?: array();

        return array_map(function ($r) use ($admin) {
            return EcoRepairParts::publicRow($r, $admin);
        }, $rows);
    }

    public static function publicRow(array $r, $admin)
    {
        $ctx = Context::getContext();
        $idShop = (int) $ctx->shop->id;
        $p = array(
            'id' => (int) $r['id_ecorepair_part'],
            'zone' => $r['zone'],
            'name' => $r['name'],
            'spec' => $r['spec'],
            'notes' => (string) $r['notes'],
            'scope' => (int) $r['id_ecorepair_model'] ? 'model' : 'brand',
            'id_product' => (int) $r['id_product'],
            'id_product_attribute' => (int) $r['id_product_attribute'],
            'product' => null,
            'has_supplier' => $r['supplier_url'] !== '' || $r['supplier_ref'] !== '',
        );
        if ((int) $r['id_product']) {
            $id = (int) $r['id_product'];
            $ida = (int) $r['id_product_attribute'];
            $name = Product::getProductName($id, $ida ?: null, (int) $ctx->language->id);
            if ($name) {
                $rate = (float) Tax::getProductTaxRate($id);
                $excl = (float) Product::getPriceStatic($id, false, $ida ?: null, 6);
                $p['product'] = array(
                    'name' => $name,
                    'reference' => (string) Db::getInstance()->getValue('SELECT reference FROM `' . _DB_PREFIX_ . 'product` WHERE id_product = ' . $id),
                    'price' => round($excl * (1 + $rate / 100), 2),
                    'tax_rate' => (int) round($rate) ?: 21,
                    'stock' => (int) StockAvailable::getQuantityAvailableByProduct($id, $ida, $idShop),
                    'image' => EcoRepairQuote::productImage($id, $ida, '', $idShop),
                );
            }
        }
        if ($admin) {
            $p['supplier_name'] = $r['supplier_name'];
            $p['supplier_ref'] = $r['supplier_ref'];
            $p['supplier_url'] = $r['supplier_url'];
            $p['supplier_price'] = (float) $r['supplier_price'];
        }

        return $p;
    }

    public static function save($id, $idBrand, $idModel, array $d)
    {
        $zones = self::zones();
        $zone = isset($d['zone'], $zones[$d['zone']]) ? $d['zone'] : 'other';
        $name = self::txt(isset($d['name']) ? $d['name'] : '', 128);
        if ($name === '') {
            return array('ok' => false, 'error' => 'Escribe qué pieza es (por ejemplo «Neumático trasero»).');
        }
        if (!(int) $idBrand) {
            return array('ok' => false, 'error' => 'Falta la marca.');
        }
        $url = trim((string) (isset($d['supplier_url']) ? $d['supplier_url'] : ''));
        if ($url !== '' && (!preg_match('#^https?://#i', $url) || !Validate::isAbsoluteUrl($url) || Tools::strlen($url) > 255)) {
            return array('ok' => false, 'error' => 'El enlace del proveedor no es válido (tiene que empezar por http).');
        }
        $row = array(
            'zone' => pSQL($zone),
            'name' => pSQL($name),
            'spec' => pSQL(self::txt(isset($d['spec']) ? $d['spec'] : '', 96)),
            'notes' => pSQL(self::txt(isset($d['notes']) ? $d['notes'] : '', 1000)),
            'id_product' => isset($d['id_product']) ? max(0, (int) $d['id_product']) : 0,
            'id_product_attribute' => isset($d['id_product_attribute']) ? max(0, (int) $d['id_product_attribute']) : 0,
            'supplier_name' => pSQL(self::txt(isset($d['supplier_name']) ? $d['supplier_name'] : '', 96)),
            'supplier_ref' => pSQL(self::txt(isset($d['supplier_ref']) ? $d['supplier_ref'] : '', 64)),
            'supplier_url' => pSQL($url),
            'supplier_price' => round(max(0, (float) str_replace(',', '.', (string) (isset($d['supplier_price']) ? $d['supplier_price'] : 0))), 2),
            'date_upd' => date('Y-m-d H:i:s'),
        );
        $db = Db::getInstance();
        if ($id) {
            $db->update('ecorepair_part', $row, 'id_ecorepair_part = ' . (int) $id);
        } else {
            $row['id_ecorepair_brand'] = (int) $idBrand;
            $row['id_ecorepair_model'] = (int) $idModel;
            $row['position'] = (int) $db->getValue('SELECT IFNULL(MAX(position), 0) + 1 FROM `' . _DB_PREFIX_ . 'ecorepair_part`');
            $row['date_add'] = $row['date_upd'];
            $db->insert('ecorepair_part', $row);
            $id = (int) $db->Insert_ID();
        }

        return array('ok' => true, 'id' => (int) $id);
    }

    public static function delete($id)
    {
        Db::getInstance()->delete('ecorepair_part', 'id_ecorepair_part = ' . (int) $id);

        return array('ok' => true);
    }

    /**
     * Buscador de piezas en todo el catálogo de modelos: por medida, nombre, referencia o modelo.
     * Agrupa la misma pieza (misma medida o mismo producto) y dice en qué modelos se usa.
     */
    public static function search($q, $admin, $limit = 60)
    {
        $words = EcoRepairQuote::searchWords($q);
        if (!$words) {
            return array();
        }
        $p = _DB_PREFIX_;
        $conds = array();
        foreach ($words as $w) {
            $l = pSQL(str_replace(array('%', '_'), array('\\%', '\\_'), $w));
            $conds[] = "(pt.name LIKE '%{$l}%' OR pt.spec LIKE '%{$l}%' OR REPLACE(REPLACE(pt.spec, ' ', ''), ',', '.') LIKE '%" . pSQL(str_replace(',', '.', $w)) . "%'
                OR pt.supplier_ref LIKE '%{$l}%' OR b.name LIKE '%{$l}%' OR m.name LIKE '%{$l}%')";
        }
        $rows = Db::getInstance()->executeS("SELECT pt.*, b.name AS brand, m.name AS model, c.name AS category
            FROM `{$p}ecorepair_part` pt
            INNER JOIN `{$p}ecorepair_brand` b ON b.id_ecorepair_brand = pt.id_ecorepair_brand
            LEFT JOIN `{$p}ecorepair_model` m ON m.id_ecorepair_model = pt.id_ecorepair_model
            LEFT JOIN `{$p}ecorepair_category` c ON c.id_ecorepair_category = b.id_ecorepair_category
            WHERE " . implode(' AND ', $conds) . ' ORDER BY pt.name LIMIT ' . (int) $limit) ?: array();
        $groups = array();
        foreach ($rows as $r) {
            $key = (int) $r['id_product'] ? 'p' . (int) $r['id_product'] . '-' . (int) $r['id_product_attribute'] : 's' . Tools::strtolower($r['name'] . '|' . $r['spec']);
            if (!isset($groups[$key])) {
                $groups[$key] = self::publicRow($r, $admin);
                $groups[$key]['models'] = array();
            }
            $groups[$key]['models'][] = array('id_brand' => (int) $r['id_ecorepair_brand'], 'id_model' => (int) $r['id_ecorepair_model'],
                'label' => $r['brand'] . ((int) $r['id_ecorepair_model'] ? ' ' . $r['model'] : ' (toda la marca)'), 'category' => (string) $r['category']);
        }

        return array_values($groups);
    }
}
