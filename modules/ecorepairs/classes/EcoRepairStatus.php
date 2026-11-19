<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

class EcoRepairStatus
{
    const RECEIVED = 'received';
    const DIAGNOSIS = 'diagnosis';
    const QUOTE = 'quote';
    const REPAIR = 'repair';
    const READY = 'ready';
    const DELIVERED = 'delivered';
    const CANCELLED = 'cancelled';

    /**
     * Orden del flujo normal (Cancelado va aparte).
     */
    public static function flow()
    {
        return array(self::RECEIVED, self::DIAGNOSIS, self::QUOTE, self::REPAIR, self::READY, self::DELIVERED);
    }

    /**
     * Columnas del tablero.
     */
    public static function board()
    {
        return array(self::RECEIVED, self::DIAGNOSIS, self::QUOTE, self::REPAIR, self::READY);
    }

    public static function all()
    {
        return array(
            self::RECEIVED => array('name' => 'Recibido', 'color' => '#8B93A3'),
            self::DIAGNOSIS => array('name' => 'Diagnóstico', 'color' => '#E0A100'),
            self::QUOTE => array('name' => 'Presupuesto', 'color' => '#D2601A'),
            self::REPAIR => array('name' => 'En reparación', 'color' => '#1F6FD1'),
            self::READY => array('name' => 'Listo para recoger', 'color' => '#0B6E4B'),
            self::DELIVERED => array('name' => 'Entregado', 'color' => '#14161A'),
            self::CANCELLED => array('name' => 'Cancelado', 'color' => '#B42318'),
        );
    }

    public static function isValid($status)
    {
        $all = self::all();

        return is_string($status) && isset($all[$status]);
    }

    public static function name($status)
    {
        $all = self::all();

        return isset($all[$status]) ? $all[$status]['name'] : $status;
    }
}
