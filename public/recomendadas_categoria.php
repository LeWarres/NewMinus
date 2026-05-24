<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/rate_limit.php";
require_once __DIR__ . "/_core/catalogos.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();

    check_rate_limit($conexion, get_client_ip(), "recomendadas_categoria", 500, 3600);

    $categoria = strtolower(trim($_GET["categoria"] ?? ($_GET["genero"] ?? "todos")));
    $idiomaInterfaz = strtoupper(trim($_GET["idiomaInterfaz"] ?? "EN"));
    $limite = isset($_GET["limite"]) ? intval($_GET["limite"]) : 12;

    if (!in_array($categoria, categoriasPermitidasRecomendadas(), true)) {
        $categoria = "todos";
    }

    if ($limite <= 0 || $limite > 30) {
        $limite = 12;
    }

    $idiomasFiltro = obtenerIdiomasFiltroRecomendadas($conexion, $idiomaInterfaz);

    $where = [];
    $params = [];
    $types = "";

    $generoSql = "REPLACE(LOWER(COALESCE(o.genero, '')), ' ', '')";

    if ($categoria !== "todos") {
        $where[] = "FIND_IN_SET(?, {$generoSql}) > 0";
        $params[] = $categoria;
        $types .= "s";
    }

    if (!usuarioPermiteNsfwRecomendadas($conexion)) {
        if ($categoria === "nsfw") {
            $where[] = "1 = 0";
        } else {
            $where[] = "FIND_IN_SET('nsfw', {$generoSql}) = 0";
        }
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
            u.username,
            GROUP_CONCAT(DISTINCT oi.idioma ORDER BY oi.es_principal DESC, oi.idioma ASC SEPARATOR ',') AS idiomas_disponibles
        FROM obras o
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
        ORDER BY RAND()
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

        $categorias = categoriasDesdeGeneroRecomendadas($obra["genero"] ?? "");

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
            "promedioCalificacion" => (float)$obra["promedio_calificacion"],
            "fechaCreacion" => $obra["creado_en"],
            "autor" => $obra["username"] ?: "Autor desconocido"
        ];
    }

    json_success([
        "categoria" => $categoria,
        "idiomasFiltro" => $idiomasFiltro,
        "obras" => $obras
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>
