<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";

$archivosGuardados = [];

const MAX_PAGE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_PAGES_SIZE = 300 * 1024 * 1024;

const PAGE_MAX_WIDTH = 1600;
const PAGE_MAX_HEIGHT = 5000;
const PAGE_WEBP_QUALITY = 78;

const MAX_IMAGE_PIXELS = 45000000;

function validarImagenPaginaAdmin(array $archivo, int $maxFileSize): array {
    if (!isset($archivo)) {
        throw new Exception("No se recibió una imagen válida");
    }

    if ($archivo["error"] !== UPLOAD_ERR_OK) {
        $errores = [
            UPLOAD_ERR_INI_SIZE => "La imagen supera el límite permitido por el servidor",
            UPLOAD_ERR_FORM_SIZE => "La imagen supera el límite permitido por el formulario",
            UPLOAD_ERR_PARTIAL => "La imagen se subió parcialmente",
            UPLOAD_ERR_NO_FILE => "No se recibió archivo",
            UPLOAD_ERR_NO_TMP_DIR => "Falta carpeta temporal en el servidor",
            UPLOAD_ERR_CANT_WRITE => "No se pudo escribir el archivo en el servidor",
            UPLOAD_ERR_EXTENSION => "Una extensión de PHP bloqueó la subida"
        ];

        $codigo = (int)$archivo["error"];
        throw new Exception($errores[$codigo] ?? "Error desconocido al subir imagen");
    }

    if ($archivo["size"] > $maxFileSize) {
        $maxMb = round($maxFileSize / 1024 / 1024, 1);
        throw new Exception("Una imagen supera el tamaño máximo permitido de {$maxMb} MB");
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
        "extension" => $permitidos[$mime],
        "width" => $width,
        "height" => $height
    ];
}

