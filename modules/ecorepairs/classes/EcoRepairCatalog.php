<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Categorías, marcas, modelos y averías frecuentes.
 */
class EcoRepairCatalog
{
    public static function icons()
    {
        return array(
            'scooter' => 'Patinete',
            'bike' => 'Bicicleta',
            'battery' => 'Batería',
            'moto' => 'Moto',
            'other' => 'Otro',
        );
    }

    /**
     * type => array(tabla, columna padre, tabla padre)
     */
    protected static function types()
    {
        return array(
            'category' => array('ecorepair_category', null, null),
            'brand' => array('ecorepair_brand', 'id_ecorepair_category', 'ecorepair_category'),
            'model' => array('ecorepair_model', 'id_ecorepair_brand', 'ecorepair_brand'),
            'fault' => array('ecorepair_fault', 'id_ecorepair_category', 'ecorepair_category'),
        );
    }

    public static function tree($onlyActive = true)
    {
        $p = _DB_PREFIX_;
        $db = Db::getInstance();
        $act = $onlyActive ? ' WHERE active = 1' : '';

        $cats = $db->executeS("SELECT * FROM `{$p}ecorepair_category`{$act} ORDER BY position ASC, id_ecorepair_category ASC") ?: array();
        $brands = $db->executeS("SELECT * FROM `{$p}ecorepair_brand`{$act} ORDER BY name ASC") ?: array();
        $models = $db->executeS("SELECT * FROM `{$p}ecorepair_model`{$act} ORDER BY name ASC") ?: array();
        $faults = $db->executeS("SELECT * FROM `{$p}ecorepair_fault`{$act} ORDER BY id_ecorepair_fault ASC") ?: array();

        $modelsByBrand = array();
        foreach ($models as $m) {
            $modelsByBrand[(int) $m['id_ecorepair_brand']][] = array(
                'id' => (int) $m['id_ecorepair_model'],
                'name' => $m['name'],
                'image' => isset($m['image']) ? (string) $m['image'] : '',
                'active' => (int) $m['active'],
            );
        }
        $brandsByCat = array();
        foreach ($brands as $b) {
            $id = (int) $b['id_ecorepair_brand'];
            $brandsByCat[(int) $b['id_ecorepair_category']][] = array(
                'id' => $id,
                'name' => $b['name'],
                'active' => (int) $b['active'],
                'models' => isset($modelsByBrand[$id]) ? $modelsByBrand[$id] : array(),
            );
        }
        $faultsByCat = array();
        foreach ($faults as $f) {
            $faultsByCat[(int) $f['id_ecorepair_category']][] = array(
                'id' => (int) $f['id_ecorepair_fault'],
                'name' => $f['name'],
                'active' => (int) $f['active'],
            );
        }

        $out = array();
        foreach ($cats as $c) {
            $id = (int) $c['id_ecorepair_category'];
            $out[] = array(
                'id' => $id,
                'name' => $c['name'],
                'icon' => $c['icon'],
                'active' => (int) $c['active'],
                'brands' => isset($brandsByCat[$id]) ? $brandsByCat[$id] : array(),
                'faults' => isset($faultsByCat[$id]) ? $faultsByCat[$id] : array(),
            );
        }

        return $out;
    }

