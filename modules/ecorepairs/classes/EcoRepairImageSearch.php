<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Buscar fotos de modelos en internet con la API de imágenes de Brave Search.
 * Lleva la cuenta de búsquedas del mes para no pasarse del crédito gratis.
 */
class EcoRepairImageSearch
{
    const ENDPOINT = 'https://api.search.brave.com/res/v1/images/search';

    public static function hasKey()
    {
        return trim((string) Configuration::getGlobalValue('ECOREPAIRS_IMG_KEY')) !== '';
    }

    /** Servicio: «serpapi» (Google Imágenes, 250 gratis/mes, por defecto) o «brave». */
    public static function provider()
    {
        return Configuration::getGlobalValue('ECOREPAIRS_IMG_PROVIDER') === 'brave' ? 'brave' : 'serpapi';
    }

    public static function saveProvider($p)
    {
        $p = $p === 'brave' ? 'brave' : 'serpapi';
        if ($p !== self::provider()) {
            Configuration::updateGlobalValue('ECOREPAIRS_IMG_PROVIDER', $p);
            Configuration::updateGlobalValue('ECOREPAIRS_IMG_LIMIT', $p === 'brave' ? 1000 : 250);
            Configuration::updateGlobalValue('ECOREPAIRS_IMG_USED', 0);
        }
    }

    public static function saveKey($key)
    {
        $key = trim(strip_tags((string) $key));
        if ($key !== '' && !preg_match('/^[A-Za-z0-9_\-]{10,128}$/', $key)) {
            return array('ok' => false, 'error' => 'La clave no parece válida. Cópiala entera desde el panel del servicio.');
        }
        Configuration::updateGlobalValue('ECOREPAIRS_IMG_KEY', $key);

        return array('ok' => true, 'usage' => self::usage());
    }

    protected static function cfg($k, $def)
    {
        $v = Configuration::getGlobalValue($k);

        return $v === false || $v === null || $v === '' ? $def : $v;
    }

    /** Día del mes en que se renuevan los créditos gratis (1-28). */
    protected static function renewDay()
    {
        return max(1, min(28, (int) self::cfg('ECOREPAIRS_IMG_DAY', 1)));
    }

    /** Inicio del periodo actual y del siguiente (hora de Madrid). */
    protected static function period()
    {
        $tz = new DateTimeZone('Europe/Madrid');
        $now = new DateTime('now', $tz);
        $day = self::renewDay();
        $start = new DateTime($now->format('Y-m-') . sprintf('%02d', $day) . ' 00:00:00', $tz);
        if ($start > $now) {
            $start->modify('-1 month');
        }
        $next = clone $start;
        $next->modify('+1 month');

        return array($start, $next, $now);
    }

    public static function usage()
    {
        list($start, $next, $now) = self::period();
        $key = $start->format('Y-m-d');
        $used = self::cfg('ECOREPAIRS_IMG_PERIOD', '') === $key ? (int) self::cfg('ECOREPAIRS_IMG_USED', 0) : 0;
        $limit = max(1, (int) self::cfg('ECOREPAIRS_IMG_LIMIT', self::provider() === 'brave' ? 1000 : 250));

        return array('provider' => self::provider(), 'hasKey' => self::hasKey(), 'used' => $used, 'limit' => $limit, 'left' => max(0, $limit - $used),
            'day' => self::renewDay(), 'renewAt' => $next->getTimestamp(), 'now' => $now->getTimestamp());
    }

    public static function saveSettings($limit, $day)
    {
        if ((int) $limit > 0) {
            Configuration::updateGlobalValue('ECOREPAIRS_IMG_LIMIT', max(1, min(100000, (int) $limit)));
        }
        Configuration::updateGlobalValue('ECOREPAIRS_IMG_DAY', max(1, min(28, (int) $day)));

        return array('ok' => true, 'usage' => self::usage());
    }

    protected static function count()
    {
        list($start) = self::period();
        $key = $start->format('Y-m-d');
        $used = self::cfg('ECOREPAIRS_IMG_PERIOD', '') === $key ? (int) self::cfg('ECOREPAIRS_IMG_USED', 0) : 0;
        Configuration::updateGlobalValue('ECOREPAIRS_IMG_PERIOD', $key);
        Configuration::updateGlobalValue('ECOREPAIRS_IMG_USED', $used + 1);
    }

