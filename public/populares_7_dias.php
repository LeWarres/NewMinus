<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/rate_limit.php";
require_once __DIR__ . "/_core/catalogos.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();

    check_rate_limit($conexion, get_client_ip(), "populares_7_dias", 500, 3600);

    $idiomaInterfaz = strtoupper(trim($_GET["idiomaInterfaz"] ?? "EN"));
    $limite = isset($_GET["limite"]) ? intval($_GET["limite"]) : 10;

    if ($limite <= 0 || $limite > 30) {
        $limite = 10;
    }

    $idiomasFiltro = obtenerIdiomasFiltroPopulares($conexion, $idiomaInterfaz);

    $where = [];
    $params = [];
    $types = "";

    $generoSql = "REPLACE(LOWER(COALESCE(o.genero, '')), ' ', '')";

    if (!usuarioPermiteNsfwPopulares($conexion)) {
        $where[] = "FIND_IN_SET('nsfw', {$generoSql}) = 0";
    }

    $placeholders = implode(",", array_fill(0, count($idiomasFiltro), "?"));

    $where[] = "EXISTS (
        SELECT 1
        FROM obra_idiomas oi_filter
        WHERE oi_filter.obra_id = o.id
          AND oi_filter.idioma IN ($placeholders)
    )";

    foreach ($idiomasFiltro as $idiomaFiltro) {
        $params[] = $idiomaFiltro;
        $types .= "s";
    }

    $where[] = "ov.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";

    $whereSql = "";

    if (count($where) > 0) {
        $whereSql = "WHERE " . implode(" AND ", $where);
    }

    $sql = "
        SELECT
            o.id,
            o.usuario_id,
            o.titulo,
            o.descripcion,
            o.genero,
            o.idioma,
            o.tipo_entrega,
            o.serie_concluida,
            o.portada,
            o.num_visitas,
            o.creado_en,
            COALESCE(cal.promedio_calificacion, 0) AS promedio_calificacion,
            COUNT(DISTINCT ov.id) AS vistas_7_dias,
            u.username,
            GROUP_CONCAT(DISTINCT oi.idioma ORDER BY oi.es_principal DESC, oi.idioma ASC SEPARATOR ',') AS idiomas_disponibles
        FROM obras o
        INNER JOIN obra_vistas ov ON ov.obra_id = o.id
        LEFT JOIN usuarios u ON u.id = o.usuario_id
        LEFT JOIN obra_idiomas oi ON oi.obra_id = o.id
        LEFT JOIN (
            SELECT
                obra_id,
                ROUND(AVG(calificacion), 1) AS promedio_calificacion
            FROM obra_calificaciones
            GROUP BY obra_id
        ) cal ON cal.obra_id = o.id
        $whereSql
        GROUP BY
            o.id,
            o.usuario_id,
            o.titulo,
            o.descripcion,
            o.genero,
            o.idioma,
            o.tipo_entrega,
            o.serie_concluida,
            o.portada,
            o.num_visitas,
            o.creado_en,
            cal.promedio_calificacion,
            u.username
        ORDER BY vistas_7_dias DESC, o.num_visitas DESC, o.creado_en DESC
        LIMIT ?
    ";

    $params[] = $limite;
    $types .= "i";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $obras = [];

    while ($obra = $resultado->fetch_assoc()) {
        $idiomasDisponibles = idiomasDisponiblesDesdeCsv(
            $obra["idiomas_disponibles"] ?? "",
            $obra["idioma"] ?? "GLOBAL"
        );

        $idiomaCard = escogerIdiomaCard(
            $idiomasDisponibles,
            $idiomasFiltro,
            $obra["idioma"] ?? "GLOBAL"
        );

        $categorias = categoriasDesdeGeneroPopulares($obra["genero"] ?? "");

        $obras[] = [
            "id" => (int)$obra["id"],
            "usuarioId" => $obra["usuario_id"] ? (int)$obra["usuario_id"] : null,
            "titulo" => $obra["titulo"],
            "descripcion" => $obra["descripcion"],
            "genero" => $obra["genero"],
            "categorias" => $categorias,
            "idioma" => $idiomaCard,
            "idiomasDisponibles" => $idiomasDisponibles,
            "idiomasExtraCount" => max(0, count($idiomasDisponibles) - 1),
            "tipoEntrega" => $obra["tipo_entrega"],
            "serieConcluida" => (bool)$obra["serie_concluida"],
            "portada" => $obra["portada"],
            "numVisitas" => (int)$obra["num_visitas"],
            "vistas7Dias" => (int)$obra["vistas_7_dias"],
            "promedioCalificacion" => (float)$obra["promedio_calificacion"],
            "fechaCreacion" => $obra["creado_en"],
            "autor" => $obra["username"] ?: "Autor desconocido"
        ];
    }

    json_success([
        "dias" => 7,
        "idiomasFiltro" => $idiomasFiltro,
        "obras" => $obras
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>
