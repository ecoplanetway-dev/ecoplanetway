<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Códigos de error recopilados de manuales y webs de servicio técnico (noviembre de 2026).
 * Cada entrada lleva su fuente. Todo entra como «Por revisar» hasta que el taller lo confirme.
 * Solo se añaden los códigos que falten: nunca se pisa lo que se haya editado a mano.
 *
 * Formato: array(categoría, marca, modelo o '' para toda la marca, código, qué significa, qué revisar, piezas, fuente)
 */
class EcoRepairKnowledgeData
{
    const VERSION = 2;

    public static function codes()
    {
        $p = 'Patinete';
        $b = 'Bicicleta eléctrica';
        $seg = 'Tabla de códigos Ninebot Max G30 (Bike Scooter City) y guías de servicio';
        $xi = 'Soporte oficial Xiaomi (mi.com)';
        $ce = 'Manual de instrucciones Cecotec';
        $kk = 'Blog oficial KuKirin';
        $niu = 'Guía de códigos NIU (distribuidor)';

        return array(
            // ---------- Xiaomi (confirmados en la web oficial) ----------
            array($p, 'Xiaomi', '', '10', 'Fallo de comunicación entre pantalla y controladora', 'Revisar el cable de datos del manillar (pellizcado, mojado o suelto) y sus conectores. Si sigue, pantalla o controladora.', 'Cable de datos, pantalla, controladora', $xi),
            array($p, 'Xiaomi', '', '14', 'Fallo del acelerador', 'El acelerador no vuelve a cero o está averiado (también suena 1 pitido largo y 4 cortos). Xiaomi indica cambiar el acelerador.', 'Acelerador', $xi),
            array($p, 'Xiaomi', '', '15', 'Fallo de la maneta de freno', 'El motor no empuja al acelerar. Revisar el sensor de la maneta de freno y su cable.', 'Maneta de freno', $xi),
            array($p, 'Xiaomi', '', '18', 'Fallo de los sensores hall del motor', 'El motor no empuja al acelerar. Revisar el cable de sensores del motor y los sensores hall.', 'Sensores hall, cable motor, motor', $xi),

            // ---------- Segway-Ninebot ----------
            array($p, 'Segway', '', '26', 'Error al guardar en la memoria (flash) de la controladora', 'Revisar la controladora.', 'Controladora', $seg),
            array($p, 'Segway', '', '27', 'Contraseña de la controladora incorrecta', 'Controladora cambiada sin programar o no original. Normalmente hay que cambiar la controladora.', 'Controladora', $seg),
            array($p, 'Segway', '', '31', 'Error de salto de programa en la controladora', 'Revisar o reprogramar la controladora.', 'Controladora', $seg),
            array($p, 'Segway', '', '36', 'Fallo de conexión o carga de la batería externa', 'Revisar el conector y el cableado de carga de la batería externa.', 'Cableado batería externa', $seg),
            array($p, 'Segway', '', '43', 'Contraseña de la batería externa incorrecta', 'Batería externa no original o sin programar. Suele haber que cambiarla.', 'Batería externa', $seg),
            array($p, 'Segway', '', '47', 'Fallo de comunicación de la BMS interna', 'Revisar conectores de la batería interna y la BMS.', 'BMS', 'Guías de servicio (pantallas Ninebot)'),
            array($p, 'Segway', '', '48', 'Fallo de comunicación de la BMS externa', 'Revisar la batería externa, su conector y su BMS.', 'BMS batería externa', 'Guías de servicio (pantallas Ninebot)'),

            // ---------- NIU ----------
            array($p, 'NIU', '', '10', 'Motor bloqueado', 'Revisar que la rueda gire libre, el motor y la controladora.', 'Motor, controladora', $niu),
            array($p, 'NIU', '', '11', 'Pérdida de fase del motor', 'Revisar los cables de fase del motor y sus conectores.', 'Cable motor, motor, controladora', $niu),
            array($p, 'NIU', '', '12', 'Fallo de los sensores hall del motor', 'Revisar el cable de sensores y los sensores hall.', 'Sensores hall, motor', $niu),
            array($p, 'NIU', '', '31', 'MOSFET de la batería dañado', 'Fallo interno de la batería o BMS.', 'BMS, batería', $niu),
            array($p, 'NIU', '', '35', 'Sobretemperatura de la batería', 'Parar y dejar enfriar. Si se repite, revisar la batería.', 'Batería', $niu),
            array($p, 'NIU', '', '40', 'Sobrecarga de la batería', 'Aviso: usar el patinete hasta gastar algo de batería. Revisar el cargador si se repite.', 'Cargador', $niu),
            array($p, 'NIU', '', '41', 'Batería demasiado descargada', 'Cargar la batería. Si no recupera, revisar la batería.', 'Batería', $niu),

            // ---------- KuKirin (blog oficial) ----------
            array($p, 'Kukirin', '', 'E0', 'Motor bloqueado', 'Revisar que la rueda gire libre, cables de fase y motor.', 'Motor', $kk),
            array($p, 'Kukirin', '', 'E1', 'Sobretensión de la batería', 'Revisar el cargador y la batería.', 'Cargador, batería', $kk),
            array($p, 'Kukirin', '', 'E2', 'Baja tensión de la batería', 'Cargar. Si sigue, revisar la batería y la BMS.', 'Batería', $kk),
            array($p, 'Kukirin', '', 'E3', 'Fallo de la controladora', 'Revisar la controladora y sus conexiones.', 'Controladora', $kk),
            array($p, 'Kukirin', '', 'E4', 'Fallo del acelerador', 'Revisar el acelerador y su cable.', 'Acelerador', $kk),
            array($p, 'Kukirin', '', 'E5', 'Fallo del freno', 'Revisar las manetas de freno (sensores) y sus cables.', 'Maneta de freno', $kk),
            array($p, 'Kukirin', '', 'E6', 'Fallo de comunicación serie (pantalla-controladora)', 'Revisar el cable de datos entre pantalla y controladora.', 'Cable de datos, pantalla', $kk),
            array($p, 'Kukirin', '', 'E7', 'Fallo de los sensores hall', 'Revisar el cable de sensores del motor y los sensores hall.', 'Sensores hall, motor', $kk),
            array($p, 'Kukirin', '', 'E9', 'Sobretemperatura de la controladora', 'Apagar, dejar enfriar y volver a encender. Si se repite, revisar la controladora.', 'Controladora', $kk),
            array($p, 'Kukirin', 'G2 Pro', 'E-001', 'Fallo de los sensores hall', 'Revisar el cable de sensores del motor y los sensores hall.', 'Sensores hall, motor', 'Soporte KuKirin (G2 Pro / G2 Max)'),
            array($p, 'Kukirin', 'G2 Pro', 'E-009', 'Sobretemperatura de la controladora', 'Apagar, dejar enfriar y volver a encender.', 'Controladora', 'Soporte KuKirin (G2 Pro / G2 Max)'),
            array($p, 'Kukirin', 'G2 Max', 'E-001', 'Fallo de los sensores hall', 'Revisar el cable de sensores del motor y los sensores hall.', 'Sensores hall, motor', 'Soporte KuKirin (G2 Pro / G2 Max)'),
            array($p, 'Kukirin', 'G2 Max', 'E-009', 'Sobretemperatura de la controladora', 'Apagar, dejar enfriar y volver a encender.', 'Controladora', 'Soporte KuKirin (G2 Pro / G2 Max)'),

            // ---------- Kugoo (pantallas antiguas: las fuentes no coinciden) ----------
            array($p, 'Kugoo', '', '1', 'Fallo del motor', 'Revisar motor, cables de fase y sensores. OJO: los códigos de Kugoo cambian según la controladora.', 'Motor', 'Guía de códigos Kugoo (S1, M4, G2)'),
            array($p, 'Kugoo', '', '2', 'Fallo del acelerador', 'Revisar el acelerador y su cable.', 'Acelerador', 'Guía de códigos Kugoo (S1, M4, G2)'),
            array($p, 'Kugoo', '', '3', 'Fallo de la controladora', 'Revisar la controladora.', 'Controladora', 'Guía de códigos Kugoo (S1, M4, G2)'),
            array($p, 'Kugoo', '', '4', 'Fallo de la maneta de freno', 'Revisar los sensores de freno.', 'Maneta de freno', 'Guía de códigos Kugoo (S1, M4, G2)'),
            array($p, 'Kugoo', '', '5', 'Protección por baja tensión', 'Cargar la batería; si sigue, revisar batería y BMS.', 'Batería', 'Guía de códigos Kugoo (S1, M4, G2)'),
            array($p, 'Kugoo', '', '6', 'Fallo de comunicación pantalla-controladora', 'Revisar el cable de datos.', 'Cable de datos, pantalla', 'Guía de códigos Kugoo (S1, M4, G2)'),
            array($p, 'Kugoo', '', '7', 'Fallo de comunicación pantalla-controladora', 'Revisar el cable de datos.', 'Cable de datos, pantalla', 'Guía de códigos Kugoo (S1, M4, G2)'),
            array($p, 'Kugoo', '', '12', 'Fallo de comunicación con la BMS', 'Revisar el conector de la batería y la BMS.', 'BMS', 'Guía de códigos Kugoo (S1, M4, G2)'),

            // ---------- Cecotec Bongo (cada serie tiene su tabla) ----------
            array($p, 'Cecotec', 'Bongo D20', 'E0', 'Protección por sobretemperatura', 'Dejar enfriar.', '', $ce . ' Bongo D20'),
            array($p, 'Cecotec', 'Bongo D20', 'E1', 'Fallo del motor', 'Revisar motor y cables.', 'Motor', $ce . ' Bongo D20'),
            array($p, 'Cecotec', 'Bongo D20', 'E2', 'Fallo de fase del motor', 'Revisar cables de fase y conectores.', 'Cable motor, controladora', $ce . ' Bongo D20'),
            array($p, 'Cecotec', 'Bongo D20', 'E3', 'Fallo del freno', 'Revisar sensores de freno.', 'Maneta de freno', $ce . ' Bongo D20'),
            array($p, 'Cecotec', 'Bongo D20', 'E4', 'Fallo del acelerador', 'Revisar el acelerador.', 'Acelerador', $ce . ' Bongo D20'),
            array($p, 'Cecotec', 'Bongo D20', 'E5', 'Protección por baja tensión', 'Cargar; si sigue, revisar batería.', 'Batería', $ce . ' Bongo D20'),
            array($p, 'Cecotec', 'Bongo D30', 'E5', 'Protección por baja tensión', 'Cargar; si sigue, revisar batería.', 'Batería', $ce . ' Bongo D30 (lista parcial)'),
            array($p, 'Cecotec', 'Bongo D30', 'E6', 'Fallo de comunicación entre controladora y pantalla', 'Revisar el cable de datos.', 'Cable de datos, pantalla', $ce . ' Bongo D30 (lista parcial)'),
            array($p, 'Cecotec', 'Bongo X65', 'E0', 'Fallo de comunicación', 'Revisar el cable de datos y conectores.', 'Cable de datos', $ce . ' Bongo X65'),
            array($p, 'Cecotec', 'Bongo X65', 'E1', 'Fallo del acelerador', 'Revisar el acelerador.', 'Acelerador', $ce . ' Bongo X65'),
            array($p, 'Cecotec', 'Bongo X65', 'E2', 'Fallo del freno eléctrico', 'Revisar sensores de freno.', 'Maneta de freno', $ce . ' Bongo X65'),
            array($p, 'Cecotec', 'Bongo X65', 'E3', 'Fallo del sensor hall del motor', 'Revisar cable de sensores y hall.', 'Sensores hall, motor', $ce . ' Bongo X65'),
            array($p, 'Cecotec', 'Bongo X65', 'E4', 'Fallo del motor', 'Revisar motor y cables de fase.', 'Motor', $ce . ' Bongo X65'),
            array($p, 'Cecotec', 'Bongo X65', 'E5', 'Fallo de la pantalla', 'Revisar la pantalla y su cable.', 'Pantalla', $ce . ' Bongo X65'),
            array($p, 'Cecotec', 'Bongo X65', 'E6', 'Fallo del cableado de la batería', 'Revisar cables y conectores de la batería.', 'Cableado batería', $ce . ' Bongo X65'),
            array($p, 'Cecotec', 'Bongo Serie M', 'E3', 'Fallo del sensor hall del motor', 'Revisar cable de sensores y hall.', 'Sensores hall, motor', $ce . ' Bongo M20 (lista parcial)'),
            array($p, 'Cecotec', 'Bongo Serie M', 'E4', 'Fallo del motor', 'Revisar motor y cables de fase.', 'Motor', $ce . ' Bongo M20 (lista parcial)'),
            array($p, 'Cecotec', 'Bongo Serie M', 'E5', 'Fallo de la pantalla', 'Revisar la pantalla y su cable.', 'Pantalla', $ce . ' Bongo M20 (lista parcial)'),
            array($p, 'Cecotec', 'Bongo M40 XL', 'E0', 'Fallo de comunicación', 'Revisar el cable de datos y conectores.', 'Cable de datos', $ce . ' Bongo M40 XL Connected'),
            array($p, 'Cecotec', 'Bongo M40 XL', 'E1', 'Fallo del acelerador', 'Revisar el acelerador.', 'Acelerador', $ce . ' Bongo M40 XL Connected'),
            array($p, 'Cecotec', 'Bongo M40 XL', 'E2', 'Fallo del freno eléctrico', 'Revisar sensores de freno.', 'Maneta de freno', $ce . ' Bongo M40 XL Connected'),
            array($p, 'Cecotec', 'Bongo M40 XL', 'E3', 'Fallo del sensor hall del motor', 'Revisar cable de sensores y hall.', 'Sensores hall, motor', $ce . ' Bongo M40 XL Connected'),
            array($p, 'Cecotec', 'Bongo M40 XL', 'E4', 'Fallo del motor', 'Revisar motor y cables de fase.', 'Motor', $ce . ' Bongo M40 XL Connected'),
            array($p, 'Cecotec', 'Bongo M40 XL', 'E5', 'Fallo de la controladora', 'Revisar la controladora.', 'Controladora', $ce . ' Bongo M40 XL Connected'),
            array($p, 'Cecotec', 'Bongo X45', 'E4', 'Fallo del motor', 'Revisar motor y cables de fase.', 'Motor', $ce . ' Bongo X45 Sport Connected (lista parcial)'),
            array($p, 'Cecotec', 'Bongo X45', 'E5', 'Fallo de la controladora', 'Revisar la controladora.', 'Controladora', $ce . ' Bongo X45 Sport Connected (lista parcial)'),
            array($p, 'Cecotec', 'Bongo X45', 'E6', 'Fallo de comunicación de la batería', 'Revisar conector de batería y BMS.', 'BMS', $ce . ' Bongo X45 Sport Connected (lista parcial)'),
            array($p, 'Cecotec', 'Bongo Serie S', 'E1', 'Error del motor', 'Revisar motor y cables.', 'Motor', $ce . ' Bongo Serie S'),
            array($p, 'Cecotec', 'Bongo Serie S', 'E2', 'Error de señal de la controladora', 'Revisar controladora y cable de datos.', 'Controladora', $ce . ' Bongo Serie S'),
            array($p, 'Cecotec', 'Bongo Serie S', 'E3', 'Error del acelerador', 'Revisar el acelerador.', 'Acelerador', $ce . ' Bongo Serie S'),
            array($p, 'Cecotec', 'Bongo Serie S', 'E4', 'Error de MOSFET de la controladora', 'Controladora dañada.', 'Controladora', $ce . ' Bongo Serie S'),
            array($p, 'Cecotec', 'Bongo Serie S', 'E5', 'Error de corriente de fase', 'Revisar cables de fase y motor.', 'Cable motor, controladora', $ce . ' Bongo Serie S'),
            array($p, 'Cecotec', 'Bongo Serie S', 'E6', 'Error de corriente media', 'Revisar controladora y motor.', 'Controladora', $ce . ' Bongo Serie S'),
            array($p, 'Cecotec', 'Bongo Serie S', 'E7', 'Error de tensión de la batería', 'Revisar batería y cargador.', 'Batería', $ce . ' Bongo Serie S'),
            array($p, 'Cecotec', 'Bongo Serie S', 'E8', 'Error del freno del manillar', 'Revisar sensores de freno.', 'Maneta de freno', $ce . ' Bongo Serie S'),

            // ---------- Motores de bicicleta eléctrica ----------
            array($b, 'Bafang (motor)', '', '04', 'Fallo del acelerador', 'Revisar el acelerador y su conector.', 'Acelerador', 'Guías de códigos Bafang (Upway, manuales Bafang)'),
            array($b, 'Bafang (motor)', '', '05', 'El acelerador no vuelve a su posición', 'Soltar el acelerador; revisar que no esté pegado o mojado.', 'Acelerador', 'Guías de códigos Bafang (Upway, manuales Bafang)'),
            array($b, 'Bafang (motor)', '', '09', 'Fallo de fase (bobinado) del motor', 'Revisar cables de fase del motor; también la controladora.', 'Motor, controladora', 'Guías de códigos Bafang (Upway, manuales Bafang)'),
            array($b, 'Bafang (motor)', '', '11', 'Fallo del sensor de temperatura del motor', 'Revisar conexiones (sueltas, corroídas o quemadas).', 'Motor', 'Guías de códigos Bafang (Upway, manuales Bafang)'),
            array($b, 'Bafang (motor)', '', '12', 'Fallo del sensor de corriente de la controladora', 'Suele ser la controladora (a veces tras actualizar el software).', 'Controladora', 'Guías de códigos Bafang (Upway, manuales Bafang)'),
            array($b, 'Bafang (motor)', '', '21', 'Fallo del sensor de velocidad', 'Revisar el imán del radio y la posición del sensor de velocidad.', 'Sensor de velocidad', 'Guías de códigos Bafang (Upway, manuales Bafang)'),
            array($b, 'Bafang (motor)', '', '30', 'Fallo de comunicación pantalla-controladora', 'Revisar el cable y los conectores entre pantalla y motor. «30H» (pantalla se apaga) apunta a alimentación.', 'Cable, pantalla, controladora', 'Guías de códigos Bafang (Upway, manuales Bafang)'),
            array($b, 'Bafang (motor)', '', '36', 'Fallo de la botonera (circuito del teclado)', 'Revisar o cambiar la botonera de la pantalla.', 'Botonera', 'Guías de códigos Bafang (Upway, manuales Bafang)'),
            array($b, 'Shimano Steps (motor)', '', 'E010', 'Error del sistema / unidad motriz', 'Apagar y encender. Si sigue, diagnóstico con E-TUBE.', 'Unidad motriz', 'Guías de códigos Shimano STEPS'),
            array($b, 'Shimano Steps (motor)', '', 'E012', 'Fallo del sensor de par', 'Encender sin apoyar los pies en los pedales. Si sigue, unidad motriz.', 'Unidad motriz', 'Guías de códigos Shimano STEPS'),
            array($b, 'Shimano Steps (motor)', '', 'E013', 'Firmware de la unidad motriz anómalo', 'Actualizar o reinstalar el firmware con E-TUBE.', '', 'Guías de códigos Shimano STEPS'),
            array($b, 'Shimano Steps (motor)', '', 'E014', 'Error del sensor de velocidad', 'Puede estar montado en mal sitio. Revisar posición del sensor e imán.', 'Sensor de velocidad', 'Guías de códigos Shimano STEPS'),
            array($b, 'Shimano Steps (motor)', '', 'W010', 'Temperatura alta de la unidad motriz', 'Dejar enfriar.', '', 'Guías de códigos Shimano STEPS'),
            array($b, 'Shimano Steps (motor)', '', 'W011', 'No llega la señal de velocidad', 'Revisar el sensor de velocidad, el imán y las conexiones.', 'Sensor de velocidad', 'Guías de códigos Shimano STEPS'),
            array($b, 'Shimano Steps (motor)', '', 'W013', 'No se completó la inicialización del sensor de par', 'Encender sin apoyar los pies en los pedales.', '', 'Guías de códigos Shimano STEPS'),
            array($b, 'Shimano Steps (motor)', '', 'W103', 'Inicialización del sensor de par (EP8)', 'Igual que W013: encender sin pisar los pedales.', '', 'Guías de códigos Shimano STEPS'),
            array($b, 'Shimano Steps (motor)', '', 'W020', 'Temperatura de la batería fuera de rango', 'Dejar que la batería vuelva a temperatura normal.', '', 'Guías de códigos Shimano STEPS'),
            array($b, 'Shimano Steps (motor)', '', 'W032', 'Cambio electrónico montado donde va uno mecánico', 'Revisar la configuración del cambio (afecta al modo WALK).', '', 'Guías de códigos Shimano STEPS'),
            array($b, 'Bosch (motor)', '', '410', 'Botones del mando atascados', 'Revisar/limpiar el mando.', 'Mando', 'Guías de códigos Bosch eBike'),
            array($b, 'Bosch (motor)', '', '418', 'Botones bloqueados', 'Revisar el mando.', 'Mando', 'Guías de códigos Bosch eBike'),
            array($b, 'Bosch (motor)', '', '422', 'Error de comunicación con el motor', 'Revisar cableado y conectores entre pantalla y motor.', 'Cableado', 'Guías de códigos Bosch eBike'),
            array($b, 'Bosch (motor)', '', '431', 'Versión de software incompatible', 'Actualizar con Bosch DiagnosticTool.', '', 'Guías de códigos Bosch eBike'),
            array($b, 'Bosch (motor)', '', '500', 'Error interno de la unidad motriz', 'Reiniciar; si sigue, diagnóstico con DiagnosticTool.', 'Unidad motriz', 'Guías de códigos Bosch eBike'),
            array($b, 'Bosch (motor)', '', '530', 'Error de comunicación con la batería', 'Apagar, quitar la batería y volver a ponerla. Revisar contactos.', 'Batería', 'Guías de códigos Bosch eBike'),
            array($b, 'Bosch (motor)', '', '540', 'Error interno de software de la unidad motriz (sin asistencia)', 'Actualizar/diagnosticar con DiagnosticTool.', 'Unidad motriz', 'Guías de códigos Bosch eBike'),
            array($b, 'Bosch (motor)', '', '550', 'Fallo de la luz delantera', 'Revisar la luz y su cable.', 'Luz', 'Guías de códigos Bosch eBike'),
            array($b, 'Bosch (motor)', '', '620', 'Fallo del cargador', 'Revisar o cambiar el cargador.', 'Cargador', 'Guías de códigos Bosch eBike'),
            array($b, 'Bosch (motor)', '', '640', 'Fallo de supervisión de la batería', 'Revisar la batería.', 'Batería', 'Guías de códigos Bosch eBike'),
        );
    }

