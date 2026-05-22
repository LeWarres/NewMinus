<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";

function borrarArchivoPublicoCapitulo(?string $rutaPublica): void {
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

    if ($baseUploads && $archivo && strpos($archivo, $baseUploads) === 0 && is_file($archivo)) {
        unlink($archivo);
    }
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $usuarioId = require_auth();

    $input = read_json_body();

    $capituloVersionId = intval($input["capitulo_version_id"] ?? 0);
    $capituloIdInput = intval($input["capitulo_id"] ?? 0);

    if ($capituloVersionId <= 0) {
        json_error("Falta el id de la versión del capítulo", 400);
    }

    $stmtVersion = $conexion->prepare(
        "SELECT
            cv.id,
            cv.capitulo_id,
            cv.idioma,
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

    $capituloId = (int)$version["capitulo_id"];

    if ($capituloIdInput > 0 && $capituloIdInput !== $capituloId) {
        json_error("La versión no pertenece al capítulo indicado", 400);
    }

    $idioma = strtoupper(trim((string)$version["idioma"]));
    $imagenesABorrar = [];

    $conexion->begin_transaction();

    $stmtPaginasVersion = $conexion->prepare(
        "SELECT imagen
         FROM capitulo_paginas
         WHERE capitulo_version_id = ?"
    );

    $stmtPaginasVersion->bind_param("i", $capituloVersionId);
    $stmtPaginasVersion->execute();

    $resultPaginasVersion = $stmtPaginasVersion->get_result();

    while ($row = $resultPaginasVersion->fetch_assoc()) {
        $imagenesABorrar[] = $row["imagen"];
    }

    $stmtDeletePaginasVersion = $conexion->prepare(
        "DELETE FROM capitulo_paginas
         WHERE capitulo_version_id = ?"
    );

    $stmtDeletePaginasVersion->bind_param("i", $capituloVersionId);
    $stmtDeletePaginasVersion->execute();

    $stmtDeleteVersion = $conexion->prepare(
        "DELETE FROM capitulo_versiones
         WHERE id = ?"
    );

    $stmtDeleteVersion->bind_param("i", $capituloVersionId);
    $stmtDeleteVersion->execute();

    $stmtCount = $conexion->prepare(
        "SELECT COUNT(*) AS total
         FROM capitulo_versiones
         WHERE capitulo_id = ?"
    );

    $stmtCount->bind_param("i", $capituloId);
    $stmtCount->execute();

    $resultCount = $stmtCount->get_result();
    $rowCount = $resultCount->fetch_assoc();
    $versionesRestantes = (int)($rowCount["total"] ?? 0);

    $capituloEliminado = false;

    if ($versionesRestantes <= 0) {
        $stmtLegacyPaginas = $conexion->prepare(
            "SELECT imagen
             FROM capitulo_paginas
             WHERE capitulo_id = ?
               AND capitulo_version_id IS NULL"
        );

        $stmtLegacyPaginas->bind_param("i", $capituloId);
        $stmtLegacyPaginas->execute();

        $resultLegacyPaginas = $stmtLegacyPaginas->get_result();

        while ($row = $resultLegacyPaginas->fetch_assoc()) {
            $imagenesABorrar[] = $row["imagen"];
        }

        $stmtDeleteLegacyPaginas = $conexion->prepare(
            "DELETE FROM capitulo_paginas
             WHERE capitulo_id = ?
               AND capitulo_version_id IS NULL"
        );

        $stmtDeleteLegacyPaginas->bind_param("i", $capituloId);
        $stmtDeleteLegacyPaginas->execute();

        $stmtDeleteCapitulo = $conexion->prepare(
            "DELETE FROM capitulos
             WHERE id = ?"
        );

        $stmtDeleteCapitulo->bind_param("i", $capituloId);
        $stmtDeleteCapitulo->execute();

        $capituloEliminado = true;
    }

    $conexion->commit();

    foreach ($imagenesABorrar as $imagen) {
        borrarArchivoPublicoCapitulo($imagen);
    }

    json_success([
        "mensaje" => "Capítulo eliminado correctamente en el idioma seleccionado",
        "capituloId" => $capituloId,
        "capituloVersionId" => $capituloVersionId,
        "idioma" => $idioma,
        "capituloEliminado" => $capituloEliminado
    ]);

} catch (Throwable $e) {
    if (isset($conexion)) {
        $conexion->rollback();
    }

    handle_exception($e);
}
?>