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


try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();
    $userId = require_auth();
    $limite = isset($_GET["limite"]) ? intval($_GET["limite"]) : 50;

    if ($limite <= 0 || $limite > 100) {
        $limite = 50;
    }

    $preferidos = preferidosContenidoCard($conexion, strtoupper(trim($_GET["idiomaInterfaz"] ?? "EN")));
    $placeholders = implode(",", array_fill(0, count($preferidos), "?"));

    $sql = "
        SELECT
            o.id AS obra_id,
            o.usuario_id,
            o.titulo AS obra_titulo,
            o.descripcion AS obra_descripcion,
            o.genero,
            o.idioma AS obra_idioma,
            o.tipo_entrega,
            o.portada,
            o.num_visitas AS obra_num_visitas,
            c.id AS capitulo_id,
            c.numero_capitulo,
            c.creado_en AS capitulo_creado_en,
            cv.id AS capitulo_version_id,
            cv.idioma AS capitulo_idioma,
            cv.titulo AS capitulo_titulo,
            cv.descripcion AS capitulo_descripcion,
            cv.num_visitas AS capitulo_num_visitas,
            cv.creado_en AS version_creado_en,
            COALESCE(cal.promedio_calificacion, 0) AS promedio_calificacion,
            u.username,
            u.img_perfil
        FROM capitulo_versiones cv
        INNER JOIN capitulos c ON c.id = cv.capitulo_id
        INNER JOIN obras o ON o.id = c.obra_id
        LEFT JOIN (
            SELECT obra_id, ROUND(AVG(calificacion), 1) AS promedio_calificacion
            FROM obra_calificaciones
            GROUP BY obra_id
        ) cal ON cal.obra_id = o.id
        INNER JOIN suscripciones s ON s.seguido_id = o.usuario_id
        LEFT JOIN usuarios u ON u.id = o.usuario_id
        WHERE s.seguidor_id = ?
          AND cv.publicado = 1
          AND cv.idioma IN ($placeholders)
        ORDER BY cv.creado_en DESC, c.creado_en DESC
        LIMIT ?
    ";

    $params = [$userId, ...$preferidos, $limite];
    $types = "i" . str_repeat("s", count($preferidos)) . "i";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $rawItems = [];
    $obraIds = [];

    while ($row = $resultado->fetch_assoc()) {
        $rawItems[] = $row;
        $obraIds[] = (int)$row["obra_id"];
    }

    $idiomasObras = obtenerIdiomasObrasCard($conexion, $obraIds);
    $items = [];

    foreach ($rawItems as $row) {
        $obraId = (int)$row["obra_id"];
        $infoIdiomas = $idiomasObras[$obraId] ?? ["idiomas" => [], "textos" => [], "principal" => ""];
        $idiomaVersion = normalizarIdiomaCard($row["capitulo_idioma"] ?? "") ?: "GLOBAL";
        $obraTexto = aplicarTextoIdiomaObraCard([
            "titulo" => $row["obra_titulo"],
            "descripcion" => $row["obra_descripcion"]
        ], $infoIdiomas, $idiomaVersion);

        $items[] = [
            "tipo" => "capitulo",
            "obraId" => $obraId,
            "usuarioId" => $row["usuario_id"] ? (int)$row["usuario_id"] : null,
            "tituloObra" => $obraTexto["titulo"],
            "descripcionObra" => $obraTexto["descripcion"],
            "genero" => $row["genero"],
            "idioma" => $idiomaVersion,
            "idiomasDisponibles" => $infoIdiomas["idiomas"] ?? [],
            "idiomasExtraCount" => idiomasExtraCountCard($infoIdiomas),
            "portada" => $row["portada"],
            "tipoEntrega" => $row["tipo_entrega"],
            "numVisitas" => (int)$row["capitulo_num_visitas"],
            "obraNumVisitas" => (int)$row["obra_num_visitas"],
            "promedioCalificacion" => (float)$row["promedio_calificacion"],
            "capituloId" => (int)$row["capitulo_id"],
            "capituloVersionId" => (int)$row["capitulo_version_id"],
            "numeroCapitulo" => (int)$row["numero_capitulo"],
            "tituloCapitulo" => $row["capitulo_titulo"],
            "descripcionCapitulo" => $row["capitulo_descripcion"],
            "fechaCreacion" => $row["version_creado_en"] ?: $row["capitulo_creado_en"],
            "autor" => $row["username"] ?: "Autor desconocido",
            "autorAvatar" => $row["img_perfil"]
        ];
    }

    json_success(["items" => $items]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>
