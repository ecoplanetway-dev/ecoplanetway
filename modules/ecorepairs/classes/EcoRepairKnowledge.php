<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Ficha técnica de marcas y modelos: códigos de error, menú y parámetros, y fallos poco comunes con su solución.
 * Lo de la marca vale para todos sus modelos; lo del modelo solo para él.
 */
class EcoRepairKnowledge
{
    /* ------------------------------------------------------------------ */
    /* Lectura                                                             */
    /* ------------------------------------------------------------------ */

    protected static function scopeWhere($idBrand, $idModel)
    {
        return '(id_ecorepair_brand = ' . (int) $idBrand . ' AND id_ecorepair_model IN (0, ' . (int) $idModel . '))';
    }

    public static function forModel($idBrand, $idModel)
    {
        $p = _DB_PREFIX_;
        $db = Db::getInstance();
        $w = self::scopeWhere($idBrand, $idModel);
        $codes = $db->executeS("SELECT * FROM `{$p}ecorepair_errcode` WHERE {$w} ORDER BY id_ecorepair_model DESC, LENGTH(code), code") ?: array();
        $params = $db->executeS("SELECT * FROM `{$p}ecorepair_param` WHERE {$w} ORDER BY id_ecorepair_model DESC, position, code") ?: array();
        $kb = $db->executeS("SELECT * FROM `{$p}ecorepair_knowledge` WHERE {$w} ORDER BY kind = 'menu' DESC, date_upd DESC") ?: array();

        // Si el modelo tiene su propio código, el de la marca con el mismo número no se repite
        $seen = array();
        $outCodes = array();
        foreach ($codes as $c) {
            $k = Tools::strtoupper($c['code']);
            if (isset($seen[$k])) {
                continue;
            }
            $seen[$k] = true;
            $outCodes[] = array('id' => (int) $c['id_ecorepair_errcode'], 'code' => $c['code'], 'title' => $c['title'], 'causes' => (string) $c['causes'],
                'parts' => $c['parts'], 'verified' => (int) $c['verified'], 'scope' => (int) $c['id_ecorepair_model'] ? 'model' : 'brand');
        }
        $outParams = array();
        foreach ($params as $pr) {
            $outParams[] = array('id' => (int) $pr['id_ecorepair_param'], 'code' => $pr['code'], 'name' => $pr['name'], 'default_value' => $pr['default_value'],
                'notes' => (string) $pr['notes'], 'scope' => (int) $pr['id_ecorepair_model'] ? 'model' : 'brand');
        }
        $menu = array();
        $faults = array();
        foreach ($kb as $k) {
            $item = array('id' => (int) $k['id_ecorepair_knowledge'], 'kind' => $k['kind'], 'title' => $k['title'], 'body' => (string) $k['body'],
                'id_ecorepair' => (int) $k['id_ecorepair'], 'author' => $k['author'], 'date' => $k['date_upd'], 'scope' => (int) $k['id_ecorepair_model'] ? 'model' : 'brand');
            if ($k['kind'] === 'menu') {
                $menu[] = $item;
            } else {
                $faults[] = $item;
            }
        }

        return array('codes' => $outCodes, 'params' => $outParams, 'menu' => $menu, 'faults' => $faults);
    }

    public static function counts($idBrand, $idModel)
    {
        $k = self::forModel($idBrand, $idModel);

        return array('codes' => count($k['codes']), 'params' => count($k['params']), 'faults' => count($k['faults']), 'menu' => count($k['menu']));
    }

    /* ------------------------------------------------------------------ */
    /* Cambios                                                             */
    /* ------------------------------------------------------------------ */

    protected static function txt($v, $max)
    {
        return Tools::substr(trim(strip_tags((string) $v)), 0, $max);
    }

