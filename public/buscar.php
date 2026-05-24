<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/rate_limit.php";
require_once __DIR__ . "/_core/catalogos.php";


try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();

    check_rate_limit($conexion, get_client_ip(), "buscar", 300, 3600);

    $buscar = trim($_GET["buscar"] ?? "");
    $genero = strtolower(trim($_GET["genero"] ?? ($_GET["categoria"] ?? "todos")));
    $idiomaRaw = trim($_GET["idioma"] ?? "TODOS");
    $idioma = strtoupper($idiomaRaw);
    $idiomas = normalizarIdiomasCsvCard($_GET["idiomas"] ?? "");
    $tipoObra = strtolower(trim($_GET["tipo"] ?? ($_GET["tipoObra"] ?? ($_GET["tipoEntrega"] ?? "todos"))));
    $orden = trim($_GET["orden"] ?? "recientes");
    $limite = isset($_GET["limite"]) ? intval($_GET["limite"]) : 50;
    $idiomaInterfaz = strtoupper(trim($_GET["idiomaInterfaz"] ?? "EN"));

    $usarPreferidos = strtolower($idiomaRaw) === "preferidos";
    $preferidos = $usarPreferidos ? preferidosContenidoCard($conexion, $idiomaInterfaz) : preferidosContenidoCard($conexion, $idiomaInterfaz);

    $filtroNsfw = normalizarFiltroNsfw($_GET["nsfw"] ?? "incluir");

    if (!empty($_GET["soloNsfw"])) {
        $filtroNsfw = "solo";
    }

    if (isset($_GET["incluirNsfw"]) && (string)$_GET["incluirNsfw"] === "0") {
        $filtroNsfw = "ocultar";
    }

    if (isset($_GET["incluirNsfw"]) && (string)$_GET["incluirNsfw"] === "1" && $filtroNsfw !== "solo") {
        $filtroNsfw = "incluir";
    }

    if (strlen($buscar) > 80) {
        $buscar = substr($buscar, 0, 80);
    }

    if (!in_array($genero, categoriasPermitidasPublicas(), true)) {
        $genero = "todos";
    }

    $idiomaNormalizado = normalizarIdiomaCard($idioma);

    if ($idioma !== "TODOS" && !$usarPreferidos && $idiomaNormalizado === "") {
        $idioma = "TODOS";
    }

    if (!in_array($tipoObra, tiposObraPermitidosPublicos(), true)) {
        $tipoObra = "todos";
    }

    if (!in_array($orden, ["recientes", "populares"], true)) {
        $orden = "recientes";
    }

    if ($limite <= 0 || $limite > 100) {
        $limite = 50;
    }

    $usuarios = [];

    if ($buscar !== "") {
        $stmtUsuarios = $conexion->prepare(
            "SELECT
                u.id,
                u.username,
                u.role,
                u.nacionalidad,
                u.img_perfil,
                u.img_banner,
                (
                    SELECT COUNT(*)
                    FROM suscripciones s
                    WHERE s.seguido_id = u.id
                ) AS total_suscriptores,
                (
                    SELECT COUNT(*)
                    FROM obras o2
                    WHERE o2.usuario_id = u.id
                ) AS total_obras
             FROM usuarios u
             WHERE LOWER(u.username) = LOWER(?)
             LIMIT 5"
        );

        $stmtUsuarios->bind_param("s", $buscar);
        $stmtUsuarios->execute();
        $resultUsuarios = $stmtUsuarios->get_result();

        while ($user = $resultUsuarios->fetch_assoc()) {
            $usuarios[] = [
                "id" => (int)$user["id"],
                "username" => $user["username"],
                "role" => $user["role"],
                "nacionalidad" => $user["nacionalidad"],
                "imgPerfil" => $user["img_perfil"],
                "imgBanner" => $user["img_banner"],
                "totalSuscriptores" => (int)$user["total_suscriptores"],
                "totalObras" => (int)$user["total_obras"]
            ];
        }
    }

    $where = [];
    $params = [];
    $types = "";
    $generoSql = "REPLACE(LOWER(COALESCE(o.genero, '')), ' ', '')";

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

    if ($genero !== "todos" && $genero !== "nsfw") {
        $where[] = "FIND_IN_SET(?, {$generoSql}) > 0";
        $params[] = $genero;
        $types .= "s";
    }

    if (count($idiomas) > 0 || $usarPreferidos) {
        $idiomasFiltro = count($idiomas) > 0 ? $idiomas : $preferidos;
        $placeholders = implode(",", array_fill(0, count($idiomasFiltro), "?"));
        $where[] = "EXISTS (SELECT 1 FROM obra_idiomas oi_filtro WHERE oi_filtro.obra_id = o.id AND oi_filtro.idioma IN ($placeholders))";

        foreach ($idiomasFiltro as $idiomaFiltro) {
            $params[] = $idiomaFiltro;
            $types .= "s";
        }

        $preferidos = $idiomasFiltro;
    } elseif ($idioma !== "TODOS" && $idiomaNormalizado !== "") {
        $where[] = "EXISTS (SELECT 1 FROM obra_idiomas oi_filtro WHERE oi_filtro.obra_id = o.id AND oi_filtro.idioma = ?)";
        $params[] = $idiomaNormalizado;
        $types .= "s";
        $preferidos = [$idiomaNormalizado, "GLOBAL"];
    }

    if ($tipoObra !== "todos") {
        $where[] = "LOWER(o.tipo_entrega) = ?";
        $params[] = $tipoObra;
        $types .= "s";
    }

    if ($genero === "nsfw" || $filtroNsfw === "solo") {
        $where[] = "FIND_IN_SET('nsfw', {$generoSql}) > 0";
    } elseif ($filtroNsfw === "ocultar") {
        $where[] = "FIND_IN_SET('nsfw', {$generoSql}) = 0";
    }

    $whereSql = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";
    $orderBy = $orden === "populares" ? "o.num_visitas DESC, o.creado_en DESC" : "o.creado_en DESC";

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

    $stmtObras = $conexion->prepare($sql);
    $stmtObras->bind_param($types, ...$params);
    $stmtObras->execute();
    $resultObras = $stmtObras->get_result();

    $rawObras = [];
    $obraIds = [];

    while ($obra = $resultObras->fetch_assoc()) {
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

    json_success([
        "usuarios" => $usuarios,
        "obras" => $obras
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>
