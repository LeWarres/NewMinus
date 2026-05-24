<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";
require_once __DIR__ . "/_core/catalogos.php";

$archivosGuardados = [];

const MAX_COVER_SIZE = 5 * 1024 * 1024;
const MAX_PAGE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_PAGES_SIZE = 300 * 1024 * 1024;

const COVER_MAX_WIDTH = 900;
const COVER_MAX_HEIGHT = 1400;
const COVER_WEBP_QUALITY = 82;

const PAGE_MAX_WIDTH = 1600;
const PAGE_MAX_HEIGHT = 5000;
const PAGE_WEBP_QUALITY = 78;

const MAX_IMAGE_PIXELS = 45000000;

function validarImagenSubida(array $archivo, int $maxFileSize): array {
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

function crearImagenDesdeArchivo(string $tmpName, string $mime) {
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

function aplicarOrientacionJpeg($imagen, string $tmpName, string $mime) {
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

function calcularDimensionesOptimizadas(int $width, int $height, int $maxWidth, int $maxHeight): array {
    $scale = min(
        1,
        $maxWidth / $width,
        $maxHeight / $height
    );

    $newWidth = max(1, (int)round($width * $scale));
    $newHeight = max(1, (int)round($height * $scale));

    return [$newWidth, $newHeight];
}

function guardarImagenOptimizadaWebp(
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

    $datosImagen = validarImagenSubida($archivo, $maxFileSize);

    if (!is_dir($carpeta)) {
        if (!mkdir($carpeta, 0755, true)) {
            throw new Exception("No se pudo crear la carpeta de subida");
        }
    }

    if (!is_writable($carpeta)) {
        throw new Exception("La carpeta de subida no tiene permisos de escritura");
    }

    $origen = crearImagenDesdeArchivo($archivo["tmp_name"], $datosImagen["mime"]);

    if (!$origen) {
        throw new Exception("No se pudo procesar la imagen");
    }

    $origen = aplicarOrientacionJpeg($origen, $archivo["tmp_name"], $datosImagen["mime"]);

    $width = imagesx($origen);
    $height = imagesy($origen);

    [$newWidth, $newHeight] = calcularDimensionesOptimizadas(
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
    $rutaFinalPublica = $rutaPublica . $nombre;

    $guardado = imagewebp($destino, $rutaServidor, $quality);

    imagedestroy($origen);
    imagedestroy($destino);

    if (!$guardado || !is_file($rutaServidor) || filesize($rutaServidor) <= 0) {
        throw new Exception("No se pudo guardar la imagen optimizada");
    }

    chmod($rutaServidor, 0644);

    $archivosGuardados[] = $rutaServidor;

    return $rutaFinalPublica;
}

function archivoDesdeFilesArray(string $key, int $index): array {
    return [
        "name" => $_FILES[$key]["name"][$index],
        "type" => $_FILES[$key]["type"][$index],
        "tmp_name" => $_FILES[$key]["tmp_name"][$index],
        "error" => $_FILES[$key]["error"][$index],
        "size" => $_FILES[$key]["size"][$index]
    ];
}

function normalizarVersionesUpload(string $versionesRaw, string $tituloDefault, string $descripcionDefault, string $idiomaFallback): array {
    $permitidos = idiomasPermitidosUpload();
    $versiones = [];

    if ($versionesRaw !== "") {
        $decoded = json_decode($versionesRaw, true);

        if (!is_array($decoded)) {
            json_error("Las versiones por idioma no son válidas", 400);
        }

        foreach ($decoded as $index => $item) {
            if (!is_array($item)) {
                json_error("Una versión por idioma no es válida", 400);
            }

            $key = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)($item["key"] ?? "version_" . $index));
            $idioma = strtoupper(trim((string)($item["idioma"] ?? "")));
            $titulo = trim((string)($item["titulo"] ?? $tituloDefault));
            $descripcion = trim((string)($item["descripcion"] ?? $descripcionDefault));
            $tituloCapitulo = trim((string)($item["tituloCapitulo"] ?? "Capítulo 1"));
            $descripcionCapitulo = trim((string)($item["descripcionCapitulo"] ?? ""));

            if ($key === "") {
                json_error("Una versión no tiene identificador válido", 400);
            }

            if (!in_array($idioma, $permitidos, true)) {
                json_error("Un idioma no es válido", 400);
            }

            if ($titulo === "") {
                $titulo = $tituloDefault;
            }

            if ($tituloCapitulo === "") {
                $tituloCapitulo = "Capítulo 1";
            }

            if (strlen($titulo) > 150 || strlen($tituloCapitulo) > 150) {
                json_error("Un título es demasiado largo", 400);
            }

            if (strlen($descripcion) > 5000 || strlen($descripcionCapitulo) > 5000) {
                json_error("Una descripción es demasiado larga", 400);
            }

            $versiones[] = [
                "key" => $key,
                "idioma" => $idioma,
                "titulo" => $titulo,
                "descripcion" => $descripcion,
                "tituloCapitulo" => $tituloCapitulo,
                "descripcionCapitulo" => $descripcionCapitulo
            ];
        }
    }

    if (count($versiones) === 0) {
        $idiomaFallback = strtoupper(trim($idiomaFallback));

        if (!in_array($idiomaFallback, $permitidos, true)) {
            $idiomaFallback = "GLOBAL";
        }

        $versiones[] = [
            "key" => "legacy",
            "idioma" => $idiomaFallback,
            "titulo" => $tituloDefault,
            "descripcion" => $descripcionDefault,
            "tituloCapitulo" => "Capítulo 1",
            "descripcionCapitulo" => ""
        ];
    }

    $idiomasUsados = [];
    $keysUsados = [];

    foreach ($versiones as $version) {
        if (in_array($version["idioma"], $idiomasUsados, true)) {
            json_error("No puedes tener dos versiones del mismo idioma", 400);
        }

        if (in_array($version["key"], $keysUsados, true)) {
            json_error("Hay versiones duplicadas", 400);
        }

        $idiomasUsados[] = $version["idioma"];
        $keysUsados[] = $version["key"];
    }

    return $versiones;
}

function obtenerFilesKeyVersion(array $version): string {
    $key = "paginas_" . $version["key"];

    if (isset($_FILES[$key]) && !empty($_FILES[$key]["name"][0])) {
        return $key;
    }

    if ($version["key"] === "legacy" && isset($_FILES["paginas"]) && !empty($_FILES["paginas"]["name"][0])) {
        return "paginas";
    }

    return "";
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $usuarioId = require_auth();

    check_rate_limit($conexion, (string)$usuarioId, "upload_obra", 10, 3600);

    $titulo = trim($_POST["titulo"] ?? "");
    $descripcion = trim($_POST["descripcion"] ?? "");
    $categoriasRaw = trim($_POST["categorias"] ?? "");
    $generoFallback = trim($_POST["genero"] ?? "");
    $idioma = strtoupper(trim($_POST["idioma"] ?? ($_POST["idiomaPrincipal"] ?? "GLOBAL")));
    $tipoEntrega = strtolower(trim($_POST["tipoEntrega"] ?? "manga"));
    $versionesRaw = trim($_POST["versiones"] ?? "");

    $serieConcluida = 0;

    if ($titulo === "") {
        json_error("El título es obligatorio", 400);
    }

    if (strlen($titulo) > 150) {
        json_error("El título es demasiado largo", 400);
    }

    if (strlen($descripcion) > 5000) {
        json_error("La descripción es demasiado larga", 400);
    }

    $categorias = normalizarCategoriasUpload($categoriasRaw, $generoFallback);
    $genero = implode(",", $categorias);

    if (!in_array($idioma, idiomasPermitidosUpload(), true)) {
        $idioma = "GLOBAL";
    }

    if (!in_array($tipoEntrega, tiposEntregaPermitidosUpload(), true)) {
        $tipoEntrega = "manga";
    }

    if (!isset($_FILES["portada"])) {
        json_error("Debes seleccionar una portada", 400);
    }

    $versiones = normalizarVersionesUpload($versionesRaw, $titulo, $descripcion, $idioma);

    if (count($versiones) === 0) {
        json_error("Debes agregar al menos una versión de idioma", 400);
    }

    $totalPagesBytes = 0;

    foreach ($versiones as $version) {
        $filesKey = obtenerFilesKeyVersion($version);

        if ($filesKey === "") {
            json_error("Debes agregar al menos una página para " . $version["idioma"], 400);
        }

        $totalPaginasVersion = count($_FILES[$filesKey]["name"]);

        for ($i = 0; $i < $totalPaginasVersion; $i++) {
            if ($_FILES[$filesKey]["error"][$i] !== UPLOAD_ERR_OK) {
                json_error("Una página no se subió correctamente", 400);
            }

            $totalPagesBytes += (int)$_FILES[$filesKey]["size"][$i];
        }
    }

    if ($totalPagesBytes > MAX_TOTAL_PAGES_SIZE) {
        json_error("El peso total de las páginas es demasiado grande", 400);
    }

    $idiomaPrincipal = $versiones[0]["idioma"];

    $conexion->begin_transaction();

    $portada = guardarImagenOptimizadaWebp(
        $_FILES["portada"],
        __DIR__ . "/../uploads/portadas/",
        "uploads/portadas/",
        "portada_",
        MAX_COVER_SIZE,
        COVER_MAX_WIDTH,
        COVER_MAX_HEIGHT,
        COVER_WEBP_QUALITY,
        $archivosGuardados
    );

    $stmtObra = $conexion->prepare(
        "INSERT INTO obras
        (usuario_id, titulo, descripcion, genero, idioma, tipo_entrega, serie_concluida, portada, num_visitas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)"
    );

    $stmtObra->bind_param(
        "isssssis",
        $usuarioId,
        $titulo,
        $descripcion,
        $genero,
        $idiomaPrincipal,
        $tipoEntrega,
        $serieConcluida,
        $portada
    );

    $stmtObra->execute();
    $obraId = $conexion->insert_id;

    foreach ($versiones as $index => $version) {
        $esPrincipal = $index === 0 ? 1 : 0;

        $stmtObraIdioma = $conexion->prepare(
            "INSERT INTO obra_idiomas
            (obra_id, idioma, titulo, descripcion, es_principal)
            VALUES (?, ?, ?, ?, ?)"
        );

        $stmtObraIdioma->bind_param(
            "isssi",
            $obraId,
            $version["idioma"],
            $version["titulo"],
            $version["descripcion"],
            $esPrincipal
        );

        $stmtObraIdioma->execute();
    }

    $numeroCapitulo = 1;
    $tituloCapituloPrincipal = $versiones[0]["tituloCapitulo"];
    $descripcionCapituloPrincipal = $versiones[0]["descripcionCapitulo"];

    $stmtCapitulo = $conexion->prepare(
        "INSERT INTO capitulos
        (obra_id, numero_capitulo, titulo, descripcion)
        VALUES (?, ?, ?, ?)"
    );

    $stmtCapitulo->bind_param(
        "iiss",
        $obraId,
        $numeroCapitulo,
        $tituloCapituloPrincipal,
        $descripcionCapituloPrincipal
    );

    $stmtCapitulo->execute();
    $capituloId = $conexion->insert_id;

    $paginasGuardadas = 0;
    $versionesGuardadas = 0;

    foreach ($versiones as $version) {
        $stmtVersion = $conexion->prepare(
            "INSERT INTO capitulo_versiones
            (capitulo_id, idioma, titulo, descripcion, num_visitas, publicado)
            VALUES (?, ?, ?, ?, 0, 1)"
        );

        $stmtVersion->bind_param(
            "isss",
            $capituloId,
            $version["idioma"],
            $version["tituloCapitulo"],
            $version["descripcionCapitulo"]
        );

        $stmtVersion->execute();
        $capituloVersionId = $conexion->insert_id;
        $versionesGuardadas++;

        $filesKey = obtenerFilesKeyVersion($version);
        $totalPaginasVersion = count($_FILES[$filesKey]["name"]);

        for ($i = 0; $i < $totalPaginasVersion; $i++) {
            $archivoPagina = archivoDesdeFilesArray($filesKey, $i);

            $rutaPagina = guardarImagenOptimizadaWebp(
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

            $numeroPagina = $i + 1;

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
            $paginasGuardadas++;
        }
    }

    if ($paginasGuardadas <= 0 || $versionesGuardadas <= 0) {
        throw new Exception("No se pudo guardar ninguna página");
    }

    $conexion->commit();

    json_success([
        "mensaje" => "Obra guardada correctamente",
        "obra_id" => (int)$obraId,
        "capitulo_id" => (int)$capituloId,
        "usuario_id" => (int)$usuarioId,
        "portada" => $portada,
        "genero" => $genero,
        "idioma" => $idiomaPrincipal,
        "tipoEntrega" => $tipoEntrega,
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