    /**
     * Guarda (crea o edita) un elemento. $type: code | param | fault | menu.
     */
    public static function save($type, $id, $idBrand, $idModel, array $d, $author)
    {
        $idBrand = (int) $idBrand;
        $idModel = (int) $idModel;
        if (!$idBrand) {
            return array('ok' => false, 'error' => 'Falta la marca.');
        }
        if ($idModel) {
            $ok = (int) Db::getInstance()->getValue('SELECT 1 FROM `' . _DB_PREFIX_ . 'ecorepair_model` WHERE id_ecorepair_model = ' . $idModel . ' AND id_ecorepair_brand = ' . $idBrand);
            if (!$ok) {
                return array('ok' => false, 'error' => 'El modelo no es de esa marca.');
            }
        }
        $now = date('Y-m-d H:i:s');
        $db = Db::getInstance();
        if ($type === 'code') {
            $code = Tools::strtoupper(self::txt(isset($d['code']) ? $d['code'] : '', 16));
            $title = self::txt(isset($d['title']) ? $d['title'] : '', 160);
            if ($code === '' || $title === '') {
                return array('ok' => false, 'error' => 'Escribe el código y qué significa.');
            }
            $row = array('code' => pSQL($code), 'title' => pSQL($title), 'causes' => pSQL(self::txt(isset($d['causes']) ? $d['causes'] : '', 3000)),
                'parts' => pSQL(self::txt(isset($d['parts']) ? $d['parts'] : '', 255)), 'verified' => !empty($d['verified']) ? 1 : 0, 'date_upd' => $now);
            $table = 'ecorepair_errcode';
        } elseif ($type === 'param') {
            $code = Tools::strtoupper(self::txt(isset($d['code']) ? $d['code'] : '', 16));
            $name = self::txt(isset($d['name']) ? $d['name'] : '', 160);
            if ($code === '' || $name === '') {
                return array('ok' => false, 'error' => 'Escribe el parámetro (P01…) y para qué sirve.');
            }
            $row = array('code' => pSQL($code), 'name' => pSQL($name), 'default_value' => pSQL(self::txt(isset($d['default_value']) ? $d['default_value'] : '', 64)),
                'notes' => pSQL(self::txt(isset($d['notes']) ? $d['notes'] : '', 3000)), 'position' => (int) preg_replace('/\D/', '', $code), 'date_upd' => $now);
            $table = 'ecorepair_param';
        } elseif ($type === 'fault' || $type === 'menu') {
            $title = self::txt(isset($d['title']) ? $d['title'] : '', 160);
            $body = self::txt(isset($d['body']) ? $d['body'] : '', 8000);
            if ($title === '' || $body === '') {
                return array('ok' => false, 'error' => $type === 'menu' ? 'Escribe cómo se entra al menú.' : 'Escribe el fallo y la solución.');
            }
            $row = array('kind' => $type, 'title' => pSQL($title), 'body' => pSQL($body), 'date_upd' => $now);
            if (!$id) {
                $row['id_ecorepair'] = isset($d['id_ecorepair']) ? (int) $d['id_ecorepair'] : 0;
                $row['author'] = pSQL(Tools::substr((string) $author, 0, 64));
            }
            $table = 'ecorepair_knowledge';
        } else {
            return array('ok' => false, 'error' => 'Tipo no válido.');
        }
        if ($id) {
            $db->update($table, $row, 'id_' . $table . ' = ' . (int) $id);
        } else {
            $row['id_ecorepair_brand'] = $idBrand;
            $row['id_ecorepair_model'] = $idModel;
            if ($table !== 'ecorepair_param') {
                $row['date_add'] = $now;
            }
            $db->insert($table, $row);
            $id = (int) $db->Insert_ID();
        }

        return array('ok' => true, 'id' => (int) $id);
    }

    public static function delete($type, $id)
    {
        $tables = array('code' => 'ecorepair_errcode', 'param' => 'ecorepair_param', 'fault' => 'ecorepair_knowledge', 'menu' => 'ecorepair_knowledge');
        if (!isset($tables[$type])) {
            return array('ok' => false, 'error' => 'Tipo no válido.');
        }
        Db::getInstance()->delete($tables[$type], 'id_' . $tables[$type] . ' = ' . (int) $id);

        return array('ok' => true);
    }

    /* ------------------------------------------------------------------ */
    /* Datos iniciales (por revisar en el taller)                          */
    /* ------------------------------------------------------------------ */

    protected static function brandId($name)
    {
        return (int) Db::getInstance()->getValue('SELECT b.id_ecorepair_brand FROM `' . _DB_PREFIX_ . 'ecorepair_brand` b
            INNER JOIN `' . _DB_PREFIX_ . 'ecorepair_category` c ON c.id_ecorepair_category = b.id_ecorepair_category
            WHERE LOWER(b.name) = \'' . pSQL(Tools::strtolower($name)) . '\' ORDER BY c.position ASC');
    }

