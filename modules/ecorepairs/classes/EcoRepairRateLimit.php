<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Límite sencillo de intentos por IP para las páginas públicas (enlace del presupuesto y seguimiento).
 * Guarda un contador por IP en la caché de PrestaShop.
 */
class EcoRepairRateLimit
{
    protected static function file($bucket)
    {
        $dir = _PS_CACHE_DIR_ . 'ecorepairs/';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        return $dir . 'rl_' . preg_replace('/[^a-z]/', '', $bucket) . '_' . md5(Tools::getRemoteAddr() . _COOKIE_KEY_) . '.json';
    }

    protected static function data($bucket, $window)
    {
        $file = self::file($bucket);
        $data = is_file($file) ? json_decode((string) @file_get_contents($file), true) : null;
        if (!is_array($data) || !isset($data['t'], $data['n']) || $data['t'] < time() - $window) {
            $data = array('t' => time(), 'n' => 0);
        }

        return $data;
    }

    public static function blocked($bucket, $max, $window = 600)
    {
        $d = self::data($bucket, $window);

        return $d['n'] >= $max;
    }

    public static function hit($bucket, $window = 600)
    {
        $d = self::data($bucket, $window);
        ++$d['n'];
        @file_put_contents(self::file($bucket), json_encode($d), LOCK_EX);
    }
}
