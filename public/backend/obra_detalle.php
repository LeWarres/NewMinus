<?php
require_once __DIR__ . "/_core/auth.php";

function idiomasPermitidosReader(): array {
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

function normalizarIdiomaReader(?string $idioma): string {
    $idioma = strtoupper(trim((string)$idioma));

    if ($idioma === "") {
        return "";
    }

    return in_array($idioma, idiomasPermitidosReader(), true)
        ? $idioma
        : "";
}

function idiomaObraBase(array $obra): string {
    $idioma = normalizarIdiomaReader($obra["idioma"] ?? "");
    return $idioma !== "" ? $idioma : "GLOBAL";
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

try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();

    $obraId = isset($_GET["id"]) ? intval($_GET["id"]) : 0;
    $numeroCapitulo = isset($_GET["capitulo"]) ? intval($_GET["capitulo"]) : 0;
    $idiomaSolicitado = normalizarIdiomaReader($_GET["idioma"] ?? ($_GET["lang"] ?? ""));

    $viewerId = current_user_id();

    if ($obraId <= 0) {
        json_error("Falta el id de la obra", 400);
    }

    $stmtObra = $conexion->prepare(
        "SELECT 
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
            u.username,
            u.img_perfil,
            u.role,
            u.nacionalidad,
            u.twitter,
            u.facebook,
            u.instagram
         FROM obras o
         LEFT JOIN usuarios u ON u.id = o.usuario_id
         WHERE o.id = ?
         LIMIT 1"
    );

    $stmtObra->bind_param("i", $obraId);
    $stmtObra->execute();

    $resultadoObra = $stmtObra->get_result();

    if ($resultadoObra->num_rows === 0) {
        json_error("Obra no encontrada", 404);
    }

    $obra = $resultadoObra->fetch_assoc();
    $autorId = $obra["usuario_id"] ? (int)$obra["usuario_id"] : 0;
    $idiomaBaseObra = idiomaObraBase($obra);
    $idiomasObrasReader = obtenerIdiomasObrasCard($conexion, [$obraId]);
    $infoIdiomasObraReader = $idiomasObrasReader[$obraId] ?? ["idiomas" => [], "textos" => [], "principal" => ""];


    if ($numeroCapitulo <= 0) {
        $numeroFallback = 0;

        if ($idiomaSolicitado !== "") {
            $stmtPrimerIdioma = $conexion->prepare(
                "SELECT c.numero_capitulo
                 FROM capitulos c
                 INNER JOIN capitulo_versiones cv ON cv.capitulo_id = c.id
                 WHERE c.obra_id = ?
                   AND cv.idioma = ?
                   AND cv.publicado = 1
                 ORDER BY c.numero_capitulo ASC
                 LIMIT 1"
            );

            $stmtPrimerIdioma->bind_param("is", $obraId, $idiomaSolicitado);
            $stmtPrimerIdioma->execute();
            $resultPrimerIdioma = $stmtPrimerIdioma->get_result();

            if ($resultPrimerIdioma->num_rows > 0) {
                $rowPrimerIdioma = $resultPrimerIdioma->fetch_assoc();
                $numeroFallback = (int)$rowPrimerIdioma["numero_capitulo"];
            }
        }

        if ($numeroFallback <= 0) {
            $stmtPrimer = $conexion->prepare(
                "SELECT c.numero_capitulo
                 FROM capitulos c
                 INNER JOIN capitulo_versiones cv ON cv.capitulo_id = c.id
                 WHERE c.obra_id = ?
                   AND cv.publicado = 1
                 ORDER BY c.numero_capitulo ASC
                 LIMIT 1"
            );

            $stmtPrimer->bind_param("i", $obraId);
            $stmtPrimer->execute();
            $resultPrimer = $stmtPrimer->get_result();

            if ($resultPrimer->num_rows === 0) {
                json_error("Esta obra no tiene capítulos", 404);
            }

            $rowPrimer = $resultPrimer->fetch_assoc();
            $numeroFallback = (int)$rowPrimer["numero_capitulo"];
        }

        $numeroCapitulo = $numeroFallback;
    }

    $stmtCapituloBase = $conexion->prepare(
        "SELECT
            id,
            numero_capitulo,
            titulo,
            descripcion,
            num_visitas,
            creado_en
         FROM capitulos
         WHERE obra_id = ? AND numero_capitulo = ?
         LIMIT 1"
    );

    $stmtCapituloBase->bind_param("ii", $obraId, $numeroCapitulo);
    $stmtCapituloBase->execute();
    $resultadoCapituloBase = $stmtCapituloBase->get_result();

    if ($resultadoCapituloBase->num_rows === 0) {
        json_error("Capítulo no encontrado", 404);
    }

    $capituloBase = $resultadoCapituloBase->fetch_assoc();
    $capituloId = (int)$capituloBase["id"];

    $stmtIdiomasCapitulo = $conexion->prepare(
        "SELECT
            cv.id,
            cv.idioma
         FROM capitulo_versiones cv
         WHERE cv.capitulo_id = ?
           AND cv.publicado = 1
         ORDER BY
            CASE WHEN cv.idioma = ? THEN 0 ELSE 1 END,
            cv.idioma ASC"
    );

    $stmtIdiomasCapitulo->bind_param("is", $capituloId, $idiomaBaseObra);
    $stmtIdiomasCapitulo->execute();
    $resultadoIdiomasCapitulo = $stmtIdiomasCapitulo->get_result();

    $idiomasDisponiblesCapitulo = [];
    $idiomasCodigos = [];

    while ($idiomaRow = $resultadoIdiomasCapitulo->fetch_assoc()) {
        $codigoIdioma = normalizarIdiomaReader($idiomaRow["idioma"] ?? "");

        if ($codigoIdioma === "") {
            continue;
        }

        $idiomasCodigos[] = $codigoIdioma;
        $idiomasDisponiblesCapitulo[] = [
            "idioma" => $codigoIdioma
        ];
    }

    if (count($idiomasCodigos) === 0) {
        json_error("Este capítulo no tiene versiones disponibles", 404);
    }

    if ($idiomaSolicitado !== "" && in_array($idiomaSolicitado, $idiomasCodigos, true)) {
        $idiomaActual = $idiomaSolicitado;
    } elseif (in_array($idiomaBaseObra, $idiomasCodigos, true)) {
        $idiomaActual = $idiomaBaseObra;
    } else {
        $idiomaActual = $idiomasCodigos[0];
    }

    $stmtVersionActual = $conexion->prepare(
        "SELECT
            cv.id,
            cv.idioma,
            cv.titulo,
            cv.descripcion,
            cv.num_visitas,
            cv.creado_en
         FROM capitulo_versiones cv
         WHERE cv.capitulo_id = ?
           AND cv.idioma = ?
           AND cv.publicado = 1
         LIMIT 1"
    );

    $stmtVersionActual->bind_param("is", $capituloId, $idiomaActual);
    $stmtVersionActual->execute();
    $resultadoVersionActual = $stmtVersionActual->get_result();

    if ($resultadoVersionActual->num_rows === 0) {
        json_error("Idioma no disponible para este capítulo", 404);
    }

    $versionActual = $resultadoVersionActual->fetch_assoc();
    $capituloVersionId = (int)$versionActual["id"];

    $tituloObra = $obra["titulo"];
    $descripcionObra = $obra["descripcion"];

    $stmtObraIdioma = $conexion->prepare(
        "SELECT titulo, descripcion
         FROM obra_idiomas
         WHERE obra_id = ? AND idioma = ?
         LIMIT 1"
    );

    $stmtObraIdioma->bind_param("is", $obraId, $idiomaActual);
    $stmtObraIdioma->execute();
    $resultObraIdioma = $stmtObraIdioma->get_result();

    if ($resultObraIdioma->num_rows > 0) {
        $obraIdioma = $resultObraIdioma->fetch_assoc();

        if (trim((string)$obraIdioma["titulo"]) !== "") {
            $tituloObra = $obraIdioma["titulo"];
        }

        if ($obraIdioma["descripcion"] !== null && trim((string)$obraIdioma["descripcion"]) !== "") {
            $descripcionObra = $obraIdioma["descripcion"];
        }
    }

    $totalSuscriptores = 0;
    $estaSuscrito = false;

    if ($autorId > 0) {
        $stmtSuscriptores = $conexion->prepare(
            "SELECT COUNT(*) AS total 
             FROM suscripciones 
             WHERE seguido_id = ?"
        );

        $stmtSuscriptores->bind_param("i", $autorId);
        $stmtSuscriptores->execute();

        $resultSuscriptores = $stmtSuscriptores->get_result();
        $rowSuscriptores = $resultSuscriptores->fetch_assoc();

        $totalSuscriptores = (int)$rowSuscriptores["total"];

        if ($viewerId > 0 && $viewerId !== $autorId) {
            $stmtSub = $conexion->prepare(
                "SELECT id 
                 FROM suscripciones 
                 WHERE seguidor_id = ? AND seguido_id = ?
                 LIMIT 1"
            );

            $stmtSub->bind_param("ii", $viewerId, $autorId);
            $stmtSub->execute();

            $resultSub = $stmtSub->get_result();
            $estaSuscrito = $resultSub->num_rows > 0;
        }
    }

    $stmtCapitulos = $conexion->prepare(
        "SELECT 
            c.id,
            cv.id AS capitulo_version_id,
            c.numero_capitulo,
            cv.titulo,
            cv.descripcion,
            cv.idioma,
            cv.num_visitas,
            c.creado_en
         FROM capitulos c
         INNER JOIN capitulo_versiones cv ON cv.capitulo_id = c.id
         WHERE c.obra_id = ?
           AND cv.idioma = ?
           AND cv.publicado = 1
         ORDER BY c.numero_capitulo ASC"
    );

    $stmtCapitulos->bind_param("is", $obraId, $idiomaActual);
    $stmtCapitulos->execute();

    $resultadoCapitulos = $stmtCapitulos->get_result();

    $capitulos = [];

    while ($cap = $resultadoCapitulos->fetch_assoc()) {
        $capitulos[] = [
            "id" => (int)$cap["id"],
            "capituloVersionId" => (int)$cap["capitulo_version_id"],
            "numeroCapitulo" => (int)$cap["numero_capitulo"],
            "titulo" => $cap["titulo"],
            "descripcion" => $cap["descripcion"],
            "idioma" => $cap["idioma"],
            "numVisitas" => (int)$cap["num_visitas"],
            "creadoEn" => $cap["creado_en"]
        ];
    }

    $stmtPaginas = $conexion->prepare(
        "SELECT 
            id,
            numero_pagina,
            imagen,
            creado_en
         FROM capitulo_paginas
         WHERE capitulo_version_id = ?
         ORDER BY numero_pagina ASC"
    );

    $stmtPaginas->bind_param("i", $capituloVersionId);
    $stmtPaginas->execute();

    $resultadoPaginas = $stmtPaginas->get_result();

    $paginas = [];

    while ($pagina = $resultadoPaginas->fetch_assoc()) {
        $paginas[] = [
            "id" => (int)$pagina["id"],
            "numeroPagina" => (int)$pagina["numero_pagina"],
            "imagen" => $pagina["imagen"],
            "creadoEn" => $pagina["creado_en"]
        ];
    }

    if (count($paginas) === 0) {
        $stmtPaginasFallback = $conexion->prepare(
            "SELECT 
                id,
                numero_pagina,
                imagen,
                creado_en
             FROM capitulo_paginas
             WHERE capitulo_id = ?
               AND capitulo_version_id IS NULL
             ORDER BY numero_pagina ASC"
        );

        $stmtPaginasFallback->bind_param("i", $capituloId);
        $stmtPaginasFallback->execute();
        $resultadoPaginasFallback = $stmtPaginasFallback->get_result();

        while ($pagina = $resultadoPaginasFallback->fetch_assoc()) {
            $paginas[] = [
                "id" => (int)$pagina["id"],
                "numeroPagina" => (int)$pagina["numero_pagina"],
                "imagen" => $pagina["imagen"],
                "creadoEn" => $pagina["creado_en"]
            ];
        }
    }

    json_success([
        "obra" => [
            "id" => (int)$obra["id"],
            "usuarioId" => $autorId,
            "titulo" => $tituloObra,
            "descripcion" => $descripcionObra,
            "genero" => $obra["genero"],
            "idioma" => $obra["idioma"],
            "idiomaActual" => $idiomaActual,
            "idiomasDisponibles" => $infoIdiomasObraReader["idiomas"] ?? [],
            "idiomasExtraCount" => idiomasExtraCountCard($infoIdiomasObraReader),
            "tipoEntrega" => $obra["tipo_entrega"],
            "serieConcluida" => (bool)$obra["serie_concluida"],
            "portada" => $obra["portada"],
            "numVisitas" => (int)$obra["num_visitas"],
            "fechaCreacion" => $obra["creado_en"],

            "autor" => $obra["username"] ?: "Autor desconocido",
            "autorAvatar" => $obra["img_perfil"],
            "autorRole" => $obra["role"],
            "autorNacionalidad" => $obra["nacionalidad"],
            "twitter" => $obra["twitter"],
            "facebook" => $obra["facebook"],
            "instagram" => $obra["instagram"],

            "totalSuscriptores" => $totalSuscriptores,
            "estaSuscrito" => $estaSuscrito,

            "idiomasDisponiblesCapitulo" => $idiomasDisponiblesCapitulo,
            "capitulos" => $capitulos,

            "capituloActual" => [
                "id" => $capituloId,
                "capituloVersionId" => $capituloVersionId,
                "numeroCapitulo" => (int)$capituloBase["numero_capitulo"],
                "titulo" => $versionActual["titulo"],
                "descripcion" => $versionActual["descripcion"],
                "idioma" => $idiomaActual,
                "numVisitas" => (int)$versionActual["num_visitas"],
                "creadoEn" => $versionActual["creado_en"] ?: $capituloBase["creado_en"]
            ],

            "paginas" => $paginas
        ]
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>