    /**
     * Códigos habituales de Xiaomi y Segway-Ninebot y parámetros típicos de las pantallas tipo S866 (Kugoo y similares).
     * Se cargan como «por revisar»: confirmadlos o corregidlos en la ficha de la marca.
     */
    public static function seed()
    {
        $common = array(
            array('10', 'Fallo de comunicación entre pantalla (dashboard) y controladora', 'Cable de datos del manillar pellizcado o mojado, conector suelto, pantalla o controladora averiada.', 'Cable de datos, pantalla, controladora'),
            array('11', 'Fallo de corriente en la fase A del motor', 'Cable de fase dañado, conector quemado, motor o controladora (MOSFET) averiados.', 'Cable motor, controladora'),
            array('12', 'Fallo de corriente en la fase B del motor', 'Cable de fase dañado, conector quemado, motor o controladora (MOSFET) averiados.', 'Cable motor, controladora'),
            array('13', 'Fallo de corriente en la fase C del motor', 'Cable de fase dañado, conector quemado, motor o controladora (MOSFET) averiados.', 'Cable motor, controladora'),
            array('14', 'Acelerador fuera de posición de reposo o averiado', 'Acelerador pegado o mojado, sensor hall del acelerador, cable dañado.', 'Acelerador'),
            array('15', 'Maneta de freno fuera de posición o averiada', 'Sensor de la maneta de freno, maneta doblada, cable dañado.', 'Maneta de freno'),
            array('18', 'Fallo en los sensores hall del motor', 'Cable de sensores del motor dañado o mojado, sensor hall averiado.', 'Cable de sensores, sensores hall, motor'),
            array('21', 'Fallo de comunicación con la BMS (batería)', 'Conector de batería suelto o mojado, BMS averiada, cable de comunicación de la batería.', 'BMS, conector batería'),
            array('22', 'Contraseña de la BMS incorrecta', 'BMS no original o cambiada, batería de otro modelo.', 'BMS'),
            array('23', 'Número de serie de la BMS incorrecto o por defecto', 'BMS cambiada sin programar.', 'BMS'),
            array('24', 'Tensión de alimentación anormal', 'Batería no compatible, cargador incorrecto, BMS dañada.', 'Batería, BMS'),
            array('28', 'Fallo de MOSFET (lado alto) en la controladora', 'Controladora quemada por agua o sobrecarga.', 'Controladora'),
            array('29', 'Fallo de MOSFET (lado bajo) en la controladora', 'Controladora quemada por agua o sobrecarga.', 'Controladora'),
            array('35', 'Número de serie de la controladora no válido', 'Controladora cambiada sin programar.', 'Controladora'),
            array('39', 'Fallo del sensor de temperatura de la batería', 'Sensor NTC de la batería o BMS dañados.', 'BMS'),
            array('40', 'Sobretemperatura de la controladora', 'Uso con mucha carga o calor, controladora dañada. Dejar enfriar y revisar.', 'Controladora'),
        );
        $now = date('Y-m-d H:i:s');
        $db = Db::getInstance();
        foreach (array('Xiaomi', 'Segway') as $brand) {
            $id = self::brandId($brand);
            if (!$id || (int) $db->getValue('SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'ecorepair_errcode` WHERE id_ecorepair_brand = ' . $id)) {
                continue;
            }
            foreach ($common as $c) {
                $db->insert('ecorepair_errcode', array('id_ecorepair_brand' => $id, 'id_ecorepair_model' => 0, 'code' => pSQL($c[0]), 'title' => pSQL($c[1]),
                    'causes' => pSQL($c[2]), 'parts' => pSQL($c[3]), 'verified' => 0, 'date_add' => $now, 'date_upd' => $now));
            }
        }

        $params = array(
            array('P01', 'Brillo de la pantalla', '3', '1 (bajo) a 3 (alto).'),
            array('P02', 'Unidad de velocidad', '0', '0 = km/h, 1 = mph.'),
            array('P03', 'Tensión de la batería', '48', '24 / 36 / 48 / 52 / 60 V según el patinete.'),
            array('P04', 'Apagado automático (minutos)', '5', '0 = nunca.'),
            array('P05', 'Contraseña de encendido', '0', 'Normalmente desactivada.'),
            array('P06', 'Tamaño de rueda (pulgadas)', '10', 'Afecta a la velocidad mostrada.'),
            array('P07', 'Imanes del motor', '30', 'Afecta a la velocidad mostrada.'),
            array('P08', 'Límite de velocidad', '100', 'En porcentaje o km/h según la pantalla. Respetar el límite legal de 25 km/h.'),
            array('P09', 'Arranque sin impulso (zero start)', '1', '0 = hay que impulsar con el pie, 1 = arranca desde parado.'),
            array('P10', 'Modo de conducción', '2', '0 = asistido, 1 = acelerador, 2 = ambos.'),
            array('P11', 'Sensibilidad de la asistencia', '2', ''),
            array('P12', 'Fuerza de arranque', '3', ''),
            array('P13', 'Imanes del sensor de pedaleo', '0', 'Solo en algunos modelos.'),
            array('P14', 'Límite de corriente de la controladora', '20', 'En amperios.'),
            array('P15', 'Tensión de corte por batería baja', '41', 'En voltios.'),
            array('P16', 'Borrar cuentakilómetros (ODO)', '', 'Mantener pulsado para poner a cero.'),
        );
        $id = self::brandId('Kugoo');
        if ($id && !(int) $db->getValue('SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'ecorepair_param` WHERE id_ecorepair_brand = ' . $id)) {
            foreach ($params as $i => $pr) {
                $db->insert('ecorepair_param', array('id_ecorepair_brand' => $id, 'id_ecorepair_model' => 0, 'code' => pSQL($pr[0]), 'name' => pSQL($pr[1]),
                    'default_value' => pSQL($pr[2]), 'notes' => pSQL($pr[3]), 'position' => $i + 1, 'date_upd' => $now));
            }
            $db->insert('ecorepair_knowledge', array('id_ecorepair_brand' => $id, 'id_ecorepair_model' => 0, 'kind' => 'menu',
                'title' => 'Entrar en el menú de parámetros (pantallas tipo S866)', 'body' => pSQL("Con el patinete encendido y parado, mantener pulsados a la vez «+» y «−» unos 2 segundos hasta que aparezca P01.\nCon «+» y «−» se cambia de parámetro; con el botón de encendido se entra y se guarda.\nPOR REVISAR: confirmad en el taller para cada modelo."),
                'id_ecorepair' => 0, 'author' => 'Carga inicial', 'date_add' => $now, 'date_upd' => $now));
        }
    }
}
