<?php
require_once __DIR__ . "/_core/auth.php";

function categoriasPermitidasObraAdminDetalle(): array {
    return [
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

function categoriasDesdeGeneroObraAdmin(?string $genero): array {
    $genero = trim((string)$genero);

    if ($genero === "") {
        return [];
    }

    $permitidas = categoriasPermitidasObraAdminDetalle();
    $partes = explode(",", $genero);
    $categorias = [];

    foreach ($partes as $parte) {
        $valor = strtolower(trim($parte));

        if ($valor === "") {
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

function idiomasPermitidosObraAdminDetalle(): array {
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

function normalizarIdiomaObraAdminDetalle(?string $idioma, string $fallback = "GLOBAL"): string {
    $normalizado = strtoupper(trim((string)$idioma));

    if ($normalizado === "") {
        $normalizado = $fallback;
    }

    $permitidos = idiomasPermitidosObraAdminDetalle();

    return in_array($normalizado, $permitidos, true)
        ? $normalizado
        : $fallback;
}

function paginasPorVersionObraAdmin(mysqli $conexion, int $versionId): array {
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

    $stmtPaginas->bind_param("i", $versionId);
    $stmtPaginas->execute();

    $resultPaginas = $stmtPaginas->get_result();

    $paginas = [];

    while ($pagina = $resultPaginas->fetch_assoc()) {
        $paginas[] = [
            "id" => (int)$pagina["id"],
            "numeroPagina" => (int)$pagina["numero_pagina"],
            "imagen" => $pagina["imagen"],
            "creadoEn" => $pagina["creado_en"]
        ];
    }

    return $paginas;
}

function paginasLegacyPorCapituloObraAdmin(mysqli $conexion, int $capituloId): array {
    $stmtPaginas = $conexion->prepare(
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

    $stmtPaginas->bind_param("i", $capituloId);
    $stmtPaginas->execute();

    $resultPaginas = $stmtPaginas->get_result();

    $paginas = [];

    while ($pagina = $resultPaginas->fetch_assoc()) {
        $paginas[] = [
            "id" => (int)$pagina["id"],
            "numeroPagina" => (int)$pagina["numero_pagina"],
            "imagen" => $pagina["imagen"],
            "creadoEn" => $pagina["creado_en"]
        ];
    }

    return $paginas;
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();
    $usuarioId = require_auth();

    $obraId = isset($_GET["obra_id"]) ? intval($_GET["obra_id"]) : 0;

    if ($obraId <= 0) {
        json_error("Falta el id de la obra", 400);
    }

    require_obra_owner($conexion, $obraId, $usuarioId);

    $stmtObra = $conexion->prepare(
        "SELECT 
            id,
            usuario_id,
            titulo,
            descripcion,
            genero,
            idioma,
            tipo_entrega,
            portada,
            num_visitas,
            creado_en
         FROM obras
         WHERE id = ?
         LIMIT 1"
    );

    $stmtObra->bind_param("i", $obraId);
    $stmtObra->execute();

    $resultObra = $stmtObra->get_result();

    if ($resultObra->num_rows === 0) {
        json_error("Obra no encontrada", 404);
    }

    $obra = $resultObra->fetch_assoc();
    $idiomaPrincipal = normalizarIdiomaObraAdminDetalle($obra["idioma"] ?? "GLOBAL");

    /*
      Versiones de idioma de la obra.
    */
    $stmtObraIdiomas = $conexion->prepare(
        "SELECT
            id,
            idioma,
            titulo,
            descripcion,
            es_principal,
            creado_en,
            actualizado_en
         FROM obra_idiomas
         WHERE obra_id = ?
         ORDER BY es_principal DESC, idioma ASC"
    );

    $stmtObraIdiomas->bind_param("i", $obraId);
    $stmtObraIdiomas->execute();

    $resultObraIdiomas = $stmtObraIdiomas->get_result();

    $obraIdiomas = [];
    $idiomasDisponibles = [];

    while ($version = $resultObraIdiomas->fetch_assoc()) {
        $idioma = normalizarIdiomaObraAdminDetalle($version["idioma"] ?? "GLOBAL");

        $obraIdiomas[] = [
            "id" => (int)$version["id"],
            "idioma" => $idioma,
            "titulo" => $version["titulo"],
            "descripcion" => $version["descripcion"],
            "esPrincipal" => ((int)$version["es_principal"]) === 1,
            "creadoEn" => $version["creado_en"],
            "actualizadoEn" => $version["actualizado_en"]
        ];

        if (!in_array($idioma, $idiomasDisponibles, true)) {
            $idiomasDisponibles[] = $idioma;
        }
    }

    /*
      Compatibilidad:
      si por alguna razón una obra no tiene obra_idiomas, devolvemos su versión antigua.
    */
    if (count($obraIdiomas) === 0) {
        $obraIdiomas[] = [
            "id" => 0,
            "idioma" => $idiomaPrincipal,
            "titulo" => $obra["titulo"],
            "descripcion" => $obra["descripcion"],
            "esPrincipal" => true,
            "creadoEn" => $obra["creado_en"],
            "actualizadoEn" => $obra["creado_en"]
        ];

        $idiomasDisponibles[] = $idiomaPrincipal;
    }

    $stmtCapitulos = $conexion->prepare(
        "SELECT 
            id,
            numero_capitulo,
            titulo,
            descripcion,
            creado_en
         FROM capitulos
         WHERE obra_id = ?
         ORDER BY numero_capitulo ASC"
    );

    $stmtCapitulos->bind_param("i", $obraId);
    $stmtCapitulos->execute();

    $resultCapitulos = $stmtCapitulos->get_result();

    $capitulos = [];

    while ($capitulo = $resultCapitulos->fetch_assoc()) {
        $capituloId = (int)$capitulo["id"];

        $stmtVersiones = $conexion->prepare(
            "SELECT
                id,
                idioma,
                titulo,
                descripcion,
                num_visitas,
                publicado,
                creado_en,
                actualizado_en
             FROM capitulo_versiones
             WHERE capitulo_id = ?
             ORDER BY idioma ASC"
        );

        $stmtVersiones->bind_param("i", $capituloId);
        $stmtVersiones->execute();

        $resultVersiones = $stmtVersiones->get_result();

        $versiones = [];

        while ($version = $resultVersiones->fetch_assoc()) {
            $versionId = (int)$version["id"];
            $paginasVersion = paginasPorVersionObraAdmin($conexion, $versionId);

            $versiones[] = [
                "id" => $versionId,
                "idioma" => normalizarIdiomaObraAdminDetalle($version["idioma"] ?? "GLOBAL"),
                "titulo" => $version["titulo"],
                "descripcion" => $version["descripcion"],
                "numVisitas" => (int)$version["num_visitas"],
                "publicado" => ((int)$version["publicado"]) === 1,
                "creadoEn" => $version["creado_en"],
                "actualizadoEn" => $version["actualizado_en"],
                "paginas" => $paginasVersion
            ];
        }

        $versionPrincipal = null;

        foreach ($versiones as $version) {
            if ($version["idioma"] === $idiomaPrincipal) {
                $versionPrincipal = $version;
                break;
            }
        }

        if ($versionPrincipal === null && count($versiones) > 0) {
            $versionPrincipal = $versiones[0];
        }

        $paginasLegacy = [];

        if ($versionPrincipal === null) {
            $paginasLegacy = paginasLegacyPorCapituloObraAdmin($conexion, $capituloId);
        }

        $capitulos[] = [
            "id" => $capituloId,
            "numeroCapitulo" => (int)$capitulo["numero_capitulo"],
            "titulo" => $versionPrincipal["titulo"] ?? $capitulo["titulo"],
            "descripcion" => $versionPrincipal["descripcion"] ?? $capitulo["descripcion"],
            "idioma" => $versionPrincipal["idioma"] ?? $idiomaPrincipal,
            "versionId" => $versionPrincipal["id"] ?? null,
            "creadoEn" => $versionPrincipal["creadoEn"] ?? $capitulo["creado_en"],
            "paginas" => $versionPrincipal["paginas"] ?? $paginasLegacy,
            "versiones" => $versiones
        ];
    }

    $categorias = categoriasDesdeGeneroObraAdmin($obra["genero"] ?? "");

    json_success([
        "obra" => [
            "id" => (int)$obra["id"],
            "usuarioId" => (int)$obra["usuario_id"],
            "titulo" => $obra["titulo"],
            "descripcion" => $obra["descripcion"],
            "genero" => $obra["genero"],
            "categorias" => $categorias,
            "idioma" => $obra["idioma"],
            "idiomaPrincipal" => $idiomaPrincipal,
            "idiomasDisponibles" => $idiomasDisponibles,
            "idiomas" => $obraIdiomas,
            "tipoEntrega" => $obra["tipo_entrega"],
            "portada" => $obra["portada"],
            "numVisitas" => (int)$obra["num_visitas"],
            "fechaCreacion" => $obra["creado_en"],
            "capitulos" => $capitulos
        ]
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>