    /** Fotos candidatas para un modelo del catálogo: patín de perfil, fondo blanco. */
    public static function forModel($idModel)
    {
        $m = Db::getInstance()->getRow('SELECT m.name, b.name AS brand, c.name AS category FROM `' . _DB_PREFIX_ . 'ecorepair_model` m
            INNER JOIN `' . _DB_PREFIX_ . 'ecorepair_brand` b ON b.id_ecorepair_brand = m.id_ecorepair_brand
            LEFT JOIN `' . _DB_PREFIX_ . 'ecorepair_category` c ON c.id_ecorepair_category = b.id_ecorepair_category
            WHERE m.id_ecorepair_model = ' . (int) $idModel);
        if (!$m) {
            return array('ok' => false, 'error' => 'No se encontró el modelo.');
        }
        $kind = Tools::strtolower((string) $m['category']);
        $word = strpos($kind, 'bici') !== false ? 'bicicleta eléctrica' : (strpos($kind, 'moto') !== false ? 'moto eléctrica' : (strpos($kind, 'bater') !== false ? 'batería' : 'patinete eléctrico'));

        return self::search(trim($m['brand'] . ' ' . $m['name'] . ' ' . $word));
    }

    public static function search($q)
    {
        $u = self::usage();
        if (!$u['hasKey']) {
            return array('ok' => false, 'error' => 'Falta la clave del buscador de imágenes (Ajustes → Catálogo → «Clave y límite»).', 'usage' => $u);
        }
        if ($u['left'] <= 0) {
            return array('ok' => false, 'error' => 'Se han acabado las búsquedas gratis de este mes.', 'usage' => $u);
        }
        if (!function_exists('curl_init')) {
            return array('ok' => false, 'error' => 'El servidor no tiene cURL para buscar en internet.', 'usage' => $u);
        }
        if (self::provider() === 'serpapi') {
            return self::serpapi($q, $u);
        }
        $url = self::ENDPOINT . '?' . http_build_query(array('q' => Tools::substr($q, 0, 200), 'count' => 20, 'country' => 'es', 'search_lang' => 'es', 'safesearch' => 'strict'));
        $ch = curl_init($url);
        curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_HTTPHEADER => array('Accept: application/json', 'X-Subscription-Token: ' . trim((string) Configuration::getGlobalValue('ECOREPAIRS_IMG_KEY')))));
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 401 || $code === 403) {
            return array('ok' => false, 'error' => 'Brave Search no acepta la clave. Revísala en Ajustes.', 'usage' => $u);
        }
        if ($code === 429) {
            return array('ok' => false, 'error' => 'Brave Search dice que se ha pasado el límite. Prueba más tarde.', 'usage' => $u);
        }
        if (!$body || $code >= 400) {
            return array('ok' => false, 'error' => 'No se pudo buscar ahora (error ' . $code . ').', 'usage' => $u);
        }
        self::count();
        $data = json_decode($body, true);
        $out = array();
        foreach (isset($data['results']) && is_array($data['results']) ? $data['results'] : array() as $r) {
            $full = isset($r['properties']['url']) ? (string) $r['properties']['url'] : '';
            $thumb = isset($r['thumbnail']['src']) ? (string) $r['thumbnail']['src'] : '';
            if (!preg_match('#^https?://#i', $full) && !preg_match('#^https?://#i', $thumb)) {
                continue;
            }
            $out[] = array('url' => $full, 'thumb' => $thumb ?: $full, 'title' => isset($r['title']) ? Tools::substr((string) $r['title'], 0, 140) : '',
                'page' => isset($r['url']) ? (string) $r['url'] : '',
                'w' => isset($r['properties']['width']) ? (int) $r['properties']['width'] : 0, 'h' => isset($r['properties']['height']) ? (int) $r['properties']['height'] : 0);
        }
        return self::finish($q, $out);
    }

    /** Google Imágenes a través de SerpApi. */
    protected static function serpapi($q, $u)
    {
        $url = 'https://serpapi.com/search.json?' . http_build_query(array('engine' => 'google_images', 'q' => Tools::substr($q, 0, 200), 'gl' => 'es', 'hl' => 'es',
            'safe' => 'active', 'api_key' => trim((string) Configuration::getGlobalValue('ECOREPAIRS_IMG_KEY'))));
        $ch = curl_init($url);
        curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_HTTPHEADER => array('Accept: application/json')));
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $data = json_decode((string) $body, true);
        if ($code === 401 || $code === 403 || (isset($data['error']) && stripos((string) $data['error'], 'api key') !== false)) {
            return array('ok' => false, 'error' => 'SerpApi no acepta la clave. Revísala en «Clave y límite».', 'usage' => $u);
        }
        if ($code === 429 || (isset($data['error']) && stripos((string) $data['error'], 'run out') !== false)) {
            return array('ok' => false, 'error' => 'Se han acabado las búsquedas de SerpApi de este mes (o de esta hora). Usa «Pegar a mano».', 'usage' => $u);
        }
        if (!$body || $code >= 400 || !is_array($data)) {
            return array('ok' => false, 'error' => 'No se pudo buscar ahora (error ' . $code . ').', 'usage' => $u);
        }
        self::count();
        $out = array();
        foreach (isset($data['images_results']) && is_array($data['images_results']) ? $data['images_results'] : array() as $r) {
            $full = isset($r['original']) ? (string) $r['original'] : '';
            $thumb = isset($r['thumbnail']) ? (string) $r['thumbnail'] : '';
            if (!preg_match('#^https?://#i', $full) && !preg_match('#^https?://#i', $thumb)) {
                continue;
            }
            $out[] = array('url' => $full, 'thumb' => $thumb ?: $full, 'title' => isset($r['title']) ? Tools::substr((string) $r['title'], 0, 140) : '',
                'page' => isset($r['link']) ? (string) $r['link'] : '',
                'w' => isset($r['original_width']) ? (int) $r['original_width'] : 0, 'h' => isset($r['original_height']) ? (int) $r['original_height'] : 0);
            if (count($out) >= 30) {
                break;
            }
        }

        return self::finish($q, $out);
    }

    protected static function finish($q, array $out)
    {
        // Primero las apaisadas (patín de perfil)
        usort($out, function ($a, $b) {
            $ra = $a['w'] && $a['h'] ? $a['w'] / $a['h'] : 1;
            $rb = $b['w'] && $b['h'] ? $b['w'] / $b['h'] : 1;
            $sa = abs($ra - 1.2);
            $sb = abs($rb - 1.2);

            return $sa == $sb ? 0 : ($sa < $sb ? -1 : 1);
        });

        return array('ok' => true, 'q' => $q, 'results' => array_slice($out, 0, 16), 'usage' => self::usage());
    }
}
