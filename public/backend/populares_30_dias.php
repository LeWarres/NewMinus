<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/rate_limit.php";

function categoriasPermitidasPopulares(): array {
    return [
        "todos",
        "accion",
        "aventura",
        "comedia",
        "drama",
        "fantasia",
        "romance",
        "terror",
        "ciencia-ficcion",
        "misterio",
        "suspenso",
        "sobrenatural",
        "psicologico",
        "slice-of-life",
        "vida-escolar",
        "deportes",
        "artes-marciales",
        "mecha",
        "isekai",
        "historico",
        "musica",
        "cocina",
        "magia",
        "superheroes",
        "crimen",
        "post-apocaliptico",
        "cyberpunk",
        "steampunk",
        "guerra",
        "parodia",
        "tragedia",
        "shonen",
        "shojo",
        "seinen",
        "josei",
        "kodomo",
        "boys-love",
        "girls-love",
        "nsfw"
    ];
}

function idiomasPermitidosPopulares(): array {
    return [
        "GLOBAL",
        "ES",
        "EN",
        "JA",
        "KO",
        "ZH",
        "FR",
        "DE",
        "PT",
        "IT",
        "RU",
        "AR",
        "HI",
        "ID",
        "VI",
        "TH",
        "TR",
        "PL",
        "NL"
    ];
}

function categoriasDesdeGeneroPopulares(?string $genero): array {
    $genero = trim((string)$genero);

    if ($genero === "") {
        return [];
    }

    $permitidas = categoriasPermitidasPopulares();
    $categorias = [];

    foreach (explode(",", $genero) as $parte) {
        $valor = strtolower(trim($parte));

        if ($valor === "" || $valor === "todos") {
            continue;
        }

        if (!in_array($valor, $permitidas, true)) {
            continue;
        }

        if (!in_array($valor, $categorias, true)) {
            $categorias[] = $valor;
        }
    }

    return $categorias;
}

function idiomaFallbackPopulares(string $idiomaInterfaz): string {
    $idiomaInterfaz = strtoupper(trim($idiomaInterfaz));

    return in_array($idiomaInterfaz, idiomasPermitidosPopulares(), true)
        ? $idiomaInterfaz
        : "EN";
}

function obtenerIdiomasLecturaPopulares(mysqli $conexion, int $userId): array {
    if ($userId <= 0) {
        return [];
    }

    $permitidos = idiomasPermitidosPopulares();

    $stmt = $conexion->prepare(
        "SELECT idioma
         FROM usuario_idiomas_lectura
         WHERE usuario_id = ?
         ORDER BY idioma ASC"
    );

    $stmt->bind_param("i", $userId);
    $stmt->execute();

    $result = $stmt->get_result();
    $idiomas = [];

    while ($row = $result->fetch_assoc()) {
        $idioma = strtoupper(trim($row["idioma"] ?? ""));

        if ($idioma === "") {
            continue;
        }

        if (!in_array($idioma, $permitidos, true)) {
            continue;
        }

        if (!in_array($idioma, $idiomas, true)) {
            $idiomas[] = $idioma;
        }
    }

    return $idiomas;
}

function obtenerIdiomasFiltroPopulares(mysqli $conexion, string $idiomaInterfaz): array {
    $userId = current_user_id();
    $idiomas = [];

    if ($userId > 0) {
        $idiomas = obtenerIdiomasLecturaPopulares($conexion, $userId);
    }

    if (count($idiomas) === 0) {
        $idiomas[] = idiomaFallbackPopulares($idiomaInterfaz);
    }

    if (!in_array("GLOBAL", $idiomas, true)) {
        $idiomas[] = "GLOBAL";
    }

    return array_values(array_unique($idiomas));
}

function usuarioPermiteNsfwPopulares(mysqli $conexion): bool {
    $userId = current_user_id();

    if ($userId <= 0) {
        return true;
    }

    $stmt = $conexion->prepare(
        "SELECT mostrar_nsfw
         FROM usuarios
         WHERE id = ?
         LIMIT 1"
    );

    $stmt->bind_param("i", $userId);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        return false;
    }

    $row = $result->fetch_assoc();

    return ((int)$row["mostrar_nsfw"]) === 1;
}

function idiomasDisponiblesDesdeCsv(?string $csv, ?string $idiomaBase): array {
    $permitidos = idiomasPermitidosPopulares();
    $idiomas = [];

    foreach (explode(",", (string)$csv) as $parte) {
        $idioma = strtoupper(trim($parte));

        if ($idioma === "") {
            continue;
        }

        if (!in_array($idioma, $permitidos, true)) {
            continue;
        }

        if (!in_array($idioma, $idiomas, true)) {
            $idiomas[] = $idioma;
        }
    }

    $idiomaBase = strtoupper(trim((string)$idiomaBase));

    if (count($idiomas) === 0 && in_array($idiomaBase, $permitidos, true)) {
        $idiomas[] = $idiomaBase;
    }

    if (count($idiomas) === 0) {
        $idiomas[] = "GLOBAL";
    }

    return $idiomas;
}

function escogerIdiomaCard(array $idiomasDisponibles, array $idiomasPreferidos, ?string $idiomaBase): string {
    foreach ($idiomasPreferidos as $idiomaPreferido) {
        if (in_array($idiomaPreferido, $idiomasDisponibles, true)) {
            return $idiomaPreferido;
        }
    }

    $idiomaBase = strtoupper(trim((string)$idiomaBase));

    if ($idiomaBase !== "" && in_array($idiomaBase, $idiomasDisponibles, true)) {
        return $idiomaBase;
    }

    return $idiomasDisponibles[0] ?? "GLOBAL";
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();

    check_rate_limit($conexion, get_client_ip(), "populares_30_dias", 500, 3600);

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

    $where[] = "ov.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";

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
            COUNT(DISTINCT ov.id) AS vistas_30_dias,
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
        ORDER BY vistas_30_dias DESC, o.num_visitas DESC, o.creado_en DESC
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
            "vistas30Dias" => (int)$obra["vistas_30_dias"],
            "promedioCalificacion" => (float)$obra["promedio_calificacion"],
            "fechaCreacion" => $obra["creado_en"],
            "autor" => $obra["username"] ?: "Autor desconocido"
        ];
    }

    json_success([
        "dias" => 30,
        "idiomasFiltro" => $idiomasFiltro,
        "obras" => $obras
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>