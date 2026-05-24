<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/rate_limit.php";
require_once __DIR__ . "/_core/catalogos.php";


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
