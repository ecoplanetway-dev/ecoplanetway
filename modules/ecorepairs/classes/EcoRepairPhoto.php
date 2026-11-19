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
            return array('ok' => false, 'error' => 'La foto es demasiado grande.');
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
        if (!in_array($type, array('entry', 'signature', 'work', 'quote_sig'), true)) {
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
        EcoRepairLog::add($idRepair, $idEmployee, 'photo', $type === 'quote_sig' ? 'Firma de aceptación del presupuesto guardada' : ($isSignature ? 'Firma del cliente guardada' : 'Foto añadida'));

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
        $open = self::openImage($file['tmp_name']);
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
