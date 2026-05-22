<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";

const COMMENT_MAX_LENGTH = 1000;

function normalizarComentarioObra(string $comentario): string {
    $comentario = trim($comentario);
    $comentario = strip_tags($comentario);
    $comentario = preg_replace("/\r\n|\r|\n/", "\n", $comentario);
    $comentario = preg_replace("/[ \t]+/", " ", $comentario);

    if (mb_strlen($comentario, "UTF-8") > COMMENT_MAX_LENGTH) {
        $comentario = mb_substr($comentario, 0, COMMENT_MAX_LENGTH, "UTF-8");
    }

    return trim($comentario);
}

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

function obtenerComentarioObraUsuario(mysqli $conexion, int $obraId, int $usuarioId): ?array {
    if ($usuarioId <= 0) {
        return null;
    }

    $stmt = $conexion->prepare(
        "SELECT 
            c.id,
            c.obra_id,
            c.usuario_id,
            c.comentario,
            c.creado_en,
            c.actualizado_en,
            u.username,
            u.img_perfil
         FROM comentarios_obras c
         INNER JOIN usuarios u ON u.id = c.usuario_id
         WHERE c.obra_id = ? AND c.usuario_id = ?
         LIMIT 1"
    );

    $stmt->bind_param("ii", $obraId, $usuarioId);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        return null;
    }

    $row = $result->fetch_assoc();

    return [
        "id" => (int)$row["id"],
        "obraId" => (int)$row["obra_id"],
        "usuarioId" => (int)$row["usuario_id"],
        "comentario" => $row["comentario"],
        "creadoEn" => $row["creado_en"],
        "actualizadoEn" => $row["actualizado_en"],
        "username" => $row["username"],
        "usuarioAvatar" => $row["img_perfil"]
    ];
}

function listarComentariosObra(mysqli $conexion, int $obraId): array {
    $stmt = $conexion->prepare(
        "SELECT 
            c.id,
            c.obra_id,
            c.usuario_id,
            c.comentario,
            c.creado_en,
            c.actualizado_en,
            u.username,
            u.img_perfil
         FROM comentarios_obras c
         INNER JOIN usuarios u ON u.id = c.usuario_id
         WHERE c.obra_id = ?
         ORDER BY c.actualizado_en DESC, c.creado_en DESC
         LIMIT 100"
    );

    $stmt->bind_param("i", $obraId);
    $stmt->execute();

    $result = $stmt->get_result();

    $comentarios = [];

    while ($row = $result->fetch_assoc()) {
        $comentarios[] = [
            "id" => (int)$row["id"],
            "obraId" => (int)$row["obra_id"],
            "usuarioId" => (int)$row["usuario_id"],
            "comentario" => $row["comentario"],
            "creadoEn" => $row["creado_en"],
            "actualizadoEn" => $row["actualizado_en"],
            "username" => $row["username"],
            "usuarioAvatar" => $row["img_perfil"]
        ];
    }

    return $comentarios;
}

try {
    $conexion = get_db();
    $method = $_SERVER["REQUEST_METHOD"];

    if ($method === "GET") {
        check_rate_limit($conexion, get_client_ip(), "comentarios_obra_get", 300, 3600);

        $obraId = intval($_GET["obra_id"] ?? 0);

        if ($obraId <= 0) {
            json_error("Falta el id de la obra", 400);
        }

        if (!obraExiste($conexion, $obraId)) {
            json_error("Obra no encontrada", 404);
        }

        $usuarioId = current_user_id();

        json_success([
            "comentarios" => listarComentariosObra($conexion, $obraId),
            "miComentario" => obtenerComentarioObraUsuario($conexion, $obraId, $usuarioId)
        ]);
    }

    if ($method === "POST") {
        require_csrf();

        $usuarioId = require_auth();

        check_rate_limit($conexion, (string)$usuarioId, "comentarios_obra_post", 30, 3600);

        $input = read_json_body();

        $obraId = intval($input["obra_id"] ?? 0);
        $comentario = normalizarComentarioObra((string)($input["comentario"] ?? ""));

        if ($obraId <= 0) {
            json_error("Falta el id de la obra", 400);
        }

        if (!obraExiste($conexion, $obraId)) {
            json_error("Obra no encontrada", 404);
        }

        if ($comentario === "") {
            json_error("El comentario no puede estar vacío", 400);
        }

        $stmt = $conexion->prepare(
            "INSERT INTO comentarios_obras
             (obra_id, usuario_id, comentario)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                comentario = VALUES(comentario),
                actualizado_en = CURRENT_TIMESTAMP"
        );

        $stmt->bind_param("iis", $obraId, $usuarioId, $comentario);
        $stmt->execute();

        json_success([
            "mensaje" => "Comentario guardado correctamente",
            "miComentario" => obtenerComentarioObraUsuario($conexion, $obraId, $usuarioId),
            "comentarios" => listarComentariosObra($conexion, $obraId)
        ]);
    }

    if ($method === "DELETE") {
        require_csrf();

        $usuarioId = require_auth();

        check_rate_limit($conexion, (string)$usuarioId, "comentarios_obra_delete", 30, 3600);

        $input = read_json_body();

        $obraId = intval($input["obra_id"] ?? ($_GET["obra_id"] ?? 0));

        if ($obraId <= 0) {
            json_error("Falta el id de la obra", 400);
        }

        $stmt = $conexion->prepare(
            "DELETE FROM comentarios_obras
             WHERE obra_id = ? AND usuario_id = ?"
        );

        $stmt->bind_param("ii", $obraId, $usuarioId);
        $stmt->execute();

        json_success([
            "mensaje" => "Comentario eliminado correctamente",
            "miComentario" => null,
            "comentarios" => listarComentariosObra($conexion, $obraId)
        ]);
    }

    json_error("Método no permitido", 405);

} catch (Throwable $e) {
    handle_exception($e);
}
?>