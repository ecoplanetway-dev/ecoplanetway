<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Fotos y firmas. Se guardan fuera de la carpeta del módulo, en /upload/ecorepairs/,
 * con nombre aleatorio y sin acceso directo desde la web: se sirven a través del panel.
 */
class EcoRepairPhoto
{
    const MAX_BYTES = 12582912; // 12 MB
    const MAX_SIDE = 1600;
    const THUMB_SIDE = 480;

    /**
     * true si la petición supera post_max_size (PHP entonces descarta el formulario entero).
     * Una petición vacía (formulario sin campos) no cuenta.
     */
    public static function overPostLimit()
    {
        $len = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
        $max = self::iniBytes(ini_get('post_max_size'));

        return $max > 0 && $len > $max;
    }

    public static function iniBytes($v)
    {
        $v = trim((string) $v);
        $n = (int) $v;
        switch (Tools::strtolower(substr($v, -1))) {
            case 'g':
                $n *= 1024;
                // no break
            case 'm':
                $n *= 1024;
                // no break
            case 'k':
                $n *= 1024;
        }

        return $n;
    }

    public static function dir()
    {
        return _PS_UPLOAD_DIR_ . 'ecorepairs/';
    }

    public static function ensureStorage()
    {
        $dir = self::dir();
        if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
            return false;
        }
        $htaccess = "# Sin acceso directo: las fotos se sirven desde el panel\n"
            . "<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n"
            . "<IfModule !mod_authz_core.c>\n    Order deny,allow\n    Deny from all\n</IfModule>\n"
            . "<IfModule mod_php7.c>\n    php_flag engine off\n</IfModule>\n"
            . "Options -Indexes -ExecCGI\n";
        @file_put_contents($dir . '.htaccess', $htaccess);
        if (!file_exists($dir . 'index.php')) {
            @file_put_contents($dir . 'index.php', "<?php\nheader('Location: ../../');\nexit;\n");
        }

