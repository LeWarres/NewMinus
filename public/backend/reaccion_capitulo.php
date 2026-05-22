<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";

function obtenerCapituloReaccion(mysqli $conexion, int $capituloId): ?array {
    $stmt = $conexion->prepare(
        "SELECT id, obra_id, numero_capitulo
         FROM capitulos
         WHERE id = ?
         LIMIT 1"
    );

    $stmt->bind_param("i", $capituloId);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        return null;
    }

    $row = $result->fetch_assoc();

    return [
        "id" => (int)$row["id"],
        "obraId" => (int)$row["obra_id"],
        "numeroCapitulo" => (int)$row["numero_capitulo"]
    ];
}

function obtenerResumenReacciones(mysqli $conexion, int $capituloId, int $usuarioId = 0): array {
    $stmt = $conexion->prepare(
        "SELECT
            SUM(CASE WHEN reaccion = 1 THEN 1 ELSE 0 END) AS total_likes,
            SUM(CASE WHEN reaccion = -1 THEN 1 ELSE 0 END) AS total_dislikes
         FROM capitulo_reacciones
         WHERE capitulo_id = ?"
    );

    $stmt->bind_param("i", $capituloId);
    $stmt->execute();

    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    $miReaccion = 0;

    if ($usuarioId > 0) {
        $stmtMiReaccion = $conexion->prepare(
            "SELECT reaccion
             FROM capitulo_reacciones
             WHERE capitulo_id = ? AND usuario_id = ?
             LIMIT 1"
        );

        $stmtMiReaccion->bind_param("ii", $capituloId, $usuarioId);
        $stmtMiReaccion->execute();

        $resultMiReaccion = $stmtMiReaccion->get_result();

        if ($resultMiReaccion->num_rows > 0) {
            $miRow = $resultMiReaccion->fetch_assoc();
            $miReaccion = (int)$miRow["reaccion"];
        }
    }

    return [
        "totalLikes" => (int)($row["total_likes"] ?? 0),
        "totalDislikes" => (int)($row["total_dislikes"] ?? 0),
        "miReaccion" => $miReaccion
    ];
}

try {
    $conexion = get_db();
    $method = $_SERVER["REQUEST_METHOD"];

    if ($method === "GET") {
        check_rate_limit($conexion, get_client_ip(), "reaccion_capitulo_get", 500, 3600);

        $capituloId = intval($_GET["capitulo_id"] ?? 0);

        if ($capituloId <= 0) {
            json_error("Falta el id del capítulo", 400);
        }

        $capitulo = obtenerCapituloReaccion($conexion, $capituloId);

        if (!$capitulo) {
            json_error("Capítulo no encontrado", 404);
        }

        $usuarioId = current_user_id();
        $resumen = obtenerResumenReacciones($conexion, $capituloId, $usuarioId);

        json_success([
            "obraId" => $capitulo["obraId"],
            "capituloId" => $capituloId,
            "totalLikes" => $resumen["totalLikes"],
            "totalDislikes" => $resumen["totalDislikes"],
            "miReaccion" => $resumen["miReaccion"]
        ]);
    }

    if ($method === "POST") {
        require_csrf();

        $usuarioId = require_auth();

        check_rate_limit($conexion, (string)$usuarioId, "reaccion_capitulo_post", 120, 3600);

        $input = read_json_body();

        $capituloId = intval($input["capitulo_id"] ?? 0);
        $reaccion = intval($input["reaccion"] ?? 0);

        if ($capituloId <= 0) {
            json_error("Falta el id del capítulo", 400);
        }

        if (!in_array($reaccion, [-1, 0, 1], true)) {
            json_error("La reacción no es válida", 400);
        }

        $capitulo = obtenerCapituloReaccion($conexion, $capituloId);

        if (!$capitulo) {
            json_error("Capítulo no encontrado", 404);
        }

        $obraId = (int)$capitulo["obraId"];

        if ($reaccion === 0) {
            $stmtDelete = $conexion->prepare(
                "DELETE FROM capitulo_reacciones
                 WHERE capitulo_id = ? AND usuario_id = ?"
            );

            $stmtDelete->bind_param("ii", $capituloId, $usuarioId);
            $stmtDelete->execute();
        } else {
            $stmt = $conexion->prepare(
                "INSERT INTO capitulo_reacciones
                 (obra_id, capitulo_id, usuario_id, reaccion)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    reaccion = VALUES(reaccion),
                    actualizado_en = CURRENT_TIMESTAMP"
            );

            $stmt->bind_param("iiii", $obraId, $capituloId, $usuarioId, $reaccion);
            $stmt->execute();
        }

        $resumen = obtenerResumenReacciones($conexion, $capituloId, $usuarioId);

        json_success([
            "mensaje" => "Tu reacción fue guardada",
            "obraId" => $obraId,
            "capituloId" => $capituloId,
            "totalLikes" => $resumen["totalLikes"],
            "totalDislikes" => $resumen["totalDislikes"],
            "miReaccion" => $resumen["miReaccion"]
        ]);
    }

    json_error("Método no permitido", 405);

} catch (Throwable $e) {
    handle_exception($e);
}
?>