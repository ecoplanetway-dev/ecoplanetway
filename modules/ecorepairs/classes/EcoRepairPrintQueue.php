<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Cola de impresión: desde el móvil se pide imprimir (resguardo o etiqueta del patín)
 * y el ordenador de la tienda, con el panel del taller abierto, abre la ventana de imprimir.
 */
class EcoRepairPrintQueue
{
    const KEY = 'ECOREPAIRS_PRINT_Q';
    const TTL = 900; // 15 minutos: lo que no se imprime en ese tiempo se descarta

    protected static function load()
    {
        $q = json_decode((string) Configuration::getGlobalValue(self::KEY), true);
        $q = is_array($q) ? $q : array();
        $now = time();

        return array_values(array_filter($q, function ($j) use ($now) {
            return is_array($j) && isset($j['t']) && $now - (int) $j['t'] < EcoRepairPrintQueue::TTL;
        }));
    }

    protected static function save(array $q)
    {
        Configuration::updateGlobalValue(self::KEY, json_encode(array_slice(array_values($q), -30)));
    }

    public static function add(array $repair, $type, $who)
    {
        $type = $type === 'tag' ? 'tag' : 'receipt';
        $q = self::load();
        $q[] = array('id' => bin2hex(random_bytes(6)), 'rid' => (int) $repair['id_ecorepair'], 'shop' => (int) $repair['id_shop'],
            'ref' => (string) $repair['reference'], 'type' => $type, 'who' => Tools::substr((string) $who, 0, 64), 't' => time());
        self::save($q);
        EcoRepairLog::add((int) $repair['id_ecorepair'], 0, 'note', ($type === 'tag' ? 'Etiqueta del patín' : 'Resguardo del cliente') . ' mandado a imprimir desde el móvil · ' . $who);

        return array('ok' => true);
    }

    /** Trabajos pendientes de esta tienda; se quitan de la cola al entregarlos (los imprime el primer ordenador que los recoge). */
    public static function take($idShop)
    {
        $q = self::load();
        $mine = array();
        $rest = array();
        foreach ($q as $j) {
            if ((int) $j['shop'] === (int) $idShop) {
                $mine[] = $j;
            } else {
                $rest[] = $j;
            }
        }
        if ($mine) {
            self::save($rest);
        }

        return $mine;
    }
}