    /** Códigos de Xiaomi confirmados en la web oficial: se marcan como revisados si seguían «por revisar». */
    public static function confirmed()
    {
        return array(array('Xiaomi', array('10', '14', '15', '18')));
    }

    /**
     * Carga lo que falte. Crea la marca o el modelo si no existen (por ejemplo «Bosch (motor)» o «Bongo M40 XL»).
     * Devuelve cuántos códigos se añadieron.
     */
    public static function import()
    {
        $db = Db::getInstance();
        $p = _DB_PREFIX_;
        $now = date('Y-m-d H:i:s');
        $added = 0;
        foreach (self::codes() as $row) {
            list($cat, $brand, $model, $code, $title, $causes, $parts, $source) = $row;
            $idCat = (int) $db->getValue("SELECT id_ecorepair_category FROM `{$p}ecorepair_category` WHERE LOWER(name) = '" . pSQL(Tools::strtolower($cat)) . "'");
            if (!$idCat) {
                continue;
            }
            $idBrand = (int) $db->getValue("SELECT id_ecorepair_brand FROM `{$p}ecorepair_brand` WHERE id_ecorepair_category = {$idCat} AND LOWER(name) = '" . pSQL(Tools::strtolower($brand)) . "'");
            if (!$idBrand) {
                $db->insert('ecorepair_brand', array('id_ecorepair_category' => $idCat, 'name' => pSQL($brand), 'active' => 1));
                $idBrand = (int) $db->Insert_ID();
            }
            $idModel = 0;
            if ($model !== '') {
                $idModel = (int) $db->getValue("SELECT id_ecorepair_model FROM `{$p}ecorepair_model` WHERE id_ecorepair_brand = {$idBrand} AND LOWER(name) = '" . pSQL(Tools::strtolower($model)) . "'");
                if (!$idModel) {
                    $db->insert('ecorepair_model', array('id_ecorepair_brand' => $idBrand, 'name' => pSQL($model), 'image' => '', 'active' => 1));
                    $idModel = (int) $db->Insert_ID();
                }
            }
            $exists = (int) $db->getValue("SELECT 1 FROM `{$p}ecorepair_errcode` WHERE id_ecorepair_brand = {$idBrand} AND id_ecorepair_model = {$idModel}
                AND UPPER(code) = '" . pSQL(Tools::strtoupper($code)) . "'");
            if ($exists) {
                continue;
            }
            $db->insert('ecorepair_errcode', array(
                'id_ecorepair_brand' => $idBrand,
                'id_ecorepair_model' => $idModel,
                'code' => pSQL($code),
                'title' => pSQL($title),
                'causes' => pSQL($causes . "\nFuente: " . $source),
                'parts' => pSQL($parts),
                'verified' => 0,
                'date_add' => $now,
                'date_upd' => $now,
            ));
            ++$added;
        }
        foreach (self::confirmed() as $c) {
            $idBrand = (int) $db->getValue("SELECT b.id_ecorepair_brand FROM `{$p}ecorepair_brand` b INNER JOIN `{$p}ecorepair_category` c ON c.id_ecorepair_category = b.id_ecorepair_category
                WHERE LOWER(b.name) = '" . pSQL(Tools::strtolower($c[0])) . "' ORDER BY c.position ASC");
            if ($idBrand) {
                $db->execute("UPDATE `{$p}ecorepair_errcode` SET verified = 1, causes = CONCAT(IFNULL(causes, ''), '\nConfirmado en el soporte oficial de Xiaomi (mi.com).')
                    WHERE id_ecorepair_brand = {$idBrand} AND id_ecorepair_model = 0 AND verified = 0 AND code IN ('" . implode("','", array_map('pSQL', $c[1])) . "')");
            }
        }

        return $added;
    }
}
