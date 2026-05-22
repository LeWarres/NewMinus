<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";

$nuevoPerfilServidor = null;
$nuevoBannerServidor = null;

const MAX_PROFILE_SIZE = 3 * 1024 * 1024;
const MAX_BANNER_SIZE = 5 * 1024 * 1024;

const PROFILE_MAX_WIDTH = 500;
const PROFILE_MAX_HEIGHT = 500;
const PROFILE_WEBP_QUALITY = 82;

const BANNER_MAX_WIDTH = 1600;
const BANNER_MAX_HEIGHT = 700;
const BANNER_WEBP_QUALITY = 80;

const MAX_IMAGE_PIXELS = 45000000;

function borrarArchivoPublicoPerfil(?string $rutaPublica): void {
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

function boolDesdePostPerfil($valor): int {
    if (is_bool($valor)) {
        return $valor ? 1 : 0;
    }

    $normalizado = strtolower(trim((string)$valor));

    return in_array($normalizado, ["1", "true", "on", "yes", "si", "sí"], true)
        ? 1
        : 0;
}

function idiomasLecturaPermitidosPerfil(): array {
    return [
        "ES",
        "EN",
        "JA",
        "KO",
        "ZH",
        "FR",
        "DE",
        "PT",
        "IT",
        "RU",
        "AR",
        "HI",
        "ID",
        "VI",
        "TH",
        "TR",
        "PL",
        "NL"
    ];
}

function normalizarIdiomasLecturaPerfil($inputIdiomas): array {
    if (is_string($inputIdiomas)) {
        $decoded = json_decode($inputIdiomas, true);
        $inputIdiomas = is_array($decoded) ? $decoded : [];
    }

    if (!is_array($inputIdiomas)) {
        $inputIdiomas = [];
    }

    $permitidos = idiomasLecturaPermitidosPerfil();
    $normalizados = [];

    foreach ($inputIdiomas as $idioma) {
        $valor = strtoupper(trim((string)$idioma));

        if ($valor === "") {
            continue;
        }

        if (!in_array($valor, $permitidos, true)) {
            json_error("Un idioma de lectura no es válido", 400);
        }

        if (!in_array($valor, $normalizados, true)) {
            $normalizados[] = $valor;
        }
    }

    if (count($normalizados) === 0) {
        json_error("Selecciona al menos un idioma de lectura", 400);
    }

    return $normalizados;
}

function obtenerIdiomasLecturaPerfil(mysqli $conexion, int $usuarioId): array {
    $stmt = $conexion->prepare(
        "SELECT idioma
         FROM usuario_idiomas_lectura
         WHERE usuario_id = ?
         ORDER BY idioma ASC"
    );

    $stmt->bind_param("i", $usuarioId);
    $stmt->execute();

    $result = $stmt->get_result();

    $idiomas = [];

    while ($row = $result->fetch_assoc()) {
        $idiomas[] = $row["idioma"];
    }

    return $idiomas;
}

function actualizarIdiomasLecturaPerfil(
    mysqli $conexion,
    int $usuarioId,
    array $idiomasLectura
): void {
    $stmtDelete = $conexion->prepare(
        "DELETE FROM usuario_idiomas_lectura
         WHERE usuario_id = ?"
    );

    $stmtDelete->bind_param("i", $usuarioId);
    $stmtDelete->execute();

    $stmtInsert = $conexion->prepare(
        "INSERT INTO usuario_idiomas_lectura
         (usuario_id, idioma)
         VALUES (?, ?)"
    );

    foreach ($idiomasLectura as $idioma) {
        $stmtInsert->bind_param("is", $usuarioId, $idioma);
        $stmtInsert->execute();
    }
}

function validarImagenPerfil(array $archivo, int $maxFileSize): array {
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

function crearImagenDesdeArchivoPerfil(string $tmpName, string $mime) {
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

function aplicarOrientacionJpegPerfil($imagen, string $tmpName, string $mime) {
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

function calcularDimensionesOptimizadasPerfil(
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

function guardarImagenPerfilOptimizadaWebp(
    array $archivo,
    string $tipo
): array {
    if (!function_exists("imagewebp")) {
        throw new Exception("El servidor no tiene soporte para optimizar imágenes WEBP");
    }

    if ($tipo === "perfil") {
        $carpetaServidor = __DIR__ . "/../uploads/perfiles/";
        $rutaPublica = "uploads/perfiles/";
        $prefijo = "perfil_";
        $maxFileSize = MAX_PROFILE_SIZE;
        $maxWidth = PROFILE_MAX_WIDTH;
        $maxHeight = PROFILE_MAX_HEIGHT;
        $quality = PROFILE_WEBP_QUALITY;
    } else {
        $carpetaServidor = __DIR__ . "/../uploads/banners/";
        $rutaPublica = "uploads/banners/";
        $prefijo = "banner_";
        $maxFileSize = MAX_BANNER_SIZE;
        $maxWidth = BANNER_MAX_WIDTH;
        $maxHeight = BANNER_MAX_HEIGHT;
        $quality = BANNER_WEBP_QUALITY;
    }

    $datosImagen = validarImagenPerfil($archivo, $maxFileSize);

    if (!is_dir($carpetaServidor)) {
        if (!mkdir($carpetaServidor, 0755, true)) {
            throw new Exception("No se pudo crear la carpeta de subida");
        }
    }

    if (!is_writable($carpetaServidor)) {
        throw new Exception("La carpeta de subida no tiene permisos de escritura");
    }

    $origen = crearImagenDesdeArchivoPerfil(
        $archivo["tmp_name"],
        $datosImagen["mime"]
    );

    if (!$origen) {
        throw new Exception("No se pudo procesar la imagen");
    }

    $origen = aplicarOrientacionJpegPerfil(
        $origen,
        $archivo["tmp_name"],
        $datosImagen["mime"]
    );

    $width = imagesx($origen);
    $height = imagesy($origen);

    [$newWidth, $newHeight] = calcularDimensionesOptimizadasPerfil(
        $width,
        $height,
        $maxWidth,
        $maxHeight
    );

    $destino = imagecreatetruecolor($newWidth, $newHeight);

    if (!$destino) {
        imagedestroy($origen);
        throw new Exception("No se pudo preparar la imagen optimizada");
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

    $nombreArchivo = $prefijo . bin2hex(random_bytes(16)) . ".webp";
    $rutaServidorFinal = $carpetaServidor . $nombreArchivo;
    $rutaPublicaFinal = $rutaPublica . $nombreArchivo;

    $guardado = imagewebp($destino, $rutaServidorFinal, $quality);

    imagedestroy($origen);
    imagedestroy($destino);

    if (!$guardado || !is_file($rutaServidorFinal) || filesize($rutaServidorFinal) <= 0) {
        throw new Exception("No se pudo guardar la imagen optimizada");
    }

    chmod($rutaServidorFinal, 0644);

    return [
        "servidor" => $rutaServidorFinal,
        "publica" => $rutaPublicaFinal
    ];
}

function validarUrlOpcional(string $url): string {
    $url = trim($url);

    if ($url === "") {
        return "";
    }

    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        throw new Exception("Una de las redes sociales no tiene una URL válida");
    }

    if (!preg_match('/^https?:\/\//i', $url)) {
        throw new Exception("Las URLs deben iniciar con http:// o https://");
    }

    return $url;
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $usuarioId = require_auth();

    check_rate_limit($conexion, (string)$usuarioId, "editar_perfil", 30, 3600);

    $username = trim($_POST["username"] ?? "");
    $email = strtolower(trim($_POST["email"] ?? ""));
    $nacionalidad = trim($_POST["nacionalidad"] ?? "");

    $facebook = validarUrlOpcional($_POST["facebook"] ?? "");
    $twitter = validarUrlOpcional($_POST["twitter"] ?? "");
    $instagram = validarUrlOpcional($_POST["instagram"] ?? "");

    $actualizarIdiomasLectura = array_key_exists("idiomasLectura", $_POST);
    $idiomasLectura = $actualizarIdiomasLectura
        ? normalizarIdiomasLecturaPerfil($_POST["idiomasLectura"])
        : [];

    $actualizarMostrarNsfw = array_key_exists("mostrarNsfw", $_POST);

    if ($username === "" || $email === "") {
        json_error("Usuario y email son obligatorios", 400);
    }

    if (!preg_match('/^[A-Za-z0-9_]{3,30}$/', $username)) {
        json_error("El usuario debe tener de 3 a 30 caracteres y solo usar letras, números o guion bajo", 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error("El email no es válido", 400);
    }

    if (strlen($nacionalidad) > 80) {
        json_error("La nacionalidad es demasiado larga", 400);
    }

    $stmtActual = $conexion->prepare(
        "SELECT 
            id,
            username,
            email,
            role,
            img_perfil,
            img_banner,
            mostrar_nsfw
         FROM usuarios
         WHERE id = ?
         LIMIT 1"
    );

    $stmtActual->bind_param("i", $usuarioId);
    $stmtActual->execute();

    $resultActual = $stmtActual->get_result();

    if ($resultActual->num_rows === 0) {
        json_error("Usuario no encontrado", 404);
    }

    $usuarioActual = $resultActual->fetch_assoc();

    $mostrarNsfw = $actualizarMostrarNsfw
        ? boolDesdePostPerfil($_POST["mostrarNsfw"])
        : (int)$usuarioActual["mostrar_nsfw"];

    $stmtDuplicado = $conexion->prepare(
        "SELECT id
         FROM usuarios
         WHERE (email = ? OR username = ?) AND id != ?
         LIMIT 1"
    );

    $stmtDuplicado->bind_param("ssi", $email, $username, $usuarioId);
    $stmtDuplicado->execute();

    $resultDuplicado = $stmtDuplicado->get_result();

    if ($resultDuplicado->num_rows > 0) {
        json_error("El email o usuario ya está en uso", 409);
    }

    $imgPerfilAnterior = $usuarioActual["img_perfil"];
    $imgBannerAnterior = $usuarioActual["img_banner"];

    $imgPerfil = $imgPerfilAnterior;
    $imgBanner = $imgBannerAnterior;

    if (isset($_FILES["imgPerfil"]) && $_FILES["imgPerfil"]["error"] !== UPLOAD_ERR_NO_FILE) {
        $nuevaPerfil = guardarImagenPerfilOptimizadaWebp($_FILES["imgPerfil"], "perfil");
        $nuevoPerfilServidor = $nuevaPerfil["servidor"];
        $imgPerfil = $nuevaPerfil["publica"];
    }

    if (isset($_FILES["imgBanner"]) && $_FILES["imgBanner"]["error"] !== UPLOAD_ERR_NO_FILE) {
        $nuevoBanner = guardarImagenPerfilOptimizadaWebp($_FILES["imgBanner"], "banner");
        $nuevoBannerServidor = $nuevoBanner["servidor"];
        $imgBanner = $nuevoBanner["publica"];
    }

    $conexion->begin_transaction();

    $stmtUpdate = $conexion->prepare(
        "UPDATE usuarios
         SET 
            username = ?,
            email = ?,
            nacionalidad = ?,
            facebook = ?,
            twitter = ?,
            instagram = ?,
            img_perfil = ?,
            img_banner = ?,
            mostrar_nsfw = ?
         WHERE id = ?"
    );

    $stmtUpdate->bind_param(
        "ssssssssii",
        $username,
        $email,
        $nacionalidad,
        $facebook,
        $twitter,
        $instagram,
        $imgPerfil,
        $imgBanner,
        $mostrarNsfw,
        $usuarioId
    );

    $stmtUpdate->execute();

    if ($actualizarIdiomasLectura) {
        actualizarIdiomasLecturaPerfil($conexion, $usuarioId, $idiomasLectura);
    }

    $conexion->commit();

    if ($imgPerfil !== $imgPerfilAnterior) {
        borrarArchivoPublicoPerfil($imgPerfilAnterior);
    }

    if ($imgBanner !== $imgBannerAnterior) {
        borrarArchivoPublicoPerfil($imgBannerAnterior);
    }

    $idiomasRespuesta = $actualizarIdiomasLectura
        ? $idiomasLectura
        : obtenerIdiomasLecturaPerfil($conexion, $usuarioId);

    json_success([
        "mensaje" => "Perfil actualizado correctamente",
        "user" => [
            "id" => (int)$usuarioId,
            "username" => $username,
            "email" => $email,
            "role" => $usuarioActual["role"],
            "nacionalidad" => $nacionalidad,
            "imgPerfil" => $imgPerfil,
            "imgBanner" => $imgBanner,
            "facebook" => $facebook,
            "twitter" => $twitter,
            "instagram" => $instagram,
            "idiomasLectura" => $idiomasRespuesta,
            "mostrarNsfw" => (bool)$mostrarNsfw
        ]
    ]);

} catch (Throwable $e) {
    if (isset($conexion)) {
        $conexion->rollback();
    }

    if ($nuevoPerfilServidor && is_file($nuevoPerfilServidor)) {
        unlink($nuevoPerfilServidor);
    }

    if ($nuevoBannerServidor && is_file($nuevoBannerServidor)) {
        unlink($nuevoBannerServidor);
    }

    handle_exception($e);
}
?>