function crearImagenDesdeArchivoPagina(string $tmpName, string $mime) {
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

function aplicarOrientacionJpegPagina($imagen, string $tmpName, string $mime) {
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

function calcularDimensionesOptimizadasPagina(
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

function guardarPaginaAdminOptimizadaWebp(
    array $archivo,
    array &$archivosGuardados
): string {
    if (!function_exists("imagewebp")) {
        throw new Exception("El servidor no tiene soporte para optimizar imágenes WEBP");
    }

    $datosImagen = validarImagenPaginaAdmin($archivo, MAX_PAGE_SIZE);

    $carpetaServidor = __DIR__ . "/../uploads/paginas/";
    $rutaPublica = "uploads/paginas/";

    if (!is_dir($carpetaServidor)) {
        if (!mkdir($carpetaServidor, 0755, true)) {
            throw new Exception("No se pudo crear la carpeta de páginas");
        }
    }

    if (!is_writable($carpetaServidor)) {
        throw new Exception("La carpeta uploads/paginas no tiene permisos de escritura");
    }

    $origen = crearImagenDesdeArchivoPagina(
        $archivo["tmp_name"],
        $datosImagen["mime"]
    );

    if (!$origen) {
        throw new Exception("No se pudo procesar la imagen");
    }

    $origen = aplicarOrientacionJpegPagina(
        $origen,
        $archivo["tmp_name"],
        $datosImagen["mime"]
    );

    $width = imagesx($origen);
    $height = imagesy($origen);

    [$newWidth, $newHeight] = calcularDimensionesOptimizadasPagina(
        $width,
        $height,
        PAGE_MAX_WIDTH,
        PAGE_MAX_HEIGHT
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

    $nombreArchivo = "pagina_" . bin2hex(random_bytes(16)) . ".webp";
    $rutaServidorFinal = $carpetaServidor . $nombreArchivo;
    $rutaPublicaFinal = $rutaPublica . $nombreArchivo;

    $guardado = imagewebp($destino, $rutaServidorFinal, PAGE_WEBP_QUALITY);

    imagedestroy($origen);
    imagedestroy($destino);

    if (!$guardado || !is_file($rutaServidorFinal) || filesize($rutaServidorFinal) <= 0) {
        throw new Exception("No se pudo guardar la imagen optimizada");
    }

    chmod($rutaServidorFinal, 0644);

    $archivosGuardados[] = $rutaServidorFinal;

    return $rutaPublicaFinal;
}

function obtenerPaginas(mysqli $conexion, int $capituloId, int $capituloVersionId = 0): array {
    if ($capituloVersionId > 0) {
        $stmtPaginas = $conexion->prepare(
            "SELECT id, numero_pagina, imagen, creado_en
             FROM capitulo_paginas
             WHERE capitulo_version_id = ?
             ORDER BY numero_pagina ASC"
        );

        $stmtPaginas->bind_param("i", $capituloVersionId);
    } else {
        $stmtPaginas = $conexion->prepare(
            "SELECT id, numero_pagina, imagen, creado_en
             FROM capitulo_paginas
             WHERE capitulo_id = ?
               AND capitulo_version_id IS NULL
             ORDER BY numero_pagina ASC"
        );

        $stmtPaginas->bind_param("i", $capituloId);
    }

    $stmtPaginas->execute();

    $resultPaginas = $stmtPaginas->get_result();

    $paginas = [];

    while ($pagina = $resultPaginas->fetch_assoc()) {
        $paginas[] = [
            "id" => (int)$pagina["id"],
            "numeroPagina" => (int)$pagina["numero_pagina"],
            "imagen" => $pagina["imagen"],
            "creadoEn" => $pagina["creado_en"]
        ];
    }

    return $paginas;
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $usuarioId = require_auth();

    check_rate_limit($conexion, (string)$usuarioId, "agregar_paginas_capitulo", 30, 3600);

    $capituloId = intval($_POST["capitulo_id"] ?? 0);
    $capituloVersionId = intval($_POST["capitulo_version_id"] ?? 0);

    if ($capituloId <= 0 && $capituloVersionId <= 0) {
        json_error("Falta el id del capítulo", 400);
    }

    if ($capituloVersionId > 0) {
        $stmtVersion = $conexion->prepare(
            "SELECT
                cv.id,
                cv.capitulo_id,
                o.usuario_id
             FROM capitulo_versiones cv
             INNER JOIN capitulos c ON c.id = cv.capitulo_id
             INNER JOIN obras o ON o.id = c.obra_id
             WHERE cv.id = ?
             LIMIT 1"
        );

        $stmtVersion->bind_param("i", $capituloVersionId);
        $stmtVersion->execute();

        $resultVersion = $stmtVersion->get_result();

        if ($resultVersion->num_rows === 0) {
            json_error("Versión de capítulo no encontrada", 404);
        }

        $version = $resultVersion->fetch_assoc();

        if ((int)$version["usuario_id"] !== $usuarioId) {
            json_error("No tienes permiso para modificar este capítulo", 403);
        }

        $capituloVersionCapituloId = (int)$version["capitulo_id"];

        if ($capituloId > 0 && $capituloId !== $capituloVersionCapituloId) {
            json_error("La versión no pertenece al capítulo indicado", 400);
        }

        $capituloId = $capituloVersionCapituloId;
    } else {
        require_capitulo_owner($conexion, $capituloId, $usuarioId);
    }

    if (!isset($_FILES["paginas"])) {
        json_error("No llegó el campo paginas en la petición", 400);
    }

    if (empty($_FILES["paginas"]["name"][0])) {
        json_error("Debes seleccionar al menos una imagen", 400);
    }

    $total = count($_FILES["paginas"]["name"]);

    if ($total <= 0) {
        json_error("Debes seleccionar al menos una imagen", 400);
    }

    $totalBytes = 0;

    for ($i = 0; $i < $total; $i++) {
        if ($_FILES["paginas"]["error"][$i] !== UPLOAD_ERR_OK) {
            json_error("Una página no se subió correctamente", 400);
        }

        $totalBytes += (int)$_FILES["paginas"]["size"][$i];
    }

    if ($totalBytes > MAX_TOTAL_PAGES_SIZE) {
        json_error("El peso total de las páginas es demasiado grande", 400);
    }

    $conexion->begin_transaction();

    if ($capituloVersionId > 0) {
        $stmtMax = $conexion->prepare(
            "SELECT COALESCE(MAX(numero_pagina), 0) AS maximo
             FROM capitulo_paginas
             WHERE capitulo_version_id = ?"
        );

        $stmtMax->bind_param("i", $capituloVersionId);
    } else {
        $stmtMax = $conexion->prepare(
            "SELECT COALESCE(MAX(numero_pagina), 0) AS maximo
             FROM capitulo_paginas
             WHERE capitulo_id = ?
               AND capitulo_version_id IS NULL"
        );

        $stmtMax->bind_param("i", $capituloId);
    }

    $stmtMax->execute();

    $resultMax = $stmtMax->get_result();
    $rowMax = $resultMax->fetch_assoc();

    $numeroPagina = (int)$rowMax["maximo"];
    $insertadas = 0;
    $insertIds = [];

    for ($i = 0; $i < $total; $i++) {
        $archivoPagina = [
            "name" => $_FILES["paginas"]["name"][$i],
            "type" => $_FILES["paginas"]["type"][$i],
            "tmp_name" => $_FILES["paginas"]["tmp_name"][$i],
            "error" => $_FILES["paginas"]["error"][$i],
            "size" => $_FILES["paginas"]["size"][$i]
        ];

        $rutaPagina = guardarPaginaAdminOptimizadaWebp(
            $archivoPagina,
            $archivosGuardados
        );

        $numeroPagina++;

        if ($capituloVersionId > 0) {
            $stmtInsert = $conexion->prepare(
                "INSERT INTO capitulo_paginas
                (capitulo_id, capitulo_version_id, numero_pagina, imagen)
                VALUES (?, ?, ?, ?)"
            );

            $stmtInsert->bind_param("iiis", $capituloId, $capituloVersionId, $numeroPagina, $rutaPagina);
        } else {
            $stmtInsert = $conexion->prepare(
                "INSERT INTO capitulo_paginas
                (capitulo_id, capitulo_version_id, numero_pagina, imagen)
                VALUES (?, NULL, ?, ?)"
            );

            $stmtInsert->bind_param("iis", $capituloId, $numeroPagina, $rutaPagina);
        }

        $stmtInsert->execute();

        if ($stmtInsert->affected_rows !== 1) {
            throw new Exception("No se insertó la página en la base de datos");
        }

        $insertadas++;
        $insertIds[] = $conexion->insert_id;
    }

    if ($insertadas <= 0) {
        throw new Exception("No se pudo agregar ninguna página");
    }

    $conexion->commit();

    $paginas = obtenerPaginas($conexion, $capituloId, $capituloVersionId);

    json_success([
        "mensaje" => "Páginas agregadas correctamente",
        "insertadas" => $insertadas,
        "insertIds" => $insertIds,
        "capituloId" => $capituloId,
        "capituloVersionId" => $capituloVersionId > 0 ? $capituloVersionId : null,
        "paginas" => $paginas
    ]);

} catch (Throwable $e) {
    if (isset($conexion)) {
        $conexion->rollback();
    }

    foreach ($archivosGuardados as $archivo) {
        if (is_file($archivo)) {
            unlink($archivo);
        }
    }

    handle_exception($e);
}
?>