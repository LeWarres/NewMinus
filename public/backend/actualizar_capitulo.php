<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $usuarioId = require_auth();

    $input = read_json_body();

    $capituloId = intval($input["capitulo_id"] ?? 0);
    $capituloVersionId = intval($input["capitulo_version_id"] ?? 0);
    $titulo = trim($input["titulo"] ?? "");
    $descripcion = trim($input["descripcion"] ?? "");

    if ($capituloId <= 0 && $capituloVersionId <= 0) {
        json_error("Falta el id del capítulo", 400);
    }

    if (strlen($descripcion) > 5000) {
        json_error("La descripción del capítulo es demasiado larga", 400);
    }

    if ($capituloVersionId > 0) {
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

        $capituloVersionCapituloId = (int)$version["capitulo_id"];

        if ($capituloId > 0 && $capituloId !== $capituloVersionCapituloId) {
            json_error("La versión no pertenece al capítulo indicado", 400);
        }

        $capituloId = $capituloVersionCapituloId;
    } else {
        require_capitulo_owner($conexion, $capituloId, $usuarioId);
    }

    if (strlen($titulo) > 150) {
        json_error("El título del capítulo es demasiado largo", 400);
    }

    if ($capituloVersionId > 0) {
        $stmtUpdate = $conexion->prepare(
            "UPDATE capitulo_versiones
             SET titulo = ?,
                 descripcion = ?
             WHERE id = ?"
        );

        $stmtUpdate->bind_param(
            "ssi",
            $titulo,
            $descripcion,
            $capituloVersionId
        );

        $stmtUpdate->execute();
    } else {
        $stmtUpdate = $conexion->prepare(
            "UPDATE capitulos
             SET titulo = ?,
                 descripcion = ?
             WHERE id = ?"
        );

        $stmtUpdate->bind_param(
            "ssi",
            $titulo,
            $descripcion,
            $capituloId
        );

        $stmtUpdate->execute();
    }

    json_success([
        "mensaje" => "Capítulo actualizado correctamente",
        "capitulo_id" => $capituloId,
        "capitulo_version_id" => $capituloVersionId > 0 ? $capituloVersionId : null
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>