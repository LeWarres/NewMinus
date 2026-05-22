<?php
require_once __DIR__ . "/_core/auth.php";


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


function categoriasPermitidasPerfil(): array {
    return [
        "accion", "aventura", "comedia", "drama", "fantasia", "romance", "terror", "ciencia-ficcion",
        "misterio", "suspenso", "sobrenatural", "psicologico", "slice-of-life", "vida-escolar",
        "deportes", "artes-marciales", "mecha", "isekai", "historico", "musica", "cocina", "magia",
        "superheroes", "crimen", "post-apocaliptico", "cyberpunk", "steampunk", "guerra", "parodia",
        "tragedia", "shonen", "shojo", "seinen", "josei", "kodomo", "boys-love", "girls-love", "nsfw"
    ];
}

function categoriasDesdeGeneroPerfil(?string $genero): array {
    $genero = trim((string)$genero);
    if ($genero === "") { return []; }
    $permitidas = categoriasPermitidasPerfil();
    $categorias = [];
    foreach (explode(",", $genero) as $parte) {
        $valor = strtolower(trim($parte));
        if ($valor !== "" && in_array($valor, $permitidas, true) && !in_array($valor, $categorias, true)) {
            $categorias[] = $valor;
        }
    }
    return $categorias;
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();
    $userId = isset($_GET["id"]) ? intval($_GET["id"]) : 0;
    $viewerId = current_user_id();

    if ($userId <= 0) {
        json_error("Falta el id del usuario", 400);
    }

    $stmtUser = $conexion->prepare(
        "SELECT id, username, email, role, nacionalidad, img_perfil, img_banner, twitter, facebook, instagram, mostrar_nsfw
         FROM usuarios
         WHERE id = ?
         LIMIT 1"
    );

    $stmtUser->bind_param("i", $userId);
    $stmtUser->execute();
    $resultUser = $stmtUser->get_result();

    if ($resultUser->num_rows === 0) {
        json_error("Usuario no encontrado", 404);
    }

    $user = $resultUser->fetch_assoc();
    $idiomasLectura = obtenerIdiomasLecturaCard($conexion, $userId);

    if (count($idiomasLectura) === 0) {
        $idiomasLectura[] = "EN";
    }

    $preferidosViewer = $viewerId > 0 ? obtenerIdiomasLecturaCard($conexion, $viewerId) : [];
    if (count($preferidosViewer) === 0) {
        $preferidosViewer = $idiomasLectura;
    }
    if (!in_array("GLOBAL", $preferidosViewer, true)) {
        $preferidosViewer[] = "GLOBAL";
    }

    $stmtObras = $conexion->prepare(
        "SELECT
            id, titulo, descripcion, genero, idioma, tipo_entrega, serie_concluida, portada, num_visitas,
            (SELECT ROUND(AVG(oc.calificacion), 1) FROM obra_calificaciones oc WHERE oc.obra_id = obras.id) AS promedio_calificacion,
            creado_en
         FROM obras
         WHERE usuario_id = ?
         ORDER BY creado_en DESC"
    );

    $stmtObras->bind_param("i", $userId);
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
        $idiomaCard = elegirIdiomaObraCard($infoIdiomas, $preferidosViewer, $obra["idioma"] ?? "GLOBAL");
        $obra = aplicarTextoIdiomaObraCard($obra, $infoIdiomas, $idiomaCard);

        $obras[] = [
            "id" => $obraId,
            "titulo" => $obra["titulo"],
            "descripcion" => $obra["descripcion"],
            "genero" => $obra["genero"],
            "categorias" => categoriasDesdeGeneroPerfil($obra["genero"] ?? ""),
            "idioma" => $idiomaCard,
            "idiomasDisponibles" => $infoIdiomas["idiomas"] ?? [],
            "idiomasExtraCount" => idiomasExtraCountCard($infoIdiomas),
            "tipoEntrega" => $obra["tipo_entrega"],
            "serieConcluida" => (bool)$obra["serie_concluida"],
            "portada" => $obra["portada"],
            "numVisitas" => (int)$obra["num_visitas"],
            "promedioCalificacion" => (float)($obra["promedio_calificacion"] ?? 0),
            "fechaCreacion" => $obra["creado_en"]
        ];
    }

    $placeholders = implode(",", array_fill(0, count($preferidosViewer), "?"));
    $stmtCapitulos = $conexion->prepare(
        "SELECT
            cv.id AS capitulo_version_id,
            cv.idioma AS capitulo_idioma,
            cv.titulo AS capitulo_titulo,
            cv.descripcion AS capitulo_descripcion,
            cv.num_visitas AS capitulo_num_visitas,
            cv.creado_en AS version_creado_en,
            c.id AS capitulo_id,
            c.obra_id,
            c.numero_capitulo,
            c.creado_en AS capitulo_creado_en,
            o.titulo AS obra_titulo,
            o.descripcion AS obra_descripcion,
            o.portada,
            o.genero,
            o.idioma AS obra_idioma,
            o.tipo_entrega AS obra_tipo_entrega,
            o.num_visitas AS obra_num_visitas,
            COALESCE(cal.promedio_calificacion, 0) AS promedio_calificacion
         FROM capitulo_versiones cv
         INNER JOIN capitulos c ON c.id = cv.capitulo_id
         INNER JOIN obras o ON o.id = c.obra_id
         LEFT JOIN (
            SELECT obra_id, ROUND(AVG(calificacion), 1) AS promedio_calificacion
            FROM obra_calificaciones
            GROUP BY obra_id
         ) cal ON cal.obra_id = o.id
         WHERE o.usuario_id = ?
           AND cv.publicado = 1
           AND cv.idioma IN ($placeholders)
         ORDER BY cv.creado_en DESC, c.creado_en DESC
         LIMIT 8"
    );

    $paramsCap = [$userId, ...$preferidosViewer];
    $typesCap = "i" . str_repeat("s", count($preferidosViewer));
    $stmtCapitulos->bind_param($typesCap, ...$paramsCap);
    $stmtCapitulos->execute();
    $resultCapitulos = $stmtCapitulos->get_result();

    $rawCapitulos = [];
    $obraIdsCapitulos = [];

    while ($capitulo = $resultCapitulos->fetch_assoc()) {
        $rawCapitulos[] = $capitulo;
        $obraIdsCapitulos[] = (int)$capitulo["obra_id"];
    }

    $idiomasObrasCapitulos = obtenerIdiomasObrasCard($conexion, $obraIdsCapitulos);
    $capitulos = [];

    foreach ($rawCapitulos as $capitulo) {
        $obraId = (int)$capitulo["obra_id"];
        $infoIdiomas = $idiomasObrasCapitulos[$obraId] ?? ["idiomas" => [], "textos" => [], "principal" => ""];
        $idiomaVersion = normalizarIdiomaCard($capitulo["capitulo_idioma"] ?? "") ?: "GLOBAL";
        $obraTexto = aplicarTextoIdiomaObraCard([
            "titulo" => $capitulo["obra_titulo"],
            "descripcion" => $capitulo["obra_descripcion"]
        ], $infoIdiomas, $idiomaVersion);

        $capitulos[] = [
            "tipo" => "capitulo",
            "capituloId" => (int)$capitulo["capitulo_id"],
            "capituloVersionId" => (int)$capitulo["capitulo_version_id"],
            "obraId" => $obraId,
            "numeroCapitulo" => (int)$capitulo["numero_capitulo"],
            "tituloCapitulo" => $capitulo["capitulo_titulo"],
            "descripcionCapitulo" => $capitulo["capitulo_descripcion"],
            "fechaCreacion" => $capitulo["version_creado_en"] ?: $capitulo["capitulo_creado_en"],
            "tituloObra" => $obraTexto["titulo"],
            "descripcionObra" => $obraTexto["descripcion"],
            "portada" => $capitulo["portada"],
            "genero" => $capitulo["genero"],
            "categorias" => categoriasDesdeGeneroPerfil($capitulo["genero"] ?? ""),
            "idioma" => $idiomaVersion,
            "idiomasDisponibles" => $infoIdiomas["idiomas"] ?? [],
            "idiomasExtraCount" => idiomasExtraCountCard($infoIdiomas),
            "tipoEntrega" => $capitulo["obra_tipo_entrega"],
            "numVisitas" => (int)$capitulo["capitulo_num_visitas"],
            "obraNumVisitas" => (int)$capitulo["obra_num_visitas"],
            "promedioCalificacion" => (float)$capitulo["promedio_calificacion"]
        ];
    }

    $stmtSuscriptores = $conexion->prepare("SELECT COUNT(*) AS total FROM suscripciones WHERE seguido_id = ?");
    $stmtSuscriptores->bind_param("i", $userId);
    $stmtSuscriptores->execute();
    $rowSuscriptores = $stmtSuscriptores->get_result()->fetch_assoc();
    $totalSuscriptores = (int)$rowSuscriptores["total"];

    $estaSuscrito = false;

    if ($viewerId > 0 && $viewerId !== $userId) {
        $stmtSub = $conexion->prepare(
            "SELECT id FROM suscripciones WHERE seguidor_id = ? AND seguido_id = ? LIMIT 1"
        );
        $stmtSub->bind_param("ii", $viewerId, $userId);
        $stmtSub->execute();
        $estaSuscrito = $stmtSub->get_result()->num_rows > 0;
    }

    $esPropietario = $viewerId === $userId;
    $emailVisible = $esPropietario ? $user["email"] : "";
    $mostrarNsfwVisible = $esPropietario ? ((int)$user["mostrar_nsfw"] === 1) : false;

    json_success([
        "user" => [
            "id" => (int)$user["id"],
            "username" => $user["username"],
            "email" => $emailVisible,
            "role" => $user["role"],
            "nacionalidad" => $user["nacionalidad"],
            "imgPerfil" => $user["img_perfil"],
            "imgBanner" => $user["img_banner"],
            "twitter" => $user["twitter"],
            "facebook" => $user["facebook"],
            "instagram" => $user["instagram"],
            "totalSuscriptores" => $totalSuscriptores,
            "idiomasLectura" => $idiomasLectura,
            "mostrarNsfw" => $mostrarNsfwVisible
        ],
        "obras" => $obras,
        "capitulos" => $capitulos,
        "estaSuscrito" => $estaSuscrito
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>
