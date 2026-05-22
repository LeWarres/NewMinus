<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";

const COMMENT_MAX_LENGTH = 1000;

function normalizarComentarioCapitulo(string $comentario): string {
    $comentario = trim($comentario);
    $comentario = strip_tags($comentario);
    $comentario = preg_replace("/\r\n|\r|\n/", "\n", $comentario);
    $comentario = preg_replace("/[ \t]+/", " ", $comentario);

    if (mb_strlen($comentario, "UTF-8") > COMMENT_MAX_LENGTH) {
        $comentario = mb_substr($comentario, 0, COMMENT_MAX_LENGTH, "UTF-8");
    }

    return trim($comentario);
}

function obtenerCapituloComentarios(mysqli $conexion, int $capituloId): ?array {
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

function obtenerComentarioCapituloUsuario(mysqli $conexion, int $capituloId, int $usuarioId): ?array {
    if ($usuarioId <= 0) {
        return null;
    }

    $stmt = $conexion->prepare(
        "SELECT 
            c.id,
            c.obra_id,
            c.capitulo_id,
            c.usuario_id,
            c.comentario,
            c.creado_en,
            c.actualizado_en,
            u.username,
            u.img_perfil
         FROM comentarios_capitulos c
         INNER JOIN usuarios u ON u.id = c.usuario_id
         WHERE c.capitulo_id = ? AND c.usuario_id = ?
         LIMIT 1"
    );

    $stmt->bind_param("ii", $capituloId, $usuarioId);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        return null;
    }

    $row = $result->fetch_assoc();

    return [
        "id" => (int)$row["id"],
        "obraId" => (int)$row["obra_id"],
        "capituloId" => (int)$row["capitulo_id"],
        "usuarioId" => (int)$row["usuario_id"],
        "comentario" => $row["comentario"],
        "creadoEn" => $row["creado_en"],
        "actualizadoEn" => $row["actualizado_en"],
        "username" => $row["username"],
        "usuarioAvatar" => $row["img_perfil"]
    ];
}

function listarComentariosCapitulo(mysqli $conexion, int $capituloId): array {
    $stmt = $conexion->prepare(
        "SELECT 
            c.id,
            c.obra_id,
            c.capitulo_id,
            c.usuario_id,
            c.comentario,
            c.creado_en,
            c.actualizado_en,
            u.username,
            u.img_perfil
         FROM comentarios_capitulos c
         INNER JOIN usuarios u ON u.id = c.usuario_id
         WHERE c.capitulo_id = ?
         ORDER BY c.actualizado_en DESC, c.creado_en DESC
         LIMIT 100"
    );

    $stmt->bind_param("i", $capituloId);
    $stmt->execute();

    $result = $stmt->get_result();

    $comentarios = [];

    while ($row = $result->fetch_assoc()) {
        $comentarios[] = [
            "id" => (int)$row["id"],
            "obraId" => (int)$row["obra_id"],
            "capituloId" => (int)$row["capitulo_id"],
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
        check_rate_limit($conexion, get_client_ip(), "comentarios_capitulo_get", 300, 3600);

        $capituloId = intval($_GET["capitulo_id"] ?? 0);

        if ($capituloId <= 0) {
            json_error("Falta el id del capítulo", 400);
        }

        $capitulo = obtenerCapituloComentarios($conexion, $capituloId);

        if (!$capitulo) {
            json_error("Capítulo no encontrado", 404);
        }

        $usuarioId = current_user_id();

        json_success([
            "obraId" => $capitulo["obraId"],
            "capituloId" => $capituloId,
            "comentarios" => listarComentariosCapitulo($conexion, $capituloId),
            "miComentario" => obtenerComentarioCapituloUsuario($conexion, $capituloId, $usuarioId)
        ]);
    }

    if ($method === "POST") {
        require_csrf();

        $usuarioId = require_auth();

        check_rate_limit($conexion, (string)$usuarioId, "comentarios_capitulo_post", 30, 3600);

        $input = read_json_body();

        $capituloId = intval($input["capitulo_id"] ?? 0);
        $comentario = normalizarComentarioCapitulo((string)($input["comentario"] ?? ""));

        if ($capituloId <= 0) {
            json_error("Falta el id del capítulo", 400);
        }

        $capitulo = obtenerCapituloComentarios($conexion, $capituloId);

        if (!$capitulo) {
            json_error("Capítulo no encontrado", 404);
        }

        if ($comentario === "") {
            json_error("El comentario no puede estar vacío", 400);
        }

        $obraId = (int)$capitulo["obraId"];

        $stmt = $conexion->prepare(
            "INSERT INTO comentarios_capitulos
             (obra_id, capitulo_id, usuario_id, comentario)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                comentario = VALUES(comentario),
                actualizado_en = CURRENT_TIMESTAMP"
        );

        $stmt->bind_param("iiis", $obraId, $capituloId, $usuarioId, $comentario);
        $stmt->execute();

        json_success([
            "mensaje" => "Comentario guardado correctamente",
            "obraId" => $obraId,
            "capituloId" => $capituloId,
            "miComentario" => obtenerComentarioCapituloUsuario($conexion, $capituloId, $usuarioId),
            "comentarios" => listarComentariosCapitulo($conexion, $capituloId)
        ]);
    }

    if ($method === "DELETE") {
        require_csrf();

        $usuarioId = require_auth();

        check_rate_limit($conexion, (string)$usuarioId, "comentarios_capitulo_delete", 30, 3600);

        $input = read_json_body();

        $capituloId = intval($input["capitulo_id"] ?? ($_GET["capitulo_id"] ?? 0));

        if ($capituloId <= 0) {
            json_error("Falta el id del capítulo", 400);
        }

        $capitulo = obtenerCapituloComentarios($conexion, $capituloId);

        if (!$capitulo) {
            json_error("Capítulo no encontrado", 404);
        }

        $stmt = $conexion->prepare(
            "DELETE FROM comentarios_capitulos
             WHERE capitulo_id = ? AND usuario_id = ?"
        );

        $stmt->bind_param("ii", $capituloId, $usuarioId);
        $stmt->execute();

        json_success([
            "mensaje" => "Comentario eliminado correctamente",
            "obraId" => $capitulo["obraId"],
            "capituloId" => $capituloId,
            "miComentario" => null,
            "comentarios" => listarComentariosCapitulo($conexion, $capituloId)
        ]);
    }

    json_error("Método no permitido", 405);

} catch (Throwable $e) {
    handle_exception($e);
}
?>