        return is_writable($dir);
    }

    protected static function randomName($ext)
    {
        return bin2hex(random_bytes(16)) . '.' . $ext;
    }

    protected static function canWebp()
    {
        return function_exists('imagewebp');
    }

    /**
     * Guarda una foto subida ($_FILES['photo']).
     */
    public static function saveUpload($idRepair, array $file, $type, $idEmployee)
    {
        if (!isset($file['error']) || is_array($file['error'])) {
            return array('ok' => false, 'error' => 'No se recibió la foto.');
        }
        if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) {
            return array('ok' => false, 'error' => 'La foto es demasiado grande para el servidor (máximo ' . ini_get('upload_max_filesize') . ').');
        }
        if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
            return array('ok' => false, 'error' => 'No se pudo subir la foto.');
        }
        if ($file['size'] > self::MAX_BYTES) {
            return array('ok' => false, 'error' => 'La foto supera los 12 MB.');
        }

        return self::saveImageFile($idRepair, $file['tmp_name'], $type, $idEmployee);
    }

    /**
     * Guarda la firma recibida como data URL PNG.
     */
    public static function saveSignature($idRepair, $dataUrl, $idEmployee, $type = 'signature')
    {
        if (!preg_match('#^data:image/png;base64,([A-Za-z0-9+/=]+)$#', (string) $dataUrl, $m)) {
            return array('ok' => false, 'error' => 'Firma no válida.');
        }
        $bin = base64_decode($m[1], true);
        if ($bin === false || strlen($bin) > 1048576) {
            return array('ok' => false, 'error' => 'Firma no válida.');
        }
        $tmp = tempnam(_PS_CACHE_DIR_, 'ecor');
        file_put_contents($tmp, $bin);
        $res = self::saveImageFile($idRepair, $tmp, $type === 'quote_sig' ? 'quote_sig' : 'signature', $idEmployee);
        @unlink($tmp);

        return $res;
    }

    protected static function saveImageFile($idRepair, $path, $type, $idEmployee)
    {
        if (!in_array($type, array('entry', 'signature', 'work', 'quote_sig', 'device'), true)) {
            $type = 'entry';
        }
        $open = self::openImage($path);
        if (!$open['ok']) {
            return $open;
        }
        $img = $open['img'];

        if (!self::ensureStorage()) {
            imagedestroy($img);

            return array('ok' => false, 'error' => 'La carpeta de fotos no tiene permisos de escritura.');
        }
        $dir = self::dir() . (int) $idRepair . '/';
        if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
            imagedestroy($img);

            return array('ok' => false, 'error' => 'No se pudo crear la carpeta de la reparación.');
        }

        $isSignature = $type === 'signature' || $type === 'quote_sig';
        $ext = $isSignature ? 'png' : (self::canWebp() ? 'webp' : 'jpg');
        $name = self::randomName($ext);

        $full = self::resize($img, $isSignature ? 1200 : self::MAX_SIDE, $isSignature);
        $okFull = self::write($full, $dir . $name, $ext);
        $okThumb = true;
        if (!$isSignature) {
            $thumb = self::resize($img, self::THUMB_SIDE, false);
            $okThumb = self::write($thumb, $dir . 'th_' . $name, $ext);
            if ($thumb !== $img) {
                imagedestroy($thumb);
            }
        }
        if ($full !== $img) {
            imagedestroy($full);
        }
        imagedestroy($img);

        if (!$okFull || !$okThumb) {
            @unlink($dir . $name);
            @unlink($dir . 'th_' . $name);

            return array('ok' => false, 'error' => 'No se pudo guardar la imagen.');
        }

        Db::getInstance()->insert('ecorepair_photo', array(
            'id_ecorepair' => (int) $idRepair,
            'type' => pSQL($type),
            'file' => pSQL($name),
            'id_employee' => (int) $idEmployee,
            'date_add' => date('Y-m-d H:i:s'),
        ));
        $id = (int) Db::getInstance()->Insert_ID();
        EcoRepairLog::add($idRepair, $idEmployee, 'photo', $type === 'quote_sig' ? 'Firma de aceptación del presupuesto guardada' : ($isSignature ? 'Firma del cliente guardada' : ($type === 'device' ? 'Foto del equipo guardada' : 'Foto añadida')));

        return array('ok' => true, 'id' => $id);
    }


    /**
     * Abre una imagen comprobando el tipo real (no el que dice el navegador) y el tamaño.
     */
    protected static function openImage($path)
    {
        // Tipo real del archivo, no el que dice el navegador
        $info = @getimagesize($path);
        $mime = $info ? $info['mime'] : '';
        if (function_exists('finfo_open')) {
            $fi = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($fi, $path);
            finfo_close($fi);
        }
        $allowed = array('image/jpeg', 'image/png', 'image/webp');
        if (!$info || !in_array($mime, $allowed, true) || $info['mime'] !== $mime) {
            return array('ok' => false, 'error' => 'Solo se admiten fotos JPG, PNG o WEBP.');
        }
        if ($info[0] < 16 || $info[1] < 16 || $info[0] * $info[1] > 40000000) {
            return array('ok' => false, 'error' => 'El tamaño de la imagen no es válido.');
        }

        if ($mime === 'image/jpeg') {
            $img = @imagecreatefromjpeg($path);
        } elseif ($mime === 'image/png') {
            $img = @imagecreatefrompng($path);
        } else {
            $img = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false;
        }
        if (!$img) {
            return array('ok' => false, 'error' => 'No se pudo leer la imagen.');
        }
        if ($mime === 'image/jpeg') {
            $img = self::fixOrientation($img, $path);
        }

        return array('ok' => true, 'img' => $img);
    }

    /* ---------- Fotos de los modelos del catálogo ---------- */

    protected static function modelDir()
    {
        return self::dir() . 'models/';
    }

    /**
     * Guarda la foto de un modelo (subida). Devuelve array('ok', 'file').
     */
    public static function saveModelImage($idModel, array $file)
    {
        if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name']) || (int) $file['size'] > self::MAX_BYTES) {
            return array('ok' => false, 'error' => 'No se recibió la foto o es demasiado grande.');
        }

        return self::saveModelImageFrom($file['tmp_name']);
    }

    /**
     * Descarga una imagen de internet y la guarda como foto del modelo (así no depende de la otra web).
     * Acepta enlaces de Google Imágenes (saca la imagen real de «imgurl=»).
     */
    public static function modelImageFromUrl($url, $depth = 0)
    {
        $url = trim((string) $url);
        $q = parse_url($url, PHP_URL_QUERY);
        if ($q) {
            parse_str($q, $qv);
            foreach (array('imgurl', 'mediaurl', 'url') as $k) {
                if (!empty($qv[$k]) && preg_match('#^https?://#i', $qv[$k])) {
                    $url = $qv[$k];
                    break;
                }
            }
        }
        if (!preg_match('#^https?://#i', $url) || !Validate::isAbsoluteUrl($url) || Tools::strlen($url) > 2000) {
            return array('ok' => false, 'error' => 'Pega la dirección de la imagen (empieza por http).');
        }
        $host = (string) parse_url($url, PHP_URL_HOST);
        $ip = gethostbyname($host);
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return array('ok' => false, 'error' => 'No se puede descargar de esa dirección.');
        }
        if (!function_exists('curl_init')) {
            return array('ok' => false, 'error' => 'El servidor no puede descargar imágenes (falta cURL). Sube la foto desde el ordenador.');
        }
        $tmp = tempnam(sys_get_temp_dir(), 'ecor');
        $fh = fopen($tmp, 'wb');
        $ch = curl_init($url);
        $max = self::MAX_BYTES;
        curl_setopt_array($ch, array(CURLOPT_FILE => $fh, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3, CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            CURLOPT_HTTPHEADER => array('Accept: image/webp,image/png,image/jpeg,image/*;q=0.9,text/html;q=0.8,*/*;q=0.5', 'Accept-Language: es-ES,es;q=0.9'),
            CURLOPT_NOPROGRESS => false, CURLOPT_PROGRESSFUNCTION => function ($c, $dt, $d) use ($max) { return $d > $max ? 1 : 0; }));
        $ok = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $type = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        fclose($fh);
        if (!$ok || $code >= 400) {
            @unlink($tmp);

            return array('ok' => false, 'error' => 'No se pudo descargar la imagen (la web no la deja bajar). Guárdala y súbela con «Subir foto».');
        }
        if (stripos($type, 'text/html') !== false || stripos($type, 'xhtml') !== false) {
            // Es una página: se buscan sus fotos. Si hay una sola se descarga; si hay varias, se devuelven para elegir.
            $html = (string) Tools::file_get_contents($tmp, false, null, 5, true);
            @unlink($tmp);
            $list = self::pageImages($html, $url);
            if (!$list) {
                return array('ok' => false, 'error' => 'En esa página no se encontraron fotos. Abre la imagen, botón derecho → «Copiar dirección de la imagen».');
            }
            if (count($list) === 1 && $depth < 1) {
                return self::modelImageFromUrl($list[0], $depth + 1);
            }

            return array('ok' => true, 'choose' => $list);
        }
        $res = self::saveModelImageFrom($tmp);
        @unlink($tmp);

        return $res;
    }

    /** Fotos de una página web: la principal (og:image) primero, luego las <img>. Sin iconos, logos ni repetidas. */
    protected static function pageImages($html, $base)
    {
        $html = Tools::substr($html, 0, 3000000);
        $found = array();
        if (preg_match_all('#<meta[^>]+(?:property|name)=["\'](?:og:image(?::secure_url)?|twitter:image)["\'][^>]*>#i', $html, $mm)) {
            foreach ($mm[0] as $tag) {
                if (preg_match('#content=["\']([^"\']+)#i', $tag, $c)) {
                    $found[] = $c[1];
                }
            }
        }
        if (preg_match_all('#<img\b[^>]*>#i', $html, $mm)) {
            foreach ($mm[0] as $tag) {
                $src = '';
                if (preg_match('#\s(?:data-zoom-image|data-large_image|data-src|data-original|data-lazy-src)=["\']([^"\']+)#i', $tag, $c)) {
                    $src = $c[1];
                } elseif (preg_match('#\ssrcset=["\']([^"\']+)#i', $tag, $c)) {
                    $parts = array_map('trim', explode(',', $c[1]));
                    $last = end($parts);
                    $src = preg_replace('#\s+\S+$#', '', $last);
                } elseif (preg_match('#\ssrc=["\']([^"\']+)#i', $tag, $c)) {
                    $src = $c[1];
                }
                if (preg_match('#\s(?:width|height)=["\']?(\d+)#i', $tag, $wh) && (int) $wh[1] > 0 && (int) $wh[1] < 80) {
                    continue;
                }
                if ($src !== '') {
                    $found[] = $src;
                }
            }
        }
        $out = array();
        foreach ($found as $src) {
            $src = trim(html_entity_decode($src, ENT_QUOTES, 'UTF-8'));
            if ($src === '' || stripos($src, 'data:') === 0 || preg_match('#\.(svg|gif|ico)(\?|$)|logo|icon|sprite|pixel|avatar|placeholder|blank\.#i', $src)) {
                continue;
            }
            $abs = self::absUrl($src, $base);
            if ($abs && !in_array($abs, $out, true) && Tools::strlen($abs) <= 2000) {
                $out[] = $abs;
            }
            if (count($out) >= 24) {
                break;
            }
        }

        return $out;
    }

    protected static function absUrl($src, $base)
    {
        if (preg_match('#^https?://#i', $src)) {
            return $src;
        }
        $b = parse_url($base);
        if (empty($b['host'])) {
            return '';
        }
        $scheme = isset($b['scheme']) ? $b['scheme'] : 'https';
        if (strpos($src, '//') === 0) {
            return $scheme . ':' . $src;
        }
        $root = $scheme . '://' . $b['host'] . (isset($b['port']) ? ':' . $b['port'] : '');
        if ($src[0] === '/') {
            return $root . $src;
        }
        $dir = isset($b['path']) ? preg_replace('#/[^/]*$#', '/', $b['path']) : '/';

        return $root . ($dir ?: '/') . $src;
    }

    protected static function saveModelImageFrom($path)
    {
        $open = self::openImage($path);
        if (!$open['ok']) {
            return $open;
        }
        if (!self::ensureStorage() || (!is_dir(self::modelDir()) && !@mkdir(self::modelDir(), 0755, true))) {
            imagedestroy($open['img']);

            return array('ok' => false, 'error' => 'La carpeta de fotos no tiene permisos de escritura.');
        }
        $ext = self::canWebp() ? 'webp' : 'jpg';
        $name = self::randomName($ext);
        $small = self::resize($open['img'], 400, false);
        $ok = self::write($small, self::modelDir() . $name, $ext);
        if ($small !== $open['img']) {
            imagedestroy($small);
        }
        imagedestroy($open['img']);
        if (!$ok) {
            return array('ok' => false, 'error' => 'No se pudo guardar la imagen.');
        }

        return array('ok' => true, 'file' => $name);
    }

    /**
     * Copia una foto de reparación (la del equipo) como foto del modelo. Devuelve el nombre del archivo nuevo.
     */
    public static function copyToModel(array $photo)
    {
        $name = basename($photo['file']);
        $src = self::dir() . (int) $photo['id_ecorepair'] . '/' . $name;
        if (!preg_match('/^[a-f0-9]{32}\.(webp|jpg|png)$/', $name) || !is_file($src)) {
            return array('ok' => false, 'error' => 'No se encontró la foto.');
        }
        $open = self::openImage($src);
        if (!$open['ok']) {
            return $open;
        }
        if (!is_dir(self::modelDir()) && !@mkdir(self::modelDir(), 0755, true)) {
            imagedestroy($open['img']);

            return array('ok' => false, 'error' => 'La carpeta de fotos no tiene permisos de escritura.');
        }
        $ext = self::canWebp() ? 'webp' : 'jpg';
        $new = self::randomName($ext);
        $small = self::resize($open['img'], 400, false);
        $ok = self::write($small, self::modelDir() . $new, $ext);
        if ($small !== $open['img']) {
            imagedestroy($small);
        }
        imagedestroy($open['img']);

        return $ok ? array('ok' => true, 'file' => $new) : array('ok' => false, 'error' => 'No se pudo guardar la imagen.');
    }

    /* ---------- Foto (avatar) de cada empleado: img/ecorepairs/avatars/, fuera del módulo para que no se pierda al actualizar ---------- */

    protected static function avatarDir()
    {
        return _PS_IMG_DIR_ . 'ecorepairs/avatars/';
    }

    protected static function avatarMap()
    {
        $m = json_decode((string) Configuration::get('ECOREPAIRS_AVATARS'), true);

        return is_array($m) ? $m : array();
    }

    /** id_employee => URL de su foto. */
    public static function avatars()
    {
        $out = array();
        foreach (self::avatarMap() as $id => $file) {
            if (preg_match('/^[a-z0-9]{8,40}\.(png|webp|jpg)$/', $file) && is_file(self::avatarDir() . $file)) {
                $out[(int) $id] = Tools::getShopDomainSsl(true) . __PS_BASE_URI__ . 'img/ecorepairs/avatars/' . $file;
            }
        }

        return $out;
    }

    public static function saveAvatar($idEmployee, array $file)
    {
        $idEmployee = (int) $idEmployee;
        if (!$idEmployee) {
            return array('ok' => false, 'error' => 'Elige un empleado.');
        }
        if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name']) || (int) $file['size'] > 8388608) {
            return array('ok' => false, 'error' => 'No se recibió la foto o pesa más de 8 MB.');
        }
        $open = self::openImage($file['tmp_name']);
        if (!$open['ok']) {
            return $open;
        }
        $dir = self::avatarDir();
        if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
            imagedestroy($open['img']);

            return array('ok' => false, 'error' => 'La carpeta img/ecorepairs no tiene permisos de escritura.');
        }
        if (!is_file($dir . 'index.php')) {
            @file_put_contents($dir . 'index.php', "<?php\nheader('Location: ../../../');\nexit;\n");
        }
        // PNG para conservar el fondo transparente de los avatares
        $name = 'e' . $idEmployee . bin2hex(random_bytes(6)) . '.png';
        $small = self::resize($open['img'], 320, true);
        $ok = imagepng($small, $dir . $name, 7);
        if ($small !== $open['img']) {
            imagedestroy($small);
        }
        imagedestroy($open['img']);
        if (!$ok) {
            return array('ok' => false, 'error' => 'No se pudo guardar la foto.');
        }
        self::deleteAvatar($idEmployee, false);
        $map = self::avatarMap();
        $map[$idEmployee] = $name;
        Configuration::updateValue('ECOREPAIRS_AVATARS', json_encode($map));

        return array('ok' => true);
    }

    public static function deleteAvatar($idEmployee, $save = true)
    {
        $map = self::avatarMap();
        $idEmployee = (int) $idEmployee;
        if (isset($map[$idEmployee])) {
            $f = basename((string) $map[$idEmployee]);
            if (preg_match('/^[a-z0-9]{8,40}\.(png|webp|jpg)$/', $f)) {
                @unlink(self::avatarDir() . $f);
            }
            unset($map[$idEmployee]);
            if ($save) {
                Configuration::updateValue('ECOREPAIRS_AVATARS', json_encode($map));
            }
        }

        return array('ok' => true);
    }

    public static function deleteModelImage($name)
    {
        $name = basename((string) $name);
        if (preg_match('/^[a-f0-9]{32}\.(webp|jpg)$/', $name)) {
            @unlink(self::modelDir() . $name);
        }
    }

    public static function outputModelImage($name)
    {
        $name = basename((string) $name);
        if (!preg_match('/^[a-f0-9]{32}\.(webp|jpg)$/', $name) || !is_file(self::modelDir() . $name)) {
            return false;
        }
        $file = self::modelDir() . $name;
        header('Content-Type: ' . (substr($name, -4) === 'webp' ? 'image/webp' : 'image/jpeg'));
        header('Content-Length: ' . filesize($file));
        header('Cache-Control: private, max-age=604800');
        header('X-Content-Type-Options: nosniff');
        readfile($file);

        return true;
    }

    protected static function fixOrientation($img, $path)
    {
        if (!function_exists('exif_read_data')) {
            return $img;
        }
        $exif = @exif_read_data($path);
        if (!$exif || empty($exif['Orientation'])) {
            return $img;
        }
        $angles = array(3 => 180, 6 => -90, 8 => 90);
        $o = (int) $exif['Orientation'];
        if (isset($angles[$o])) {
            $rot = imagerotate($img, $angles[$o], 0);
            if ($rot) {
                imagedestroy($img);

                return $rot;
            }
        }

        return $img;
    }

    protected static function resize($img, $maxSide, $keepAlpha)
    {
        $w = imagesx($img);
        $h = imagesy($img);
        $scale = min(1, $maxSide / max($w, $h));
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));
        $out = imagecreatetruecolor($nw, $nh);
        if ($keepAlpha) {
            imagealphablending($out, false);
            imagesavealpha($out, true);
            imagefill($out, 0, 0, imagecolorallocatealpha($out, 0, 0, 0, 127));
        } else {
            imagefill($out, 0, 0, imagecolorallocate($out, 255, 255, 255));
        }
        imagecopyresampled($out, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);

        return $out;
    }

    protected static function write($img, $path, $ext)
    {
        if ($ext === 'png') {
            return imagepng($img, $path, 6);
        }
        if ($ext === 'webp') {
            return imagewebp($img, $path, 80);
        }

        return imagejpeg($img, $path, 82);
    }

    public static function forRepair($idRepair)
    {
        $rows = Db::getInstance()->executeS('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_photo`
            WHERE id_ecorepair = ' . (int) $idRepair . ' ORDER BY date_add ASC, id_ecorepair_photo ASC');

        return $rows ?: array();
    }

    public static function get($idPhoto)
    {
        return Db::getInstance()->getRow('SELECT * FROM `' . _DB_PREFIX_ . 'ecorepair_photo` WHERE id_ecorepair_photo = ' . (int) $idPhoto);
    }

    /**
     * Envía el archivo al navegador. $thumb para la miniatura.
     */
    public static function output(array $photo, $thumb)
    {
        $name = basename($photo['file']);
        if (!preg_match('/^[a-f0-9]{32}\.(webp|jpg|png)$/', $name)) {
            return false;
        }
        $dir = self::dir() . (int) $photo['id_ecorepair'] . '/';
        $file = $dir . ($thumb && $photo['type'] !== 'signature' && $photo['type'] !== 'quote_sig' ? 'th_' : '') . $name;
        if (!is_file($file)) {
            return false;
        }
        $types = array('webp' => 'image/webp', 'jpg' => 'image/jpeg', 'png' => 'image/png');
        $ext = pathinfo($name, PATHINFO_EXTENSION);
        header('Content-Type: ' . $types[$ext]);
        header('Content-Length: ' . filesize($file));
        header('Cache-Control: private, max-age=86400');
        header('X-Content-Type-Options: nosniff');
        readfile($file);

        return true;
    }

    public static function delete($idPhoto, $idEmployee)
    {
        $photo = self::get($idPhoto);
        if (!$photo) {
            return array('ok' => false, 'error' => 'La foto no existe.');
        }
        $name = basename($photo['file']);
        $dir = self::dir() . (int) $photo['id_ecorepair'] . '/';
        @unlink($dir . $name);
        @unlink($dir . 'th_' . $name);
        Db::getInstance()->delete('ecorepair_photo', 'id_ecorepair_photo = ' . (int) $idPhoto);
        EcoRepairLog::add((int) $photo['id_ecorepair'], $idEmployee, 'photo', $photo['type'] === 'signature' ? 'Firma borrada' : 'Foto borrada');

        return array('ok' => true);
    }
}
