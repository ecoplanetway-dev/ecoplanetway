<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

class EcoRepairInstaller
{
    public static function installDb()
    {
        $p = _DB_PREFIX_;
        $engine = _MYSQL_ENGINE_;
        $sql = array();

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair` (
            `id_ecorepair` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `reference` VARCHAR(16) NOT NULL DEFAULT '',
            `id_shop` INT UNSIGNED NOT NULL DEFAULT 1,
            `id_customer` INT UNSIGNED NOT NULL,
            `id_address_invoice` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_employee_tech` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_employee_add` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_category` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_brand` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_model` INT UNSIGNED NOT NULL DEFAULT 0,
            `device_name` VARCHAR(160) NOT NULL DEFAULT '',
            `serial` VARCHAR(64) NOT NULL DEFAULT '',
            `km` INT UNSIGNED NULL DEFAULT NULL,
            `color` VARCHAR(64) NOT NULL DEFAULT '',
            `fault_customer` TEXT NULL,
            `faults` TEXT NULL,
            `diagnosis` TEXT NULL,
            `accessories` TEXT NULL,
            `damages` TEXT NULL,
            `status` VARCHAR(16) NOT NULL DEFAULT 'received',
            `waiting_part` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            `urgent` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            `warranty` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            `eta_date` DATE NULL DEFAULT NULL,
            `tracking_code` VARCHAR(16) NOT NULL,
            `consent_rgpd` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            `consent_whatsapp` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            `id_order` INT UNSIGNED NOT NULL DEFAULT 0,
            `cancel_reason` VARCHAR(255) NOT NULL DEFAULT '',
            `id_parent_repair` INT UNSIGNED NOT NULL DEFAULT 0,
            `date_reminder` DATETIME NULL DEFAULT NULL,
            `date_status` DATETIME NOT NULL,
            `date_add` DATETIME NOT NULL,
            `date_upd` DATETIME NOT NULL,
            PRIMARY KEY (`id_ecorepair`),
            UNIQUE KEY `tracking_code` (`tracking_code`),
            KEY `status` (`status`),
            KEY `id_customer` (`id_customer`),
            KEY `serial` (`serial`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_category` (
            `id_ecorepair_category` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `name` VARCHAR(64) NOT NULL,
            `icon` VARCHAR(16) NOT NULL DEFAULT 'scooter',
            `position` INT UNSIGNED NOT NULL DEFAULT 0,
            `active` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
            PRIMARY KEY (`id_ecorepair_category`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_brand` (
            `id_ecorepair_brand` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_ecorepair_category` INT UNSIGNED NOT NULL,
            `name` VARCHAR(64) NOT NULL,
            `active` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
            PRIMARY KEY (`id_ecorepair_brand`),
            KEY `id_ecorepair_category` (`id_ecorepair_category`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_model` (
            `id_ecorepair_model` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_ecorepair_brand` INT UNSIGNED NOT NULL,
            `name` VARCHAR(96) NOT NULL,
            `image` VARCHAR(255) NOT NULL DEFAULT '',
            `active` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
            PRIMARY KEY (`id_ecorepair_model`),
            KEY `id_ecorepair_brand` (`id_ecorepair_brand`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_fault` (
            `id_ecorepair_fault` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_ecorepair_category` INT UNSIGNED NOT NULL,
            `name` VARCHAR(96) NOT NULL,
            `active` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
            PRIMARY KEY (`id_ecorepair_fault`),
            KEY `id_ecorepair_category` (`id_ecorepair_category`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_photo` (
            `id_ecorepair_photo` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_ecorepair` INT UNSIGNED NOT NULL,
            `type` VARCHAR(16) NOT NULL DEFAULT 'entry',
            `file` VARCHAR(64) NOT NULL,
            `id_employee` INT UNSIGNED NOT NULL DEFAULT 0,
            `date_add` DATETIME NOT NULL,
            PRIMARY KEY (`id_ecorepair_photo`),
            KEY `id_ecorepair` (`id_ecorepair`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_log` (
            `id_ecorepair_log` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_ecorepair` INT UNSIGNED NOT NULL,
            `id_employee` INT UNSIGNED NOT NULL DEFAULT 0,
            `action` VARCHAR(32) NOT NULL,
            `detail` TEXT NULL,
            `date_add` DATETIME NOT NULL,
            PRIMARY KEY (`id_ecorepair_log`),
            KEY `id_ecorepair` (`id_ecorepair`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_customer` (
            `id_customer` INT UNSIGNED NOT NULL,
            `phone` VARCHAR(32) NOT NULL DEFAULT '',
            `phone_norm` VARCHAR(32) NOT NULL DEFAULT '',
            `no_email` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            `consent_rgpd_date` DATETIME NULL DEFAULT NULL,
            `consent_whatsapp` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            `date_add` DATETIME NOT NULL,
            `date_upd` DATETIME NOT NULL,
            PRIMARY KEY (`id_customer`),
            KEY `phone_norm` (`phone_norm`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $db = Db::getInstance();
        foreach ($sql as $query) {
            if (!$db->execute($query)) {
                return false;
            }
        }

        return self::installQuoteDb();
    }

    const SCHEMA = '1.5.0';

    /**
     * Comprueba que las tablas y columnas de esta versión existen y crea lo que falte.
     * Así el módulo funciona aunque PrestaShop no haya ejecutado los scripts de actualización
     * (por ejemplo, al subir el zip encima de una versión anterior).
     */
    public static function ensureSchema()
    {
        if (Configuration::get('ECOREPAIRS_SCHEMA') === self::SCHEMA) {
            return true;
        }
        $ok = self::installDb()
            && self::addModelImageColumn()
            && self::addColumn('ecorepair_quote_line', 'discount', 'DECIMAL(20,6) NOT NULL DEFAULT 0')
            && self::addColumn('ecorepair', 'id_parent_repair', 'INT UNSIGNED NOT NULL DEFAULT 0')
            && self::addColumn('ecorepair', 'date_reminder', 'DATETIME NULL DEFAULT NULL')
            && self::installConfig()
            && EcoRepairPhoto::ensureStorage();
        if ($ok) {
            EcoRepairCatalogSeed::importMissing();
            $module = Module::getInstanceByName('ecorepairs');
            if ($module && !$module->isRegisteredInHook('moduleRoutes')) {
                $module->registerHook('moduleRoutes');
            }
            Configuration::updateValue('ECOREPAIRS_SCHEMA', self::SCHEMA);
        }

        return $ok;
    }

    /** Añade una columna si no existe (para versiones anteriores). */
    public static function addColumn($table, $column, $definition)
    {
        $db = Db::getInstance();
        if ($db->executeS('SHOW COLUMNS FROM `' . _DB_PREFIX_ . pSQL($table) . '` LIKE \'' . pSQL($column) . '\'')) {
            return true;
        }

        return $db->execute('ALTER TABLE `' . _DB_PREFIX_ . pSQL($table) . '` ADD `' . pSQL($column) . '` ' . $definition);
    }

    /**
     * 1.2.0: foto del modelo. Se añade la columna si la tabla viene de una versión anterior.
     */
    public static function addModelImageColumn()
    {
        $db = Db::getInstance();
        $cols = $db->executeS('SHOW COLUMNS FROM `' . _DB_PREFIX_ . 'ecorepair_model` LIKE \'image\'');
        if ($cols) {
            return true;
        }

        return $db->execute('ALTER TABLE `' . _DB_PREFIX_ . 'ecorepair_model` ADD `image` VARCHAR(255) NOT NULL DEFAULT \'\' AFTER `name`');
    }

    /**
     * Tablas de la versión 1.1.0: presupuestos y kits. También las usa upgrade/upgrade-1.1.0.php.
     */
    public static function installQuoteDb()
    {
        $p = _DB_PREFIX_;
        $engine = _MYSQL_ENGINE_;
        $sql = array();

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_quote` (
            `id_ecorepair_quote` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_ecorepair` INT UNSIGNED NOT NULL,
            `number` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
            `version` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
            `status` VARCHAR(12) NOT NULL DEFAULT 'draft',
            `token` VARCHAR(32) NOT NULL DEFAULT '',
            `notes` TEXT NULL,
            `total_tax_excl` DECIMAL(20,6) NOT NULL DEFAULT 0,
            `total_tax_incl` DECIMAL(20,6) NOT NULL DEFAULT 0,
            `warranty_amount` DECIMAL(20,6) NOT NULL DEFAULT 0,
            `channel` VARCHAR(8) NOT NULL DEFAULT '',
            `ip` VARCHAR(45) NOT NULL DEFAULT '',
            `answer_note` VARCHAR(255) NOT NULL DEFAULT '',
            `id_employee_add` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_employee_accept` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_photo_signature` INT UNSIGNED NOT NULL DEFAULT 0,
            `date_add` DATETIME NOT NULL,
            `date_upd` DATETIME NOT NULL,
            `date_sent` DATETIME NULL DEFAULT NULL,
            `date_expire` DATETIME NULL DEFAULT NULL,
            `date_answer` DATETIME NULL DEFAULT NULL,
            PRIMARY KEY (`id_ecorepair_quote`),
            KEY `id_ecorepair` (`id_ecorepair`),
            KEY `token` (`token`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_quote_line` (
            `id_ecorepair_quote_line` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_ecorepair_quote` INT UNSIGNED NOT NULL,
            `position` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
            `type` VARCHAR(8) NOT NULL DEFAULT 'part',
            `id_product` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_product_attribute` INT UNSIGNED NOT NULL DEFAULT 0,
            `name` VARCHAR(128) NOT NULL,
            `reference` VARCHAR(64) NOT NULL DEFAULT '',
            `qty` DECIMAL(10,2) NOT NULL DEFAULT 1,
            `unit_price_tax_excl` DECIMAL(20,6) NOT NULL DEFAULT 0,
            `tax_rate` DECIMAL(6,3) NOT NULL DEFAULT 21,
            `warranty` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            `discount` DECIMAL(20,6) NOT NULL DEFAULT 0,
            PRIMARY KEY (`id_ecorepair_quote_line`),
            KEY `id_ecorepair_quote` (`id_ecorepair_quote`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_payment` (
            `id_ecorepair_payment` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_ecorepair` INT UNSIGNED NOT NULL,
            `id_shop` INT UNSIGNED NOT NULL DEFAULT 1,
            `type` VARCHAR(12) NOT NULL DEFAULT 'final',
            `method` VARCHAR(12) NOT NULL DEFAULT 'cash',
            `amount` DECIMAL(20,6) NOT NULL DEFAULT 0,
            `id_employee` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_order` INT UNSIGNED NOT NULL DEFAULT 0,
            `date_add` DATETIME NOT NULL,
            PRIMARY KEY (`id_ecorepair_payment`),
            KEY `id_ecorepair` (`id_ecorepair`),
            KEY `date_add` (`date_add`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_message` (
            `id_ecorepair_message` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_ecorepair` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_ecorepair_request` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_customer` INT UNSIGNED NOT NULL DEFAULT 0,
            `channel` VARCHAR(12) NOT NULL DEFAULT 'whatsapp',
            `template` VARCHAR(32) NOT NULL DEFAULT '',
            `recipient` VARCHAR(128) NOT NULL DEFAULT '',
            `body` TEXT NULL,
            `id_employee` INT UNSIGNED NOT NULL DEFAULT 0,
            `date_add` DATETIME NOT NULL,
            PRIMARY KEY (`id_ecorepair_message`),
            KEY `id_ecorepair` (`id_ecorepair`),
            KEY `id_customer` (`id_customer`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_request` (
            `id_ecorepair_request` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_shop` INT UNSIGNED NOT NULL DEFAULT 1,
            `id_customer` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_ecorepair` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_product` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_product_attribute` INT UNSIGNED NOT NULL DEFAULT 0,
            `request` VARCHAR(255) NOT NULL,
            `for_device` VARCHAR(160) NOT NULL DEFAULT '',
            `qty` INT UNSIGNED NOT NULL DEFAULT 1,
            `supplier` VARCHAR(96) NOT NULL DEFAULT '',
            `price` DECIMAL(20,6) NOT NULL DEFAULT 0,
            `deposit` DECIMAL(20,6) NOT NULL DEFAULT 0,
            `notes` TEXT NULL,
            `status` VARCHAR(12) NOT NULL DEFAULT 'pending',
            `id_employee` INT UNSIGNED NOT NULL DEFAULT 0,
            `date_add` DATETIME NOT NULL,
            `date_upd` DATETIME NOT NULL,
            PRIMARY KEY (`id_ecorepair_request`),
            KEY `status` (`status`),
            KEY `id_customer` (`id_customer`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_kit` (
            `id_ecorepair_kit` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_ecorepair_category` INT UNSIGNED NOT NULL DEFAULT 0,
            `name` VARCHAR(96) NOT NULL,
            `active` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
            `date_add` DATETIME NOT NULL,
            `date_upd` DATETIME NOT NULL,
            PRIMARY KEY (`id_ecorepair_kit`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $sql[] = "CREATE TABLE IF NOT EXISTS `{$p}ecorepair_kit_line` (
            `id_ecorepair_kit_line` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_ecorepair_kit` INT UNSIGNED NOT NULL,
            `position` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
            `type` VARCHAR(8) NOT NULL DEFAULT 'part',
            `id_product` INT UNSIGNED NOT NULL DEFAULT 0,
            `id_product_attribute` INT UNSIGNED NOT NULL DEFAULT 0,
            `name` VARCHAR(128) NOT NULL,
            `reference` VARCHAR(64) NOT NULL DEFAULT '',
            `qty` DECIMAL(10,2) NOT NULL DEFAULT 1,
            `unit_price_tax_excl` DECIMAL(20,6) NOT NULL DEFAULT 0,
            `tax_rate` DECIMAL(6,3) NOT NULL DEFAULT 21,
            PRIMARY KEY (`id_ecorepair_kit_line`),
            KEY `id_ecorepair_kit` (`id_ecorepair_kit`)
        ) ENGINE={$engine} DEFAULT CHARSET=utf8";

        $db = Db::getInstance();
        foreach ($sql as $query) {
            if (!$db->execute($query)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Datos iniciales. Solo se cargan si el catálogo está vacío.
     */
    public static function seedCatalog()
    {
        $db = Db::getInstance();
        if ((int) $db->getValue('SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'ecorepair_category`') > 0) {
            return true;
        }

        $data = array(
            array('Patinete', 'scooter',
                array(
                    'Xiaomi' => array('Mi Pro 2', 'Scooter 4 Pro', 'Scooter 4', 'Essential', 'Scooter 3'),
                    'Segway' => array('Ninebot E25', 'Ninebot E45', 'Ninebot Max G30', 'Ninebot F40', 'Ninebot G2'),
                    'Cecotec' => array('Bongo Serie A', 'Bongo Serie D', 'Bongo Serie Z'),
                    'Kugoo' => array('Kirin M4', 'Kirin G2 Pro', 'Kirin S1 Pro'),
                    'Smartgyro' => array('Rockway', 'Xtreme Speedway', 'Ziro'),
                ),
                array('No enciende', 'Pinchazo', 'Frenos', 'Error en pantalla', 'Batería no carga', 'Ruido', 'Acelerador', 'Luces', 'Holgura en el plegado'),
            ),
            array('Bicicleta eléctrica', 'bike',
                array(
                    'Moma Bikes' => array('E-MTB 29', 'E-City 28'),
                    'Orbea' => array('Vibe H30', 'Kemen 30'),
                ),
                array('Pierde asistencia', 'Sensor de pedaleo', 'Frenos', 'Cambio', 'Batería no carga', 'Pinchazo', 'Pantalla'),
            ),
            array('Batería', 'battery',
                array(
                    'Segway' => array('36V 10Ah', '36V 15Ah'),
                    'Xiaomi' => array('36V 7,8Ah', '36V 12,8Ah'),
                    'Kugoo' => array('48V 13Ah'),
                ),
                array('No carga', 'Autonomía baja', 'Se apaga', 'Hinchada', 'BMS'),
            ),
            array('Moto eléctrica', 'moto',
                array(
                    'Silence' => array('S01'),
                    'Niu' => array('NQi GT'),
                ),
                array('No arranca', 'Batería', 'Frenos', 'Luces'),
            ),
        );

        $pos = 0;
        foreach ($data as $row) {
            list($name, $icon, $brands, $faults) = $row;
            $db->insert('ecorepair_category', array('name' => pSQL($name), 'icon' => pSQL($icon), 'position' => $pos++, 'active' => 1));
            $idCat = (int) $db->Insert_ID();
            foreach ($brands as $brand => $models) {
                $db->insert('ecorepair_brand', array('id_ecorepair_category' => $idCat, 'name' => pSQL($brand), 'active' => 1));
                $idBrand = (int) $db->Insert_ID();
                foreach ($models as $model) {
                    $db->insert('ecorepair_model', array('id_ecorepair_brand' => $idBrand, 'name' => pSQL($model), 'active' => 1));
                }
            }
            foreach ($faults as $fault) {
                $db->insert('ecorepair_fault', array('id_ecorepair_category' => $idCat, 'name' => pSQL($fault), 'active' => 1));
            }
        }

        return true;
    }

    public static function defaultConfig()
    {
        return array(
            'ECOREPAIRS_FIELD_PHONE' => 'req',
            'ECOREPAIRS_FIELD_EMAIL' => 'opt',
            'ECOREPAIRS_ACCESSORIES' => "Cargador\nLlave\nCandado\nBolsa\nSoporte de móvil",
            'ECOREPAIRS_DAMAGES' => "Arañazos\nGolpe en el manillar\nPantalla rota\nFalta un tapón\nNeumático gastado",
            'ECOREPAIRS_PRINT_FORMAT' => '80mm',
            'ECOREPAIRS_LABEL_SIZE' => '62x29',
            'ECOREPAIRS_LATE_DAYS' => '5',
            'ECOREPAIRS_PICKUP_DAYS' => '10',
            'ECOREPAIRS_CONDITIONS' => "El cliente deja el equipo para su diagnóstico. No se hará ninguna reparación con coste sin que acepte antes el presupuesto.\nConserve este resguardo: se pedirá al recoger el equipo.\nSus datos se usan solo para gestionar esta reparación y avisarle de su estado.",
            'ECOREPAIRS_LABOUR_RATE' => '35',
            'ECOREPAIRS_QUOTE_DAYS' => '15',
            'ECOREPAIRS_CARRIER' => '0',
            'ECOREPAIRS_WARRANTY_MONTHS' => '3',
            'ECOREPAIRS_TRACKING_DAYS' => '90',
            'ECOREPAIRS_EMAIL_STATUSES' => 'received,quote,ready',
            'ECOREPAIRS_EMAIL_QUOTE' => '1',
            'ECOREPAIRS_REMINDER_AUTO' => '0',
            'ECOREPAIRS_WA_TEMPLATES' => '',
            'ECOREPAIRS_QUOTE_CONDITIONS' => "Precios con IVA incluido.\nLas líneas marcadas como garantía no tienen coste para el cliente.\nSi al reparar aparece otra avería, se le enviará un presupuesto adicional antes de hacer nada.",
        );
    }

    /**
     * Solo crea los valores que no existan, para no pisar ajustes al reinstalar.
     */
    public static function installConfig()
    {
        foreach (self::defaultConfig() as $key => $value) {
            if (Configuration::get($key) === false) {
                Configuration::updateValue($key, $value);
            }
        }

        return true;
    }

    public static function installTabs($module)
    {
        $idSell = (int) Tab::getIdFromClassName('SELL');
        $idParent = self::createTab('AdminEcoRepairsParent', 'Taller', $idSell, $module, 'build');
        if (!$idParent) {
            return false;
        }

        return self::createTab('AdminEcoRepairs', 'Reparaciones', $idParent, $module)
            && self::createTab('AdminEcoRepairsSettings', 'Ajustes del taller', $idParent, $module);
    }

    protected static function createTab($className, $name, $idParent, $module, $icon = '')
    {
        $idTab = (int) Tab::getIdFromClassName($className);
        $tab = $idTab ? new Tab($idTab) : new Tab();
        $tab->class_name = $className;
        $tab->module = $module;
        $tab->id_parent = (int) $idParent;
        $tab->active = 1;
        if ($icon) {
            $tab->icon = $icon;
        }
        $tab->name = array();
        foreach (Language::getLanguages(false) as $lang) {
            $tab->name[(int) $lang['id_lang']] = $name;
        }

        return $tab->save() ? (int) $tab->id : false;
    }

    public static function uninstallTabs()
    {
        foreach (array('AdminEcoRepairs', 'AdminEcoRepairsSettings', 'AdminEcoRepairsParent') as $className) {
            $idTab = (int) Tab::getIdFromClassName($className);
            if ($idTab) {
                $tab = new Tab($idTab);
                $tab->delete();
            }
        }

        return true;
    }
}
