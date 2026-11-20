<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Unión con otros módulos de la tienda (si están instalados):
 *  - spcompatpro: repuestos compatibles que ve el cliente en la tienda.
 *  - epwbatteryconfigurator: voltaje, Ah y conectores que admite cada modelo.
 *  - epwcentro: proveedor, coste, disponibilidad y cesta de pedidos al proveedor.
 * Solo lee sus tablas y añade filas en sus listas; no cambia cómo funcionan.
 */
class EcoRepairLinks
{
    protected static $tables = array();
    protected static $images = array();

    public static function has($table)
    {
        if (!isset(self::$tables[$table])) {
            self::$tables[$table] = (bool) Db::getInstance()->executeS("SHOW TABLES LIKE '" . pSQL(_DB_PREFIX_ . $table) . "'");
        }

        return self::$tables[$table];
    }

    public static function norm($s)
    {
        $s = Tools::strtolower(Tools::replaceAccentedChars((string) $s));

        return preg_replace('/[^a-z0-9]+/', '', $s);
    }

    /** Datos del modelo del taller: marca, nombre y enlaces guardados. */
    public static function model($idModel)
    {
        $p = _DB_PREFIX_;

        return Db::getInstance()->getRow("SELECT m.*, b.name AS brand FROM `{$p}ecorepair_model` m
            INNER JOIN `{$p}ecorepair_brand` b ON b.id_ecorepair_brand = m.id_ecorepair_brand WHERE m.id_ecorepair_model = " . (int) $idModel) ?: null;
    }

    /* ======================== spcompatpro ======================== */

    public static function spcpOn()
    {
        return self::has('spcp_model') && self::has('spcp_model_spare');
    }

    public static function spcpModels()
    {
        if (!self::spcpOn()) {
            return array();
        }
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT m.id_model, m.name, m.active, IFNULL(b.name, '') AS brand FROM `{$p}spcp_model` m
            LEFT JOIN `{$p}spcp_brand` b ON b.id_brand = m.id_brand ORDER BY b.name, m.name") ?: array();

        return array_map(function ($r) {
            return array('id' => (int) $r['id_model'], 'name' => $r['name'], 'brand' => $r['brand'], 'active' => (int) $r['active']);
        }, $rows);
    }

    public static function spcpCategories()
    {
        if (!self::has('spcp_category')) {
            return array();
        }
        $rows = Db::getInstance()->executeS('SELECT id_category, name FROM `' . _DB_PREFIX_ . 'spcp_category` WHERE active = 1 ORDER BY position, name') ?: array();

        return array_map(function ($r) {
            return array('id' => (int) $r['id_category'], 'name' => $r['name']);
        }, $rows);
    }

    /** Modelo de la tienda enlazado (o el que mejor encaja por marca y nombre, sin guardarlo). */
    public static function spcpFor(array $m)
    {
        if (!self::spcpOn()) {
            return array('id' => 0, 'auto' => false);
        }
        if ((int) $m['spcp_model']) {
            return array('id' => (int) $m['spcp_model'], 'auto' => false);
        }
        $want = self::norm($m['brand'] . $m['name']);
        $wantName = self::norm($m['name']);
        foreach (self::spcpModels() as $s) {
            $full = self::norm($s['brand'] . $s['name']);
            if ($full === $want || ($wantName !== '' && self::norm($s['name']) === $want) || ($s['brand'] !== '' && self::norm($s['name']) === $wantName && self::norm($s['brand']) === self::norm($m['brand']))) {
                return array('id' => $s['id'], 'auto' => true);
            }
        }

        return array('id' => 0, 'auto' => false);
    }

    public static function spcpLink($idModel, $idSpcp)
    {
        Db::getInstance()->update('ecorepair_model', array('spcp_model' => (int) $idSpcp), 'id_ecorepair_model = ' . (int) $idModel);

        return array('ok' => true);
    }

    /** Productos ya publicados como compatibles en un modelo de la tienda. */
    public static function spcpPublished($idSpcp)
    {
        if (!$idSpcp || !self::spcpOn()) {
            return array();
        }
        $rows = Db::getInstance()->executeS('SELECT id_product, id_category FROM `' . _DB_PREFIX_ . 'spcp_model_spare` WHERE id_model = ' . (int) $idSpcp) ?: array();
        $out = array();
        foreach ($rows as $r) {
            $out[(int) $r['id_product']] = (int) $r['id_category'];
        }

        return $out;
    }

    /** Publica varios productos en varios modelos de la tienda de una vez. items: [{id_product, id_category}] */
    public static function spcpPublish(array $items, array $models)
    {
        if (!self::spcpOn()) {
            return array('ok' => false, 'error' => 'El módulo de repuestos compatibles no está instalado.');
        }
        $models = array_values(array_unique(array_filter(array_map('intval', $models))));
        if (!$models) {
            return array('ok' => false, 'error' => 'Elige al menos un patín de la tienda.');
        }
        $db = Db::getInstance();
        $p = _DB_PREFIX_;
        $n = 0;
        foreach ($models as $idm) {
            $pos = (int) $db->getValue("SELECT IFNULL(MAX(position), 0) FROM `{$p}spcp_model_spare` WHERE id_model = " . $idm);
            foreach ($items as $it) {
                $idp = isset($it['id_product']) ? (int) $it['id_product'] : 0;
                $idc = isset($it['id_category']) ? (int) $it['id_category'] : 0;
                if (!$idp || !$idc) {
                    continue;
                }
                $ok = $db->execute("INSERT IGNORE INTO `{$p}spcp_model_spare` (id_model, id_product, id_category, position) VALUES ({$idm}, {$idp}, {$idc}, " . (++$pos) . ')');
                if ($ok && $db->Affected_Rows()) {
                    ++$n;
                }
            }
        }

        return array('ok' => true, 'added' => $n);
    }

    public static function spcpUnpublish($idSpcp, $idProduct)
    {
        Db::getInstance()->delete('spcp_model_spare', 'id_model = ' . (int) $idSpcp . ' AND id_product = ' . (int) $idProduct);

        return array('ok' => true);
    }

    /** Lo que necesita la pantalla del modelo para publicar. */
    public static function spcpBundle($idModel)
    {
        if (!self::spcpOn() || !(int) $idModel) {
            return null;
        }
        $m = self::model($idModel);
        if (!$m) {
            return null;
        }
        $link = self::spcpFor($m);

        return array(
            'linked' => $link['id'],
            'auto' => $link['auto'],
            'published' => self::spcpPublished($link['id']),
            'models' => self::spcpModels(),
            'categories' => self::spcpCategories(),
        );
    }

    /* ======================== Baterías a medida ======================== */

    public static function batOn()
    {
        return self::has('epw_battery_profile') && self::has('epw_battery_model');
    }

    /** Id del modelo en el catálogo de baterías (como lo busca el configurador: marca y modelo por nombre). */
    public static function batModelId(array $m)
    {
        if (!self::batOn()) {
            return '';
        }
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT bm.model_id, bm.name, bb.name AS brand, bb.aliases_json FROM `{$p}epw_battery_model` bm
            INNER JOIN `{$p}epw_battery_brand` bb ON bb.brand_id = bm.brand_id") ?: array();
        $brand = self::norm($m['brand']);
        $name = self::norm($m['name']);
        foreach ($rows as $r) {
            $brands = array(self::norm($r['brand']));
            foreach ((array) json_decode((string) $r['aliases_json'], true) as $a) {
                $brands[] = self::norm($a);
            }
            if (in_array($brand, $brands, true) && self::norm($r['name']) === $name) {
                return $r['model_id'];
            }
        }

        return '';
    }

    protected static function profiles()
    {
        $rows = Db::getInstance()->executeS('SELECT id_product, id_shop, config_json FROM `' . _DB_PREFIX_ . 'epw_battery_profile`
            WHERE id_shop = ' . (int) Context::getContext()->shop->id) ?: array();
        $out = array();
        foreach ($rows as $r) {
            $p = json_decode($r['config_json'], true);
            if (is_array($p) && empty($p['disabled'])) {
                $out[] = array('row' => $r, 'p' => $p);
            }
        }

        return $out;
    }

    /** Opciones de conectores que ofrece el configurador (para elegir en el taller). */
    protected static function connectorOptions(array $profiles)
    {
        $out = array('controller' => array(), 'charge' => array());
        foreach ($profiles as $pr) {
            foreach (isset($pr['p']['fields']) ? $pr['p']['fields'] : array() as $f) {
                if (!isset($f['id'], $out[$f['id']])) {
                    continue;
                }
                foreach ($f['options'] as $o) {
                    if ($o['id'] !== 'unknown') {
                        $out[$f['id']][$o['id']] = $o['label'];
                        if (!empty($o['image'])) {
                            self::$images[$o['id']] = preg_match('#^https?://#i', $o['image']) ? $o['image'] : __PS_BASE_URI__ . 'modules/epwbatteryconfigurator/' . $o['image'];
                        }
                    }
                }
            }
        }

        return $out;
    }

    /**
     * Batería del modelo: lo del taller (medidas del hueco) + lo del configurador (voltaje, Ah, conectores).
     * Si el configurador tiene datos, mandan esos y se guardan también en el taller.
     */
    public static function battery($idModel)
    {
        $m = self::model($idModel);
        if (!$m) {
            return null;
        }
        $t = json_decode((string) (isset($m['battery']) ? $m['battery'] : ''), true);
        $t = is_array($t) ? $t : array();
        $out = array('len' => '', 'wid' => '', 'hei' => '', 'volt' => '', 'minAh' => '', 'maxAh' => '', 'ctrl' => array(), 'charge' => array(), 'notes' => '');
        foreach ($out as $k => $v) {
            if (isset($t[$k])) {
                $out[$k] = $t[$k];
            }
        }
        $out['linked'] = false;
        $out['module'] = self::batOn();
        $out['volts'] = array(12, 24, 36, 48, 52, 60, 72);
        $out['connectors'] = array('controller' => array('xt30' => 'XT30', 'xt60' => 'XT60', 'xt90' => 'XT90', 'ec5' => 'EC5', 'tdeans' => 'T-Deans'),
            'charge' => array('gx16_3' => 'GX16 · 3 contactos', 'gx16_2' => 'GX16 · 2 contactos', 'dc21' => 'DC 5,5 × 2,1', 'dc25' => 'DC 5,5 × 2,5', 'xlr3' => 'XLR · 3 contactos'));
        if (!self::batOn()) {
            return $out;
        }
        $mid = self::batModelId($m);
        $profiles = self::profiles();
        $con = self::connectorOptions($profiles);
        if ($con['controller'] || $con['charge']) {
            $out['connectors'] = $con;
        }
        $out['connectorImages'] = self::$images;
        $volts = array();
        foreach ($profiles as $pr) {
            $volts = array_merge($volts, isset($pr['p']['volts']) ? $pr['p']['volts'] : array());
        }
        if ($volts) {
            $volts = array_values(array_unique(array_map('floatval', $volts)));
            sort($volts);
            $out['volts'] = $volts;
        }
        $out['model_id'] = $mid;
        if ($mid === '') {
            return $out;
        }
        foreach ($profiles as $pr) {
            $r = isset($pr['p']['modelRules'][$mid]) ? $pr['p']['modelRules'][$mid] : null;
            if (!$r || empty($r['originalVoltage'])) {
                continue;
            }
            $out['linked'] = true;
            $out['volt'] = (float) $r['originalVoltage'];
            $out['minAh'] = (float) $r['minAh'];
            $out['maxAh'] = (float) $r['maxAh'];
            if (!empty($r['options']['controller'])) {
                $out['ctrl'] = array_values($r['options']['controller']);
            }
            if (!empty($r['options']['charge'])) {
                $out['charge'] = array_values($r['options']['charge']);
            }
            if (!empty($r['fitNotes']) && $out['notes'] === '') {
                $out['notes'] = $r['fitNotes'];
            }
            break;
        }
        if ($out['linked']) {
            // Lo del configurador también queda guardado en el taller
            $keep = array_intersect_key($out, array_flip(array('len', 'wid', 'hei', 'volt', 'minAh', 'maxAh', 'ctrl', 'charge', 'notes')));
            if ($keep != $t) {
                Db::getInstance()->update('ecorepair_model', array('battery' => pSQL(json_encode($keep))), 'id_ecorepair_model = ' . (int) $idModel);
            }
        }

        return $out;
    }

    /** Guarda en el taller y, si el modelo existe en el configurador, también allí (voltaje, Ah, conectores y notas). */
    public static function saveBattery($idModel, array $d)
    {
        $m = self::model($idModel);
        if (!$m) {
            return array('ok' => false, 'error' => 'Elige un modelo.');
        }
        $num = function ($k, $max) use ($d) {
            $v = isset($d[$k]) ? str_replace(',', '.', trim((string) $d[$k])) : '';

            return $v === '' ? '' : max(0, min($max, round((float) $v, 1)));
        };
        $clean = array(
            'len' => $num('len', 2000), 'wid' => $num('wid', 2000), 'hei' => $num('hei', 2000),
            'volt' => $num('volt', 200), 'minAh' => $num('minAh', 200), 'maxAh' => $num('maxAh', 200),
            'ctrl' => array_values(array_filter(array_map('strval', isset($d['ctrl']) && is_array($d['ctrl']) ? $d['ctrl'] : array()), function ($x) { return preg_match('/^[a-z0-9_]{1,24}$/', $x); })),
            'charge' => array_values(array_filter(array_map('strval', isset($d['charge']) && is_array($d['charge']) ? $d['charge'] : array()), function ($x) { return preg_match('/^[a-z0-9_]{1,24}$/', $x); })),
            'notes' => Tools::substr(trim(strip_tags(isset($d['notes']) ? (string) $d['notes'] : '')), 0, 800),
        );
        if ($clean['minAh'] !== '' && $clean['maxAh'] !== '' && $clean['minAh'] > $clean['maxAh']) {
            return array('ok' => false, 'error' => 'Los Ah mínimos no pueden ser más que los máximos.');
        }
        Db::getInstance()->update('ecorepair_model', array('battery' => pSQL(json_encode($clean))), 'id_ecorepair_model = ' . (int) $idModel);
        $synced = 0;
        $skipped = array();
        $mid = self::batOn() ? self::batModelId($m) : '';
        if ($mid !== '' && $clean['volt'] !== '' && $clean['minAh'] !== '' && $clean['maxAh'] !== '') {
            foreach (self::profiles() as $pr) {
                $p = $pr['p'];
                $volts = array_map('floatval', isset($p['volts']) ? $p['volts'] : array());
                if (!in_array((float) $clean['volt'], $volts, true)) {
                    $skipped[] = isset($p['title']) ? $p['title'] : ('producto ' . (int) $pr['row']['id_product']);
                    continue;
                }
                $p['modelRules'] = isset($p['modelRules']) && is_array($p['modelRules']) ? $p['modelRules'] : array();
                $r = isset($p['modelRules'][$mid]) ? $p['modelRules'][$mid] : array('enabled' => true, 'batteries' => array(), 'options' => array());
                $r['originalVoltage'] = (float) $clean['volt'];
                $r['minAh'] = (float) $clean['minAh'];
                $r['maxAh'] = (float) $clean['maxAh'];
                if (!isset($r['batteries']) || !is_array($r['batteries'])) {
                    $r['batteries'] = array();
                }
                if (!isset($r['options']) || !is_array($r['options'])) {
                    $r['options'] = array();
                }
                if ($clean['ctrl']) {
                    $r['options']['controller'] = $clean['ctrl'];
                }
                if ($clean['charge']) {
                    $r['options']['charge'] = $clean['charge'];
                }
                if ($clean['notes'] !== '') {
                    $r['fitNotes'] = $clean['notes'];
                }
                $p['modelRules'][$mid] = $r;
                Db::getInstance()->update('epw_battery_profile', array('config_json' => pSQL(json_encode($p)), 'date_upd' => date('Y-m-d H:i:s')),
                    'id_product = ' . (int) $pr['row']['id_product'] . ' AND id_shop = ' . (int) $pr['row']['id_shop']);
                ++$synced;
            }
        }

        return array('ok' => true, 'synced' => $synced, 'skipped' => $skipped, 'battery' => self::battery($idModel), 'model_id' => $mid);
    }

    /**
     * Añade un conector nuevo (toma de carga o hacia la controladora) al configurador de baterías, con su foto.
     * kind: 'charge' | 'controller'. file: $_FILES['image'].
     */
    public static function addConnector($kind, $label, $info, $file)
    {
        if (!self::batOn()) {
            return array('ok' => false, 'error' => 'El configurador de baterías no está instalado.');
        }
        $kind = $kind === 'controller' ? 'controller' : 'charge';
        $label = Tools::substr(trim(strip_tags((string) $label)), 0, 60);
        $info = Tools::substr(trim(strip_tags((string) $info)), 0, 300);
        if ($label === '') {
            return array('ok' => false, 'error' => 'Escribe el nombre del conector (por ejemplo «GX12 · 3 contactos»).');
        }
        if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            return array('ok' => false, 'error' => 'Añade una foto del conector: el configurador la enseña al cliente.');
        }
        if ((int) $file['size'] > 2097152) {
            return array('ok' => false, 'error' => 'La foto es demasiado grande (máximo 2 MB).');
        }
        $bytes = Tools::file_get_contents($file['tmp_name']);
        $info2 = $bytes ? @getimagesizefromstring($bytes) : false;
        $ext = array('image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp');
        if (!$info2 || !isset($ext[$info2['mime']])) {
            return array('ok' => false, 'error' => 'La foto tiene que ser JPG, PNG o WEBP.');
        }
        $dir = _PS_MODULE_DIR_ . 'epwbatteryconfigurator/uploads/';
        if (!is_dir($dir) || !is_writable($dir)) {
            return array('ok' => false, 'error' => 'No se puede guardar la foto en el configurador de baterías.');
        }
        $name = hash('sha256', $bytes) . '.' . $ext[$info2['mime']];
        if (file_put_contents($dir . $name, $bytes) === false) {
            return array('ok' => false, 'error' => 'No se pudo guardar la foto.');
        }
        $url = Context::getContext()->link->getMediaLink(__PS_BASE_URI__ . 'modules/epwbatteryconfigurator/uploads/' . $name);
        $id = trim(preg_replace('/[^a-z0-9]+/', '_', Tools::strtolower(Tools::replaceAccentedChars($label))), '_');
        $id = Tools::substr($id !== '' ? $id : 'conector', 0, 20);
        $done = 0;
        foreach (self::profiles() as $pr) {
            $p = $pr['p'];
            if (empty($p['fields']) || !is_array($p['fields'])) {
                continue;
            }
            foreach ($p['fields'] as &$f) {
                if (!isset($f['id']) || $f['id'] !== $kind) {
                    continue;
                }
                $ids = array_map(function ($o) { return $o['id']; }, $f['options']);
                $oid = $id;
                $n = 2;
                while (in_array($oid, $ids, true)) {
                    $oid = Tools::substr($id, 0, 17) . '_' . $n++;
                }
                $new = array('id' => $oid, 'label' => $label, 'price' => 0, 'info' => $info, 'image' => $url);
                // «No lo sé / otro» se queda el último
                $last = end($f['options']);
                if ($last && $last['id'] === 'unknown') {
                    array_splice($f['options'], count($f['options']) - 1, 0, array($new));
                } else {
                    $f['options'][] = $new;
                }
                ++$done;
            }
            unset($f);
            Db::getInstance()->update('epw_battery_profile', array('config_json' => pSQL(json_encode($p)), 'date_upd' => date('Y-m-d H:i:s')),
                'id_product = ' . (int) $pr['row']['id_product'] . ' AND id_shop = ' . (int) $pr['row']['id_shop']);
        }
        if (!$done) {
            return array('ok' => false, 'error' => 'Ningún producto del configurador tiene esa pregunta de conector.');
        }

        return array('ok' => true, 'id' => $id, 'image' => $url);
    }

    /* ======================== epwcentro (proveedores) ======================== */

    public static function epwcOn()
    {
        return self::has('epwc_item') && self::has('epwc_source');
    }

    /** Ofertas de proveedor para productos de la tienda: id_product => [{source, cost, availability, quantity, url, id_item, group}] */
    public static function supplierInfo(array $productIds)
    {
        $productIds = array_values(array_unique(array_filter(array_map('intval', $productIds))));
        if (!$productIds || !self::epwcOn()) {
            return array();
        }
        $p = _DB_PREFIX_;
        $rows = Db::getInstance()->executeS("SELECT i.id_item, i.id_product, i.cost, i.availability, i.quantity, i.url, i.group_key, s.name AS source
            FROM `{$p}epwc_item` i INNER JOIN `{$p}epwc_source` s ON s.id_source = i.id_source AND s.kind = 'supplier' AND s.enabled = 1
            WHERE i.id_shop = " . (int) Context::getContext()->shop->id . ' AND i.availability != \'gone\' AND i.id_product IN (' . implode(',', $productIds) . ')
            ORDER BY (i.availability = \'in\') DESC, i.cost ASC') ?: array();
        $out = array();
        foreach ($rows as $r) {
            $out[(int) $r['id_product']][] = array('id_item' => (int) $r['id_item'], 'source' => $r['source'], 'cost' => $r['cost'] === null ? null : round((float) $r['cost'], 2),
                'availability' => $r['availability'], 'quantity' => $r['quantity'] === null ? null : (int) $r['quantity'], 'url' => $r['url'], 'group' => $r['group_key']);
        }

        return $out;
    }

    /** Añade el producto a la cesta de pedidos al proveedor de epwcentro. */
    public static function addToSupplierCart($idProduct, $qty)
    {
        $info = self::supplierInfo(array($idProduct));
        if (empty($info[(int) $idProduct])) {
            return array('ok' => false, 'error' => 'Este producto no tiene proveedor en epwcentro.');
        }
        $best = $info[(int) $idProduct][0];
        $shop = (int) Context::getContext()->shop->id;
        $mod = Module::getInstanceByName('epwcentro');
        if ($mod && class_exists('EpwcOrders') && $best['group'] !== '') {
            try {
                EpwcOrders::add($shop, $best['group'], $best['id_item'], (int) $qty);

                return array('ok' => true, 'source' => $best['source']);
            } catch (Exception $e) {
                // Si la cesta del módulo no lo acepta (variantes), se añade la línea directamente
            }
        }
        $db = Db::getInstance();
        $p = _DB_PREFIX_;
        $line = $db->getRow("SELECT id_line FROM `{$p}epwc_order_line` WHERE id_shop = {$shop} AND id_item = " . (int) $best['id_item']);
        if ($line) {
            $db->execute("UPDATE `{$p}epwc_order_line` SET qty = qty + " . max(1, (int) $qty) . ' WHERE id_line = ' . (int) $line['id_line']);
        } else {
            $db->insert('epwc_order_line', array('id_shop' => $shop, 'group_key' => pSQL($best['group']), 'id_item' => (int) $best['id_item'], 'qty' => max(1, (int) $qty), 'created_at' => date('Y-m-d H:i:s')));
        }

        return array('ok' => true, 'source' => $best['source']);
    }
}
