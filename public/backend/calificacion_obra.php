<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";

function obraExiste(mysqli $conexion, int $obraId): bool {
    $stmt = $conexion->prepare(
        "SELECT id
         FROM obras
         WHERE id = ?
         LIMIT 1"
    );

    $stmt->bind_param("i", $obraId);
    $stmt->execute();

    $result = $stmt->get_result();

    return $result->num_rows > 0;
}

function obtenerResumenCalificacion(mysqli $conexion, int $obraId, int $usuarioId = 0): array {
    $stmt = $conexion->prepare(
        "SELECT
            COUNT(*) AS total_calificaciones,
            AVG(calificacion) AS promedio
         FROM obra_calificaciones
         WHERE obra_id = ?"
    );

    $stmt->bind_param("i", $obraId);
    $stmt->execute();

    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    $miCalificacion = 0;

    if ($usuarioId > 0) {
        $stmtMi = $conexion->prepare(
            "SELECT calificacion
             FROM obra_calificaciones
             WHERE obra_id = ? AND usuario_id = ?
             LIMIT 1"
        );

        $stmtMi->bind_param("ii", $obraId, $usuarioId);
        $stmtMi->execute();

        $resultMi = $stmtMi->get_result();

        if ($resultMi->num_rows > 0) {
            $miRow = $resultMi->fetch_assoc();
            $miCalificacion = (int)$miRow["calificacion"];
        }
    }

    $totalCalificaciones = (int)($row["total_calificaciones"] ?? 0);
    $promedio = $row["promedio"] !== null
        ? round((float)$row["promedio"], 1)
        : 0;

    return [
        "promedio" => $promedio,
        "totalCalificaciones" => $totalCalificaciones,
        "miCalificacion" => $miCalificacion
    ];
}

try {
    $conexion = get_db();
    $method = $_SERVER["REQUEST_METHOD"];

    if ($method === "GET") {
        check_rate_limit($conexion, get_client_ip(), "calificacion_obra_get", 500, 3600);

        $obraId = intval($_GET["obra_id"] ?? 0);

        if ($obraId <= 0) {
            json_error("Falta el id de la obra", 400);
        }

        if (!obraExiste($conexion, $obraId)) {
            json_error("Obra no encontrada", 404);
        }

        $usuarioId = current_user_id();
        $resumen = obtenerResumenCalificacion($conexion, $obraId, $usuarioId);

        json_success([
            "obraId" => $obraId,
            "promedio" => $resumen["promedio"],
            "totalCalificaciones" => $resumen["totalCalificaciones"],
            "miCalificacion" => $resumen["miCalificacion"]
        ]);
    }

    if ($method === "POST") {
        require_csrf();

        $usuarioId = require_auth();

        check_rate_limit($conexion, (string)$usuarioId, "calificacion_obra_post", 120, 3600);

        $input = read_json_body();

        $obraId = intval($input["obra_id"] ?? 0);
        $calificacion = intval($input["calificacion"] ?? 0);

        if ($obraId <= 0) {
            json_error("Falta el id de la obra", 400);
        }

        if ($calificacion < 1 || $calificacion > 5) {
            json_error("La calificación debe estar entre 1 y 5", 400);
        }

        if (!obraExiste($conexion, $obraId)) {
            json_error("Obra no encontrada", 404);
        }

        $stmt = $conexion->prepare(
            "INSERT INTO obra_calificaciones
             (obra_id, usuario_id, calificacion)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                calificacion = VALUES(calificacion),
                actualizado_en = CURRENT_TIMESTAMP"
        );

        $stmt->bind_param("iii", $obraId, $usuarioId, $calificacion);
        $stmt->execute();

        $resumen = obtenerResumenCalificacion($conexion, $obraId, $usuarioId);

        json_success([
            "mensaje" => "Calificación guardada",
            "obraId" => $obraId,
            "promedio" => $resumen["promedio"],
            "totalCalificaciones" => $resumen["totalCalificaciones"],
            "miCalificacion" => $resumen["miCalificacion"]
        ]);
    }

    json_error("Método no permitido", 405);

} catch (Throwable $e) {
    handle_exception($e);
}
?>