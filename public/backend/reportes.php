<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";

const REPORTE_COMENTARIO_MAX_LENGTH = 1000;

function normalizar_comentario_reporte(string $texto): string {
    $texto = trim($texto);
    $texto = strip_tags($texto);
    $texto = preg_replace("/\r\n|\r|\n/", "\n", $texto);
    $texto = preg_replace("/[ \t]+/", " ", $texto);

    if (mb_strlen($texto, "UTF-8") > REPORTE_COMENTARIO_MAX_LENGTH) {
        $texto = mb_substr($texto, 0, REPORTE_COMENTARIO_MAX_LENGTH, "UTF-8");
    }

    return trim($texto);
}

function razon_reporte_valida(string $razon): bool {
    return in_array($razon, [
        "contenido_inapropiado",
        "spam",
        "copyright",
        "error_imagen",
        "error_texto",
        "acoso",
        "otro"
    ], true);
}

function normalizar_url_reportada(string $url): string {
    $url = trim($url);
    $url = strip_tags($url);

    $parts = parse_url($url);

    if (!$parts) {
        return "";
    }

    $host = strtolower((string)($parts["host"] ?? ""));
    $path = (string)($parts["path"] ?? "");

    if (!in_array($host, ["minuscreators.com", "www.minuscreators.com"], true)) {
        return "";
    }

    if (!preg_match("#^/obra/[0-9]+(/capitulo/[0-9]+)?/?$#", $path)) {
        return "";
    }

    $path = rtrim($path, "/");

    return "https://minuscreators.com" . $path;
}

try {
    $conexion = get_db();

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $usuarioId = require_auth();

    check_rate_limit($conexion, (string)$usuarioId, "reportes_post", 20, 3600);

    $input = read_json_body();

    $urlReportada = normalizar_url_reportada((string)($input["url_reportada"] ?? ""));
    $razon = trim((string)($input["razon"] ?? ""));
    $comentario = normalizar_comentario_reporte((string)($input["comentario"] ?? ""));

    if ($urlReportada === "") {
        json_error("La URL reportada no es válida", 400);
    }

    if (!razon_reporte_valida($razon)) {
        json_error("La razón del reporte no es válida", 400);
    }

    $stmtDuplicado = $conexion->prepare(
        "SELECT id
         FROM reportes
         WHERE usuario_id = ?
           AND url_reportada = ?
           AND fecha_reporte >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         LIMIT 1"
    );

    $stmtDuplicado->bind_param("is", $usuarioId, $urlReportada);
    $stmtDuplicado->execute();

    if ($stmtDuplicado->get_result()->num_rows > 0) {
        json_error("Ya reportaste este contenido. Puedes volver a reportarlo después de 24 horas.", 409);
    }

    $stmt = $conexion->prepare(
        "INSERT INTO reportes (
            usuario_id,
            url_reportada,
            comentario,
            razon
        ) VALUES (?, ?, ?, ?)"
    );

    $stmt->bind_param(
        "isss",
        $usuarioId,
        $urlReportada,
        $comentario,
        $razon
    );

    $stmt->execute();

    json_success([
        "mensaje" => "Reporte enviado correctamente",
        "reporteId" => $conexion->insert_id
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}