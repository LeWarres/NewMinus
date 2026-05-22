<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";

function idiomasPermitidosObraAdmin(): array {
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

function tiposObraPermitidosAdmin(): array {
    return [
        "comic",
        "manga",
        "libro",
        "novela",
        "artwork"
    ];
}

function categoriasPermitidasObraAdmin(): array {
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

function normalizarCategoriasObraAdmin($categoriasInput, string $generoFallback): array {
    $categorias = [];

    if (is_array($categoriasInput)) {
        $categorias = $categoriasInput;
    }

    if (count($categorias) === 0 && $generoFallback !== "") {
        $categorias = explode(",", $generoFallback);
    }

    $permitidas = categoriasPermitidasObraAdmin();
    $normalizadas = [];

    foreach ($categorias as $categoria) {
        $valor = strtolower(trim((string)$categoria));

        if ($valor === "") {
            continue;
        }

        if (!in_array($valor, $permitidas, true)) {
            json_error("Una categoría no es válida", 400);
        }

        if (!in_array($valor, $normalizadas, true)) {
            $normalizadas[] = $valor;
        }
    }

    if (count($normalizadas) > 3) {
        json_error("Solo puedes seleccionar hasta 3 categorías", 400);
    }

    return $normalizadas;
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $usuarioId = require_auth();

    $input = read_json_body();

    $obraId = intval($input["obra_id"] ?? 0);

    $titulo = trim($input["titulo"] ?? "");
    $descripcion = trim($input["descripcion"] ?? "");
    $generoFallback = trim($input["genero"] ?? "");
    $idioma = strtoupper(trim($input["idioma"] ?? "GLOBAL"));
    $tipoEntrega = strtolower(trim($input["tipoEntrega"] ?? "manga"));

    /*
      Ya no se usa en la UI.
      Lo dejamos en 0 para mantener compatibilidad con la columna actual.
    */
    $serieConcluida = 0;

    if ($obraId <= 0) {
        json_error("Falta el id de la obra", 400);
    }

    require_obra_owner($conexion, $obraId, $usuarioId);

    if ($titulo === "") {
        json_error("El título es obligatorio", 400);
    }

    if (strlen($titulo) > 150) {
        json_error("El título es demasiado largo", 400);
    }

    if (strlen($descripcion) > 5000) {
        json_error("La descripción es demasiado larga", 400);
    }

    $categorias = normalizarCategoriasObraAdmin(
        $input["categorias"] ?? [],
        $generoFallback
    );

    $genero = implode(",", $categorias);

    if (!in_array($idioma, idiomasPermitidosObraAdmin(), true)) {
        $idioma = "GLOBAL";
    }

    if (!in_array($tipoEntrega, tiposObraPermitidosAdmin(), true)) {
        $tipoEntrega = "manga";
    }

    $stmtUpdate = $conexion->prepare(
        "UPDATE obras
         SET titulo = ?,
             descripcion = ?,
             genero = ?,
             idioma = ?,
             tipo_entrega = ?,
             serie_concluida = ?
         WHERE id = ?"
    );

    $stmtUpdate->bind_param(
        "sssssii",
        $titulo,
        $descripcion,
        $genero,
        $idioma,
        $tipoEntrega,
        $serieConcluida,
        $obraId
    );

    $stmtUpdate->execute();

    json_success([
        "mensaje" => "Obra actualizada correctamente",
        "genero" => $genero,
        "categorias" => $categorias,
        "idioma" => $idioma,
        "tipoEntrega" => $tipoEntrega
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>