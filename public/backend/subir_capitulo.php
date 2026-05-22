<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";

$archivosGuardados = [];

/*
  Límites para proteger almacenamiento.
  No limitamos cantidad de páginas, pero sí:
  - peso máximo por página
  - peso total antes de optimizar
  - dimensiones máximas razonables
*/
const MAX_PAGE_SIZE = 8 * 1024 * 1024;          // 8 MB por imagen original
const MAX_TOTAL_PAGES_SIZE = 300 * 1024 * 1024; // 300 MB total antes de optimizar

const PAGE_MAX_WIDTH = 1600;
const PAGE_MAX_HEIGHT = 5000;
const PAGE_WEBP_QUALITY = 78;

const MAX_IMAGE_PIXELS = 45000000; // 45 MP

function idiomasPermitidosCapituloUpload(): array {
    return [
        "GLOBAL",
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

function normalizarIdiomaCapituloUpload(?string $idioma): string {
    $idioma = strtoupper(trim((string)$idioma));

    if ($idioma === "") {
        return "GLOBAL";
    }

    if (!in_array($idioma, idiomasPermitidosCapituloUpload(), true)) {
        return "GLOBAL";
    }

    return $idioma;
}

function sanitizarUidVersionCapitulo(string $uid): string {
    $uid = preg_replace('/[^a-zA-Z0-9_]/', '', $uid);
    return trim((string)$uid);
}

function validarImagenSubidaCapitulo(array $archivo, int $maxFileSize): array {
    if (!isset($archivo) || $archivo["error"] !== UPLOAD_ERR_OK) {
        throw new Exception("No se recibió una imagen válida");
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

function crearImagenDesdeArchivoCapitulo(string $tmpName, string $mime) {
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

function aplicarOrientacionJpegCapitulo($imagen, string $tmpName, string $mime) {
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

function calcularDimensionesOptimizadasCapitulo(
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

function guardarImagenCapituloOptimizadaWebp(
    array $archivo,
    string $carpeta,
    string $rutaPublica,
    string $prefijo,
    int $maxFileSize,
    int $maxWidth,
    int $maxHeight,
    int $quality,
    array &$archivosGuardados
): string {
    if (!function_exists("imagewebp")) {
        throw new Exception("El servidor no tiene soporte para optimizar imágenes WEBP");
    }

    $datosImagen = validarImagenSubidaCapitulo($archivo, $maxFileSize);

    if (!is_dir($carpeta)) {
        if (!mkdir($carpeta, 0755, true)) {
            throw new Exception("No se pudo crear la carpeta de subida");
        }
    }

    if (!is_writable($carpeta)) {
        throw new Exception("La carpeta de subida no tiene permisos de escritura");
    }

    $origen = crearImagenDesdeArchivoCapitulo(
        $archivo["tmp_name"],
        $datosImagen["mime"]
    );

    if (!$origen) {
        throw new Exception("No se pudo procesar la imagen");
    }

    $origen = aplicarOrientacionJpegCapitulo(
        $origen,
        $archivo["tmp_name"],
        $datosImagen["mime"]
    );

    $width = imagesx($origen);
    $height = imagesy($origen);

    [$newWidth, $newHeight] = calcularDimensionesOptimizadasCapitulo(
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

    $nombre = $prefijo . bin2hex(random_bytes(16)) . ".webp";
    $rutaServidor = $carpeta . $nombre;
    $rutaPublicaFinal = $rutaPublica . $nombre;

    $guardado = imagewebp($destino, $rutaServidor, $quality);

    imagedestroy($origen);
    imagedestroy($destino);

    if (!$guardado || !is_file($rutaServidor) || filesize($rutaServidor) <= 0) {
        throw new Exception("No se pudo guardar la imagen optimizada");
    }

    chmod($rutaServidor, 0644);

    $archivosGuardados[] = $rutaServidor;

    return $rutaPublicaFinal;
}

function obtenerArchivosVersionCapitulo(string $fieldName): array {
    if (!isset($_FILES[$fieldName]) || empty($_FILES[$fieldName]["name"][0])) {
        return [];
    }

    $archivos = [];
    $total = count($_FILES[$fieldName]["name"]);

    for ($i = 0; $i < $total; $i++) {
        $archivos[] = [
            "name" => $_FILES[$fieldName]["name"][$i],
            "type" => $_FILES[$fieldName]["type"][$i],
            "tmp_name" => $_FILES[$fieldName]["tmp_name"][$i],
            "error" => $_FILES[$fieldName]["error"][$i],
            "size" => $_FILES[$fieldName]["size"][$i]
        ];
    }

    return $archivos;
}

function normalizarVersionesCapituloDesdeRequest(): array {
    $versionesRaw = trim($_POST["idiomaVersiones"] ?? "");

    if ($versionesRaw === "") {
        $idioma = normalizarIdiomaCapituloUpload($_POST["idioma"] ?? "GLOBAL");
        $titulo = trim($_POST["titulo"] ?? "");
        $descripcion = trim($_POST["descripcion"] ?? "");

        return [[
            "uid" => "legacy",
            "field" => "paginas",
            "idioma" => $idioma,
            "titulo" => $titulo,
            "descripcion" => $descripcion,
            "archivos" => obtenerArchivosVersionCapitulo("paginas")
        ]];
    }

    $decoded = json_decode($versionesRaw, true);

    if (!is_array($decoded) || count($decoded) === 0) {
        json_error("Debes agregar al menos un idioma", 400);
    }

    $versiones = [];
    $idiomasUsados = [];

    foreach ($decoded as $versionRaw) {
        if (!is_array($versionRaw)) {
            json_error("Una versión de idioma no es válida", 400);
        }

        $uid = sanitizarUidVersionCapitulo((string)($versionRaw["uid"] ?? ""));
        $idioma = normalizarIdiomaCapituloUpload($versionRaw["idioma"] ?? "GLOBAL");
        $titulo = trim((string)($versionRaw["titulo"] ?? ""));
        $descripcion = trim((string)($versionRaw["descripcion"] ?? ""));

        if ($uid === "") {
            json_error("Una versión de idioma no tiene identificador válido", 400);
        }

        if (in_array($idioma, $idiomasUsados, true)) {
            json_error("No puedes repetir el mismo idioma en este capítulo", 400);
        }

        if (strlen($titulo) > 150) {
            json_error("El título del capítulo es demasiado largo", 400);
        }

        if (strlen($descripcion) > 5000) {
            json_error("La descripción del capítulo es demasiado larga", 400);
        }

        $field = "paginas_" . $uid;
        $archivos = obtenerArchivosVersionCapitulo($field);

        if (count($archivos) === 0) {
            json_error("Cada idioma debe tener al menos una página", 400);
        }

        $versiones[] = [
            "uid" => $uid,
            "field" => $field,
            "idioma" => $idioma,
            "titulo" => $titulo,
            "descripcion" => $descripcion,
            "archivos" => $archivos
        ];

        $idiomasUsados[] = $idioma;
    }

    return $versiones;
}


function obtenerSiguienteNumeroCapituloPorIdioma(mysqli $conexion, int $obraId, string $idioma): int {
    $stmt = $conexion->prepare(
        "SELECT COALESCE(MAX(c.numero_capitulo), 0) AS ultimo
         FROM capitulos c
         INNER JOIN capitulo_versiones cv ON cv.capitulo_id = c.id
         WHERE c.obra_id = ? AND cv.idioma = ?"
    );

    $stmt->bind_param("is", $obraId, $idioma);
    $stmt->execute();

    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    return ((int)($row["ultimo"] ?? 0)) + 1;
}

function buscarCapituloPorNumero(mysqli $conexion, int $obraId, int $numeroCapitulo): int {
    $stmt = $conexion->prepare(
        "SELECT id
         FROM capitulos
         WHERE obra_id = ? AND numero_capitulo = ?
         ORDER BY id ASC
         LIMIT 1"
    );

    $stmt->bind_param("ii", $obraId, $numeroCapitulo);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        return 0;
    }

    $row = $result->fetch_assoc();
    return (int)$row["id"];
}

function existeVersionCapituloIdioma(mysqli $conexion, int $capituloId, string $idioma): bool {
    $stmt = $conexion->prepare(
        "SELECT id
         FROM capitulo_versiones
         WHERE capitulo_id = ? AND idioma = ?
         LIMIT 1"
    );

    $stmt->bind_param("is", $capituloId, $idioma);
    $stmt->execute();

    $result = $stmt->get_result();
    return $result->num_rows > 0;
}

function crearCapituloBase(
    mysqli $conexion,
    int $obraId,
    int $numeroCapitulo,
    string $titulo,
    string $descripcion
): int {
    $stmt = $conexion->prepare(
        "INSERT INTO capitulos
        (obra_id, numero_capitulo, titulo, descripcion)
        VALUES (?, ?, ?, ?)"
    );

    $stmt->bind_param(
        "iiss",
        $obraId,
        $numeroCapitulo,
        $titulo,
        $descripcion
    );

    $stmt->execute();

    return (int)$conexion->insert_id;
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $usuarioId = require_auth();

    check_rate_limit($conexion, (string)$usuarioId, "subir_capitulo", 20, 3600);

    $obraId = intval($_POST["obra_id"] ?? 0);

    if ($obraId <= 0) {
        json_error("Falta el id de la obra", 400);
    }

    require_obra_owner($conexion, $obraId, $usuarioId);

    $versiones = normalizarVersionesCapituloDesdeRequest();

    $totalPagesBytes = 0;

    foreach ($versiones as $version) {
        foreach ($version["archivos"] as $archivo) {
            if ($archivo["error"] !== UPLOAD_ERR_OK) {
                json_error("Una página no se subió correctamente", 400);
            }

            $totalPagesBytes += (int)$archivo["size"];
        }
    }

    if ($totalPagesBytes > MAX_TOTAL_PAGES_SIZE) {
        json_error("El peso total de las páginas es demasiado grande", 400);
    }

    $stmtObra = $conexion->prepare(
        "SELECT id, titulo, descripcion
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

    $conexion->begin_transaction();

    $paginasGuardadas = 0;
    $versionesGuardadas = 0;
    $versionesRespuesta = [];

    foreach ($versiones as $version) {
        $idiomaVersion = $version["idioma"];

        /*
          Numeración automática por idioma:
          - Si el idioma ya tiene capítulos, usa el siguiente número de ese idioma.
          - Si el idioma no tiene capítulos, empieza en 1.
          - Si ya existe un capítulo base con ese número, se agrega la versión a ese capítulo.
          - Si no existe, se crea el capítulo base.
        */
        $numeroCapitulo = obtenerSiguienteNumeroCapituloPorIdioma(
            $conexion,
            $obraId,
            $idiomaVersion
        );

        if ($numeroCapitulo <= 0) {
            json_error("Número de capítulo inválido", 400);
        }

        $tituloVersion = trim($version["titulo"]);
        $descripcionVersion = trim($version["descripcion"]);

        if ($tituloVersion === "") {
            $tituloVersion = "Capítulo " . $numeroCapitulo;
        }

        $capituloId = buscarCapituloPorNumero(
            $conexion,
            $obraId,
            $numeroCapitulo
        );

        if ($capituloId > 0 && existeVersionCapituloIdioma($conexion, $capituloId, $idiomaVersion)) {
            json_error("Ya existe una versión con ese idioma para este capítulo", 409);
        }

        if ($capituloId <= 0) {
            $capituloId = crearCapituloBase(
                $conexion,
                $obraId,
                $numeroCapitulo,
                $tituloVersion,
                $descripcionVersion
            );
        }

        $stmtObraIdioma = $conexion->prepare(
            "INSERT INTO obra_idiomas
            (obra_id, idioma, titulo, descripcion, es_principal)
            VALUES (?, ?, ?, ?, 0)
            ON DUPLICATE KEY UPDATE
              actualizado_en = NOW()"
        );

        $tituloObraIdioma = $obra["titulo"];
        $descripcionObraIdioma = $obra["descripcion"];

        $stmtObraIdioma->bind_param(
            "isss",
            $obraId,
            $idiomaVersion,
            $tituloObraIdioma,
            $descripcionObraIdioma
        );

        $stmtObraIdioma->execute();

        $stmtVersion = $conexion->prepare(
            "INSERT INTO capitulo_versiones
            (capitulo_id, idioma, titulo, descripcion, num_visitas, publicado)
            VALUES (?, ?, ?, ?, 0, 1)"
        );

        $stmtVersion->bind_param(
            "isss",
            $capituloId,
            $idiomaVersion,
            $tituloVersion,
            $descripcionVersion
        );

        $stmtVersion->execute();
        $capituloVersionId = (int)$conexion->insert_id;
        $versionesGuardadas++;

        $numeroPagina = 1;

        foreach ($version["archivos"] as $archivoPagina) {
            $rutaPagina = guardarImagenCapituloOptimizadaWebp(
                $archivoPagina,
                __DIR__ . "/../uploads/paginas/",
                "uploads/paginas/",
                "pagina_",
                MAX_PAGE_SIZE,
                PAGE_MAX_WIDTH,
                PAGE_MAX_HEIGHT,
                PAGE_WEBP_QUALITY,
                $archivosGuardados
            );

            $stmtPagina = $conexion->prepare(
                "INSERT INTO capitulo_paginas
                (capitulo_id, capitulo_version_id, numero_pagina, imagen)
                VALUES (?, ?, ?, ?)"
            );

            $stmtPagina->bind_param(
                "iiis",
                $capituloId,
                $capituloVersionId,
                $numeroPagina,
                $rutaPagina
            );

            $stmtPagina->execute();

            $numeroPagina++;
            $paginasGuardadas++;
        }

        $versionesRespuesta[] = [
            "idioma" => $idiomaVersion,
            "capituloId" => (int)$capituloId,
            "capituloVersionId" => (int)$capituloVersionId,
            "numeroCapitulo" => (int)$numeroCapitulo,
            "paginasGuardadas" => count($version["archivos"])
        ];
    }

    if ($paginasGuardadas <= 0 || $versionesGuardadas <= 0) {
        throw new Exception("No se pudo guardar ninguna página");
    }

    $conexion->commit();

    $primeraVersionRespuesta = $versionesRespuesta[0];

    json_success([
        "mensaje" => "Capítulo subido correctamente",
        "obra_id" => (int)$obraId,
        "capitulo_id" => (int)$primeraVersionRespuesta["capituloId"],
        "capitulo_version_id" => (int)$primeraVersionRespuesta["capituloVersionId"],
        "numero_capitulo" => (int)$primeraVersionRespuesta["numeroCapitulo"],
        "idioma" => $primeraVersionRespuesta["idioma"],
        "versiones" => $versionesRespuesta,
        "versiones_guardadas" => (int)$versionesGuardadas,
        "paginas_guardadas" => (int)$paginasGuardadas
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
