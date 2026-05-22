<?php
require_once __DIR__ . "/_core/auth.php";

function idiomasPermitidosPreview(): array {
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

function normalizarIdiomaPreview(?string $idioma, string $fallback = "GLOBAL"): string {
    $normalizado = strtoupper(trim((string)$idioma));

    if ($normalizado === "") {
        $normalizado = $fallback;
    }

    $permitidos = idiomasPermitidosPreview();

    return in_array($normalizado, $permitidos, true)
        ? $normalizado
        : $fallback;
}

function obtenerVersionObraPreview(mysqli $conexion, int $obraId, string $idiomaSolicitado, string $idiomaOriginal): array {
    $stmt = $conexion->prepare(
        "SELECT
            id,
            idioma,
            titulo,
            descripcion,
            es_principal,
            creado_en
         FROM obra_idiomas
         WHERE obra_id = ?
         ORDER BY es_principal DESC, idioma ASC"
    );

    $stmt->bind_param("i", $obraId);
    $stmt->execute();

    $result = $stmt->get_result();

    $versiones = [];
    $idiomasDisponibles = [];

    while ($row = $result->fetch_assoc()) {
        $idioma = normalizarIdiomaPreview($row["idioma"] ?? "GLOBAL");

        $versiones[$idioma] = [
            "id" => (int)$row["id"],
            "idioma" => $idioma,
            "titulo" => $row["titulo"],
            "descripcion" => $row["descripcion"],
            "esPrincipal" => ((int)$row["es_principal"]) === 1,
            "creadoEn" => $row["creado_en"]
        ];

        if (!in_array($idioma, $idiomasDisponibles, true)) {
            $idiomasDisponibles[] = $idioma;
        }
    }

    $idiomaSolicitado = normalizarIdiomaPreview($idiomaSolicitado, "");
    $idiomaOriginal = normalizarIdiomaPreview($idiomaOriginal, "GLOBAL");

    if ($idiomaSolicitado !== "" && isset($versiones[$idiomaSolicitado])) {
        return [
            "idioma" => $idiomaSolicitado,
            "version" => $versiones[$idiomaSolicitado],
            "idiomasDisponibles" => $idiomasDisponibles
        ];
    }

    if (isset($versiones[$idiomaOriginal])) {
        return [
            "idioma" => $idiomaOriginal,
            "version" => $versiones[$idiomaOriginal],
            "idiomasDisponibles" => $idiomasDisponibles
        ];
    }

    foreach ($versiones as $idioma => $version) {
        if (!empty($version["esPrincipal"])) {
            return [
                "idioma" => $idioma,
                "version" => $version,
                "idiomasDisponibles" => $idiomasDisponibles
            ];
        }
    }

    if (count($versiones) > 0) {
        $idioma = array_key_first($versiones);

        return [
            "idioma" => $idioma,
            "version" => $versiones[$idioma],
            "idiomasDisponibles" => $idiomasDisponibles
        ];
    }

    return [
        "idioma" => $idiomaOriginal,
        "version" => null,
        "idiomasDisponibles" => []
    ];
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();

    $obraId = isset($_GET["id"]) ? intval($_GET["id"]) : 0;
    $idiomaSolicitado = $_GET["idioma"] ?? ($_GET["lang"] ?? "");

    /*
      Ya no usamos viewer_id desde Angular.
      Si hay sesión activa, lo tomamos de la cookie HttpOnly.
    */
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

    $resultObra = $stmtObra->get_result();

    if ($resultObra->num_rows === 0) {
        json_error("Obra no encontrada", 404);
    }

    $obra = $resultObra->fetch_assoc();
    $autorId = $obra["usuario_id"] ? (int)$obra["usuario_id"] : 0;

    $obraVersionData = obtenerVersionObraPreview(
        $conexion,
        $obraId,
        (string)$idiomaSolicitado,
        (string)($obra["idioma"] ?? "GLOBAL")
    );

    $idiomaActual = $obraVersionData["idioma"];
    $obraVersion = $obraVersionData["version"];
    $idiomasDisponibles = $obraVersionData["idiomasDisponibles"];

    $tituloObra = $obraVersion["titulo"] ?? $obra["titulo"];
    $descripcionObra = $obraVersion["descripcion"] ?? $obra["descripcion"];

    /*
      Capítulos del idioma seleccionado.
      num_visitas ahora viene desde capitulo_versiones.
    */
    $stmtCapitulos = $conexion->prepare(
        "SELECT 
            c.id,
            c.numero_capitulo,
            c.creado_en AS capitulo_creado_en,
            cv.id AS version_id,
            cv.idioma,
            cv.titulo,
            cv.descripcion,
            cv.num_visitas,
            cv.creado_en AS version_creado_en
         FROM capitulos c
         INNER JOIN capitulo_versiones cv
            ON cv.capitulo_id = c.id
            AND cv.idioma = ?
            AND cv.publicado = 1
         WHERE c.obra_id = ?
         ORDER BY c.numero_capitulo ASC"
    );

    $stmtCapitulos->bind_param("si", $idiomaActual, $obraId);
    $stmtCapitulos->execute();

    $resultCapitulos = $stmtCapitulos->get_result();

    $capitulos = [];

    while ($cap = $resultCapitulos->fetch_assoc()) {
        $capitulos[] = [
            "id" => (int)$cap["id"],
            "versionId" => (int)$cap["version_id"],
            "idioma" => $cap["idioma"],
            "numeroCapitulo" => (int)$cap["numero_capitulo"],
            "titulo" => $cap["titulo"],
            "descripcion" => $cap["descripcion"],
            "numVisitas" => (int)$cap["num_visitas"],
            "creadoEn" => $cap["version_creado_en"] ?: $cap["capitulo_creado_en"]
        ];
    }

    if (count($capitulos) === 0 && count($idiomasDisponibles) > 0) {
        foreach ($idiomasDisponibles as $idiomaFallback) {
            $stmtFallback = $conexion->prepare(
                "SELECT 
                    c.id,
                    c.numero_capitulo,
                    c.creado_en AS capitulo_creado_en,
                    cv.id AS version_id,
                    cv.idioma,
                    cv.titulo,
                    cv.descripcion,
                    cv.num_visitas,
                    cv.creado_en AS version_creado_en
                 FROM capitulos c
                 INNER JOIN capitulo_versiones cv
                    ON cv.capitulo_id = c.id
                    AND cv.idioma = ?
                    AND cv.publicado = 1
                 WHERE c.obra_id = ?
                 ORDER BY c.numero_capitulo ASC"
            );

            $stmtFallback->bind_param("si", $idiomaFallback, $obraId);
            $stmtFallback->execute();

            $resultFallback = $stmtFallback->get_result();

            if ($resultFallback->num_rows > 0) {
                $idiomaActual = $idiomaFallback;
                $capitulos = [];

                while ($cap = $resultFallback->fetch_assoc()) {
                    $capitulos[] = [
                        "id" => (int)$cap["id"],
                        "versionId" => (int)$cap["version_id"],
                        "idioma" => $cap["idioma"],
                        "numeroCapitulo" => (int)$cap["numero_capitulo"],
                        "titulo" => $cap["titulo"],
                        "descripcion" => $cap["descripcion"],
                        "numVisitas" => (int)$cap["num_visitas"],
                        "creadoEn" => $cap["version_creado_en"] ?: $cap["capitulo_creado_en"]
                    ];
                }

                break;
            }
        }
    }

    /*
      Suscriptores del autor
    */
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

    json_success([
        "obra" => [
            "id" => (int)$obra["id"],
            "usuarioId" => $autorId,
            "titulo" => $tituloObra,
            "descripcion" => $descripcionObra,
            "genero" => $obra["genero"],
            "idioma" => $idiomaActual,
            "idiomaOriginal" => $obra["idioma"],
            "idiomaActual" => $idiomaActual,
            "idiomasDisponibles" => $idiomasDisponibles,
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

            "capitulos" => $capitulos
        ]
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>
