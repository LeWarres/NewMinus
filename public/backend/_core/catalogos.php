<?php
/*
  Catálogos compartidos de MinusCreators.

  Este archivo centraliza listas pequeñas usadas por varios endpoints:
  - Categorías públicas de obras.
  - Idiomas permitidos para contenido.
  - Tipos de obra.
  - Helpers de normalización usados por cards/filtros.

  Nota:
  Mantén este archivo sincronizado con:
  src/app/shared/options/profile-options.ts
*/

function catalogoCategoriasPermitidas(bool $incluirTodos = false): array {
    $categorias = [
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

        "reconfortante",
        "novela-grafica",
        "informativo",
        "biografico",
        "animales",
        "supervivencia",
        "reencarnacion",
        "mitologia",

        "shonen",
        "shojo",
        "seinen",
        "josei",
        "kodomo",
        "boys-love",
        "girls-love",
        "nsfw"
    ];

    if ($incluirTodos) {
        array_unshift($categorias, "todos");
    }

    return $categorias;
}

function catalogoIdiomasPermitidos(bool $incluirTodos = false): array {
    $idiomas = [
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

    if ($incluirTodos) {
        array_unshift($idiomas, "TODOS");
    }

    return $idiomas;
}

function catalogoTiposObraPermitidos(bool $incluirTodos = false): array {
    $tipos = [
        "comic",
        "manga",
        "libro",
        "novela",
        "artwork"
    ];

    if ($incluirTodos) {
        array_unshift($tipos, "todos");
    }

    return $tipos;
}

function catalogoNormalizarIdioma(?string $idioma): string {
    $idioma = strtoupper(trim((string)$idioma));

    if ($idioma === "") {
        return "";
    }

    return in_array($idioma, catalogoIdiomasPermitidos(false), true)
        ? $idioma
        : "";
}

function catalogoIdiomaFallbackDesdeInterfaz(string $idiomaInterfaz): string {
    $normalizado = catalogoNormalizarIdioma($idiomaInterfaz);

    return $normalizado !== ""
        ? $normalizado
        : "EN";
}

function catalogoCategoriasDesdeGenero(?string $genero, bool $incluirTodos = true): array {
    $genero = trim((string)$genero);

    if ($genero === "") {
        return [];
    }

    $permitidas = catalogoCategoriasPermitidas($incluirTodos);
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

function catalogoNormalizarFiltroNsfw(string $valor): string {
    $valor = strtolower(trim($valor));

    if (in_array($valor, ["incluir", "ocultar", "solo"], true)) {
        return $valor;
    }

    return "incluir";
}

function catalogoObtenerIdiomasLecturaUsuario(mysqli $conexion, int $userId): array {
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
        $idioma = catalogoNormalizarIdioma($row["idioma"] ?? "");

        if ($idioma === "") {
            continue;
        }

        if (!in_array($idioma, $idiomas, true)) {
            $idiomas[] = $idioma;
        }
    }

    return $idiomas;
}

function catalogoPreferidosContenido(mysqli $conexion, string $idiomaInterfaz = "EN"): array {
    $userId = function_exists("current_user_id") ? current_user_id() : 0;
    $idiomas = $userId > 0
        ? catalogoObtenerIdiomasLecturaUsuario($conexion, $userId)
        : [];

    if (count($idiomas) === 0) {
        $idiomas[] = catalogoIdiomaFallbackDesdeInterfaz($idiomaInterfaz);
    }

    if (!in_array("GLOBAL", $idiomas, true)) {
        $idiomas[] = "GLOBAL";
    }

    return array_values(array_unique($idiomas));
}

function catalogoNormalizarIdiomasCsv(string $idiomasCsv): array {
    $idiomasCsv = trim($idiomasCsv);

    if ($idiomasCsv === "") {
        return [];
    }

    $idiomas = [];

    foreach (explode(",", $idiomasCsv) as $parte) {
        $idioma = catalogoNormalizarIdioma($parte);

        if ($idioma === "") {
            continue;
        }

        if (!in_array($idioma, $idiomas, true)) {
            $idiomas[] = $idioma;
        }
    }

    return $idiomas;
}

function catalogoObtenerIdiomasObras(mysqli $conexion, array $obraIds): array {
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
        $idioma = catalogoNormalizarIdioma($row["idioma"] ?? "");

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

function catalogoElegirIdiomaObra(array $infoIdiomas, array $preferidos, string $idiomaFallback = "GLOBAL"): string {
    $disponibles = $infoIdiomas["idiomas"] ?? [];
    $principal = catalogoNormalizarIdioma($infoIdiomas["principal"] ?? "");
    $fallback = catalogoNormalizarIdioma($idiomaFallback);

    if (count($disponibles) === 0) {
        return $fallback !== "" ? $fallback : "GLOBAL";
    }

    foreach ($preferidos as $preferido) {
        $preferido = catalogoNormalizarIdioma($preferido);

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

    return $disponibles[0] ?? "GLOBAL";
}

function catalogoAplicarTextoIdiomaObra(array $obra, array $infoIdiomas, string $idiomaSeleccionado): array {
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

function catalogoIdiomasExtraCount(array $infoIdiomas): int {
    $total = count($infoIdiomas["idiomas"] ?? []);

    return max(0, $total - 1);
}

function catalogoUsuarioPermiteNsfw(mysqli $conexion): bool {
    $userId = function_exists("current_user_id") ? current_user_id() : 0;

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

function catalogoIdiomasDisponiblesDesdeCsv(?string $csv, ?string $idiomaBase): array {
    $idiomas = [];

    foreach (explode(",", (string)$csv) as $parte) {
        $idioma = catalogoNormalizarIdioma($parte);

        if ($idioma === "") {
            continue;
        }

        if (!in_array($idioma, $idiomas, true)) {
            $idiomas[] = $idioma;
        }
    }

    $idiomaBase = catalogoNormalizarIdioma($idiomaBase);

    if (count($idiomas) === 0 && $idiomaBase !== "") {
        $idiomas[] = $idiomaBase;
    }

    if (count($idiomas) === 0) {
        $idiomas[] = "GLOBAL";
    }

    return $idiomas;
}

function catalogoEscogerIdiomaCard(array $idiomasDisponibles, array $idiomasPreferidos, ?string $idiomaBase): string {
    foreach ($idiomasPreferidos as $idiomaPreferido) {
        if (in_array($idiomaPreferido, $idiomasDisponibles, true)) {
            return $idiomaPreferido;
        }
    }

    $idiomaBase = catalogoNormalizarIdioma($idiomaBase);

    if ($idiomaBase !== "" && in_array($idiomaBase, $idiomasDisponibles, true)) {
        return $idiomaBase;
    }

    return $idiomasDisponibles[0] ?? "GLOBAL";
}

/* Aliases usados por upload.php */
function idiomasPermitidosUpload(): array {
    return catalogoIdiomasPermitidos(false);
}

function tiposEntregaPermitidosUpload(): array {
    return catalogoTiposObraPermitidos(false);
}

function categoriasPermitidasUpload(): array {
    return catalogoCategoriasPermitidas(false);
}

function normalizarCategoriasUpload(string $categoriasRaw, string $generoFallback): array {
    $categorias = [];

    if ($categoriasRaw !== "") {
        $decoded = json_decode($categoriasRaw, true);

        if (is_array($decoded)) {
            $categorias = $decoded;
        }
    }

    if (count($categorias) === 0 && $generoFallback !== "") {
        $categorias = explode(",", $generoFallback);
    }

    $permitidas = catalogoCategoriasPermitidas(false);
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

/* Aliases usados por obra_preview.php */
function idiomasPermitidosPreview(): array {
    return catalogoIdiomasPermitidos(false);
}

function normalizarIdiomaPreview(?string $idioma, string $fallback = "GLOBAL"): string {
    $normalizado = strtoupper(trim((string)$idioma));

    if ($normalizado === "") {
        $normalizado = $fallback;
    }

    return in_array($normalizado, catalogoIdiomasPermitidos(false), true)
        ? $normalizado
        : $fallback;
}

/* Aliases usados por populares_7_dias.php */
function categoriasPermitidasPopulares(): array {
    return catalogoCategoriasPermitidas(true);
}

function idiomasPermitidosPopulares(): array {
    return catalogoIdiomasPermitidos(false);
}

function categoriasDesdeGeneroPopulares(?string $genero): array {
    return catalogoCategoriasDesdeGenero($genero, true);
}

function idiomaFallbackPopulares(string $idiomaInterfaz): string {
    return catalogoIdiomaFallbackDesdeInterfaz($idiomaInterfaz);
}

function obtenerIdiomasLecturaPopulares(mysqli $conexion, int $userId): array {
    return catalogoObtenerIdiomasLecturaUsuario($conexion, $userId);
}

function obtenerIdiomasFiltroPopulares(mysqli $conexion, string $idiomaInterfaz): array {
    return catalogoPreferidosContenido($conexion, $idiomaInterfaz);
}

function usuarioPermiteNsfwPopulares(mysqli $conexion): bool {
    return catalogoUsuarioPermiteNsfw($conexion);
}

/* Aliases usados por recomendadas_categoria.php */
function categoriasPermitidasRecomendadas(): array {
    return catalogoCategoriasPermitidas(true);
}

function idiomasPermitidosRecomendadas(): array {
    return catalogoIdiomasPermitidos(false);
}

function categoriasDesdeGeneroRecomendadas(?string $genero): array {
    return catalogoCategoriasDesdeGenero($genero, true);
}

function idiomaFallbackRecomendadas(string $idiomaInterfaz): string {
    return catalogoIdiomaFallbackDesdeInterfaz($idiomaInterfaz);
}

function obtenerIdiomasLecturaRecomendadas(mysqli $conexion, int $userId): array {
    return catalogoObtenerIdiomasLecturaUsuario($conexion, $userId);
}

function obtenerIdiomasFiltroRecomendadas(mysqli $conexion, string $idiomaInterfaz): array {
    return catalogoPreferidosContenido($conexion, $idiomaInterfaz);
}

function usuarioPermiteNsfwRecomendadas(mysqli $conexion): bool {
    return catalogoUsuarioPermiteNsfw($conexion);
}

/*
  Estos nombres sin sufijo se usan en recomendadas_categoria.php y populares_7_dias.php.
  En una petición normal solo se carga uno de esos endpoints.
*/
function idiomasDisponiblesDesdeCsv(?string $csv, ?string $idiomaBase): array {
    return catalogoIdiomasDisponiblesDesdeCsv($csv, $idiomaBase);
}

function escogerIdiomaCard(array $idiomasDisponibles, array $idiomasPreferidos, ?string $idiomaBase): string {
    return catalogoEscogerIdiomaCard($idiomasDisponibles, $idiomasPreferidos, $idiomaBase);
}

/* Aliases usados por buscar.php y listar_obras.php */
function categoriasPermitidasPublicas(): array {
    return catalogoCategoriasPermitidas(true);
}

function tiposObraPermitidosPublicos(): array {
    return catalogoTiposObraPermitidos(true);
}

function categoriasDesdeGenero(?string $genero): array {
    return catalogoCategoriasDesdeGenero($genero, true);
}

function normalizarFiltroNsfw(string $valor): string {
    return catalogoNormalizarFiltroNsfw($valor);
}

function idiomasPermitidosCards(): array {
    return catalogoIdiomasPermitidos(false);
}

function normalizarIdiomaCard(?string $idioma): string {
    return catalogoNormalizarIdioma($idioma);
}

function idiomaFallbackInterfazCard(string $idiomaInterfaz): string {
    return catalogoIdiomaFallbackDesdeInterfaz($idiomaInterfaz);
}

function obtenerIdiomasLecturaCard(mysqli $conexion, int $userId): array {
    return catalogoObtenerIdiomasLecturaUsuario($conexion, $userId);
}

function preferidosContenidoCard(mysqli $conexion, string $idiomaInterfaz = "EN"): array {
    return catalogoPreferidosContenido($conexion, $idiomaInterfaz);
}

function normalizarIdiomasCsvCard(string $idiomasCsv): array {
    return catalogoNormalizarIdiomasCsv($idiomasCsv);
}

function obtenerIdiomasObrasCard(mysqli $conexion, array $obraIds): array {
    return catalogoObtenerIdiomasObras($conexion, $obraIds);
}

function elegirIdiomaObraCard(array $infoIdiomas, array $preferidos, string $idiomaFallback = "GLOBAL"): string {
    return catalogoElegirIdiomaObra($infoIdiomas, $preferidos, $idiomaFallback);
}

function aplicarTextoIdiomaObraCard(array $obra, array $infoIdiomas, string $idiomaSeleccionado): array {
    return catalogoAplicarTextoIdiomaObra($obra, $infoIdiomas, $idiomaSeleccionado);
}

function idiomasExtraCountCard(array $infoIdiomas): int {
    return catalogoIdiomasExtraCount($infoIdiomas);
}

function usuarioPermiteNsfw(mysqli $conexion): bool {
    return catalogoUsuarioPermiteNsfw($conexion);
}
?>
