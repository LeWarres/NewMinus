<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";

function borrarArchivoPublicoPagina(?string $rutaPublica): void {
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

    $paginaId = intval($input["pagina_id"] ?? 0);

    if ($paginaId <= 0) {
        json_error("Falta el id de la página", 400);
    }

    require_pagina_owner($conexion, $paginaId, $usuarioId);

    $stmtPagina = $conexion->prepare(
        "SELECT 
            p.id,
            p.capitulo_id,
            p.capitulo_version_id,
            p.imagen
         FROM capitulo_paginas p
         WHERE p.id = ?
         LIMIT 1"
    );

    $stmtPagina->bind_param("i", $paginaId);
    $stmtPagina->execute();

    $resultPagina = $stmtPagina->get_result();

    if ($resultPagina->num_rows === 0) {
        json_error("Página no encontrada", 404);
    }

    $pagina = $resultPagina->fetch_assoc();

    $capituloId = (int)$pagina["capitulo_id"];
    $capituloVersionId = isset($pagina["capitulo_version_id"]) ? (int)$pagina["capitulo_version_id"] : 0;
    $imagen = $pagina["imagen"];

    $conexion->begin_transaction();

    $stmtDelete = $conexion->prepare(
        "DELETE FROM capitulo_paginas
         WHERE id = ?"
    );

    $stmtDelete->bind_param("i", $paginaId);
    $stmtDelete->execute();

    if ($capituloVersionId > 0) {
        $stmtList = $conexion->prepare(
            "SELECT id
             FROM capitulo_paginas
             WHERE capitulo_version_id = ?
             ORDER BY numero_pagina ASC, id ASC"
        );

        $stmtList->bind_param("i", $capituloVersionId);
    } else {
        $stmtList = $conexion->prepare(
            "SELECT id
             FROM capitulo_paginas
             WHERE capitulo_id = ?
               AND capitulo_version_id IS NULL
             ORDER BY numero_pagina ASC, id ASC"
        );

        $stmtList->bind_param("i", $capituloId);
    }

    $stmtList->execute();

    $resultList = $stmtList->get_result();

    $nuevoNumero = 1;

    while ($row = $resultList->fetch_assoc()) {
        $pageId = (int)$row["id"];

        $stmtUpdate = $conexion->prepare(
            "UPDATE capitulo_paginas
             SET numero_pagina = ?
             WHERE id = ?"
        );

        $stmtUpdate->bind_param("ii", $nuevoNumero, $pageId);
        $stmtUpdate->execute();

        $nuevoNumero++;
    }

    $conexion->commit();

    borrarArchivoPublicoPagina($imagen);

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

    while ($paginaActual = $resultPaginas->fetch_assoc()) {
        $paginas[] = [
            "id" => (int)$paginaActual["id"],
            "numeroPagina" => (int)$paginaActual["numero_pagina"],
            "imagen" => $paginaActual["imagen"],
            "creadoEn" => $paginaActual["creado_en"]
        ];
    }

    json_success([
        "mensaje" => "Página eliminada correctamente",
        "capituloId" => $capituloId,
        "capituloVersionId" => $capituloVersionId > 0 ? $capituloVersionId : null,
        "paginas" => $paginas
    ]);

} catch (Throwable $e) {
    if (isset($conexion)) {
        $conexion->rollback();
    }

    handle_exception($e);
}
?>