    public static function cleanName($name, $max = 64)
    {
        $name = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $name)));
        if ($name === '' || Tools::strlen($name) > $max || !Validate::isGenericName($name)) {
            return false;
        }

        return $name;
    }

    /**
     * Añade un elemento. Si ya existe uno con el mismo nombre (sin distinguir mayúsculas)
     * lo reactiva y devuelve su id.
     */
    public static function add($type, $idParent, $name, $icon = 'scooter')
    {
        $types = self::types();
        if (!isset($types[$type])) {
            return array('ok' => false, 'error' => 'Tipo no válido.');
        }
        list($table, $parentCol, $parentTable) = $types[$type];
        $name = self::cleanName($name, $type === 'category' ? 64 : 96);
        if ($name === false) {
            return array('ok' => false, 'error' => 'Escribe un nombre válido (máx. 64 caracteres, sin < > = { }).');
        }
        $db = Db::getInstance();
        $p = _DB_PREFIX_;
        $where = 'LOWER(name) = \'' . pSQL(Tools::strtolower($name)) . '\'';
        if ($parentCol) {
            $idParent = (int) $idParent;
            $exists = (int) $db->getValue("SELECT 1 FROM `{$p}{$parentTable}` WHERE `id_{$parentTable}` = " . $idParent);
            if (!$exists) {
                return array('ok' => false, 'error' => 'El elemento padre no existe.');
            }
            $where .= " AND `{$parentCol}` = " . $idParent;
        }
        $idCol = 'id_' . $table;
        $existing = (int) $db->getValue("SELECT `{$idCol}` FROM `{$p}{$table}` WHERE {$where}");
        if ($existing) {
            $db->update($table, array('active' => 1), "`{$idCol}` = " . $existing);
            $stored = (string) $db->getValue("SELECT name FROM `{$p}{$table}` WHERE `{$idCol}` = " . $existing);

            return array('ok' => true, 'id' => $existing, 'name' => $stored !== '' ? $stored : $name, 'existed' => true);
        }

        $row = array('name' => pSQL($name), 'active' => 1);
        if ($parentCol) {
            $row[$parentCol] = (int) $idParent;
        }
        if ($type === 'category') {
            $icons = self::icons();
            $row['icon'] = pSQL(isset($icons[$icon]) ? $icon : 'other');
            $row['position'] = (int) $db->getValue("SELECT IFNULL(MAX(position), 0) + 1 FROM `{$p}ecorepair_category`");
        }
        if (!$db->insert($table, $row)) {
            return array('ok' => false, 'error' => 'No se pudo guardar.');
        }

        return array('ok' => true, 'id' => (int) $db->Insert_ID(), 'name' => $name);
    }

    public static function rename($type, $id, $name)
    {
        $types = self::types();
        if (!isset($types[$type])) {
            return array('ok' => false, 'error' => 'Tipo no válido.');
        }
        $table = $types[$type][0];
        $name = self::cleanName($name, $type === 'category' ? 64 : 96);
        if ($name === false) {
            return array('ok' => false, 'error' => 'Escribe un nombre válido.');
        }
        Db::getInstance()->update($table, array('name' => pSQL($name)), '`id_' . $table . '` = ' . (int) $id);

        return array('ok' => true, 'name' => $name);
    }

    public static function setActive($type, $id, $active)
    {
        $types = self::types();
        if (!isset($types[$type])) {
            return array('ok' => false, 'error' => 'Tipo no válido.');
        }
        $table = $types[$type][0];
        Db::getInstance()->update($table, array('active' => $active ? 1 : 0), '`id_' . $table . '` = ' . (int) $id);

        return array('ok' => true);
    }

    /**
     * Foto del modelo: nombre de archivo propio o URL https externa. Vacío la quita.
     */
    public static function setModelImage($id, $value)
    {
        $value = trim((string) $value);
        if ($value !== '' && !preg_match('/^[a-f0-9]{32}\.(webp|jpg)$/', $value)
            && (!preg_match('#^https://#i', $value) || Tools::strlen($value) > 255 || !Validate::isAbsoluteUrl($value))) {
            return array('ok' => false, 'error' => 'La dirección de la imagen no es válida (tiene que empezar por https://).');
        }
        $db = Db::getInstance();
        $old = (string) $db->getValue('SELECT image FROM `' . _DB_PREFIX_ . 'ecorepair_model` WHERE id_ecorepair_model = ' . (int) $id);
        $db->update('ecorepair_model', array('image' => pSQL($value)), 'id_ecorepair_model = ' . (int) $id);
        if ($old !== '' && $old !== $value) {
            EcoRepairPhoto::deleteModelImage($old);
        }

        return array('ok' => true);
    }

    public static function setIcon($id, $icon)
    {
        $icons = self::icons();
        if (!isset($icons[$icon])) {
            return array('ok' => false, 'error' => 'Icono no válido.');
        }
        Db::getInstance()->update('ecorepair_category', array('icon' => pSQL($icon)), 'id_ecorepair_category = ' . (int) $id);

        return array('ok' => true);
    }

    /**
     * Comprueba que marca y modelo pertenecen a la categoría y devuelve los nombres.
     * Marca y modelo pueden ser 0 (sin especificar).
     */
    public static function deviceNames($idCategory, $idBrand, $idModel)
    {
        $p = _DB_PREFIX_;
        $db = Db::getInstance();
        $cat = $db->getValue("SELECT name FROM `{$p}ecorepair_category` WHERE id_ecorepair_category = " . (int) $idCategory);
        if (!$cat) {
            return false;
        }
        $brand = '';
        $model = '';
        if ((int) $idBrand) {
            $brand = $db->getValue("SELECT name FROM `{$p}ecorepair_brand` WHERE id_ecorepair_brand = " . (int) $idBrand
                . ' AND id_ecorepair_category = ' . (int) $idCategory);
            if (!$brand) {
                return false;
            }
        }
        if ((int) $idModel) {
            if (!(int) $idBrand) {
                return false;
            }
            $model = $db->getValue("SELECT name FROM `{$p}ecorepair_model` WHERE id_ecorepair_model = " . (int) $idModel
                . ' AND id_ecorepair_brand = ' . (int) $idBrand);
            if (!$model) {
                return false;
            }
        }
        $device = trim($brand . ' ' . $model);

        return array(
            'category' => $cat,
            'brand' => $brand,
            'model' => $model,
            'device_name' => $device !== '' ? $device : $cat,
        );
    }

    /**
     * Listas sencillas de la configuración (una por línea).
     */
    public static function configList($key)
    {
        $lines = preg_split('/\r\n|\r|\n/', (string) Configuration::get($key));
        $out = array();
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line !== '') {
                $out[] = $line;
            }
        }

        return array_values(array_unique($out));
    }
}
