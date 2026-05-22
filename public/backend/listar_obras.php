<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/rate_limit.php";


function categoriasPermitidasPublicas(): array {
    return [
        "todos", "accion", "aventura", "comedia", "drama", "fantasia", "romance", "terror",
        "ciencia-ficcion", "misterio", "suspenso", "sobrenatural", "psicologico", "slice-of-life",
        "vida-escolar", "deportes", "artes-marciales", "mecha", "isekai", "historico", "musica",
        "cocina", "magia", "superheroes", "crimen", "post-apocaliptico", "cyberpunk", "steampunk",
        "guerra", "parodia", "tragedia", "shonen", "shojo", "seinen", "josei", "kodomo",
        "boys-love", "girls-love", "nsfw"
    ];
}

function tiposObraPermitidosPublicos(): array {
    return ["todos", "comic", "manga", "libro", "novela", "artwork"];
}

function categoriasDesdeGenero(?string $genero): array {
    $genero = trim((string)$genero);

    if ($genero === "") {
        return [];
    }

    $partes = explode(",", $genero);
    $categorias = [];
    $permitidas = categoriasPermitidasPublicas();

    foreach ($partes as $parte) {
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

function normalizarFiltroNsfw(string $valor): string {
    $valor = strtolower(trim($valor));

    if (in_array($valor, ["incluir", "ocultar", "solo"], true)) {
        return $valor;
    }

    return "incluir";
}


function idiomasPermitidosCards(): array {
    return [
        "GLOBAL", "ES", "EN", "JA", "KO", "ZH", "FR", "DE", "PT", "IT",
        "RU", "AR", "HI", "ID", "VI", "TH", "TR", "PL", "NL"
    ];
}

function normalizarIdiomaCard(?string $idioma): string {
    $idioma = strtoupper(trim((string)$idioma));

    if ($idioma === "") {
        return "";
    }

    return in_array($idioma, idiomasPermitidosCards(), true) ? $idioma : "";
}

function idiomaFallbackInterfazCard(string $idiomaInterfaz): string {
    $idiomaInterfaz = normalizarIdiomaCard($idiomaInterfaz);
    return $idiomaInterfaz !== "" ? $idiomaInterfaz : "EN";
}

function obtenerIdiomasLecturaCard(mysqli $conexion, int $userId): array {
    if ($userId <= 0) {
        return [];
    }

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
        $idioma = normalizarIdiomaCard($row["idioma"] ?? "");

        if ($idioma === "") {
            continue;
        }

        if (!in_array($idioma, $idiomas, true)) {
            $idiomas[] = $idioma;
        }
    }

    return $idiomas;
}

function preferidosContenidoCard(mysqli $conexion, string $idiomaInterfaz = "EN"): array {
    $userId = function_exists("current_user_id") ? current_user_id() : 0;
    $idiomas = $userId > 0 ? obtenerIdiomasLecturaCard($conexion, $userId) : [];

    if (count($idiomas) === 0) {
        $idiomas[] = idiomaFallbackInterfazCard($idiomaInterfaz);
    }

    if (!in_array("GLOBAL", $idiomas, true)) {
        $idiomas[] = "GLOBAL";
    }

    return array_values(array_unique($idiomas));
}

function normalizarIdiomasCsvCard(string $idiomasCsv): array {
    $idiomasCsv = trim($idiomasCsv);

    if ($idiomasCsv === "") {
        return [];
    }

    $partes = explode(",", $idiomasCsv);
    $idiomas = [];

    foreach ($partes as $parte) {
        $idioma = normalizarIdiomaCard($parte);

        if ($idioma === "") {
            continue;
        }

        if (!in_array($idioma, $idiomas, true)) {
            $idiomas[] = $idioma;
        }
    }

    return $idiomas;
}

function obtenerIdiomasObrasCard(mysqli $conexion, array $obraIds): array {
    $obraIds = array_values(array_unique(array_map("intval", $obraIds)));

    if (count($obraIds) === 0) {
        return [];
    }

    $placeholders = implode(",", array_fill(0, count($obraIds), "?"));
    $types = str_repeat("i", count($obraIds));

    $stmt = $conexion->prepare(
        "SELECT obra_id, idioma, titulo, descripcion, es_principal
         FROM obra_idiomas
         WHERE obra_id IN ($placeholders)
         ORDER BY obra_id ASC, es_principal DESC, idioma ASC"
    );

    $stmt->bind_param($types, ...$obraIds);
    $stmt->execute();
    $result = $stmt->get_result();

    $map = [];

    while ($row = $result->fetch_assoc()) {
        $obraId = (int)$row["obra_id"];
        $idioma = normalizarIdiomaCard($row["idioma"] ?? "");

        if ($idioma === "") {
            continue;
        }

        if (!isset($map[$obraId])) {
            $map[$obraId] = [
                "idiomas" => [],
                "textos" => [],
                "principal" => ""
            ];
        }

        if (!in_array($idioma, $map[$obraId]["idiomas"], true)) {
            $map[$obraId]["idiomas"][] = $idioma;
        }

        if ((int)$row["es_principal"] === 1 && $map[$obraId]["principal"] === "") {
            $map[$obraId]["principal"] = $idioma;
        }

        $map[$obraId]["textos"][$idioma] = [
            "titulo" => $row["titulo"],
            "descripcion" => $row["descripcion"]
        ];
    }

    return $map;
}

function elegirIdiomaObraCard(array $infoIdiomas, array $preferidos, string $idiomaFallback = "GLOBAL"): string {
    $disponibles = $infoIdiomas["idiomas"] ?? [];
    $principal = normalizarIdiomaCard($infoIdiomas["principal"] ?? "");
    $fallback = normalizarIdiomaCard($idiomaFallback);

    if (count($disponibles) === 0) {
        return $fallback !== "" ? $fallback : "GLOBAL";
    }

    foreach ($preferidos as $preferido) {
        $preferido = normalizarIdiomaCard($preferido);

        if ($preferido !== "" && in_array($preferido, $disponibles, true)) {
            return $preferido;
        }
    }

    if ($fallback !== "" && in_array($fallback, $disponibles, true)) {
        return $fallback;
    }

    if ($principal !== "" && in_array($principal, $disponibles, true)) {
        return $principal;
    }

    if (in_array("GLOBAL", $disponibles, true)) {
        return "GLOBAL";
    }

    return $disponibles[0];
}

function aplicarTextoIdiomaObraCard(array $obra, array $infoIdiomas, string $idiomaSeleccionado): array {
    $texto = $infoIdiomas["textos"][$idiomaSeleccionado] ?? null;

    if ($texto) {
        if (isset($texto["titulo"]) && trim((string)$texto["titulo"]) !== "") {
            $obra["titulo"] = $texto["titulo"];
        }

        if (array_key_exists("descripcion", $texto) && trim((string)$texto["descripcion"]) !== "") {
            $obra["descripcion"] = $texto["descripcion"];
        }
    }

    return $obra;
}

function idiomasExtraCountCard(array $infoIdiomas): int {
    $total = count($infoIdiomas["idiomas"] ?? []);
    return max(0, $total - 1);
}


function usuarioPermiteNsfw(mysqli $conexion): bool {
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

try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();

    check_rate_limit($conexion, get_client_ip(), "listar_obras", 500, 3600);

    $contexto = strtolower(trim($_GET["contexto"] ?? ""));
    $idiomaInterfaz = strtoupper(trim($_GET["idiomaInterfaz"] ?? "EN"));
    $genero = strtolower(trim($_GET["genero"] ?? ($_GET["categoria"] ?? "todos")));
    $idiomaRaw = trim($_GET["idioma"] ?? "TODOS");
    $idioma = strtoupper($idiomaRaw);
    $buscar = trim($_GET["buscar"] ?? "");
    $orden = trim($_GET["orden"] ?? "recientes");
    $limite = isset($_GET["limite"]) ? intval($_GET["limite"]) : 50;

    if (strlen($buscar) > 80) {
        $buscar = substr($buscar, 0, 80);
    }

    if (!in_array($genero, categoriasPermitidasPublicas(), true)) {
        $genero = "todos";
    }

    $idiomaNormalizado = normalizarIdiomaCard($idioma);
    $usarPreferidos = strtolower($idiomaRaw) === "preferidos";

    if ($idioma !== "TODOS" && !$usarPreferidos && $idiomaNormalizado === "") {
        $idioma = "TODOS";
    }

    if (!in_array($orden, ["recientes", "populares"], true)) {
        $orden = "recientes";
    }

    if ($limite <= 0 || $limite > 100) {
        $limite = 50;
    }

    $orderBy = $orden === "populares" ? "o.num_visitas DESC, o.creado_en DESC" : "o.creado_en DESC";
    $preferidos = preferidosContenidoCard($conexion, $idiomaInterfaz);

    $where = [];
    $params = [];
    $types = "";

    if ($genero !== "todos") {
        $where[] = "FIND_IN_SET(?, REPLACE(LOWER(COALESCE(o.genero, '')), ' ', '')) > 0";
        $params[] = $genero;
        $types .= "s";
    }

    if ($contexto === "home") {
        $idiomasFiltro = $preferidos;
        $placeholders = implode(",", array_fill(0, count($idiomasFiltro), "?"));
        $where[] = "EXISTS (SELECT 1 FROM obra_idiomas oi_home WHERE oi_home.obra_id = o.id AND oi_home.idioma IN ($placeholders))";

        foreach ($idiomasFiltro as $idiomaFiltro) {
            $params[] = $idiomaFiltro;
            $types .= "s";
        }

        if (!usuarioPermiteNsfw($conexion)) {
            $where[] = "FIND_IN_SET('nsfw', REPLACE(LOWER(COALESCE(o.genero, '')), ' ', '')) = 0";
        }
    } elseif ($usarPreferidos) {
        $idiomasFiltro = $preferidos;
        $placeholders = implode(",", array_fill(0, count($idiomasFiltro), "?"));
        $where[] = "EXISTS (SELECT 1 FROM obra_idiomas oi_pref WHERE oi_pref.obra_id = o.id AND oi_pref.idioma IN ($placeholders))";

        foreach ($idiomasFiltro as $idiomaFiltro) {
            $params[] = $idiomaFiltro;
            $types .= "s";
        }
    } elseif ($idioma !== "TODOS" && $idiomaNormalizado !== "") {
        $where[] = "EXISTS (SELECT 1 FROM obra_idiomas oi_idioma WHERE oi_idioma.obra_id = o.id AND oi_idioma.idioma = ?)";
        $params[] = $idiomaNormalizado;
        $types .= "s";
        $preferidos = [$idiomaNormalizado, "GLOBAL"];
    }

    if ($buscar !== "") {
        $where[] = "(o.titulo LIKE ? OR o.descripcion LIKE ? OR u.username LIKE ? OR EXISTS (SELECT 1 FROM obra_idiomas oi_busqueda WHERE oi_busqueda.obra_id = o.id AND (oi_busqueda.titulo LIKE ? OR oi_busqueda.descripcion LIKE ?)))";
        $busqueda = "%" . $buscar . "%";
        $params[] = $busqueda;
        $params[] = $busqueda;
        $params[] = $busqueda;
        $params[] = $busqueda;
        $params[] = $busqueda;
        $types .= "sssss";
    }

    $whereSql = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

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
            u.username
        FROM obras o
        LEFT JOIN usuarios u ON u.id = o.usuario_id
        LEFT JOIN (
            SELECT obra_id, ROUND(AVG(calificacion), 1) AS promedio_calificacion
            FROM obra_calificaciones
            GROUP BY obra_id
        ) cal ON cal.obra_id = o.id
        $whereSql
        ORDER BY $orderBy
        LIMIT ?
    ";

    $params[] = $limite;
    $types .= "i";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $rawObras = [];
    $obraIds = [];

    while ($obra = $resultado->fetch_assoc()) {
        $rawObras[] = $obra;
        $obraIds[] = (int)$obra["id"];
    }

    $idiomasObras = obtenerIdiomasObrasCard($conexion, $obraIds);
    $obras = [];

    foreach ($rawObras as $obra) {
        $obraId = (int)$obra["id"];
        $infoIdiomas = $idiomasObras[$obraId] ?? ["idiomas" => [], "textos" => [], "principal" => ""];
        $idiomaCard = elegirIdiomaObraCard($infoIdiomas, $preferidos, $obra["idioma"] ?? "GLOBAL");
        $obra = aplicarTextoIdiomaObraCard($obra, $infoIdiomas, $idiomaCard);
        $categorias = categoriasDesdeGenero($obra["genero"] ?? "");

        $obras[] = [
            "id" => $obraId,
            "usuarioId" => $obra["usuario_id"] ? (int)$obra["usuario_id"] : null,
            "titulo" => $obra["titulo"],
            "descripcion" => $obra["descripcion"],
            "genero" => $obra["genero"],
            "categorias" => $categorias,
            "idioma" => $idiomaCard,
            "idiomasDisponibles" => $infoIdiomas["idiomas"] ?? [],
            "idiomasExtraCount" => idiomasExtraCountCard($infoIdiomas),
            "tipoEntrega" => $obra["tipo_entrega"],
            "serieConcluida" => (bool)$obra["serie_concluida"],
            "portada" => $obra["portada"],
            "numVisitas" => (int)$obra["num_visitas"],
            "promedioCalificacion" => (float)$obra["promedio_calificacion"],
            "fechaCreacion" => $obra["creado_en"],
            "autor" => $obra["username"] ?: "Autor desconocido"
        ];
    }

    json_success(["obras" => $obras]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>
