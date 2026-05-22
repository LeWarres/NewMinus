<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";

$nuevaPortadaServidor = null;

const MAX_COVER_SIZE = 5 * 1024 * 1024;
const COVER_MAX_WIDTH = 900;
const COVER_MAX_HEIGHT = 1400;
const COVER_WEBP_QUALITY = 82;
const MAX_IMAGE_PIXELS = 45000000;

function borrarArchivoPublicoSeguro(?string $rutaPublica): void {
    if (!$rutaPublica) {
        return;
    }

    if (preg_match('/^https?:\/\//i', $rutaPublica)) {
        return;
    }

    $rutaLimpia = ltrim($rutaPublica, "/");

    if (strpos($rutaLimpia, "uploads/") !== 0) {
        return;
    }

    $baseUploads = realpath(__DIR__ . "/../uploads");
    $archivo = realpath(__DIR__ . "/../" . $rutaLimpia);

    if (
        $baseUploads &&
        $archivo &&
        strpos($archivo, $baseUploads) === 0 &&
        is_file($archivo)
    ) {
        unlink($archivo);
    }
}

function validarImagenPortada(array $archivo, int $maxFileSize): array {
    if (!isset($archivo) || $archivo["error"] !== UPLOAD_ERR_OK) {
        throw new Exception("No se recibió una imagen válida");
    }

    if ($archivo["size"] > $maxFileSize) {
        $maxMb = round($maxFileSize / 1024 / 1024, 1);
        throw new Exception("La imagen supera el tamaño máximo permitido de {$maxMb} MB");
    }

    if (!is_uploaded_file($archivo["tmp_name"])) {
        throw new Exception("El archivo no fue subido correctamente");
    }

    $info = getimagesize($archivo["tmp_name"]);

    if ($info === false) {
        throw new Exception("El archivo no es una imagen válida");
    }

    $width = (int)$info[0];
    $height = (int)$info[1];

    if ($width <= 0 || $height <= 0) {
        throw new Exception("La imagen tiene dimensiones inválidas");
    }

    if (($width * $height) > MAX_IMAGE_PIXELS) {
        throw new Exception("La imagen es demasiado grande en dimensiones");
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($archivo["tmp_name"]);

    $permitidos = [
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp"
    ];

    if (!isset($permitidos[$mime])) {
        throw new Exception("Solo se permiten imágenes JPG, PNG o WEBP");
    }

    return [
        "mime" => $mime,
        "width" => $width,
        "height" => $height
    ];
}

function crearImagenDesdeArchivoPortada(string $tmpName, string $mime) {
    switch ($mime) {
        case "image/jpeg":
            return imagecreatefromjpeg($tmpName);

        case "image/png":
            return imagecreatefrompng($tmpName);

        case "image/webp":
            return imagecreatefromwebp($tmpName);

        default:
            return false;
    }
}

function aplicarOrientacionJpegPortada($imagen, string $tmpName, string $mime) {
    if ($mime !== "image/jpeg") {
        return $imagen;
    }

    if (!function_exists("exif_read_data")) {
        return $imagen;
    }

    $exif = @exif_read_data($tmpName);

    if (!$exif || empty($exif["Orientation"])) {
        return $imagen;
    }

    switch ((int)$exif["Orientation"]) {
        case 3:
            return imagerotate($imagen, 180, 0);

        case 6:
            return imagerotate($imagen, -90, 0);

        case 8:
            return imagerotate($imagen, 90, 0);

        default:
            return $imagen;
    }
}

function calcularDimensionesOptimizadasPortada(
    int $width,
    int $height,
    int $maxWidth,
    int $maxHeight
): array {
    $scale = min(
        1,
        $maxWidth / $width,
        $maxHeight / $height
    );

    $newWidth = max(1, (int)round($width * $scale));
    $newHeight = max(1, (int)round($height * $scale));

    return [$newWidth, $newHeight];
}

function guardarPortadaOptimizadaWebp(array $archivo): array {
    if (!function_exists("imagewebp")) {
        throw new Exception("El servidor no tiene soporte para optimizar imágenes WEBP");
    }

    $datosImagen = validarImagenPortada($archivo, MAX_COVER_SIZE);

    $carpetaServidor = __DIR__ . "/../uploads/portadas/";
    $rutaPublica = "uploads/portadas/";

    if (!is_dir($carpetaServidor)) {
        if (!mkdir($carpetaServidor, 0755, true)) {
            throw new Exception("No se pudo crear la carpeta de portadas");
        }
    }

    if (!is_writable($carpetaServidor)) {
        throw new Exception("La carpeta uploads/portadas no tiene permisos de escritura");
    }

    $origen = crearImagenDesdeArchivoPortada(
        $archivo["tmp_name"],
        $datosImagen["mime"]
    );

    if (!$origen) {
        throw new Exception("No se pudo procesar la portada");
    }

    $origen = aplicarOrientacionJpegPortada(
        $origen,
        $archivo["tmp_name"],
        $datosImagen["mime"]
    );

    $width = imagesx($origen);
    $height = imagesy($origen);

    [$newWidth, $newHeight] = calcularDimensionesOptimizadasPortada(
        $width,
        $height,
        COVER_MAX_WIDTH,
        COVER_MAX_HEIGHT
    );

    $destino = imagecreatetruecolor($newWidth, $newHeight);

    if (!$destino) {
        imagedestroy($origen);
        throw new Exception("No se pudo preparar la portada optimizada");
    }

    imagealphablending($destino, false);
    imagesavealpha($destino, true);

    $transparente = imagecolorallocatealpha($destino, 0, 0, 0, 127);
    imagefilledrectangle($destino, 0, 0, $newWidth, $newHeight, $transparente);

    imagecopyresampled(
        $destino,
        $origen,
        0,
        0,
        0,
        0,
        $newWidth,
        $newHeight,
        $width,
        $height
    );

    $nombreArchivo = "portada_" . bin2hex(random_bytes(16)) . ".webp";
    $rutaServidorFinal = $carpetaServidor . $nombreArchivo;
    $rutaPublicaFinal = $rutaPublica . $nombreArchivo;

    $guardado = imagewebp($destino, $rutaServidorFinal, COVER_WEBP_QUALITY);

    imagedestroy($origen);
    imagedestroy($destino);

    if (!$guardado || !is_file($rutaServidorFinal) || filesize($rutaServidorFinal) <= 0) {
        throw new Exception("No se pudo guardar la portada optimizada");
    }

    chmod($rutaServidorFinal, 0644);

    return [
        "servidor" => $rutaServidorFinal,
        "publica" => $rutaPublicaFinal
    ];
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $usuarioId = require_auth();

    $obraId = intval($_POST["obra_id"] ?? 0);

    if ($obraId <= 0) {
        json_error("Falta el id de la obra", 400);
    }

    require_obra_owner($conexion, $obraId, $usuarioId);

    if (!isset($_FILES["portada"])) {
        json_error("Debes seleccionar una portada", 400);
    }

    $stmtObra = $conexion->prepare(
        "SELECT portada
         FROM obras
         WHERE id = ?
         LIMIT 1"
    );

    $stmtObra->bind_param("i", $obraId);
    $stmtObra->execute();

    $resultObra = $stmtObra->get_result();

    if ($resultObra->num_rows === 0) {
        json_error("Obra no encontrada", 404);
    }

    $obra = $resultObra->fetch_assoc();
    $portadaAnterior = $obra["portada"];

    $nuevaPortada = guardarPortadaOptimizadaWebp($_FILES["portada"]);
    $nuevaPortadaServidor = $nuevaPortada["servidor"];

    $conexion->begin_transaction();

    $stmtUpdate = $conexion->prepare(
        "UPDATE obras
         SET portada = ?
         WHERE id = ?"
    );

    $stmtUpdate->bind_param("si", $nuevaPortada["publica"], $obraId);
    $stmtUpdate->execute();

    $conexion->commit();

    borrarArchivoPublicoSeguro($portadaAnterior);

    json_success([
        "mensaje" => "Portada actualizada correctamente",
        "portada" => $nuevaPortada["publica"]
    ]);

} catch (Throwable $e) {
    if (isset($conexion)) {
        $conexion->rollback();
    }

    if ($nuevaPortadaServidor && is_file($nuevaPortadaServidor)) {
        unlink($nuevaPortadaServidor);
    }

    handle_exception($e);
}
?>